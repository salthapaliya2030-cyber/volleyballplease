import {EventBus} from './shared/events.js';
import {BridgeAdapter} from './shared/bridge.js';
import {CameraRig} from './graphics/camera.js';
import {ArenaRenderer} from './graphics/renderer.js';
import {UIController} from './graphics/ui.js';
import {MatchEngine} from './gameplay/match.js';
import {CharacterRig} from './animations/rig.js';
import {V} from './gameplay/physics.js';

const canvas=document.getElementById('court');
const events=new EventBus();
const bridge=new BridgeAdapter();
let profile={yen:1250,gems:25,style:'rookie',ownedStyles:['rookie'],settings:{sensitivity:1,botLevel:'normal',brightness:1}};
let camera,renderer,engine,ui,menuPlayer;
const input={keys:new Set(),move:V(),jump:false,dive:false};
let lastTime=performance.now(),pauseState='';

function movementInput(){
  const k=input.keys;let f=(k.has('KeyW')||k.has('ArrowUp')?1:0)-(k.has('KeyS')||k.has('ArrowDown')?1:0);
  let r=(k.has('KeyD')||k.has('ArrowRight')?1:0)-(k.has('KeyA')||k.has('ArrowLeft')?1:0);
  const mobile=window.mobileVector||{x:0,y:0};f+=mobile.y;r+=mobile.x;
  const m=camera.movementVector(f,r);const n=Math.hypot(m.x,m.z)||1;return f||r?V(m.x/n,0,m.z/n):V();
}
function handleHit(){
  if(!engine||!engine.human)return;
  if(engine.state==='serving'){engine.requestAction('serve',camera.getLookVector());return;}
  const p=engine.human;
  const act=(!p.grounded||engine.ball.pos.y>p.pos.y+5.2)?'spike':'bump';
  engine.requestAction(act,camera.getLookVector());
}
function setCameraMode(){
  const active=camera.toggleShiftLock();document.body.classList.toggle('shiftlocked',active);events.emit('toast',{message:active?'SHIFTLOCK ON':'SHIFTLOCK OFF'});
}
function bindInputs(){
  window.addEventListener('keydown',e=>{
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
    if(e.repeat)return;
    if(e.code==='ShiftLeft'||e.code==='ShiftRight'){setCameraMode();return;}
    if(e.code==='F11'){e.preventDefault();if(!document.fullscreenElement)document.getElementById('game-root').requestFullscreen?.();else document.exitFullscreen?.();return;}
    if(e.code==='Escape'){// do not bind Escape to in-game menus; leave browser behavior alone
      return;
    }
    input.keys.add(e.code);
    if(e.code==='Space')input.jump=true;
    if(e.code==='ControlLeft'||e.code==='ControlRight')input.dive=true;
    if(e.code==='KeyQ'||e.code==='KeyE')engine?.requestAction('set',camera.getLookVector());
    if(e.code==='KeyR')engine?.requestAction('block',camera.getLookVector());
    if(e.code==='KeyF')engine?.activateAbility();
  });
  window.addEventListener('keyup',e=>{input.keys.delete(e.code);if(e.code==='Space')input.jump=false;if(e.code==='ControlLeft'||e.code==='ControlRight')input.dive=false;});
  canvas.addEventListener('pointerdown',e=>{if(e.button===0)handleHit();});
  window.addEventListener('resize',()=>camera?.resize());
  const stick=document.getElementById('virtual-stick');let stickPointer=null;
  stick.addEventListener('pointerdown',e=>{stickPointer=e.pointerId;stick.setPointerCapture(stickPointer);moveStick(e);});
  stick.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer)moveStick(e);});
  const resetStick=()=>{stickPointer=null;window.mobileVector={x:0,y:0};stick.querySelector('span').style.transform='translate(0px,0px)';};
  stick.addEventListener('pointerup',resetStick);stick.addEventListener('pointercancel',resetStick);
  function moveStick(e){const r=stick.getBoundingClientRect();const dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);const d=Math.hypot(dx,dy),scale=d>38?38/d:1;const x=dx*scale,y=dy*scale;stick.querySelector('span').style.transform=`translate(${x}px,${y}px)`;window.mobileVector={x:x/38,y:-y/38};}
  document.querySelectorAll('[data-touch]').forEach(b=>{
    const action=b.dataset.touch;const run=e=>{e.preventDefault();if(action==='jump')input.jump=true;else if(action==='hit')handleHit();else if(action==='set')engine?.requestAction('set',camera.getLookVector());else if(action==='ability')engine?.activateAbility();};
    b.addEventListener('pointerdown',run);b.addEventListener('pointerup',()=>{if(action==='jump')input.jump=false;});b.addEventListener('pointercancel',()=>{if(action==='jump')input.jump=false;});
  });
  events.on('sensitivity',d=>{camera.sensitivity=d.value;});
}

async function boot(){
  document.getElementById('loading').classList.remove('done');
  const bridgeState=await bridge.init(paused=>{
    if(!engine)return;
    if(paused&&engine.state!=='paused'){pauseState=engine.state;engine.state='paused';}
    else if(!paused&&engine.state==='paused'){engine.state=pauseState||'rally';pauseState='';}
  },enabled=>{document.body.dataset.audio=enabled?'on':'off';});
  profile=await bridge.loadProfile();
  profile.settings=profile.settings||{sensitivity:1,botLevel:'normal',brightness:1};
  camera=new CameraRig(canvas);camera.sensitivity=profile.settings.sensitivity||1;
  renderer=new ArenaRenderer(canvas,camera);
  engine=new MatchEngine(events,profile);
  ui=new UIController(events,profile,p=>bridge.saveProfile(p));
  ui.onJoin=(team,role)=>{camera.yaw=team==='A'?0:Math.PI;engine.start(team,role);bridge.levelStarted();};
  menuPlayer={id:'menu',team:'A',role:'Spiker',isHuman:true,pos:V(0,0,39),yaw:Math.PI,rig:new CharacterRig()};
  bindInputs();
  requestAnimationFrame(()=>{
    bridge.sendReady();
    document.getElementById('loading').classList.add('done');
  });
  events.on('match-end',async()=>{await bridge.saveProfile(profile);bridge.levelCompleted();});
  events.on('point',async()=>{await bridge.saveProfile(profile);});
  frame();
}
function frame(now=performance.now()){
  const dt=Math.min(.04,(now-lastTime)/1000);lastTime=now;
  if(engine&&camera&&renderer){
    input.move=movementInput();
    engine.update(dt,input);
    renderer.render(engine,menuPlayer);
  }
  requestAnimationFrame(frame);
}
boot().catch(error=>{console.error(error);document.getElementById('loading').innerHTML='<strong>LOAD FAILED</strong><span>refresh to retry the arena</span>';});
