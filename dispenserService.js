/**
 * services/dispenserService.js
 * Maneja la activación del dispensador físico de latas.
 *
 * ══════════════════════════════════════════════════════
 * INTEGRACIÓN HARDWARE REAL – DOS OPCIONES:
 *
 * 1) ARDUINO (via serialport npm)
 *    - Arduino conectado por USB, escucha comandos seriales.
 *    - Activa relé → electroimán o motor DC → lata cae.
 *
 * 2) RASPBERRY PI (via onoff npm / GPIO)
 *    - Script Node.js corre directamente en la Pi.
 *    - GPIO pin alto por 500ms → activa relé → lata cae.
 * ══════════════════════════════════════════════════════
 */

const { v4: uuidv4 } = require('uuid');

// ─── MODO SIMULACIÓN (por defecto en MVP) ────────────
const SIMULATION_MODE = process.env.HARDWARE_MODE !== 'real';

// ─── LOG de dispensaciones ───────────────────────────
const dispenseLogs = [];

/**
 * activateDispenser(studentCode, score)
 * Retorna { success, dispenseId, message }
 */
async function activateDispenser(studentCode, score) {
  const dispenseId = uuidv4().split('-')[0].toUpperCase();

  console.log(`[DISPENSER] Activando para ${studentCode} | Score: ${score} | ID: ${dispenseId}`);

  if (SIMULATION_MODE) {
    return await simulateDispense(studentCode, dispenseId);
  }

  // ── MODO REAL ──────────────────────────────────────
  const mode = process.env.HARDWARE_TYPE || 'arduino';
  if (mode === 'arduino')     return await dispenseViaArduino(studentCode, dispenseId);
  if (mode === 'raspberry')   return await dispenseViaRaspberry(studentCode, dispenseId);

  throw new Error('HARDWARE_TYPE no reconocido');
}

// ─── SIMULACIÓN ──────────────────────────────────────
async function simulateDispense(studentCode, dispenseId) {
  await delay(800); // Simula latencia hardware
  const log = {
    dispenseId,
    studentCode,
    timestamp: new Date().toISOString(),
    mode: 'simulation',
    success: true,
  };
  dispenseLogs.push(log);
  console.log(`[DISPENSER SIM] ✅ Lata dispensada (sim): ${dispenseId}`);
  return { success: true, dispenseId, message: 'Dispensado exitosamente (simulación)' };
}

// ─── ARDUINO ─────────────────────────────────────────
/**
 * Configuración física real:
 *   1. Instalar: npm install serialport
 *   2. Arduino cargado con sketch que lee serial:
 *      if (Serial.read() == 'D') { digitalWrite(RELAY_PIN, HIGH); delay(500); digitalWrite(RELAY_PIN, LOW); }
 *   3. Conectar relé: Arduino pin 7 → IN del módulo relé
 *      Relé → motor del dispensador (12V DC)
 */
async function dispenseViaArduino(studentCode, dispenseId) {
  const { SerialPort } = require('serialport');
  const port = new SerialPort({
    path: process.env.ARDUINO_PORT || '/dev/ttyUSB0',
    baudRate: 9600,
  });

  return new Promise((resolve, reject) => {
    port.on('open', () => {
      port.write('D', (err) => {
        port.close();
        if (err) { reject(new Error('Error escribiendo a Arduino: ' + err.message)); return; }
        const log = { dispenseId, studentCode, timestamp: new Date().toISOString(), mode: 'arduino', success: true };
        dispenseLogs.push(log);
        console.log(`[DISPENSER] ✅ Arduino activado: ${dispenseId}`);
        resolve({ success: true, dispenseId, message: 'Dispensado vía Arduino' });
      });
    });
    port.on('error', (err) => reject(err));
  });
}

// ─── RASPBERRY PI ────────────────────────────────────
/**
 * Configuración física real:
 *   1. Instalar: npm install onoff
 *   2. Raspberry Pi: GPIO 18 (BCM) → Base del transistor NPN (2N2222)
 *      Transistor → módulo relé → motor del dispensador
 *   3. Asegurarse de tener permisos GPIO:
 *      sudo usermod -a -G gpio pi
 */
async function dispenseViaRaspberry(studentCode, dispenseId) {
  const { Gpio } = require('onoff');
  const relay = new Gpio(
    parseInt(process.env.GPIO_PIN || '18'),
    'out'
  );

  return new Promise((resolve, reject) => {
    relay.write(1, (err) => {
      if (err) { relay.unexport(); reject(err); return; }
      setTimeout(() => {
        relay.write(0, () => {
          relay.unexport();
          const log = { dispenseId, studentCode, timestamp: new Date().toISOString(), mode: 'raspberry', success: true };
          dispenseLogs.push(log);
          console.log(`[DISPENSER] ✅ GPIO activado: ${dispenseId}`);
          resolve({ success: true, dispenseId, message: 'Dispensado vía Raspberry Pi GPIO' });
        });
      }, 500); // Relé activo 500ms
    });
  });
}

// ─── LOGS ─────────────────────────────────────────────
function getDispenseLogs() { return dispenseLogs; }

// ─── UTILS ────────────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { activateDispenser, getDispenseLogs };
