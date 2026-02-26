/**
 * routes/api.js
 * Rutas REST de la aplicación AMPER EN ACCIÓN.
 *
 * POST /api/register   – Registro de estudiante
 * POST /api/challenge  – Solicitar pregunta académica
 * POST /api/dispense   – Activar dispensador (solo si ganó)
 * POST /api/attempt    – Registrar intento fallido
 * GET  /api/status     – Health check
 * GET  /api/logs       – Logs de admin (protegido)
 */

const express  = require('express');
const router   = express.Router();
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const Student             = require('../models/Student');
const { generateAcademicQuestion } = require('../services/questionGenerator');
const { activateDispenser, getDispenseLogs } = require('../services/dispenserService');

// ─── HELPER: extrae IP real ───────────────────────────
const getIP = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0].trim() ||
  req.socket?.remoteAddress ||
  'unknown';

// ─── HELPER: errores de validación ───────────────────
const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: errors.array()[0].msg });
    return false;
  }
  return true;
};

// ════════════════════════════════════════════════
// POST /api/register
// ════════════════════════════════════════════════
router.post('/register', [
  body('studentCode')
    .trim().notEmpty().withMessage('Código estudiantil requerido')
    .toUpperCase()
    .matches(/^[A-Z0-9\-]{4,20}$/).withMessage('Código inválido (solo letras, números y guiones, 4-20 caracteres)'),
  body('career')
    .trim().notEmpty().withMessage('Carrera requerida')
    .isLength({ max: 80 }).withMessage('Carrera demasiado larga'),
  body('semester')
    .isInt({ min: 1, max: 12 }).withMessage('Semestre inválido (1-12)'),
], async (req, res) => {
  if (!validate(req, res)) return;

  const { studentCode, career, semester } = req.body;
  const ip = getIP(req);

  try {
    let student = await Student.findOne({ studentCode });

    // Ya ganó → no puede volver a jugar para premio
    if (student?.hasWon) {
      return res.status(400).json({
        message: '¡Ya recibiste tu AMPER! Solo se entrega un premio por estudiante. 🏆',
      });
    }

    // Crear o actualizar
    if (!student) {
      student = new Student({ studentCode, career, semester });
    } else {
      // Actualizar carrera/semestre si volvió
      student.career = career;
      student.semester = semester;
    }

    student.attempts++;
    const sessionId = uuidv4();
    student.sessions.push({ sessionId, ipAddress: ip });
    await student.save();

    console.log(`[REGISTER] ${studentCode} | ${career} | Sem ${semester} | IP: ${ip}`);

    res.json({ success: true, sessionId, message: '¡Listo para jugar!' });

  } catch (err) {
    console.error('[REGISTER ERROR]', err.message);
    res.status(500).json({ message: 'Error interno. Intenta nuevamente.' });
  }
});

// ════════════════════════════════════════════════
// POST /api/challenge
// ════════════════════════════════════════════════
router.post('/challenge', [
  body('studentCode').trim().notEmpty().toUpperCase(),
  body('career').trim().notEmpty(),
  body('semester').isInt({ min: 1, max: 12 }),
  body('sessionId').trim().notEmpty().isUUID(),
  body('score').optional().isInt({ min: 0 }),
], async (req, res) => {
  if (!validate(req, res)) return;

  const { studentCode, career, semester, sessionId, score } = req.body;

  try {
    const student = await Student.findOne({ studentCode });
    if (!student) return res.status(404).json({ message: 'Estudiante no encontrado' });

    // Verificar sesión válida
    const session = student.sessions.find(s => s.sessionId === sessionId);
    if (!session) return res.status(403).json({ message: 'Sesión inválida' });

    // Ya ganó
    if (student.hasWon) {
      return res.status(400).json({ message: 'Ya obtuviste tu premio.' });
    }

    // Marcar sesión como "llegó al reto"
    session.reachedAmper = true;
    if (score) session.finalScore = score;
    await student.save();

    // Generar pregunta dinámica
    const question = await generateAcademicQuestion(career, semester);

    console.log(`[CHALLENGE] ${studentCode} | ${career} Sem ${semester} | Score: ${score}`);

    res.json(question);

  } catch (err) {
    console.error('[CHALLENGE ERROR]', err.message);
    res.status(500).json({ message: 'Error generando pregunta.' });
  }
});

// ════════════════════════════════════════════════
// POST /api/dispense
// ════════════════════════════════════════════════
router.post('/dispense', [
  body('studentCode').trim().notEmpty().toUpperCase(),
  body('sessionId').trim().notEmpty().isUUID(),
  body('score').isInt({ min: 0 }),
], async (req, res) => {
  if (!validate(req, res)) return;

  const { studentCode, sessionId, score } = req.body;

  try {
    const student = await Student.findOne({ studentCode });
    if (!student) return res.status(404).json({ message: 'Estudiante no encontrado' });

    // Anti-fraude: verificar sesión
    const session = student.sessions.find(s => s.sessionId === sessionId);
    if (!session) return res.status(403).json({ message: 'Sesión inválida' });

    // Anti-fraude: solo si llegó al reto en esta sesión
    if (!session.reachedAmper) {
      return res.status(403).json({ message: 'No se alcanzó el reto en esta sesión.' });
    }

    // Anti-duplicidad: un solo premio por estudiante (ever)
    if (student.hasWon) {
      return res.status(400).json({ message: 'Premio ya entregado anteriormente.' });
    }

    // Anti-duplicidad: verificar que esta sesión no dispensó ya
    if (session.dispensed) {
      return res.status(400).json({ message: 'Esta sesión ya dispensó.' });
    }

    // ── Activar hardware ──
    const result = await activateDispenser(studentCode, score);

    if (result.success) {
      student.hasWon = true;
      student.wonAt = new Date();
      session.answeredCorrectly = true;
      session.dispensed = true;
      session.finalScore = score;
      await student.save();

      console.log(`[DISPENSE] ✅ Premio entregado: ${studentCode} | ${result.dispenseId}`);
      res.json({ success: true, dispenseId: result.dispenseId, message: '¡Lata dispensada!' });
    } else {
      res.status(500).json({ message: 'Error en el dispensador. Llama a un operador.' });
    }

  } catch (err) {
    console.error('[DISPENSE ERROR]', err.message);
    res.status(500).json({ message: 'Error interno del dispensador.' });
  }
});

// ════════════════════════════════════════════════
// POST /api/attempt  (respuesta incorrecta)
// ════════════════════════════════════════════════
router.post('/attempt', [
  body('studentCode').trim().notEmpty().toUpperCase(),
  body('sessionId').trim().notEmpty().isUUID(),
  body('correct').isBoolean(),
], async (req, res) => {
  if (!validate(req, res)) return;

  const { studentCode, sessionId, correct } = req.body;

  try {
    const student = await Student.findOne({ studentCode });
    if (!student) return res.status(404).json({ message: 'Estudiante no encontrado' });

    const session = student.sessions.find(s => s.sessionId === sessionId);
    if (session) { session.answeredCorrectly = correct; }

    await student.save();
    console.log(`[ATTEMPT] ${studentCode} | correcto: ${correct}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Error registrando intento' });
  }
});

// ════════════════════════════════════════════════
// GET /api/status
// ════════════════════════════════════════════════
router.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AMPER EN ACCIÓN API',
    timestamp: new Date().toISOString(),
    hardwareMode: process.env.HARDWARE_MODE || 'simulation',
  });
});

// ════════════════════════════════════════════════
// GET /api/admin/logs  (requiere clave admin)
// ════════════════════════════════════════════════
router.get('/admin/logs', async (req, res) => {
  const key = req.headers['x-admin-key'];
  if (key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ message: 'No autorizado' });
  }

  try {
    const students = await Student.find({}, '-sessions.ipAddress')
      .sort({ createdAt: -1 }).limit(100);
    const dispenseLog = getDispenseLogs();
    res.json({ students, dispenseLog });
  } catch (err) {
    res.status(500).json({ message: 'Error obteniendo logs' });
  }
});

module.exports = router;
