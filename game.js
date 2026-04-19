// ══════════════════════════════════════════════════════
// ARRAKIS — 10 NIVELES · MULTI-GUSANO
// ══════════════════════════════════════════════════════
const TILE=40,COLS=20,ROWS=14,W=COLS*TILE,H=ROWS*TILE;
let cv,cx,running=false,paused=false,af=null,ft=0,lvl=1;
let pl,spice,worms=[],hidden=false,grace=0,GRACE=90,winning=false;

function e(ev){ev.preventDefault()}
function resize(){
  if(!cv)return;const w=document.getElementById('canvas-wrap');
  if(!w)return;const s=Math.min(w.clientWidth/W,w.clientHeight/H,2);
  cv.style.width=Math.floor(W*s)+'px';cv.style.height=Math.floor(H*s)+'px';
}
window.addEventListener('resize',resize);

// ═══ MUSIC ═══
let ac=null,mp=false,mn=[];
function startMusic(){
  if(mp)return;if(!ac)ac=new(window.AudioContext||window.webkitAudioContext)();
  if(ac.state==='suspended')ac.resume();mn=[];
  const m=ac.createGain();m.gain.value=.14;m.connect(ac.destination);
  function o(t,f,g,ft,ff){const os=ac.createOscillator();os.type=t;os.frequency.value=f;const gn=ac.createGain();gn.gain.value=g;if(ft){const fl=ac.createBiquadFilter();fl.type=ft;fl.frequency.value=ff;os.connect(fl);fl.connect(gn)}else os.connect(gn);gn.connect(m);os.start();mn.push(os);return os}
  o('sawtooth',55,.28,'lowpass',120);o('sine',27.5,.22);o('triangle',82,.08,'bandpass',200);
  const p=o('sine',220,.04);o('sine',330,.025);
  const lf=ac.createOscillator();lf.type='sine';lf.frequency.value=.14;const lg=ac.createGain();lg.gain.value=10;lf.connect(lg);lg.connect(p.frequency);lf.start();mn.push(lf);
  const buf=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  const ws=ac.createBufferSource();ws.buffer=buf;ws.loop=true;const wf=ac.createBiquadFilter();wf.type='bandpass';wf.frequency.value=500;wf.Q.value=.5;const wg=ac.createGain();wg.gain.value=.055;ws.connect(wf);wf.connect(wg);wg.connect(m);ws.start();mn.push(ws);
  mp=true;document.getElementById('music-btn').classList.add('active');
}
function stopMusic(){mn.forEach(n=>{try{n.stop()}catch(e){}});mn=[];mp=false;document.getElementById('music-btn').classList.remove('active')}
function toggleMusic(){mp?stopMusic():startMusic()}

// ══════════════════════════════════════════════════════
// 10 NIVELES — dificultad progresiva
// worms: array de {x,y} posiciones iniciales de cada gusano
// ══════════════════════════════════════════════════════
const LV={
  1:{name:'El Primer Paso',ws:30,wl:4,pp:{x:1,y:1},
    worms:[{x:16,y:11}],
    sp:[{x:6,y:3},{x:13,y:7},{x:17,y:4}],
    rk:[{x:4,y:4},{x:4,y:5},{x:9,y:3},{x:9,y:4},{x:14,y:8},{x:14,y:9},{x:7,y:10},{x:7,y:11},{x:17,y:2},{x:11,y:11}],
    tag:'1 gusano · Muy lento'},
  2:{name:'Arenas Movedizas',ws:26,wl:5,pp:{x:0,y:0},
    worms:[{x:12,y:8}],
    sp:[{x:3,y:3},{x:9,y:1},{x:16,y:5},{x:7,y:11}],
    rk:[{x:5,y:2},{x:5,y:3},{x:5,y:4},{x:13,y:2},{x:13,y:3},{x:8,y:9},{x:8,y:10},{x:15,y:9},{x:15,y:10},{x:3,y:7},{x:18,y:3},{x:12,y:11}],
    tag:'1 gusano · Lento'},
  3:{name:'Territorio Hostil',ws:22,wl:5,pp:{x:0,y:13},
    worms:[{x:10,y:6}],
    sp:[{x:3,y:1},{x:14,y:2},{x:18,y:9},{x:8,y:12},{x:1,y:6}],
    rk:[{x:5,y:1},{x:5,y:2},{x:6,y:5},{x:6,y:6},{x:6,y:7},{x:11,y:3},{x:12,y:3},{x:10,y:9},{x:10,y:10},{x:15,y:5},{x:15,y:6},{x:3,y:10},{x:3,y:11},{x:17,y:12},{x:18,y:12}],
    tag:'1 gusano · Moderado'},
  4:{name:'La Emboscada',ws:20,wl:5,pp:{x:0,y:0},
    worms:[{x:14,y:10}],
    sp:[{x:4,y:2},{x:12,y:1},{x:18,y:5},{x:15,y:11},{x:7,y:9},{x:1,y:12}],
    rk:[{x:3,y:4},{x:3,y:5},{x:7,y:2},{x:7,y:3},{x:11,y:5},{x:11,y:6},{x:14,y:3},{x:14,y:4},{x:6,y:7},{x:16,y:8},{x:16,y:9},{x:9,y:11},{x:9,y:12},{x:4,y:10},{x:18,y:10}],
    tag:'1 gusano · Rápido'},
  5:{name:'Cacería Doble',ws:22,wl:5,pp:{x:0,y:7},
    worms:[{x:14,y:3},{x:14,y:11}],
    sp:[{x:3,y:1},{x:10,y:0},{x:18,y:6},{x:17,y:12},{x:8,y:13},{x:1,y:11}],
    rk:[{x:5,y:0},{x:5,y:1},{x:7,y:4},{x:7,y:5},{x:3,y:9},{x:3,y:10},{x:12,y:3},{x:12,y:4},{x:15,y:6},{x:15,y:7},{x:10,y:10},{x:10,y:11},{x:6,y:12},{x:17,y:8}],
    tag:'2 gusanos · Moderado'},
  6:{name:'Pinza Mortal',ws:18,wl:6,pp:{x:10,y:0},
    worms:[{x:3,y:10},{x:17,y:10}],
    sp:[{x:2,y:2},{x:8,y:5},{x:15,y:3},{x:18,y:8},{x:5,y:12},{x:12,y:11}],
    rk:[{x:6,y:2},{x:6,y:3},{x:13,y:2},{x:13,y:3},{x:4,y:7},{x:4,y:8},{x:9,y:7},{x:9,y:8},{x:15,y:7},{x:15,y:8},{x:10,y:12},{x:10,y:13},{x:1,y:5}],
    tag:'2 gusanos · Rápido'},
  7:{name:'Tormenta de Arena',ws:16,wl:6,pp:{x:0,y:0},
    worms:[{x:10,y:5},{x:16,y:12}],
    sp:[{x:4,y:1},{x:14,y:2},{x:18,y:7},{x:12,y:12},{x:6,y:10},{x:1,y:7},{x:9,y:9}],
    rk:[{x:3,y:3},{x:3,y:4},{x:7,y:2},{x:12,y:4},{x:12,y:5},{x:16,y:4},{x:16,y:5},{x:8,y:7},{x:8,y:8},{x:14,y:9},{x:14,y:10},{x:5,y:11},{x:5,y:12},{x:18,y:11}],
    tag:'2 gusanos · Muy rápido'},
  8:{name:'Trinidad del Terror',ws:18,wl:5,pp:{x:10,y:7},
    worms:[{x:2,y:2},{x:18,y:2},{x:10,y:13}],
    sp:[{x:4,y:0},{x:16,y:0},{x:19,y:7},{x:15,y:12},{x:5,y:12},{x:0,y:7},{x:10,y:3}],
    rk:[{x:7,y:3},{x:7,y:4},{x:13,y:3},{x:13,y:4},{x:4,y:6},{x:4,y:7},{x:16,y:6},{x:16,y:7},{x:8,y:10},{x:8,y:11},{x:12,y:10},{x:12,y:11},{x:10,y:5},{x:10,y:9},{x:2,y:10},{x:17,y:10}],
    tag:'3 gusanos · Moderado'},
  9:{name:'Cerco de Fuego',ws:14,wl:6,pp:{x:10,y:7},
    worms:[{x:3,y:1},{x:17,y:1},{x:17,y:13}],
    sp:[{x:1,y:1},{x:19,y:0},{x:18,y:10},{x:10,y:13},{x:2,y:11},{x:10,y:0},{x:6,y:6},{x:14,y:6}],
    rk:[{x:5,y:3},{x:5,y:4},{x:15,y:3},{x:15,y:4},{x:3,y:7},{x:3,y:8},{x:17,y:7},{x:17,y:8},{x:8,y:5},{x:12,y:5},{x:8,y:9},{x:12,y:9},{x:7,y:12},{x:13,y:12},{x:10,y:3},{x:10,y:11}],
    tag:'3 gusanos · Rápido'},
  10:{name:'La Prueba Final',ws:12,wl:7,pp:{x:10,y:7},
    worms:[{x:2,y:1},{x:18,y:1},{x:18,y:13}],
    sp:[{x:0,y:0},{x:19,y:0},{x:19,y:13},{x:0,y:13},{x:10,y:0},{x:10,y:13},{x:5,y:5},{x:15,y:9},{x:3,y:10}],
    rk:[{x:5,y:2},{x:5,y:3},{x:15,y:2},{x:15,y:3},{x:5,y:11},{x:5,y:12},{x:15,y:11},{x:15,y:12},{x:8,y:5},{x:12,y:5},{x:8,y:9},{x:12,y:9},{x:3,y:6},{x:3,y:7},{x:17,y:6},{x:17,y:7},{x:10,y:3},{x:10,y:11},{x:7,y:7},{x:13,y:7}],
    tag:'3 gusanos · Extremo'}
};

// ─── Textures ───
let sg=[],dw=[],bones=[];
function genTex(){
  sg=[];for(let i=0;i<350;i++)sg.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.8+.3,s:Math.random(),o:Math.random()*.13+.03});
  dw=[];for(let i=0;i<12;i++)dw.push({x:Math.random()*W,y:Math.random()*H,w:Math.random()*220+60,h:Math.random()*16+4,a:Math.random()*.5-.25,s:Math.random()*.07+.02});
  const l=LV[lvl];bones=[];
  for(let i=0;i<5;i++){let bx,by;do{bx=Math.floor(Math.random()*COLS);by=Math.floor(Math.random()*ROWS)}while(l.rk.some(r=>r.x===bx&&r.y===by)||l.sp.some(s=>s.x===bx&&s.y===by));bones.push({x:bx,y:by,r:Math.random()*Math.PI,t:Math.random()})}
}

// ═══ LEVEL SELECTOR ═══
function buildLevelSelect(){
  const g=document.getElementById('ls-grid');g.innerHTML='';
  for(let i=1;i<=10;i++){
    const l=LV[i],c=document.createElement('div');c.className='ls-card';
    c.innerHTML=`<div class="ls-num">${i}</div><div class="ls-worms">🪱×${l.worms.length}</div><div class="ls-spice">◆${l.sp.length}</div>`;
    c.onclick=()=>{closeLevelSelect();lvl=i;startFromLevel()};
    g.appendChild(c);
  }
}
function selectLevel(){buildLevelSelect();document.getElementById('level-select').classList.add('on')}
function closeLevelSelect(){document.getElementById('level-select').classList.remove('on')}

// ═══ INIT ═══
function init(){cv=document.getElementById('c');cx=cv.getContext('2d');cv.width=W;cv.height=H;resize()}

// ═══ FLOW ═══
function startGame(){lvl=1;startFromLevel()}
function startFromLevel(){
  document.getElementById('start-screen').classList.add('hide');
  document.getElementById('game').classList.add('on');
  closeLevelSelect();
  startMusic();loadLvl(lvl);setTimeout(resize,80);
}
function backToMenu(){
  running=false;paused=false;if(af)cancelAnimationFrame(af);stopMusic();
  document.getElementById('game').classList.remove('on');
  document.getElementById('start-screen').classList.remove('hide');hideOv();
}

function loadLvl(n){
  const l=LV[n];if(!l)return;hideOv();lvl=n;winning=false;
  pl={x:l.pp.x,y:l.pp.y,sp:0,st:0,alive:true};hidden=false;
  spice=l.sp.map(s=>({...s}));

  // Crear gusanos
  worms=l.worms.map(w=>{
    const seg=[];for(let i=0;i<l.wl;i++)seg.push({x:w.x-i,y:w.y});
    return{seg,mt:0,mi:l.ws,jo:0,jd:1,wd:null,ws:0,sc:0,hue:0};
  });
  // Colores únicos por gusano
  const hues=['#5d4037','#4e342e','#3e2723'];
  worms.forEach((w,i)=>w.hue=i);

  genTex();grace=GRACE;
  document.getElementById('hud-lvl').textContent=`N${n}`;
  document.getElementById('hud-spice').textContent=`◆ 0/${l.sp.length}`;
  document.getElementById('hud-worm').textContent=`☠×${l.worms.length}`;
  document.getElementById('hud-steps').textContent='↦ 0';
  document.getElementById('hud-hidden').style.display='none';
  document.getElementById('ann-lvl').textContent=`NIVEL ${n}`;
  document.getElementById('ann-name').textContent=l.name;
  document.getElementById('ann-info').textContent=l.tag;
  showOv('ov-lvl');
  paused=false;running=true;if(af)cancelAnimationFrame(af);loop();
  setTimeout(()=>document.getElementById('ov-lvl').classList.remove('on'),1600);
  setTimeout(resize,100);
}
function resetLevel(){hideOv();loadLvl(lvl)}
function nextLevel(){if(lvl>=10){showEnd();return}hideOv();loadLvl(lvl+1)}
function showEnd(){hideOv();showOv('ov-end');running=false}
function showOv(id){document.getElementById(id).classList.add('on')}
function hideOv(){['ov-death','ov-win','ov-end','ov-lvl','ov-pause','ov-grace','level-select'].forEach(i=>document.getElementById(i).classList.remove('on'))}

function togglePause(){
  if(!running&&!paused)return;
  if(paused){paused=false;running=true;document.getElementById('ov-pause').classList.remove('on');loop()}
  else{paused=true;running=false;if(af)cancelAnimationFrame(af);showOv('ov-pause')}
}

// ═══ D-PAD ═══
function dp(dx,dy,ev){ev.preventDefault();if(!running||!pl.alive||grace>0)return;movePl(dx,dy)}

// ═══ LOOP ═══
function loop(){
  if(!running)return;ft++;
  if(grace>0){grace--;const s=Math.ceil(grace/30);const g=document.getElementById('ov-grace');if(grace>0){g.classList.add('on');document.getElementById('grace-num').textContent=s}else g.classList.remove('on');draw();af=requestAnimationFrame(loop);return}
  if(winning){draw();af=requestAnimationFrame(loop);return}

  // Update all worms
  for(const w of worms){
    w.jo+=.06*w.jd;if(w.jo>1)w.jd=-1;if(w.jo<0)w.jd=1;
    w.mt++;if(w.mt>=w.mi){w.mt=0;moveWm(w)}
  }

  // Tremor from nearest worm
  let minD=999;for(const w of worms){const h=w.seg[0],d=Math.sqrt((pl.x-h.x)**2+(pl.y-h.y)**2);if(d<minD)minD=d}
  hidden=LV[lvl].rk.some(r=>r.x===pl.x&&r.y===pl.y);
  document.getElementById('hud-hidden').style.display=hidden?'inline':'none';
  draw();af=requestAnimationFrame(loop);
}

// ═══ WORM AI ═══
function moveWm(w){
  if(!pl.alive)return;const l=LV[lvl],h=w.seg[0];
  const dirs=[{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
  function ok(p){
    if(p.x<0||p.x>=COLS||p.y<0||p.y>=ROWS)return false;
    if(l.rk.some(r=>r.x===p.x&&r.y===p.y))return false;
    const cl=Math.max(1,w.seg.length-3);
    for(let i=0;i<cl;i++)if(w.seg[i].x===p.x&&w.seg[i].y===p.y)return false;
    // Don't collide with other worms' heads
    for(const ow of worms){if(ow===w)continue;if(ow.seg[0].x===p.x&&ow.seg[0].y===p.y)return false}
    return true;
  }
  let nx=h.x,ny=h.y,mv=false;
  if(hidden){
    if(w.ws<=0){w.wd=dirs[Math.floor(Math.random()*4)];w.ws=Math.floor(Math.random()*5)+2}
    const t={x:h.x+w.wd.x,y:h.y+w.wd.y};if(ok(t)){nx=t.x;ny=t.y;mv=true}else w.ws=0;w.ws--;
  }else{
    const dx=pl.x-h.x,dy=pl.y-h.y;let cs=[];
    if(Math.abs(dx)>=Math.abs(dy)){if(dx)cs.push({x:h.x+Math.sign(dx),y:h.y});if(dy)cs.push({x:h.x,y:h.y+Math.sign(dy)})}
    else{if(dy)cs.push({x:h.x,y:h.y+Math.sign(dy)});if(dx)cs.push({x:h.x+Math.sign(dx),y:h.y})}
    for(const d of dirs){const p={x:h.x+d.x,y:h.y+d.y};if(!cs.some(c=>c.x===p.x&&c.y===p.y))cs.push(p)}
    for(const c of cs)if(ok(c)){nx=c.x;ny=c.y;mv=true;break}
  }
  if(mv){w.sc=0;for(let i=w.seg.length-1;i>0;i--)w.seg[i]={...w.seg[i-1]};w.seg[0]={x:nx,y:ny}}
  else{w.sc++;if(w.sc>3&&w.seg.length>3){w.seg.pop();w.sc=0}}
  if(w.seg.length<LV[lvl].wl&&w.sc===0&&Math.random()<.08)w.seg.push({...w.seg[w.seg.length-1]});
  // Collision check
  if(!hidden&&pl.alive)for(const s of w.seg)if(s.x===pl.x&&s.y===pl.y){die();return}
}

// ═══ PLAYER ═══
function movePl(dx,dy){
  if(!pl.alive||!running||winning)return false;
  const nx=pl.x+dx,ny=pl.y+dy;if(nx<0||nx>=COLS||ny<0||ny>=ROWS)return false;
  pl.x=nx;pl.y=ny;pl.st++;
  const si=spice.findIndex(s=>s.x===nx&&s.y===ny);if(si>=0){spice.splice(si,1);pl.sp++}
  updHUD();hidden=LV[lvl].rk.some(r=>r.x===pl.x&&r.y===pl.y);
  if(!hidden)for(const w of worms)for(const s of w.seg)if(s.x===pl.x&&s.y===pl.y){die();return true}
  if(spice.length===0&&pl.alive){winning=true;setTimeout(()=>winLvl(),600)}
  return true;
}
function die(){
  pl.alive=false;running=false;if(af)cancelAnimationFrame(af);
  document.getElementById('d-steps').textContent=pl.st;document.getElementById('d-spice').textContent=pl.sp;
  document.getElementById('canvas-wrap').classList.add('shake');
  setTimeout(()=>document.getElementById('canvas-wrap').classList.remove('shake'),400);
  setTimeout(()=>showOv('ov-death'),350);
}
function winLvl(){
  running=false;if(af)cancelAnimationFrame(af);winning=false;
  if(lvl>=10){setTimeout(showEnd,400);return}
  document.getElementById('win-t').textContent=`¡NIVEL ${lvl} COMPLETADO!`;
  document.getElementById('win-m').textContent=`${pl.st} pasos · ◆ ${pl.sp}/${LV[lvl].sp.length}`;
  const nxt=LV[lvl+1];
  document.getElementById('win-warn').textContent=nxt?`Siguiente: ${nxt.tag}`:'';
  showOv('ov-win');
}
function updHUD(){
  document.getElementById('hud-spice').textContent=`◆ ${pl.sp}/${LV[lvl].sp.length}`;
  document.getElementById('hud-steps').textContent=`↦ ${pl.st}`;
}

// ═══ KEYBOARD ═══
document.addEventListener('keydown',ev=>{
  if(ev.key==='Escape'){togglePause();return}
  if(!running||!pl.alive||grace>0)return;
  let m=false;
  switch(ev.key){case'ArrowUp':case'w':case'W':m=movePl(0,-1);break;case'ArrowDown':case's':case'S':m=movePl(0,1);break;case'ArrowLeft':case'a':case'A':m=movePl(-1,0);break;case'ArrowRight':case'd':case'D':m=movePl(1,0);break}
  if(m)ev.preventDefault();
});

// ══════════════════════════════════════════════════════
// RENDERING
// ══════════════════════════════════════════════════════
function draw(){cx.clearRect(0,0,W,H);drDesert();drGrid();drBones();drMtns();drSpice();for(const w of worms)drWmTrail(w);for(const w of worms)drWm(w);if(pl.alive)drPl();drHud();drTremor();if(grace>0)drShield()}

function drDesert(){
  const g=cx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#dbb856');g.addColorStop(.3,'#c9952a');g.addColorStop(.65,'#b8860b');g.addColorStop(1,'#9a7209');cx.fillStyle=g;cx.fillRect(0,0,W,H);
  for(const d of dw){cx.save();cx.translate(d.x,d.y);cx.rotate(d.a);cx.globalAlpha=d.s;cx.fillStyle='#8b6914';cx.beginPath();cx.ellipse(0,0,d.w,d.h,0,0,Math.PI*2);cx.fill();cx.restore()}cx.globalAlpha=1;
  for(const g of sg){cx.globalAlpha=g.o;cx.fillStyle=g.s>.5?'#a07a1a':'#c4a035';cx.fillRect(g.x,g.y,g.r,g.r)}cx.globalAlpha=1;
  cx.globalAlpha=.02;cx.fillStyle='#fff';for(let y=0;y<H;y+=24)cx.fillRect(Math.sin((y+ft*.4)*.05)*6,y,W,1);cx.globalAlpha=1;
}
function drGrid(){cx.strokeStyle='rgba(0,0,0,.035)';cx.lineWidth=.5;for(let x=0;x<=W;x+=TILE){cx.beginPath();cx.moveTo(x,0);cx.lineTo(x,H);cx.stroke()}for(let y=0;y<=H;y+=TILE){cx.beginPath();cx.moveTo(0,y);cx.lineTo(W,y);cx.stroke()}}
function drBones(){cx.globalAlpha=.07;for(const b of bones){const x=b.x*TILE+TILE/2,y=b.y*TILE+TILE/2;cx.save();cx.translate(x,y);cx.rotate(b.r);cx.strokeStyle=b.t>.5?'#d7ccc8':'#a1887f';cx.lineWidth=1.5;cx.beginPath();cx.moveTo(-7,0);cx.lineTo(7,0);cx.stroke();cx.beginPath();cx.arc(-7,0,2.5,0,Math.PI*2);cx.arc(7,0,2.5,0,Math.PI*2);cx.stroke();cx.restore()}cx.globalAlpha=1}

function drMtns(){
  const l=LV[lvl];for(const r of l.rk){
    const x=r.x*TILE,y=r.y*TILE,mx=x+TILE/2,my=y+TILE/2,here=pl.x===r.x&&pl.y===r.y;
    cx.globalAlpha=.2;cx.fillStyle='#1a0a00';cx.beginPath();cx.ellipse(mx+3,my+7,18,7,0,0,Math.PI*2);cx.fill();cx.globalAlpha=1;
    cx.fillStyle=here?'#3d4f60':'#4a3c2a';cx.beginPath();cx.moveTo(x-3,y+TILE);cx.lineTo(x+5,y+10);cx.lineTo(mx-1,y-3);cx.lineTo(mx+4,y+4);cx.lineTo(x+TILE-3,y-5);cx.lineTo(x+TILE+3,y+9);cx.lineTo(x+TILE+3,y+TILE);cx.closePath();cx.fill();
    cx.fillStyle=here?'#506878':'#6d5a3a';cx.beginPath();cx.moveTo(mx-1,y-3);cx.lineTo(mx+4,y+4);cx.lineTo(x+TILE-3,y-5);cx.lineTo(x+TILE+3,y+9);cx.lineTo(x+TILE+3,y+TILE);cx.lineTo(mx,y+TILE);cx.closePath();cx.fill();
    cx.fillStyle='#c8b8a8';cx.globalAlpha=.5;
    cx.beginPath();cx.moveTo(mx-1,y-3);cx.lineTo(mx+3,y+3);cx.lineTo(mx-5,y+5);cx.closePath();cx.fill();
    cx.beginPath();cx.moveTo(x+TILE-3,y-5);cx.lineTo(x+TILE+1,y+2);cx.lineTo(x+TILE-7,y+3);cx.closePath();cx.fill();
    cx.globalAlpha=1;
    if(here){cx.globalAlpha=.12+Math.sin(ft*.06)*.06;cx.strokeStyle='#4fc3f7';cx.lineWidth=2;cx.setLineDash([4,3]);cx.beginPath();cx.arc(mx,my,22,0,Math.PI*2);cx.stroke();cx.setLineDash([]);cx.globalAlpha=1}
    else if(Math.abs(pl.x-r.x)<=2&&Math.abs(pl.y-r.y)<=2){cx.globalAlpha=.18+Math.sin(ft*.08)*.08;cx.fillStyle='#4fc3f7';cx.font='9px Rajdhani';cx.textAlign='center';cx.fillText('⛰',mx,y+TILE+9);cx.globalAlpha=1}
  }
}

function drSpice(){
  for(const s of spice){
    const x=s.x*TILE+TILE/2,y=s.y*TILE+TILE/2,p=Math.sin(ft*.07+s.x)*.3+.7,gl=Math.sin(ft*.05+s.y)*3+14;
    cx.globalAlpha=.12*p;const g=cx.createRadialGradient(x,y,1,x,y,gl);g.addColorStop(0,'#ff9f43');g.addColorStop(1,'transparent');cx.fillStyle=g;cx.fillRect(x-gl,y-gl,gl*2,gl*2);
    cx.globalAlpha=.92;cx.fillStyle='#e85d10';cx.beginPath();cx.moveTo(x,y-9);cx.lineTo(x+7,y);cx.lineTo(x,y+9);cx.lineTo(x-7,y);cx.closePath();cx.fill();
    cx.fillStyle='#ffcc02';cx.beginPath();cx.moveTo(x,y-5);cx.lineTo(x+4,y);cx.lineTo(x,y+5);cx.lineTo(x-4,y);cx.closePath();cx.fill();
    cx.fillStyle='#fff';cx.globalAlpha=p*.5;cx.beginPath();cx.arc(x-2,y-3,1.3,0,Math.PI*2);cx.fill();cx.globalAlpha=1;
  }
}

function drWmTrail(w){cx.globalAlpha=.04;cx.fillStyle='#3e2723';for(const s of w.seg){cx.beginPath();cx.ellipse(s.x*TILE+TILE/2+2,s.y*TILE+TILE/2+3,15,7,0,0,Math.PI*2);cx.fill()}cx.globalAlpha=1}

function drWm(w){
  // Color variations per worm
  const cols=[['#5d4037','#4e342e','#6d4c41','#8d6e63'],['#4a148c','#38006b','#6a1b9a','#9c27b0'],['#1b5e20','#0d3010','#2e7d32','#4caf50']][w.hue%3];
  const ss=w.seg;
  for(let i=ss.length-1;i>=0;i--){
    const s=ss[i],x=s.x*TILE+TILE/2,y=s.y*TILE+TILE/2,wb=Math.sin(ft*.08+i*.8)*2.5,t=i/(ss.length-1),r=17-t*8;
    if(i===0){
      const j=w.jo*.32;
      cx.fillStyle=cols[1];cx.beginPath();cx.arc(x+wb,y,r+2,0,Math.PI*2);cx.fill();
      cx.fillStyle=cols[0];cx.beginPath();cx.arc(x+wb,y,r,0,Math.PI*2);cx.fill();
      cx.fillStyle=cols[1];cx.beginPath();cx.arc(x+wb,y-j*11,r-2,Math.PI+.3,-.3);cx.closePath();cx.fill();
      cx.beginPath();cx.arc(x+wb,y+j*11,r-2,.3,Math.PI-.3);cx.closePath();cx.fill();
      if(w.jo>.2){cx.fillStyle='#b71c1c';cx.globalAlpha=w.jo;cx.beginPath();cx.ellipse(x+wb,y,r-4,j*9,0,0,Math.PI*2);cx.fill();cx.globalAlpha=1}
      cx.fillStyle='#ffecb3';for(let t=0;t<5;t++){const a=(t/5)*Math.PI-Math.PI/2,tx=x+wb+Math.cos(a)*(r-3),ty=y-j*9+Math.sin(a)*3;cx.beginPath();cx.moveTo(tx-1.5,ty);cx.lineTo(tx,ty+4+j*3);cx.lineTo(tx+1.5,ty);cx.fill()}
      for(let t=0;t<5;t++){const a=(t/5)*Math.PI+Math.PI/2,tx=x+wb+Math.cos(a)*(r-3),ty=y+j*9+Math.sin(a)*3;cx.beginPath();cx.moveTo(tx-1.5,ty);cx.lineTo(tx,ty-4-j*3);cx.lineTo(tx+1.5,ty);cx.fill()}
      const eg=Math.sin(ft*.1)*.3+.7;cx.globalAlpha=.35*eg;cx.fillStyle='#ff1744';cx.beginPath();cx.arc(x+wb-6,y-7,6,0,Math.PI*2);cx.fill();cx.beginPath();cx.arc(x+wb+6,y-7,6,0,Math.PI*2);cx.fill();cx.globalAlpha=1;
      cx.fillStyle='#ff1744';cx.beginPath();cx.arc(x+wb-6,y-7,4,0,Math.PI*2);cx.fill();cx.fillStyle='#b71c1c';cx.beginPath();cx.arc(x+wb-6,y-7,2,0,Math.PI*2);cx.fill();cx.fillStyle='#ffcdd2';cx.beginPath();cx.arc(x+wb-7,y-8,1,0,Math.PI*2);cx.fill();
      cx.fillStyle='#ff1744';cx.beginPath();cx.arc(x+wb+6,y-7,4,0,Math.PI*2);cx.fill();cx.fillStyle='#b71c1c';cx.beginPath();cx.arc(x+wb+6,y-7,2,0,Math.PI*2);cx.fill();cx.fillStyle='#ffcdd2';cx.beginPath();cx.arc(x+wb+5,y-8,1,0,Math.PI*2);cx.fill();
    }else{
      cx.fillStyle=t<.5?cols[2]:cols[3];cx.beginPath();cx.arc(x+wb,y,r,0,Math.PI*2);cx.fill();
      cx.strokeStyle=t<.5?cols[0]:cols[2];cx.lineWidth=1.2;cx.beginPath();cx.arc(x+wb,y,r-2.5,0,Math.PI*2);cx.stroke();
    }
  }
}

function drPl(){
  const x=pl.x*TILE+TILE/2,y=pl.y*TILE+TILE/2,b=Math.sin(ft*.1)*1.3;
  if(hidden){cx.globalAlpha=.18+Math.sin(ft*.06)*.08;cx.strokeStyle='#4fc3f7';cx.lineWidth=1.5;cx.setLineDash([3,3]);cx.beginPath();cx.arc(x,y+b,18,0,Math.PI*2);cx.stroke();cx.setLineDash([]);cx.globalAlpha=1}
  cx.globalAlpha=hidden?.06:.15;cx.fillStyle='#1a0e00';cx.beginPath();cx.ellipse(x,y+16,10,4,0,0,Math.PI*2);cx.fill();
  cx.globalAlpha=hidden?.45:1;
  cx.fillStyle='#1a237e';cx.beginPath();cx.moveTo(x-12,y+15+b);cx.quadraticCurveTo(x,y-3+b,x+12,y+15+b);cx.lineTo(x+9,y+15+b);cx.quadraticCurveTo(x,y+3+b,x-9,y+15+b);cx.closePath();cx.fill();
  cx.fillStyle='#283593';cx.beginPath();cx.arc(x,y+3+b,9,0,Math.PI*2);cx.fill();
  cx.strokeStyle='#3949ab';cx.lineWidth=.8;cx.beginPath();cx.moveTo(x,y-4+b);cx.lineTo(x,y+10+b);cx.stroke();
  cx.fillStyle='#bcaaa4';cx.beginPath();cx.arc(x,y-7+b,7,0,Math.PI*2);cx.fill();
  cx.fillStyle='#1a237e';cx.beginPath();cx.arc(x,y-7+b,7,Math.PI+.4,-.4);cx.closePath();cx.fill();
  cx.globalAlpha=hidden?.2:.3;cx.fillStyle='#4fc3f7';cx.beginPath();cx.arc(x-2.5,y-8+b,3.5,0,Math.PI*2);cx.fill();cx.beginPath();cx.arc(x+2.5,y-8+b,3.5,0,Math.PI*2);cx.fill();
  cx.globalAlpha=hidden?.45:1;cx.fillStyle='#4fc3f7';cx.beginPath();cx.arc(x-2.5,y-8+b,2.2,0,Math.PI*2);cx.fill();cx.beginPath();cx.arc(x+2.5,y-8+b,2.2,0,Math.PI*2);cx.fill();
  cx.fillStyle='#01579b';cx.beginPath();cx.arc(x-2.5,y-8+b,.9,0,Math.PI*2);cx.fill();cx.beginPath();cx.arc(x+2.5,y-8+b,.9,0,Math.PI*2);cx.fill();
  cx.fillStyle='#e1f5fe';cx.beginPath();cx.arc(x-3.3,y-9+b,.6,0,Math.PI*2);cx.fill();cx.beginPath();cx.arc(x+1.7,y-9+b,.6,0,Math.PI*2);cx.fill();
  cx.globalAlpha=1;
}

function drHud(){
  const rm=spice.length;cx.globalAlpha=.6;cx.fillStyle='#1a0e00';cx.fillRect(W/2-80,4,160,18);cx.globalAlpha=1;
  cx.font='bold 11px Rajdhani';cx.textAlign='center';
  if(rm>0){cx.fillStyle=rm<=1?'#00e676':'#ff9f43';cx.fillText(`◆ ${rm} especia${rm>1?'s':''} restante${rm>1?'s':''}`,W/2,17)}
  else{cx.fillStyle='#00e676';cx.fillText('✓ ¡Especia recogida!',W/2,17)}
  if(hidden){cx.globalAlpha=.7;cx.fillStyle='#0d47a1';cx.fillRect(W/2-44,24,88,15);cx.globalAlpha=1;cx.fillStyle='#4fc3f7';cx.font='bold 9px Rajdhani';cx.fillText('⛰ OCULTO',W/2,35)}
}

function drTremor(){
  let minD=999;for(const w of worms){const h=w.seg[0],d=Math.sqrt((pl.x-h.x)**2+(pl.y-h.y)**2);if(d<minD)minD=d}
  const tr=minD<5&&!hidden?(5-minD)/5:0;
  if(tr<=0){cv.style.transform='';return}
  cx.globalAlpha=tr*.06;cx.fillStyle='#ff1744';cx.fillRect(0,0,W,H);cx.globalAlpha=1;
  if(tr>.5)cv.style.transform=`translate(${(Math.random()-.5)*tr*2.5}px,${(Math.random()-.5)*tr*2.5}px)`;else cv.style.transform='';
}

function drShield(){const x=pl.x*TILE+TILE/2,y=pl.y*TILE+TILE/2;cx.globalAlpha=Math.sin(ft*.15)*.12+.2;cx.strokeStyle='#4fc3f7';cx.lineWidth=1.5;cx.setLineDash([5,3]);cx.beginPath();cx.arc(x,y,22,0,Math.PI*2);cx.stroke();cx.setLineDash([]);cx.globalAlpha=1}

init();
