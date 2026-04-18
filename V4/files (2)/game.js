// ══════════════════════════════════════════════════════
// ARRAKIS — RUTA DE LA ESPECIA · Motor completo
// ══════════════════════════════════════════════════════

const TILE = 44, COLS = 20, ROWS = 13, W = COLS * TILE, H = ROWS * TILE;
const SOLUTION_CODE = 'ITC123';
let canvas, ctx, gameMode = 'manual', gameRunning = false, animFrame = null;
let codeRunning = false, codeQueue = [], codeTimer = null, frameTick = 0, currentLevel = 1;
let player, spicePickups, worm, playerHidden = false;

// ══════════════════════════════════════════════════════
// MÚSICA AMBIENTAL (Web Audio API — estilo Dune)
// ══════════════════════════════════════════════════════
let audioCtx = null, musicPlaying = false, musicNodes = [];

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function startMusic() {
  if (musicPlaying) return;
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  musicNodes = [];
  const master = audioCtx.createGain();
  master.gain.value = 0.18;
  master.connect(audioCtx.destination);

  // Drone bajo profundo
  const bass = audioCtx.createOscillator();
  bass.type = 'sawtooth'; bass.frequency.value = 55;
  const bassG = audioCtx.createGain(); bassG.gain.value = 0.35;
  const bassF = audioCtx.createBiquadFilter();
  bassF.type = 'lowpass'; bassF.frequency.value = 120;
  bass.connect(bassF); bassF.connect(bassG); bassG.connect(master);
  bass.start(); musicNodes.push(bass);

  // Sub
  const sub = audioCtx.createOscillator();
  sub.type = 'sine'; sub.frequency.value = 27.5;
  const subG = audioCtx.createGain(); subG.gain.value = 0.3;
  sub.connect(subG); subG.connect(master);
  sub.start(); musicNodes.push(sub);

  // Drone medio — quinta
  const mid = audioCtx.createOscillator();
  mid.type = 'triangle'; mid.frequency.value = 82.4;
  const midG = audioCtx.createGain(); midG.gain.value = 0.12;
  const midF = audioCtx.createBiquadFilter();
  midF.type = 'bandpass'; midF.frequency.value = 200; midF.Q.value = 2;
  mid.connect(midF); midF.connect(midG); midG.connect(master);
  mid.start(); musicNodes.push(mid);

  // Pad etéreo alto
  const pad1 = audioCtx.createOscillator();
  pad1.type = 'sine'; pad1.frequency.value = 220;
  const pad1G = audioCtx.createGain(); pad1G.gain.value = 0.06;
  pad1.connect(pad1G); pad1G.connect(master);
  pad1.start(); musicNodes.push(pad1);

  const pad2 = audioCtx.createOscillator();
  pad2.type = 'sine'; pad2.frequency.value = 330;
  const pad2G = audioCtx.createGain(); pad2G.gain.value = 0.04;
  pad2.connect(pad2G); pad2G.connect(master);
  pad2.start(); musicNodes.push(pad2);

  // LFO para movimiento del pad
  const lfo = audioCtx.createOscillator();
  lfo.type = 'sine'; lfo.frequency.value = 0.15;
  const lfoG = audioCtx.createGain(); lfoG.gain.value = 15;
  lfo.connect(lfoG); lfoG.connect(pad1.frequency);
  lfo.start(); musicNodes.push(lfo);

  // LFO para filtro del drone
  const lfo2 = audioCtx.createOscillator();
  lfo2.type = 'sine'; lfo2.frequency.value = 0.08;
  const lfo2G = audioCtx.createGain(); lfo2G.gain.value = 40;
  lfo2.connect(lfo2G); lfo2G.connect(bassF.frequency);
  lfo2.start(); musicNodes.push(lfo2);

  // Viento (ruido filtrado)
  const bufferSize = audioCtx.sampleRate * 2;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
  const wind = audioCtx.createBufferSource();
  wind.buffer = noiseBuffer; wind.loop = true;
  const windF = audioCtx.createBiquadFilter();
  windF.type = 'bandpass'; windF.frequency.value = 600; windF.Q.value = 0.5;
  const windG = audioCtx.createGain(); windG.gain.value = 0.07;
  wind.connect(windF); windF.connect(windG); windG.connect(master);
  wind.start(); musicNodes.push(wind);

  // LFO del viento
  const wLfo = audioCtx.createOscillator();
  wLfo.type = 'sine'; wLfo.frequency.value = 0.12;
  const wLfoG = audioCtx.createGain(); wLfoG.gain.value = 300;
  wLfo.connect(wLfoG); wLfoG.connect(windF.frequency);
  wLfo.start(); musicNodes.push(wLfo);

  musicPlaying = true;
  document.getElementById('music-btn').classList.add('active');
}

function stopMusic() {
  musicNodes.forEach(n => { try { n.stop(); } catch(e) {} });
  musicNodes = [];
  musicPlaying = false;
  document.getElementById('music-btn').classList.remove('active');
}

function toggleMusic() {
  if (musicPlaying) stopMusic(); else startMusic();
}

// ══════════════════════════════════════════════════════
// NIVELES
// ══════════════════════════════════════════════════════
const LEVELS = {
  1: {
    name: 'El Primer Paso',
    wormSpeed: 28, wormLength: 4,
    wormStart: { x: 16, y: 10 },
    playerStart: { x: 1, y: 1 },
    spice: [{ x: 5, y: 2 }, { x: 12, y: 6 }, { x: 17, y: 4 }],
    rocks: [
      { x: 4, y: 4 }, { x: 4, y: 5 },
      { x: 9, y: 3 }, { x: 9, y: 4 },
      { x: 14, y: 7 }, { x: 14, y: 8 },
      { x: 7, y: 9 }, { x: 7, y: 10 },
      { x: 17, y: 2 }, { x: 11, y: 10 },
    ],
    speedLabel: 'MUY LENTO',
    solution: `derecha(4)
abajo(1)
derecha(7)
abajo(3)
derecha(5)
arriba(2)
abajo(6)`
  },
  2: {
    name: 'Arenas Movedizas',
    wormSpeed: 22, wormLength: 5,
    wormStart: { x: 10, y: 6 },
    playerStart: { x: 0, y: 0 },
    spice: [{ x: 3, y: 3 }, { x: 9, y: 1 }, { x: 16, y: 5 }, { x: 6, y: 10 }],
    rocks: [
      { x: 5, y: 2 }, { x: 5, y: 3 }, { x: 5, y: 4 },
      { x: 13, y: 2 }, { x: 13, y: 3 },
      { x: 8, y: 8 }, { x: 8, y: 9 },
      { x: 15, y: 8 }, { x: 15, y: 9 },
      { x: 3, y: 7 }, { x: 18, y: 3 },
      { x: 12, y: 10 }, { x: 12, y: 11 },
    ],
    speedLabel: 'LENTO',
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
    wormSpeed: 16, wormLength: 6,
    wormStart: { x: 10, y: 5 },
    playerStart: { x: 0, y: 12 },
    spice: [{ x: 3, y: 1 }, { x: 14, y: 2 }, { x: 18, y: 8 }, { x: 8, y: 11 }, { x: 1, y: 6 }],
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
    speedLabel: 'MODERADO',
    solution: `arriba(6)
derecha(1)
arriba(5)
derecha(2)
si_gusano_cerca(4):
  esperar(3)
fin
abajo(5)
derecha(5)
abajo(6)
derecha(4)
arriba(4)`
  },
  4: {
    name: 'Tormenta de Arena',
    wormSpeed: 12, wormLength: 7,
    wormStart: { x: 9, y: 7 },
    playerStart: { x: 0, y: 0 },
    spice: [{ x: 4, y: 2 }, { x: 12, y: 1 }, { x: 18, y: 4 }, { x: 15, y: 10 }, { x: 7, y: 8 }, { x: 1, y: 11 }],
    rocks: [
      { x: 3, y: 4 }, { x: 3, y: 5 },
      { x: 7, y: 2 }, { x: 7, y: 3 },
      { x: 11, y: 5 }, { x: 11, y: 6 },
      { x: 14, y: 3 }, { x: 14, y: 4 },
      { x: 6, y: 6 },
      { x: 16, y: 7 }, { x: 16, y: 8 },
      { x: 9, y: 10 }, { x: 9, y: 11 },
      { x: 4, y: 9 }, { x: 18, y: 9 },
      { x: 13, y: 11 }, { x: 13, y: 12 },
    ],
    speedLabel: 'RÁPIDO',
    solution: `derecha(4)
abajo(2)
si_gusano_cerca(5):
  derecha(3)
  abajo(1)
sino:
  derecha(4)
fin
derecha(5)
arriba(2)
derecha(5)
abajo(6)
izquierda(3)
abajo(4)
izquierda(14)
abajo(1)`
  },
  5: {
    name: 'La Prueba Final',
    wormSpeed: 9, wormLength: 9,
    wormStart: { x: 10, y: 6 },
    playerStart: { x: 0, y: 6 },
    spice: [{ x: 3, y: 1 }, { x: 10, y: 0 }, { x: 18, y: 2 }, { x: 17, y: 10 }, { x: 8, y: 11 }, { x: 1, y: 10 }, { x: 13, y: 6 }],
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
    solution: `si_gusano_cerca(6):
  abajo(2)
  derecha(3)
sino:
  arriba(5)
  derecha(3)
fin
arriba(3)
derecha(4)
arriba(1)
derecha(5)
abajo(8)
derecha(4)
abajo(1)
izquierda(9)
abajo(1)
izquierda(7)
abajo(1)
derecha(1)
abajo(1)
izquierda(1)
arriba(1)`
  }
};

// ─── TEXTURAS ───
let sandGrains = [], duneWaves = [], boneScatter = [];

function generateTextures() {
  sandGrains = [];
  for (let i = 0; i < 300; i++) sandGrains.push({ x: Math.random()*W, y: Math.random()*H, r: Math.random()*1.5+0.3, shade: Math.random(), o: Math.random()*0.12+0.03 });
  duneWaves = [];
  for (let i = 0; i < 10; i++) duneWaves.push({ x: Math.random()*W, y: Math.random()*H, w: Math.random()*200+80, h: Math.random()*15+5, angle: Math.random()*0.4-0.2, shade: Math.random()*0.06+0.02 });
  const lvl = LEVELS[currentLevel];
  boneScatter = [];
  for (let i = 0; i < 4; i++) {
    let bx, by;
    do { bx = Math.floor(Math.random()*COLS); by = Math.floor(Math.random()*ROWS); }
    while (lvl.rocks.some(r=>r.x===bx&&r.y===by) || lvl.spice.some(s=>s.x===bx&&s.y===by) || (bx===lvl.playerStart.x&&by===lvl.playerStart.y));
    boneScatter.push({ x: bx, y: by, rot: Math.random()*Math.PI });
  }
}

// ══════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════
function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  canvas.width = W; canvas.height = H;
}

// ══════════════════════════════════════════════════════
// FLUJO DEL JUEGO
// ══════════════════════════════════════════════════════
function startGame(mode) {
  gameMode = mode; currentLevel = 1;
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('game-container').classList.add('active');
  if (mode === 'code') {
    document.getElementById('editor-panel').classList.add('active');
    document.getElementById('mode-label').textContent = 'PROGRAMAR';
    document.getElementById('footer-hint').textContent = 'Escribe comandos → Ejecutar · ⛰ Escóndete en montañas';
  } else {
    document.getElementById('editor-panel').classList.remove('active');
    document.getElementById('mode-label').textContent = 'MANUAL';
    document.getElementById('footer-hint').textContent = '↑↓←→ · ⛰ Escóndete en montañas · ◆ Recoge toda la especia';
  }
  startMusic();
  loadLevel(currentLevel);
}

function backToMenu() {
  gameRunning = false;
  if (animFrame) cancelAnimationFrame(animFrame);
  stopCode(); stopMusic();
  document.getElementById('game-container').classList.remove('active');
  document.getElementById('editor-panel').classList.remove('active');
  document.getElementById('start-screen').classList.remove('hidden');
  hideAllOverlays();
}

function loadLevel(num) {
  const lvl = LEVELS[num]; if (!lvl) return;
  hideAllOverlays(); stopCode();
  currentLevel = num;
  player = { x: lvl.playerStart.x, y: lvl.playerStart.y, spice: 0, steps: 0, alive: true };
  playerHidden = false;
  spicePickups = lvl.spice.map(s => ({ ...s }));
  worm = { segments: [], moveTimer: 0, moveInterval: lvl.wormSpeed, jawOpen: 0, jawDir: 1, tremor: 0, wanderDir: null, wanderSteps: 0 };
  for (let i = 0; i < lvl.wormLength; i++) worm.segments.push({ x: lvl.wormStart.x - i, y: lvl.wormStart.y });
  generateTextures();
  document.getElementById('header-level-text').textContent = `NIVEL ${num}`;
  document.getElementById('spice-total').textContent = `/ ${lvl.spice.length}`;
  document.getElementById('worm-speed-label').textContent = lvl.speedLabel;
  document.getElementById('editor-status').textContent = 'LISTO';
  document.getElementById('hide-stat').style.display = 'none';
  updateStats();
  const ann = document.getElementById('level-announce');
  document.getElementById('announce-level-num').textContent = `NIVEL ${num}`;
  document.getElementById('announce-level-name').textContent = lvl.name;
  ann.classList.add('show');
  gameRunning = true;
  if (animFrame) cancelAnimationFrame(animFrame);
  gameLoop();
  setTimeout(() => ann.classList.remove('show'), 1800);
}

function resetLevel() { hideAllOverlays(); loadLevel(currentLevel); }
function nextLevel() {
  if (currentLevel >= 5) { showCompleteScreen(); return; }
  hideAllOverlays(); loadLevel(currentLevel + 1);
  document.getElementById('code-editor').value = '';
  const c = document.getElementById('console-output'); c.innerHTML = ''; c.classList.remove('active');
}
function showCompleteScreen() {
  hideAllOverlays();
  document.getElementById('complete-msg').textContent = '¡Felicidades! Has dominado Arrakis. Eres un verdadero Fremen.';
  document.getElementById('complete-overlay').classList.add('show');
  gameRunning = false;
}
function hideAllOverlays() {
  ['death-overlay','win-overlay','complete-overlay','level-announce'].forEach(id => document.getElementById(id).classList.remove('show'));
}

// ══════════════════════════════════════════════════════
// GAME LOOP
// ══════════════════════════════════════════════════════
function gameLoop() {
  if (!gameRunning) return;
  frameTick++;
  worm.jawOpen += 0.06 * worm.jawDir;
  if (worm.jawOpen > 1) worm.jawDir = -1;
  if (worm.jawOpen < 0) worm.jawDir = 1;
  worm.moveTimer++;
  if (worm.moveTimer >= worm.moveInterval) { worm.moveTimer = 0; moveWorm(); }
  const head = worm.segments[0];
  const dist = Math.sqrt((player.x-head.x)**2 + (player.y-head.y)**2);
  worm.tremor = dist < 5 ? (5 - dist) / 5 : 0;
  // Comprobar si el jugador está oculto en montaña
  checkHiding();
  draw();
  animFrame = requestAnimationFrame(gameLoop);
}

// ══════════════════════════════════════════════════════
// MECÁNICA DE ESCONDERSE
// ══════════════════════════════════════════════════════
function isOnRock(x, y) {
  return LEVELS[currentLevel].rocks.some(r => r.x === x && r.y === y);
}

function checkHiding() {
  const wasHidden = playerHidden;
  playerHidden = isOnRock(player.x, player.y);
  const hideStat = document.getElementById('hide-stat');
  if (playerHidden) {
    hideStat.style.display = 'flex';
    document.getElementById('hide-label').textContent = 'OCULTO';
  } else {
    hideStat.style.display = 'none';
  }
}

// ══════════════════════════════════════════════════════
// GUSANO IA: PERSECUCIÓN + DEAMBULAR
// ══════════════════════════════════════════════════════
function moveWorm() {
  if (!player.alive) return;
  const lvl = LEVELS[currentLevel];
  const head = worm.segments[0];

  function isValid(p) {
    if (p.x < 0 || p.x >= COLS || p.y < 0 || p.y >= ROWS) return false;
    // El gusano NO puede entrar en las montañas/rocas
    if (lvl.rocks.some(r => r.x === p.x && r.y === p.y)) return false;
    for (let i = 0; i < worm.segments.length - 1; i++)
      if (worm.segments[i].x === p.x && worm.segments[i].y === p.y) return false;
    return true;
  }

  let nx = head.x, ny = head.y, moved = false;

  if (playerHidden) {
    // ═══ DEAMBULAR ALEATORIO ═══
    if (worm.wanderSteps <= 0) {
      const dirs = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
      worm.wanderDir = dirs[Math.floor(Math.random() * dirs.length)];
      worm.wanderSteps = Math.floor(Math.random() * 4) + 2;
    }
    const test = { x: head.x + worm.wanderDir.x, y: head.y + worm.wanderDir.y };
    if (isValid(test)) {
      nx = test.x; ny = test.y; moved = true;
    } else {
      worm.wanderSteps = 0; // cambiar dirección
    }
    worm.wanderSteps--;
  } else {
    // ═══ PERSECUCIÓN ═══
    const ddx = player.x - head.x, ddy = player.y - head.y;
    let primary, secondary;
    if (Math.abs(ddx) >= Math.abs(ddy)) {
      primary = { x: head.x + Math.sign(ddx), y: head.y };
      secondary = ddy !== 0 ? { x: head.x, y: head.y + Math.sign(ddy) } : null;
    } else {
      primary = { x: head.x, y: head.y + Math.sign(ddy) };
      secondary = ddx !== 0 ? { x: head.x + Math.sign(ddx), y: head.y } : null;
    }
    if (isValid(primary)) { nx = primary.x; ny = primary.y; moved = true; }
    else if (secondary && isValid(secondary)) { nx = secondary.x; ny = secondary.y; moved = true; }
    else {
      const dirs = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
      for (const d of dirs) {
        const t = { x: head.x+d.x, y: head.y+d.y };
        if (isValid(t)) { nx = t.x; ny = t.y; moved = true; break; }
      }
    }
  }

  if (moved) {
    for (let i = worm.segments.length-1; i > 0; i--) worm.segments[i] = { ...worm.segments[i-1] };
    worm.segments[0] = { x: nx, y: ny };
  }
  checkWormCollision();
}

function checkWormCollision() {
  if (!player.alive) return;
  // No mata si estás en una montaña
  if (playerHidden) return;
  for (const seg of worm.segments) {
    if (seg.x === player.x && seg.y === player.y) { playerDeath(); return; }
  }
}

// ══════════════════════════════════════════════════════
// JUGADOR
// ══════════════════════════════════════════════════════
function movePlayer(dx, dy) {
  if (!player.alive || !gameRunning) return false;
  const lvl = LEVELS[currentLevel];
  const nx = player.x + dx, ny = player.y + dy;
  if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return false;
  // El jugador SÍ puede entrar en rocas (esconderse)
  player.x = nx; player.y = ny; player.steps++;
  const si = spicePickups.findIndex(s => s.x === nx && s.y === ny);
  if (si >= 0) { spicePickups.splice(si, 1); player.spice++; }
  updateStats(); checkHiding(); checkWormCollision();
  if (spicePickups.length === 0) winLevel();
  return true;
}

function playerDeath() {
  player.alive = false; gameRunning = false;
  if (animFrame) cancelAnimationFrame(animFrame);
  document.getElementById('death-steps').textContent = player.steps;
  document.getElementById('death-spice').textContent = player.spice;
  document.getElementById('game-canvas-wrap').classList.add('shake');
  setTimeout(() => document.getElementById('game-canvas-wrap').classList.remove('shake'), 500);
  setTimeout(() => document.getElementById('death-overlay').classList.add('show'), 400);
}

function winLevel() {
  gameRunning = false;
  if (animFrame) cancelAnimationFrame(animFrame);
  stopCode();
  if (currentLevel >= 5) { setTimeout(() => showCompleteScreen(), 500); return; }
  document.getElementById('win-title').textContent = `¡NIVEL ${currentLevel} COMPLETADO!`;
  document.getElementById('win-msg').textContent = `${player.steps} pasos · Especia: ${player.spice}/${LEVELS[currentLevel].spice.length}`;
  setTimeout(() => document.getElementById('win-overlay').classList.add('show'), 400);
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
  let m = false;
  switch (e.key) {
    case 'ArrowUp': case 'w': case 'W': m = movePlayer(0,-1); break;
    case 'ArrowDown': case 's': case 'S': m = movePlayer(0,1); break;
    case 'ArrowLeft': case 'a': case 'A': m = movePlayer(-1,0); break;
    case 'ArrowRight': case 'd': case 'D': m = movePlayer(1,0); break;
  }
  if (m) e.preventDefault();
});

// ══════════════════════════════════════════════════════
// PROGRAMACIÓN AVANZADA (parser con bloques)
// ══════════════════════════════════════════════════════

// ─── Funciones de "visión" del personaje ───
function distToWorm() {
  const h = worm.segments[0];
  return Math.abs(player.x - h.x) + Math.abs(player.y - h.y);
}

function spiceInDir(dir, maxDist) {
  const deltas = { arriba: {x:0,y:-1}, abajo: {x:0,y:1}, izquierda: {x:-1,y:0}, derecha: {x:1,y:0} };
  const d = deltas[dir]; if (!d) return false;
  for (let i = 1; i <= maxDist; i++) {
    const cx = player.x + d.x*i, cy = player.y + d.y*i;
    if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) break;
    if (spicePickups.some(s => s.x === cx && s.y === cy)) return true;
  }
  return false;
}

// ─── Parser ───
function parseCode(source) {
  const lines = source.split('\n').map(l => l.trimEnd());
  let pos = 0;

  function parseBlock(indent) {
    const cmds = [];
    while (pos < lines.length) {
      const raw = lines[pos];
      const trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith('//')) { pos++; continue; }
      const curIndent = raw.length - raw.trimStart().length;

      // Si la indentación es menor que la esperada, salimos del bloque
      if (curIndent < indent && trimmed !== 'fin' && trimmed !== 'sino:') break;

      if (trimmed === 'fin') { pos++; break; }
      if (trimmed === 'sino:') { break; }  // el caller manejará sino

      // Movimiento simple
      const moveMatch = trimmed.match(/^(arriba|abajo|izquierda|derecha|esperar)\s*\(\s*(\d+)\s*\)$/i);
      if (moveMatch) {
        cmds.push({ type: 'move', cmd: moveMatch[1].toLowerCase(), n: parseInt(moveMatch[2]) });
        pos++; continue;
      }

      // repetir(n):
      const repMatch = trimmed.match(/^repetir\s*\(\s*(\d+)\s*\)\s*:?$/i);
      if (repMatch) {
        pos++;
        const body = parseBlock(curIndent + 1);
        cmds.push({ type: 'repeat', n: parseInt(repMatch[1]), body });
        continue;
      }

      // si_gusano_cerca(n):
      const wormMatch = trimmed.match(/^si_gusano_cerca\s*\(\s*(\d+)\s*\)\s*:?$/i);
      if (wormMatch) {
        pos++;
        const thenBody = parseBlock(curIndent + 1);
        let elseBody = [];
        if (pos < lines.length && lines[pos].trim() === 'sino:') {
          pos++;
          elseBody = parseBlock(curIndent + 1);
        }
        cmds.push({ type: 'if_worm', dist: parseInt(wormMatch[1]), then: thenBody, else: elseBody });
        continue;
      }

      // si_especia(dir, n):
      const spiceMatch = trimmed.match(/^si_especia\s*\(\s*(arriba|abajo|izquierda|derecha)\s*,\s*(\d+)\s*\)\s*:?$/i);
      if (spiceMatch) {
        pos++;
        const thenBody = parseBlock(curIndent + 1);
        let elseBody = [];
        if (pos < lines.length && lines[pos].trim() === 'sino:') {
          pos++;
          elseBody = parseBlock(curIndent + 1);
        }
        cmds.push({ type: 'if_spice', dir: spiceMatch[1].toLowerCase(), dist: parseInt(spiceMatch[2]), then: thenBody, else: elseBody });
        continue;
      }

      // si_oculto():
      const hideMatch = trimmed.match(/^si_oculto\s*\(\s*\)\s*:?$/i);
      if (hideMatch) {
        pos++;
        const thenBody = parseBlock(curIndent + 1);
        let elseBody = [];
        if (pos < lines.length && lines[pos].trim() === 'sino:') {
          pos++;
          elseBody = parseBlock(curIndent + 1);
        }
        cmds.push({ type: 'if_hidden', then: thenBody, else: elseBody });
        continue;
      }

      // Error
      cmds.push({ type: 'error', line: trimmed });
      pos++;
    }
    return cmds;
  }

  return parseBlock(0);
}

function flattenAST(ast) {
  // Convierte AST en cola de instrucciones ejecutables
  const queue = [];
  function walk(nodes) {
    for (const node of nodes) {
      if (node.type === 'error') {
        queue.push({ type: 'error', line: node.line }); return;
      }
      if (node.type === 'move') {
        for (let i = 0; i < node.n; i++) queue.push({ type: 'move', cmd: node.cmd });
      }
      if (node.type === 'repeat') {
        for (let i = 0; i < node.n; i++) walk(node.body);
      }
      if (node.type === 'if_worm') {
        // Evaluación diferida: marcar para evaluar en runtime
        queue.push({ type: 'if_worm', dist: node.dist, then: node.then, else: node.else });
      }
      if (node.type === 'if_spice') {
        queue.push({ type: 'if_spice', dir: node.dir, dist: node.dist, then: node.then, else: node.else });
      }
      if (node.type === 'if_hidden') {
        queue.push({ type: 'if_hidden', then: node.then, else: node.else });
      }
    }
  }
  walk(ast);
  return queue;
}

function runCode() {
  if (codeRunning) return;
  const raw = document.getElementById('code-editor').value.trim();
  if (!raw) return;
  const consoleEl = document.getElementById('console-output');
  consoleEl.classList.add('active'); consoleEl.innerHTML = '';

  const ast = parseCode(raw);
  // Buscar errores
  const errors = [];
  function findErrors(nodes) {
    for (const n of nodes) {
      if (n.type === 'error') errors.push(n.line);
      if (n.then) findErrors(n.then);
      if (n.else) findErrors(n.else);
      if (n.body) findErrors(n.body);
    }
  }
  findErrors(ast);
  if (errors.length) {
    logConsole(`✗ Error: "${errors[0]}"`, 'error');
    logConsole('  Revisa la sintaxis', 'error');
    return;
  }

  codeQueue = flattenAST(ast);
  if (codeQueue.some(c => c.type === 'error')) {
    logConsole(`✗ Error: "${codeQueue.find(c=>c.type==='error').line}"`, 'error');
    codeQueue = []; return;
  }

  logConsole(`▶ Ejecutando programa...`, 'success');
  document.getElementById('editor-status').textContent = 'EJECUTANDO';
  codeRunning = true;
  executeNext();
}

function executeNext() {
  if (!codeRunning || codeQueue.length === 0) {
    codeRunning = false;
    if (player.alive && gameRunning) {
      logConsole('✓ Programa terminado.', 'success');
      if (spicePickups.length > 0) logConsole(`⚠ Faltan ${spicePickups.length} especias`, 'error');
      document.getElementById('editor-status').textContent = 'COMPLETO';
    }
    return;
  }

  const instr = codeQueue.shift();

  if (instr.type === 'move') {
    let moved = true;
    switch (instr.cmd) {
      case 'arriba': moved = movePlayer(0,-1); break;
      case 'abajo': moved = movePlayer(0,1); break;
      case 'izquierda': moved = movePlayer(-1,0); break;
      case 'derecha': moved = movePlayer(1,0); break;
      case 'esperar': break;
    }
    if (!moved) {
      logConsole(`✗ Bloqueado: ${instr.cmd} (fuera del mapa)`, 'error');
      codeRunning = false;
      document.getElementById('editor-status').textContent = 'BLOQUEADO';
      return;
    }
  }

  if (instr.type === 'if_worm') {
    const d = distToWorm();
    const branch = d <= instr.dist ? instr.then : instr.else;
    logConsole(`  ▸ Gusano a ${d} celdas ${d <= instr.dist ? '→ SI' : '→ NO'}`, 'info');
    const expanded = flattenAST(branch);
    codeQueue = expanded.concat(codeQueue);
  }

  if (instr.type === 'if_spice') {
    const found = spiceInDir(instr.dir, instr.dist);
    const branch = found ? instr.then : instr.else;
    logConsole(`  ▸ Especia ${instr.dir}(${instr.dist})? ${found ? '→ SÍ' : '→ NO'}`, 'info');
    const expanded = flattenAST(branch);
    codeQueue = expanded.concat(codeQueue);
  }

  if (instr.type === 'if_hidden') {
    const branch = playerHidden ? instr.then : instr.else;
    logConsole(`  ▸ ¿Oculto? ${playerHidden ? '→ SÍ' : '→ NO'}`, 'info');
    const expanded = flattenAST(branch);
    codeQueue = expanded.concat(codeQueue);
  }

  if (!player.alive || !gameRunning) {
    codeRunning = false;
    document.getElementById('editor-status').textContent = 'DETENIDO';
    return;
  }
  codeTimer = setTimeout(executeNext, 200);
}

function stopCode() {
  codeRunning = false; codeQueue = [];
  if (codeTimer) clearTimeout(codeTimer);
}

function logConsole(msg, type='') {
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
function toggleSolutionInput() { document.getElementById('solution-input-wrap').classList.toggle('show'); document.getElementById('solution-error').textContent=''; }
function checkSolutionCode() {
  const v = document.getElementById('solution-code').value.trim();
  const e = document.getElementById('solution-error');
  if (v===SOLUTION_CODE) { e.textContent='✓ Correcto'; e.className='solution-error correct'; document.getElementById('code-editor').value=LEVELS[currentLevel].solution; logConsole(`✓ Solución nivel ${currentLevel} cargada.`,'success'); }
  else { e.textContent='✗ Incorrecto'; e.className='solution-error wrong'; }
}
function toggleSolutionFromFooter() { if(gameMode==='code') toggleSolutionInput(); else document.getElementById('solution-modal').classList.add('show'); }
function closeSolutionModal() { document.getElementById('solution-modal').classList.remove('show'); document.getElementById('solution-error-modal').textContent=''; const r=document.getElementById('solution-reveal-modal'); r.style.display='none'; r.classList.remove('show'); }
function checkSolutionCodeModal() {
  const v=document.getElementById('solution-code-modal').value.trim();
  const e=document.getElementById('solution-error-modal');
  const r=document.getElementById('solution-reveal-modal');
  if(v===SOLUTION_CODE){e.textContent='✓ Correcto';e.className='solution-error correct';r.textContent=`Solución Nivel ${currentLevel}:\n\n`+LEVELS[currentLevel].solution;r.classList.add('show');r.style.display='block';}
  else{e.textContent='✗ Incorrecto';e.className='solution-error wrong';r.style.display='none';}
}

// ══════════════════════════════════════════════════════
// DIBUJO
// ══════════════════════════════════════════════════════
function draw() {
  ctx.clearRect(0, 0, W, H);
  drawDesert(); drawGrid(); drawBones(); drawMountains(); drawSpicePickups();
  drawWormTrail(); drawWorm();
  if (player.alive) drawPlayer();
  drawHUD(); drawTremorEffect();
}

function drawDesert() {
  const g = ctx.createRadialGradient(W*0.3,H*0.2,50,W*0.5,H*0.5,W*0.8);
  g.addColorStop(0,'#dbb856'); g.addColorStop(0.4,'#c9952a'); g.addColorStop(0.7,'#b8860b'); g.addColorStop(1,'#9a7209');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  for (const d of duneWaves) { ctx.save(); ctx.translate(d.x,d.y); ctx.rotate(d.angle); ctx.globalAlpha=d.shade; ctx.fillStyle='#8b6914'; ctx.beginPath(); ctx.ellipse(0,0,d.w,d.h,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }
  ctx.globalAlpha = 1;
  for (const g of sandGrains) { ctx.globalAlpha=g.o; ctx.fillStyle=g.shade>0.5?'#a07a1a':'#c4a035'; ctx.fillRect(g.x,g.y,g.r,g.r); }
  ctx.globalAlpha = 1;
  // Heat shimmer
  ctx.globalAlpha = 0.02; ctx.fillStyle='#fff';
  for (let y=0; y<H; y+=28) { ctx.fillRect(Math.sin((y+frameTick*0.5)*0.05)*8,y,W,1); }
  ctx.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle='rgba(0,0,0,0.04)'; ctx.lineWidth=0.5;
  for(let x=0;x<=W;x+=TILE){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<=H;y+=TILE){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
}

function drawBones() {
  ctx.globalAlpha=0.1; ctx.strokeStyle='#d7ccc8'; ctx.lineWidth=2;
  for(const b of boneScatter){const cx=b.x*TILE+TILE/2,cy=b.y*TILE+TILE/2;ctx.save();ctx.translate(cx,cy);ctx.rotate(b.rot);ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(8,0);ctx.stroke();ctx.beginPath();ctx.arc(-8,0,3,0,Math.PI*2);ctx.arc(8,0,3,0,Math.PI*2);ctx.stroke();ctx.restore();}
  ctx.globalAlpha=1;
}

// ─── MONTAÑAS (antes eran rocas) ───
function drawMountains() {
  const lvl = LEVELS[currentLevel];
  for (const r of lvl.rocks) {
    const x = r.x*TILE, y = r.y*TILE;
    const cx = x+TILE/2, cy = y+TILE/2;

    // Sombra
    ctx.globalAlpha=0.25; ctx.fillStyle='#2e1a0a';
    ctx.beginPath(); ctx.ellipse(cx+4,cy+8,20,8,0,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;

    // Montaña cuerpo principal
    ctx.fillStyle='#5d4e3a';
    ctx.beginPath();
    ctx.moveTo(x-4,y+TILE);
    ctx.lineTo(x+6,y+12);
    ctx.lineTo(cx-2,y-2);  // pico izq
    ctx.lineTo(cx+5,y+5); // valle
    ctx.lineTo(x+TILE-4,y-4); // pico der
    ctx.lineTo(x+TILE+2,y+10);
    ctx.lineTo(x+TILE+4,y+TILE);
    ctx.closePath(); ctx.fill();

    // Cara iluminada
    ctx.fillStyle='#7d6e5a';
    ctx.beginPath();
    ctx.moveTo(cx-2,y-2);
    ctx.lineTo(cx+5,y+5);
    ctx.lineTo(x+TILE-4,y-4);
    ctx.lineTo(x+TILE+2,y+10);
    ctx.lineTo(x+TILE+4,y+TILE);
    ctx.lineTo(cx+2,y+TILE);
    ctx.closePath(); ctx.fill();

    // Nieve/arena clara en los picos
    ctx.fillStyle='#bcaaa4'; ctx.globalAlpha=0.5;
    ctx.beginPath();
    ctx.moveTo(cx-2,y-2); ctx.lineTo(cx+2,y+4); ctx.lineTo(cx-6,y+6); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x+TILE-4,y-4); ctx.lineTo(x+TILE,y+3); ctx.lineTo(x+TILE-8,y+4); ctx.closePath(); ctx.fill();
    ctx.globalAlpha=1;

    // Grietas/detalles
    ctx.strokeStyle='#4a3c2a'; ctx.lineWidth=0.6; ctx.globalAlpha=0.3;
    ctx.beginPath(); ctx.moveTo(cx,y+8); ctx.lineTo(cx-3,y+20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+TILE-6,y+6); ctx.lineTo(x+TILE-2,y+18); ctx.stroke();
    ctx.globalAlpha=1;

    // Pequeño ícono de refugio si el jugador está cerca
    if (Math.abs(player.x-r.x)<=2 && Math.abs(player.y-r.y)<=2) {
      ctx.globalAlpha = 0.3 + Math.sin(frameTick*0.08)*0.15;
      ctx.fillStyle='#4fc3f7';
      ctx.font='bold 10px Rajdhani';
      ctx.textAlign='center';
      ctx.fillText('⛰',cx,y+TILE+10);
      ctx.globalAlpha=1;
    }
  }
}

function drawSpicePickups() {
  for(const s of spicePickups){
    const cx=s.x*TILE+TILE/2,cy=s.y*TILE+TILE/2;
    const pulse=Math.sin(frameTick*0.07+s.x)*0.3+0.7;
    const glow=Math.sin(frameTick*0.05+s.y)*4+16;
    ctx.globalAlpha=0.15*pulse;
    const gg=ctx.createRadialGradient(cx,cy,2,cx,cy,glow);
    gg.addColorStop(0,'#ff9f43');gg.addColorStop(1,'transparent');
    ctx.fillStyle=gg;ctx.fillRect(cx-glow,cy-glow,glow*2,glow*2);
    ctx.globalAlpha=0.9;ctx.fillStyle='#ff6b1a';
    ctx.beginPath();ctx.moveTo(cx,cy-10);ctx.lineTo(cx+8,cy);ctx.lineTo(cx,cy+10);ctx.lineTo(cx-8,cy);ctx.closePath();ctx.fill();
    ctx.fillStyle='#ffcc02';
    ctx.beginPath();ctx.moveTo(cx,cy-6);ctx.lineTo(cx+5,cy);ctx.lineTo(cx,cy+6);ctx.lineTo(cx-5,cy);ctx.closePath();ctx.fill();
    ctx.fillStyle='#fff';ctx.globalAlpha=pulse*0.6;
    ctx.beginPath();ctx.arc(cx-2,cy-3,1.5,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
  }
}

function drawWormTrail() {
  ctx.globalAlpha=0.06;ctx.fillStyle='#3e2723';
  for(const seg of worm.segments){ctx.beginPath();ctx.ellipse(seg.x*TILE+TILE/2+3,seg.y*TILE+TILE/2+4,17,8,0,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;
}

function drawWorm() {
  const segs=worm.segments;
  for(let i=segs.length-1;i>=0;i--){
    const seg=segs[i],cx=seg.x*TILE+TILE/2,cy=seg.y*TILE+TILE/2;
    const wobble=Math.sin(frameTick*0.08+i*0.8)*2.5;
    const t=i/(segs.length-1),radius=19-t*9;
    if(i===0){
      const jaw=worm.jawOpen*0.35;
      ctx.fillStyle='#4e342e';ctx.beginPath();ctx.arc(cx+wobble,cy,radius+2,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#5d4037';ctx.beginPath();ctx.arc(cx+wobble,cy,radius,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#4e342e';
      ctx.beginPath();ctx.arc(cx+wobble,cy-jaw*12,radius-2,Math.PI+0.3,-0.3);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.arc(cx+wobble,cy+jaw*12,radius-2,0.3,Math.PI-0.3);ctx.closePath();ctx.fill();
      if(worm.jawOpen>0.2){ctx.fillStyle='#b71c1c';ctx.globalAlpha=worm.jawOpen;ctx.beginPath();ctx.ellipse(cx+wobble,cy,radius-5,jaw*10,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
      ctx.fillStyle='#ffecb3';
      for(let t=0;t<6;t++){const a=(t/6)*Math.PI-Math.PI/2;const tx=cx+wobble+Math.cos(a)*(radius-4);const ty=cy-jaw*10+Math.sin(a)*4;ctx.beginPath();ctx.moveTo(tx-2,ty);ctx.lineTo(tx,ty+5+jaw*3);ctx.lineTo(tx+2,ty);ctx.closePath();ctx.fill();}
      for(let t=0;t<6;t++){const a=(t/6)*Math.PI+Math.PI/2;const tx=cx+wobble+Math.cos(a)*(radius-4);const ty=cy+jaw*10+Math.sin(a)*4;ctx.beginPath();ctx.moveTo(tx-2,ty);ctx.lineTo(tx,ty-5-jaw*3);ctx.lineTo(tx+2,ty);ctx.closePath();ctx.fill();}
      const eg=Math.sin(frameTick*0.1)*0.3+0.7;
      ctx.globalAlpha=0.4*eg;ctx.fillStyle='#ff1744';
      ctx.beginPath();ctx.arc(cx+wobble-7,cy-8,7,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(cx+wobble+7,cy-8,7,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=1;
      ctx.fillStyle='#ff1744';ctx.beginPath();ctx.arc(cx+wobble-7,cy-8,4.5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#b71c1c';ctx.beginPath();ctx.arc(cx+wobble-7,cy-8,2.5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#ffcdd2';ctx.beginPath();ctx.arc(cx+wobble-8,cy-9.5,1.2,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#ff1744';ctx.beginPath();ctx.arc(cx+wobble+7,cy-8,4.5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#b71c1c';ctx.beginPath();ctx.arc(cx+wobble+7,cy-8,2.5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#ffcdd2';ctx.beginPath();ctx.arc(cx+wobble+6,cy-9.5,1.2,0,Math.PI*2);ctx.fill();
    } else {
      const shade=t<0.5?'#6d4c41':'#8d6e63';
      ctx.fillStyle=shade;ctx.beginPath();ctx.arc(cx+wobble,cy,radius,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=t<0.5?'#795548':'#a1887f';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(cx+wobble,cy,radius-3,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=0.15;ctx.strokeStyle='#4e342e';ctx.lineWidth=0.8;
      ctx.beginPath();ctx.moveTo(cx+wobble-radius+4,cy);ctx.lineTo(cx+wobble+radius-4,cy);ctx.stroke();
      ctx.globalAlpha=1;
    }
  }
}

function drawPlayer() {
  const cx=player.x*TILE+TILE/2,cy=player.y*TILE+TILE/2;
  const bob=Math.sin(frameTick*0.1)*1.5;

  // Indicador de ocultamiento
  if (playerHidden) {
    ctx.globalAlpha=0.2+Math.sin(frameTick*0.06)*0.1;
    ctx.strokeStyle='#4fc3f7';ctx.lineWidth=2;
    ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.arc(cx,cy+2+bob,20,0,Math.PI*2);ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha=1;
  }

  // Sombra
  ctx.globalAlpha=playerHidden?0.08:0.18;ctx.fillStyle='#1a0e00';
  ctx.beginPath();ctx.ellipse(cx,cy+18,12,5,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=playerHidden?0.55:1;

  // Capa
  ctx.fillStyle='#1a237e';
  ctx.beginPath();ctx.moveTo(cx-14,cy+17+bob);ctx.quadraticCurveTo(cx,cy-2+bob,cx+14,cy+17+bob);ctx.lineTo(cx+10,cy+17+bob);ctx.quadraticCurveTo(cx,cy+4+bob,cx-10,cy+17+bob);ctx.closePath();ctx.fill();
  // Cuerpo
  ctx.fillStyle='#283593';ctx.beginPath();ctx.arc(cx,cy+4+bob,10,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#3949ab';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(cx,cy-5+bob);ctx.lineTo(cx,cy+12+bob);ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx-6,cy+2+bob);ctx.lineTo(cx+6,cy+2+bob);ctx.stroke();
  // Cabeza
  ctx.fillStyle='#bcaaa4';ctx.beginPath();ctx.arc(cx,cy-8+bob,8,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#1a237e';ctx.beginPath();ctx.arc(cx,cy-8+bob,8,Math.PI+0.4,-0.4);ctx.closePath();ctx.fill();
  // Ojos
  ctx.globalAlpha=playerHidden?0.3:0.35;ctx.fillStyle='#4fc3f7';
  ctx.beginPath();ctx.arc(cx-3,cy-9+bob,4,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(cx+3,cy-9+bob,4,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=playerHidden?0.55:1;
  ctx.fillStyle='#4fc3f7';
  ctx.beginPath();ctx.arc(cx-3,cy-9+bob,2.5,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(cx+3,cy-9+bob,2.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#01579b';
  ctx.beginPath();ctx.arc(cx-3,cy-9+bob,1,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(cx+3,cy-9+bob,1,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#e1f5fe';
  ctx.beginPath();ctx.arc(cx-4,cy-10+bob,0.8,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(cx+2,cy-10+bob,0.8,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;
}

function drawHUD() {
  const rem=spicePickups.length;
  ctx.globalAlpha=0.7;ctx.fillStyle='#1a0e00';ctx.fillRect(W/2-90,6,180,22);ctx.globalAlpha=1;
  ctx.font='bold 12px Rajdhani';ctx.textAlign='center';
  if(rem>0){ctx.fillStyle=rem<=1?'#00e676':'#ff9f43';ctx.fillText(`◆ ${rem} especia${rem>1?'s':''} restante${rem>1?'s':''}`,W/2,21);}
  else{ctx.fillStyle='#00e676';ctx.fillText('✓ ¡Toda la especia recogida!',W/2,21);}

  // Indicador de oculto
  if(playerHidden){
    ctx.globalAlpha=0.8;ctx.fillStyle='#0d47a1';ctx.fillRect(W/2-55,30,110,20);ctx.globalAlpha=1;
    ctx.fillStyle='#4fc3f7';ctx.font='bold 11px Rajdhani';ctx.fillText('⛰ OCULTO EN MONTAÑA',W/2,44);
  }
}

function drawTremorEffect() {
  if(worm.tremor<=0||playerHidden)return;
  ctx.globalAlpha=worm.tremor*0.07;ctx.fillStyle='#ff1744';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
  if(worm.tremor>0.5){canvas.style.transform=`translate(${(Math.random()-0.5)*worm.tremor*3}px,${(Math.random()-0.5)*worm.tremor*3}px)`;}
  else{canvas.style.transform='';}
}

// ══════════════════════════════════════════════════════
init();
