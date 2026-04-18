/* --- CONSTANTES --- */
const TILE = 30, COLS = 17, ROWS = 13;
const DIR_MAP = { arriba: [0, -1], abajo: [0, 1], izquierda: [-1, 0], derecha: [1, 0] };
const KEY_DIR = { ArrowUp: 'arriba', ArrowDown: 'abajo', ArrowLeft: 'izquierda', ArrowRight: 'derecha', w: 'arriba', s: 'abajo', a: 'izquierda', d: 'derecha' };

const LEVELS = [
    { name: "Arrakeen Outskirts", spiceCount: 15, wormSpeed: 500, wallDensity: 0.06, wormLen: 4, desc: "Las afueras de Arrakeen." },
    { name: "The Great Flat", spiceCount: 22, wormSpeed: 400, wallDensity: 0.08, wormLen: 5, desc: "La gran planicie." },
    { name: "Sietch Tabr Pass", spiceCount: 28, wormSpeed: 320, wallDensity: 0.11, wormLen: 6, desc: "El paso del Sietch." },
    { name: "The Deep Desert", spiceCount: 34, wormSpeed: 260, wallDensity: 0.13, wormLen: 7, desc: "El desierto profundo." },
    { name: "Shai-Hulud's Domain", spiceCount: 40, wormSpeed: 200, wallDensity: 0.15, wormLen: 9, desc: "¡La prueba final!" }
];

/* --- ESTADO GLOBAL --- */
let gameState = 'menu';
let level = 0, score = 0, lives = 3, tick = 0;
let player = { x: 2, y: 2 }, facing = [1, 0];
let walls = new Set(), spice = new Set(), worm = [], wormPath = [];
let gameInterval, wormInterval, runningCode = false;

/* --- LÓGICA DE NIVEL (BASADO EN TU CÓDIGO) --- */
function seededRand(seed) {
    let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

function genLevel(li) {
    const cfg = LEVELS[li];
    const r = seededRand(li * 7919 + 42);
    const newWalls = new Set();
    for (let x = 0; x < COLS; x++) { newWalls.add(`${x},0`); newWalls.add(`${x},${ROWS - 1}`); }
    for (let y = 0; y < ROWS; y++) { newWalls.add(`0,${y}`); newWalls.add(`${COLS - 1},${y}`); }
    
    // Simplicación de generación de muros para brevedad
    for (let i = 0; i < 15; i++) {
        newWalls.add(`${Math.floor(r() * COLS)},${Math.floor(r() * ROWS)}`);
    }
    
    // Limpiar zona inicio jugador y gusano
    const clean = (px, py) => { for(let i=-1; i<=1; i++) for(let j=-1; j<=1; j++) newWalls.delete(`${px+i},${py+j}`); };
    clean(2, 2); clean(COLS - 3, ROWS - 3);

    const newSpice = new Set();
    while (newSpice.size < cfg.spiceCount) {
        let x = 1 + Math.floor(r() * (COLS - 2)), y = 1 + Math.floor(r() * (ROWS - 2));
        if (!newWalls.has(`${x},${y}`)) newSpice.add(`${x},${y}`);
    }

    walls = newWalls; spice = newSpice;
    player = { x: 2, y: 2 };
    const ws = { x: COLS - 3, y: ROWS - 3 };
    worm = Array.from({ length: cfg.wormLen }, () => ({ ...ws }));
}

/* --- RENDERIZADO (REEMPLAZA JSX) --- */
function draw() {
    const host = document.getElementById('svg-host');
    let svgContent = `
        <svg viewBox="0 0 ${COLS * TILE} ${ROWS * TILE}" style="width:100%; height:100%;">
            <rect width="100%" height="100%" fill="#1a0e04" />
            ${renderWalls()}
            ${renderSpice()}
            ${renderWorm()}
            ${renderPlayer()}
        </svg>`;
    host.innerHTML = svgContent;
    updateHUD();
}

function renderWalls() {
    let h = '';
    walls.forEach(k => {
        const [x, y] = k.split(',').map(Number);
        h += `<rect x="${x * TILE}" y="${y * TILE}" width="${TILE}" height="${TILE}" fill="#5d4037" stroke="#2e1a10" />`;
    });
    return h;
}

function renderSpice() {
    let h = '';
    spice.forEach(k => {
        const [x, y] = k.split(',').map(Number);
        const p = Math.sin(tick * 0.3) * 2;
        h += `<circle cx="${x * TILE + 15}" cy="${y * TILE + 15}" r="${5 + p}" fill="#FFD700" opacity="0.8" />`;
    });
    return h;
}

function renderPlayer() {
    const cx = player.x * TILE + 15, cy = player.y * TILE + 15;
    return `<g transform="translate(${cx},${cy})">
        <circle r="12" fill="#37474f" />
        <circle cx="${facing[0] * 4}" cy="${facing[1] * 4 - 5}" r="3" fill="#00e5ff" />
    </g>`;
}

function renderWorm() {
    let h = '';
    worm.forEach((seg, i) => {
        const r = i === 0 ? 12 : 10 - i;
        h += `<circle cx="${seg.x * TILE + 15}" cy="${seg.y * TILE + 15}" r="${Math.max(r, 4)}" fill="${i === 0 ? '#1a0a05' : '#8b4513'}" />`;
    });
    return h;
}

function updateHUD() {
    document.getElementById('level-name').innerText = `◈ Lv.${level + 1} ${LEVELS[level].name}`;
    document.getElementById('score').innerText = score;
    document.getElementById('lives').innerText = '♦'.repeat(lives) + '◇'.repeat(3 - lives);
    document.getElementById('spice-count').innerText = `${LEVELS[level].spiceCount - spice.size}/${LEVELS[level].spiceCount}`;
}

/* --- CONTROLADORES --- */
function movePlayer(dirName) {
    if (gameState !== 'playing') return;
    const dir = DIR_MAP[dirName];
    facing = dir;
    const nx = player.x + dir[0], ny = player.y + dir[1];
    
    if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && !walls.has(`${nx},${ny}`)) {
        player = { x: nx, y: ny };
        if (spice.has(`${nx},${ny}`)) {
            spice.delete(`${nx},${ny}`);
            score += 10;
            if (spice.size === 0) nextLevel();
        }
    }
    draw();
}

function nextLevel() {
    if (level >= 4) {
        endGame('¡VICTORIA! Eres el Lisan al-Gaib');
    } else {
        level++;
        initLevel();
    }
}

function initLevel() {
    genLevel(level);
    draw();
    startWormAI();
}

function startWormAI() {
    clearInterval(wormInterval);
    wormInterval = setInterval(() => {
        if (gameState !== 'playing') return;
        const head = worm[0];
        // IA Simple: El gusano se mueve hacia el jugador
        let dx = player.x > head.x ? 1 : (player.x < head.x ? -1 : 0);
        let dy = player.y > head.y ? 1 : (player.y < head.y ? -1 : 0);
        
        // Evitar muros básica
        if (walls.has(`${head.x + dx},${head.y}`)) dx = 0;
        if (walls.has(`${head.x},${head.y + dy}`)) dy = 0;

        const next = { x: head.x + dx, y: head.y + dy };
        worm.unshift(next);
        worm.pop();

        // Colisión
        if (next.x === player.x && next.y === player.y) {
            lives--;
            player = { x: 2, y: 2 };
            document.getElementById('board-wrapper').classList.add('shake');
            setTimeout(() => document.getElementById('board-wrapper').classList.remove('shake'), 500);
            if (lives <= 0) endGame('DEVORADO POR SHAI-HULUD');
        }
        draw();
    }, LEVELS[level].wormSpeed);
}

function endGame(msg) {
    gameState = 'over';
    clearInterval(wormInterval);
    const overlay = document.getElementById('message-overlay');
    overlay.innerHTML = `<h2>${msg}</h2><button onclick="location.reload()" class="rbtn">Reiniciar</button>`;
    overlay.classList.remove('hidden');
}

/* --- PARSER DE CÓDIGO (COMO TU ORIGINAL) --- */
async function runCode() {
    const code = document.getElementById('code-area').value.toLowerCase().split('\n');
    runningCode = true;
    for (let line of code) {
        line = line.trim();
        if (DIR_MAP[line]) {
            movePlayer(line);
            await new Promise(r => setTimeout(r, 300));
        }
    }
    runningCode = false;
}

/* --- EVENTOS --- */
document.getElementById('start-btn').onclick = () => {
    document.getElementById('menu-overlay').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    gameState = 'playing';
    initLevel();
};

document.getElementById('run-btn').onclick = runCode;

document.querySelectorAll('.gbtn').forEach(btn => {
    btn.onclick = () => movePlayer(btn.dataset.dir);
});

window.onkeydown = (e) => {
    if (KEY_DIR[e.key]) movePlayer(KEY_DIR[e.key]);
};

// Animación de ambiente
setInterval(() => { tick++; if(gameState === 'playing') draw(); }, 100);