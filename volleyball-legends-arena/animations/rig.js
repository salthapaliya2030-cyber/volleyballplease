export const TRACKS={
  idle:{duration:.9,contact:null,pose:t=>({arm:.04*Math.sin(t*6),leg:0,lean:0})},
  run:{duration:.55,contact:null,loop:true,pose:t=>({arm:Math.sin(t*12)*.62,leg:Math.sin(t*12)*.5,lean:.08})},
  jump:{duration:.62,contact:null,pose:t=>({arm:-.65,leg:-.35,lean:-.1})},
  bump:{duration:.56,contact:.31,pose:t=>({arm:t<.31?-.45+t*1.2:.3-(t-.31)*1.8,leg:.12,lean:.24})},
  set:{duration:.62,contact:.35,pose:t=>({arm:t<.35?-.55+t*1.6:0.1-(t-.35),leg:0,lean:-.12})},
  spike:{duration:.7,contact:.39,pose:t=>({arm:t<.39?-1.1+t*2.1:.25-(t-.39)*1.8,leg:-.38,lean:.24})},
  serve:{duration:.72,contact:.42,pose:t=>({arm:t<.42?-.9+t*1.6:.25-(t-.42),leg:0,lean:.18})},
  dive:{duration:.85,contact:.45,pose:t=>({arm:-.8,leg:-.65,lean:Math.min(1,t*2)})},
  stun:{duration:2,contact:null,pose:t=>({arm:.15,leg:.72,lean:.5})}
};

export class CharacterRig {
  constructor(){this.track='idle';this.elapsed=0;this.finished=true;this.pose=TRACKS.idle.pose(0);this.contactFired=false;this.onContact=null;}
  play(name,onContact=null){const track=TRACKS[name]||TRACKS.idle;this.track=name;this.elapsed=0;this.finished=false;this.contactFired=false;this.onContact=onContact;this.pose=track.pose(0);}
  update(dt){if(this.finished)return;const t=TRACKS[this.track];this.elapsed+=dt;this.pose=t.pose(this.elapsed);
    if(t.contact!==null&&!this.contactFired&&this.elapsed>=t.contact){this.contactFired=true;this.onContact?.();}
    if(this.elapsed>=t.duration){if(t.loop){this.elapsed%=t.duration;}else{this.finished=true;this.track='idle';this.pose=TRACKS.idle.pose(0);}}
  }
}
