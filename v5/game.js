// ══════════════════════════════════════════════════════
// ARRAKIS — RUTA DE LA ESPECIA · NIVEL 1
// Motor del juego
// ══════════════════════════════════════════════════════

// ─── CONFIGURACIÓN ───
const TILE = 44;
const COLS = 20;
const ROWS = 13;
const W = COLS * TILE;
const H = ROWS * TILE;

const SOLUTION_CODE = 'ITC123';
const SOLUTION_ANSWER = `derecha(3)
abajo(4)
derecha(5)
abajo(4)
derecha(3)
abajo(3)
derecha(7)`;

let canvas, ctx;
let gameMode = 'manual';
let gameRunning = false;
let animFrame = null;
let codeRunning = false;
let codeQueue = [];
let codeTimer = null;
let frameTick = 0;

// ─── ESTADO DEL JUGADOR ───
let player = { x: 1, y: 1, spice: 0, steps: 0, alive: true };

// ─── META ───
const goal = { x: 18, y: 12 };

// ─── SOLO 3 ESPECIAS ───
let spicePickupsOriginal = [
  { x: 4, y: 3 },
  { x: 10, y: 6 },
  { x: 15, y: 9 }
];
let spicePickups = [];

// ─── ROCAS ───
const rocks = [
  // Formación izquierda
  { x: 5, y: 2 }, { x: 5, y: 3 }, { x: 5, y: 4 },
  // Formación central
  { x: 9, y: 4 }, { x: 9, y: 5 },
  { x: 10, y: 8 }, { x: 10, y: 9 },
  // Formación derecha
  { x: 14, y: 2 }, { x: 14, y: 3 },
  { x: 15, y: 6 },
  // Formación baja
  { x: 3, y: 9 }, { x: 3, y: 10 },
  { x: 7, y: 11 }, { x: 8, y: 11 },
  { x: 17, y: 4 }, { x: 17, y: 5 },
  { x: 12, y: 11 },
];

// ─── GUSANO SHAI-HULUD ───
let worm = {
  segments: [],
  moveTimer: 0,
  moveInterval: 10,
  patrolPath: [
    // Ruta amplia que recorre gran parte del mapa
    { x: 6, y: 6 },
    { x: 11, y: 6 },
    { x: 14, y: 6 },
    { x: 16, y: 8 },
    { x: 16, y: 10 },
    { x: 14, y: 12 },
    { x: 11, y: 10 },
    { x: 8, y: 8 },
    { x: 6, y: 10 },
    { x: 4, y: 8 },
    { x: 4, y: 6 },
    { x: 6, y: 6 }
  ],
  patrolIndex: 0,
  jawOpen: 0,
  jawDir: 1,
  tremor: 0
};

const WORM_LENGTH = 8;

function initWormSegments() {
  worm.segments = [];
  const start = worm.patrolPath[0];
  for (let i = 0; i < WORM_LENGTH; i++) {
    worm.segments.push({ x: start.x - i, y: start.y });
  }
  worm.patrolIndex = 0;
  worm.moveTimer = 0;
}

// ─── TEXTURAS ───
let sandGrains = [];
let duneWaves = [];
let boneScatter = [];

function generateTextures() {
  sandGrains = [];
  for (let i = 0; i < 400; i++) {
    sandGrains.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.8 + 0.3,
      shade: Math.random(),
      o: Math.random() * 0.18 + 0.04
    });
  }
  duneWaves = [];
  for (let i = 0; i < 12; i++) {
    duneWaves.push({
      x: Math.random() * W,
      y: Math.random() * H,
      w: Math.random() * 250 + 80,
      h: Math.random() * 20 + 5,
      angle: Math.random() * 0.4 - 0.2,
      shade: Math.random() * 0.08 + 0.02
    });
  }
  boneScatter = [];
  for (let i = 0; i < 5; i++) {
    let bx, by;
    do {
      bx = Math.floor(Math.random() * COLS);
      by = Math.floor(Math.random() * ROWS);
    } while (
      rocks.some(r => r.x === bx && r.y === by) ||
      (bx === goal.x && by === goal.y) ||
      (bx <= 2 && by <= 2)
    );
    boneScatter.push({ x: bx, y: by, rot: Math.random() * Math.PI });
  }
}

// ══════════════════════════════════════════════════════
// INICIALIZACIÓN
// ══════════════════════════════════════════════════════
function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = H;
  generateTextures();
}

// ══════════════════════════════════════════════════════
// ARRANCAR / MENU
// ══════════════════════════════════════════════════════
function startGame(mode) {
  gameMode = mode;
  document.getElementById('start-screen').classList.add('hidden');
  const gc = document.getElementById('game-container');
  gc.classList.add('active');

  if (mode === 'code') {
    gc.classList.add('with-editor');
    document.getElementById('editor-panel').classList.add('active');
    document.getElementById('mode-label').textContent = 'PROGRAMAR';
    document.getElementById('footer-hint').textContent = 'Escribe comandos y presiona Ejecutar';
  } else {
    gc.classList.remove('with-editor');
    document.getElementById('editor-panel').classList.remove('active');
    document.getElementById('mode-label').textContent = 'MANUAL';
    document.getElementById('footer-hint').textContent = 'Usa las flechas ↑ ↓ ← → para moverte · WASD también funciona';
  }

  resetGame();
  gameRunning = true;
  gameLoop();
}

function backToMenu() {
  gameRunning = false;
  if (animFrame) cancelAnimationFrame(animFrame);
  stopCode();
  document.getElementById('game-container').classList.remove('active', 'with-editor');
  document.getElementById('editor-panel').classList.remove('active');
  document.getElementById('start-screen').classList.remove('hidden');
  document.getElementById('death-overlay').classList.remove('show');
  document.getElementById('win-overlay').classList.remove('show');
}

function resetGame() {
  player = { x: 1, y: 1, spice: 0, steps: 0, alive: true };
  spicePickups = spicePickupsOriginal.map(s => ({ ...s }));
  initWormSegments();
  stopCode();
  document.getElementById('death-overlay').classList.remove('show');
  document.getElementById('win-overlay').classList.remove('show');
  document.getElementById('editor-status').textContent = 'LISTO';
  updateStats();
  if (!gameRunning) {
    gameRunning = true;
    gameLoop();
  }
}

// ══════════════════════════════════════════════════════
// GAME LOOP
// ══════════════════════════════════════════════════════
function gameLoop() {
  if (!gameRunning) return;
  frameTick++;

  // Animación mandíbula
  worm.jawOpen += 0.06 * worm.jawDir;
  if (worm.jawOpen > 1) worm.jawDir = -1;
  if (worm.jawOpen < 0) worm.jawDir = 1;

  // Mover gusano
  worm.moveTimer++;
  if (worm.moveTimer >= worm.moveInterval) {
    worm.moveTimer = 0;
    moveWorm();
  }

  // Tremor cerca del gusano
  const head = worm.segments[0];
  const dx = player.x - head.x;
  const dy = player.y - head.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  worm.tremor = dist < 5 ? (5 - dist) / 5 : 0;

  draw();
  animFrame = requestAnimationFrame(gameLoop);
}

// ══════════════════════════════════════════════════════
// GUSANO: MOVIMIENTO
// ══════════════════════════════════════════════════════
function moveWorm() {
  if (!player.alive) return;

  const target = worm.patrolPath[worm.patrolIndex];
  const head = worm.segments[0];
  let nx = head.x, ny = head.y;

  // Moverse hacia el target
  const ddx = target.x - head.x;
  const ddy = target.y - head.y;

  if (Math.abs(ddx) >= Math.abs(ddy)) {
    nx += Math.sign(ddx);
  } else {
    ny += Math.sign(ddy);
  }

  // ¿Llegó al target?
  if (nx === target.x && ny === target.y) {
    worm.patrolIndex = (worm.patrolIndex + 1) % worm.patrolPath.length;
  }

  // Evitar rocas
  if (!rocks.some(r => r.x === nx && r.y === ny)) {
    for (let i = worm.segments.length - 1; i > 0; i--) {
      worm.segments[i] = { ...worm.segments[i - 1] };
    }
    worm.segments[0] = { x: nx, y: ny };
  } else {
    // Si hay roca, saltar al siguiente patrol point
    worm.patrolIndex = (worm.patrolIndex + 1) % worm.patrolPath.length;
  }

  checkWormCollision();
}

function checkWormCollision() {
  if (!player.alive) return;
  for (const seg of worm.segments) {
    if (seg.x === player.x && seg.y === player.y) {
      playerDeath();
      return;
    }
  }
}

// ══════════════════════════════════════════════════════
// JUGADOR
// ══════════════════════════════════════════════════════
function movePlayer(dx, dy) {
  if (!player.alive || !gameRunning) return false;

  const nx = player.x + dx;
  const ny = player.y + dy;

  if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return false;
  if (rocks.some(r => r.x === nx && r.y === ny)) return false;

  player.x = nx;
  player.y = ny;
  player.steps++;
  updateStats();

  // Recoger especia
  const si = spicePickups.findIndex(s => s.x === nx && s.y === ny);
  if (si >= 0) {
    spicePickups.splice(si, 1);
    player.spice++;
    updateStats();
  }

  checkWormCollision();

  // Meta
  if (nx === goal.x && ny === goal.y) {
    winGame();
  }

  return true;
}

function playerDeath() {
  player.alive = false;
  gameRunning = false;
  if (animFrame) cancelAnimationFrame(animFrame);

  document.getElementById('death-steps').textContent = player.steps;
  document.getElementById('death-spice').textContent = player.spice;

  // Shake el canvas
  const wrap = document.getElementById('game-canvas-wrap');
  wrap.classList.add('shake');
  setTimeout(() => wrap.classList.remove('shake'), 500);

  // Mostrar overlay con delay
  setTimeout(() => {
    document.getElementById('death-overlay').classList.add('show');
  }, 400);
}

function winGame() {
  gameRunning = false;
  if (animFrame) cancelAnimationFrame(animFrame);
  stopCode();

  document.getElementById('win-msg').textContent =
    `Nivel completado en ${player.steps} pasos · Especia recolectada: ${player.spice}/3`;

  setTimeout(() => {
    document.getElementById('win-overlay').classList.add('show');
  }, 300);
}

function updateStats() {
  document.getElementById('spice-count').textContent = player.spice;
  document.getElementById('step-count').textContent = player.steps;
}

// ══════════════════════════════════════════════════════
// CONTROLES
// ══════════════════════════════════════════════════════
document.addEventListener('keydown', e => {
  if (gameMode !== 'manual' || !gameRunning || !player.alive) return;
  let moved = false;
  switch (e.key) {
    case 'ArrowUp': case 'w': case 'W': moved = movePlayer(0, -1); break;
    case 'ArrowDown': case 's': case 'S': moved = movePlayer(0, 1); break;
    case 'ArrowLeft': case 'a': case 'A': moved = movePlayer(-1, 0); break;
    case 'ArrowRight': case 'd': case 'D': moved = movePlayer(1, 0); break;
  }
  if (moved) e.preventDefault();
});

// ══════════════════════════════════════════════════════
// SISTEMA DE PROGRAMACIÓN
// ══════════════════════════════════════════════════════
function runCode() {
  if (codeRunning) return;
  const raw = document.getElementById('code-editor').value.trim();
  if (!raw) return;

  const consoleEl = document.getElementById('console-output');
  consoleEl.classList.add('active');
  consoleEl.innerHTML = '';

  const lines = raw.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));
  codeQueue = [];

  for (const line of lines) {
    const match = line.match(/^(arriba|abajo|izquierda|derecha|esperar)\s*\(\s*(\d+)\s*\)$/i);
    if (!match) {
      logConsole(`✗ Comando no reconocido: "${line}"`, 'error');
      logConsole('  Formato: comando(número)', 'error');
      return;
    }
    const cmd = match[1].toLowerCase();
    const n = parseInt(match[2]);
    if (n > 50) {
      logConsole(`✗ Valor muy grande: ${n} (máximo 50)`, 'error');
      return;
    }
    for (let i = 0; i < n; i++) {
      codeQueue.push(cmd);
    }
  }

  logConsole(`▶ Ejecutando ${codeQueue.length} instrucciones...`, 'success');
  document.getElementById('editor-status').textContent = 'EJECUTANDO';
  codeRunning = true;
  executeNext();
}

function executeNext() {
  if (!codeRunning || codeQueue.length === 0) {
    codeRunning = false;
    if (player.alive && gameRunning) {
      logConsole('✓ Programa completado.', 'success');
      document.getElementById('editor-status').textContent = 'COMPLETO';
    }
    return;
  }

  const cmd = codeQueue.shift();
  let moved = true;
  switch (cmd) {
    case 'arriba': moved = movePlayer(0, -1); break;
    case 'abajo': moved = movePlayer(0, 1); break;
    case 'izquierda': moved = movePlayer(-1, 0); break;
    case 'derecha': moved = movePlayer(1, 0); break;
    case 'esperar': moved = true; break;
  }

  if (!moved) {
    logConsole(`✗ Bloqueado: ${cmd} (roca o límite)`, 'error');
    codeRunning = false;
    document.getElementById('editor-status').textContent = 'BLOQUEADO';
    return;
  }

  if (!player.alive || !gameRunning) {
    codeRunning = false;
    document.getElementById('editor-status').textContent = 'DETENIDO';
    return;
  }

  codeTimer = setTimeout(executeNext, 250);
}

function stopCode() {
  codeRunning = false;
  codeQueue = [];
  if (codeTimer) clearTimeout(codeTimer);
  document.getElementById('editor-status').textContent = 'LISTO';
}

function logConsole(msg, type = '') {
  const el = document.getElementById('console-output');
  const line = document.createElement('div');
  line.className = 'log-line ' + type;
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

// ══════════════════════════════════════════════════════
// SISTEMA DE SOLUCIÓN
// ══════════════════════════════════════════════════════
function toggleSolutionInput() {
  document.getElementById('solution-input-wrap').classList.toggle('show');
  document.getElementById('solution-error').textContent = '';
}

function checkSolutionCode() {
  const input = document.getElementById('solution-code').value.trim();
  const errorEl = document.getElementById('solution-error');
  if (input === SOLUTION_CODE) {
    errorEl.textContent = '✓ Código correcto';
    errorEl.className = 'solution-error correct';
    // Poner solución en el editor
    document.getElementById('code-editor').value = SOLUTION_ANSWER;
    logConsole('✓ Solución cargada en el editor.', 'success');
  } else {
    errorEl.textContent = '✗ Código incorrecto';
    errorEl.className = 'solution-error wrong';
  }
}

function toggleSolutionFromFooter() {
  if (gameMode === 'code') {
    toggleSolutionInput();
  } else {
    document.getElementById('solution-modal').classList.add('show');
  }
}

function closeSolutionModal() {
  document.getElementById('solution-modal').classList.remove('show');
  document.getElementById('solution-error-modal').textContent = '';
}

function checkSolutionCodeModal() {
  const input = document.getElementById('solution-code-modal').value.trim();
  const errorEl = document.getElementById('solution-error-modal');
  const revealEl = document.getElementById('solution-reveal-modal');
  if (input === SOLUTION_CODE) {
    errorEl.textContent = '✓ Código correcto';
    errorEl.className = 'solution-error correct';
    revealEl.textContent = 'Solución (modo programar):\n\n' + SOLUTION_ANSWER;
    revealEl.classList.add('show');
    revealEl.style.display = 'block';
  } else {
    errorEl.textContent = '✗ Código incorrecto';
    errorEl.className = 'solution-error wrong';
    revealEl.style.display = 'none';
  }
}

// ══════════════════════════════════════════════════════
// DIBUJO — ESCENARIO
// ══════════════════════════════════════════════════════
function draw() {
  ctx.clearRect(0, 0, W, H);

  drawDesert();
  drawGrid();
  drawBones();
  drawRocks();
  drawSpicePickups();
  drawGoal();
  drawWormShadow();
  drawWorm();
  if (player.alive) drawPlayer2();
  drawDangerIndicator();
  drawTremorEffect();
}

function drawDesert() {
  // Gradiente base
  const grad = ctx.createRadialGradient(W * 0.3, H * 0.2, 50, W * 0.5, H * 0.5, W * 0.8);
  grad.addColorStop(0, '#dbb856');
  grad.addColorStop(0.4, '#c9952a');
  grad.addColorStop(0.7, '#b8860b');
  grad.addColorStop(1, '#9a7209');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Ondas de duna
  for (const d of duneWaves) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.angle);
    ctx.globalAlpha = d.shade;
    ctx.fillStyle = '#8b6914';
    ctx.beginPath();
    ctx.ellipse(0, 0, d.w, d.h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // Granos de arena
  for (const g of sandGrains) {
    ctx.globalAlpha = g.o;
    ctx.fillStyle = g.shade > 0.5 ? '#a07a1a' : '#c4a035';
    ctx.fillRect(g.x, g.y, g.r, g.r);
  }
  ctx.globalAlpha = 1;

  // Heat shimmer (ondas de calor)
  const shimmer = Math.sin(frameTick * 0.03) * 2;
  ctx.globalAlpha = 0.03;
  ctx.fillStyle = '#fff';
  for (let y = 0; y < H; y += 30) {
    const offset = Math.sin((y + frameTick * 0.5) * 0.05) * 8 + shimmer;
    ctx.fillRect(offset, y, W, 1);
  }
  ctx.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= W; x += TILE) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += TILE) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
}

function drawBones() {
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = '#d7ccc8';
  ctx.lineWidth = 2;
  for (const b of boneScatter) {
    const cx = b.x * TILE + TILE / 2;
    const cy = b.y * TILE + TILE / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(b.rot);
    // Hueso simple
    ctx.beginPath();
    ctx.moveTo(-8, 0); ctx.lineTo(8, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-8, 0, 3, 0, Math.PI * 2);
    ctx.arc(8, 0, 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// ─── ROCAS ───
function drawRocks() {
  for (const r of rocks) {
    const x = r.x * TILE;
    const y = r.y * TILE;
    const cx = x + TILE / 2;
    const cy = y + TILE / 2;

    // Sombra
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.ellipse(cx + 3, cy + 6, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Roca principal
    ctx.fillStyle = '#5d4e3a';
    ctx.beginPath();
    ctx.moveTo(x + 4, y + TILE - 3);
    ctx.quadraticCurveTo(x + 2, cy - 5, cx, y + 5);
    ctx.quadraticCurveTo(x + TILE - 2, cy - 5, x + TILE - 4, y + TILE - 3);
    ctx.closePath();
    ctx.fill();

    // Highlight
    ctx.fillStyle = '#7d6e5a';
    ctx.beginPath();
    ctx.moveTo(x + 10, y + TILE - 6);
    ctx.quadraticCurveTo(x + 8, cy, cx, y + 9);
    ctx.quadraticCurveTo(x + TILE - 8, cy, x + TILE - 10, y + TILE - 6);
    ctx.closePath();
    ctx.fill();

    // Grietas
    ctx.strokeStyle = '#4a3c2a';
    ctx.lineWidth = 0.7;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(cx - 3, y + 12);
    ctx.lineTo(cx + 2, cy + 2);
    ctx.lineTo(cx - 1, y + TILE - 8);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// ─── ESPECIA ───
function drawSpicePickups() {
  for (const s of spicePickups) {
    const cx = s.x * TILE + TILE / 2;
    const cy = s.y * TILE + TILE / 2;
    const pulse = Math.sin(frameTick * 0.07 + s.x) * 0.3 + 0.7;
    const glow = Math.sin(frameTick * 0.05 + s.y) * 4 + 18;

    // Glow externo
    ctx.globalAlpha = 0.15 * pulse;
    const glowGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, glow);
    glowGrad.addColorStop(0, '#ff9f43');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(cx - glow, cy - glow, glow * 2, glow * 2);

    // Diamante de especia
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#ff6b1a';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx + 8, cy);
    ctx.lineTo(cx, cy + 10);
    ctx.lineTo(cx - 8, cy);
    ctx.closePath();
    ctx.fill();

    // Inner shine
    ctx.fillStyle = '#ffcc02';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 5, cy);
    ctx.lineTo(cx, cy + 6);
    ctx.lineTo(cx - 5, cy);
    ctx.closePath();
    ctx.fill();

    // Sparkle
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = pulse * 0.7;
    ctx.beginPath();
    ctx.arc(cx - 2, cy - 3, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
  }
}

// ─── META ───
function drawGoal() {
  const x = goal.x * TILE;
  const y = goal.y * TILE;
  const cx = x + TILE / 2;
  const cy = y + TILE / 2;
  const pulse = Math.sin(frameTick * 0.04) * 0.2 + 0.8;
  const rotate = frameTick * 0.015;

  // Glow grande
  ctx.globalAlpha = 0.12 * pulse;
  const glowG = ctx.createRadialGradient(cx, cy, 5, cx, cy, 40);
  glowG.addColorStop(0, '#ff6b1a');
  glowG.addColorStop(1, 'transparent');
  ctx.fillStyle = glowG;
  ctx.beginPath();
  ctx.arc(cx, cy, 40, 0, Math.PI * 2);
  ctx.fill();

  // Diamante grande rotando
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotate);

  ctx.fillStyle = '#ff6b1a';
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.lineTo(14, 0);
  ctx.lineTo(0, 17);
  ctx.lineTo(-14, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ff9f43';
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(9, 0);
  ctx.lineTo(0, 11);
  ctx.lineTo(-9, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffcc02';
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(4, 0);
  ctx.lineTo(0, 5);
  ctx.lineTo(-4, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Etiqueta
  ctx.fillStyle = 'rgba(26,14,0,0.7)';
  ctx.font = 'bold 9px Rajdhani';
  ctx.textAlign = 'center';
  ctx.fillText('META', cx, cy + 26);
}

//Gusano 2

function drawWorm() {
  const segs = worm.segments;

  for (let i = segs.length - 1; i >= 0; i--) {
    const seg = segs[i];
    const cx = seg.x * TILE + TILE / 2;
    const cy = seg.y * TILE + TILE / 2;
    const wobble = Math.sin(frameTick * 0.08 + i * 0.8) * 3;
    const t = i / (segs.length - 1);
    const radius = 22 - t * 12;

    // --- EFECTO DE CILINDRO (GRADIENTE) ---
    const grad = ctx.createRadialGradient(cx + wobble - 5, cy - 5, 2, cx + wobble, cy, radius);
    grad.addColorStop(0, '#8d6e63'); // Luz
    grad.addColorStop(1, '#3e2723'); // Sombra profunda

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx + wobble, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    if (i === 0) {
      // --- BOCA TRI-PARTITA ---
      drawShaiHuludMouth(cx + wobble, cy, radius, worm.jawOpen);
    } else {
      // --- ESCAMAS SEGMENTADAS ---
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx + wobble, cy, radius - 2, 0, Math.PI, true);
      ctx.stroke();
    }
  }
}

function drawShaiHuludMouth(x, y, r, open) {
  ctx.fillStyle = '#1a0a05'; // Fondo oscuro de la garganta
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  if (open > 0.1) {
    // Dientes de cristal (Crysknife) distribuidos circularmente
    ctx.fillStyle = '#f5f5f5';
    const numTeeth = 12;
    for (let j = 0; j < numTeeth; j++) {
      const angle = (j / numTeeth) * Math.PI * 2;
      const tx = x + Math.cos(angle) * (r * open);
      const ty = y + Math.sin(angle) * (r * open);
      ctx.beginPath();
      ctx.arc(tx, ty, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ─── GUSANO ───
function drawWormShadow() {
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#1a0e00';
  for (const seg of worm.segments) {
    const sx = seg.x * TILE + TILE / 2 + 4;
    const sy = seg.y * TILE + TILE / 2 + 5;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// function drawWorm() {
//   const segs = worm.segments;

//   // Cola a cabeza (de atrás hacia adelante)
//   for (let i = segs.length - 1; i >= 0; i--) {
//     const seg = segs[i];
//     const cx = seg.x * TILE + TILE / 2;
//     const cy = seg.y * TILE + TILE / 2;
//     const wobble = Math.sin(frameTick * 0.08 + i * 0.8) * 2;

//     const t = i / (segs.length - 1); // 0 = cabeza, 1 = cola
//     const radius = 20 - t * 10;

//     if (i === 0) {
//       // ══ CABEZA ══
//       const jawAngle = worm.jawOpen * 0.35;

//       // Cuerpo cabeza
//       ctx.fillStyle = '#4e342e';
//       ctx.beginPath();
//       ctx.arc(cx + wobble, cy, radius + 2, 0, Math.PI * 2);
//       ctx.fill();

//       ctx.fillStyle = '#5d4037';
//       ctx.beginPath();
//       ctx.arc(cx + wobble, cy, radius, 0, Math.PI * 2);
//       ctx.fill();

//       // Mandíbula superior
//       ctx.fillStyle = '#4e342e';
//       ctx.beginPath();
//       ctx.arc(cx + wobble, cy - jawAngle * 12, radius - 2, Math.PI + 0.3, -0.3);
//       ctx.closePath();
//       ctx.fill();

//       // Mandíbula inferior
//       ctx.beginPath();
//       ctx.arc(cx + wobble, cy + jawAngle * 12, radius - 2, 0.3, Math.PI - 0.3);
//       ctx.closePath();
//       ctx.fill();

//       // Interior boca (rojo)
//       if (worm.jawOpen > 0.2) {
//         ctx.fillStyle = '#b71c1c';
//         ctx.globalAlpha = worm.jawOpen;
//         ctx.beginPath();
//         ctx.ellipse(cx + wobble, cy, radius - 5, jawAngle * 10, 0, 0, Math.PI * 2);
//         ctx.fill();
//         ctx.globalAlpha = 1;
//       }

//       // Dientes
//       ctx.fillStyle = '#ffecb3';
//       const teethCount = 6;
//       for (let t = 0; t < teethCount; t++) {
//         const angle = (t / teethCount) * Math.PI - Math.PI / 2;
//         const tx = cx + wobble + Math.cos(angle) * (radius - 4);
//         const ty = cy - jawAngle * 10 + Math.sin(angle) * 4;
//         ctx.beginPath();
//         ctx.moveTo(tx - 2, ty);
//         ctx.lineTo(tx, ty + 5 + jawAngle * 3);
//         ctx.lineTo(tx + 2, ty);
//         ctx.closePath();
//         ctx.fill();
//       }
//       // Dientes inferiores
//       for (let t = 0; t < teethCount; t++) {
//         const angle = (t / teethCount) * Math.PI + Math.PI / 2;
//         const tx = cx + wobble + Math.cos(angle) * (radius - 4);
//         const ty = cy + jawAngle * 10 + Math.sin(angle) * 4;
//         ctx.beginPath();
//         ctx.moveTo(tx - 2, ty);
//         ctx.lineTo(tx, ty - 5 - jawAngle * 3);
//         ctx.lineTo(tx + 2, ty);
//         ctx.closePath();
//         ctx.fill();
//       }

//       // Ojos
//       const eyeGlow = Math.sin(frameTick * 0.1) * 0.3 + 0.7;
//       // Glow de ojos
//       ctx.globalAlpha = 0.4 * eyeGlow;
//       ctx.fillStyle = '#ff1744';
//       ctx.beginPath();
//       ctx.arc(cx + wobble - 7, cy - 8, 7, 0, Math.PI * 2);
//       ctx.fill();
//       ctx.beginPath();
//       ctx.arc(cx + wobble + 7, cy - 8, 7, 0, Math.PI * 2);
//       ctx.fill();
//       ctx.globalAlpha = 1;

//       // Ojo izquierdo
//       ctx.fillStyle = '#ff1744';
//       ctx.beginPath();
//       ctx.arc(cx + wobble - 7, cy - 8, 4.5, 0, Math.PI * 2);
//       ctx.fill();
//       // Pupila
//       ctx.fillStyle = '#b71c1c';
//       ctx.beginPath();
//       ctx.arc(cx + wobble - 7, cy - 8, 2.5, 0, Math.PI * 2);
//       ctx.fill();
//       // Brillo
//       ctx.fillStyle = '#ffcdd2';
//       ctx.beginPath();
//       ctx.arc(cx + wobble - 8, cy - 9.5, 1.2, 0, Math.PI * 2);
//       ctx.fill();

//       // Ojo derecho
//       ctx.fillStyle = '#ff1744';
//       ctx.beginPath();
//       ctx.arc(cx + wobble + 7, cy - 8, 4.5, 0, Math.PI * 2);
//       ctx.fill();
//       ctx.fillStyle = '#b71c1c';
//       ctx.beginPath();
//       ctx.arc(cx + wobble + 7, cy - 8, 2.5, 0, Math.PI * 2);
//       ctx.fill();
//       ctx.fillStyle = '#ffcdd2';
//       ctx.beginPath();
//       ctx.arc(cx + wobble + 6, cy - 9.5, 1.2, 0, Math.PI * 2);
//       ctx.fill();

//     } else {
//       // ══ SEGMENTO DE CUERPO ══
//       const shade = t < 0.5 ? '#6d4c41' : '#8d6e63';
//       const shadeInner = t < 0.5 ? '#795548' : '#a1887f';

//       ctx.fillStyle = shade;
//       ctx.beginPath();
//       ctx.arc(cx + wobble, cy, radius, 0, Math.PI * 2);
//       ctx.fill();

//       // Anillo del segmento
//       ctx.strokeStyle = shadeInner;
//       ctx.lineWidth = 1.5;
//       ctx.beginPath();
//       ctx.arc(cx + wobble, cy, radius - 3, 0, Math.PI * 2);
//       ctx.stroke();

//       // Textura de escamas
//       ctx.globalAlpha = 0.2;
//       ctx.strokeStyle = '#4e342e';
//       ctx.lineWidth = 0.8;
//       ctx.beginPath();
//       ctx.moveTo(cx + wobble - radius + 4, cy);
//       ctx.lineTo(cx + wobble + radius - 4, cy);
//       ctx.stroke();
//       ctx.globalAlpha = 1;
//     }
//   }
// }

// Jugador 2

function drawPlayer2() {
  const cx = player.x * TILE + TILE / 2;
  const cy = player.y * TILE + TILE / 2;
  const bob = Math.sin(frameTick * 0.15) * 2;

  // --- CAPA DESGASTADA ---
  ctx.fillStyle = '#5d4037'; // Marrón rocoso
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy + 10 + bob);
  // Movimiento de la capa según el bobbing
  ctx.quadraticCurveTo(cx, cy + 25 + bob, cx + 15, cy + 12 + bob);
  ctx.lineTo(cx + 8, cy - 5 + bob);
  ctx.fill();

  // --- CUERPO (STILSUIT) ---
  ctx.fillStyle = '#37474f'; // Gris industrial/desgastado
  ctx.beginPath();
  ctx.roundRect(cx - 8, cy - 2 + bob, 16, 18, 5);
  ctx.fill();

  // --- CABEZA Y DESTILTRAJE ---
  ctx.fillStyle = '#bcaaa4';
  ctx.beginPath();
  ctx.arc(cx, cy - 10 + bob, 7, 0, Math.PI * 2);
  ctx.fill();

  // Capucha
  ctx.fillStyle = '#455a64';
  ctx.beginPath();
  ctx.arc(cx, cy - 10 + bob, 7.5, Math.PI, 0); 
  ctx.fill();

  // Máscara (Filtro de nariz/boca)
  ctx.fillStyle = '#263238';
  ctx.fillRect(cx - 3, cy - 8 + bob, 6, 4);

  // --- OJOS DEL IBAD (Glow intenso) ---
  const eyeBlue = '#00e5ff';
  ctx.shadowBlur = 8;
  ctx.shadowColor = eyeBlue;
  ctx.fillStyle = eyeBlue;
  ctx.beginPath();
  ctx.arc(cx - 3, cy - 11 + bob, 1.8, 0, Math.PI * 2);
  ctx.arc(cx + 3, cy - 11 + bob, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0; // Reset para no afectar otros dibujos
}

// ─── JUGADOR ───
function drawPlayer() {
  const cx = player.x * TILE + TILE / 2;
  const cy = player.y * TILE + TILE / 2;
  const bob = Math.sin(frameTick * 0.1) * 1.5;

  // Sombra
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#1a0e00';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 18, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Capa Fremen (stilsuit)
  ctx.fillStyle = '#1a237e';
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy + 17 + bob);
  ctx.quadraticCurveTo(cx, cy - 2 + bob, cx + 14, cy + 17 + bob);
  ctx.lineTo(cx + 10, cy + 17 + bob);
  ctx.quadraticCurveTo(cx, cy + 4 + bob, cx - 10, cy + 17 + bob);
  ctx.closePath();
  ctx.fill();

  // Cuerpo
  ctx.fillStyle = '#283593';
  ctx.beginPath();
  ctx.arc(cx, cy + 4 + bob, 10, 0, Math.PI * 2);
  ctx.fill();

  // Detalle del stilsuit
  ctx.strokeStyle = '#3949ab';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 5 + bob);
  ctx.lineTo(cx, cy + 12 + bob);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy + 2 + bob);
  ctx.lineTo(cx + 6, cy + 2 + bob);
  ctx.stroke();

  // Cabeza
  ctx.fillStyle = '#bcaaa4';
  ctx.beginPath();
  ctx.arc(cx, cy - 8 + bob, 8, 0, Math.PI * 2);
  ctx.fill();

  // Capucha
  ctx.fillStyle = '#1a237e';
  ctx.beginPath();
  ctx.arc(cx, cy - 8 + bob, 8, Math.PI + 0.4, -0.4);
  ctx.closePath();
  ctx.fill();

  // Ojos azules Fremen (los ojos del Ibad)
  const eyeGlow = Math.sin(frameTick * 0.08) * 0.15 + 0.85;

  // Glow ojos
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#4fc3f7';
  ctx.beginPath();
  ctx.arc(cx - 3, cy - 9 + bob, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 3, cy - 9 + bob, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#4fc3f7';
  ctx.beginPath();
  ctx.arc(cx - 3, cy - 9 + bob, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 3, cy - 9 + bob, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Pupila
  ctx.fillStyle = '#01579b';
  ctx.beginPath();
  ctx.arc(cx - 3, cy - 9 + bob, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 3, cy - 9 + bob, 1, 0, Math.PI * 2);
  ctx.fill();

  // Brillo ojos
  ctx.fillStyle = '#e1f5fe';
  ctx.globalAlpha = eyeGlow;
  ctx.beginPath();
  ctx.arc(cx - 4, cy - 10 + bob, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 2, cy - 10 + bob, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ─── INDICADOR DE PELIGRO ───
function drawDangerIndicator() {
  if (frameTick % 80 > 40) return;
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = '#ff1744';
  for (const seg of worm.segments) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = seg.x + dx;
        const ny = seg.y + dy;
        if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
          ctx.fillRect(nx * TILE, ny * TILE, TILE, TILE);
        }
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawTremorEffect() {
  if (worm.tremor <= 0) return;
  ctx.globalAlpha = worm.tremor * 0.08;
  ctx.fillStyle = '#ff1744';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  // Vibración del canvas (via CSS transform se puede hacer)
  if (worm.tremor > 0.5) {
    const shakeX = (Math.random() - 0.5) * worm.tremor * 3;
    const shakeY = (Math.random() - 0.5) * worm.tremor * 3;
    canvas.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
  } else {
    canvas.style.transform = '';
  }
}

// ══════════════════════════════════════════════════════
// ARRANQUE
// ══════════════════════════════════════════════════════
init();
