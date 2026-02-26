/**
 * models/Student.js
 * Modelo Mongoose para estudiantes y sus sesiones de juego.
 * Previene duplicidad de premios y registra todos los intentos.
 */
const mongoose = require('mongoose');

// ─── Sub-schema: sesión individual de juego ───
const SessionSchema = new mongoose.Schema({
  sessionId:   { type: String, required: true },
  startedAt:   { type: Date, default: Date.now },
  finalScore:  { type: Number, default: 0 },
  reachedAmper:{ type: Boolean, default: false },
  answeredCorrectly: { type: Boolean, default: null }, // null = no respondió
  dispensed:   { type: Boolean, default: false },
  ipAddress:   { type: String },
});

// ─── Schema principal ───
const StudentSchema = new mongoose.Schema(
  {
    studentCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 20,
      match: [/^[A-Z0-9\-]+$/, 'Código inválido'],
    },
    career:   { type: String, required: true, trim: true, maxlength: 80 },
    semester: { type: Number, required: true, min: 1, max: 12 },
    hasWon:   { type: Boolean, default: false },  // Premio ya entregado
    wonAt:    { type: Date },
    attempts: { type: Number, default: 0 },
    sessions: [SessionSchema],
  },
  { timestamps: true }
);

// ─── Índices ───
StudentSchema.index({ studentCode: 1 });
StudentSchema.index({ hasWon: 1 });

// ─── Virtual: cantidad de retos respondidos ───
StudentSchema.virtual('totalChallenges').get(function () {
  return this.sessions.filter(s => s.answeredCorrectly !== null).length;
});

module.exports = mongoose.model('Student', StudentSchema);
