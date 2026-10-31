export const STYLES={
  rookie:{name:'Rookie',rarity:'Common',weight:65,power:1,speed:1,jump:1,defense:1,ability:'Quick Step'},
  libero:{name:'Aerial',rarity:'Rare',weight:22,power:1.08,speed:1.12,jump:1.12,defense:1.15,ability:'Boom Jump'},
  ace:{name:'Ace',rarity:'Legendary',weight:10,power:1.3,speed:1.08,jump:1.25,defense:1.1,ability:'Steel Block'},
  titan:{name:'Titan',rarity:'Godly',weight:2.5,power:1.55,speed:1.02,jump:1.35,defense:1.45,ability:'Shield Breaker'},
  eclipse:{name:'Eclipse',rarity:'Secret',weight:.5,power:1.8,speed:1.25,jump:1.55,defense:1.65,ability:'Magnetic Pull'}
};
export function rollStyle(){const r=Math.random()*100;let sum=0;for(const [id,s] of Object.entries(STYLES)){sum+=s.weight;if(r<sum)return id;}return 'rookie';}
export function rarityColor(r){return ({Common:'#ffc969',Rare:'#67cbff',Legendary:'#83f0af',Godly:'#b998ff',Secret:'#ff83b6'})[r]||'#fff';}
export function styleStats(profile){return STYLES[profile.style]||STYLES.rookie;}
