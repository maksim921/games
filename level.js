// Deterministic within one run: retries preserve the exact route.
export function randomFromSeed(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function generateLevel(level, seed) {
  const random = randomFromSeed((seed ^ Math.imul(level, 2654435761)) >>> 0);
  const difficulty = 1 - Math.exp(-(level - 1) / 12);
  const platforms = [{x:0,y:490,w:170,h:50,ground:true}];
  let y = 490;
  for (let i=0;i<5;i++) {
    const rise = 45 + Math.round(random()*15 + difficulty*10);
    y = i === 0 ? y-rise : Math.max(225, Math.min(425, y + (random()<0.3 ? 40+random()*25 : -rise)));
    const x = 205 + i*152 + Math.round(random()*12);
    const w = Math.round(134 - difficulty*37 - random()*8);
    platforms.push({x,y:Math.round(y),w,h:18});
  }
  const hazards = [{x:260,y:510,w:700,h:30,floor:true}];
  const spikeCount = Math.min(3, Math.floor((level-1)/3));
  for(let i=0;i<spikeCount;i++) {
    const p = platforms[i+2];
    hazards.push({x:p.x+p.w-22,y:p.y-16,w:20,h:16});
  }
  const items = [1,2,4].map((index,i) => {
    const p=platforms[index];
    return {x:p.x+31,y:p.y-25,r:12,label:String(i+1),collected:false};
  });
  const last=platforms[5];
  return {platforms,hazards,items,difficulty,
    finish:{x:last.x+last.w-48,y:last.y-60,w:42,h:60}};
}
