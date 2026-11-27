function polygon(g, points, fill, stroke) {
  g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();
  g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=1.1;g.stroke();}
}
// At map scale, the lookout has a raised spyglass and the raider carries
// a broad striped shield. The little pennant belongs to the camp itself.
function patrolFigure(g,x,raider) {
  g.save();g.translate(x,3);
  polygon(g,[[-4,4],[-3,-3],[0,-5],[3,-1],[4,5]],raider?'#825249':'#896343','#47372d');
  polygon(g,[[-3,4],[-1,4],[-2,10],[-5,10]],'#594636','#42352d');
  polygon(g,[[1,4],[3,4],[5,9],[3,10]],'#655039','#42352d');
  g.fillStyle='#c99569';g.beginPath();g.ellipse(0,-7,3,3.5,0,0,Math.PI*2);g.fill();
  polygon(g,[[-4,-8],[-2,-11],[2,-11],[4,-8]],'#8b5140','#43342d');
  if (raider) {
    polygon(g,[[-7,-4],[-3,-5],[0,-3],[-1,3],[-4,6],[-7,2]],'#ae634c','#3c3330');
    polygon(g,[[-6,-1],[-1,-3],[-1,-1],[-6,1]],'#edcc8f');
  } else {
    g.beginPath();g.moveTo(1,-3);g.lineTo(4,-6);g.lineTo(1,-8);
    g.strokeStyle='#d5a372';g.lineWidth=2;g.stroke();
    g.beginPath();g.moveTo(1,-8);g.lineTo(9,-10);
    g.strokeStyle='#41332b';g.lineWidth=2.7;g.stroke();
  }
  g.restore();
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
      const raider=piece.type==='raider';
      if(raider)patrolFigure(g,4,true);
      patrolFigure(g,raider?-6:0,raider);
      // Match the camp pennant on the counter; the glyph survives zoom-out.
      polygon(g,[[5,-14],[9,-18],[15,-15],[15,-9],[10,-5],[5,-8]],'#8c443a','#f4c289');
      g.fillStyle='#ffe1ae';g.font='bold 9px Georgia,serif';g.textAlign='center';g.fillText(raider?'×':'◇',10,-9);

    }
    if (piece.hp<piece.maxHp) {
      g.fillStyle='#312725';g.fillRect(-12,11,24,3);
      g.fillStyle='#ec9b63';g.fillRect(-12,11,24*piece.hp/piece.maxHp,3);
    }
    g.restore();
  }
}
