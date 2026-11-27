function polygon(g, points, fill, stroke) {
  g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();
  g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=1.1;g.stroke();}
}
export function drawBarbarians(g,model,position) {
  const territory=model.state?.barbarians;
  if (!territory) return;
  const shown=model.state?.intel?.visible;
  const visible=shown ? new Set(shown) : null;
  for (const piece of [...territory.camps,...territory.parties]) {
    if (visible && !visible.has(piece.tile)) continue;
    const tile=model.byId.get(piece.tile); if(!tile)continue;
    const [x,y]=position(tile.q,tile.r);
    g.save();g.translate(x,y);
    g.fillStyle='#281e227a';g.beginPath();g.ellipse(2,9,19,6,0,0,Math.PI*2);g.fill();
    if (piece.type==='camp') {
      polygon(g,[[-18,7],[-8,-9],[3,6],[-6,10]],'#b5a077','#453c32');
      polygon(g,[[-7,7],[4,-12],[17,8],[6,10]],'#d9b481','#493a31');
      polygon(g,[[0,8],[4,-2],[8,9]],'#453731');
      g.strokeStyle='#463529';g.lineWidth=2;g.beginPath();g.moveTo(10,5);g.lineTo(10,-19);g.stroke();
      polygon(g,[[11,-19],[21,-17],[17,-13],[11,-14]],'#ae4c3f','#6c372c');
    } else {
      polygon(g,[[0,-16],[8,-7],[8,2],[0,9],[-8,2],[-8,-7]],'#7c453d','#f4c289');
      g.fillStyle='#ffe1ae';g.font='bold 12px Georgia,serif';g.textAlign='center';g.fillText('◇',0,1);
    }
    if (piece.hp<piece.maxHp) {
      g.fillStyle='#312725';g.fillRect(-12,11,24,3);
      g.fillStyle='#ec9b63';g.fillRect(-12,11,24*piece.hp/piece.maxHp,3);
    }
    g.restore();
  }
}
