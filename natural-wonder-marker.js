// Survey symbols remain readable without fetching illustration assets.
const symbols={
  laBrea:'M-9 4 Q-6 -1 -1 0 Q5 -2 9 3 Q6 7 -2 7 Q-7 7 -9 4 Z M-5 2 Q-2 4 0 2 M3 0 Q7 -3 5 -7 Q3 -6 3 -3',
  topanga:'M-10 -5 L-5 -2 L-7 0 L-1 5 M10 -7 L5 -3 L7 -1 L2 3 L3 6 M-8 6 Q-3 4 0 7 L4 7',
  mountTam:'M-10 6 L-6 1 L-3 2 L2 -7 L10 5 M-3 2 L2 -2 L4 0 M-7 7 Q0 3 8 7',
  southBayMarsh:'M-10 6 Q-7 3 -3 5 Q1 8 8 5 M-5 3 Q-5 -2 -8 -5 M-5 3 Q-3 -2 -2 -5 M3 4 Q3 -2 1 -6 M4 3 Q5 -2 8 -4',
  torreyPines:'M-8 6 Q-3 4 1 6 L8 7 M-2 5 Q1 0 0 -5 M0 0 L-5 -3 M0 -2 L5 -5 M-9 -3 Q-9 -7 -3 -7 L0 -8 Q4 -10 7 -6 Q11 -5 8 -3 L4 -2 L1 -4 Q-5 0 -9 -3',
  cabrilloTidePools:'M-9 3 Q-9 -1 -4 -2 Q0 -2 1 1 Q0 5 -4 5 Q-8 6 -9 3 Z M2 -4 Q4 -7 8 -5 Q10 -2 7 0 Q2 1 2 -4 Z M0 7 Q4 4 9 5',
  ballonaWetlands:'M-10 5 Q-5 2 0 5 T10 5 M-7 8 Q-2 6 3 8 M-9 -3 Q-6 -5 -3 -1 Q0 -6 4 -5 M2 -2 Q4 -4 6 -2 Q8 -5 10 -4',
  muirWoods:'M-8 6 L-8 2 L-10 2 L-7 -4 L-5 2 L-6 2 L-6 6 M-3 7 L-3 1 L-6 1 L-1 -9 L3 1 L0 1 L0 7 M4 6 L4 2 L2 2 L6 -5 L9 2 L7 2 L7 6',
  missionGorge:'M-10 -6 L-4 -2 L-6 0 L-2 3 M10 -5 L6 -3 L7 -1 L3 2 M1 -1 Q-2 1 1 3 Q5 5 -2 8 M-7 4 L-5 5 M6 4 L8 3'
};
const glyphs=new Map();

export function drawNaturalWonder(g,id,x,y,scale) {
  if(!symbols[id])return;
  if(!glyphs.has(id))glyphs.set(id,new Path2D(symbols[id]));
  g.save();
  g.translate(x,y-2);
  const size=Math.max(.9,Math.min(1.45,1.12/scale));
  g.scale(size,size);
  g.beginPath();g.arc(0,0,12,0,Math.PI*2);
  g.fillStyle='#1b4542';g.fill();g.strokeStyle='#ead9a6';g.lineWidth=1.6;g.stroke();
  g.strokeStyle='#f9e7b6';g.lineWidth=1.22;g.lineJoin='round';g.lineCap='round';
  g.stroke(glyphs.get(id));g.restore();
}
