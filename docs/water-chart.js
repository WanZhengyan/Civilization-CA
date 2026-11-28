// Geographic overlays share the same hex centers as navigation and harbor siting.
import {adjacent,chartPerimeter,idFor,pos} from './hex-survey.js';

function hexPoint(tile) {return pos(tile.q,tile.r);}
function midpoint(a,b) {return [(a[0]+b[0])/2,(a[1]+b[1])/2];}

function touches(a,b) {
  if(!a || !b)return false;
  for(let side=0;side<6;side++)if(idFor(...adjacent(a.q,a.r,side))===b.id)return true;
  return false;
}

export function waterGeometry(map) {
  const survey=map.waterways;
  if(!survey)return null;
  const lake=survey.lake.map(id=>map.byId[id]).filter(Boolean);
  const courses=[];
  let run=[];
  const finish=()=>{if(run.length)courses.push(run);run=[];};
  for(const id of survey.river) {
    const tile=map.byId[id];
    if(!tile)continue;
    if(run.length && !touches(run.at(-1),tile))finish();
    run.push(tile);
  }
  finish();
  for(const course of courses) {
    const lakeEdge=lake.find(tile=>touches(tile,course[0]));
    if(lakeEdge)course.unshift(lakeEdge);
    const mouth=map.byId[survey.mouth];
    if(touches(course.at(-1),mouth))course.push(mouth);
  }
  return {courses:courses.map(course=>course.map(hexPoint)),lake,rings:chartPerimeter(lake)};
}

function channelSamples(course) {
  if(course.length===1){
    const [x,y]=course[0];
    return [{x,y,nx:0,ny:1,width:15}];
  }
  const samples=[];
  for(let i=1;i<course.length;i++) {
    const a=course[i-1],b=course[i],before=course[Math.max(0,i-2)],after=course[Math.min(course.length-1,i+1)];
    const c=[a[0]+(b[0]-before[0])/7,a[1]+(b[1]-before[1])/7];
    const d=[b[0]-(after[0]-a[0])/7,b[1]-(after[1]-a[1])/7];
    for(let j=(i===1?0:1);j<=12;j++){
      const t=j/12,u=1-t;
      const x=u*u*u*a[0]+3*u*u*t*c[0]+3*u*t*t*d[0]+t*t*t*b[0];
      const y=u*u*u*a[1]+3*u*u*t*c[1]+3*u*t*t*d[1]+t*t*t*b[1];
      const dx=u*u*(c[0]-a[0])+2*u*t*(d[0]-c[0])+t*t*(b[0]-d[0]);
      const dy=u*u*(c[1]-a[1])+2*u*t*(d[1]-c[1])+t*t*(b[1]-d[1]);
      const length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length;
      const turn=Math.sin(x*.031+y*.017)*2.7;
      samples.push({x:x+turn*nx,y:y+turn*ny,nx,ny,width:17+2.4*Math.sin(x*.041-y*.024)+1.6*Math.cos(y*.044)});
    }
  }
  return samples;
}

function bankLine(samples,side,offset) {
  const path=new Path2D();
  samples.forEach(({x,y,nx,ny,width},i)=>{
    const w=(width+offset)*side;
    path[i?'lineTo':'moveTo'](x+nx*w,y+ny*w);
  });
  return path;
}

function riverInk(course) {
  const samples=channelSamples(course),outline=bankLine(samples,1,0);
  const last=samples.at(-1),first=samples[0];
  outline.quadraticCurveTo(last.x+last.ny*last.width,last.y-last.nx*last.width,last.x-last.nx*last.width,last.y-last.ny*last.width);
  for(let i=samples.length-1;i>=0;i--){const p=samples[i];outline.lineTo(p.x-p.nx*p.width,p.y-p.ny*p.width);}
  outline.quadraticCurveTo(first.x-first.ny*first.width,first.y+first.nx*first.width,first.x+first.nx*first.width,first.y+first.ny*first.width);
  outline.closePath();
  const wake=new Path2D();
  for(let i=2;i<samples.length-2;i+=4){
    const a=samples[i],b=samples[i+1],c=samples[i+2];
    const w=Math.sin(a.x*.13+a.y*.09)*a.width*.65;
    wake.moveTo(a.x+a.nx*w,a.y+a.ny*w);
    wake.quadraticCurveTo(b.x+b.nx*(w+.9),b.y+b.ny*(w+.9),c.x+c.nx*w,c.y+c.ny*w);
  }
  return {outline,wake,samples,shoal:bankLine(samples,1,-2.7),depth:bankLine(samples,-1,-3.8)};
}

function lakePath(rings) {
  const shape=new Path2D();
  for(const ring of rings) {
    const shore=ring.map(([x,y])=>[x+3.5*Math.sin(.055*x+.03*y),y+3.4*Math.cos(.038*x-.042*y)]);
    shape.moveTo(...midpoint(shore.at(-1),shore[0]));
    shore.forEach((p,i)=>shape.quadraticCurveTo(...p,...midpoint(p,shore[(i+1)%shore.length])));
    shape.closePath();
  }
  return shape;
}

const inkCache=new WeakMap();
export function inkWaterways(g,map) {
  if(!map.waterways)return;
  let ink=inkCache.get(map);
  if(!ink){
    const {courses,lake,rings}=waterGeometry(map);
    ink={courses:courses.map(riverInk),lake,basin:lake.length?lakePath(rings):null};
    inkCache.set(map,ink);
  }
  g.save();g.lineCap='round';g.lineJoin='round';
  for(const course of ink.courses)inkRiver(g,course);
  if(ink.basin)inkLake(g,ink.lake,ink.basin);
  g.restore();
}

function inkRiver(g,{outline,wake,samples,shoal,depth}) {
  if(samples.length===1){
    const p=samples[0];g.beginPath();g.ellipse(p.x,p.y,18,13,-.15,0,Math.PI*2);
    g.fillStyle='#569d9c';g.fill();g.strokeStyle='#aec7a6';g.lineWidth=2.5;g.stroke();return;
  }
  g.strokeStyle='#728f79';g.lineWidth=5.2;g.stroke(outline);
  g.strokeStyle='#d0d1a2';g.lineWidth=2.8;g.stroke(outline);
  const first=samples[0],last=samples.at(-1);
  const pigment=g.createLinearGradient(first.x,first.y,last.x,last.y);
  pigment.addColorStop(0,'#589b9b');pigment.addColorStop(.4,'#4a9295');pigment.addColorStop(.7,'#448c91');pigment.addColorStop(1,'#559e9b');
  g.fillStyle=pigment;g.fill(outline);
  g.save();g.clip(outline);
  g.strokeStyle='#89bba7';g.lineWidth=5.5;g.stroke(shoal);
  g.strokeStyle='#467f85';g.lineWidth=4.6;g.stroke(depth);
  g.strokeStyle='#c3dfc9';g.lineWidth=.95;g.stroke(wake);g.restore();
}

function inkLake(g,lake,basin) {
  g.strokeStyle='#819a7e';g.lineWidth=6;g.stroke(basin);
  g.strokeStyle='#d2d5ae';g.lineWidth=3;g.stroke(basin);
  const ys=lake.map(t=>hexPoint(t)[1]);
  const blue=g.createLinearGradient(0,Math.min(...ys)-22,0,Math.max(...ys)+25);
  blue.addColorStop(0,'#79adbc');blue.addColorStop(.48,'#659bb0');blue.addColorStop(1,'#4c819c');
  g.fillStyle=blue;g.fill(basin,'evenodd');g.clip(basin,'evenodd');
  g.strokeStyle='#a6c8d0';g.lineWidth=7;g.globalAlpha=.57;g.stroke(basin);g.globalAlpha=1;
  for(const tile of lake){
    const [x,y]=hexPoint(tile);
    for(let i=0;i<15;i++){
      const f=Math.sin((tile.q+1)*71+(tile.r+9)*29+i*83)*539.17;
      const frac=f-Math.floor(f),xx=x+((frac*71)%66)-33,yy=y+((frac*529)%56)-28;
      const length=2+frac*6;
      g.beginPath();g.moveTo(xx,yy);g.quadraticCurveTo(xx+length*.45,yy-.7,xx+length,yy+.2);
      g.strokeStyle=i%4===0?'#c2dce1a8':i%3===0?'#4d809b77':'#a4c4cf73';
      g.lineWidth=i%4===0?.85:.55;g.stroke();
    }
  }
}

// Place names only on discovered water. Choose from each contiguous segment
// rather than joining two sightings across an unmapped reach.
export function waterCaptions(tiles) {
  const named=new Map();
  for(const tile of tiles) {
    if(!tile.waterName || !tile.waterway)continue;
    if(!named.has(tile.waterName))named.set(tile.waterName,[]);
    named.get(tile.waterName).push(tile);
  }
  const captions=[];
  for(const [name,known] of named) {
    const remaining=new Map(known.map(tile=>[tile.id,tile]));
    for(const start of known) {
      if(!remaining.delete(start.id))continue;
      const group=[start];
      for(let i=0;i<group.length;i++) {
        const tile=group[i];
        for(let side=0;side<6;side++){
          const id=idFor(...adjacent(tile.q,tile.r,side)),neighbor=remaining.get(id);
          if(neighbor){group.push(neighbor);remaining.delete(id);}
        }
      }
      const centers=group.map(hexPoint),mid=centers.reduce((sum,p)=>[sum[0]+p[0],sum[1]+p[1]],[0,0]).map(v=>v/group.length);
      let best=group[0],distance=Infinity;
      for(const tile of group){
        const [x,y]=hexPoint(tile),d=(x-mid[0])**2+(y-mid[1])**2;
        if(d<distance){best=tile;distance=d;}
      }
      const others=group.filter(tile=>tile!==best).sort((a,b)=>{
        const dist=t=>{const [x,y]=hexPoint(t);return (x-mid[0])**2+(y-mid[1])**2;};
        return dist(a)-dist(b);
      });
      captions.push({name,tile:best,alternates:others});
    }
  }
  return captions;
}

// Deck, abutments and parallel rails distinguish a land crossing at small scales.
export function inkRiverBridge(g,a,b) {
  const [x,y]=hexPoint(a),[xx,yy]=hexPoint(b),length=Math.hypot(xx-x,yy-y);
  g.save();g.translate((x+xx)/2,(y+yy)/2);g.rotate(Math.atan2(yy-y,xx-x));
  const segment=(x1,y1,x2,y2,color,width)=>{
    g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.lineWidth=width;g.strokeStyle=color;g.stroke();
  };
  g.lineCap='butt';
  segment(-length/2,0,length/2,0,'#897c63',4);
  segment(-length/2,0,length/2,0,'#decca8',2.5);
  const end=length*.29;
  g.fillStyle='#314f54';g.fillRect(-end-1,-4,end*2+2,9);
  g.fillStyle='#d7c6a6';g.fillRect(-end,-2.4,end*2,4.8);
  for(const side of [-1,1]){
    segment(-end,side*3,end,side*3,'#947f61',1.6);
    segment(side*end,-6,side*end,6,'#584c40',3.8);
    segment(side*end,-5.5,side*end,5.5,'#cdc09f',1.6);
  }
  g.restore();
}
