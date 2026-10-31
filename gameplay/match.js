import {V,add,sub,scale,length,distance,clamp,sideSign,BallPhysics} from './physics.js';
import {CharacterRig} from '../animations/rig.js';
import {BotBrain} from './ai.js';
import {styleStats} from './profile.js';

const ROLES=['Spiker','Setter','Libero'];
const handHeight={bump:1.55,set:2.55,spike:3.35,serve:2.45,block:3.15};
const opposite=t=>t==='A'?'B':'A';
const teamAtZ=z=>z>=0?'A':'B';

export class MatchEngine {
  constructor(events,profile){
    this.events=events;this.profile=profile;this.ball=new BallPhysics();this.players=[];this.botBrain=new BotBrain(this);
    this.score={A:0,B:0};this.state='menu';this.matchNo=1;this.pointTimer=0;this.serveTimer=0;this.roundOver=false;this.ability=0;this.abilityActive=null;this.abilityTime=0;this.lastAction='';this.currentTeam='A';this.keys={};
  }
  createPlayer({id,team,role,x,z,isHuman=false}){
    return {id,team,role,isHuman,pos:V(x,0,z),velocity:V(),yaw:team==='A'?0:Math.PI,state:'idle',stun:0,recovery:0,grounded:true,rig:new CharacterRig(),aiTarget:null,actionLock:0,block:0};
  }
  start(team='A',role='Spiker'){
    this.currentTeam=team;this.score={A:0,B:0};this.players=[];this.roundOver=false;this.ability=0;this.abilityActive=null;
    const s=sideSign(team),human=this.createPlayer({id:'human',team,role,x:0,z:s*39,isHuman:true});
    this.human=human;this.players.push(human);
    const allyRoles=ROLES.filter(r=>r!==role);if(allyRoles.length<2)allyRoles.push('Libero');
    this.players.push(this.createPlayer({id:'ally-1',team,role:allyRoles[0],x:-10,z:s*22}));
    this.players.push(this.createPlayer({id:'ally-2',team,role:allyRoles[1],x:10,z:s*22}));
    const foe=opposite(team);this.players.push(this.createPlayer({id:'bot-1',team:foe,role:'Libero',x:0,z:-s*38}));
    this.players.push(this.createPlayer({id:'bot-2',team:foe,role:'Setter',x:-10,z:-s*20}));
    this.players.push(this.createPlayer({id:'bot-3',team:foe,role:'Spiker',x:10,z:-s*20}));
    this.human.pos.z=s*39;this.human.yaw=team==='A'?0:Math.PI;
    this.ball.reset(V(0,3.2,s*36));this.ball.active=false;
    this.state='serving';this.serveTimer=0;this.events.emit('match-start',{team,role});this.events.emit('score',this.score);this.events.emit('state',{state:this.state});
  }
  update(dt,input={}){
    if(this.state==='menu'||this.state==='finished'||this.state==='paused')return;
    dt=Math.min(dt,.04);
    for(const p of this.players){p.rig.update(dt);this.updatePlayer(p,dt,input);}
    if(this.state==='serving'){
      this.serveTimer+=dt;
      this.ball.pos={x:this.human.pos.x,y:3.2+Math.sin(this.serveTimer*3)*.1,z:this.human.pos.z-sideSign(this.human.team)*3};
      if(this.serveTimer>13){this.state='serving';this.serveTimer=0;}
    }else if(this.state==='rally'){
      this.ball.update(dt);this.botBrain.update(dt);this.updateAbility(dt);this.checkBallRules();
    } else if(this.state==='point'){
      this.pointTimer-=dt;if(this.pointTimer<=0)this.resetServe();
    }
  }
  updatePlayer(p,dt,input){
    if(p.stun>0){p.stun-=dt;p.state='stunned';p.velocity.x=0;p.velocity.z=0;if(p.stun<=0){p.state='idle';p.rig.play('idle');}return;}
    if(p.actionLock>0){p.actionLock=Math.max(0,p.actionLock-dt);}
    if(p.isHuman){
      const move=input.move||V();const style=styleStats(this.profile);
      const max=8.5*style.speed;const moving=length(move)>.05&&p.actionLock<=0;
      if(moving){const n=Math.hypot(move.x,move.z)||1;p.velocity.x=(move.x/n)*max;p.velocity.z=(move.z/n)*max;p.yaw=Math.atan2(p.velocity.x,-p.velocity.z);if(p.grounded&&p.state!=='running'){p.state='running';p.rig.play('run');}}
      else {p.velocity.x*=Math.pow(.0008,dt);p.velocity.z*=Math.pow(.0008,dt);if(p.grounded&&p.state==='running'){p.state='idle';p.rig.play('idle');}}
      if(input.jump&&p.grounded&&p.actionLock<=0){p.velocity.y=12.5*style.jump*(this.abilityActive==='Boom Jump'?1.6:1);p.grounded=false;p.state='airborne';p.rig.play('jump');if(this.abilityActive==='Boom Jump'){this.abilityActive=null;this.abilityTime=0;}}
      if(input.dive&&p.grounded&&p.actionLock<=0){p.velocity.x+=Math.sin(p.yaw)*10;p.velocity.z-=Math.cos(p.yaw)*10;p.state='recovering';p.recovery=.8;p.rig.play('dive');}
    }else if(p.aiTarget&&p.actionLock<=0){
      const dx=p.aiTarget.x-p.pos.x,dz=p.aiTarget.z-p.pos.z,d=Math.hypot(dx,dz);
      if(d>1.3){const sp=6.4;p.velocity.x=dx/d*sp;p.velocity.z=dz/d*sp;p.yaw=Math.atan2(p.velocity.x,-p.velocity.z);if(p.grounded&&p.state!=='running'){p.state='running';p.rig.play('run');}}
      else {p.velocity.x*=.5;p.velocity.z*=.5;if(p.grounded&&p.state==='running'){p.state='idle';p.rig.play('idle');}}
    }else{p.velocity.x*=.9;p.velocity.z*=.9;}
    p.velocity.y-=29*dt;p.pos.x+=p.velocity.x*dt;p.pos.y+=p.velocity.y*dt;p.pos.z+=p.velocity.z*dt;
    if(p.pos.y<=0){p.pos.y=0;p.velocity.y=0;p.grounded=true;if(p.state==='airborne')p.state='idle';}
    else p.grounded=false;
    if(p.recovery>0){p.recovery-=dt;if(p.recovery<=0&&p.state==='recovering')p.state='idle';}
    const sign=sideSign(p.team);p.pos.x=clamp(p.pos.x,-23,23);p.pos.z=clamp(p.pos.z,sign>0?3:-47,sign>0?47:-3);
  }
  requestAction(type,look=V(0,0,-1)){
    if(!this.human||this.state==='finished'||this.state==='point')return false;
    let action=type;
    if(this.state==='serving')action='serve';
    if(this.state!=='serving'&&this.state!=='rally')return false;
    return this.performAction(this.human,action,look);
  }
  performBotAction(player,action){
    if(!player||player.actionLock>0||this.state!=='rally')return;
    player.actionLock=.52;
    const track=action==='bump'?'bump':action==='set'?'set':'spike';
    player.rig.play(track,()=>this.resolveContact(player,action,V(player.team==='A'?0:0,0,player.team==='A'?-1:1)));
  }
  performAction(player,action,look=V(0,0,-1)){
    if(player.actionLock>0||player.stun>0)return false;
    if(action==='block'&&this.state==='rally'){
      if(!this.tryBlock(player))return false;
      return true;
    }
    const track=action==='serve'?'serve':action==='bump'?'bump':action==='set'?'set':'spike';
    if(action==='spike'&&player.grounded){player.velocity.y=11.5*styleStats(this.profile).jump;player.grounded=false;player.state='airborne';}
    player.actionLock=TRACK_DURATION(track);
    player.state='recovering';
    player.rig.play(track,()=>this.resolveContact(player,action,look));
    return true;
  }
  resolveContact(player,action,look){
    if(this.state==='serving'&&action==='serve'){
      const sign=sideSign(player.team);this.ball.reset(V(player.pos.x,3.8,player.pos.z-sign*2));
      this.ball.launch(V(look.x*4,17,-sign*29),player.team,0);this.state='rally';this.events.emit('state',{state:this.state});return;
    }
    if(this.state!=='rally')return;
    const h=V(player.pos.x,player.pos.y+handHeight[action],player.pos.z);
    const reach=action==='bump'?5.4:6.2;
    if(distance(h,this.ball.pos)>reach||teamAtZ(this.ball.pos.z)!==player.team){this.failContact(player);return;}
    const nextTouches=this.ball.touches+1;
    if(nextTouches>3){this.awardPoint(opposite(player.team),'four touches');return;}
    const style=player.isHuman?styleStats(this.profile):{power:1,jump:1,speed:1};
    let vel;
    if(action==='bump'){
      const setter=this.players.find(p=>p.team===player.team&&p.role==='Setter')||player;
      const tx=setter.pos.x*.45, tz=sideSign(player.team)*13;
      vel=V(clamp((tx-this.ball.pos.x)*.55,-8,8),16,clamp((tz-this.ball.pos.z)*.27,-7,7));
    }else if(action==='set'){
      const attacker=this.players.find(p=>p.team===player.team&&p.role==='Spiker')||player;
      const tx=attacker.pos.x*.65;
      vel=V(clamp((tx-this.ball.pos.x)*.38,-8,8),19,-sideSign(player.team)*4.8);
    }else{
      const side=sideSign(player.team);const aim=Number.isFinite(look.x)?look.x:0;
      vel=V(clamp(aim*28,-24,24)*style.power,-6,-side*34*style.power);
      if(this.abilityActive==='Shield Breaker'){vel.x*=1.15;this.abilityActive=null;}
    }
    this.ball.launch(vel,player.team,nextTouches);this.lastAction=action;if(player.isHuman){this.ability=clamp(this.ability+34,0,100);if(action==='spike')this.ability=clamp(this.ability+4,0,100);}
    this.events.emit('touch',{team:player.team,touches:nextTouches,action,player:player.id});
    if(player.isHuman)this.events.emit('toast',{message:`${action.toUpperCase()} · CONTACT!`});
  }
  failContact(player){player.stun=2;player.state='stunned';player.actionLock=2;player.rig.play('stun');if(player.isHuman)this.events.emit('toast',{message:'TOO LOW / LATE · 2 SECOND STUN'});this.events.emit('stun',{player:player.id});}
  tryBlock(player){
    const b=this.ball,enemySide=opposite(player.team);
    if(!b.active||teamAtZ(b.pos.z)!==enemySide||Math.abs(b.pos.z)>8||b.pos.y<2.2||b.pos.y>13)return false;
    if(distance(player.pos,V(b.pos.x,0,b.pos.z+sideSign(player.team)*3))>6)return false;
    player.rig.play('jump');player.velocity.y=11;player.grounded=false;
    const power=this.abilityActive==='Steel Block'?2.5:1;
    b.launch(V(-b.vel.x*.5,b.vel.y*.55,-b.vel.z*1.1*power),player.team,1);
    this.ability=clamp(this.ability+34,0,100);this.abilityActive=null;this.events.emit('toast',{message:'BLOCK!' });return true;
  }
  activateAbility(){
    if(this.ability<100||this.abilityActive||this.state!=='rally')return false;
    const ability=styleStats(this.profile).ability;
    this.ability=0;this.abilityActive=ability==='Quick Step'?'Boom Jump':ability;this.abilityTime=ability==='Magnetic Pull'?1.4:4;
    if(this.abilityActive==='Magnetic Pull'){
      const side=sideSign(this.human.team);this.ball.vel=V((this.human.pos.x-this.ball.pos.x)*2.2,Math.max(this.ball.vel.y,8),(this.human.pos.z-this.ball.pos.z)*1.8);this.ball.lastTouchTeam=opposite(this.human.team);this.ball.touches=0;
    }
    this.events.emit('ability',{value:0,name:this.abilityActive});this.events.emit('toast',{message:`${this.abilityActive.toUpperCase()} ACTIVATED`});return true;
  }
  updateAbility(dt){if(this.abilityActive){this.abilityTime-=dt;if(this.abilityActive==='Magnetic Pull'&&this.ball.active){this.ball.vel.x+=(this.human.pos.x-this.ball.pos.x)*dt*1.7;this.ball.vel.z+=(this.human.pos.z-this.ball.pos.z)*dt*1.7;}if(this.abilityTime<=0)this.abilityActive=null;}this.events.emit('ability',{value:this.ability,name:styleStats(this.profile).ability,active:this.abilityActive});}
  checkBallRules(){
    const b=this.ball;if(!b.active)return;
    if(Math.abs(b.pos.x)>26||Math.abs(b.pos.z)>52){this.awardPoint(b.lastTouchTeam?opposite(b.lastTouchTeam):'A','out');return;}
    if(b.previousZ!==0&&Math.sign(b.previousZ)!==Math.sign(b.pos.z)){
      if(b.touches>3){this.awardPoint(opposite(b.lastTouchTeam),'four touches');return;}
      b.touches=0;this.events.emit('touch-reset',{touches:0});
    }
    if(b.pos.y<=b.radius){const landingTeam=teamAtZ(b.pos.z);const winner=b.lastTouchTeam===landingTeam?opposite(landingTeam):(b.lastTouchTeam||opposite(landingTeam));this.awardPoint(winner,'floor');}
  }
  awardPoint(team,reason){if(this.state==='point'||this.state==='finished')return;this.score[team]++;this.state='point';this.pointTimer=1.35;this.ball.active=false;this.events.emit('score',this.score);this.events.emit('point',{team,reason,score:this.score});
    const winner=Object.entries(this.score).find(([t,s])=>s>=15&&s- this.score[opposite(t)]>=2);
    if(winner){this.state='finished';this.roundOver=true;const won=winner[0]===this.currentTeam;this.profile.yen+=won?300:80;if(won)this.profile.bestScore=Math.max(this.profile.bestScore,15);this.events.emit('match-end',{won,team:winner[0],score:this.score,reason});}
  }
  resetServe(){if(this.state==='finished')return;const s=sideSign(this.currentTeam);this.ball.reset(V(0,3.2,s*36));this.state='serving';this.serveTimer=0;this.players.forEach(p=>{p.pos.x=p.isHuman?0:(p.team===this.currentTeam?(p.id==='ally-1'?-10:10):(p.id==='bot-2'?-10:10));p.pos.z=sideSign(p.team)*(p.isHuman?39:24);p.pos.y=0;p.velocity=V();p.state='idle';p.stun=0;p.actionLock=0;p.rig.play('idle');});this.events.emit('state',{state:this.state});this.events.emit('toast',{message:'NEW SERVE · CLICK TO START'});}
  finishToMenu(){this.state='menu';this.events.emit('return-menu',{});}
}
function TRACK_DURATION(name){return ({serve:.72,bump:.56,set:.62,spike:.7,block:.55})[name]||.6;}
