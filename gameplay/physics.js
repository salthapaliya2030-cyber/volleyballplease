export const V=(x=0,y=0,z=0)=>({x,y,z});
export const add=(a,b)=>V(a.x+b.x,a.y+b.y,a.z+b.z);
export const sub=(a,b)=>V(a.x-b.x,a.y-b.y,a.z-b.z);
export const scale=(a,s)=>V(a.x*s,a.y*s,a.z*s);
export const length=a=>Math.hypot(a.x,a.y,a.z);
export const normalize=a=>{const n=length(a)||1;return scale(a,1/n);};
export const distance=(a,b)=>length(sub(a,b));
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const sideSign=team=>team==='A'?1:-1;

export class BallPhysics {
  constructor(){this.radius=.52;this.reset(V(0,3,40));}
  reset(pos){this.pos={...pos};this.vel=V();this.active=false;this.lastTouchTeam=null;this.touches=0;this.previousZ=pos.z;this.spin=0;}
  launch(velocity,team,touches=this.touches){this.vel={...velocity};this.active=true;this.lastTouchTeam=team;this.touches=touches;}
  update(dt){if(!this.active)return;this.previousZ=this.pos.z;this.vel.y-=25*dt;this.pos.x+=this.vel.x*dt;this.pos.y+=this.vel.y*dt;this.pos.z+=this.vel.z*dt;this.spin+=dt*11;this.vel.x*=Math.pow(.999,dt*60);this.vel.z*=Math.pow(.999,dt*60);}
}
