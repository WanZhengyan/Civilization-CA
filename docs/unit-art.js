import {drawRegiment} from './regiment-art.js';
// Hand-drawn map-scale miniatures. Each pose uses feet-level local coordinates.
const EDGE = '#28262c';
const BOOT = '#554437';
const BRASS = '#d2ac70';
const LIGHT = '#eddfbb';
const HIDE = '#ab7950';
const HIDE_LIGHT = '#d6a36a';
const SKIN = '#d5a582';
const SKIN_LIGHT = '#f2c8a0';

function brush(ctx) {
  function polygon(points, fill, edge = EDGE, width = .95) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = width; ctx.stroke(); }
  }
  function line(points, color, width = 1) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  function curve(start, controlOne, controlTwo, end, color, width) {
    ctx.beginPath();
    ctx.moveTo(...start);
    ctx.bezierCurveTo(...controlOne, ...controlTwo, ...end);
    ctx.strokeStyle=color;
    ctx.lineWidth=width;
    ctx.stroke();
  }
  function oval(cx, cy, rx, ry, fill, edge = null, width = .8, tilt = 0) {
    ctx.beginPath();
    ctx.ellipse(cx,cy,rx,ry,tilt,0,Math.PI*2);
    if (fill) { ctx.fillStyle=fill; ctx.fill(); }
    if (edge) { ctx.strokeStyle=edge; ctx.lineWidth=width; ctx.stroke(); }
  }
  return {polygon, line, curve, oval};
}

// Colors are premixed so a unit keeps the same light and dark sides at every zoom.
const pigmentCache = new Map();
function pigment(color) {
  if (pigmentCache.has(color)) return pigmentCache.get(color);
  const match=typeof color==='string' && /^#([0-9a-f]{6})$/i.exec(color);
  const source=match ? [1,3,5].map(i=>parseInt(color.slice(i,i+2),16)) : [210,171,107];
  const mix=(rgb,t)=>'rgb('+source.map((v,i)=>Math.round(v+(rgb[i]-v)*t)).join(',')+')';
  const p={base:color,lit:mix([255,233,170],.44),rim:mix([255,243,190],.79),shade:mix([39,43,62],.55),deep:mix([39,34,48],.7)};
  pigmentCache.set(color,p);
  return p;
}

function clothedLimb(b,joints,cloth,thickness,light) {
  b.line(joints,EDGE,thickness+.92);
  b.line(joints,cloth,thickness);
  if(light) b.line(joints.map(([x,y])=>[x-.49,y-.42]),light,.64);
}

function leg(b,hip,side,wave,lift,lunge) {
  const front=side>0;
  const toe=side*3.6+wave*4.8+lunge*side*1.7;
  const sole=-.8-Math.max(0,lift)*2.4*Math.abs(wave)-(front?0:1.05);
  const kneeX=toe*.62+(front?.38:-1.1)+Math.max(0,wave)*1.4;
  const kneeY=(sole+hip[1])*.53;
  const [hx,hy]=hip;
  b.polygon([[hx-2.3,hy-.5],[hx+2.65,hy-.5],[kneeX+2.13,kneeY-1.4],[kneeX+1.82,kneeY+.4],[toe+1.47,sole-2.6],[toe-1.51,sole-2.2],[kneeX-1.45,kneeY+.98],[kneeX-2.02,kneeY-.74]],front?'#6c7076':'#4a4e59',EDGE,.74);
  b.polygon([[hx-.4,hy+.35],[hx+1.68,hy+.6],[kneeX+1.39,kneeY-1.45],[kneeX+.55,kneeY-.2],[kneeX-.28,kneeY-2.1]],front?'#a1a39b':'#6c7378',null);
  b.polygon([[kneeX-1.52,kneeY-.77],[kneeX+.86,kneeY-.4],[kneeX-.5,kneeY+1.16],[kneeX-1.4,kneeY+1.26]],'#3f454e',null);
  b.polygon([[toe-1.65,sole-4.7],[toe+.91,sole-4.55],[toe+1.22,sole-2.2],[toe+2.45,sole-1.28],[toe+3.55,sole-.9],[toe+3.6,sole+.22],[toe-1.97,sole+.38]],front?'#755440':'#584638',EDGE,.7);
  b.line([[toe-1.49,sole-4.29],[toe+.82,sole-4.14]],front?'#c4a37c':'#917c66',.56);
  b.line([[toe+.48,sole-.67],[toe+2.44,sole-.75]],front?'#c2a181':'#907966',.56);
}

function arm(b,shoulder,elbow,hand,sleeve,near=true) {
  const p=pigment(sleeve), [sx,sy]=shoulder, [ex,ey]=elbow, [hx,hy]=hand;
  const angle=Math.atan2(ey-sy,ex-sx), nx=-Math.sin(angle), ny=Math.cos(angle);
  b.polygon([[sx+nx*2.35,sy+ny*2.35],[sx+nx*2.55+(ex-sx)*.38,sy+ny*2.55+(ey-sy)*.38],[ex+nx*1.91,ey+ny*1.91],[ex-nx*2.04,ey-ny*2.04],[sx-nx*2.76,sy-ny*2.76],[sx-.42,sy-2.19]],near?p.base:p.shade,EDGE,.78);
  b.polygon([[sx-nx*1.74,sy-ny*1.74],[sx+.37,sy-.41],[ex-nx*.7,ey-ny*.7],[ex-nx*1.49,ey-ny*1.49]],near?p.lit:p.base,null);
  const fx=ex+(hx-ex)*.22,fy=ey+(hy-ey)*.22;
  b.line([[ex,ey],[fx,fy],[hx,hy]],EDGE,3.63);
  b.line([[ex,ey],[fx,fy],[hx,hy]],near?'#c88861':'#9a624d',2.87);
  b.line([[fx-.2,fy-.36],[hx-.45,hy-.45]],near?'#edb783':'#bc916e',.94);
  b.polygon([[hx-1.55,hy-.79],[hx-.84,hy-1.62],[hx+.15,hy-1.72],[hx+.72,hy-1.2],[hx+1.45,hy-.68],[hx+1.55,hy+.32],[hx+.74,hy+1.5],[hx-.38,hy+1.63],[hx-1.32,hy+.84]],near?'#edb68a':'#b47e62',EDGE,.5);
  b.line([[hx-.45,hy-1.15],[hx+.36,hy-.73]],near?'#ffe1b0':'#d9a87a',.6);
}

function pack(b,x,y,small=false) {
  const s=small?.82:1, at=pts=>pts.map(([a,c])=>[x+a*s,y+c*s]);
  b.polygon(at([[-3.4,-4.5],[1.6,-5.6],[3.1,-3.3],[3.8,2.7],[2.9,5.9],[-2.8,6.4],[-4.65,4.15],[-4.71,-1.9]]),'#ae7851',EDGE,.8);
  b.polygon(at([[-4.27,-1.97],[-2.63,-3.35],[-1.12,3.98],[-2.6,5.75],[-3.94,3.8]]),'#d5a16b',null);
  b.polygon(at([[-.64,-2.75],[2.57,-3.4],[3.2,2.95],[1.87,5.35],[.59,4.7]]),'#78513d',null);
  b.line(at([[-3.57,.08],[-1.85,1.04],[2.35,-.13]]),'#644434',.75);
  b.polygon(at([[-1.69,-2.75],[-.55,-2.98],[.68,4.99],[-.6,5.22]]),'#684637',null);
  b.oval(x-1.38*s,y-4.45*s,4.99*s,2.0*s,'#c5ab7e',EDGE,.72,-.13);
  b.oval(x-4.72*s,y-4.0*s,1.75*s,1.65*s,'#ead3a2','#725841',.59,-.13);
  b.oval(x-4.68*s,y-4.02*s,.72*s,.66*s,null,'#a18563',.45);
  b.line(at([[.02,-6.13],[.64,-3.2]]),'#725841',.7);
}

const FACE={
  hat:['#b87552','#e8a478','#ffd4a0','#563c33'],
  scout:['#945d46','#c48760','#eab287','#443831'],
  hood:['#ad7353','#dc9a73','#f8c39a','#513a32'],
  cap:['#a1694d','#d4936b','#f3bd8b','#50372e'],
  helmet:['#ab7051','#dc9a70','#f5c38e','#584139']
};

function head(b,x,y,style,cloth) {
  const p=pigment(cloth),[dark,mid,lit,hair]=FACE[style] || FACE.hat;
  const pt=pts=>pts.map(([u,v])=>[x+u,y+v]);
  const shape=(pts,col,edge=null,w=.6)=>b.polygon(pt(pts),col,edge,w);
  const mark=(pts,col,w)=>b.line(pt(pts),col,w);
  shape([[-2.1,2.1],[2.55,2.48],[2.9,5.4],[.4,6.2],[-2.29,5]],dark,EDGE,.55);
  // A three-quarter face, with one side in warm sunlight.
  shape([[-4.05,-2.9],[-2.52,-4.4],[.37,-4.65],[3.55,-3.2],[4.08,-1.72],[4.04,-.65],[5.07,.49],[4.45,1.1],[4.16,1.22],[4.09,2.42],[3.15,3.96],[1.16,4.66],[-1.2,3.86],[-2.27,2.68],[-3.76,2.07],[-4.55,.1]],mid,EDGE,.78);
  shape([[-3.44,-2.78],[-.34,-3.83],[1.92,-2.66],[.91,-1.14],[-.62,-.48],[-.82,1.14],[-.1,2.74],[1.53,4.13],[-.1,3.77],[-1.8,2.45],[-3.45,1.18]],dark);
  shape([[.8,-2.7],[3.29,-2.49],[3.55,-1.43],[2.97,-.93],[3.33,.3],[4.49,.49],[3.62,1.01],[3.25,.76],[1.11,1.63],[.31,.82]],lit);
  shape([[.5,2.0],[2.46,1.46],[3.9,1.76],[3.58,2.33],[2.29,2.37],[1.05,2.73]],mid);
  shape([[2.05,3.05],[3.56,2.66],[2.8,3.56],[1.78,3.87]],lit);
  b.oval(x-2.25,y+.48,1.3,1.57,mid,dark,.48,-.11);
  mark([[-2.78,.77],[-2.33,.07],[-1.76,.25]],dark,.5);
  mark([[.11,-.89],[1.2,-1.15],[1.69,-1.05]],hair,.65);
  mark([[1.18,-.55],[1.75,-.58]],hair,.48);
  mark([[3.24,-1.08],[3.69,-1.08]],hair,.5);
  mark([[2.7,2.13],[3.56,2.05]],dark,.47);
  if(style==='hat'||style==='cap') {
    shape([[-3.86,-1.75],[-1.99,-2.32],[-1.5,-1.05],[-1.97,.05],[-2.8,-.62],[-3.32,.8],[-3.89,.4]],hair);
  }
  if(style==='helmet'){
    shape([[-4.79,-.7],[-4.93,-2.72],[-3.64,-4.57],[-1.75,-5.76],[.79,-5.99],[2.82,-5.0],[3.84,-3.6],[3.8,-2.28],[2.0,-2.6],[-.14,-2.38],[-2.48,-1.58]],'#7f8988',EDGE,.76);
    shape([[-3.98,-2.63],[-3.15,-4.18],[-1.43,-5.13],[.21,-5.37],[-1.27,-3.4]],'#c4c5ad');
    shape([[.54,-5.31],[2.44,-4.61],[3.29,-3.23],[1.23,-3.15]],'#9da99f');
    shape([[-5.13,-1.37],[-1.97,-2.54],[1.67,-3.02],[4.66,-2.63],[4.84,-1.91],[1.44,-1.94],[-2.66,-.93],[-4.77,-.32]],'#b8baa2',EDGE,.51);
    mark([[-4.35,-1.42],[-1.91,-2.19],[.38,-2.59]],'#efddaf',.6);
    shape([[-4.43,-.63],[-3.34,-.95],[-2.85,1.63],[-3.58,2.45],[-4.36,1.29]],'#76817e',EDGE,.43);
  } else if(style==='hood'){
    shape([[-6.12,4.84],[-5.33,2.14],[-5.03,-2.69],[-3.14,-5.28],[-.75,-6.27],[1.33,-5.84],[4.24,-3.44],[4.5,-2.64],[2.91,-2.53],[.56,-2.44],[-1.3,-1.01],[-2.23,1.43],[-1.42,3.62],[-.92,4.49],[-3.03,5.55]],p.base,EDGE,.84);
    shape([[-5.48,3.95],[-4.6,-1.78],[-3.16,-4.1],[-1.6,-5.1],[-2.91,-1.81],[-3.38,1.75],[-2.53,4.82]],p.shade);
    shape([[-3.18,-4.5],[-.61,-5.58],[.98,-5.15],[3.15,-3.31],[1.46,-3.7],[-.5,-4.46]],p.lit);
    mark([[-3.16,-4.57],[-.72,-5.66],[.18,-5.49]],p.rim,.68);
  } else if(style==='cap'){
    shape([[-4.96,-1.72],[-4.69,-3.94],[-3.14,-5.36],[-.86,-5.89],[1.61,-5.66],[3.52,-4.29],[4.15,-2.96],[5.64,-2.52],[5.82,-1.86],[4.65,-1.6],[2.25,-2.03],[-.83,-1.79],[-3.82,-.84]],'#cf9950',EDGE,.75);
    shape([[-4.29,-2.72],[-3.38,-4.51],[-1.21,-5.11],[-.18,-5.15],[-1.81,-3.48],[-1.83,-2.5]],'#f3c879');
    shape([[.21,-5.08],[1.6,-4.94],[2.9,-3.71],[3.3,-2.91],[2.27,-3.03]],'#ba7f43');
    mark([[-4.16,-1.76],[-.72,-2.58],[2.15,-2.82],[4.43,-2.52]],'#f4c77a',.65);
  } else {
    const neutral=style==='scout'?['#859878','#b5bf92','#566d5c']:['#c39862','#f2cc8d','#967048'];
    shape([[-4.66,-2.49],[-4.3,-4.04],[-3.13,-6.07],[-1.9,-6.53],[.62,-5.76],[2.12,-6.06],[3.59,-5.32],[4.16,-2.94],[2.98,-2.07],[-1.51,-1.71]],neutral[0],EDGE,.72);
    shape([[-3.89,-3.43],[-3.04,-5.36],[-2.09,-5.74],[-.28,-5.16],[-1.72,-4.11],[-1.68,-3.26]],neutral[1]);
    shape([[1.52,-5.24],[2.56,-5.23],[3.51,-3.02],[2.33,-2.87]],neutral[2]);
    shape([[-4.28,-2.85],[-.84,-3.24],[3.6,-3.73],[3.91,-2.44],[-1.03,-1.85],[-4.48,-1.64]],'#72523c');
    shape([[-7.07,-2.3],[-5.32,-2.66],[-3.33,-2.04],[-.2,-2.32],[3.15,-3.06],[5.25,-3.42],[6.16,-3.22],[5.72,-2.39],[4.0,-1.56],[1.11,-1.17],[-2.72,-.44],[-5.29,-.62],[-6.77,-1.19]],neutral[0],EDGE,.62);
    mark([[-6.38,-1.67],[-4.8,-1.26],[-2.7,-1.44],[-.39,-1.81]],neutral[1],.69);
    mark([[3.63,-2.82],[5.21,-3.03]],neutral[1],.49);
    if(style==='scout') {
      shape([[-4.71,-2.38],[-6.29,-5.96],[-6.2,-7.35],[-4.95,-6.43],[-4.25,-3.26]],'#c1c9a8',EDGE,.39);
    }
  }
}

function torso(b,x,y,kind,color) {
  const p=pigment(color), pt=pts=>pts.map(([u,v])=>[x+u,y+v]);
  const fill=(pts,c,edge=null,w=.7)=>b.polygon(pt(pts),c,edge,w);
  const mark=(pts,c,w)=>b.line(pt(pts),c,w);
  const skirt=kind==='settler'?7.3:6.65;
  fill([[-4.4,-5.49],[-2.35,-6.81],[.64,-6.9],[3.84,-5.72],[5.09,-3.56],[4.22,-1.09],[3.75,.75],[4.63,3.09],[5.97,5.03],[4.76,5.92],[1.63,6.25],[-.23,5.67],[-2.23,6.48],[-skirt,5.05],[-5.54,2.63],[-4.07,.41],[-4.96,-2.74]],p.base,EDGE,.83);
  fill([[-4.24,-4.75],[-2.69,-5.62],[-3.35,-1.92],[-1.45,-.01],[-2.29,1.13],[-4.05,.55],[-4.03,-1.61]],p.shade);
  fill([[-3.67,1.41],[-1.63,1.69],[-2.93,4.74],[-5.79,4.83]],p.shade);
  fill([[-.35,1.42],[1.84,1.16],[.67,4.89],[-1.03,5.71]],p.lit);
  fill([[2.45,.97],[3.37,1.0],[5.24,4.88],[3.18,5.58],[3.6,4.25]],p.shade);
  fill([[-3.76,-4.9],[-2.01,-6.0],[.45,-5.89],[-1.14,-4.56],[-2.31,-3.98]],p.lit);
  fill([[.97,-5.99],[3.23,-4.81],[4.08,-3.29],[2.71,-2.03],[1.93,-2.71],[2.26,-4.05]],p.lit);
  mark([[-3.97,-5.04],[-2.27,-6.22],[-1.05,-6.27]],p.rim,.72);
  if(kind==='guard') {
    fill([[-3.31,-4.8],[-.68,-5.84],[2.88,-4.95],[2.82,-2.71],[1.7,-.74],[-.49,.6],[-3.1,-.26],[-3.81,-2.32]],'#89928e',EDGE,.54);
    fill([[-3.32,-3.72],[-1.49,-4.89],[.05,-4.93],[.29,-3.32],[-.72,-1.96],[-2.38,-1.81]],'#c5c6ac');
    fill([[.34,-3.06],[2.15,-4.31],[2.18,-2.65],[.66,-.86],[-.23,-.58]],'#a9b1a3');
    mark([[-3.3,-4.43],[-1.03,-5.35],[.27,-5.25]],'#eed9a8',.7);
  } else if(kind==='builder'){
    fill([[-3.41,-5.44],[-2.0,-5.92],[-1.21,-3.16],[1.0,-3.02],[2.13,-5.59],[3.38,-5.19],[2.61,-2.24],[3.39,4.53],[-3.03,5.16],[-3.73,3.33],[-2.53,-1.97]],'#9f6d4a',EDGE,.48);
    fill([[-2.54,-1.7],[1.77,-2.15],[1.85,-.13],[-2.02,.34]],'#c8975f');
    fill([[-1.43,1.85],[.45,1.51],[1.19,3.58],[-.89,4.31],[-1.83,3.22]],'#b98a5d');
    mark([[-2.37,-1.3],[1.31,-1.72]],'#edc58e',.52);
  } else {
    mark([[3.16,-5.12],[1.49,-3.41],[.23,-2.21],[-2.86,.06]],'#6d4c3a',1.62);
    mark([[2.75,-5.01],[1.2,-3.45],[-.24,-2.09]],'#e4bd83',.59);
  }
  if(kind!=='builder'){
    fill([[-4.1,.11],[-1.53,.52],[3.51,-.31],[3.58,.8],[-1.37,1.68],[-4.21,1.16]],'#6b523e',EDGE,.42);
    fill([[.0,.44],[1.56,.19],[1.81,1.16],[.29,1.41]],'#e0b570',EDGE,.33);
  }
}
function equipment(b,type,hand,strike,phase) {
  const [x,y]=hand;
  if(type==='settler'){
    const sway=Math.sin(phase)*1.3;
    const tip=[x+1.12+sway,y-9.9];
    b.line([[x-2.25-sway,-1.0],[x-.51,y+4.0],tip],EDGE,2.48);
    b.line([[x-2.25-sway,-1.0],[x-.51,y+4.0],tip],'#a47751',1.74);
    b.line([[x-.11,y-1.6],[tip[0]-.13,tip[1]+.24]],'#edd09b',.74);
    b.line([[tip[0]-.76,tip[1]+2.4],[tip[0]+.59,tip[1]+2.56]],'#76513a',.65);
  } else if(type==='scout'){
    // Brass field glass held against the brow; a wide flared lens makes it read at map scale.
    const ey=x-3.0, yy=y-1.45;
    b.polygon([[ey-1.7,yy-.7],[ey+.1,yy-1.16],[ey+1.42,yy-1.08],[ey+6.57,yy-2.63],[ey+7.84,yy-2.15],[ey+8.12,yy-.07],[ey+7.35,yy+.85],[ey+1.14,yy+1.19],[ey-.98,yy+1.54]],'#a57d49',EDGE,.67);
    b.polygon([[ey+1.22,yy-.63],[ey+6.91,yy-2.15],[ey+7.14,yy-1.19],[ey+1.42,yy+.29]],'#f2d59a',null);
    b.line([[ey+6.59,yy-2.21],[ey+7.13,yy+.59]],'#755337',.57);
    b.oval(ey+7.63,yy-.72,.79,1.42,'#91b7af',EDGE,.5,-.22);
  } else if(type==='builder'){
    const angle=.56+strike*1.5+Math.sin(phase)*.1;
    const dx=Math.sin(angle),dy=-Math.cos(angle), top=[x+dx*9,y+dy*9], cross=[-dy,dx];
    b.line([[x-dx*3,y-dy*3],top],EDGE,2.95);
    b.line([[x-dx*3,y-dy*3],top],HIDE_LIGHT,1.75);
    const [a,c]=top,[u,v]=cross;
    b.polygon([[a-u*3.65+dx*1.35,c-v*3.65+dy*1.35],[a+u*2.15+dx*1.12,c+v*2.15+dy*1.12],[a+u*4.8-dx*1.38,c+v*4.8-dy*1.38],[a+u*2.15-dx*.45,c+v*2.15-dy*.45],[a-u*3.15-dx*1.75,c-v*3.15-dy*1.75]],'#b7b8aa',EDGE,.85);
    b.line([[a-u*2.9+dx*.85,c-v*2.9+dy*.85],[a+u*1.8+dx*.85,c+v*1.8+dy*.85]],LIGHT,.6);
  } else if(type==='guard'){
    const dx=.45+.54*strike,dy=-Math.sqrt(Math.max(0,1-dx*dx)),long=12.6;
    const [u,v]=[-dy,dx];
    const base=[x+dx*2.55,y+dy*2.55],tip=[x+dx*long,y+dy*long];
    b.polygon([[base[0]-u,base[1]-v],[tip[0]-1.02*u,tip[1]-1.02*v],[tip[0]+dx*2.6,tip[1]+dy*2.6],[tip[0]+1.42*u,tip[1]+1.42*v],[base[0]+u,base[1]+v]],'#d6ddd1',EDGE,.8);
    b.line([base,tip],'#f3ead0',.64);
    b.line([[base[0]-u*2.45,base[1]-v*2.45],[base[0]+u*2.45,base[1]+v*2.45]],BRASS,1.2);
    b.line([[x-dx*1.7,y-dy*1.7],base],HIDE,.95);
  } else if(type==='archer'){
    const pull=3.75+3.25*strike;
    const top=[x-.95,y-10.55], low=[x-1.65,y+10.55];
    b.curve(top,[x+4.85,y-5.3],[x+4.9,y+3.95],low,EDGE,2.55);
    b.curve(top,[x+4.85,y-5.3],[x+4.9,y+3.95],low,'#d4aa73',1.32);
    b.line([top,[x-pull,y],low],'#e9d8aa',.58);
    b.line([[x-pull-1.5,y],[x+8.95,y-.35]],'#e5d4a5',.78);
    b.polygon([[x+7.85,y-1.35],[x+11.05,y-.45],[x+8,y+.58]],'#d1d8c7',EDGE,.36);
  }
}

// Different garments change the silhouette as well as the accent color.
function cloak(b,x,y,p,type,wave) {
  const end=type==='archer'?10.3:type==='guard'?9.15:7.35;
  const sweep=wave*1.22;
  const pt=pts=>pts.map(([u,v])=>[x+u,y+v]);
  b.polygon(pt([[-.32,-6.58],[-3.53,-6.2],[-5.22,-4.12],[-6.02,-1.32],[-7.61,1.25],[-end+sweep,4.44],[-end-1.35+sweep,5.67],[-7.21+sweep,5.44],[-5.93+sweep,6.25],[-2.4+sweep,3.88],[-1.43,-.28]]),p.base,EDGE,.76);
  b.polygon(pt([[-3.99,-4.68],[-4.67,-1.35],[-7.3+sweep,4.49],[-8.68+sweep,4.95],[-6.65,1.7]]),p.shade,null);
  b.polygon(pt([[-2.53,-5.67],[-1.34,-5.5],[-2.97,-.68],[-4.51+sweep,3.02],[-4.03,-.07]]),p.lit,null);
  b.line(pt([[-4.89,-3.83],[-3.64,-5.29],[-2.47,-5.73]]),p.rim,.73);
}

function figure(b,type,color,phase,strike) {
  const p=pigment(color), wave=Math.sin(phase), bounce=Math.abs(wave)*.86;
  const walkingLean=type==='settler'?.55:type==='scout'?1.05:.16;
  const x=walkingLean+strike*(type==='guard'?2.55:1.28), y=-17.25-bounce;
  const hip=[x*.42,y+4.8], shoulder=[x+1.97,y-3.32];
  leg(b,[hip[0]-1.02,hip[1]],-1,-wave,-Math.cos(phase),strike);
  leg(b,[hip[0]+.83,hip[1]-.14],1,wave,Math.cos(phase),strike);
  if(type==='archer'){
    b.polygon([[x-6.35,y+1.33],[x-10.14,y-8.79],[x-6.64,y-10.11],[x-2.98,y-.05]],'#936445',EDGE,.72);
    b.line([[x-9.48,y-8.38],[x-7.01,y-9.33]],'#dfbd82',1.17);
    for(const n of [-1.1,.59,2.28]){
      b.line([[x-7.2+n,y-6.8],[x-10.7+n,y-13.45]],'#d3b584',.74);
      b.polygon([[x-10.7+n,y-13.45],[x-12.18+n,y-14.18],[x-11.85+n,y-12.32],[x-10.24+n,y-11.68]],'#d7c9a5',EDGE,.28);
    }
  }
  if(type==='scout'||type==='guard'||type==='archer') cloak(b,x,y,p,type,wave);
  if(type==='settler'||type==='scout') pack(b,x-(type==='settler'?6.27:5.87),y-2.9,type==='scout');
  const farShoulder=[x-3.55,y-3.15];
  if(type!=='archer') arm(b,farShoulder,[x-6.44-wave*1.42,y+.15],[x-6.18-wave*1.97,y+3.61],color,false);
  torso(b,x,y,type,color);
  if(type==='scout'||type==='settler'){
    // The scouting scarf lies across both shoulders; the settler's kerchief sits close to the neck.
    const width=type==='scout'?-7.26:-5.33;
    b.polygon([[x+2.58,y-5.08],[x-.3,y-4.17],[x-2.21,y-4.63],[x+width,y-1.83],[x+width+.94,y-3.65],[x+width-1.27,y-3.63],[x-3.16,y-5.94],[x-.07,y-6.07]],type==='scout'?p.base:'#c57950',EDGE,.49);
    b.line([[x-3.46,y-5.22],[x-.38,y-5.32],[x+1.07,y-5.39]],type==='scout'?p.rim:'#efb477',.65);
  }
  const headStyle={guard:'helmet',archer:'hood',scout:'scout',builder:'cap',settler:'hat'};
  head(b,x+.8,y-9.45,headStyle[type],color);
  let hand,elbow;
  if(type==='archer'){
    hand=[x+8.6+strike*1.73,y-3.23];elbow=[x+4.76,y-2.75];
    arm(b,[x-1.69,y-2.94],[x-5.66-strike*1.3,y-.79],[hand[0]-3.75-strike*3.25,hand[1]],color);
  } else if(type==='guard'){
    hand=[x+6.53+strike*7.15,y-1.9-strike*2.3];elbow=[x+5.38+strike*2.68,y+1.39-strike*2.33];
  } else if(type==='builder'){
    hand=[x+7.25+wave*.66+strike*2.7,y-2.65-strike*.85];elbow=[x+4.75+wave*.76,y+.44];
  } else if(type==='scout'){
    hand=[x+6.84+wave*.17,y-8.53];elbow=[x+7.63-wave*.43,y-2.93];
  } else {
    hand=[x+6.4+wave*1.65,y-.24];elbow=[x+4.69+wave*.89,y+1.87];
  }
  arm(b,shoulder,elbow,hand,type==='builder'?'#beb397':color);
  equipment(b,type,hand,strike,phase);
  if(type!=='scout'){
    b.oval(hand[0]-.43,hand[1]+.11,1.06,1.3,SKIN_LIGHT,'#744e3c',.44,-.17);
  }
  if(type==='guard'){
    const sx=x-4.65,sy=y+.02;
    const at=pts=>pts.map(([u,v])=>[sx+u,sy+v]);
    b.polygon(at([[-4.62,-4.37],[-2.24,-5.11],[.45,-5.84],[3.1,-4.54],[3.8,-2.47],[3.18,1.58],[1.61,4.24],[-.46,5.98],[-3.2,4.14],[-4.87,1.03],[-5.22,-1.4]]),'#ae8d62',EDGE,.83);
    b.polygon(at([[-3.88,-3.89],[.26,-4.98],[2.4,-3.88],[2.88,-2.37],[2.38,.93],[.97,3.63],[-.52,4.98],[-2.65,3.5],[-4.04,.84],[-4.45,-1.4]]),p.base,EDGE,.48);
    b.polygon(at([[-.06,-4.48],[2.08,-3.56],[2.46,-2.14],[2.02,.82],[.65,3.41],[-.61,4.49]]),p.shade,null);
    b.line(at([[-3.96,-4.12],[-.12,-5.19],[1.07,-4.69]]),'#f2d694',.66);
    b.oval(sx-.86,sy-.49,1.39,1.68,'#dbb776','#755a42',.56,.09);
    b.oval(sx-1.19,sy-1.02,.54,.7,'#f4d99c');
  }
}

function horseAndRider(g,b,color,phase,strike) {
  const wave=Math.sin(phase);
  const p=pigment(color);
  for(const [hx,far] of [[-5.9,true],[5.8,true],[-8.4,false],[5.0,false]]){
    const w=(hx<0?1:-1)*(far?-1:1)*wave;
    const shift=far?1.25:0;
    const foot=[hx+shift+(hx<0?-1.22:1.15)+w*3.68,-1.22-Math.max(0,w)*1.85];
    const kx=hx+shift+(hx<0?1.45:-.15)+w*1.1;
    const ky=hx<0?-7.05:-6.27;
    const [fx,fy]=foot;
    b.polygon([[hx-1.8,-12.08],[hx+1.82,-12.48],[kx+1.56,ky-.3],[kx+1.21,ky+.91],[fx+.82,fy-1.1],[fx+.91,fy],[fx-.93,fy+.2],[fx-1.22,fy-.92],[kx-.68,ky+1.18],[kx-1.48,ky+.04]],far?'#795747':'#a87049',EDGE,.68);
    if(!far) b.line([[hx-.79,-10.79],[kx-.78,ky-.77],[kx-.42,ky+.66]],'#d6a16c',.72);
    b.polygon([[fx-.96,fy-.7],[fx+.85,fy-.84],[fx+1.48,fy-.11],[fx+1.63,fy+.55],[fx-1.36,fy+.65]],'#4c423c',EDGE,.43);
  }
  b.polygon([[-8.63,-15.85],[-10.4,-16.66],[-12.52,-15.45],[-13.24,-12.31],[-14.0,-10.01],[-16.16,-8.53],[-14.59,-8.59],[-15.52,-7.28],[-12.98,-8.04],[-11.44,-9.61],[-10.39,-12.57],[-9.18,-13.46]],'#60463b',EDGE,.7);
  b.line([[-13.98,-9.42],[-12.25,-11.04],[-11.52,-14.37]],'#9d7653',.67);
  b.polygon([[-10.66,-13.14],[-9.49,-16.04],[-7.09,-17.32],[-3.54,-17.19],[-.94,-16.36],[2.15,-16.46],[4.69,-17.06],[7.12,-16.49],[8.42,-14.18],[8.55,-11.7],[7.37,-9.0],[5.84,-8.31],[4.28,-9.0],[1.49,-9.09],[-.72,-8.99],[-3.42,-9.36],[-5.61,-9.01],[-8.77,-9.37],[-10.42,-10.88]],'#b8794e',EDGE,.79);
  b.polygon([[-10.01,-12.59],[-8.86,-15.34],[-6.47,-16.42],[-4.4,-15.51],[-4.87,-14.14],[-7.49,-14.3],[-9.73,-11.72]],'#d9a16c',null);
  b.polygon([[-6.14,-10.12],[-4.34,-12.49],[-1.9,-13.17],[1.82,-13.28],[4.91,-14.34],[4.03,-11.27],[2.29,-10.03],[-.5,-9.59],[-2.65,-9.98]],'#986044',null);
  b.polygon([[3.04,-14.49],[4.73,-16.54],[6.94,-20.08],[8.66,-22.28],[10.14,-23.33],[9.85,-25.76],[10.68,-25.21],[11.63,-23.69],[12.41,-24.98],[13.02,-24.55],[12.85,-22.25],[13.85,-20.8],[15.22,-19.35],[16.94,-18.51],[17.25,-17.35],[16.21,-16.53],[14.68,-16.55],[12.34,-17.41],[11.15,-17.63],[10.53,-16.02],[9.11,-13.21],[8.78,-10.83],[7.66,-9.44],[6.13,-9.73],[6.29,-12.16],[4.73,-12.46]],'#bb8056',EDGE,.75);
  b.polygon([[6.33,-16.17],[7.95,-19.37],[9.11,-21.41],[10.59,-22.01],[11.79,-21.45],[10.15,-19.9],[8.53,-16.73],[7.66,-14.43],[6.77,-14.02]],'#dca875',null);
  b.polygon([[8.46,-14.24],[10.18,-17.46],[11.35,-18.31],[12.54,-17.93],[11.59,-16.91],[10.68,-15.69],[9.1,-12.33]],'#9b6448',null);
  b.polygon([[5.31,-16.23],[6.11,-18.55],[7.3,-20.89],[8.22,-22.43],[9.8,-23.34],[10.49,-23.22],[9.88,-21.91],[8.64,-21.05],[8.35,-19.81],[7.61,-19.25],[6.63,-17.22]],'#5b473d',EDGE,.5);
  b.line([[6.7,-18.0],[7.68,-20.57],[9.04,-22.26]],'#aa815b',.67);
  b.oval(12.17,-20.6,.51,.45,'#383334');
  b.line([[14.47,-18.8],[16.28,-18.04]],'#e0b181',.61);
  b.oval(16.06,-17.55,.44,.24,'#6e4939');
  b.line([[11.22,-18.64],[12.25,-18.56],[14.22,-19.34]],'#76543e',1.13);
  b.line([[13.91,-19.98],[14.01,-19.31],[14.52,-17.43]],'#c39c69',.76);
  b.polygon([[-6.66,-17.08],[-.7,-17.48],[2.09,-16.81],[3.62,-14.29],[2.77,-11.07],[-4.06,-11.58],[-5.46,-12.66]],p.base,EDGE,.73);
  b.polygon([[-4.84,-15.91],[.76,-16.31],[2.09,-14.83],[1.76,-13.98],[-4.27,-13.97]],'#805d43',EDGE,.53);
  b.line([[-4.66,-12.66],[-3.65,-12.04],[2.24,-11.74]],p.rim,.74);
  g.save(); g.translate(-1.9,-19.9-Math.abs(wave)*.48);g.scale(.74,.74);
  const rb=brush(g);
  torso(rb,0,-2,'guard',color);head(rb,.5,-10.8,'helmet',color);
  clothedLimb(rb,[[-.6,1.15],[3.15,4.13],[1.3,9.27]],'#655e5a',2.85,'#b6a890');
  rb.line([[.15,9.5],[3.05,9.25]],BOOT,2.3);
  arm(rb,[1.2,-6.2],[3.25,-2.8],[6.33,-2.75],color);
  rb.line([[6.33,-2.75],[16.35,2.55],[19.8,2]],'#6b5142',.85);
  const tipX=8+strike*12;
  rb.line([[5.75,-.8],[tipX+2.5,-17+strike*12]],EDGE,2.05);
  rb.line([[5.75,-.8],[tipX+2.5,-17+strike*12]],HIDE_LIGHT,1);
  rb.polygon([[tipX+1.25,-15.8+strike*12],[tipX+3.15,-20.5+strike*12],[tipX+3.85,-15.95+strike*12]],'#d0d8c9',EDGE,.6);
  g.restore();
}

// The survey pieces are drawn from their waterline or ground contact. The
// stripe, signal pennant or crew jacket carries the faction color on every hull.
function wheel(b,x,y,r,phase,metal=false) {
  b.oval(x,y,r,r*.91,metal?'#53615b':'#795d42',EDGE,1);
  b.oval(x,y,r*.77,r*.68,metal?'#788575':'#433e35',metal?'#9b9e80':'#cca775',.55);
  for(let i=0;i<(metal?4:7);i++) {
    const a=phase+i*Math.PI*2/(metal?4:7);
    b.line([[x,y],[x+Math.cos(a)*r*.71,y+Math.sin(a)*r*.62]],metal?'#535d52':'#d0ad7a',.72);
  }
  b.oval(x,y,r*.22,r*.21,'#d2ba89',EDGE,.45);
}

function rifleCompany(g,b,color,phase,strike) {
  const wave=Math.sin(phase),recoil=strike*1.8;
  const hip=[-1,-12-Math.abs(wave)*.6],y=hip[1]-6;
  leg(b,[hip[0]-1.1,hip[1]],-1,-wave,-Math.cos(phase),0);
  leg(b,[hip[0]+.9,hip[1]],1,wave,Math.cos(phase),0);
  pack(b,-6,y-3,true);
  torso(b,-recoil*.35,y,'infantry',color);
  arm(b,[-3.4,y-3.1],[.5,y-.8],[7-recoil,y-3.8],color,false);
  head(b,-recoil*.3+.2,y-9.6,'helmet',color);
  // Kepi crown and visor keep the industrial infantry separate from militia.
  const x=-recoil*.3;
  b.polygon([[x-4.8,y-12.4],[x-4.9,y-15.4],[x-2.4,y-16.7],[x+.9,y-16.8],[x+3.8,y-15.3],[x+3.6,y-13.4],[x+6,y-12.6],[x+4.2,y-11.8],[x+1.8,y-12.3],[x-2.5,y-11.6]],'#3c5264',EDGE,.75);
  b.line([[x-3.8,y-12.8],[x-.9,y-13.5],[x+3.1,y-13.9]],BRASS,.85);
  const gunY=y-3.9;
  g.save();g.translate(0,gunY);g.rotate(-.29+.24*strike);
  b.polygon([[-5.9-recoil,-1.3],[-2-recoil,-1.3],[.6-recoil,-.2],[13.5-recoil,-.6],[13.5-recoil,.7],[3-recoil,1.23],[.3-recoil,2.2],[-2-recoil,2.25],[-5.7-recoil,4]],'#946443',EDGE,.68);
  b.line([[.5-recoil,-1.15],[18-recoil,-1.1]],'#303e42',2.05);
  b.line([[1-recoil,-1.6],[18-recoil,-1.55]],'#c4d0bf',.72);
  b.line([[14-recoil,-.1],[17.3-recoil,-.1],[20.3-recoil,-.6]],'#e0dfc4',.65);
  g.restore();arm(b,[1.4,y-4.1],[.2-recoil,y+.8],[3-recoil,y-3.6],color);
}

function fieldArtillery(g,b,color,phase,strike) {
  const p=pigment(color),recoil=strike*2;
  // Officer stands behind the breech rather than being mistaken for the gun.
  g.save();g.translate(-10.5,-4);g.scale(.64,.64);
  figure(b,'scout',color,phase*.55,0);g.restore();
  wheel(b,3,-6.5,5.8,phase,true);
  b.polygon([[-17,0],[-16,-1.9],[1.8,-10.3],[4.5,-9.4],[5.3,-6.3],[-10.5,-1.9],[-13.4,.2]],'#88917a',EDGE,.8);
  b.polygon([[-5,-12.8],[2.5,-15.5],[7,-11.4],[7,-6.4],[-4,-6.6]],p.base,EDGE,.8);
  b.line([[-4.2,-12.6],[2,-14.7],[5.6,-11.9]],p.rim,.7);
  g.save();g.translate(1-recoil,-12.8);g.rotate(-.31);
  b.polygon([[-6,-2.2],[-3.6,-3.0],[.5,-2.55],[13.1,-1.3],[15.8,-1.8],[16.6,-1.1],[16.5,1.18],[14.4,1.7],[13.1,1.3],[-.7,2.1],[-5.3,2],[-6.5,.9]],'#9e946f',EDGE,.84);
  b.line([[-4.3,-2.18],[.58,-1.85],[13.5,-.86],[15.6,-1.1]],'#e8d29b',.8);
  g.restore();wheel(b,.8,-6.4,6.55,phase);
}

function armoredColumn(g,b,color,phase,strike) {
  const p=pigment(color),recoil=strike*1.85;
  b.polygon([[-18,-8.3],[-15,-11],[12.5,-10.3],[18,-7.76],[17,-3.6],[13.7,-.25],[-11.7,.38],[-17.7,-3.7]],'#414d48',EDGE,1);
  b.polygon([[-16.5,-7.2],[-13.8,-8.3],[14,-7.6],[15.7,-6.6],[13,-2.2],[-12,-1.7],[-15.8,-3.8]],'#787d68','#2b3634',.68);
  for(const x of [-11.5,-6.6,-1.7,3.2,8.1,12.5])wheel(b,x,-4.7,2.6,phase,true);
  b.line([[-13,-1.4],[-8,-.8],[10,-1.2],[15.2,-3.3]],'#acaa86',.65);
  b.polygon([[-19,-9.1],[-14.7,-13.2],[-5.9,-14.8],[8.8,-14.3],[17.7,-10.7],[18.4,-8.3],[-11,-7.2]],'#7d8977',EDGE,.9);
  b.polygon([[-16.4,-10.1],[-13.6,-12.3],[-5.3,-13.7],[6.1,-13.3],[11.4,-11.9],[-7.7,-10.3]],'#b7b59a',null);
  b.polygon([[-7.4,-14.1],[-6.5,-19.4],[-3.8,-21.3],[4.8,-20.9],[8.2,-18.3],[8.5,-14.2],[4.5,-13],[-3.5,-13]],p.shade,EDGE,.85);
  b.polygon([[-5.9,-18.7],[-3,-20.5],[4.45,-20.1],[6.85,-18.6],[1.3,-17.5]],p.lit,null);
  b.polygon([[-4.9,-17.7],[.1,-16.8],[.3,-14.2],[-4.6,-15]],p.base,null);
  b.oval(-1.3,-21.6,3.1,.85,'#8e9a83',EDGE,.6);
  b.line([[-4.9,-20],[-7,-27]],'#5c634e',.74);
  b.line([[6.6-recoil,-17.3],[22-recoil,-19.27]],EDGE,3.2);
  b.line([[6.6-recoil,-17.8],[22-recoil,-19.68]],'#a5aa8e',1.85);
  b.line([[19.8-recoil,-19.48],[22-recoil,-19.78]],'#e6d2a3',.75);
  b.polygon([[10,-10.7],[12.4,-10.9],[14.3,-10],[12,-9.8]],'#f1d79d',null);
}

function vessel(g,b,type,color,phase,strike) {
  const p=pigment(color), wave=Math.sin(phase), sail=type==='cutter', steam=type==='frigate', size=steam?22:sail?18:15.3;
  g.save();g.rotate(wave*(steam?.018:.036));g.translate(0,-Math.abs(wave)*.65);
  const flag=(x,y)=>{b.line([[x,y+4.5],[x,y-2.5]],'#615646',.76);b.polygon([[x+.3,y-2.35],[x+5.8,y-2.8-wave*.4],[x+4.1,y-.9],[x+5,y+.1],[x+.25,y+.65]],p.base,EDGE,.45);};
  const mast=(x,y)=>{b.line([[x,-8],[x,y]],EDGE,1.85);b.line([[x-.3,-8],[x-.3,y]],'#dfc596',.86);};
  if(sail){
    mast(-6.2,-27);mast(3.2,-32.2);
    b.line([[-13,-8],[-6.2,-26],[3.2,-30.5],[17,-8]],'#a69f83',.65);
    b.polygon([[-6.2,-24],[-6.1,-12.2],[-16.3,-11.2],[-13.6,-15.2]],'#dbc6a0',EDGE,.66);
    b.polygon([[2.65,-29.3],[2.95,-14],[-5.4,-11.7],[-4.5,-19.5]],'#f6e7bf',EDGE,.78);
    b.polygon([[4,-26.3],[15.9,-11.1],[4.2,-13.5]],'#f3d9ac',EDGE,.72);
    b.line([[4.9,-24],[6.5,-16.5],[14.6,-12.1]],'#bcaa82',.6);
    b.line([[-4.55,-13.5],[-1.38,-15.4],[1.5,-26.4]],'#cbb38c',.6);flag(3.2,-32.3);
  } else if(steam){
    mast(-10.2,-22);b.line([[-16,-8],[-10.2,-21],[-4,-11]],'#b6b6a1',.67);
    b.polygon([[-11.3,-10.7],[-9.3,-15],[4.6,-14.9],[8.7,-10.8],[7.2,-8.9],[-10.8,-8.5]],'#a2a9a0',EDGE,.72);
    b.polygon([[-6.8,-14.8],[-7.7,-24],[-4.7,-24.5],[-3.6,-14.6]],'#bb915c',EDGE,.78);
    b.polygon([[-7.65,-24],[-7.82,-25.4],[-4.65,-25.8],[-4.46,-24.3]],'#424d4f',EDGE,.55);
    b.polygon([[.7,-14.5],[-.2,-21.5],[2.9,-22],[4.1,-14.3]],'#bd9865',EDGE,.7);
    b.line([[0,-21.5],[2.8,-22]],'#4b5050',1.7);flag(8.3,-17.4);
    b.oval(10.9,-9.9,3.7,2.45,'#a3aca1',EDGE,.6);
    b.line([[12.2-strike,-10.1],[19.4-strike,-12.4]],EDGE,1.45);
  } else {
    b.polygon([[-11,-8.5],[-10.3,-14.3],[-4.1,-15.4],[-1.7,-13.8],[-1.15,-8.4]],'#e7cc94',EDGE,.73);
    b.polygon([[-11.2,-14.2],[-10.6,-15.7],[-4,-16.5],[-1.45,-14.8],[-3.1,-14.1]],'#995e42',EDGE,.58);
    b.polygon([[-8.9,-13.15],[-6.75,-13.5],[-6.5,-10.9],[-8.65,-10.6]],'#548086',EDGE,.36);
    b.line([[.65,-8.4],[4.8,-21],[10.9,-8.9]],'#695b47',1.5);
    b.line([[4.8,-21],[11,-16.7],[11,-13]],'#d7bd87',.76);
    b.polygon([[9.3,-13.5],[13.1,-13.5],[14.8,-9.6],[12,-8.9],[8.9,-10]],'#9c9770',EDGE,.45);
    b.oval(-.2,-11.4,1.05,1.15,'#dfad83',EDGE,.38);b.line([[-.1,-10.1],[.1,-7.9]],p.base,1.8);flag(-8.8,-18.8);
  }
  b.polygon([[-size,-8.8],[-size*.74,-7.8],[size*.32,-8.4],[size,-11],[size-1,-6.8],[size*.67,-2.1],[0,.25],[-size*.69,-.7],[-size*.91,-4.3]],steam?'#63767a':sail?'#405d69':'#b07247',EDGE,.95);
  b.polygon([[-size*.88,-6.55],[-size*.18,-6.03],[size*.46,-7],[size*.92,-8.93],[size*.81,-7.1],[size*.44,-5.4],[-size*.13,-4.5],[-size*.81,-4.9]],p.base,null);
  b.line([[-size*.95,-8.45],[-size*.53,-7.5],[size*.31,-8.05],[size*.93,-10.32]],'#f1d9ac',.8);
  b.line([[-size*.65,-.45],[0,.41],[size*.63,-1.65]],'#b6dde0',1);
  g.restore();
  if(phase){b.curve([-size*.6,1.6],[-size,2.9],[-size*1.21,.5],[-size*1.39,1.3+wave],'#d0e3d8',1);b.line([[-size*.8,3.1],[-size*1.05,3.7],[-size*1.18,3.25]],'#93c2c2',.65);}
}

const KINDS = new Map([
  ['sappers','sappers'],['signals','signals'],['pikes','pikes'],['skirmisher','skirmisher'],['settler','settler'],['scout','scout'],['builder','builder'],
  ['warrior','guard'],['guard','guard'],['melee','guard'],
  ['archer','archer'],['ranger','archer'],['ranged','archer'],
  ['cavalry','cavalry'],['horseman','cavalry'],['riflemen','riflemen'],['artillery','artillery'],
  ['armor','armor'],['cutter','cutter'],['frigate','frigate'],['workboat','workboat']
]);

export function drawUnitArt(g,kind,x,y,options={}) {
  const type=KINDS.get(String(kind).toLowerCase()) || 'settler';
  const color=options.color || '#e8b46a';
  const scale=Number.isFinite(options.scale)?options.scale:1;
  const phase=Number.isFinite(options.stride)?options.stride:0;
  const strike=Number.isFinite(options.strike)?Math.max(0,Math.min(1,options.strike)):0;
  g.save();
  g.translate(x,y);
  g.scale((options.facing<0?-1:1)*scale,scale);
  g.lineCap='round';g.lineJoin='round';
  const b=brush(g);
  if(['pikes','skirmisher','sappers','signals'].includes(type)) drawRegiment(g,b,type,pigment(color),phase,strike);
  else if(type==='cavalry') horseAndRider(g,b,color,phase,strike);
  else if(type==='riflemen') rifleCompany(g,b,color,phase,strike);
  else if(type==='artillery') fieldArtillery(g,b,color,phase,strike);
  else if(type==='armor') armoredColumn(g,b,color,phase,strike);
  else if(type==='workboat'||type==='cutter'||type==='frigate') vessel(g,b,type,color,phase,strike);
  else figure(b,type,color,phase,strike);
  g.restore();
}

export function drawUnitPortrait(canvas,type,color) {
  if (!canvas) return;
  const size=100, dpr=2;
  canvas.width=size*dpr;
  canvas.height=size*dpr;
  const g=canvas.getContext('2d');
  if (!g) return;
  g.scale(dpr,dpr);
  drawUnitArt(g,type,49,87,{color,scale:2.3});
}
