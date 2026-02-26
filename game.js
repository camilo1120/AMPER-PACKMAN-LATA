/**
 * AMPER EN ACCIÓN – Videojuego completo
 * Motor Pac-Man canvas + lógica de flujo + API calls
 */

// ════════════════════════════════════════════════
// CONFIG & STATE
// ════════════════════════════════════════════════
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

const STATE = {
  student: { code: '', career: '', semester: 1 },
  score: 0,
  lives: 3,
  timer: 90,
  timerInterval: null,
  currentQuestion: null,
  challengeTimerInterval: null,
  gameEngine: null,
  sessionId: null,
};

// ════════════════════════════════════════════════
// SCREEN MANAGER
// ════════════════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ════════════════════════════════════════════════
// PARTICLES
// ════════════════════════════════════════════════
function initParticles(containerId, count = 30) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const colors = ['#FFE600', '#00F5FF', '#FF6B00', '#39FF14', '#FF0080'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.width = p.style.height = (2 + Math.random() * 6) + 'px';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.animationDuration = (3 + Math.random() * 6) + 's';
    p.style.animationDelay   = (-Math.random() * 6) + 's';
    container.appendChild(p);
  }
}

// ════════════════════════════════════════════════
// SOUND ENGINE (Web Audio API — pure synthetic)
// ════════════════════════════════════════════════
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function getAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function playTone(freq, duration, type = 'square', gainVal = 0.15) {
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + duration);
  } catch (_) {}
}

function sfxEat()      { playTone(440, 0.05); setTimeout(() => playTone(660, 0.05), 60); }
function sfxAmper()    { [440,550,660,880].forEach((f,i) => setTimeout(() => playTone(f, 0.15,'sawtooth',0.2), i*80)); }
function sfxDie()      { [440,330,220,110].forEach((f,i) => setTimeout(() => playTone(f, 0.2,'square',0.2), i*100)); }
function sfxWin()      { [523,659,784,1047].forEach((f,i) => setTimeout(() => playTone(f, 0.3,'sine',0.25), i*150)); }
function sfxCorrect()  { [784,1047,1319].forEach((f,i) => setTimeout(() => playTone(f, 0.25,'sine',0.3), i*120)); }
function sfxWrong()    { playTone(200, 0.5, 'sawtooth', 0.2); }
function sfxStart()    { [262,330,392].forEach((f,i) => setTimeout(() => playTone(f,0.2,'square',0.2), i*100)); }

// ════════════════════════════════════════════════
// PAC-MAN GAME ENGINE
// ════════════════════════════════════════════════

// Classic Pac-Man inspired maze (21×21), 0=wall, 1=dot, 2=empty, 3=power(AMPER), 4=ghost-house
const BASE_MAP = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0],
  [0,1,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,1,0],
  [0,3,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,3,0],
  [0,1,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,1,0,0,1,0,1,0,0,0,0,0,0,0,1,0,1,0,0,1,0],
  [0,1,0,0,1,0,1,0,0,0,0,0,0,0,1,0,1,0,0,1,0],
  [0,1,1,1,1,0,1,1,1,0,0,0,1,1,1,0,1,1,1,1,0],
  [0,0,0,0,1,0,0,0,2,0,4,0,2,0,0,0,1,0,0,0,0],
  [0,0,0,0,1,0,0,0,2,0,4,0,2,0,0,0,1,0,0,0,0],
  [0,0,0,0,1,0,0,0,2,4,4,4,2,0,0,0,1,0,0,0,0],
  [0,0,0,0,1,0,2,0,0,0,0,0,0,0,2,0,1,0,0,0,0],
  [0,0,0,0,1,0,2,0,0,0,0,0,0,0,2,0,1,0,0,0,0],
  [1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1],
  [0,0,0,0,1,0,0,0,2,0,0,0,2,0,0,0,1,0,0,0,0],
  [0,0,0,0,1,0,2,0,0,0,0,0,0,0,2,0,1,0,0,0,0],
  [0,1,1,1,1,0,1,1,1,0,0,0,1,1,1,0,1,1,1,1,0],
  [0,1,0,0,1,0,1,0,0,0,0,0,0,0,1,0,1,0,0,1,0],
  [0,3,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,3,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const COLS = BASE_MAP[0].length;
const ROWS = BASE_MAP.length;

const GHOST_NAMES = ['Estrés','Sueño','Redes','Distrac.'];
const GHOST_COLORS = ['#FF3A3A','#FFB8FF','#00FFEF','#FFB852'];

class PacManGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cellSize = 0;
    this.map = [];
    this.player = {};
    this.ghosts = [];
    this.score = 0;
    this.dotsLeft = 0;
    this.amperEaten = false;
    this.animFrame = null;
    this.gameActive = false;
    this.eatAnimations = [];
    this.paused = false;

    this._setupCanvas();
    this._initMap();
    this._initPlayer();
    this._initGhosts();

    this.onScoreUpdate = null;
    this.onLifeLost = null;
    this.onAmperEaten = null;
    this.onGameOver = null;
  }

  _setupCanvas() {
    const container = this.canvas.parentElement;
    const maxW = container.clientWidth;
    const maxH = container.clientHeight;
    this.cellSize = Math.floor(Math.min(maxW / COLS, maxH / ROWS));
    this.canvas.width  = this.cellSize * COLS;
    this.canvas.height = this.cellSize * ROWS;
  }

  _initMap() {
    this.map = BASE_MAP.map(row => [...row]);
    this.dotsLeft = 0;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (this.map[r][c] === 1) this.dotsLeft++;
  }

  _initPlayer() {
    this.player = {
      row: 14, col: 10,
      dx: 0, dy: 0,
      nextDx: 0, nextDy: 0,
      mouthAngle: 0.25, mouthDir: 1,
      moved: 0, stepInterval: 7, stepCount: 0,
      dead: false, deathAnim: 0,
      superMode: false, superTimer: 0,
    };
  }

  _initGhosts() {
    const starts = [
      { row: 9, col: 9 }, { row: 9, col: 10 },
      { row: 9, col: 11 }, { row: 10, col: 10 }
    ];
    this.ghosts = starts.map((pos, i) => ({
      row: pos.row + 0.0, col: pos.col + 0.0,
      targetRow: 1, targetCol: 1 + i * 5,
      dx: i % 2 === 0 ? -1 : 1, dy: 0,
      color: GHOST_COLORS[i], name: GHOST_NAMES[i],
      speed: 0.5 + i * 0.05,
      mode: 'scatter', modeTimer: 60 * 7,
      homeRow: pos.row, homeCol: pos.col,
      scared: false, scaredTimer: 0,
      eyeDir: 0,
    }));
  }

  start() {
    this.gameActive = true;
    this._loop();
  }

  stop() {
    this.gameActive = false;
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; }

  setDirection(dx, dy) {
    this.player.nextDx = dx;
    this.player.nextDy = dy;
  }

  increaseSpeed(multiplier) {
    this.ghosts.forEach(g => { g.speed = Math.min(g.speed * multiplier, 1.2); });
    this.player.stepInterval = Math.max(3, this.player.stepInterval - 1);
  }

  _loop() {
    if (!this.gameActive) return;
    if (!this.paused) this._update();
    this._draw();
    this.animFrame = requestAnimationFrame(() => this._loop());
  }

  _update() {
    const p = this.player;
    if (p.dead) {
      p.deathAnim++;
      if (p.deathAnim > 40) this._respawn();
      return;
    }

    p.stepCount++;
    if (p.stepCount >= p.stepInterval) {
      p.stepCount = 0;
      this._movePlayer();
    }

    this._moveGhosts();
    this._checkCollisions();

    // Mouth animation
    p.mouthAngle += 0.04 * p.mouthDir;
    if (p.mouthAngle >= 0.35 || p.mouthAngle <= 0.02) p.mouthDir *= -1;

    // Super mode countdown
    if (p.superMode) {
      p.superTimer--;
      if (p.superTimer <= 0) {
        p.superMode = false;
        this.ghosts.forEach(g => { g.scared = false; });
      }
    }
    this.ghosts.forEach(g => { if (g.scared) g.scaredTimer--; if (g.scaredTimer <= 0) g.scared = false; });
  }

  _canMove(row, col) {
    const r = Math.round(row), c = Math.round(col);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true; // wrap
    return this.map[r][c] !== 0;
  }

  _movePlayer() {
    const p = this.player;
    const nr = p.row + p.nextDy;
    const nc = p.col + p.nextDx;
    if (this._canMove(nr, nc)) { p.dy = p.nextDy; p.dx = p.nextDx; }
    const cr = p.row + p.dy;
    const cc = p.col + p.dx;
    if (this._canMove(cr, cc)) {
      p.row = ((cr % ROWS) + ROWS) % ROWS;
      p.col = ((cc % COLS) + COLS) % COLS;
      this._eatCell(p.row, p.col);
    }
  }

  _eatCell(row, col) {
    const cell = this.map[row][col];
    if (cell === 1) {
      this.map[row][col] = 2;
      this.score += 10;
      this.dotsLeft--;
      sfxEat();
      this.eatAnimations.push({ row, col, age: 0 });
      if (this.onScoreUpdate) this.onScoreUpdate(this.score);
    } else if (cell === 3) {
      this.map[row][col] = 2;
      this.score += 200;
      sfxAmper();
      this.eatAnimations.push({ row, col, age: 0, big: true });
      if (this.onScoreUpdate) this.onScoreUpdate(this.score);
      if (!this.amperEaten && this.onAmperEaten) {
        this.amperEaten = true;
        // Delay to let animation play
        setTimeout(() => { this.pause(); this.onAmperEaten(this.score); }, 400);
      }
    }
  }

  _moveGhosts() {
    this.ghosts.forEach(g => {
      g.col += g.dx * g.speed;
      g.row += g.dy * g.speed;
      // wrap
      g.col = ((g.col % COLS) + COLS) % COLS;
      g.row = ((g.row % ROWS) + ROWS) % ROWS;

      // Change direction when hitting wall or randomly
      const ri = Math.round(g.row), ci = Math.round(g.col);
      const nextR = ri + g.dy, nextC = ci + g.dx;
      if (!this._canMove(nextR, nextC) || Math.random() < 0.02) {
        const dirs = [{dx:-1,dy:0},{dx:1,dy:0},{dx:0,dy:-1},{dx:0,dy:1}];
        const valid = dirs.filter(d => this._canMove(ri + d.dy, ci + d.dx) && !(d.dx === -g.dx && d.dy === -g.dy));
        if (valid.length) {
          const pick = valid[Math.floor(Math.random() * valid.length)];
          g.dx = pick.dx; g.dy = pick.dy;
        }
      }
    });
  }

  _checkCollisions() {
    const p = this.player;
    const pr = Math.round(p.row), pc = Math.round(p.col);
    this.ghosts.forEach(g => {
      const gr = Math.round(g.row), gc = Math.round(g.col);
      if (Math.abs(pr - gr) < 1 && Math.abs(pc - gc) < 1) {
        if (g.scared) {
          g.scared = false; g.scaredTimer = 0;
          g.row = g.homeRow; g.col = g.homeCol;
          this.score += 300;
          if (this.onScoreUpdate) this.onScoreUpdate(this.score);
        } else if (!p.dead) {
          sfxDie();
          p.dead = true; p.deathAnim = 0;
          if (this.onLifeLost) this.onLifeLost();
        }
      }
    });
  }

  _respawn() {
    const p = this.player;
    p.dead = false; p.deathAnim = 0;
    p.row = 14; p.col = 10;
    p.dx = 0; p.dy = 0; p.nextDx = 0; p.nextDy = 0;
    this.ghosts.forEach(g => { g.row = g.homeRow; g.col = g.homeCol; });
  }

  _draw() {
    const { ctx, cellSize: cs } = this;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this._drawMaze();
    this._drawEatAnimations();
    this._drawGhosts();
    this._drawPlayer();
  }

  _drawMaze() {
    const { ctx, cellSize: cs } = this;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * cs, y = r * cs;
        const cell = this.map[r][c];
        if (cell === 0) {
          // Wall
          ctx.fillStyle = '#1a1f6e';
          ctx.fillRect(x, y, cs, cs);
          ctx.strokeStyle = '#3a40a0';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 1, y + 1, cs - 2, cs - 2);
        } else if (cell === 1) {
          // Dot (Parcial)
          ctx.fillStyle = '#FFE066';
          ctx.beginPath();
          ctx.arc(x + cs/2, y + cs/2, cs * 0.12, 0, Math.PI * 2);
          ctx.fill();
        } else if (cell === 3) {
          // AMPER power-up
          const t = Date.now() / 400;
          const scale = 0.9 + Math.sin(t) * 0.1;
          const size = cs * 0.38 * scale;
          // Draw mini can
          ctx.save();
          ctx.translate(x + cs/2, y + cs/2);
          ctx.fillStyle = '#FFE600';
          ctx.shadowColor = '#FFE600'; ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.roundRect(-size/2, -size, size, size*2, 2);
          ctx.fill();
          ctx.fillStyle = '#05060D';
          ctx.font = `${cs * 0.3}px 'Press Start 2P'`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('⚡', 0, 0);
          ctx.restore();
        }
      }
    }
  }

  _drawPlayer() {
    const { ctx, cellSize: cs } = this;
    const p = this.player;
    const x = p.col * cs + cs/2;
    const y = p.row * cs + cs/2;
    const r = cs * 0.42;

    if (p.dead) {
      const pct = p.deathAnim / 40;
      ctx.save();
      ctx.globalAlpha = 1 - pct;
      ctx.translate(x, y);
      ctx.rotate(pct * Math.PI);
      ctx.scale(1 - pct * 0.5, 1 - pct * 0.5);
      ctx.fillStyle = '#FFE600';
      ctx.shadowColor = '#FFE600'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }

    // Direction angle
    let angle = 0;
    if (p.dx === 1)  angle = 0;
    if (p.dx === -1) angle = Math.PI;
    if (p.dy === -1) angle = -Math.PI/2;
    if (p.dy === 1)  angle = Math.PI/2;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = '#FFE600';
    ctx.shadowColor = '#FFE600'; ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, p.mouthAngle * Math.PI, (2 - p.mouthAngle) * Math.PI);
    ctx.closePath();
    ctx.fill();
    // Eye
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-r*0.1, -r*0.45, r*0.12, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  _drawGhosts() {
    const { ctx, cellSize: cs } = this;
    this.ghosts.forEach(g => {
      const x = g.col * cs + cs/2;
      const y = g.row * cs + cs/2;
      const r = cs * 0.38;
      const color = g.scared ? '#3344ff' : g.color;

      ctx.save();
      ctx.shadowColor = color; ctx.shadowBlur = 8;

      // Body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y - r*0.1, r, Math.PI, 0);
      // Skirt
      const skirtY = y + r;
      ctx.lineTo(x + r, skirtY);
      for (let i = 0; i <= 4; i++) {
        const bx = x + r - i * (r*2/4);
        const by = skirtY - (i % 2 === 0 ? 0 : r * 0.3);
        ctx.lineTo(bx, by);
      }
      ctx.lineTo(x - r, skirtY);
      ctx.closePath();
      ctx.fill();

      if (!g.scared) {
        // Eyes white
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(x - r*0.3, y - r*0.15, r*0.22, r*0.28, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + r*0.3, y - r*0.15, r*0.22, r*0.28, 0, 0, Math.PI*2); ctx.fill();
        // Pupils
        ctx.fillStyle = '#00f';
        ctx.beginPath(); ctx.ellipse(x - r*0.28 + g.dx*r*0.1, y - r*0.12 + g.dy*r*0.1, r*0.12, r*0.16, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + r*0.32 + g.dx*r*0.1, y - r*0.12 + g.dy*r*0.1, r*0.12, r*0.16, 0, 0, Math.PI*2); ctx.fill();
      } else {
        // Scared face
        ctx.fillStyle = '#fff';
        ctx.font = `${cs*0.3}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('👻', x, y - r*0.1);
      }

      // Ghost label (small)
      if (cs > 18) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = `bold ${Math.max(7, cs*0.18)}px Orbitron`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.shadowBlur = 0;
        ctx.fillText(g.name, x, y + r + 2);
      }
      ctx.restore();
    });
  }

  _drawEatAnimations() {
    const { ctx, cellSize: cs } = this;
    this.eatAnimations = this.eatAnimations.filter(ea => {
      ea.age++;
      ctx.save();
      ctx.globalAlpha = 1 - ea.age / 20;
      ctx.fillStyle = ea.big ? '#FFE600' : '#FFF';
      ctx.font = `${ea.big ? cs*0.5 : cs*0.3}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(ea.big ? '⚡' : '+10', ea.col * cs + cs/2, ea.row * cs + cs/2 - ea.age*1.5);
      ctx.restore();
      return ea.age < 20;
    });
  }
}

// ════════════════════════════════════════════════
// API HELPERS
// ════════════════════════════════════════════════
async function apiPost(path, data) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error de servidor' }));
    throw new Error(err.message || 'Error de servidor');
  }
  return res.json();
}

async function apiGet(path) {
  const res = await fetch(API_BASE + path);
  if (!res.ok) throw new Error('Error de servidor');
  return res.json();
}

// ════════════════════════════════════════════════
// FLOW: SPLASH → REGISTER
// ════════════════════════════════════════════════
document.getElementById('btn-start').addEventListener('click', () => {
  sfxStart();
  showScreen('screen-register');
});

// ─── Semester selector ───
document.querySelectorAll('.sem-option').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.sem-option').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('semester').value = el.dataset.sem;
  });
});

// ─── Register form ───
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const code     = document.getElementById('studentCode').value.trim();
  const career   = document.getElementById('career').value;
  const semester = document.getElementById('semester').value;
  const errEl    = document.getElementById('register-error');
  errEl.textContent = '';

  if (!code || !career || !semester) {
    errEl.textContent = '⚠ Todos los campos son obligatorios.';
    return;
  }

  const btn = document.getElementById('btn-register');
  btn.disabled = true;
  btn.querySelector('.btn-text').innerHTML = '<span class="spinner"></span>';

  try {
    const res = await apiPost('/register', { studentCode: code, career, semester: Number(semester) });
    STATE.student = { code, career, semester: Number(semester) };
    STATE.sessionId = res.sessionId;
    sfxStart();
    showScreen('screen-instructions');
  } catch (err) {
    errEl.textContent = '⚠ ' + err.message;
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = 'ACTIVAR JUEGO ⚡';
  }
});

document.getElementById('btn-back-register').addEventListener('click', () => showScreen('screen-splash'));

// ════════════════════════════════════════════════
// FLOW: INSTRUCTIONS → GAME
// ════════════════════════════════════════════════
document.getElementById('btn-play').addEventListener('click', () => {
  sfxStart();
  startGame();
});

function startGame() {
  showScreen('screen-game');
  STATE.score = 0;
  STATE.lives = 3;
  STATE.timer = 90;

  updateHUD();
  startTimer();

  const canvas = document.getElementById('gameCanvas');
  if (STATE.gameEngine) STATE.gameEngine.stop();
  STATE.gameEngine = new PacManGame(canvas);

  STATE.gameEngine.onScoreUpdate = (s) => { STATE.score = s; document.getElementById('hud-score').textContent = s; };
  STATE.gameEngine.onLifeLost    = () => loseLife();
  STATE.gameEngine.onAmperEaten  = (score) => triggerChallenge(score);
  STATE.gameEngine.onGameOver    = () => gameOver(false);

  STATE.gameEngine.start();
  setupKeyboard();
  setupTouch();

  // Gradually increase difficulty
  let diffTimer = 0;
  STATE.diffInterval = setInterval(() => {
    diffTimer++;
    if (diffTimer % 3 === 0 && STATE.gameEngine) STATE.gameEngine.increaseSpeed(1.05);
  }, 10000);
}

function updateHUD() {
  document.getElementById('hud-score').textContent = STATE.score;
  document.getElementById('hud-timer').textContent = STATE.timer;
  const livesEl = document.getElementById('lives-display');
  livesEl.querySelectorAll('.life-icon').forEach((el, i) => {
    el.classList.toggle('lost', i >= STATE.lives);
  });
}

function startTimer() {
  clearInterval(STATE.timerInterval);
  STATE.timerInterval = setInterval(() => {
    STATE.timer--;
    document.getElementById('hud-timer').textContent = STATE.timer;
    if (STATE.timer <= 0) {
      clearInterval(STATE.timerInterval);
      gameOver(false, 'Se acabó el tiempo.');
    }
    if (STATE.timer <= 10) {
      document.getElementById('hud-timer').style.color = '#FF3A3A';
    }
  }, 1000);
}

function loseLife() {
  STATE.lives--;
  updateHUD();
  if (STATE.lives <= 0) {
    clearInterval(STATE.timerInterval);
    setTimeout(() => gameOver(false, '¡Sin vidas! Vuelve a intentarlo.'), 1000);
  }
}

function gameOver(won, msg = '') {
  clearInterval(STATE.timerInterval);
  clearInterval(STATE.diffInterval);
  if (STATE.gameEngine) STATE.gameEngine.stop();
  if (!won) {
    document.getElementById('loser-msg').textContent = msg || '¡Intenta de nuevo! La energía no se rinde.';
    document.getElementById('loser-score').textContent = 'PUNTAJE: ' + STATE.score;
    sfxDie();
    showScreen('screen-loser');
  }
}

// ─── Keyboard ───
function setupKeyboard() {
  const handler = (e) => {
    const engine = STATE.gameEngine;
    if (!engine) return;
    const map = {
      ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0],
      KeyW: [0,-1], KeyS: [0,1], KeyA: [-1,0], KeyD: [1,0],
    };
    const dir = map[e.code];
    if (dir) { e.preventDefault(); engine.setDirection(dir[0], dir[1]); }
  };
  document.removeEventListener('keydown', handler);
  document.addEventListener('keydown', handler);
}

// ─── Touch D-Pad (mobile) ───
function setupTouch() {
  // Inject dpad if missing
  if (!document.getElementById('dpad')) {
    const dpad = document.createElement('div');
    dpad.id = 'dpad';
    dpad.innerHTML = `
      <div></div><div class="dpad-btn" data-dir="up">↑</div><div></div>
      <div class="dpad-btn" data-dir="left">←</div>
      <div class="dpad-btn dpad-center" data-dir=""></div>
      <div class="dpad-btn" data-dir="right">→</div>
      <div></div><div class="dpad-btn" data-dir="down">↓</div><div></div>`;
    document.getElementById('screen-game').appendChild(dpad);
    dpad.querySelectorAll('.dpad-btn[data-dir]').forEach(btn => {
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const dirMap = {up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
        const d = dirMap[btn.dataset.dir];
        if (d && STATE.gameEngine) STATE.gameEngine.setDirection(d[0], d[1]);
      });
    });
  }
}

// ════════════════════════════════════════════════
// FLOW: AMPER EATEN → CHALLENGE
// ════════════════════════════════════════════════
async function triggerChallenge(score) {
  clearInterval(STATE.timerInterval);
  showScreen('screen-challenge');
  sfxAmper();

  // Show loading state
  document.getElementById('question-text').textContent = '⚡ Generando reto académico...';
  document.getElementById('options-grid').innerHTML = '';
  document.getElementById('challenge-feedback').className = 'challenge-feedback hidden';

  try {
    const data = await apiPost('/challenge', {
      studentCode: STATE.student.code,
      career: STATE.student.career,
      semester: STATE.student.semester,
      score,
      sessionId: STATE.sessionId,
    });
    STATE.currentQuestion = data;
    renderQuestion(data);
    startChallengeTimer(data.timeLimit || 45);
  } catch (err) {
    document.getElementById('question-text').textContent = '⚠ Error al generar pregunta. Inténtalo de nuevo.';
  }
}

function renderQuestion(data) {
  document.getElementById('q-meta').textContent =
    `📚 ${data.career || STATE.student.career} · ${data.difficulty || 'Nivel ' + STATE.student.semester}`;
  document.getElementById('question-text').textContent = data.question;

  const grid = document.getElementById('options-grid');
  grid.innerHTML = '';
  const letters = ['A','B','C','D'];
  data.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<span class="option-letter">${letters[i]}</span>${opt}`;
    btn.dataset.index = i;
    btn.addEventListener('click', () => handleAnswer(i, btn));
    grid.appendChild(btn);
  });
}

function startChallengeTimer(seconds) {
  clearInterval(STATE.challengeTimerInterval);
  let remaining = seconds;
  const fill = document.getElementById('challenge-timer-fill');
  fill.style.width = '100%';
  fill.style.background = 'linear-gradient(90deg, #39FF14, #FFE600)';

  STATE.challengeTimerInterval = setInterval(() => {
    remaining--;
    const pct = (remaining / seconds) * 100;
    fill.style.width = pct + '%';
    if (pct < 30) fill.style.background = 'linear-gradient(90deg, #FF3A3A, #FF6B00)';
    if (remaining <= 0) {
      clearInterval(STATE.challengeTimerInterval);
      handleAnswer(-1, null); // timeout
    }
  }, 1000);
}

async function handleAnswer(selectedIndex, clickedBtn) {
  clearInterval(STATE.challengeTimerInterval);
  document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);

  const correct = STATE.currentQuestion?.correctIndex ?? -1;
  const isCorrect = selectedIndex === correct;

  // Highlight
  document.querySelectorAll('.option-btn').forEach((b, i) => {
    if (i === correct) b.classList.add('correct');
    else if (i === selectedIndex && !isCorrect) b.classList.add('wrong');
  });

  const feedbackEl = document.getElementById('challenge-feedback');

  if (isCorrect) {
    sfxCorrect();
    feedbackEl.className = 'challenge-feedback success';
    feedbackEl.textContent = '✅ ¡CORRECTO! Tu AMPER está siendo dispensada...';
    feedbackEl.classList.remove('hidden');

    // Notificar backend + dispensar
    try {
      await apiPost('/dispense', {
        studentCode: STATE.student.code,
        sessionId: STATE.sessionId,
        score: STATE.score,
      });
    } catch (_) {}

    setTimeout(() => showWinner(), 2500);
  } else {
    sfxWrong();
    feedbackEl.className = 'challenge-feedback fail';
    feedbackEl.textContent = selectedIndex === -1
      ? '⏱ ¡Tiempo agotado! El conocimiento necesita velocidad.'
      : '❌ Respuesta incorrecta. El conocimiento es tu superpoder.';
    feedbackEl.classList.remove('hidden');

    // Register failed attempt
    try {
      await apiPost('/attempt', {
        studentCode: STATE.student.code,
        sessionId: STATE.sessionId,
        correct: false,
      });
    } catch (_) {}

    setTimeout(() => {
      showScreen('screen-loser');
      document.getElementById('loser-msg').textContent = 'Respuesta incorrecta. ¡Sigue estudiando y regresa!';
      document.getElementById('loser-score').textContent = 'PUNTAJE: ' + STATE.score;
    }, 3000);
  }
}

// ════════════════════════════════════════════════
// WINNER SCREEN
// ════════════════════════════════════════════════
function showWinner() {
  sfxWin();
  document.getElementById('winner-score').textContent = 'PUNTAJE FINAL: ' + STATE.score;
  showScreen('screen-winner');
  initParticles('winner-particles', 50);
}

document.getElementById('btn-winner-done').addEventListener('click', () => {
  resetAll();
  showScreen('screen-splash');
});

document.getElementById('btn-loser-retry').addEventListener('click', () => {
  resetAll();
  showScreen('screen-splash');
});

// ════════════════════════════════════════════════
// RESET
// ════════════════════════════════════════════════
function resetAll() {
  clearInterval(STATE.timerInterval);
  clearInterval(STATE.challengeTimerInterval);
  clearInterval(STATE.diffInterval);
  if (STATE.gameEngine) { STATE.gameEngine.stop(); STATE.gameEngine = null; }
  STATE.score = 0; STATE.lives = 3; STATE.timer = 90;
  STATE.currentQuestion = null; STATE.sessionId = null;
  document.getElementById('hud-timer').style.color = '';
}

// ════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════
initParticles('particles', 25);
showScreen('screen-splash');

// Inject touch dpad style
const style = document.createElement('style');
style.textContent = `
  #dpad { grid-template-columns: repeat(3,50px); grid-template-rows: repeat(3,50px); gap:4px; }
`;
document.head.appendChild(style);
