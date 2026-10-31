import {V,sideSign} from '../gameplay/physics.js';

export class ArenaRenderer {
  constructor(canvas,camera){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.camera=camera;this.time=0;this.resizeObserver=new ResizeObserver(()=>this.camera.resize());this.resizeObserver.observe(canvas);}
  render(engine,menuPlayer){
    const ctx=this.ctx,w=this.canvas.width,h=this.canvas.height;this.time+=1/60;
    const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#081127');sky.addColorStop(.55,'#111d37');sky.addColorStop(1,'#060a14');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    this.drawArenaGlow(ctx,w,h);
    const players=engine?.players?.length?engine.players:[menuPlayer];
    const human=players.find(p=>p?.isHuman)||menuPlayer;if(human)this.camera.update(human);
    this.drawCourt(ctx);
    if(engine?.ball){this.drawShadow(ctx,engine.ball);}
    const depthSorted=[...players].sort((a,b)=>this.camera.project(b.pos)?.z-this.camera.project(a.pos)?.z);
    for(const p of depthSorted)this.drawPlayer(ctx,p);
    if(engine?.ball?.active||engine?.state==='serving')this.drawBall(ctx,engine.ball);
    if(engine?.ball&&engine.ball.active)this.drawTrajectoryHint(ctx,engine.ball);
    this.drawVignette(ctx,w,h);
  }
  drawArenaGlow(ctx,w,h){
    const center=ctx.createRadialGradient(w*.5,h*.5,0,w*.5,h*.5,Math.max(w,h)*.65);
    center.addColorStop(0,'rgba(53,119,186,.11)');center.addColorStop(.55,'rgba(17,45,81,.12)');center.addColorStop(1,'rgba(0,0,0,.3)');ctx.fillStyle=center;ctx.fillRect(0,0,w,h);
    ctx.save();ctx.globalAlpha=.16;ctx.strokeStyle='#6dcaff';ctx.lineWidth=1;
    for(let i=0;i<9;i++){const y=h*.08+i*h*.1;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}ctx.restore();
  }
  polygon(ctx,points,fill,stroke=null,width=1){const ps=points.map(p=>this.camera.project(p));if(ps.some(p=>!p))return;ctx.beginPath();ctx.moveTo(ps[0].x,ps[0].y);for(let i=1;i<ps.length;i++)ctx.lineTo(ps[i].x,ps[i].y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
  line(ctx,a,b,color='#fff',width=1,alpha=1){const p=this.camera.project(a),q=this.camera.project(b);if(!p||!q)return;ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.restore();}
  drawCourt(ctx){
    const z1=-50,z2=50;
    this.polygon(ctx,[V(-25,0,z1),V(25,0,z1),V(25,0,z2),V(-25,0,z2)],'#162d45','#b4def6',2);
    this.polygon(ctx,[V(-25,0,-50),V(25,0,-50),V(25,0,50),V(-25,0,50)],'rgba(30,64,91,.78)');
    // hardwood lanes and center stripe
    for(let z=-45;z<=45;z+=10){this.line(ctx,V(-25,.015,z),V(25,.015,z),z===0?'#f6fbff':'#7fb6d1',z===0?2.5:1,.42);}
    this.line(ctx,V(-25,.025,-50),V(25,.025,-50),'#e1f5ff',2,.9);this.line(ctx,V(-25,.025,50),V(25,.025,50),'#e1f5ff',2,.9);
    this.line(ctx,V(-25,.025,-50),V(-25,.025,50),'#e1f5ff',2,.9);this.line(ctx,V(25,.025,-50),V(25,.025,50),'#e1f5ff',2,.9);
    this.line(ctx,V(-25,.03,-16.7),V(25,.03,-16.7),'#c2ecff',1.5,.55);this.line(ctx,V(-25,.03,16.7),V(25,.03,16.7),'#c2ecff',1.5,.55);
    // service and center markings
    this.line(ctx,V(0,.03,-50),V(0,.03,50),'#78bce5',1,.12);
    // posts and net plane
    this.line(ctx,V(-26,0,0),V(-26,10,0),'#d4efff',5,.9);this.line(ctx,V(26,0,0),V(26,10,0),'#d4efff',5,.9);
    this.polygon(ctx,[V(-25,8.9,0),V(25,8.9,0),V(25,10,0),V(-25,10,0)],'#f2f8ff','#ffffff',1);
    for(let x=-24;x<=24;x+=2.1)this.line(ctx,V(x,.2,0),V(x,8.9,0),'#e5f3fb',.7,.24);
    for(let y=1;y<9;y+=1.25)this.line(ctx,V(-25,y,0),V(25,y,0),'#e5f3fb',.7,.24);
    // boundary lamps and distant stands
    for(let x=-24;x<=24;x+=8){this.line(ctx,V(x,0,-53),V(x,13,-53),'#7ca7c9',2,.3);this.line(ctx,V(x,13,-53),V(x+2,13,-53),'#6dcaff',2,.22);}
    this.polygon(ctx,[V(-40,0,-57),V(40,0,-57),V(40,14,-57),V(-40,14,-57)],'rgba(9,16,31,.5)','rgba(101,166,206,.1)');
  }
  drawShadow(ctx,ball){
    const ground=this.camera.project(V(ball.pos.x,.03,ball.pos.z));if(!ground)return;
    const left=this.camera.project(V(ball.pos.x-1,0,ball.pos.z)),right=this.camera.project(V(ball.pos.x+1,0,ball.pos.z));
    const unit=left&&right?Math.abs(right.x-left.x)/2:5;const radius=unit*(1.3+Math.min(18,ball.pos.y)*.14);
    const alpha=Math.max(.07,.52-ball.pos.y*.022);ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#06101b';ctx.strokeStyle='#8deaff';ctx.lineWidth=Math.max(1,unit*.16);ctx.beginPath();ctx.ellipse(ground.x,ground.y,radius,radius*.37,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=alpha*.7;ctx.beginPath();ctx.ellipse(ground.x,ground.y,radius,radius*.37,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  drawPlayer(ctx,p){
    if(!p?.pos)return;const base=p.pos,pose=p.rig?.pose||{arm:0,leg:0,lean:0};const teamColor=p.team==='A'?'#38a8ff':'#ff5575';const dark=p.team==='A'?'#12385f':'#641f3b';
    const yaw=p.yaw||0,forward={x:Math.sin(yaw),z:-Math.cos(yaw)},right={x:Math.cos(yaw),z:Math.sin(yaw)};
    const point=(x,y,z=0)=>V(base.x+right.x*x+forward.x*z,base.y+y,base.z+right.z*x+forward.z*z);
    const foot=point(0,.05),hips=point(0,1.18),chest=point(0,2.05),head=point(0,3.18);
    const footP=this.camera.project(foot),hipP=this.camera.project(hips),chestP=this.camera.project(chest),headP=this.camera.project(head);if(!footP||!hipP||!chestP||!headP)return;
    const unit=chestP.scale,sw=Math.max(2,unit*.43),limb=Math.max(2,unit*.15);
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    // cast shadow / foot glow
    ctx.globalAlpha=.27;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(footP.x,footP.y,unit*.5,unit*.16,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    const lHip=this.camera.project(point(-.18,.9)),rHip=this.camera.project(point(.18,.9));
    const legSwing=pose.leg||0;const lFoot=this.camera.project(point(-.2,.12+Math.max(0,-legSwing)*.22,legSwing*.25));const rFoot=this.camera.project(point(.2,.12+Math.max(0,legSwing)*.22,-legSwing*.25));
    if(lHip&&lFoot){ctx.strokeStyle='#d6e8f7';ctx.lineWidth=limb*1.25;ctx.beginPath();ctx.moveTo(lHip.x,lHip.y);ctx.lineTo(lFoot.x,lFoot.y);ctx.stroke();}if(rHip&&rFoot){ctx.strokeStyle='#c6d9ed';ctx.lineWidth=limb*1.25;ctx.beginPath();ctx.moveTo(rHip.x,rHip.y);ctx.lineTo(rFoot.x,rFoot.y);ctx.stroke();}
    // shorts and torso
    ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(hipP.x-unit*.28,hipP.y);ctx.lineTo(hipP.x+unit*.28,hipP.y);ctx.lineTo(chestP.x+unit*.34,chestP.y);ctx.lineTo(chestP.x-unit*.34,chestP.y);ctx.closePath();ctx.fill();
    ctx.fillStyle=teamColor;ctx.beginPath();ctx.moveTo(chestP.x-unit*.32,chestP.y+unit*.08);ctx.lineTo(chestP.x+unit*.32,chestP.y+unit*.08);ctx.lineTo(hipP.x+unit*.24,hipP.y);ctx.lineTo(hipP.x-unit*.24,hipP.y);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=Math.max(1,unit*.035);ctx.beginPath();ctx.moveTo(chestP.x,chestP.y+unit*.12);ctx.lineTo(hipP.x,hipP.y-unit*.05);ctx.stroke();
    // arms animated toward contact pose
    const shoulderL=this.camera.project(point(-.36,2.02)),shoulderR=this.camera.project(point(.36,2.02));
    const armLift=pose.arm||0;const handL=this.camera.project(point(-.68,1.75+armLift*.8,0)),handR=this.camera.project(point(.68,1.75+Math.max(0,armLift)*1.2,0));
    for(const [s,e] of [[shoulderL,handL],[shoulderR,handR]])if(s&&e){ctx.strokeStyle='#e7f3ff';ctx.lineWidth=limb;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(e.x,e.y);ctx.stroke();ctx.fillStyle='#f3c7a9';ctx.beginPath();ctx.arc(e.x,e.y,Math.max(2,unit*.09),0,Math.PI*2);ctx.fill();}
    // head and hair
    const r=Math.max(4,unit*.22);ctx.fillStyle='#f2c9ac';ctx.beginPath();ctx.arc(headP.x,headP.y,r,0,Math.PI*2);ctx.fill();ctx.fillStyle=p.isHuman?'#131a2c':'#20243a';ctx.beginPath();ctx.arc(headP.x,headP.y-r*.18,r*1.04,Math.PI,Math.PI*2);ctx.fill();
    if(p.isHuman){ctx.strokeStyle='#f9e3a1';ctx.lineWidth=Math.max(1,unit*.04);ctx.beginPath();ctx.arc(chestP.x,chestP.y,unit*.43,0,Math.PI*2);ctx.stroke();}
    ctx.font=`${Math.max(7,unit*.26)}px Inter`;ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText(p.isHuman?'YOU':p.role.toUpperCase(),headP.x,headP.y-r*1.9);
    ctx.restore();
  }
  drawBall(ctx,ball){
    if(!ball)return;const p=this.camera.project(ball.pos);if(!p)return;const r=Math.max(3,p.scale*.52);ctx.save();ctx.shadowBlur=r*2.4;ctx.shadowColor='#8feeff';ctx.fillStyle='#f7fbff';ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#247fc6';ctx.lineWidth=Math.max(1,r*.22);ctx.beginPath();ctx.arc(p.x,p.y,r*.78,-.9,1.35);ctx.stroke();ctx.strokeStyle='#ff647e';ctx.beginPath();ctx.arc(p.x,p.y,r*.78,2.2,4.4);ctx.stroke();ctx.restore();
  }
  drawTrajectoryHint(ctx,ball){
    if(!ball.active||ball.pos.y<2)return;const p=this.camera.project(V(ball.pos.x,0,ball.pos.z));if(!p)return;ctx.save();ctx.globalAlpha=.18;ctx.fillStyle='#70dcff';ctx.beginPath();ctx.arc(p.x,p.y,Math.max(4,p.scale*1.7),0,Math.PI*2);ctx.fill();ctx.restore();
  }
  drawVignette(ctx,w,h){const g=ctx.createRadialGradient(w*.5,h*.45,Math.min(w,h)*.18,w*.5,h*.5,Math.max(w,h)*.72);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.43)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
}
