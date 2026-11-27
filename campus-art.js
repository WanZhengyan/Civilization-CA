// Small, oblique silhouettes keep the four university plans legible at map zoom.
const wall='#d6c397',shade='#907f64',gold='#e7ce8c',bronze='#8c664e',red='#974f3b';
function polygon(g,points,color){
  g.beginPath();g.moveTo(...points[0]);for(const p of points.slice(1))g.lineTo(...p);
  g.closePath();g.fillStyle=color;g.fill();
}
function block(g,x,y,w,d,h,front=wall,roof='#a89070'){
  polygon(g,[[x-w,y],[x,y+d],[x,y+d-h],[x-w,y-h]],front);
  polygon(g,[[x,y+d],[x+w,y],[x+w,y-h],[x,y+d-h]],shade);
  polygon(g,[[x-w,y-h],[x,y-d-h],[x+w,y-h],[x,y+d-h]],roof);
}
function tower(g,x,y,w,h,roof,front=wall){
  block(g,x,y,w,w*.48,h,front);
  polygon(g,[[x-w-1,y-h],[x,y-h-4],[x+w+1,y-h],[x,y-h+w*.48]],roof);
  g.fillStyle='#465455';g.fillRect(x-1,y-h+2,1.1,2.5);
}
function arcade(g,x,y,n,step){
  g.fillStyle='#645a51';
  for(let i=0;i<n;i++)g.fillRect(x+i*step,y+i*1.05,1.1,2.6);
}
export function drawCampus(g,id,x,y,color){
  g.save();g.translate(x,y+4);g.scale(1.45,1.45);
  polygon(g,[[-16,0],[0,-7],[16,0],[0,8]],'#789176');
  polygon(g,[[-13,1],[1,-5],[14,1],[0,7]],'#c3b78e');
  if(id==='ucla'){
    block(g,0,1,9,4,6,'#c88a69','#b96950');arcade(g,-7,-4,4,2);
    tower(g,-7,-1,2.8,11,red,'#c58b70');tower(g,7,1,2.8,12,red,'#c58b70');
  }else if(id==='stanford'){
    block(g,0,2,10,4,4,wall,'#ae6b4c');arcade(g,-8,-2,5,2);
    tower(g,4,-2,2.7,15,'#ac7351');g.fillStyle=gold;g.fillRect(3,-14,1.5,2);
  }else if(id==='berkeley'){
    block(g,-4,1,7,3,4,wall,bronze);tower(g,3,1,2.9,17,'#d2d3c4','#e3d9bc');
    polygon(g,[[.4,-16],[3,-22],[5.6,-16],[3,-14.8]],'#d3d2ba');
  }else if(id==='caltech'){
    block(g,-3,2,7.6,3.3,4,'#decfb0');
    g.beginPath();g.ellipse(-3,-2,7.3,7.4,0,Math.PI,2*Math.PI);g.fillStyle='#aaad9d';g.fill();
    g.beginPath();g.ellipse(-3,-2,3.4,7.3,0,Math.PI,2*Math.PI);g.lineWidth=.6;g.strokeStyle='#717f7c';g.stroke();
    tower(g,8,1,2.3,6,'#85928b');g.fillStyle=gold;g.fillRect(-4,-.6,1.5,4);
  }
  g.fillStyle=color||gold;g.fillRect(-12,1,1,5);
  polygon(g,[[-11,1],[-7,2],[-11,3]],color||gold);
  g.restore();
}
