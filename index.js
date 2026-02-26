/**
 * server/index.js
 * Servidor Express principal para AMPER EN ACCIÓN.
 * Sirve también el frontend estático en producción.
 */

require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');
const path        = require('path');
const mongoose    = require('mongoose');

const apiRoutes   = require('./routes/api');

const app  = express();
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════

// Logs de peticiones
app.use(morgan('[:date[clf]] :method :url :status :res[content-length] - :response-time ms'));

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5500'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('CORS: Origen no permitido: ' + origin));
  },
  methods: ['GET', 'POST'],
}));

// Parsear JSON (con límite de tamaño)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// ─── Rate Limiting ───────────────────────────────────
// General: 100 req / 15 min por IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Demasiadas solicitudes. Espera un momento.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Específico para registro y dispensación: 5 req / 15 min
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Límite de intentos alcanzado. Espera 15 minutos.' },
});

app.use('/api', generalLimiter);
app.use('/api/register', strictLimiter);
app.use('/api/dispense', strictLimiter);

// ─── Servir frontend estático ────────────────────────
const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath));

// ─── Rutas API ───────────────────────────────────────
app.use('/api', apiRoutes);

// ─── Catch-all: SPA ─────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// ─── Error handler global ────────────────────────────
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.message);
  res.status(500).json({ message: 'Error interno del servidor.' });
});

// ═══════════════════════════════════════
// BASE DE DATOS
// ═══════════════════════════════════════
async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/amper_game';
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB conectado:', uri.replace(/\/\/.*@/, '//***@'));
  } catch (err) {
    console.error('❌ Error conectando MongoDB:', err.message);
    console.log('⚠️  Iniciando sin DB (modo demo local)');
  }
}

// ═══════════════════════════════════════
// INICIO
// ═══════════════════════════════════════
(async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log('');
    console.log('  ⚡════════════════════════════════════⚡');
    console.log('      AMPER EN ACCIÓN – Servidor activo');
    console.log(`      http://localhost:${PORT}`);
    console.log(`      Hardware: ${process.env.HARDWARE_MODE || 'simulation'}`);
    console.log('  ⚡════════════════════════════════════⚡');
    console.log('');
  });
})();

module.exports = app;
