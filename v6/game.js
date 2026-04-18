// ══════════════════════════════════════════════════════
// ARRAKIS — RUTA DE LA ESPECIA
// ══════════════════════════════════════════════════════
const TILE=44,COLS=20,ROWS=13,W=COLS*TILE,H=ROWS*TILE,SOLUTION_CODE='ITC123';
let canvas,ctx,gameMode='manual',gameRunning=false,gamePaused=false,animFrame=null;
let codeRunning=false,codeQueue=[],codeTimer=null,frameTick=0,currentLevel=1;
let player,spicePickups,worm,playerHidden=false;
let graceTimer=0,graceDuration=90; // ~1.5 sec at 60fps
let winPending=false;

// ══════════════════════════════════════════════════════
// MÚSICA
// ══════════════════════════════════════════════════════
let audioCtx=null,musicPlaying=false,musicNodes=[];
function initAudio(){if(audioCtx)return;audioCtx=new(window.AudioContext||window.webkitAudioContext)()}
function startMusic(){
  if(musicPlaying)return;initAudio();
  if(audioCtx.state==='suspended')audioCtx.resume();
  musicNodes=[];
  const m=audioCtx.createGain();m.gain.value=.16;m.connect(audioCtx.destination);
  function osc(type,freq,gain,filterType,filterFreq,filterQ){
    const o=audioCtx.createOscillator();o.type=type;o.frequency.value=freq;
    const g=audioCtx.createGain();g.gain.value=gain;
    if(filterType){const f=audioCtx.createBiquadFilter();f.type=filterType;f.frequency.value=filterFreq;if(filterQ)f.Q.value=filterQ;o.connect(f);f.connect(g);musicNodes.push({node:o,filter:f});}
    else{o.connect(g);musicNodes.push({node:o});}
    g.connect(m);o.start();return o;
  }
  osc('sawtooth',55,.3,'lowpass',120);
  osc('sine',27.5,.25);
  osc('triangle',82.4,.1,'bandpass',200,2);
  const p1=osc('sine',220,.05);const p2=osc('sine',330,.03);
  const lfo=audioCtx.createOscillator();lfo.type='sine';lfo.frequency.value=.15;
  const lg=audioCtx.createGain();lg.gain.value=12;lfo.connect(lg);lg.connect(p1.frequency);lfo.start();musicNodes.push({node:lfo});
  // Wind
  const buf=audioCtx.createBuffer(1,audioCtx.sampleRate*2,audioCtx.sampleRate);
  const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  const w=audioCtx.createBufferSource();w.buffer=buf;w.loop=true;
  const wf=audioCtx.createBiquadFilter();wf.type='bandpass';wf.frequency.value=500;wf.Q.value=.5;
  const wg=audioCtx.createGain();wg.gain.value=.06;w.connect(wf);wf.connect(wg);wg.connect(m);w.start();
  musicNodes.push({node:w});
  const wl=audioCtx.createOscillator();wl.type='sine';wl.frequency.value=.1;
  const wlg=audioCtx.createGain();wlg.gain.value=250;wl.connect(wlg);wlg.connect(wf.frequency);wl.start();musicNodes.push({node:wl});
  musicPlaying=true;document.getElementById('music-btn').classList.add('active');
}
function stopMusic(){musicNodes.forEach(n=>{try{n.node.stop()}catch(e){}});musicNodes=[];musicPlaying=false;document.getElementById('music-btn').classList.remove('active');}
function toggleMusic(){musicPlaying?stopMusic():startMusic();}

// ══════════════════════════════════════════════════════
// NIVELES — soluciones con sensores
// ══════════════════════════════════════════════════════
const LEVELS={
  1:{name:'El Primer Paso',wormSpeed:30,wormLength:4,wormStart:{x:16,y:10},playerStart:{x:1,y:1},
    spice:[{x:5,y:2},{x:12,y:6},{x:17,y:4}],
    rocks:[{x:4,y:4},{x:4,y:5},{x:9,y:3},{x:9,y:4},{x:14,y:7},{x:14,y:8},{x:7,y:9},{x:7,y:10},{x:17,y:2},{x:11,y:10}],
    speedLabel:'MUY LENTO',
    solution:`// Nivel 1: Recoger 3 especias
// Usar sensor para vigilar al gusano
derecha(4)
abajo(1)
si_gusano_cerca(6):
  esperar(2)
fin
derecha(7)
abajo(3)
si_gusano_cerca(5):
  arriba(2)
  derecha(2)
  abajo(2)
sino:
  derecha(5)
fin
arriba(2)`},
  2:{name:'Arenas Movedizas',wormSpeed:24,wormLength:5,wormStart:{x:10,y:6},playerStart:{x:0,y:0},
    spice:[{x:3,y:3},{x:9,y:1},{x:16,y:5},{x:6,y:10}],
    rocks:[{x:5,y:2},{x:5,y:3},{x:5,y:4},{x:13,y:2},{x:13,y:3},{x:8,y:8},{x:8,y:9},{x:15,y:8},{x:15,y:9},{x:3,y:7},{x:18,y:3},{x:12,y:10},{x:12,y:11}],
    speedLabel:'LENTO',
    solution:`// Nivel 2: Esquivar y recoger
derecha(3)
abajo(3)
si_gusano_cerca(5):
  abajo(2)
  derecha(2)
sino:
  derecha(6)
  arriba(2)
fin
derecha(7)
abajo(4)
si_gusano_cerca(4):
  derecha(2)
  esperar(3)
  izquierda(2)
fin
izquierda(10)
abajo(3)`},
  3:{name:'Territorio del Gusano',wormSpeed:18,wormLength:6,wormStart:{x:10,y:5},playerStart:{x:0,y:12},
    spice:[{x:3,y:1},{x:14,y:2},{x:18,y:8},{x:8,y:11},{x:1,y:6}],
    rocks:[{x:5,y:1},{x:5,y:2},{x:6,y:5},{x:6,y:6},{x:6,y:7},{x:11,y:3},{x:12,y:3},{x:10,y:8},{x:10,y:9},{x:15,y:5},{x:15,y:6},{x:14,y:10},{x:14,y:11},{x:3,y:9},{x:3,y:10},{x:17,y:11},{x:18,y:11}],
    speedLabel:'MODERADO',
    solution:`// Nivel 3: Usar montañas como refugio
derecha(8)
si_gusano_cerca(5):
  abajo(1)
  esperar(3)
  arriba(1)
fin
arriba(1)
izquierda(7)
arriba(5)
derecha(2)
si_gusano_cerca(4):
  derecha(1)
  abajo(1)
  esperar(4)
  arriba(1)
  izquierda(1)
fin
arriba(5)
derecha(11)
abajo(1)
si_gusano_cerca(4):
  derecha(3)
  esperar(3)
  izquierda(3)
fin
abajo(5)
derecha(4)
arriba(4)`},
  4:{name:'Tormenta de Arena',wormSpeed:14,wormLength:7,wormStart:{x:9,y:7},playerStart:{x:0,y:0},
    spice:[{x:4,y:2},{x:12,y:1},{x:18,y:4},{x:15,y:10},{x:7,y:8},{x:1,y:11}],
    rocks:[{x:3,y:4},{x:3,y:5},{x:7,y:2},{x:7,y:3},{x:11,y:5},{x:11,y:6},{x:14,y:3},{x:14,y:4},{x:6,y:6},{x:16,y:7},{x:16,y:8},{x:9,y:10},{x:9,y:11},{x:4,y:9},{x:18,y:9},{x:13,y:11},{x:13,y:12}],
    speedLabel:'RÁPIDO',
    solution:`// Nivel 4: Refugio y sensores
derecha(4)
abajo(2)
si_gusano_cerca(5):
  arriba(1)
  derecha(3)
  esperar(4)
  izquierda(3)
  abajo(1)
fin
derecha(8)
arriba(1)
si_gusano_cerca(4):
  derecha(2)
  esperar(3)
  izquierda(2)
fin
derecha(6)
abajo(3)
izquierda(2)
abajo(6)
si_gusano_cerca(4):
  izquierda(2)
  esperar(3)
  derecha(2)
fin
izquierda(7)
izquierda(7)
abajo(1)`},
  5:{name:'La Prueba Final',wormSpeed:10,wormLength:9,wormStart:{x:10,y:6},playerStart:{x:0,y:6},
    spice:[{x:3,y:1},{x:10,y:0},{x:18,y:2},{x:17,y:10},{x:8,y:11},{x:1,y:10},{x:13,y:6}],
    rocks:[{x:5,y:0},{x:5,y:1},{x:5,y:2},{x:7,y:4},{x:7,y:5},{x:3,y:7},{x:3,y:8},{x:12,y:3},{x:12,y:4},{x:15,y:5},{x:15,y:6},{x:15,y:7},{x:10,y:9},{x:10,y:10},{x:6,y:10},{x:6,y:11},{x:17,y:7},{x:14,y:11},{x:14,y:12},{x:2,y:3}],
    speedLabel:'EXTREMO',
    solution:`// Nivel 5: Supervivencia extrema
// Refugio inmediato
abajo(1)
derecha(3)
abajo(1)
esperar(3)
arriba(2)
izquierda(1)
arriba(5)
derecha(1)
si_gusano_cerca(5):
  esperar(4)
fin
arriba(1)
derecha(5)
arriba(1)
derecha(5)
abajo(8)
si_gusano_cerca(4):
  derecha(2)
  esperar(4)
  izquierda(2)
fin
derecha(4)
abajo(1)
izquierda(9)
abajo(1)
izquierda(7)
abajo(1)
derecha(1)
abajo(1)
izquierda(1)
arriba(1)`}
};

// ─── Texturas ───
let sandGrains=[],duneWaves=[],boneScatter=[];
function genTextures(){
  sandGrains=[];for(let i=0;i<280;i++)sandGrains.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.5+.3,sh:Math.random(),o:Math.random()*.12+.03});
  duneWaves=[];for(let i=0;i<9;i++)duneWaves.push({x:Math.random()*W,y:Math.random()*H,w:Math.random()*200+80,h:Math.random()*14+5,a:Math.random()*.4-.2,s:Math.random()*.06+.02});
  const lvl=LEVELS[currentLevel];boneScatter=[];
  for(let i=0;i<4;i++){let bx,by;do{bx=Math.floor(Math.random()*COLS);by=Math.floor(Math.random()*ROWS)}while(lvl.rocks.some(r=>r.x===bx&&r.y===by)||lvl.spice.some(s=>s.x===bx&&s.y===by));boneScatter.push({x:bx,y:by,rot:Math.random()*Math.PI})}
}

// ══════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════
function init(){canvas=document.getElementById('gameCanvas');ctx=canvas.getContext('2d');canvas.width=W;canvas.height=H}

// ══════════════════════════════════════════════════════
// FLOW
// ══════════════════════════════════════════════════════
function startGame(mode){
  gameMode=mode;currentLevel=1;
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('game-container').classList.add('active');
  if(mode==='code'){document.getElementById('editor-panel').classList.add('active');document.getElementById('mode-label').textContent='PROGRAMAR';document.getElementById('footer-hint').textContent='Escribe comandos → Ejecutar';}
  else{document.getElementById('editor-panel').classList.remove('active');document.getElementById('mode-label').textContent='MANUAL';document.getElementById('footer-hint').textContent='↑↓←→ / Touch · ⛰ Montañas = refugio';}
  startMusic();loadLevel(currentLevel);
}
function backToMenu(){
  gameRunning=false;gamePaused=false;if(animFrame)cancelAnimationFrame(animFrame);stopCode();stopMusic();
  document.getElementById('game-container').classList.remove('active');document.getElementById('editor-panel').classList.remove('active');
  document.getElementById('start-screen').classList.remove('hidden');hideAll();
}
function loadLevel(num){
  const lvl=LEVELS[num];if(!lvl)return;hideAll();stopCode();
  currentLevel=num;winPending=false;
  player={x:lvl.playerStart.x,y:lvl.playerStart.y,spice:0,steps:0,alive:true};
  playerHidden=false;spicePickups=lvl.spice.map(s=>({...s}));
  worm={segments:[],moveTimer:0,moveInterval:lvl.wormSpeed,jawOpen:0,jawDir:1,tremor:0,wanderDir:null,wanderSteps:0,stuckCount:0};
  for(let i=0;i<lvl.wormLength;i++)worm.segments.push({x:lvl.wormStart.x-i,y:lvl.wormStart.y});
  genTextures();
  // Grace period
  graceTimer=graceDuration;
  document.getElementById('header-level-text').textContent=`NIVEL ${num}`;
  document.getElementById('spice-total').textContent=`/ ${lvl.spice.length}`;
  document.getElementById('worm-speed-label').textContent=lvl.speedLabel;
  document.getElementById('editor-status').textContent='LISTO';
  document.getElementById('hide-stat').style.display='none';
  updateStats();
  const ann=document.getElementById('level-announce');
  document.getElementById('announce-level-num').textContent=`NIVEL ${num}`;
  document.getElementById('announce-level-name').textContent=lvl.name;
  ann.classList.add('show');
  gamePaused=false;gameRunning=true;
  if(animFrame)cancelAnimationFrame(animFrame);
  gameLoop();
  setTimeout(()=>ann.classList.remove('show'),1600);
}
function resetLevel(){hideAll();loadLevel(currentLevel)}
function nextLevel(){
  if(currentLevel>=5){showComplete();return}
  hideAll();loadLevel(currentLevel+1);
  document.getElementById('code-editor').value='';
  const c=document.getElementById('console-output');c.innerHTML='';c.classList.remove('active');
}
function showComplete(){
  hideAll();document.getElementById('complete-msg').textContent='¡Felicidades! Has dominado Arrakis. Eres un verdadero Fremen.';
  document.getElementById('complete-overlay').classList.add('show');gameRunning=false;
}
function hideAll(){['death-overlay','win-overlay','complete-overlay','level-announce','pause-overlay','grace-overlay'].forEach(id=>document.getElementById(id).classList.remove('show'))}

// ══════════════════════════════════════════════════════
// PAUSE
// ══════════════════════════════════════════════════════
function togglePause(){
  if(!gameRunning&&!gamePaused)return;
  if(gamePaused){
    gamePaused=false;gameRunning=true;document.getElementById('pause-overlay').classList.remove('show');gameLoop();
  }else{
    gamePaused=true;gameRunning=false;if(animFrame)cancelAnimationFrame(animFrame);
    document.getElementById('pause-overlay').classList.add('show');
  }
}

// ══════════════════════════════════════════════════════
// D-PAD
// ══════════════════════════════════════════════════════
function dpadPress(dx,dy,e){
  e.preventDefault();
  if(gameMode!=='manual'||!gameRunning||!player.alive||graceTimer>0)return;
  movePlayer(dx,dy);
}

// ══════════════════════════════════════════════════════
// GAME LOOP
// ══════════════════════════════════════════════════════
function gameLoop(){
  if(!gameRunning)return;
  frameTick++;

  // Grace period countdown
  if(graceTimer>0){
    graceTimer--;
    const secs=Math.ceil(graceTimer/30);
    const graceOvl=document.getElementById('grace-overlay');
    if(graceTimer>0){
      graceOvl.classList.add('show');
      document.getElementById('grace-text').textContent=secs;
    }else{
      graceOvl.classList.remove('show');
    }
    draw();animFrame=requestAnimationFrame(gameLoop);return;
  }

  // Win pending delay
  if(winPending){draw();animFrame=requestAnimationFrame(gameLoop);return;}

  worm.jawOpen+=.06*worm.jawDir;
  if(worm.jawOpen>1)worm.jawDir=-1;if(worm.jawOpen<0)worm.jawDir=1;
  worm.moveTimer++;
  if(worm.moveTimer>=worm.moveInterval){worm.moveTimer=0;moveWorm();}
  const h=worm.segments[0],dist=Math.sqrt((player.x-h.x)**2+(player.y-h.y)**2);
  worm.tremor=dist<5?(5-dist)/5:0;
  checkHiding();draw();
  animFrame=requestAnimationFrame(gameLoop);
}

// ══════════════════════════════════════════════════════
// HIDING
// ══════════════════════════════════════════════════════
function isOnRock(x,y){return LEVELS[currentLevel].rocks.some(r=>r.x===x&&r.y===y)}
function checkHiding(){
  playerHidden=isOnRock(player.x,player.y);
  document.getElementById('hide-stat').style.display=playerHidden?'flex':'none';
}

// ══════════════════════════════════════════════════════
// WORM AI — chase + wander + anti-stuck
// ══════════════════════════════════════════════════════
function moveWorm(){
  if(!player.alive)return;
  const lvl=LEVELS[currentLevel],head=worm.segments[0];
  const dirs=[{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];

  function isValid(p){
    if(p.x<0||p.x>=COLS||p.y<0||p.y>=ROWS)return false;
    if(lvl.rocks.some(r=>r.x===p.x&&r.y===p.y))return false;
    // Only check first half of body to prevent self-locking
    const checkLen=Math.max(1,worm.segments.length-3);
    for(let i=0;i<checkLen;i++)if(worm.segments[i].x===p.x&&worm.segments[i].y===p.y)return false;
    return true;
  }

  let nx=head.x,ny=head.y,moved=false;

  if(playerHidden){
    // WANDER
    if(worm.wanderSteps<=0){
      worm.wanderDir=dirs[Math.floor(Math.random()*4)];
      worm.wanderSteps=Math.floor(Math.random()*5)+2;
    }
    const t={x:head.x+worm.wanderDir.x,y:head.y+worm.wanderDir.y};
    if(isValid(t)){nx=t.x;ny=t.y;moved=true;}
    else worm.wanderSteps=0;
    worm.wanderSteps--;
  }else{
    // CHASE
    const ddx=player.x-head.x,ddy=player.y-head.y;
    let candidates=[];
    if(Math.abs(ddx)>=Math.abs(ddy)){
      if(ddx!==0)candidates.push({x:head.x+Math.sign(ddx),y:head.y});
      if(ddy!==0)candidates.push({x:head.x,y:head.y+Math.sign(ddy)});
    }else{
      if(ddy!==0)candidates.push({x:head.x,y:head.y+Math.sign(ddy)});
      if(ddx!==0)candidates.push({x:head.x+Math.sign(ddx),y:head.y});
    }
    // Add all other directions as fallback
    for(const d of dirs){
      const p={x:head.x+d.x,y:head.y+d.y};
      if(!candidates.some(c=>c.x===p.x&&c.y===p.y))candidates.push(p);
    }
    for(const c of candidates){
      if(isValid(c)){nx=c.x;ny=c.y;moved=true;break;}
    }
  }

  if(moved){
    worm.stuckCount=0;
    for(let i=worm.segments.length-1;i>0;i--)worm.segments[i]={...worm.segments[i-1]};
    worm.segments[0]={x:nx,y:ny};
  }else{
    // Anti-stuck: if stuck for too long, shrink tail temporarily
    worm.stuckCount++;
    if(worm.stuckCount>3&&worm.segments.length>3){
      worm.segments.pop(); // Remove tail to free up
      worm.stuckCount=0;
    }
    // Regrow tail after a bit
  }

  // Regrow if too short
  const targetLen=LEVELS[currentLevel].wormLength;
  if(worm.segments.length<targetLen&&worm.stuckCount===0&&Math.random()<.1){
    const tail=worm.segments[worm.segments.length-1];
    worm.segments.push({...tail});
  }

  checkWormCollision();
}

function checkWormCollision(){
  if(!player.alive||playerHidden)return;
  for(const seg of worm.segments)if(seg.x===player.x&&seg.y===player.y){playerDeath();return;}
}

// ══════════════════════════════════════════════════════
// PLAYER
// ══════════════════════════════════════════════════════
function movePlayer(dx,dy){
  if(!player.alive||!gameRunning||winPending)return false;
  const nx=player.x+dx,ny=player.y+dy;
  if(nx<0||nx>=COLS||ny<0||ny>=ROWS)return false;
  player.x=nx;player.y=ny;player.steps++;
  const si=spicePickups.findIndex(s=>s.x===nx&&s.y===ny);
  if(si>=0){spicePickups.splice(si,1);player.spice++;}
  updateStats();checkHiding();checkWormCollision();
  // Check win AFTER rendering current frame
  if(spicePickups.length===0&&player.alive){
    winPending=true;
    setTimeout(()=>winLevel(),600); // Delay to show last spice collected
  }
  return true;
}

function playerDeath(){
  player.alive=false;gameRunning=false;if(animFrame)cancelAnimationFrame(animFrame);
  document.getElementById('death-steps').textContent=player.steps;
  document.getElementById('death-spice').textContent=player.spice;
  document.getElementById('game-canvas-wrap').classList.add('shake');
  setTimeout(()=>document.getElementById('game-canvas-wrap').classList.remove('shake'),500);
  setTimeout(()=>document.getElementById('death-overlay').classList.add('show'),400);
}

function winLevel(){
  gameRunning=false;if(animFrame)cancelAnimationFrame(animFrame);stopCode();winPending=false;
  if(currentLevel>=5){setTimeout(()=>showComplete(),400);return;}
  document.getElementById('win-title').textContent=`¡NIVEL ${currentLevel} COMPLETADO!`;
  document.getElementById('win-msg').textContent=`${player.steps} pasos · Especia: ${player.spice}/${LEVELS[currentLevel].spice.length}`;
  document.getElementById('win-overlay').classList.add('show');
}

function updateStats(){
  document.getElementById('spice-count').textContent=player.spice;
  document.getElementById('step-count').textContent=player.steps;
}

// ══════════════════════════════════════════════════════
// KEYBOARD
// ══════════════════════════════════════════════════════
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){togglePause();return;}
  if(gameMode!=='manual'||!gameRunning||!player.alive||graceTimer>0)return;
  let m=false;
  switch(e.key){
    case'ArrowUp':case'w':case'W':m=movePlayer(0,-1);break;
    case'ArrowDown':case's':case'S':m=movePlayer(0,1);break;
    case'ArrowLeft':case'a':case'A':m=movePlayer(-1,0);break;
    case'ArrowRight':case'd':case'D':m=movePlayer(1,0);break;
  }
  if(m)e.preventDefault();
});

// ══════════════════════════════════════════════════════
// PROGRAMMING ENGINE
// ══════════════════════════════════════════════════════
function distToWorm(){const h=worm.segments[0];return Math.abs(player.x-h.x)+Math.abs(player.y-h.y)}
function spiceInDir(dir,maxD){
  const deltas={arriba:{x:0,y:-1},abajo:{x:0,y:1},izquierda:{x:-1,y:0},derecha:{x:1,y:0}};
  const d=deltas[dir];if(!d)return false;
  for(let i=1;i<=maxD;i++){const cx=player.x+d.x*i,cy=player.y+d.y*i;if(cx<0||cx>=COLS||cy<0||cy>=ROWS)break;if(spicePickups.some(s=>s.x===cx&&s.y===cy))return true;}
  return false;
}

function parseCode(src){
  const lines=src.split('\n').map(l=>l.trimEnd());let pos=0;
  function parseBlock(indent){
    const cmds=[];
    while(pos<lines.length){
      const raw=lines[pos],trimmed=raw.trim();
      if(!trimmed||trimmed.startsWith('//')){pos++;continue;}
      const cur=raw.length-raw.trimStart().length;
      if(cur<indent&&trimmed!=='fin'&&trimmed!=='sino:')break;
      if(trimmed==='fin'){pos++;break;}
      if(trimmed==='sino:')break;
      const mv=trimmed.match(/^(arriba|abajo|izquierda|derecha|esperar)\s*\(\s*(\d+)\s*\)$/i);
      if(mv){cmds.push({t:'mv',cmd:mv[1].toLowerCase(),n:parseInt(mv[2])});pos++;continue;}
      const rep=trimmed.match(/^repetir\s*\(\s*(\d+)\s*\)\s*:?$/i);
      if(rep){pos++;const body=parseBlock(cur+1);cmds.push({t:'rep',n:parseInt(rep[1]),body});continue;}
      const wm=trimmed.match(/^si_gusano_cerca\s*\(\s*(\d+)\s*\)\s*:?$/i);
      if(wm){pos++;const th=parseBlock(cur+1);let el=[];if(pos<lines.length&&lines[pos].trim()==='sino:'){pos++;el=parseBlock(cur+1);}cmds.push({t:'ifw',d:parseInt(wm[1]),th,el});continue;}
      const sp=trimmed.match(/^si_especia\s*\(\s*(arriba|abajo|izquierda|derecha)\s*,\s*(\d+)\s*\)\s*:?$/i);
      if(sp){pos++;const th=parseBlock(cur+1);let el=[];if(pos<lines.length&&lines[pos].trim()==='sino:'){pos++;el=parseBlock(cur+1);}cmds.push({t:'ifs',dir:sp[1].toLowerCase(),d:parseInt(sp[2]),th,el});continue;}
      const hd=trimmed.match(/^si_oculto\s*\(\s*\)\s*:?$/i);
      if(hd){pos++;const th=parseBlock(cur+1);let el=[];if(pos<lines.length&&lines[pos].trim()==='sino:'){pos++;el=parseBlock(cur+1);}cmds.push({t:'ifh',th,el});continue;}
      cmds.push({t:'err',line:trimmed});pos++;
    }
    return cmds;
  }
  return parseBlock(0);
}

function flatten(ast){
  const q=[];
  function walk(nodes){for(const n of nodes){
    if(n.t==='err'){q.push(n);return;}
    if(n.t==='mv')for(let i=0;i<n.n;i++)q.push({t:'mv',cmd:n.cmd});
    if(n.t==='rep')for(let i=0;i<n.n;i++)walk(n.body);
    if(n.t==='ifw')q.push(n);
    if(n.t==='ifs')q.push(n);
    if(n.t==='ifh')q.push(n);
  }}
  walk(ast);return q;
}

function runCode(){
  if(codeRunning)return;
  const raw=document.getElementById('code-editor').value.trim();if(!raw)return;
  const con=document.getElementById('console-output');con.classList.add('active');con.innerHTML='';
  const ast=parseCode(raw);
  let errs=[];(function fe(nodes){for(const n of nodes){if(n.t==='err')errs.push(n.line);if(n.th)fe(n.th);if(n.el)fe(n.el);if(n.body)fe(n.body);}})(ast);
  if(errs.length){logC(`✗ Error: "${errs[0]}"`,'error');logC('  Revisa la sintaxis','error');return;}
  codeQueue=flatten(ast);
  if(codeQueue.some(c=>c.t==='err')){logC(`✗ Error: "${codeQueue.find(c=>c.t==='err').line}"`,'error');codeQueue=[];return;}
  logC(`▶ Ejecutando...`,'success');
  document.getElementById('editor-status').textContent='EJECUTANDO';
  codeRunning=true;execNext();
}

function execNext(){
  if(!codeRunning||codeQueue.length===0){
    codeRunning=false;
    if(player.alive&&(gameRunning||winPending)){
      logC('✓ Programa terminado.','success');
      if(spicePickups.length>0)logC(`⚠ Faltan ${spicePickups.length} especias`,'error');
      document.getElementById('editor-status').textContent='COMPLETO';
    }return;
  }
  if(graceTimer>0){codeTimer=setTimeout(execNext,100);return;}
  const i=codeQueue.shift();
  if(i.t==='mv'){
    let ok=true;
    switch(i.cmd){case'arriba':ok=movePlayer(0,-1);break;case'abajo':ok=movePlayer(0,1);break;case'izquierda':ok=movePlayer(-1,0);break;case'derecha':ok=movePlayer(1,0);break;case'esperar':break;}
    if(!ok){logC(`✗ Bloqueado: ${i.cmd}`,'error');codeRunning=false;document.getElementById('editor-status').textContent='BLOQUEADO';return;}
  }
  if(i.t==='ifw'){const d=distToWorm();const br=d<=i.d?i.th:i.el;logC(`  ▸ Gusano a ${d} ${d<=i.d?'→ SÍ':'→ NO'}`,'info');codeQueue=flatten(br).concat(codeQueue);}
  if(i.t==='ifs'){const f=spiceInDir(i.dir,i.d);const br=f?i.th:i.el;logC(`  ▸ Especia ${i.dir}? ${f?'SÍ':'NO'}`,'info');codeQueue=flatten(br).concat(codeQueue);}
  if(i.t==='ifh'){const br=playerHidden?i.th:i.el;logC(`  ▸ ¿Oculto? ${playerHidden?'SÍ':'NO'}`,'info');codeQueue=flatten(br).concat(codeQueue);}
  if(!player.alive||(!gameRunning&&!winPending)){codeRunning=false;document.getElementById('editor-status').textContent='DETENIDO';return;}
  codeTimer=setTimeout(execNext,180);
}

function stopCode(){codeRunning=false;codeQueue=[];if(codeTimer)clearTimeout(codeTimer)}
function logC(msg,type=''){const el=document.getElementById('console-output'),line=document.createElement('div');line.className='log-line '+type;line.textContent=msg;el.appendChild(line);el.scrollTop=el.scrollHeight}

// ══════════════════════════════════════════════════════
// SOLUTION
// ══════════════════════════════════════════════════════
function toggleSolutionInput(){document.getElementById('solution-input-wrap').classList.toggle('show');document.getElementById('solution-error').textContent=''}
function checkSolutionCode(){
  const v=document.getElementById('solution-code').value.trim(),e=document.getElementById('solution-error');
  if(v===SOLUTION_CODE){e.textContent='✓ Correcto';e.className='solution-error correct';document.getElementById('code-editor').value=LEVELS[currentLevel].solution;logC(`✓ Solución nivel ${currentLevel} cargada.`,'success');}
  else{e.textContent='✗ Incorrecto';e.className='solution-error wrong';}
}
function toggleSolutionFromFooter(){if(gameMode==='code')toggleSolutionInput();else document.getElementById('solution-modal').classList.add('show')}
function closeSolutionModal(){document.getElementById('solution-modal').classList.remove('show');document.getElementById('solution-error-modal').textContent='';const r=document.getElementById('solution-reveal-modal');r.style.display='none';r.classList.remove('show')}
function checkSolutionCodeModal(){
  const v=document.getElementById('solution-code-modal').value.trim(),e=document.getElementById('solution-error-modal'),r=document.getElementById('solution-reveal-modal');
  if(v===SOLUTION_CODE){e.textContent='✓ Correcto';e.className='solution-error correct';r.textContent=`Solución Nivel ${currentLevel}:\n\n`+LEVELS[currentLevel].solution;r.classList.add('show');r.style.display='block';}
  else{e.textContent='✗ Incorrecto';e.className='solution-error wrong';r.style.display='none';}
}

// ══════════════════════════════════════════════════════
// DRAW
// ══════════════════════════════════════════════════════
function draw(){
  ctx.clearRect(0,0,W,H);
  drawDesert();drawGrid();drawBones();drawMountains();drawSpicePickups();
  drawWormTrail();drawWorm();if(player.alive)drawPlayer();
  drawHUD();drawTremorEffect();
  if(graceTimer>0)drawGraceShield();
}

function drawDesert(){
  const g=ctx.createRadialGradient(W*.3,H*.2,50,W*.5,H*.5,W*.8);
  g.addColorStop(0,'#dbb856');g.addColorStop(.4,'#c9952a');g.addColorStop(.7,'#b8860b');g.addColorStop(1,'#9a7209');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  for(const d of duneWaves){ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.a);ctx.globalAlpha=d.s;ctx.fillStyle='#8b6914';ctx.beginPath();ctx.ellipse(0,0,d.w,d.h,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  ctx.globalAlpha=1;
  for(const g of sandGrains){ctx.globalAlpha=g.o;ctx.fillStyle=g.sh>.5?'#a07a1a':'#c4a035';ctx.fillRect(g.x,g.y,g.r,g.r);}
  ctx.globalAlpha=1;
  ctx.globalAlpha=.02;ctx.fillStyle='#fff';
  for(let y=0;y<H;y+=28)ctx.fillRect(Math.sin((y+frameTick*.5)*.05)*8,y,W,1);
  ctx.globalAlpha=1;
}
function drawGrid(){ctx.strokeStyle='rgba(0,0,0,.04)';ctx.lineWidth=.5;for(let x=0;x<=W;x+=TILE){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<=H;y+=TILE){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}}
function drawBones(){ctx.globalAlpha=.1;ctx.strokeStyle='#d7ccc8';ctx.lineWidth=2;for(const b of boneScatter){const cx=b.x*TILE+TILE/2,cy=b.y*TILE+TILE/2;ctx.save();ctx.translate(cx,cy);ctx.rotate(b.rot);ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(8,0);ctx.stroke();ctx.beginPath();ctx.arc(-8,0,3,0,Math.PI*2);ctx.arc(8,0,3,0,Math.PI*2);ctx.stroke();ctx.restore();}ctx.globalAlpha=1;}

function drawMountains(){
  const lvl=LEVELS[currentLevel];
  for(const r of lvl.rocks){
    const x=r.x*TILE,y=r.y*TILE,cx=x+TILE/2,cy=y+TILE/2;
    const isPlayerHere=player.x===r.x&&player.y===r.y;

    // Shadow
    ctx.globalAlpha=.2;ctx.fillStyle='#2e1a0a';ctx.beginPath();ctx.ellipse(cx+4,cy+8,20,8,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    // Body
    ctx.fillStyle=isPlayerHere?'#4a5568':'#5d4e3a';
    ctx.beginPath();ctx.moveTo(x-4,y+TILE);ctx.lineTo(x+6,y+12);ctx.lineTo(cx-2,y-2);ctx.lineTo(cx+5,y+5);ctx.lineTo(x+TILE-4,y-4);ctx.lineTo(x+TILE+2,y+10);ctx.lineTo(x+TILE+4,y+TILE);ctx.closePath();ctx.fill();
    // Light face
    ctx.fillStyle=isPlayerHere?'#5a6a7a':'#7d6e5a';
    ctx.beginPath();ctx.moveTo(cx-2,y-2);ctx.lineTo(cx+5,y+5);ctx.lineTo(x+TILE-4,y-4);ctx.lineTo(x+TILE+2,y+10);ctx.lineTo(x+TILE+4,y+TILE);ctx.lineTo(cx+2,y+TILE);ctx.closePath();ctx.fill();
    // Snow peaks
    ctx.fillStyle='#bcaaa4';ctx.globalAlpha=.5;
    ctx.beginPath();ctx.moveTo(cx-2,y-2);ctx.lineTo(cx+2,y+4);ctx.lineTo(cx-6,y+6);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(x+TILE-4,y-4);ctx.lineTo(x+TILE,y+3);ctx.lineTo(x+TILE-8,y+4);ctx.closePath();ctx.fill();
    ctx.globalAlpha=1;
    // Cracks
    ctx.strokeStyle='#4a3c2a';ctx.lineWidth=.6;ctx.globalAlpha=.25;
    ctx.beginPath();ctx.moveTo(cx,y+8);ctx.lineTo(cx-3,y+20);ctx.stroke();
    ctx.globalAlpha=1;
    // Shelter hint when nearby
    if(!isPlayerHere&&Math.abs(player.x-r.x)<=2&&Math.abs(player.y-r.y)<=2){
      ctx.globalAlpha=.25+Math.sin(frameTick*.08)*.12;ctx.fillStyle='#4fc3f7';ctx.font='bold 10px Rajdhani';ctx.textAlign='center';ctx.fillText('⛰',cx,y+TILE+10);ctx.globalAlpha=1;
    }
    // Glow when player is inside
    if(isPlayerHere){
      ctx.globalAlpha=.15+Math.sin(frameTick*.06)*.08;ctx.strokeStyle='#4fc3f7';ctx.lineWidth=2;ctx.setLineDash([4,3]);
      ctx.beginPath();ctx.arc(cx,cy,24,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
    }
  }
}

function drawSpicePickups(){
  for(const s of spicePickups){
    const cx=s.x*TILE+TILE/2,cy=s.y*TILE+TILE/2,pulse=Math.sin(frameTick*.07+s.x)*.3+.7,glow=Math.sin(frameTick*.05+s.y)*4+16;
    ctx.globalAlpha=.15*pulse;const gg=ctx.createRadialGradient(cx,cy,2,cx,cy,glow);gg.addColorStop(0,'#ff9f43');gg.addColorStop(1,'transparent');ctx.fillStyle=gg;ctx.fillRect(cx-glow,cy-glow,glow*2,glow*2);
    ctx.globalAlpha=.9;ctx.fillStyle='#ff6b1a';ctx.beginPath();ctx.moveTo(cx,cy-10);ctx.lineTo(cx+8,cy);ctx.lineTo(cx,cy+10);ctx.lineTo(cx-8,cy);ctx.closePath();ctx.fill();
    ctx.fillStyle='#ffcc02';ctx.beginPath();ctx.moveTo(cx,cy-6);ctx.lineTo(cx+5,cy);ctx.lineTo(cx,cy+6);ctx.lineTo(cx-5,cy);ctx.closePath();ctx.fill();
    ctx.fillStyle='#fff';ctx.globalAlpha=pulse*.6;ctx.beginPath();ctx.arc(cx-2,cy-3,1.5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  }
}

function drawWormTrail(){ctx.globalAlpha=.06;ctx.fillStyle='#3e2723';for(const s of worm.segments){ctx.beginPath();ctx.ellipse(s.x*TILE+TILE/2+3,s.y*TILE+TILE/2+4,17,8,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}

function drawWorm(){
  const segs=worm.segments;
  for(let i=segs.length-1;i>=0;i--){
    const s=segs[i],cx=s.x*TILE+TILE/2,cy=s.y*TILE+TILE/2,wb=Math.sin(frameTick*.08+i*.8)*2.5,t=i/(segs.length-1),r=19-t*9;
    if(i===0){
      const j=worm.jawOpen*.35;
      ctx.fillStyle='#4e342e';ctx.beginPath();ctx.arc(cx+wb,cy,r+2,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#5d4037';ctx.beginPath();ctx.arc(cx+wb,cy,r,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#4e342e';ctx.beginPath();ctx.arc(cx+wb,cy-j*12,r-2,Math.PI+.3,-.3);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.arc(cx+wb,cy+j*12,r-2,.3,Math.PI-.3);ctx.closePath();ctx.fill();
      if(worm.jawOpen>.2){ctx.fillStyle='#b71c1c';ctx.globalAlpha=worm.jawOpen;ctx.beginPath();ctx.ellipse(cx+wb,cy,r-5,j*10,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
      ctx.fillStyle='#ffecb3';
      for(let t=0;t<6;t++){const a=(t/6)*Math.PI-Math.PI/2,tx=cx+wb+Math.cos(a)*(r-4),ty=cy-j*10+Math.sin(a)*4;ctx.beginPath();ctx.moveTo(tx-2,ty);ctx.lineTo(tx,ty+5+j*3);ctx.lineTo(tx+2,ty);ctx.closePath();ctx.fill();}
      for(let t=0;t<6;t++){const a=(t/6)*Math.PI+Math.PI/2,tx=cx+wb+Math.cos(a)*(r-4),ty=cy+j*10+Math.sin(a)*4;ctx.beginPath();ctx.moveTo(tx-2,ty);ctx.lineTo(tx,ty-5-j*3);ctx.lineTo(tx+2,ty);ctx.closePath();ctx.fill();}
      const eg=Math.sin(frameTick*.1)*.3+.7;
      ctx.globalAlpha=.4*eg;ctx.fillStyle='#ff1744';ctx.beginPath();ctx.arc(cx+wb-7,cy-8,7,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(cx+wb+7,cy-8,7,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
      ctx.fillStyle='#ff1744';ctx.beginPath();ctx.arc(cx+wb-7,cy-8,4.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#b71c1c';ctx.beginPath();ctx.arc(cx+wb-7,cy-8,2.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffcdd2';ctx.beginPath();ctx.arc(cx+wb-8,cy-9.5,1.2,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#ff1744';ctx.beginPath();ctx.arc(cx+wb+7,cy-8,4.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#b71c1c';ctx.beginPath();ctx.arc(cx+wb+7,cy-8,2.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffcdd2';ctx.beginPath();ctx.arc(cx+wb+6,cy-9.5,1.2,0,Math.PI*2);ctx.fill();
    }else{
      ctx.fillStyle=t<.5?'#6d4c41':'#8d6e63';ctx.beginPath();ctx.arc(cx+wb,cy,r,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=t<.5?'#795548':'#a1887f';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(cx+wb,cy,r-3,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=.15;ctx.strokeStyle='#4e342e';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(cx+wb-r+4,cy);ctx.lineTo(cx+wb+r-4,cy);ctx.stroke();ctx.globalAlpha=1;
    }
  }
}

function drawPlayer(){
  const cx=player.x*TILE+TILE/2,cy=player.y*TILE+TILE/2,bob=Math.sin(frameTick*.1)*1.5;
  ctx.globalAlpha=playerHidden?.08:.18;ctx.fillStyle='#1a0e00';ctx.beginPath();ctx.ellipse(cx,cy+18,12,5,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=playerHidden?.5:1;
  ctx.fillStyle='#1a237e';ctx.beginPath();ctx.moveTo(cx-14,cy+17+bob);ctx.quadraticCurveTo(cx,cy-2+bob,cx+14,cy+17+bob);ctx.lineTo(cx+10,cy+17+bob);ctx.quadraticCurveTo(cx,cy+4+bob,cx-10,cy+17+bob);ctx.closePath();ctx.fill();
  ctx.fillStyle='#283593';ctx.beginPath();ctx.arc(cx,cy+4+bob,10,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#3949ab';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx,cy-5+bob);ctx.lineTo(cx,cy+12+bob);ctx.stroke();
  ctx.fillStyle='#bcaaa4';ctx.beginPath();ctx.arc(cx,cy-8+bob,8,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#1a237e';ctx.beginPath();ctx.arc(cx,cy-8+bob,8,Math.PI+.4,-.4);ctx.closePath();ctx.fill();
  ctx.globalAlpha=playerHidden?.25:.35;ctx.fillStyle='#4fc3f7';ctx.beginPath();ctx.arc(cx-3,cy-9+bob,4,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(cx+3,cy-9+bob,4,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=playerHidden?.5:1;
  ctx.fillStyle='#4fc3f7';ctx.beginPath();ctx.arc(cx-3,cy-9+bob,2.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(cx+3,cy-9+bob,2.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#01579b';ctx.beginPath();ctx.arc(cx-3,cy-9+bob,1,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(cx+3,cy-9+bob,1,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#e1f5fe';ctx.beginPath();ctx.arc(cx-4,cy-10+bob,.8,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(cx+2,cy-10+bob,.8,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;
}

function drawHUD(){
  const rem=spicePickups.length;
  ctx.globalAlpha=.7;ctx.fillStyle='#1a0e00';ctx.fillRect(W/2-90,6,180,22);ctx.globalAlpha=1;
  ctx.font='bold 12px Rajdhani';ctx.textAlign='center';
  if(rem>0){ctx.fillStyle=rem<=1?'#00e676':'#ff9f43';ctx.fillText(`◆ ${rem} especia${rem>1?'s':''} restante${rem>1?'s':''}`,W/2,21);}
  else{ctx.fillStyle='#00e676';ctx.fillText('✓ ¡Toda la especia recogida!',W/2,21);}
  if(playerHidden){ctx.globalAlpha=.8;ctx.fillStyle='#0d47a1';ctx.fillRect(W/2-55,30,110,18);ctx.globalAlpha=1;ctx.fillStyle='#4fc3f7';ctx.font='bold 10px Rajdhani';ctx.fillText('⛰ OCULTO EN MONTAÑA',W/2,43);}
}

function drawTremorEffect(){
  if(worm.tremor<=0||playerHidden){canvas.style.transform='';return;}
  ctx.globalAlpha=worm.tremor*.07;ctx.fillStyle='#ff1744';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
  if(worm.tremor>.5)canvas.style.transform=`translate(${(Math.random()-.5)*worm.tremor*3}px,${(Math.random()-.5)*worm.tremor*3}px)`;
  else canvas.style.transform='';
}

function drawGraceShield(){
  // Shield bubble around player during grace
  const cx=player.x*TILE+TILE/2,cy=player.y*TILE+TILE/2;
  const pulse=Math.sin(frameTick*.15)*.15+.25;
  ctx.globalAlpha=pulse;ctx.strokeStyle='#4fc3f7';ctx.lineWidth=2;ctx.setLineDash([6,4]);
  ctx.beginPath();ctx.arc(cx,cy+2,26,0,Math.PI*2);ctx.stroke();
  ctx.setLineDash([]);ctx.globalAlpha=1;
}

// ══════════════════════════════════════════════════════
init();
