import {RESOURCES} from './resources.js';

// Small geology-map medallions; each remains recognizable without color.
export function drawResource(g, x, y, key) {
  const item=RESOURCES[key];
  if (!item) return;
  g.save();
  g.translate(x+17,y+11);
  g.beginPath(); g.arc(0,0,7.2,0,Math.PI*2); g.fillStyle='#173137'; g.fill();
  g.strokeStyle=item.color; g.lineWidth=1.1; g.stroke();
  g.fillStyle=item.color; g.lineJoin='round'; g.lineCap='round'; g.lineWidth=1.25;
  const line=(points,fill=false)=>{
    g.beginPath();
    points.forEach(([a,b],i)=>i ? g.lineTo(a,b) : g.moveTo(a,b));
    if (fill) {g.closePath();g.fill();} else g.stroke();
  };
  if(key==='grain') {
    line([[-2,5],[1,-4]]);for(const [a,b] of [[0,0],[1,-3],[-1,3]]){line([[a,b],[a-2,b-3]]);line([[a,b],[a+3,b-2]]);}
  } else if(key==='citrus') {
    g.beginPath();g.arc(0,1,3.4,0,Math.PI*2);g.fill();line([[0,-2],[1,-4],[4,-5]]);
  } else if(key==='timber') {
    line([[0,-5],[-4,2],[-1,2],[-1,5],[1,5],[1,2],[4,2]],true);
  } else if(key==='fish') {
    line([[-5,0],[-2,-2.4],[1,-2],[3,0],[5,-2.5],[5,2.5],[3,1],[0,3],[-3,2]],true);
  } else if(key==='iron') {
    line([[0,-5],[4,-1],[1,5],[-4,1]],true);g.strokeStyle='#6c5159';line([[-1,3],[0,-3],[2,-1]]);
  } else {
    line([[-5,3],[-3,-2],[1,-4],[5,1],[3,4]],true);g.strokeStyle='#806e60';line([[-3,-1],[1,0],[3,3]]);
  }
  g.restore();
}
