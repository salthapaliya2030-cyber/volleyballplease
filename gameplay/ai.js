import {distance,sideSign,V,clamp} from './physics.js';

export class BotBrain {
  constructor(engine){this.engine=engine;this.cooldowns=new Map();this.thinkTimer=0;}
  update(dt){this.thinkTimer-=dt;if(this.thinkTimer>0)return;this.thinkTimer=.13;const e=this.engine,b=e.ball;if(!b.active)return;
    const defendingTeam=b.pos.z>=0?'A':'B';
    if(b.touches===0&&b.lastTouchTeam===defendingTeam)return;
    const candidates=e.players.filter(p=>!p.isHuman&&p.team===defendingTeam&&p.state!=='stunned');
    if(!candidates.length)return;
    const targetX=clamp(b.pos.x,-22,22),targetZ=clamp(b.pos.z+sideSign(defendingTeam)*2,defendingTeam==='A'?3:-47,defendingTeam==='A'?47:-3);
    let chosen=candidates.sort((a,c)=>distance(a.pos,{x:targetX,y:a.pos.y,z:targetZ})-distance(c.pos,{x:targetX,y:c.pos.y,z:targetZ}))[0];
    const d=distance(chosen.pos,{x:targetX,y:0,z:targetZ});
    chosen.aiTarget={x:targetX,z:targetZ};
    if(d<5.2&&b.pos.y<14&&b.pos.y>1.2&&!this.cooldowns.has(chosen.id)){
      const level=e.profile.settings?.botLevel||'normal';const delay=level==='easy'?.72+Math.random()*.3:level==='hard'?.28+Math.random()*.22:.46+Math.random()*.27;this.cooldowns.set(chosen.id,delay);
      const role=chosen.role;let action;
      if(b.touches===0)action='bump';else if(b.touches===1)action='set';else action='spike';
      if(role==='Libero'&&b.touches===0)action='bump';
      if(role==='Setter'&&b.touches<=1)action='set';
      if(action==='spike'&&chosen.pos.y<1)chosen.velocity.y=11;
      e.performBotAction(chosen,action);
    }
    for(const [id,t] of this.cooldowns){const next=t-dt;if(next<=0)this.cooldowns.delete(id);else this.cooldowns.set(id,next);}
  }
}
