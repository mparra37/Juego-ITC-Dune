import { useState, useEffect, useCallback, useRef, useMemo } from "react";

const TILE = 30;
const COLS = 17;
const ROWS = 13;
const GW = COLS * TILE;
const GH = ROWS * TILE;

const DIR_MAP = { arriba:[0,-1], abajo:[0,1], izquierda:[-1,0], derecha:[1,0] };
const KEY_DIR = { ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0], w:[0,-1], s:[0,1], a:[-1,0], d:[1,0] };

const LEVELS = [
  { name:"Arrakeen Outskirts", spiceCount:15, wormSpeed:500, wallDensity:0.06, wormLen:4, desc:"Las afueras de Arrakeen. La especia brilla bajo el sol." },
  { name:"The Great Flat",     spiceCount:22, wormSpeed:400, wallDensity:0.08, wormLen:5, desc:"La gran planicie. Shai-Hulud detecta tus vibraciones." },
  { name:"Sietch Tabr Pass",   spiceCount:28, wormSpeed:320, wallDensity:0.11, wormLen:6, desc:"El paso del Sietch. Rocas traicioneras rodean el camino." },
  { name:"The Deep Desert",    spiceCount:34, wormSpeed:260, wallDensity:0.13, wormLen:7, desc:"El desierto profundo. Solo los Fremen sobreviven aquí." },
  { name:"Shai-Hulud's Domain",spiceCount:40, wormSpeed:200, wallDensity:0.15, wormLen:9, desc:"El dominio del Gran Hacedor. ¡La prueba final!" },
];

function seededRand(seed) {
  let s = seed; return () => { s=(s*16807)%2147483647; return s/2147483647; };
}

function genLevel(li) {
  const cfg = LEVELS[li];
  const r = seededRand(li * 7919 + 42);
  const walls = new Set();
  for (let x = 0; x < COLS; x++) { walls.add(`${x},0`); walls.add(`${x},${ROWS - 1}`); }
  for (let y = 0; y < ROWS; y++) { walls.add(`0,${y}`); walls.add(`${COLS - 1},${y}`); }
  const nStruct = Math.floor(cfg.wallDensity * 55);
  for (let i = 0; i < nStruct; i++) {
    const t = Math.floor(r() * 4);
    if (t === 0) { const y = 3 + Math.floor(r() * (ROWS - 6)), x = 2 + Math.floor(r() * (COLS - 7)), l = 2 + Math.floor(r() * 3); for (let j = 0; j < l; j++) walls.add(`${x + j},${y}`); }
    else if (t === 1) { const x = 3 + Math.floor(r() * (COLS - 6)), y = 2 + Math.floor(r() * (ROWS - 6)), l = 2 + Math.floor(r() * 3); for (let j = 0; j < l; j++) walls.add(`${x},${y + j}`); }
    else if (t === 2) { const x = 3 + Math.floor(r() * (COLS - 7)), y = 3 + Math.floor(r() * (ROWS - 7)); for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) walls.add(`${x + dx},${y + dy}`); }
    else { const x = 3 + Math.floor(r() * (COLS - 8)), y = 3 + Math.floor(r() * (ROWS - 7)); walls.add(`${x},${y}`); walls.add(`${x + 1},${y}`); walls.add(`${x},${y + 1}`); }
  }
  const ps = { x: 2, y: 2 };
  for (let dx = -1; dx <= 2; dx++) for (let dy = -1; dy <= 2; dy++) walls.delete(`${ps.x + dx},${ps.y + dy}`);
  const ws = { x: COLS - 3, y: ROWS - 3 };
  for (let dx = -2; dx <= 1; dx++) for (let dy = -2; dy <= 1; dy++) walls.delete(`${ws.x + dx},${ws.y + dy}`);
  const spice = new Set(); let att = 0;
  while (spice.size < cfg.spiceCount && att < 4000) {
    const x = 1 + Math.floor(r() * (COLS - 2)), y = 1 + Math.floor(r() * (ROWS - 2)), k = `${x},${y}`;
    if (!walls.has(k) && !(x === ps.x && y === ps.y) && !(x === ws.x && y === ws.y)) spice.add(k); att++;
  }
  const wb = []; for (let i = 0; i < cfg.wormLen; i++) wb.push({ ...ws });
  return { walls, spice, ps, wb, cfg };
}

function bfs(start, target, walls) {
  const q = [{ ...start, path: [] }], vis = new Set(); vis.add(`${start.x},${start.y}`);
  while (q.length) {
    const c = q.shift(); if (c.x === target.x && c.y === target.y) return c.path;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = c.x + dx, ny = c.y + dy, k = `${nx},${ny}`;
      if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && !vis.has(k) && !walls.has(k)) { vis.add(k); q.push({ x: nx, y: ny, path: [...c.path, { x: nx, y: ny }] }); }
    }
  }
  return null;
}

/* ── SVG Characters ── */
function PlayerSVG({ x, y, tick, facing }) {
  const cx = x * TILE + TILE / 2, cy = y * TILE + TILE / 2;
  const bob = Math.sin(tick * 0.15) * 1.5;
  const flip = facing[0] < 0 ? -1 : 1;
  return (
    <g transform={`translate(${cx},${cy + bob})`}>
      <circle r={14} fill="rgba(0,229,255,0.07)"><animate attributeName="r" values="13;15;13" dur="2s" repeatCount="indefinite" /></circle>
      {/* Cape */}
      <path d={`M${-8 * flip} 5 Q${0} 19 ${10 * flip} 7 L${6 * flip} -3Z`} fill="#5d4037" opacity={0.85} />
      {/* Body stillsuit */}
      <rect x={-6} y={0} width={12} height={14} rx={3} fill="#37474f" />
      <line x1={-3} y1={3} x2={-3} y2={11} stroke="#546e7a" strokeWidth={0.7} />
      <line x1={3} y1={3} x2={3} y2={11} stroke="#546e7a" strokeWidth={0.7} />
      <rect x={-5} y={4} width={10} height={2} rx={1} fill="none" stroke="#455a64" strokeWidth={0.5} />
      {/* Head */}
      <circle cx={0} cy={-7} r={5.5} fill="#bcaaa4" />
      {/* Hood */}
      <path d={`M-6 -7 Q-6 -14 0 -14.5 Q6 -14 6 -7`} fill="#455a64" />
      <path d={`M-5.5 -7 Q-5 -13 0 -13.5 Q5 -13 5.5 -7`} fill="none" stroke="#37474f" strokeWidth={0.5} />
      {/* Nose mask */}
      <rect x={-2.5} y={-5.5} width={5} height={3} rx={1} fill="#263238" />
      <line x1={-1.5} y1={-5} x2={-1.5} y2={-3} stroke="#37474f" strokeWidth={0.3} />
      <line x1={1.5} y1={-5} x2={1.5} y2={-3} stroke="#37474f" strokeWidth={0.3} />
      {/* Eyes of Ibad */}
      <circle cx={-2.5} cy={-9} r={1.6} fill="#00e5ff">
        <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx={2.5} cy={-9} r={1.6} fill="#00e5ff">
        <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" begin="0.3s" />
      </circle>
      <circle cx={-2.5} cy={-9} r={3.5} fill="rgba(0,229,255,0.12)" />
      <circle cx={2.5} cy={-9} r={3.5} fill="rgba(0,229,255,0.12)" />
      {/* Eye pupils */}
      <circle cx={-2.5 + facing[0] * 0.4} cy={-9 + facing[1] * 0.4} r={0.7} fill="#ffffff" />
      <circle cx={2.5 + facing[0] * 0.4} cy={-9 + facing[1] * 0.4} r={0.7} fill="#ffffff" />
    </g>
  );
}

function WormSVG({ segments, tick }) {
  const jawOpen = 0.5 + Math.sin(tick * 0.05) * 0.3;
  const els = [];
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    const cx = seg.x * TILE + TILE / 2, cy = seg.y * TILE + TILE / 2;
    const wobble = Math.sin(tick * 0.08 + i * 0.8) * 2.5;
    const t = i / (segments.length - 1 || 1);
    const radius = Math.max(5, 15 - t * 8);
    const lc = `hsl(20,${30 + t * 15}%,${50 - t * 15}%)`;
    const dc = `hsl(15,${40 + t * 10}%,${20 - t * 5}%)`;
    if (i === 0) {
      els.push(
        <g key="wh" transform={`translate(${cx + wobble},${cy})`}>
          <circle r={radius + 1} fill="rgba(255,60,0,0.08)">
            <animate attributeName="r" values={`${radius};${radius + 3};${radius}`} dur="1s" repeatCount="indefinite" />
          </circle>
          <circle r={radius} fill="#1a0a05" />
          {Array.from({ length: 12 }, (_, j) => {
            const a = (j / 12) * Math.PI * 2;
            const tx = Math.cos(a) * (radius * jawOpen * 0.75);
            const ty = Math.sin(a) * (radius * jawOpen * 0.75);
            return <circle key={j} cx={tx} cy={ty} r={1.2} fill="#f5f5dc" opacity={0.85} />;
          })}
          {[0, 1, 2].map(j => {
            const a = (j / 3) * Math.PI * 2 - Math.PI / 2;
            const ox = Math.cos(a) * radius * 0.25 * jawOpen;
            const oy = Math.sin(a) * radius * 0.25 * jawOpen;
            return (
              <path key={`jaw${j}`}
                d={`M${ox} ${oy} L${Math.cos(a - 0.5) * radius * 1.05} ${Math.sin(a - 0.5) * radius * 1.05} A${radius} ${radius} 0 0 1 ${Math.cos(a + 0.5) * radius * 1.05} ${Math.sin(a + 0.5) * radius * 1.05} Z`}
                fill={lc} stroke={dc} strokeWidth={0.8} />
            );
          })}
          <circle r={radius * 0.3} fill="rgba(255,60,0,0.2)">
            <animate attributeName="r" values={`${radius * 0.25};${radius * 0.4};${radius * 0.25}`} dur="1.2s" repeatCount="indefinite" />
          </circle>
        </g>
      );
    } else {
      els.push(
        <g key={`ws${i}`}>
          <circle cx={cx + wobble} cy={cy} r={radius} fill={lc} stroke={dc} strokeWidth={0.8} />
          <path d={`M${cx + wobble - radius + 2} ${cy} A${radius - 2} ${radius - 2} 0 0 1 ${cx + wobble + radius - 2} ${cy}`}
            fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth={1.2} />
          <ellipse cx={cx + wobble - radius * 0.25} cy={cy - radius * 0.3} rx={radius * 0.25} ry={radius * 0.15}
            fill="rgba(255,255,255,0.06)" />
        </g>
      );
    }
  }
  return <>{els}</>;
}

function SpiceSVG({ x, y, tick }) {
  const cx = x * TILE + TILE / 2, cy = y * TILE + TILE / 2;
  const p = Math.sin(tick * 0.1) * 0.5;
  return (
    <g>
      <circle cx={cx} cy={cy} r={8 + p} fill="rgba(255,140,0,0.1)" />
      <circle cx={cx} cy={cy} r={5 + p * 0.5} fill="rgba(255,160,30,0.55)" stroke="rgba(255,200,60,0.3)" strokeWidth={0.5} />
      {[0, 60, 120, 180, 240, 300].map((a, i) => {
        const rad = a * Math.PI / 180;
        return <line key={i} x1={cx + Math.cos(rad) * 2} y1={cy + Math.sin(rad) * 2}
          x2={cx + Math.cos(rad) * (5 + p)} y2={cy + Math.sin(rad) * (5 + p)}
          stroke="#FFD700" strokeWidth={0.7} opacity={0.5} />;
      })}
      <circle cx={cx} cy={cy} r={2} fill="#FFD700"><animate attributeName="opacity" values="0.6;1;0.6" dur="1.8s" repeatCount="indefinite" /></circle>
    </g>
  );
}

/* ── Dune Background ── */
function DuneBackground() {
  return (
    <svg viewBox={`0 0 ${GW} ${GH}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 8, pointerEvents: 'none' }}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a0e04" /><stop offset="35%" stopColor="#2d1810" /><stop offset="100%" stopColor="#3d2418" />
        </linearGradient>
        <linearGradient id="dune1g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c2985a" /><stop offset="100%" stopColor="#8b6914" />
        </linearGradient>
        <linearGradient id="dune2g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a07840" /><stop offset="100%" stopColor="#6b4e20" />
        </linearGradient>
        <radialGradient id="sunG" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fff5d0" /><stop offset="35%" stopColor="#ffcc44" stopOpacity="0.5" /><stop offset="100%" stopColor="#ff8800" stopOpacity="0" />
        </radialGradient>
        <filter id="sandNoise"><feTurbulence baseFrequency="0.85" numOctaves="3" result="n" /><feComposite in="SourceGraphic" in2="n" operator="in" /></filter>
      </defs>
      <rect width={GW} height={GH} fill="url(#sky)" />
      <circle cx={GW * 0.78} cy={16} r={12} fill="url(#sunG)" />
      <circle cx={GW * 0.87} cy={26} r={7} fill="url(#sunG)" opacity={0.5} />
      {/* Far dunes layer */}
      <path d={`M0 ${GH * 0.22} Q${GW * 0.12} ${GH * 0.14} ${GW * 0.28} ${GH * 0.2} T${GW * 0.55} ${GH * 0.18} T${GW * 0.8} ${GH * 0.24} T${GW} ${GH * 0.2} V${GH} H0Z`}
        fill="url(#dune2g)" opacity={0.2} />
      {/* Mid dunes layer */}
      <path d={`M0 ${GH * 0.35} Q${GW * 0.18} ${GH * 0.26} ${GW * 0.35} ${GH * 0.33} T${GW * 0.6} ${GH * 0.28} T${GW * 0.82} ${GH * 0.36} T${GW} ${GH * 0.3} V${GH} H0Z`}
        fill="url(#dune1g)" opacity={0.18} />
      {/* Near dunes */}
      <path d={`M0 ${GH * 0.55} Q${GW * 0.25} ${GH * 0.48} ${GW * 0.45} ${GH * 0.54} T${GW * 0.7} ${GH * 0.5} T${GW} ${GH * 0.56} V${GH} H0Z`}
        fill="url(#dune2g)" opacity={0.12} />
      {/* Sand grain texture */}
      <rect width={GW} height={GH} fill="rgba(194,154,89,0.035)" filter="url(#sandNoise)" />
      {/* Atmospheric haze at bottom */}
      <rect y={GH * 0.7} width={GW} height={GH * 0.3} fill="rgba(194,154,89,0.04)" />
    </svg>
  );
}

/* ── Code Parser ── */
function parseCode(code) {
  const lines = code.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const cmds = []; let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const repMatch = line.match(/^repetir\s*\(\s*(\d+)\s*\)/i);
    if (repMatch) {
      const times = parseInt(repMatch[1], 10);
      const block = []; i++;
      while (i < lines.length && !/^fin$/i.test(lines[i])) {
        const d = lines[i].toLowerCase();
        if (DIR_MAP[d]) block.push(d); i++;
      }
      for (let t = 0; t < Math.min(times, 50); t++) block.forEach(b => cmds.push(b));
      i++;
    } else {
      const d = line.toLowerCase();
      if (DIR_MAP[d]) cmds.push(d); i++;
    }
  }
  return cmds;
}

/* ════════════════ MAIN ════════════════ */
export default function DuneSpiceHunt() {
  const [gameState, setGameState] = useState('menu');
  const [level, setLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [player, setPlayer] = useState({ x: 2, y: 2 });
  const [facing, setFacing] = useState([1, 0]);
  const [walls, setWalls] = useState(new Set());
  const [spice, setSpice] = useState(new Set());
  const [worm, setWorm] = useState([]);
  const [wormPath, setWormPath] = useState([]);
  const [lives, setLives] = useState(3);
  const [totalSpice, setTotalSpice] = useState(0);
  const [tick, setTick] = useState(0);
  const [code, setCode] = useState("derecha\nderecha\nabajo\nabajo\nrepetir(3)\n  derecha\nfin");
  const [running, setRunning] = useState(false);
  const [cmdIdx, setCmdIdx] = useState(-1);
  const [flash, setFlash] = useState(false);
  const [shake, setShake] = useState(false);
  const [msg, setMsg] = useState('');

  const refs = useRef({});
  useEffect(() => { refs.current = { player, worm, walls, spice, gameState, level, score, lives, wormPath, facing }; });

  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 60);
    return () => clearInterval(iv);
  }, []);

  const initLevel = useCallback((li) => {
    const d = genLevel(li);
    setWalls(d.walls); setSpice(d.spice); setPlayer(d.ps); setFacing([1, 0]);
    setWorm(d.wb); setWormPath([]); setTotalSpice(d.spice.size);
    setCmdIdx(-1); setRunning(false); setMsg('');
  }, []);

  const startGame = useCallback(() => {
    setLevel(0); setScore(0); setLives(3); setGameState('playing'); initLevel(0);
  }, [initLevel]);

  const movePlayer = useCallback((dir) => {
    const r = refs.current; if (r.gameState !== 'playing') return false;
    setFacing(dir);
    const nx = r.player.x + dir[0], ny = r.player.y + dir[1];
    if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && !r.walls.has(`${nx},${ny}`)) {
      const np = { x: nx, y: ny }; setPlayer(np);
      const k = `${nx},${ny}`;
      if (r.spice.has(k)) {
        setSpice(prev => { const n = new Set(prev); n.delete(k); return n; });
        setScore(prev => prev + 10 * (r.level + 1));
        setFlash(true); setTimeout(() => setFlash(false), 150);
      }
      return true;
    }
    return false;
  }, []);

  /* Worm AI */
  useEffect(() => {
    if (gameState !== 'playing') return;
    const cfg = LEVELS[level];
    const iv = setInterval(() => {
      const r = refs.current; if (r.gameState !== 'playing') return;
      const w = [...r.worm]; const head = w[0]; const p = r.player;
      let path = r.wormPath;
      if (!path || path.length === 0 || Math.random() < 0.25) {
        path = bfs(head, p, r.walls); setWormPath(path || []);
      }
      let next;
      if (path && path.length > 0) { next = path.shift(); setWormPath([...path]); }
      else {
        const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]].filter(([dx, dy]) => {
          const nx = head.x + dx, ny = head.y + dy;
          return nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && !r.walls.has(`${nx},${ny}`);
        });
        if (dirs.length) { const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)]; next = { x: head.x + dx, y: head.y + dy }; }
      }
      if (next) {
        w.unshift(next); while (w.length > cfg.wormLen) w.pop(); setWorm(w);
        if (next.x === r.player.x && next.y === r.player.y) {
          setShake(true); setTimeout(() => setShake(false), 500);
          if (r.lives <= 1) { setLives(0); setGameState('dead'); }
          else { setLives(l => l - 1); setPlayer({ x: 2, y: 2 }); const ws = { x: COLS - 3, y: ROWS - 3 }; setWorm(Array.from({ length: cfg.wormLen }, () => ({ ...ws }))); setWormPath([]); }
        }
      }
    }, cfg.wormSpeed);
    return () => clearInterval(iv);
  }, [gameState, level]);

  /* Body collision */
  useEffect(() => {
    if (gameState !== 'playing') return;
    for (const seg of worm) {
      if (seg.x === player.x && seg.y === player.y) {
        setShake(true); setTimeout(() => setShake(false), 500);
        const cfg = LEVELS[level];
        if (lives <= 1) { setLives(0); setGameState('dead'); }
        else { setLives(l => l - 1); setPlayer({ x: 2, y: 2 }); const ws = { x: COLS - 3, y: ROWS - 3 }; setWorm(Array.from({ length: cfg.wormLen }, () => ({ ...ws }))); setWormPath([]); }
        break;
      }
    }
  }, [player, worm, gameState, level, lives]);

  /* Level completion */
  useEffect(() => {
    if (gameState !== 'playing' || totalSpice === 0) return;
    if (spice.size === 0) {
      if (level >= 4) setGameState('won');
      else {
        setGameState('levelUp');
        setTimeout(() => { const nl = level + 1; setLevel(nl); initLevel(nl); setGameState('playing'); }, 2500);
      }
    }
  }, [spice, gameState, level, totalSpice, initLevel]);

  /* Run code */
  const runCode = useCallback(async () => {
    if (running || refs.current.gameState !== 'playing') return;
    const cmds = parseCode(code);
    if (!cmds.length) { setMsg('⚠ No hay comandos válidos'); return; }
    setRunning(true); setMsg('▶ Ejecutando...');
    for (let i = 0; i < cmds.length; i++) {
      if (refs.current.gameState !== 'playing') break;
      setCmdIdx(i);
      const dir = DIR_MAP[cmds[i]];
      if (dir) movePlayer(dir);
      await new Promise(r => setTimeout(r, 300));
    }
    setCmdIdx(-1); setRunning(false); setMsg('✓ Completado');
    setTimeout(() => setMsg(''), 2000);
  }, [code, running, movePlayer]);

  /* Keyboard */
  useEffect(() => {
    const h = (e) => {
      if (KEY_DIR[e.key] && refs.current.gameState === 'playing' && !running) { e.preventDefault(); movePlayer(KEY_DIR[e.key]); }
      if ((e.key === 'Enter' || e.key === ' ') && ['menu', 'dead', 'won'].includes(refs.current.gameState)) { e.preventDefault(); startGame(); }
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [startGame, movePlayer, running]);

  const parsedCmds = useMemo(() => parseCode(code), [code]);

  const btnS = {
    width: 46, height: 46, borderRadius: 10,
    background: 'rgba(197,116,46,0.18)', border: '1px solid rgba(255,215,0,0.25)',
    color: '#FFD700', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', touchAction: 'none', userSelect: 'none', fontFamily: 'monospace',
  };

  const renderGame = () => (
    <svg viewBox={`0 0 ${GW} ${GH}`} style={{ width: '100%', height: '100%', display: 'block', borderRadius: 8 }}>
      {/* Floor */}
      {Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x) => {
        if (walls.has(`${x},${y}`)) return null;
        const shade = ((x + y) % 2 === 0) ? 'rgba(194,154,89,0.05)' : 'rgba(160,120,60,0.03)';
        return <rect key={`f${x}_${y}`} x={x * TILE} y={y * TILE} width={TILE} height={TILE} fill={shade} />;
      }))}
      {/* Walls */}
      {Array.from(walls).map(k => {
        const [x, y] = k.split(',').map(Number);
        const border = x === 0 || x === COLS - 1 || y === 0 || y === ROWS - 1;
        return (
          <g key={`w${k}`}>
            <rect x={x * TILE} y={y * TILE} width={TILE} height={TILE}
              fill={border ? '#3e2723' : '#5d4037'} stroke={border ? '#2e1a10' : '#4e342e'} strokeWidth={0.5} rx={border ? 0 : 3} />
            {!border && <>
              <rect x={x * TILE + 4} y={y * TILE + 4} width={TILE - 8} height={TILE - 8} fill="none" stroke="rgba(188,170,164,0.12)" strokeWidth={0.5} rx={2} />
              <line x1={x * TILE + 5} y1={y * TILE + TILE / 2} x2={x * TILE + TILE - 5} y2={y * TILE + TILE / 2} stroke="rgba(0,0,0,0.12)" strokeWidth={0.5} />
            </>}
          </g>
        );
      })}
      {/* Spice */}
      {Array.from(spice).map(k => { const [x, y] = k.split(',').map(Number); return <SpiceSVG key={`s${k}`} x={x} y={y} tick={tick} />; })}
      {/* Worm */}
      <WormSVG segments={worm} tick={tick} />
      {/* Player */}
      <PlayerSVG x={player.x} y={player.y} tick={tick} facing={facing} />
    </svg>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg,#0d0704 0%,#1a0e04 30%,#2d1810 70%,#1a0e04 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: "'Courier New',monospace", color: '#EDC982',
      padding: 10, boxSizing: 'border-box',
    }}>
      <style>{`
        @keyframes pulse{0%,100%{text-shadow:0 0 10px #FF8C00}50%{text-shadow:0 0 30px #FFD700,0 0 60px #FF8C00}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
        .code-area{background:#0d0804;color:#ffcc44;border:1px solid rgba(255,215,0,0.2);border-radius:8px;padding:10px;font-family:'Courier New',monospace;font-size:13px;resize:none;outline:none;width:100%;box-sizing:border-box;line-height:1.6;tab-size:2;}
        .code-area:focus{border-color:rgba(255,215,0,0.5);box-shadow:0 0 12px rgba(255,140,0,0.15);}
        .code-area::placeholder{color:#5a4020;}
        .gbtn:active{background:rgba(197,116,46,0.5)!important;transform:scale(0.94);}
        .rbtn:hover:not(:disabled){background:linear-gradient(180deg,#c5742e,#8b4513)!important;box-shadow:0 0 18px rgba(255,140,0,0.35);}
      `}</style>

      {/* Title */}
      <h1 style={{
        fontSize: 'clamp(15px,3.2vw,22px)', margin: '0 0 5px', letterSpacing: 3,
        textTransform: 'uppercase', color: '#FFD700',
        textShadow: '0 0 20px rgba(255,140,0,0.4)',
        animation: gameState === 'playing' ? 'none' : 'pulse 3s infinite', textAlign: 'center',
      }}>
        ☀ Dune: Spice Hunt ☀
      </h1>

      {/* HUD */}
      {gameState === 'playing' && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 780,
          padding: '3px 10px', background: 'rgba(0,0,0,0.5)', borderRadius: 6,
          border: '1px solid rgba(255,215,0,0.12)', fontSize: 'clamp(10px,2vw,12px)', marginBottom: 6,
          flexWrap: 'wrap', gap: 3,
        }}>
          <span style={{ color: '#c2a060' }}>◈ Lv.{level + 1} {LEVELS[level].name}</span>
          <span>Especia: <b style={{ color: '#FFD700' }}>{totalSpice - spice.size}/{totalSpice}</b></span>
          <span>Pts: <b style={{ color: '#ff8c00' }}>{score}</b></span>
          <span>{Array.from({ length: lives }, () => '♦').join('')}{Array.from({ length: 3 - lives }, () => '◇').join('')}</span>
        </div>
      )}

      {/* Main layout */}
      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 820, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>

        {/* Game board */}
        <div style={{
          position: 'relative', width: '100%', maxWidth: GW, aspectRatio: `${COLS}/${ROWS}`, flexShrink: 0,
          animation: shake ? 'shake 0.1s linear 3' : 'none',
          boxShadow: flash ? '0 0 35px rgba(255,140,0,0.5)' : '0 0 12px rgba(0,0,0,0.6)',
          borderRadius: 8, border: '2px solid rgba(255,215,0,0.2)', overflow: 'hidden', transition: 'box-shadow 0.15s',
          background: '#0d0804',
        }}>
          <DuneBackground />
          <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
            {(gameState === 'playing' || gameState === 'levelUp') && renderGame()}
          </div>

          {/* Menu overlay */}
          {gameState === 'menu' && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(10,5,0,0.9)', borderRadius: 8, animation: 'fadeIn 0.5s ease-out', zIndex: 10, padding: 16,
            }}>
              <div style={{ fontSize: 'clamp(30px,8vw,48px)', marginBottom: 4 }}>🪱</div>
              <p style={{ fontSize: 'clamp(11px,2.5vw,14px)', margin: '0 0 4px', color: '#c2a060', textAlign: 'center', lineHeight: 1.6 }}>
                Recolecta la especia antes de que<br />Shai-Hulud te devore.
              </p>
              <p style={{ fontSize: 'clamp(9px,2vw,11px)', color: '#8b7355', margin: '0 0 4px', textAlign: 'center' }}>
                Escribe código o usa los controles para moverte.
              </p>
              <p style={{ fontSize: 'clamp(9px,2vw,10px)', color: '#6b5335', margin: '0 0 12px', textAlign: 'center' }}>
                ← ↑ ↓ → &nbsp;|&nbsp; WASD &nbsp;|&nbsp; D-Pad &nbsp;|&nbsp; Código
              </p>
              <button onClick={startGame} className="rbtn" style={{
                padding: '10px 26px', fontSize: 'clamp(12px,2.8vw,15px)',
                background: 'linear-gradient(180deg,#a05a1e,#6b3510)', border: '2px solid #FFD700', borderRadius: 8,
                color: '#FFD700', cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase',
                fontFamily: "'Courier New',monospace", fontWeight: 'bold', boxShadow: '0 0 15px rgba(255,140,0,0.2)',
              }}>
                Iniciar Misión
              </button>
            </div>
          )}

          {gameState === 'levelUp' && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(10,5,0,0.72)', borderRadius: 8, animation: 'fadeIn 0.3s ease-out', zIndex: 10,
            }}>
              <div style={{ fontSize: 'clamp(17px,3.8vw,24px)', color: '#FFD700', fontWeight: 'bold', animation: 'pulse 1s infinite' }}>
                ¡ESPECIA RECOLECTADA!
              </div>
              <div style={{ fontSize: 'clamp(11px,2.5vw,14px)', color: '#c2a060', marginTop: 5 }}>
                Nivel {level + 2}: {LEVELS[Math.min(level + 1, 4)].name}
              </div>
              <div style={{ fontSize: 'clamp(10px,2vw,12px)', color: '#ff6600', marginTop: 3 }}>
                ⚠ Shai-Hulud se acerca más rápido...
              </div>
            </div>
          )}

          {gameState === 'dead' && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(10,0,0,0.9)', borderRadius: 8, animation: 'fadeIn 0.5s ease-out', zIndex: 10,
            }}>
              <div style={{ fontSize: 'clamp(20px,5vw,30px)', color: '#FF4400', fontWeight: 'bold' }}>☠ DEVORADO ☠</div>
              <div style={{ fontSize: 'clamp(11px,2.5vw,13px)', color: '#c2a060', margin: '5px 0' }}>Shai-Hulud reclama la arena</div>
              <div style={{ fontSize: 'clamp(13px,3vw,17px)', color: '#FFD700', marginBottom: 12 }}>Puntuación: {score}</div>
              <button onClick={startGame} className="rbtn" style={{
                padding: '9px 26px', fontSize: 'clamp(12px,2.8vw,15px)',
                background: 'linear-gradient(180deg,#7a1a00,#4a0800)', border: '2px solid #FF4400', borderRadius: 8,
                color: '#FF8C00', cursor: 'pointer', letterSpacing: 2, fontFamily: "'Courier New',monospace", fontWeight: 'bold',
              }}>
                Reintentar
              </button>
            </div>
          )}

          {gameState === 'won' && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(10,5,0,0.9)', borderRadius: 8, animation: 'fadeIn 0.5s ease-out', zIndex: 10,
            }}>
              <div style={{ fontSize: 'clamp(17px,4vw,26px)', color: '#FFD700', fontWeight: 'bold', animation: 'pulse 2s infinite' }}>
                ☀ LISAN AL-GAIB ☀
              </div>
              <div style={{ fontSize: 'clamp(11px,2.5vw,13px)', color: '#c2a060', margin: '5px 0', textAlign: 'center', padding: '0 12px' }}>
                Has conquistado Arrakis y dominado la especia
              </div>
              <div style={{ fontSize: 'clamp(14px,3.5vw,19px)', color: '#ff8c00', marginBottom: 12 }}>Puntuación: {score}</div>
              <button onClick={startGame} className="rbtn" style={{
                padding: '9px 26px', fontSize: 'clamp(12px,2.8vw,15px)',
                background: 'linear-gradient(180deg,#a05a1e,#6b3510)', border: '2px solid #FFD700', borderRadius: 8,
                color: '#FFD700', cursor: 'pointer', letterSpacing: 2, fontFamily: "'Courier New',monospace", fontWeight: 'bold',
                boxShadow: '0 0 22px rgba(255,215,0,0.3)',
              }}>
                Jugar de Nuevo
              </button>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ width: '100%', maxWidth: 290, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
          {/* Code editor */}
          <div style={{ background: 'rgba(13,8,4,0.92)', border: '1px solid rgba(255,215,0,0.12)', borderRadius: 10, padding: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: '#c2a060', letterSpacing: 1, textTransform: 'uppercase' }}>⌨ Terminal Fremen</span>
              {msg && <span style={{ fontSize: 10, color: msg.startsWith('⚠') ? '#ff6644' : '#66cc44' }}>{msg}</span>}
            </div>
            <textarea className="code-area" rows={7} value={code}
              onChange={e => setCode(e.target.value)} disabled={running}
              placeholder={"Escribe comandos:\nderecha\nizquierda\narriba\nabajo\nrepetir(N)\n  ...\nfin"}
              spellCheck={false} />
            {running && cmdIdx >= 0 && cmdIdx < parsedCmds.length && (
              <div style={{ fontSize: 11, color: '#00e5ff', marginTop: 4, padding: '3px 6px', background: 'rgba(0,229,255,0.06)', borderRadius: 4 }}>
                ▶ <b>{parsedCmds[cmdIdx]}</b> ({cmdIdx + 1}/{parsedCmds.length})
              </div>
            )}
            <button onClick={runCode} disabled={running || gameState !== 'playing'} className="rbtn"
              style={{
                width: '100%', marginTop: 7, padding: '8px 0', fontSize: 13,
                background: running ? 'rgba(100,70,30,0.3)' : 'linear-gradient(180deg,#8b5a1e,#5a3510)',
                border: '1.5px solid rgba(255,215,0,0.25)', borderRadius: 8, color: running ? '#8b7355' : '#FFD700',
                cursor: running ? 'not-allowed' : 'pointer', letterSpacing: 1, fontFamily: "'Courier New',monospace",
                fontWeight: 'bold', transition: 'all 0.2s',
              }}>
              {running ? '⏳ Ejecutando...' : '▶ Ejecutar Código'}
            </button>
          </div>

          {/* Reference */}
          <div style={{ background: 'rgba(13,8,4,0.7)', border: '1px solid rgba(255,215,0,0.08)', borderRadius: 10, padding: 9, fontSize: 11, color: '#8b7355', lineHeight: 1.7 }}>
            <div style={{ color: '#c2a060', fontSize: 10, marginBottom: 3, letterSpacing: 1 }}>📖 COMANDOS</div>
            <div><code style={{ color: '#ffcc44' }}>derecha</code> → mover →</div>
            <div><code style={{ color: '#ffcc44' }}>izquierda</code> → mover ←</div>
            <div><code style={{ color: '#ffcc44' }}>arriba</code> → mover ↑</div>
            <div><code style={{ color: '#ffcc44' }}>abajo</code> → mover ↓</div>
            <div style={{ marginTop: 3, borderTop: '1px solid rgba(255,215,0,0.06)', paddingTop: 3 }}>
              <code style={{ color: '#ff8c44' }}>repetir(N)</code><br />
              <code style={{ color: '#ffcc44' }}>&nbsp;&nbsp;comandos...</code><br />
              <code style={{ color: '#ff8c44' }}>fin</code>
            </div>
          </div>

          {/* D-Pad */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ fontSize: 10, color: '#6b5335', letterSpacing: 1, marginBottom: 1, textTransform: 'uppercase' }}>Control Manual</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,46px)', gridTemplateRows: 'repeat(3,46px)', gap: 3 }}>
              <div />
              <button className="gbtn" style={btnS} onPointerDown={e => { e.preventDefault(); movePlayer([0, -1]); }}>↑</button>
              <div />
              <button className="gbtn" style={btnS} onPointerDown={e => { e.preventDefault(); movePlayer([-1, 0]); }}>←</button>
              <div style={{
                width: 46, height: 46, borderRadius: 10, background: 'rgba(255,215,0,0.04)',
                border: '1px solid rgba(255,215,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, color: 'rgba(255,215,0,0.15)',
              }}>◆</div>
              <button className="gbtn" style={btnS} onPointerDown={e => { e.preventDefault(); movePlayer([1, 0]); }}>→</button>
              <div />
              <button className="gbtn" style={btnS} onPointerDown={e => { e.preventDefault(); movePlayer([0, 1]); }}>↓</button>
              <div />
            </div>
          </div>
        </div>
      </div>

      {/* Level flavor */}
      {gameState === 'playing' && (
        <div style={{ marginTop: 6, fontSize: 'clamp(9px,1.8vw,11px)', color: '#5a4025', textAlign: 'center', maxWidth: 550, fontStyle: 'italic' }}>
          "{LEVELS[level].desc}"
        </div>
      )}
    </div>
  );
}
