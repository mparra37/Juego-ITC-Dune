// ══════════════════════════════════════════════════════
// ARRAKIS — RUTA DE LA ESPECIA
// ══════════════════════════════════════════════════════
const TILE=40,COLS=20,ROWS=14,W=COLS*TILE,H=ROWS*TILE,SOL_CODE='ITC123';
let cv,cx,mode='manual',running=false,paused=false,af=null;
let codeOn=false,cq=[],ct=null,ft=0,lvl=1;
let pl,spice,wm,hidden=false,grace=0,GRACE=90,winning=false;
let editorOpen=false;

// ═══ CANVAS SCALE ═══
function resize(){
  if(!cv)return;const w=document.getElementById('canvas-wrap');
  if(!w)return;const s=Math.min(w.clientWidth/W,w.clientHeight/H,2);
  cv.style.width=Math.floor(W*s)+'px';cv.style.height=Math.floor(H*s)+'px';
}
window.addEventListener('resize',resize);

// ═══ EDITOR TOGGLE ═══
function toggleEditor(){
  const e=document.getElementById('editor');
  editorOpen=!editorOpen;
  e.classList.toggle('on',editorOpen);
  setTimeout(resize,400);
}

// ═══ BLOCK INSERT ═══
function ins(code){
  const e=document.getElementById('code');
  const p=e.selectionStart,v=e.value;
  const pre=(v.length>0&&!v.endsWith('\n'))?'\n':'';
  e.value=v.substring(0,p)+pre+code+'\n'+v.substring(e.selectionEnd);
  const cp=p+pre.length+code.indexOf('\n  ')+3;
  e.selectionStart=e.selectionEnd=Math.min(cp,e.value.length);
  e.focus();
}
function clearEditor(){document.getElementById('code').value='';const c=document.getElementById('console');c.innerHTML='';c.classList.remove('on');document.getElementById('sol-err').textContent=''}

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

// ═══ LEVELS ═══
const LV={
  1:{name:'El Primer Paso',ws:30,wl:4,wp:{x:16,y:11},pp:{x:1,y:1},
    sp:[{x:5,y:2},{x:12,y:7},{x:17,y:4}],
    rk:[{x:4,y:4},{x:4,y:5},{x:9,y:3},{x:9,y:4},{x:14,y:8},{x:14,y:9},{x:7,y:10},{x:7,y:11},{x:17,y:2},{x:11,y:11}],
    tag:'MUY LENTO',sol:`derecha(4)\nabajo(1)\nsi_gusano_cerca(6):\n  esperar(2)\nfin\nderecha(7)\nabajo(4)\nsi_gusano_cerca(5):\n  arriba(2)\n  derecha(2)\n  abajo(2)\nsino:\n  derecha(5)\nfin\narriba(2)`},
  2:{name:'Arenas Movedizas',ws:24,wl:5,wp:{x:10,y:7},pp:{x:0,y:0},
    sp:[{x:3,y:3},{x:9,y:1},{x:16,y:5},{x:6,y:11}],
    rk:[{x:5,y:2},{x:5,y:3},{x:5,y:4},{x:13,y:2},{x:13,y:3},{x:8,y:9},{x:8,y:10},{x:15,y:9},{x:15,y:10},{x:3,y:7},{x:18,y:3},{x:12,y:11},{x:12,y:12}],
    tag:'LENTO',sol:`derecha(3)\nabajo(3)\nsi_gusano_cerca(5):\n  abajo(2)\n  derecha(2)\nsino:\n  derecha(6)\n  arriba(2)\nfin\nderecha(7)\nabajo(4)\nizquierda(10)\nabajo(4)`},
  3:{name:'Territorio del Gusano',ws:18,wl:6,wp:{x:10,y:5},pp:{x:0,y:13},
    sp:[{x:3,y:1},{x:14,y:2},{x:18,y:9},{x:8,y:12},{x:1,y:6}],
    rk:[{x:5,y:1},{x:5,y:2},{x:6,y:5},{x:6,y:6},{x:6,y:7},{x:11,y:3},{x:12,y:3},{x:10,y:9},{x:10,y:10},{x:15,y:5},{x:15,y:6},{x:14,y:11},{x:14,y:12},{x:3,y:10},{x:3,y:11},{x:17,y:12},{x:18,y:12}],
    tag:'MODERADO',sol:`derecha(8)\nsi_gusano_cerca(5):\n  abajo(1)\n  esperar(3)\n  arriba(1)\nfin\narriba(1)\nizquierda(7)\narriba(6)\nderecha(2)\narriba(5)\nderecha(11)\nabajo(7)\nderecha(4)\narriba(3)`},
  4:{name:'Tormenta de Arena',ws:14,wl:7,wp:{x:9,y:8},pp:{x:0,y:0},
    sp:[{x:4,y:2},{x:12,y:1},{x:18,y:4},{x:15,y:11},{x:7,y:9},{x:1,y:12}],
    rk:[{x:3,y:4},{x:3,y:5},{x:7,y:2},{x:7,y:3},{x:11,y:5},{x:11,y:6},{x:14,y:3},{x:14,y:4},{x:6,y:7},{x:16,y:8},{x:16,y:9},{x:9,y:11},{x:9,y:12},{x:4,y:10},{x:18,y:10},{x:13,y:12},{x:13,y:13}],
    tag:'RÁPIDO',sol:`derecha(4)\nabajo(2)\nsi_gusano_cerca(5):\n  arriba(1)\n  derecha(3)\n  esperar(4)\n  izquierda(3)\n  abajo(1)\nfin\nderecha(8)\narriba(1)\nderecha(6)\nabajo(3)\nizquierda(2)\nabajo(7)\nizquierda(14)\nabajo(1)`},
  5:{name:'La Prueba Final',ws:10,wl:9,wp:{x:10,y:7},pp:{x:0,y:7},
    sp:[{x:3,y:1},{x:10,y:0},{x:18,y:2},{x:17,y:11},{x:8,y:12},{x:1,y:11},{x:13,y:7}],
    rk:[{x:5,y:0},{x:5,y:1},{x:5,y:2},{x:7,y:4},{x:7,y:5},{x:3,y:8},{x:3,y:9},{x:12,y:3},{x:12,y:4},{x:15,y:5},{x:15,y:6},{x:15,y:7},{x:10,y:10},{x:10,y:11},{x:6,y:11},{x:6,y:12},{x:17,y:8},{x:14,y:12},{x:14,y:13},{x:2,y:3}],
    tag:'EXTREMO',sol:`abajo(1)\nderecha(3)\nabajo(1)\nesperar(3)\narriba(2)\nizquierda(1)\narriba(6)\nderecha(1)\nsi_gusano_cerca(5):\n  esperar(4)\nfin\narriba(1)\nderecha(5)\narriba(1)\nderecha(5)\nabajo(9)\nsi_gusano_cerca(4):\n  derecha(2)\n  esperar(4)\n  izquierda(2)\nfin\nderecha(4)\nabajo(1)\nizquierda(9)\nabajo(1)\nizquierda(7)\nabajo(1)\nderecha(1)\nabajo(1)\nizquierda(1)\narriba(1)`}
};

// ─── Textures ───
let sg=[],dw=[],bones=[];
function genTex(){
  sg=[];for(let i=0;i<350;i++)sg.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.8+.3,s:Math.random(),o:Math.random()*.14+.03});
  dw=[];for(let i=0;i<12;i++)dw.push({x:Math.random()*W,y:Math.random()*H,w:Math.random()*220+60,h:Math.random()*16+4,a:Math.random()*.5-.25,s:Math.random()*.07+.02});
  const l=LV[lvl];bones=[];
  for(let i=0;i<5;i++){let bx,by;do{bx=Math.floor(Math.random()*COLS);by=Math.floor(Math.random()*ROWS)}while(l.rk.some(r=>r.x===bx&&r.y===by)||l.sp.some(s=>s.x===bx&&s.y===by));bones.push({x:bx,y:by,r:Math.random()*Math.PI,t:Math.random()})}
}

// ═══ INIT ═══
function init(){cv=document.getElementById('c');cx=cv.getContext('2d');cv.width=W;cv.height=H;resize()}

// ═══ FLOW ═══
function startGame(m){
  mode=m;lvl=1;
  document.getElementById('start-screen').classList.add('hide');
  document.getElementById('game').classList.add('on');
  if(m==='code'){document.getElementById('fab-code').style.display='flex';editorOpen=true;document.getElementById('editor').classList.add('on')}
  else{document.getElementById('fab-code').style.display='none';editorOpen=false;document.getElementById('editor').classList.remove('on')}
  startMusic();loadLvl(lvl);setTimeout(resize,80);
}
function backToMenu(){
  running=false;paused=false;if(af)cancelAnimationFrame(af);stopCode();stopMusic();
  document.getElementById('game').classList.remove('on');document.getElementById('editor').classList.remove('on');
  document.getElementById('start-screen').classList.remove('hide');hideOv();
}
function loadLvl(n){
  const l=LV[n];if(!l)return;hideOv();stopCode();lvl=n;winning=false;
  pl={x:l.pp.x,y:l.pp.y,sp:0,st:0,alive:true};hidden=false;
  spice=l.sp.map(s=>({...s}));
  wm={seg:[],mt:0,mi:l.ws,jo:0,jd:1,tr:0,wd:null,ws:0,sc:0};
  for(let i=0;i<l.wl;i++)wm.seg.push({x:l.wp.x-i,y:l.wp.y});
  genTex();grace=GRACE;
  document.getElementById('hud-lvl').textContent=`N${n}`;
  document.getElementById('hud-spice').textContent=`◆ 0/${l.sp.length}`;
  document.getElementById('hud-worm').textContent=`☠ ${l.tag}`;
  document.getElementById('hud-steps').textContent='↦ 0';
  document.getElementById('hud-hidden').style.display='none';
  document.getElementById('ann-lvl').textContent=`NIVEL ${n}`;
  document.getElementById('ann-name').textContent=l.name;
  showOv('ov-lvl');
  paused=false;running=true;if(af)cancelAnimationFrame(af);loop();
  setTimeout(()=>document.getElementById('ov-lvl').classList.remove('on'),1500);
  setTimeout(resize,100);
}
function resetLevel(){hideOv();loadLvl(lvl)}
function nextLevel(){if(lvl>=5){showEnd();return}hideOv();loadLvl(lvl+1);clearEditor()}
function showEnd(){hideOv();showOv('ov-end');running=false}
function showOv(id){document.getElementById(id).classList.add('on')}
function hideOv(){['ov-death','ov-win','ov-end','ov-lvl','ov-pause','ov-grace'].forEach(i=>document.getElementById(i).classList.remove('on'))}

function togglePause(){
  if(!running&&!paused)return;
  if(paused){paused=false;running=true;document.getElementById('ov-pause').classList.remove('on');loop()}
  else{paused=true;running=false;if(af)cancelAnimationFrame(af);showOv('ov-pause')}
}

// ═══ D-PAD ═══
function dp(dx,dy,e){e.preventDefault();if(mode!=='manual'||!running||!pl.alive||grace>0)return;movePl(dx,dy)}

// ═══ LOOP ═══
function loop(){
  if(!running)return;ft++;
  if(grace>0){grace--;const s=Math.ceil(grace/30);const g=document.getElementById('ov-grace');if(grace>0){g.classList.add('on');document.getElementById('grace-num').textContent=s}else g.classList.remove('on');draw();af=requestAnimationFrame(loop);return}
  if(winning){draw();af=requestAnimationFrame(loop);return}
  wm.jo+=.06*wm.jd;if(wm.jo>1)wm.jd=-1;if(wm.jo<0)wm.jd=1;
  wm.mt++;if(wm.mt>=wm.mi){wm.mt=0;moveWm()}
  const h=wm.seg[0],d=Math.sqrt((pl.x-h.x)**2+(pl.y-h.y)**2);wm.tr=d<5?(5-d)/5:0;
  hidden=LV[lvl].rk.some(r=>r.x===pl.x&&r.y===pl.y);
  document.getElementById('hud-hidden').style.display=hidden?'inline':'none';
  draw();af=requestAnimationFrame(loop);
}

// ═══ WORM AI ═══
function moveWm(){
  if(!pl.alive)return;const l=LV[lvl],h=wm.seg[0];
  const dirs=[{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
  function ok(p){if(p.x<0||p.x>=COLS||p.y<0||p.y>=ROWS)return false;if(l.rk.some(r=>r.x===p.x&&r.y===p.y))return false;const cl=Math.max(1,wm.seg.length-3);for(let i=0;i<cl;i++)if(wm.seg[i].x===p.x&&wm.seg[i].y===p.y)return false;return true}
  let nx=h.x,ny=h.y,mv=false;
  if(hidden){
    if(wm.ws<=0){wm.wd=dirs[Math.floor(Math.random()*4)];wm.ws=Math.floor(Math.random()*5)+2}
    const t={x:h.x+wm.wd.x,y:h.y+wm.wd.y};if(ok(t)){nx=t.x;ny=t.y;mv=true}else wm.ws=0;wm.ws--;
  }else{
    const dx=pl.x-h.x,dy=pl.y-h.y;let cs=[];
    if(Math.abs(dx)>=Math.abs(dy)){if(dx)cs.push({x:h.x+Math.sign(dx),y:h.y});if(dy)cs.push({x:h.x,y:h.y+Math.sign(dy)})}
    else{if(dy)cs.push({x:h.x,y:h.y+Math.sign(dy)});if(dx)cs.push({x:h.x+Math.sign(dx),y:h.y})}
    for(const d of dirs){const p={x:h.x+d.x,y:h.y+d.y};if(!cs.some(c=>c.x===p.x&&c.y===p.y))cs.push(p)}
    for(const c of cs)if(ok(c)){nx=c.x;ny=c.y;mv=true;break}
  }
  if(mv){wm.sc=0;for(let i=wm.seg.length-1;i>0;i--)wm.seg[i]={...wm.seg[i-1]};wm.seg[0]={x:nx,y:ny}}
  else{wm.sc++;if(wm.sc>3&&wm.seg.length>3){wm.seg.pop();wm.sc=0}}
  if(wm.seg.length<LV[lvl].wl&&wm.sc===0&&Math.random()<.1)wm.seg.push({...wm.seg[wm.seg.length-1]});
  if(!pl.alive||hidden)return;for(const s of wm.seg)if(s.x===pl.x&&s.y===pl.y){die();return}
}

// ═══ PLAYER ═══
function movePl(dx,dy){
  if(!pl.alive||!running||winning)return false;
  const nx=pl.x+dx,ny=pl.y+dy;if(nx<0||nx>=COLS||ny<0||ny>=ROWS)return false;
  pl.x=nx;pl.y=ny;pl.st++;
  const si=spice.findIndex(s=>s.x===nx&&s.y===ny);if(si>=0){spice.splice(si,1);pl.sp++}
  updHUD();hidden=LV[lvl].rk.some(r=>r.x===pl.x&&r.y===pl.y);
  if(!hidden)for(const s of wm.seg)if(s.x===pl.x&&s.y===pl.y){die();return true}
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
  running=false;if(af)cancelAnimationFrame(af);stopCode();winning=false;
  if(lvl>=5){setTimeout(showEnd,400);return}
  document.getElementById('win-t').textContent=`¡NIVEL ${lvl} COMPLETADO!`;
  document.getElementById('win-m').textContent=`${pl.st} pasos · ◆ ${pl.sp}/${LV[lvl].sp.length}`;
  showOv('ov-win');
}
function updHUD(){
  document.getElementById('hud-spice').textContent=`◆ ${pl.sp}/${LV[lvl].sp.length}`;
  document.getElementById('hud-steps').textContent=`↦ ${pl.st}`;
}

// ═══ KEYBOARD ═══
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){togglePause();return}
  if(mode!=='manual'||!running||!pl.alive||grace>0)return;
  let m=false;
  switch(e.key){case'ArrowUp':case'w':case'W':m=movePl(0,-1);break;case'ArrowDown':case's':case'S':m=movePl(0,1);break;case'ArrowLeft':case'a':case'A':m=movePl(-1,0);break;case'ArrowRight':case'd':case'D':m=movePl(1,0);break}
  if(m)e.preventDefault();
});

// ═══ PROGRAMMING ═══
function dtw(){const h=wm.seg[0];return Math.abs(pl.x-h.x)+Math.abs(pl.y-h.y)}
function sid(dir,md){const dl={arriba:{x:0,y:-1},abajo:{x:0,y:1},izquierda:{x:-1,y:0},derecha:{x:1,y:0}};const d=dl[dir];if(!d)return false;for(let i=1;i<=md;i++){const x=pl.x+d.x*i,y=pl.y+d.y*i;if(x<0||x>=COLS||y<0||y>=ROWS)break;if(spice.some(s=>s.x===x&&s.y===y))return true}return false}
function parse(src){
  const ls=src.split('\n').map(l=>l.trimEnd());let p=0;
  function pb(ind){
    const c=[];while(p<ls.length){const r=ls[p],t=r.trim();if(!t||t.startsWith('//')){p++;continue}const ci=r.length-r.trimStart().length;if(ci<ind&&t!=='fin'&&t!=='sino:')break;if(t==='fin'){p++;break}if(t==='sino:')break;
    const mv=t.match(/^(arriba|abajo|izquierda|derecha|esperar)\s*\(\s*(\d+)\s*\)$/i);if(mv){c.push({t:'m',c:mv[1].toLowerCase(),n:parseInt(mv[2])});p++;continue}
    const rp=t.match(/^repetir\s*\(\s*(\d+)\s*\)\s*:?$/i);if(rp){p++;c.push({t:'r',n:parseInt(rp[1]),b:pb(ci+1)});continue}
    const wm=t.match(/^si_gusano_cerca\s*\(\s*(\d+)\s*\)\s*:?$/i);if(wm){p++;const th=pb(ci+1);let el=[];if(p<ls.length&&ls[p].trim()==='sino:'){p++;el=pb(ci+1)}c.push({t:'w',d:parseInt(wm[1]),th,el});continue}
    const sp=t.match(/^si_especia\s*\(\s*(arriba|abajo|izquierda|derecha)\s*,\s*(\d+)\s*\)\s*:?$/i);if(sp){p++;const th=pb(ci+1);let el=[];if(p<ls.length&&ls[p].trim()==='sino:'){p++;el=pb(ci+1)}c.push({t:'s',dr:sp[1].toLowerCase(),d:parseInt(sp[2]),th,el});continue}
    const hd=t.match(/^si_oculto\s*\(\s*\)\s*:?$/i);if(hd){p++;const th=pb(ci+1);let el=[];if(p<ls.length&&ls[p].trim()==='sino:'){p++;el=pb(ci+1)}c.push({t:'h',th,el});continue}
    c.push({t:'e',l:t});p++}return c}return pb(0)}
function flat(ast){const q=[];function w(ns){for(const n of ns){if(n.t==='e'){q.push(n);return}if(n.t==='m')for(let i=0;i<n.n;i++)q.push({t:'m',c:n.c});if(n.t==='r')for(let i=0;i<n.n;i++)w(n.b);if('th'in n)q.push(n)}}w(ast);return q}

function runCode(){
  if(codeOn)return;const r=document.getElementById('code').value.trim();if(!r)return;
  const con=document.getElementById('console');con.classList.add('on');con.innerHTML='';
  const ast=parse(r);let er=[];(function f(ns){for(const n of ns){if(n.t==='e')er.push(n.l);if(n.th)f(n.th);if(n.el)f(n.el);if(n.b)f(n.b)}})(ast);
  if(er.length){logC(`✗ "${er[0]}"`,'e');return}
  cq=flat(ast);logC('▶ Ejecutando...','s');codeOn=true;exN();
}
function exN(){
  if(!codeOn||cq.length===0){codeOn=false;if(pl.alive&&(running||winning)){logC('✓ Fin','s');if(spice.length>0)logC(`⚠ Faltan ${spice.length}`,'e')}return}
  if(grace>0){ct=setTimeout(exN,100);return}
  const i=cq.shift();
  if(i.t==='m'){let ok=true;switch(i.c){case'arriba':ok=movePl(0,-1);break;case'abajo':ok=movePl(0,1);break;case'izquierda':ok=movePl(-1,0);break;case'derecha':ok=movePl(1,0);break;case'esperar':break}if(!ok){logC(`✗ Bloqueado`,'e');codeOn=false;return}}
  if(i.t==='w'){const d=dtw();cq=flat(d<=i.d?i.th:i.el).concat(cq);logC(`  gusano:${d} ${d<=i.d?'SÍ':'NO'}`,'i')}
  if(i.t==='s'){const f=sid(i.dr,i.d);cq=flat(f?i.th:i.el).concat(cq);logC(`  especia ${i.dr}:${f?'SÍ':'NO'}`,'i')}
  if(i.t==='h'){cq=flat(hidden?i.th:i.el).concat(cq);logC(`  oculto:${hidden?'SÍ':'NO'}`,'i')}
  if(!pl.alive||(!running&&!winning)){codeOn=false;return}
  ct=setTimeout(exN,180);
}
function stopCode(){codeOn=false;cq=[];if(ct)clearTimeout(ct)}
function logC(m,t=''){const e=document.getElementById('console'),l=document.createElement('div');l.className='log '+t;l.textContent=m;e.appendChild(l);e.scrollTop=e.scrollHeight}

// ═══ SOLUTION ═══
function toggleSolInput(){document.getElementById('sol-wrap').classList.toggle('on');document.getElementById('sol-err').textContent=''}
function checkSol(){const v=document.getElementById('sol-in').value.trim(),e=document.getElementById('sol-err');if(v===SOL_CODE){e.textContent='✓';e.className='sol-err ok';document.getElementById('code').value=LV[lvl].sol;logC('✓ Cargada','s')}else{e.textContent='✗';e.className='sol-err no'}}
function toggleSolutionFromFooter(){if(mode==='code'){if(!editorOpen)toggleEditor();toggleSolInput()}else document.getElementById('sol-modal').classList.add('on')}
function closeSolModal(){document.getElementById('sol-modal').classList.remove('on');document.getElementById('sol-err2').textContent='';const r=document.getElementById('sol-reveal');r.style.display='none';r.classList.remove('on')}
function checkSol2(){const v=document.getElementById('sol-in2').value.trim(),e=document.getElementById('sol-err2'),r=document.getElementById('sol-reveal');if(v===SOL_CODE){e.textContent='✓';e.className='sol-err ok';r.textContent=`Nivel ${lvl}:\n\n`+LV[lvl].sol;r.classList.add('on');r.style.display='block'}else{e.textContent='✗';e.className='sol-err no';r.style.display='none'}}

// ══════════════════════════════════════════════════════
// RENDERING
// ══════════════════════════════════════════════════════
function draw(){cx.clearRect(0,0,W,H);drDesert();drGrid();drBones();drMtns();drSpice();drWmTrail();drWm();if(pl.alive)drPl();drHud();drTremor();if(grace>0)drShield()}

function drDesert(){
  // Multi-layer gradient
  const g=cx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#dbb856');g.addColorStop(.3,'#c9952a');g.addColorStop(.6,'#b8860b');g.addColorStop(1,'#9a7209');cx.fillStyle=g;cx.fillRect(0,0,W,H);
  // Dune waves
  for(const d of dw){cx.save();cx.translate(d.x,d.y);cx.rotate(d.a);cx.globalAlpha=d.s;cx.fillStyle='#8b6914';cx.beginPath();cx.ellipse(0,0,d.w,d.h,0,0,Math.PI*2);cx.fill();cx.restore()}cx.globalAlpha=1;
  // Sand grains
  for(const g of sg){cx.globalAlpha=g.o;cx.fillStyle=g.s>.5?'#a07a1a':'#c4a035';cx.fillRect(g.x,g.y,g.r,g.r)}cx.globalAlpha=1;
  // Shimmer
  cx.globalAlpha=.02;cx.fillStyle='#fff';for(let y=0;y<H;y+=24)cx.fillRect(Math.sin((y+ft*.4)*.05)*6,y,W,1);cx.globalAlpha=1;
}
function drGrid(){cx.strokeStyle='rgba(0,0,0,.035)';cx.lineWidth=.5;for(let x=0;x<=W;x+=TILE){cx.beginPath();cx.moveTo(x,0);cx.lineTo(x,H);cx.stroke()}for(let y=0;y<=H;y+=TILE){cx.beginPath();cx.moveTo(0,y);cx.lineTo(W,y);cx.stroke()}}
function drBones(){cx.globalAlpha=.08;for(const b of bones){const x=b.x*TILE+TILE/2,y=b.y*TILE+TILE/2;cx.save();cx.translate(x,y);cx.rotate(b.r);cx.strokeStyle=b.t>.5?'#d7ccc8':'#a1887f';cx.lineWidth=1.5;cx.beginPath();cx.moveTo(-7,0);cx.lineTo(7,0);cx.stroke();cx.beginPath();cx.arc(-7,0,2.5,0,Math.PI*2);cx.arc(7,0,2.5,0,Math.PI*2);cx.stroke();cx.restore()}cx.globalAlpha=1}

function drMtns(){
  const l=LV[lvl];for(const r of l.rk){
    const x=r.x*TILE,y=r.y*TILE,mx=x+TILE/2,my=y+TILE/2,here=pl.x===r.x&&pl.y===r.y;
    // Shadow
    cx.globalAlpha=.2;cx.fillStyle='#1a0a00';cx.beginPath();cx.ellipse(mx+3,my+7,18,7,0,0,Math.PI*2);cx.fill();cx.globalAlpha=1;
    // Dark face
    cx.fillStyle=here?'#3d4f60':'#4a3c2a';cx.beginPath();cx.moveTo(x-3,y+TILE);cx.lineTo(x+5,y+10);cx.lineTo(mx-1,y-3);cx.lineTo(mx+4,y+4);cx.lineTo(x+TILE-3,y-5);cx.lineTo(x+TILE+3,y+9);cx.lineTo(x+TILE+3,y+TILE);cx.closePath();cx.fill();
    // Light face
    cx.fillStyle=here?'#506878':'#6d5a3a';cx.beginPath();cx.moveTo(mx-1,y-3);cx.lineTo(mx+4,y+4);cx.lineTo(x+TILE-3,y-5);cx.lineTo(x+TILE+3,y+9);cx.lineTo(x+TILE+3,y+TILE);cx.lineTo(mx,y+TILE);cx.closePath();cx.fill();
    // Snow caps
    cx.fillStyle='#c8b8a8';cx.globalAlpha=.55;
    cx.beginPath();cx.moveTo(mx-1,y-3);cx.lineTo(mx+3,y+3);cx.lineTo(mx-5,y+5);cx.closePath();cx.fill();
    cx.beginPath();cx.moveTo(x+TILE-3,y-5);cx.lineTo(x+TILE+1,y+2);cx.lineTo(x+TILE-7,y+3);cx.closePath();cx.fill();
    cx.globalAlpha=1;
    // Shelter glow
    if(here){cx.globalAlpha=.12+Math.sin(ft*.06)*.06;cx.strokeStyle='#4fc3f7';cx.lineWidth=2;cx.setLineDash([4,3]);cx.beginPath();cx.arc(mx,my,22,0,Math.PI*2);cx.stroke();cx.setLineDash([]);cx.globalAlpha=1}
    else if(Math.abs(pl.x-r.x)<=2&&Math.abs(pl.y-r.y)<=2){cx.globalAlpha=.2+Math.sin(ft*.08)*.1;cx.fillStyle='#4fc3f7';cx.font='9px Rajdhani';cx.textAlign='center';cx.fillText('⛰',mx,y+TILE+9);cx.globalAlpha=1}
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

function drWmTrail(){cx.globalAlpha=.05;cx.fillStyle='#3e2723';for(const s of wm.seg){cx.beginPath();cx.ellipse(s.x*TILE+TILE/2+2,s.y*TILE+TILE/2+3,15,7,0,0,Math.PI*2);cx.fill()}cx.globalAlpha=1}

function drWm(){
  const ss=wm.seg;for(let i=ss.length-1;i>=0;i--){
    const s=ss[i],x=s.x*TILE+TILE/2,y=s.y*TILE+TILE/2,w=Math.sin(ft*.08+i*.8)*2.5,t=i/(ss.length-1),r=17-t*8;
    if(i===0){
      const j=wm.jo*.32;
      cx.fillStyle='#3e2723';cx.beginPath();cx.arc(x+w,y,r+2,0,Math.PI*2);cx.fill();
      cx.fillStyle='#5d4037';cx.beginPath();cx.arc(x+w,y,r,0,Math.PI*2);cx.fill();
      // Mandibles
      cx.fillStyle='#4e342e';cx.beginPath();cx.arc(x+w,y-j*11,r-2,Math.PI+.3,-.3);cx.closePath();cx.fill();
      cx.beginPath();cx.arc(x+w,y+j*11,r-2,.3,Math.PI-.3);cx.closePath();cx.fill();
      if(wm.jo>.2){cx.fillStyle='#b71c1c';cx.globalAlpha=wm.jo;cx.beginPath();cx.ellipse(x+w,y,r-4,j*9,0,0,Math.PI*2);cx.fill();cx.globalAlpha=1}
      // Teeth
      cx.fillStyle='#ffecb3';for(let t=0;t<5;t++){const a=(t/5)*Math.PI-Math.PI/2,tx=x+w+Math.cos(a)*(r-3),ty=y-j*9+Math.sin(a)*3;cx.beginPath();cx.moveTo(tx-1.5,ty);cx.lineTo(tx,ty+4+j*3);cx.lineTo(tx+1.5,ty);cx.fill()}
      for(let t=0;t<5;t++){const a=(t/5)*Math.PI+Math.PI/2,tx=x+w+Math.cos(a)*(r-3),ty=y+j*9+Math.sin(a)*3;cx.beginPath();cx.moveTo(tx-1.5,ty);cx.lineTo(tx,ty-4-j*3);cx.lineTo(tx+1.5,ty);cx.fill()}
      // Eyes
      const eg=Math.sin(ft*.1)*.3+.7;cx.globalAlpha=.35*eg;cx.fillStyle='#ff1744';cx.beginPath();cx.arc(x+w-6,y-7,6,0,Math.PI*2);cx.fill();cx.beginPath();cx.arc(x+w+6,y-7,6,0,Math.PI*2);cx.fill();cx.globalAlpha=1;
      cx.fillStyle='#ff1744';cx.beginPath();cx.arc(x+w-6,y-7,4,0,Math.PI*2);cx.fill();cx.fillStyle='#b71c1c';cx.beginPath();cx.arc(x+w-6,y-7,2,0,Math.PI*2);cx.fill();cx.fillStyle='#ffcdd2';cx.beginPath();cx.arc(x+w-7,y-8,1,0,Math.PI*2);cx.fill();
      cx.fillStyle='#ff1744';cx.beginPath();cx.arc(x+w+6,y-7,4,0,Math.PI*2);cx.fill();cx.fillStyle='#b71c1c';cx.beginPath();cx.arc(x+w+6,y-7,2,0,Math.PI*2);cx.fill();cx.fillStyle='#ffcdd2';cx.beginPath();cx.arc(x+w+5,y-8,1,0,Math.PI*2);cx.fill();
    }else{
      cx.fillStyle=t<.5?'#6d4c41':'#8d6e63';cx.beginPath();cx.arc(x+w,y,r,0,Math.PI*2);cx.fill();
      cx.strokeStyle=t<.5?'#795548':'#a1887f';cx.lineWidth=1.2;cx.beginPath();cx.arc(x+w,y,r-2.5,0,Math.PI*2);cx.stroke();
    }
  }
}

function drPl(){
  const x=pl.x*TILE+TILE/2,y=pl.y*TILE+TILE/2,b=Math.sin(ft*.1)*1.3;
  if(hidden){cx.globalAlpha=.18+Math.sin(ft*.06)*.08;cx.strokeStyle='#4fc3f7';cx.lineWidth=1.5;cx.setLineDash([3,3]);cx.beginPath();cx.arc(x,y+b,18,0,Math.PI*2);cx.stroke();cx.setLineDash([]);cx.globalAlpha=1}
  cx.globalAlpha=hidden?.06:.15;cx.fillStyle='#1a0e00';cx.beginPath();cx.ellipse(x,y+16,10,4,0,0,Math.PI*2);cx.fill();
  cx.globalAlpha=hidden?.45:1;
  // Cape
  cx.fillStyle='#1a237e';cx.beginPath();cx.moveTo(x-12,y+15+b);cx.quadraticCurveTo(x,y-3+b,x+12,y+15+b);cx.lineTo(x+9,y+15+b);cx.quadraticCurveTo(x,y+3+b,x-9,y+15+b);cx.closePath();cx.fill();
  // Body
  cx.fillStyle='#283593';cx.beginPath();cx.arc(x,y+3+b,9,0,Math.PI*2);cx.fill();
  cx.strokeStyle='#3949ab';cx.lineWidth=.8;cx.beginPath();cx.moveTo(x,y-4+b);cx.lineTo(x,y+10+b);cx.stroke();
  // Head
  cx.fillStyle='#bcaaa4';cx.beginPath();cx.arc(x,y-7+b,7,0,Math.PI*2);cx.fill();
  cx.fillStyle='#1a237e';cx.beginPath();cx.arc(x,y-7+b,7,Math.PI+.4,-.4);cx.closePath();cx.fill();
  // Eyes
  cx.globalAlpha=hidden?.2:.3;cx.fillStyle='#4fc3f7';cx.beginPath();cx.arc(x-2.5,y-8+b,3.5,0,Math.PI*2);cx.fill();cx.beginPath();cx.arc(x+2.5,y-8+b,3.5,0,Math.PI*2);cx.fill();
  cx.globalAlpha=hidden?.45:1;cx.fillStyle='#4fc3f7';cx.beginPath();cx.arc(x-2.5,y-8+b,2.2,0,Math.PI*2);cx.fill();cx.beginPath();cx.arc(x+2.5,y-8+b,2.2,0,Math.PI*2);cx.fill();
  cx.fillStyle='#01579b';cx.beginPath();cx.arc(x-2.5,y-8+b,.9,0,Math.PI*2);cx.fill();cx.beginPath();cx.arc(x+2.5,y-8+b,.9,0,Math.PI*2);cx.fill();
  cx.fillStyle='#e1f5fe';cx.beginPath();cx.arc(x-3.3,y-9+b,.7,0,Math.PI*2);cx.fill();cx.beginPath();cx.arc(x+1.7,y-9+b,.7,0,Math.PI*2);cx.fill();
  cx.globalAlpha=1;
}

function drHud(){
  const rm=spice.length;cx.globalAlpha=.65;cx.fillStyle='#1a0e00';cx.fillRect(W/2-80,4,160,18);cx.globalAlpha=1;
  cx.font='bold 11px Rajdhani';cx.textAlign='center';
  if(rm>0){cx.fillStyle=rm<=1?'#00e676':'#ff9f43';cx.fillText(`◆ ${rm} especia${rm>1?'s':''} restante${rm>1?'s':''}`,W/2,17)}
  else{cx.fillStyle='#00e676';cx.fillText('✓ ¡Especia recogida!',W/2,17)}
  if(hidden){cx.globalAlpha=.75;cx.fillStyle='#0d47a1';cx.fillRect(W/2-50,24,100,16);cx.globalAlpha=1;cx.fillStyle='#4fc3f7';cx.font='bold 9px Rajdhani';cx.fillText('⛰ OCULTO',W/2,36)}
}
function drTremor(){if(wm.tr<=0||hidden){cv.style.transform='';return}cx.globalAlpha=wm.tr*.06;cx.fillStyle='#ff1744';cx.fillRect(0,0,W,H);cx.globalAlpha=1;if(wm.tr>.5)cv.style.transform=`translate(${(Math.random()-.5)*wm.tr*2.5}px,${(Math.random()-.5)*wm.tr*2.5}px)`;else cv.style.transform=''}
function drShield(){const x=pl.x*TILE+TILE/2,y=pl.y*TILE+TILE/2;cx.globalAlpha=Math.sin(ft*.15)*.12+.2;cx.strokeStyle='#4fc3f7';cx.lineWidth=1.5;cx.setLineDash([5,3]);cx.beginPath();cx.arc(x,y,22,0,Math.PI*2);cx.stroke();cx.setLineDash([]);cx.globalAlpha=1}

init();
