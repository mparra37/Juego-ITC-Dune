// ══════════════════════════════════════════════════════
// ARRAKIS — RUTA DE LA ESPECIA
// Motor del juego · 5 Niveles
// ══════════════════════════════════════════════════════

const TILE = 44;
const COLS = 20;
const ROWS = 13;
const W = COLS * TILE;
const H = ROWS * TILE;
const SOLUTION_CODE = 'ITC123';

let canvas, ctx;
let gameMode = 'manual';
let gameRunning = false;
let animFrame = null;
let codeRunning = false;
let codeQueue = [];
let codeTimer = null;
let frameTick = 0;
let currentLevel = 1;

// ─── ESTADO ───
let player, spicePickups, worm;

// ══════════════════════════════════════════════════════
// DEFINICIÓN DE LOS 5 NIVELES
// ══════════════════════════════════════════════════════
const LEVELS = {
  1: {
    name: 'El Primer Paso',
    wormSpeed: 18,       // frames entre movimientos del gusano (más alto = más lento)
    wormLength: 5,
    wormStart: { x: 15, y: 10 },
    playerStart: { x: 1, y: 1 },
    spice: [
      { x: 5, y: 2 }, { x: 10, y: 6 }, { x: 16, y: 4 }
    ],
    rocks: [
      { x: 4, y: 4 }, { x: 4, y: 5 },
      { x: 9, y: 3 }, { x: 9, y: 4 },
      { x: 14, y: 7 }, { x: 14, y: 8 },
      { x: 7, y: 9 }, { x: 7, y: 10 },
      { x: 17, y: 2 },
    ],
    speedLabel: 'LENTO',
    solution: `derecha(4)
abajo(1)
derecha(5)
abajo(4)
derecha(6)
abajo(1)
izquierda(2)
abajo(3)`
  },
  2: {
    name: 'Arenas Movedizas',
    wormSpeed: 14,
    wormLength: 6,
    wormStart: { x: 10, y: 6 },
    playerStart: { x: 0, y: 0 },
    spice: [
      { x: 3, y: 3 }, { x: 9, y: 1 }, { x: 16, y: 5 }, { x: 6, y: 10 }
    ],
    rocks: [
      { x: 5, y: 2 }, { x: 5, y: 3 }, { x: 5, y: 4 },
      { x: 10, y: 4 }, { x: 10, y: 5 },
      { x: 13, y: 2 }, { x: 13, y: 3 },
      { x: 8, y: 8 }, { x: 8, y: 9 },
      { x: 15, y: 8 }, { x: 15, y: 9 },
      { x: 3, y: 7 },
      { x: 18, y: 3 },
      { x: 12, y: 10 }, { x: 12, y: 11 },
    ],
    speedLabel: 'MODERADO',
    solution: `derecha(3)
abajo(3)
derecha(6)
arriba(2)
derecha(7)
abajo(4)
izquierda(10)
abajo(3)`
  },
  3: {
    name: 'Territorio del Gusano',
    wormSpeed: 11,
    wormLength: 7,
    wormStart: { x: 10, y: 5 },
    playerStart: { x: 0, y: 12 },
    spice: [
      { x: 3, y: 1 }, { x: 14, y: 2 }, { x: 18, y: 8 },
      { x: 8, y: 11 }, { x: 1, y: 6 }
    ],
    rocks: [
      { x: 5, y: 1 }, { x: 5, y: 2 },
      { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 6, y: 7 },
      { x: 11, y: 3 }, { x: 12, y: 3 },
      { x: 10, y: 8 }, { x: 10, y: 9 },
      { x: 15, y: 5 }, { x: 15, y: 6 },
      { x: 14, y: 10 }, { x: 14, y: 11 },
      { x: 3, y: 9 }, { x: 3, y: 10 },
      { x: 17, y: 11 }, { x: 18, y: 11 },
    ],
    speedLabel: 'RÁPIDO',
    solution: `arriba(6)
derecha(1)
arriba(5)
derecha(2)
abajo(5)
derecha(4)
abajo(5)
derecha(4)
abajo(1)
derecha(5)
arriba(4)`
  },
  4: {
    name: 'Tormenta de Arena',
    wormSpeed: 8,
    wormLength: 8,
    wormStart: { x: 9, y: 7 },
    playerStart: { x: 0, y: 0 },
    spice: [
      { x: 4, y: 2 }, { x: 12, y: 1 }, { x: 18, y: 4 },
      { x: 15, y: 10 }, { x: 7, y: 8 }, { x: 1, y: 11 }
    ],
    rocks: [
      { x: 3, y: 4 }, { x: 3, y: 5 },
      { x: 7, y: 2 }, { x: 7, y: 3 },
      { x: 11, y: 5 }, { x: 11, y: 6 },
      { x: 14, y: 3 }, { x: 14, y: 4 },
      { x: 6, y: 6 },
      { x: 16, y: 7 }, { x: 16, y: 8 },
      { x: 9, y: 10 }, { x: 9, y: 11 },
      { x: 4, y: 9 },
      { x: 18, y: 9 },
      { x: 13, y: 11 }, { x: 13, y: 12 },
    ],
    speedLabel: 'MUY RÁPIDO',
    solution: `derecha(4)
abajo(2)
derecha(8)
arriba(1)
derecha(6)
abajo(3)
izquierda(3)
abajo(6)
izquierda(8)
abajo(1)
izquierda(1)
abajo(1)
derecha(2)`
  },
  5: {
    name: 'La Prueba Final',
    wormSpeed: 5,
    wormLength: 10,
    wormStart: { x: 10, y: 6 },
    playerStart: { x: 0, y: 6 },
    spice: [
      { x: 3, y: 1 }, { x: 10, y: 0 }, { x: 18, y: 2 },
      { x: 17, y: 10 }, { x: 8, y: 11 },
      { x: 1, y: 10 }, { x: 13, y: 6 }
    ],
    rocks: [
      { x: 5, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 2 },
      { x: 7, y: 4 }, { x: 7, y: 5 },
      { x: 3, y: 7 }, { x: 3, y: 8 },
      { x: 12, y: 3 }, { x: 12, y: 4 },
      { x: 15, y: 5 }, { x: 15, y: 6 }, { x: 15, y: 7 },
      { x: 10, y: 9 }, { x: 10, y: 10 },
      { x: 6, y: 10 }, { x: 6, y: 11 },
      { x: 17, y: 7 },
      { x: 14, y: 11 }, { x: 14, y: 12 },
      { x: 2, y: 3 },
    ],
    speedLabel: 'EXTREMO',
    solution: `arriba(5)
derecha(3)
arriba(1)
derecha(7)
abajo(1)
derecha(3)
abajo(1)
derecha(5)
abajo(1)
izquierda(1)
abajo(8)
izquierda(9)
abajo(1)
izquierda(6)`
  }
};

// ─── TEXTURAS ───
let sandGrains = [];
let duneWaves = [];
let boneScatter = [];

function generateTextures() {
  sandGrains = [];
  for (let i = 0; i < 350; i++) {
    sandGrains.push({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.8 + 0.3,
      shade: Math.random(),
      o: Math.random() * 0.15 + 0.04
    });
  }
  duneWaves = [];
  for (let i = 0; i < 10; i++) {
    duneWaves.push({
      x: Math.random() * W, y: Math.random() * H,
      w: Math.random() * 220 + 80, h: Math.random() * 18 + 5,
      angle: Math.random() * 0.4 - 0.2, shade: Math.random() * 0.07 + 0.02
    });
  }
  boneScatter = [];
  const lvl = LEVELS[currentLevel];
  for (let i = 0; i < 4; i++) {
    let bx, by, valid;
    do {
      bx = Math.floor(Math.random() * COLS);
      by = Math.floor(Math.random() * ROWS);
      valid = !lvl.rocks.some(r => r.x === bx && r.y === by) &&
              !lvl.spice.some(s => s.x === bx && s.y === by) &&
              !(bx === lvl.playerStart.x && by === lvl.playerStart.y);
    } while (!valid);
    boneScatter.push({ x: bx, y: by, rot: Math.random() * Math.PI });
  }
}

// ══════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════
function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = H;
}

// ══════════════════════════════════════════════════════
// START / MENU / LEVEL FLOW
// ══════════════════════════════════════════════════════
function startGame(mode) {
  gameMode = mode;
  currentLevel = 1;
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('game-container').classList.add('active');

  if (mode === 'code') {
    document.getElementById('editor-panel').classList.add('active');
    document.getElementById('mode-label').textContent = 'PROGRAMAR';
    document.getElementById('footer-hint').textContent = 'Escribe comandos → Ejecutar · Recoge toda la especia';
  } else {
    document.getElementById('editor-panel').classList.remove('active');
    document.getElementById('mode-label').textContent = 'MANUAL';
    document.getElementById('footer-hint').textContent = 'Flechas ↑↓←→ / WASD · Recoge toda la especia';
  }

  loadLevel(currentLevel);
}

function backToMenu() {
  gameRunning = false;
  if (animFrame) cancelAnimationFrame(animFrame);
  stopCode();
  document.getElementById('game-container').classList.remove('active');
  document.getElementById('editor-panel').classList.remove('active');
  document.getElementById('start-screen').classList.remove('hidden');
  hideAllOverlays();
}

function loadLevel(num) {
  const lvl = LEVELS[num];
  if (!lvl) return;

  hideAllOverlays();
  stopCode();

  currentLevel = num;
  player = { x: lvl.playerStart.x, y: lvl.playerStart.y, spice: 0, steps: 0, alive: true };
  spicePickups = lvl.spice.map(s => ({ ...s }));

  // Inicializar gusano
  worm = {
    segments: [],
    moveTimer: 0,
    moveInterval: lvl.wormSpeed,
    jawOpen: 0, jawDir: 1, tremor: 0
  };
  for (let i = 0; i < lvl.wormLength; i++) {
    worm.segments.push({ x: lvl.wormStart.x - i, y: lvl.wormStart.y });
  }

  generateTextures();

  // UI
  document.getElementById('header-level-text').textContent = `NIVEL ${num}`;
  document.getElementById('spice-total').textContent = `/ ${lvl.spice.length}`;
  document.getElementById('worm-speed-label').textContent = lvl.speedLabel;
  document.getElementById('editor-status').textContent = 'LISTO';
  updateStats();

  // Anuncio de nivel
  const announce = document.getElementById('level-announce');
  document.getElementById('announce-level-num').textContent = `NIVEL ${num}`;
  document.getElementById('announce-level-name').textContent = lvl.name;
  announce.classList.add('show');

  gameRunning = true;
  if (animFrame) cancelAnimationFrame(animFrame);
  gameLoop();

  setTimeout(() => announce.classList.remove('show'), 1800);
}

function resetLevel() {
  hideAllOverlays();
  loadLevel(currentLevel);
}

function nextLevel() {
  if (currentLevel >= 5) {
    showCompleteScreen();
    return;
  }
  hideAllOverlays();
  loadLevel(currentLevel + 1);
  // Limpiar editor
  document.getElementById('code-editor').value = '';
  const consoleEl = document.getElementById('console-output');
  consoleEl.innerHTML = '';
  consoleEl.classList.remove('active');
}

function showCompleteScreen() {
  hideAllOverlays();
  document.getElementById('complete-msg').textContent =
    `¡Felicidades! Has dominado los 5 niveles de Arrakis. Eres un verdadero Fremen.`;
  document.getElementById('complete-overlay').classList.add('show');
  gameRunning = false;
}

function hideAllOverlays() {
  document.getElementById('death-overlay').classList.remove('show');
  document.getElementById('win-overlay').classList.remove('show');
  document.getElementById('complete-overlay').classList.remove('show');
  document.getElementById('level-announce').classList.remove('show');
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

  // Tremor
  const head = worm.segments[0];
  const dx = player.x - head.x;
  const dy = player.y - head.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  worm.tremor = dist < 5 ? (5 - dist) / 5 : 0;

  draw();
  animFrame = requestAnimationFrame(gameLoop);
}

// ══════════════════════════════════════════════════════
// GUSANO: PERSECUCIÓN (IA)
// ══════════════════════════════════════════════════════
function moveWorm() {
  if (!player.alive) return;

  const head = worm.segments[0];
  const lvl = LEVELS[currentLevel];
  let nx = head.x, ny = head.y;

  // Perseguir al jugador: decidir dirección
  const ddx = player.x - head.x;
  const ddy = player.y - head.y;

  // Intentar primero la dirección con mayor distancia
  let primary, secondary;
  if (Math.abs(ddx) >= Math.abs(ddy)) {
    primary = { x: head.x + Math.sign(ddx), y: head.y };
    secondary = ddy !== 0 ? { x: head.x, y: head.y + Math.sign(ddy) } : null;
  } else {
    primary = { x: head.x, y: head.y + Math.sign(ddy) };
    secondary = ddx !== 0 ? { x: head.x + Math.sign(ddx), y: head.y } : null;
  }

  // Verificar si la celda es válida (no roca, no fuera de mapa, no su propio cuerpo)
  function isValid(pos) {
    if (pos.x < 0 || pos.x >= COLS || pos.y < 0 || pos.y >= ROWS) return false;
    if (lvl.rocks.some(r => r.x === pos.x && r.y === pos.y)) return false;
    // No chocar con su propio cuerpo (excepto la cola que se moverá)
    for (let i = 0; i < worm.segments.length - 1; i++) {
      if (worm.segments[i].x === pos.x && worm.segments[i].y === pos.y) return false;
    }
    return true;
  }

  let moved = false;
  if (isValid(primary)) {
    nx = primary.x; ny = primary.y; moved = true;
  } else if (secondary && isValid(secondary)) {
    nx = secondary.x; ny = secondary.y; moved = true;
  } else {
    // Intentar cualquier dirección libre
    const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
    for (const d of dirs) {
      const test = { x: head.x + d.x, y: head.y + d.y };
      if (isValid(test)) {
        nx = test.x; ny = test.y; moved = true; break;
      }
    }
  }

  if (moved) {
    for (let i = worm.segments.length - 1; i > 0; i--) {
      worm.segments[i] = { ...worm.segments[i - 1] };
    }
    worm.segments[0] = { x: nx, y: ny };
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
  const lvl = LEVELS[currentLevel];
  const nx = player.x + dx;
  const ny = player.y + dy;

  if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return false;
  if (lvl.rocks.some(r => r.x === nx && r.y === ny)) return false;

  player.x = nx;
  player.y = ny;
  player.steps++;

  // Recoger especia
  const si = spicePickups.findIndex(s => s.x === nx && s.y === ny);
  if (si >= 0) {
    spicePickups.splice(si, 1);
    player.spice++;
  }

  updateStats();
  checkWormCollision();

  // ¿Toda la especia recogida?
  if (spicePickups.length === 0) {
    winLevel();
  }

  return true;
}

function playerDeath() {
  player.alive = false;
  gameRunning = false;
  if (animFrame) cancelAnimationFrame(animFrame);

  document.getElementById('death-steps').textContent = player.steps;
  document.getElementById('death-spice').textContent = player.spice;

  const wrap = document.getElementById('game-canvas-wrap');
  wrap.classList.add('shake');
  setTimeout(() => wrap.classList.remove('shake'), 500);
  setTimeout(() => document.getElementById('death-overlay').classList.add('show'), 400);
}

function winLevel() {
  gameRunning = false;
  if (animFrame) cancelAnimationFrame(animFrame);
  stopCode();

  if (currentLevel >= 5) {
    setTimeout(() => showCompleteScreen(), 500);
    return;
  }

  document.getElementById('win-title').textContent = `¡NIVEL ${currentLevel} COMPLETADO!`;
  document.getElementById('win-msg').textContent =
    `${player.steps} pasos · Especia: ${player.spice}/${LEVELS[currentLevel].spice.length}`;
  setTimeout(() => document.getElementById('win-overlay').classList.add('show'), 400);
}

function updateStats() {
  document.getElementById('spice-count').textContent = player.spice;
  document.getElementById('step-count').textContent = player.steps;
}

// ══════════════════════════════════════════════════════
// CONTROLES TECLADO
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
// PROGRAMACIÓN
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
      logConsole(`✗ Error: "${line}"`, 'error');
      logConsole('  Formato: comando(número)', 'error');
      return;
    }
    const cmd = match[1].toLowerCase();
    const n = parseInt(match[2]);
    if (n > 50) { logConsole(`✗ Máximo 50`, 'error'); return; }
    for (let i = 0; i < n; i++) codeQueue.push(cmd);
  }

  logConsole(`▶ Ejecutando ${codeQueue.length} pasos...`, 'success');
  document.getElementById('editor-status').textContent = 'EJECUTANDO';
  codeRunning = true;
  executeNext();
}

function executeNext() {
  if (!codeRunning || codeQueue.length === 0) {
    codeRunning = false;
    if (player.alive && gameRunning) {
      logConsole('✓ Programa terminado.', 'success');
      if (spicePickups.length > 0) {
        logConsole(`⚠ Faltan ${spicePickups.length} especias por recoger`, 'error');
      }
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
    logConsole(`✗ Bloqueado: ${cmd}`, 'error');
    codeRunning = false;
    document.getElementById('editor-status').textContent = 'BLOQUEADO';
    return;
  }
  if (!player.alive || !gameRunning) {
    codeRunning = false;
    document.getElementById('editor-status').textContent = 'DETENIDO';
    return;
  }

  codeTimer = setTimeout(executeNext, 220);
}

function stopCode() {
  codeRunning = false;
  codeQueue = [];
  if (codeTimer) clearTimeout(codeTimer);
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
// SOLUCIÓN
// ══════════════════════════════════════════════════════
function toggleSolutionInput() {
  document.getElementById('solution-input-wrap').classList.toggle('show');
  document.getElementById('solution-error').textContent = '';
}
function checkSolutionCode() {
  const input = document.getElementById('solution-code').value.trim();
  const errEl = document.getElementById('solution-error');
  if (input === SOLUTION_CODE) {
    errEl.textContent = '✓ Código correcto'; errEl.className = 'solution-error correct';
    document.getElementById('code-editor').value = LEVELS[currentLevel].solution;
    logConsole(`✓ Solución del nivel ${currentLevel} cargada.`, 'success');
  } else {
    errEl.textContent = '✗ Código incorrecto'; errEl.className = 'solution-error wrong';
  }
}
function toggleSolutionFromFooter() {
  if (gameMode === 'code') toggleSolutionInput();
  else document.getElementById('solution-modal').classList.add('show');
}
function closeSolutionModal() {
  document.getElementById('solution-modal').classList.remove('show');
  document.getElementById('solution-error-modal').textContent = '';
  const r = document.getElementById('solution-reveal-modal');
  r.style.display = 'none'; r.classList.remove('show');
}
function checkSolutionCodeModal() {
  const input = document.getElementById('solution-code-modal').value.trim();
  const errEl = document.getElementById('solution-error-modal');
  const revEl = document.getElementById('solution-reveal-modal');
  if (input === SOLUTION_CODE) {
    errEl.textContent = '✓ Correcto'; errEl.className = 'solution-error correct';
    revEl.textContent = `Solución Nivel ${currentLevel} (modo programar):\n\n` + LEVELS[currentLevel].solution;
    revEl.classList.add('show'); revEl.style.display = 'block';
  } else {
    errEl.textContent = '✗ Incorrecto'; errEl.className = 'solution-error wrong';
    revEl.style.display = 'none';
  }
}

// ══════════════════════════════════════════════════════
// DIBUJO
// ══════════════════════════════════════════════════════
function draw() {
  ctx.clearRect(0, 0, W, H);
  drawDesert();
  drawGrid();
  drawBones();
  drawRocks();
  drawSpicePickups();
  drawWormTrail();
  drawWorm();
  if (player.alive) drawPlayer();
  drawHUD();
  drawTremorEffect();
}

function drawDesert() {
  const grad = ctx.createRadialGradient(W * 0.3, H * 0.2, 50, W * 0.5, H * 0.5, W * 0.8);
  grad.addColorStop(0, '#dbb856');
  grad.addColorStop(0.4, '#c9952a');
  grad.addColorStop(0.7, '#b8860b');
  grad.addColorStop(1, '#9a7209');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  for (const d of duneWaves) {
    ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.angle);
    ctx.globalAlpha = d.shade; ctx.fillStyle = '#8b6914';
    ctx.beginPath(); ctx.ellipse(0, 0, d.w, d.h, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  for (const g of sandGrains) {
    ctx.globalAlpha = g.o;
    ctx.fillStyle = g.shade > 0.5 ? '#a07a1a' : '#c4a035';
    ctx.fillRect(g.x, g.y, g.r, g.r);
  }
  ctx.globalAlpha = 1;

  // Heat shimmer
  const shimmer = Math.sin(frameTick * 0.03) * 2;
  ctx.globalAlpha = 0.025;
  ctx.fillStyle = '#fff';
  for (let y = 0; y < H; y += 28) {
    const offset = Math.sin((y + frameTick * 0.5) * 0.05) * 8 + shimmer;
    ctx.fillRect(offset, y, W, 1);
  }
  ctx.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(0,0,0,0.04)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= W; x += TILE) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += TILE) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}

function drawBones() {
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = '#d7ccc8';
  ctx.lineWidth = 2;
  for (const b of boneScatter) {
    const cx = b.x * TILE + TILE / 2, cy = b.y * TILE + TILE / 2;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(b.rot);
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(-8, 0, 3, 0, Math.PI * 2); ctx.arc(8, 0, 3, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawRocks() {
  const lvl = LEVELS[currentLevel];
  for (const r of lvl.rocks) {
    const x = r.x * TILE, y = r.y * TILE;
    const cx = x + TILE / 2, cy = y + TILE / 2;

    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#3e2723';
    ctx.beginPath(); ctx.ellipse(cx + 3, cy + 6, 17, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#5d4e3a';
    ctx.beginPath();
    ctx.moveTo(x + 4, y + TILE - 3);
    ctx.quadraticCurveTo(x + 2, cy - 5, cx, y + 5);
    ctx.quadraticCurveTo(x + TILE - 2, cy - 5, x + TILE - 4, y + TILE - 3);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#7d6e5a';
    ctx.beginPath();
    ctx.moveTo(x + 10, y + TILE - 6);
    ctx.quadraticCurveTo(x + 8, cy, cx, y + 9);
    ctx.quadraticCurveTo(x + TILE - 8, cy, x + TILE - 10, y + TILE - 6);
    ctx.closePath(); ctx.fill();

    ctx.strokeStyle = '#4a3c2a'; ctx.lineWidth = 0.7; ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.moveTo(cx - 3, y + 12); ctx.lineTo(cx + 2, cy + 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawSpicePickups() {
  for (const s of spicePickups) {
    const cx = s.x * TILE + TILE / 2, cy = s.y * TILE + TILE / 2;
    const pulse = Math.sin(frameTick * 0.07 + s.x) * 0.3 + 0.7;
    const glow = Math.sin(frameTick * 0.05 + s.y) * 4 + 16;

    ctx.globalAlpha = 0.15 * pulse;
    const glowG = ctx.createRadialGradient(cx, cy, 2, cx, cy, glow);
    glowG.addColorStop(0, '#ff9f43'); glowG.addColorStop(1, 'transparent');
    ctx.fillStyle = glowG;
    ctx.fillRect(cx - glow, cy - glow, glow * 2, glow * 2);

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#ff6b1a';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 10); ctx.lineTo(cx + 8, cy); ctx.lineTo(cx, cy + 10); ctx.lineTo(cx - 8, cy);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#ffcc02';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + 5, cy); ctx.lineTo(cx, cy + 6); ctx.lineTo(cx - 5, cy);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#fff'; ctx.globalAlpha = pulse * 0.6;
    ctx.beginPath(); ctx.arc(cx - 2, cy - 3, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawWormTrail() {
  // Rastro perturbado en la arena detrás del gusano
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#3e2723';
  for (const seg of worm.segments) {
    ctx.beginPath();
    ctx.ellipse(seg.x * TILE + TILE / 2 + 3, seg.y * TILE + TILE / 2 + 4, 18, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawWorm() {
  const segs = worm.segments;

  for (let i = segs.length - 1; i >= 0; i--) {
    const seg = segs[i];
    const cx = seg.x * TILE + TILE / 2;
    const cy = seg.y * TILE + TILE / 2;
    const wobble = Math.sin(frameTick * 0.08 + i * 0.8) * 2.5;
    const t = i / (segs.length - 1);
    const radius = 19 - t * 9;

    if (i === 0) {
      // ══ CABEZA ══
      const jaw = worm.jawOpen * 0.35;

      ctx.fillStyle = '#4e342e';
      ctx.beginPath(); ctx.arc(cx + wobble, cy, radius + 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5d4037';
      ctx.beginPath(); ctx.arc(cx + wobble, cy, radius, 0, Math.PI * 2); ctx.fill();

      // Mandíbulas
      ctx.fillStyle = '#4e342e';
      ctx.beginPath(); ctx.arc(cx + wobble, cy - jaw * 12, radius - 2, Math.PI + 0.3, -0.3); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + wobble, cy + jaw * 12, radius - 2, 0.3, Math.PI - 0.3); ctx.closePath(); ctx.fill();

      // Interior boca
      if (worm.jawOpen > 0.2) {
        ctx.fillStyle = '#b71c1c'; ctx.globalAlpha = worm.jawOpen;
        ctx.beginPath(); ctx.ellipse(cx + wobble, cy, radius - 5, jaw * 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Dientes
      ctx.fillStyle = '#ffecb3';
      for (let t = 0; t < 6; t++) {
        const a = (t / 6) * Math.PI - Math.PI / 2;
        const tx = cx + wobble + Math.cos(a) * (radius - 4);
        const ty = cy - jaw * 10 + Math.sin(a) * 4;
        ctx.beginPath(); ctx.moveTo(tx - 2, ty); ctx.lineTo(tx, ty + 5 + jaw * 3); ctx.lineTo(tx + 2, ty); ctx.closePath(); ctx.fill();
      }
      for (let t = 0; t < 6; t++) {
        const a = (t / 6) * Math.PI + Math.PI / 2;
        const tx = cx + wobble + Math.cos(a) * (radius - 4);
        const ty = cy + jaw * 10 + Math.sin(a) * 4;
        ctx.beginPath(); ctx.moveTo(tx - 2, ty); ctx.lineTo(tx, ty - 5 - jaw * 3); ctx.lineTo(tx + 2, ty); ctx.closePath(); ctx.fill();
      }

      // Ojos
      const eyeG = Math.sin(frameTick * 0.1) * 0.3 + 0.7;
      ctx.globalAlpha = 0.4 * eyeG; ctx.fillStyle = '#ff1744';
      ctx.beginPath(); ctx.arc(cx + wobble - 7, cy - 8, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + wobble + 7, cy - 8, 7, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;

      // Ojo izq
      ctx.fillStyle = '#ff1744'; ctx.beginPath(); ctx.arc(cx + wobble - 7, cy - 8, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b71c1c'; ctx.beginPath(); ctx.arc(cx + wobble - 7, cy - 8, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffcdd2'; ctx.beginPath(); ctx.arc(cx + wobble - 8, cy - 9.5, 1.2, 0, Math.PI * 2); ctx.fill();
      // Ojo der
      ctx.fillStyle = '#ff1744'; ctx.beginPath(); ctx.arc(cx + wobble + 7, cy - 8, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b71c1c'; ctx.beginPath(); ctx.arc(cx + wobble + 7, cy - 8, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffcdd2'; ctx.beginPath(); ctx.arc(cx + wobble + 6, cy - 9.5, 1.2, 0, Math.PI * 2); ctx.fill();

    } else {
      // ══ CUERPO ══
      const shade = t < 0.5 ? '#6d4c41' : '#8d6e63';
      ctx.fillStyle = shade;
      ctx.beginPath(); ctx.arc(cx + wobble, cy, radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = t < 0.5 ? '#795548' : '#a1887f';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx + wobble, cy, radius - 3, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.18; ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(cx + wobble - radius + 4, cy); ctx.lineTo(cx + wobble + radius - 4, cy); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

function drawPlayer() {
  const cx = player.x * TILE + TILE / 2;
  const cy = player.y * TILE + TILE / 2;
  const bob = Math.sin(frameTick * 0.1) * 1.5;

  // Sombra
  ctx.globalAlpha = 0.18; ctx.fillStyle = '#1a0e00';
  ctx.beginPath(); ctx.ellipse(cx, cy + 18, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Capa
  ctx.fillStyle = '#1a237e';
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy + 17 + bob);
  ctx.quadraticCurveTo(cx, cy - 2 + bob, cx + 14, cy + 17 + bob);
  ctx.lineTo(cx + 10, cy + 17 + bob);
  ctx.quadraticCurveTo(cx, cy + 4 + bob, cx - 10, cy + 17 + bob);
  ctx.closePath(); ctx.fill();

  // Cuerpo
  ctx.fillStyle = '#283593';
  ctx.beginPath(); ctx.arc(cx, cy + 4 + bob, 10, 0, Math.PI * 2); ctx.fill();

  // Detalle stilsuit
  ctx.strokeStyle = '#3949ab'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx, cy - 5 + bob); ctx.lineTo(cx, cy + 12 + bob); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 6, cy + 2 + bob); ctx.lineTo(cx + 6, cy + 2 + bob); ctx.stroke();

  // Cabeza
  ctx.fillStyle = '#bcaaa4';
  ctx.beginPath(); ctx.arc(cx, cy - 8 + bob, 8, 0, Math.PI * 2); ctx.fill();

  // Capucha
  ctx.fillStyle = '#1a237e';
  ctx.beginPath(); ctx.arc(cx, cy - 8 + bob, 8, Math.PI + 0.4, -0.4); ctx.closePath(); ctx.fill();

  // Ojos Fremen
  ctx.globalAlpha = 0.3; ctx.fillStyle = '#4fc3f7';
  ctx.beginPath(); ctx.arc(cx - 3, cy - 9 + bob, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 3, cy - 9 + bob, 4, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#4fc3f7';
  ctx.beginPath(); ctx.arc(cx - 3, cy - 9 + bob, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 3, cy - 9 + bob, 2.5, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#01579b';
  ctx.beginPath(); ctx.arc(cx - 3, cy - 9 + bob, 1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 3, cy - 9 + bob, 1, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#e1f5fe';
  ctx.beginPath(); ctx.arc(cx - 4, cy - 10 + bob, 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 2, cy - 10 + bob, 0.8, 0, Math.PI * 2); ctx.fill();
}

function drawHUD() {
  // Indicador de especia restante en el mapa
  const lvl = LEVELS[currentLevel];
  const remaining = spicePickups.length;
  if (remaining > 0) {
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#1a0e00';
    ctx.fillRect(W / 2 - 80, 6, 160, 22);
    ctx.globalAlpha = 1;
    ctx.fillStyle = remaining <= 1 ? '#00e676' : '#ff9f43';
    ctx.font = 'bold 12px Rajdhani';
    ctx.textAlign = 'center';
    ctx.fillText(`◆ ${remaining} especia${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}`, W / 2, 21);
  } else {
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#1a0e00';
    ctx.fillRect(W / 2 - 70, 6, 140, 22);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#00e676';
    ctx.font = 'bold 12px Rajdhani';
    ctx.textAlign = 'center';
    ctx.fillText('✓ ¡Toda la especia recogida!', W / 2, 21);
  }
}

function drawTremorEffect() {
  if (worm.tremor <= 0) return;
  ctx.globalAlpha = worm.tremor * 0.07;
  ctx.fillStyle = '#ff1744';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  if (worm.tremor > 0.5) {
    const sx = (Math.random() - 0.5) * worm.tremor * 3;
    const sy = (Math.random() - 0.5) * worm.tremor * 3;
    canvas.style.transform = `translate(${sx}px,${sy}px)`;
  } else {
    canvas.style.transform = '';
  }
}

// ══════════════════════════════════════════════════════
// ARRANQUE
// ══════════════════════════════════════════════════════
init();
