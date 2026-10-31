const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const mul=(a,s)=>({x:a.x*s,y:a.y*s,z:a.z*s});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const norm=v=>{const m=Math.hypot(v.x,v.y,v.z)||1;return mul(v,1/m)};

export class CameraRig {
  constructor(canvas) {
    this.canvas=canvas; this.yaw=0; this.pitch=.17; this.distance=18; this.sensitivity=1;
    this.shiftLock=false; this.dragging=false; this.lastX=0; this.lastY=0; this.forward={x:0,y:0,z:-1};
    this.width=canvas.clientWidth||innerWidth; this.height=canvas.clientHeight||innerHeight;
    this.resize();
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('pointerdown',e=>{if(e.button===2&&!this.shiftLock){this.dragging=true;this.lastX=e.clientX;this.lastY=e.clientY;}});
    window.addEventListener('pointerup',()=>this.dragging=false);
    window.addEventListener('pointermove',e=>{
      if(!this.dragging&&!this.shiftLock)return;
      const locked=document.pointerLockElement===this.canvas;const dx=locked?e.movementX:e.clientX-this.lastX,dy=locked?e.movementY:e.clientY-this.lastY;this.lastX=e.clientX;this.lastY=e.clientY;
      this.yaw-=dx*.005*this.sensitivity;this.pitch=Math.max(-.35,Math.min(.62,this.pitch+dy*.0038*this.sensitivity));
    });
    window.addEventListener('wheel',e=>{this.distance=Math.max(11,Math.min(27,this.distance+Math.sign(e.deltaY)*1.2));},{passive:true});
  }
  resize(){this.width=this.canvas.width=Math.max(1,Math.floor(innerWidth*devicePixelRatio));this.height=this.canvas.height=Math.max(1,Math.floor(innerHeight*devicePixelRatio));this.canvas.style.width=innerWidth+'px';this.canvas.style.height=innerHeight+'px';}
  toggleShiftLock(){this.shiftLock=!this.shiftLock;if(this.shiftLock){this.canvas.requestPointerLock?.();}else if(document.pointerLockElement)document.exitPointerLock?.();return this.shiftLock;}
  update(player){
    const cp=Math.cos(this.pitch),sp=Math.sin(this.pitch),sy=Math.sin(this.yaw),cy=Math.cos(this.yaw);
    const target={x:player.pos.x,y:player.pos.y+2.15,z:player.pos.z};
    const offset={x:sy*this.distance*cp,y:7.3+sp*this.distance,z:cy*this.distance*cp};
    this.position=add(target,offset);this.target=target;
    this.forward=norm(sub(target,this.position));
    this.right=norm(cross(this.forward,{x:0,y:1,z:0}));
    this.up=norm(cross(this.right,this.forward));
  }
  project(p){
    const r=sub(p,this.position),z=dot(r,this.forward),x=dot(r,this.right),y=dot(r,this.up);
    if(z<.1)return null;
    const f=Math.min(this.width,this.height)*.96;
    return {x:this.width*.5+(x/z)*f,y:this.height*.5-(y/z)*f,z,scale:f/z};
  }
  movementVector(forward,right){
    const yaw=this.yaw;
    const f={x:-Math.sin(yaw),z:-Math.cos(yaw)},r={x:Math.cos(yaw),z:-Math.sin(yaw)};
    return {x:f.x*forward+r.x*right,z:f.z*forward+r.z*right};
  }
  getLookVector(){return {...this.forward};}
}
