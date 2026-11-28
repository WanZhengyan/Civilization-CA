import {W,H,dX,dY,pos,adjacent,idFor,chartExtent} from './hex-survey.js';

// This is an orthographic, lit terrain mesh painted into a cached atlas.  Keep
// this pitch in step with the camera: a vertical unit of height remains upright
// after the camera foreshortens the horizontal ground plane.
export const RELIEF_PITCH = .70;
const LIGHT = [-.52,-.67,.78];
const LIGHT_LENGTH = Math.hypot(...LIGHT);
const COLORS = {
  plains:[153,177,102], forest:[103,151,87], urban:[159,177,113],
  hills:[166,174,110], mountains:[173,169,140], coast:[216,202,148],
  ocean:[37,116,139]
};
const REGION_STYLE={
  la:{density:.82,pine:.30,height:[10,23],leaf:[[51,113,66],[137,157,77]],colors:{}},
  sf:{density:.94,pine:.64,height:[13,26],leaf:[[36,105,70],[104,150,78]],colors:{plains:[137,170,103],forest:[88,140,88],hills:[146,166,108],mountains:[158,167,149],coast:[207,201,153],ocean:[34,112,134]}},
  sd:{density:.66,pine:.17,height:[8,19],leaf:[[79,124,68],[155,161,89]],colors:{plains:[172,179,110],forest:[118,151,86],hills:[182,173,111],mountains:[188,177,147],coast:[225,208,152],ocean:[39,127,146]}}
};
const regionStyle=id=>REGION_STYLE[id]||REGION_STYLE.la;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ease=n=>{const t=clamp(n,0,1);return t*t*(3-2*t);};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
function hash(x,y,salt=0){
  let n=Math.imul((x|0)+973,0x1f123bb5)^Math.imul((y|0)+191,0x5f356495)^Math.imul(salt|0,0x2af1d57d);
  n=Math.imul(n^(n>>>16),0x45d9f3b);
  return ((n^(n>>>16))>>>0)/4294967296;
}
function randomFor(tile,salt=0){
  let n=Math.floor(hash(tile.q,tile.r,salt)*4294967295);
  return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
}
export function reliefProject([x,y,z=0]){return [x,y-z/RELIEF_PITCH];}
// The depth vector is perpendicular to projected screen-y [0,pitch,-1].
// Elevation therefore affects occlusion even when two anchors share a row.
export function reliefDepth([,y,z=0]){return y+RELIEF_PITCH*z;}
const faceDepth=triangle=>triangle.reduce((sum,p)=>sum+reliefDepth(p),0)/triangle.length;
function color(rgb,light=1){return 'rgb('+rgb.map(v=>Math.round(clamp(v*light,0,255))).join(',')+')';}
export function reliefFacetLight(a,b,c){
  const u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);
  let normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  if(normal[2]<0)normal=normal.map(n=>-n);
  const length=Math.hypot(...normal)||1;
  const facing=normal.reduce((sum,n,i)=>sum+n*LIGHT[i],0)/(length*LIGHT_LENGTH);
  return .56+Math.max(0,facing)*.54;
}
function path(g,vertices){
  g.beginPath();
  vertices.forEach((p,i)=>g[i?'lineTo':'moveTo'](...reliefProject(p)));
  g.closePath();
}
function facet(g,points,rgb,boost=1,softness=0){
  const light=reliefFacetLight(...points),ambient=.56+LIGHT[2]/LIGHT_LENGTH*.54;
  path(g,points);g.fillStyle=color(rgb,(light+(ambient-light)*softness)*boost);g.fill();
  // Match the fill at subpixel boundaries instead of exposing white seams.
  g.strokeStyle=g.fillStyle;g.lineWidth=.34;g.lineJoin='round';g.stroke();
}
function flat(g,points,fill){path(g,points);g.fillStyle=fill;g.fill();}
function line(g,points,stroke,width=1){
  g.beginPath();points.forEach((p,i)=>g[i?'lineTo':'moveTo'](...reliefProject(p)));
  g.strokeStyle=stroke;g.lineWidth=width;g.lineCap='round';g.lineJoin='round';g.stroke();
}
function ellipse(g,x,y,rx,ry,fill){
  g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=fill;g.fill();
}
function hexPoints(tile){const [x,y]=pos(tile.q,tile.r);return dX.map((dx,i)=>[x+dx,y+dY[i],0]);}
function gaussian(x,y,cx,cy,rx,ry){return Math.exp(-(((x-cx)/rx)**2+((y-cy)/ry)**2));}
const profiles=new WeakMap();
function reliefProfile(tile){
  if(profiles.has(tile))return profiles.get(tile);
  const rng=randomFor(tile,223),angle=(rng()-.5)*.92;
  const profile={cos:Math.cos(angle),sin:Math.sin(angle),mirror:rng()>.5?-1:1,
    amplitude:.86+rng()*.32,offset:(rng()-.5)*8,
    peaks:[[-9-rng()*8,9+rng()*10,10+rng()*6,10+rng()*7,36+rng()*12],
      [9+rng()*9,6+rng()*14,8+rng()*5,10+rng()*6,29+rng()*11],
      [-23+rng()*46,-8+rng()*12,11+rng()*7,10+rng()*6,16+rng()*10]],
    crag:rng()*Math.PI*2};
  profiles.set(tile,profile);return profile;
}
function elevation(tile,dx,dy){
  if(tile.terrain==='ocean'||tile.waterway)return 0;
  const rocky=tile.terrain==='mountains';
  const boundary=Math.min((W/2-Math.abs(dx))/(rocky?9:17),(H/2-Math.abs(dy)-Math.abs(dx)*H/(2*W))/(rocky?8:17));
  const edge=ease(boundary),pad=ease((Math.hypot(dx,dy)-8)/9),profile=reliefProfile(tile);
  const x=(dx*profile.cos-dy*profile.sin)*profile.mirror,y=dx*profile.sin+dy*profile.cos;
  let z;
  if(tile.terrain==='mountains'){
    // An elongated, broken crest has shoulders and saddles rather than a row
    // of cloned rounded cones. The small angular component belongs to rock.
    z=Math.max(...profile.peaks.map(([a,b,rx,ry,h])=>h*Math.exp(-(((x-a)/rx)**2+Math.abs((y-b)/ry)**1.35))));
    z+=6*gaussian(x,y,0,14,31,22);
    z*=.93+.10*Math.abs(Math.sin(x*.21+y*.085+profile.crag));
  }else if(tile.terrain==='hills'){
    const [a,b]=profile.peaks;
    z=(a[4]*.24)*gaussian(x,y,-19,a[1]-13,a[2]*1.8,a[3]*1.9)+
      (b[4]*.045)*gaussian(x,y,21,b[1]-7,b[2]*1.8,b[3]*1.8);
    // Broad side shoulders leave a valley through the center. A radial cutout
    // in a high plateau creates a crater, so rolling hills use a gentle saddle.
    return z*edge*ease((Math.abs(x)-5)/13)*profile.amplitude;
  }else if(tile.terrain==='forest'){
    z=1.5*gaussian(x,y,-16,13+profile.offset,27,27)+.8*gaussian(x,y,20,2,23,24);
  }else if(tile.terrain==='coast'){
    z=.35*gaussian(x,y,10,9,23,24);
  }else{
    z=0;
  }
  return z*edge*pad*profile.amplitude;
}

// A wedge subdivision produces shared vertices at hex seams and a stable
// gameplay clearing at every tile center. All heights depend on this tile only.
export function terrainReliefMesh(tile,sort=true){
  const [x,y]=pos(tile.q,tile.r),triangles=[];
  const steps=tile.terrain==='mountains'||tile.terrain==='hills'?7:tile.terrain==='forest'?4:3;
  for(let side=0;side<6;side++){
    const next=(side+1)%6,vertices=[];
    const vertex=(i,j)=>{
      const key=i*(steps+1)+j;if(vertices[key])return vertices[key];
      const dx=(dX[side]*i+dX[next]*j)/steps,dy=(dY[side]*i+dY[next]*j)/steps;
      return vertices[key]=[x+dx,y+dy,elevation(tile,dx,dy)];
    };
    for(let i=0;i<steps;i++)for(let j=0;j<steps-i;j++){
      triangles.push([vertex(i,j),vertex(i+1,j),vertex(i,j+1)]);
      if(i+j<steps-1)triangles.push([vertex(i+1,j),vertex(i+1,j+1),vertex(i,j+1)]);
    }
  }
  return sort?triangles.sort((a,b)=>faceDepth(a)-faceDepth(b)):triangles;
}
function groundFaces(tile,region){
  if(tile.terrain==='ocean'||tile.waterway)return [];
  const rng=randomFor(tile,91),base=regionStyle(region).colors[tile.terrain]||COLORS[tile.terrain]||COLORS.plains;
  return terrainReliefMesh(tile,false).map(points=>{
    const z=points.reduce((sum,p)=>sum+p[2],0)/3;
    const stone=tile.terrain==='mountains'?clamp((z-7)/25,0,1):tile.terrain==='hills'?clamp((z-20)/45,0,.16):0;
    const material=mix(base,region==='sf'?[178,185,167]:[196,185,157],stone);
    return {points,material,boost:tile.terrain==='mountains'?.99+rng()*.016:1,
      softness:tile.terrain==='mountains'?0:tile.terrain==='hills'?.55:.8,depth:faceDepth(points)};
  });
}
function groundMarks(g,tile){
  if(tile.terrain==='ocean'||tile.waterway)return;
  const [x,y]=pos(tile.q,tile.r),rng=randomFor(tile,91);
  // Sparse surface strokes stay attached to the actual mesh height.
  for(let i=0;i<19;i++){
    const dx=(rng()-.5)*60,dy=(rng()-.5)*52;
    if(Math.abs(dy)>H/2-Math.abs(dx)*H/(2*W)-3)continue;
    const z=elevation(tile,dx,dy),p=reliefProject([x+dx,y+dy,z+.05]);
    g.strokeStyle=i%3?'#456e342c':'#fff6be60';g.lineWidth=.65;
    g.beginPath();g.moveTo(...p);g.lineTo(p[0]+1.5,p[1]-1.2);g.stroke();
  }
}

function groundShadow(g,x,y,z,height,width){
  const [px,py]=reliefProject([x,y,z]);
  g.save();g.translate(px+height*.29,py+height*.18);g.rotate(.28);
  ellipse(g,0,0,width+height*.36,width*.37,'#183e3838');
  ellipse(g,-height*.16,-height*.05,width*.7,width*.3,'#173f4030');g.restore();
}
function cuboid(g,x,y,z,width,depth,height,rgb,roof){
  const a=[x-width/2,y-depth/2,z],b=[x+width/2,y-depth/2,z],c=[x+width/2,y+depth/2,z],d=[x-width/2,y+depth/2,z];
  const up=p=>[p[0],p[1],p[2]+height],A=up(a),B=up(b),C=up(c),D=up(d);
  flat(g,[a,d,D,A],color(rgb,.76));flat(g,[d,c,C,D],color(rgb,.62));
  flat(g,[c,b,B,C],color(rgb,.87));flat(g,[A,B,C,D],color(roof||rgb,1.13));
  line(g,[A,D,C],color(rgb,1.23),.45);
  return {a,b,c,d,A,B,C,D};
}
function pine(g,x,y,z,height,width,rgb){
  cuboid(g,x,y,z,1.3,1.3,height*.58,[111,93,57]);
  for(const [level,radius,lift] of [[.20,1,.8],[.43,.81,.91],[.65,.56,1]]){
    const ring=Array.from({length:7},(_,i)=>{const a=i/7*Math.PI*2;return [x+Math.cos(a)*width*radius,y+Math.sin(a)*width*radius,z+height*level];});
    const apex=[x-.6,y-.1,z+height*lift];
    for(const i of [4,5,3,6,2,0,1])facet(g,[ring[i],ring[(i+1)%7],apex],rgb,.92+level*.13);
  }
}
function tree(g,x,y,z,height,width,rgb,rng){
  cuboid(g,x,y,z,1.4,1.4,height*.72,[109,89,54]);
  const middle=z+height*.68,bottom=z+height*.39,top=z+height;
  const ring=Array.from({length:8},(_,i)=>{const a=i/8*Math.PI*2;return [x+Math.cos(a)*width,y+Math.sin(a)*width,middle+(rng()-.5)*height*.12];});
  const crown=[x-width*.17,y-width*.08,top],root=[x,y,bottom];
  for(const i of [4,5,3,6,2,7,1,0]){
    facet(g,[ring[(i+1)%8],ring[i],root],rgb,.76);
    facet(g,[ring[i],ring[(i+1)%8],crown],rgb,1.02);
  }
}
function boulder(g,x,y,z,width,height){
  const points=[[-1,.12,.03],[-.7,-.6,.35],[.2,-.7,.51],[1,-.1,.14],[.7,.65,.02],[-.5,.7,0]]
    .map(([a,b,c])=>[x+a*width,y+b*width,z+c*height]);
  const peak=[x-width*.15,y-width*.03,z+height];
  for(const i of [2,1,3,0,4,5])facet(g,[points[i],points[(i+1)%6],peak],[164,163,133]);
}
function pitchedRoof(g,x,y,z,width,depth,height,roof){
  const a=[x-width/2,y-depth/2,z],b=[x+width/2,y-depth/2,z],c=[x+width/2,y+depth/2,z],d=[x-width/2,y+depth/2,z];
  const back=[x,y-depth/2,z+height],front=[x,y+depth/2,z+height];
  flat(g,[a,d,front,back],color(roof,1.13));flat(g,[b,c,front,back],color(roof,.74));
  flat(g,[d,c,front],color(roof,.90));line(g,[back,front],color(roof,1.32),.4);
}
function urbanBuilding(g,x,y,z,height,width,rng){
  const warm=rng()>.28,wall=warm?[223,211,171]:[191,205,188],roof=warm?[169,112,71]:[118,156,145];
  const depth=4.5+rng()*3,mainWidth=width*.72,wallHeight=height*.76,roofHeight=height-wallHeight;
  cuboid(g,x-width*.23,y-1,z,mainWidth,depth,wallHeight,wall,roof);
  pitchedRoof(g,x-width*.23,y-1,z+wallHeight,mainWidth+.6,depth+.6,roofHeight,roof);
  // A small attached house and courtyard make a readable neighborhood rather
  // than an evenly spaced skyline of single narrow towers.
  const annexX=x+width*.36,annexY=y+depth*.36,annexWidth=width*.55,annexDepth=depth*.74;
  const annexHeight=Math.min(4,height*.62);
  cuboid(g,annexX,annexY,z,annexWidth,annexDepth,annexHeight,wall,roof);
  pitchedRoof(g,annexX,annexY,z+annexHeight,annexWidth+.5,annexDepth+.5,1.2,roof);
  for(let floor=1.6;floor<wallHeight-.4;floor+=2.7){
    const yy=y-1+depth/2+.1;
    for(const dx of [-mainWidth*.27,mainWidth*.1])line(g,[[x-width*.23+dx,yy,z+floor],[x-width*.23+dx,yy,z+floor+.8]],'#4b6860',.7);
  }
  const doorX=annexX-annexWidth*.16,doorY=annexY+annexDepth/2+.1;
  line(g,[[doorX,doorY,z+.2],[doorX,doorY,z+1.5]],'#6b7557',.85);
}

export function reliefScenery(tile,region='la',isLandmark=false){
  if(tile.terrain==='ocean'||tile.waterway)return [];
  const [x,y]=pos(tile.q,tile.r),rng=randomFor(tile,171),features=[],style=regionStyle(region);
  const anchors=[[-23,-7],[-12,-15],[8,-17],[24,-5],[-27,8],[25,9],[-20,21],[-7,26],[14,23],[-5,15],[15,5],[0,-22]];
  const add=(a,b,kind,index)=>{
    const dx=a+(rng()-.5)*6,dy=b+(rng()-.5)*5,z=elevation(tile,dx,dy),variation=rng();
    const forest=tile.terrain==='forest';
    const height=kind==='rock'?2.4+variation*4:kind==='building'?(index===0&&variation>.4?8.5+variation*3.5:3.8+variation*3):
      (forest?style.height[0]:7)+variation*(forest?style.height[1]-style.height[0]:8);
    const width=kind==='rock'?2+variation*2.7:kind==='building'?7.5+variation*2.5:
      (kind==='pine'?3.3:forest?4.1:3)+variation*2.1;
    // Keep the projected center, not merely the ground anchor, free for a
    // unit's feet and selection ring. A southern canopy can otherwise hide it.
    const footprint=kind==='palm'?width*1.6:width;
    const top=dy-(z+height*1.04)/RELIEF_PITCH,bottom=dy-z/RELIEF_PITCH+footprint;
    if(Math.abs(dx)<10+footprint && top<11 && bottom>-11)return;
    const green=mix(...style.leaf,variation);
    features.push({x:x+dx,y:y+dy,z,kind,height,width,green,seed:index,
      depth:reliefDepth([x+dx,y+dy,z+height*.5]),tile:{q:tile.q,r:tile.r}});
  };
  if(tile.terrain==='forest'){
    anchors.forEach(([a,b],i)=>{
      if(isLandmark&&i>7)return;
      if(rng()>style.density)return;
      add(a,b,rng()<style.pine?'pine':'tree',i);
    });
  }else if(tile.terrain==='urban'){
    for(const i of isLandmark?[0,3,6]:[0,1,2,3,4,5,6,8])add(...anchors[i],'building',i);
    if(!isLandmark)for(const i of [7,11])add(...anchors[i],region!=='sf'&&rng()>.6?'palm':'tree',i);
  }else if(tile.terrain==='hills'){
    for(const i of [0,3,6,8])if(rng()>.18)add(...anchors[i],rng()<.42?'tree':'rock',i);
  }else if(tile.terrain==='mountains'){
    for(const i of [0,3,6,8])add(...anchors[i],'rock',i);
  }else if(tile.terrain==='coast'){
    for(const i of [2,5,8])add(...anchors[i],i===5?'rock':region==='sf'?'tree':'palm',i);
  }else{
    for(const i of [0,5,8])if(rng()>(region==='sd'?.5:.2))add(...anchors[i],'tree',i);
  }
  return features.sort((a,b)=>a.depth-b.depth);
}
function palm(g,x,y,z,height,width,rgb){
  const crown=[x-1,y,z+height];
  line(g,[[x,y,z],[x-.5,y,z+height*.5],crown],'#8c8053',1.6);
  for(let i=0;i<7;i++){
    const a=i/7*Math.PI*2,tip=[x+Math.cos(a)*width*1.6,y+Math.sin(a)*width*1.3,z+height*.78];
    const side=[x+Math.cos(a+.34)*width*.7,y+Math.sin(a+.34)*width*.7,z+height*1.04];
    facet(g,[crown,side,tip],rgb,.95);
  }
}
function paintScenery(g,p){
  const rng=randomFor(p.tile,301+p.seed);
  if(p.kind==='building'){urbanBuilding(g,p.x,p.y,p.z,p.height,p.width,rng);return;}
  if(p.kind==='rock'){boulder(g,p.x,p.y,p.z,p.width,p.height);return;}
  if(p.kind==='pine'){pine(g,p.x,p.y,p.z,p.height,p.width,p.green);return;}
  if(p.kind==='palm'){palm(g,p.x,p.y,p.z,p.height,p.width,p.green);return;}
  tree(g,p.x,p.y,p.z,p.height,p.width,p.green,rng);
}

function seaDetails(g,tile,known){
  const [x,y]=pos(tile.q,tile.r),rng=randomFor(tile,31);
  const coastal=[];
  for(let side=0;side<6;side++){
    const neighbor=known.get(idFor(...adjacent(tile.q,tile.r,side)));
    if(neighbor&&neighbor.terrain!=='ocean'&&!neighbor.waterway)coastal.push(side);
  }
  for(const side of coastal){
    const next=(side+1)%6,a=[x+dX[side],y+dY[side],0],b=[x+dX[next],y+dY[next],0];
    const inside=p=>[p[0]+(x-p[0])*.21,p[1]+(y-p[1])*.21,0];
    flat(g,[a,b,inside(b),inside(a)],'#53a7a3');
    const wave=p=>[p[0]+(x-p[0])*.13,p[1]+(y-p[1])*.13,0];
    line(g,[wave(a),wave(b)],'#c7e8c49c',1.15);
  }
  for(let i=0;i<6;i++){
    const dx=(rng()-.5)*51,dy=(rng()-.5)*45,len=2.5+rng()*7;
    if(Math.abs(dy)>H/2-Math.abs(dx)*H/(2*W)-3)continue;
    line(g,[[x+dx-len/2,y+dy,0],[x+dx+len/2,y+dy-.7,0]],i%2?'#b1ded72b':'#163f7022',.7);
  }
  // Bright reflections are restricted to water, not a screen-space gloss.
  if(hash(tile.q,tile.r,7)>.76){
    for(let i=0;i<3;i++)line(g,[[x-4+i,y+3*i,0],[x+4-i,y+3*i,0]],'#c5e9ce4d',.8);
  }
}
function coastBanks(g,tiles,known){
  for(const tile of tiles){
    if(tile.terrain==='ocean'||tile.waterway)continue;
    const [x,y]=pos(tile.q,tile.r);
    for(let side=0;side<6;side++){
      const neighbor=known.get(idFor(...adjacent(tile.q,tile.r,side)));
      if(!neighbor || (neighbor.terrain!=='ocean'&&!neighbor.waterway))continue;
      const next=(side+1)%6,a=[x+dX[side],y+dY[side],0],b=[x+dX[next],y+dY[next],0];
      const drop=side>=1&&side<=3?3.8:1.5;
      const down=p=>[p[0],p[1]+drop,0];
      flat(g,[a,b,down(b),down(a)],side<3?'#7b8056':'#89805b');
      line(g,[a,b],'#e3d6a2',1.8);
      line(g,[down(a),down(b)],'#255f6766',1);
    }
  }
}
function roads(g,map,known){
  const positions=route=>route.map(([q,r])=>pos(q,r));
  for(const route of map.routes||[]){
    const points=positions(route);g.beginPath();let previous=false;
    for(const [x,y] of points){
      const row=Math.round((y-H/2)/(H*.75)),q=Math.round((x-W/2)/W-(row&1)*.5);
      if(!known.has(idFor(q,row))){previous=false;continue;}
      g[previous?'lineTo':'moveTo'](x,y);previous=true;
    }
    g.strokeStyle='#6f79544d';g.lineWidth=3.1;g.lineCap='round';g.lineJoin='round';g.stroke();
    g.strokeStyle='#e7d4a8b3';g.lineWidth=1.7;g.stroke();
  }
  for(const crossing of map.crossings||[]){
    const a=known.get(crossing.a),b=known.get(crossing.b);if(!a||!b)continue;
    const pa=[...pos(a.q,a.r),0],pb=[...pos(b.q,b.r),0];
    if(crossing.kind==='ferry'){
      g.save();g.setLineDash([4,4]);line(g,[pa,pb],'#d6e6c580',1.4);g.restore();continue;
    }
    line(g,[[pa[0]+3,pa[1]+6,0],[pb[0]+3,pb[1]+6,0]],'#123c4b55',5);
    line(g,[pa,pb],crossing.color||'#788d84',4.5);line(g,[pa,pb],'#e9dfba',1);
    for(const f of [.23,.77]){
      const x=pa[0]+(pb[0]-pa[0])*f,y=pa[1]+(pb[1]-pa[1])*f;
      line(g,[[x-1.8,y,0],[x-1.8,y,10],[x+1.8,y,10],[x+1.8,y,0]],crossing.color||'#a36e4f',1.5);
    }
  }
}

export function reliefRasterLayout(tiles){
  const extent=chartExtent(tiles),margin=64;
  const left=extent.left-margin,top=extent.top-margin;
  const width=extent.width+margin*2,height=extent.height+margin*2;
  const resolution=Math.min(2,4095/Math.max(width,height),Math.sqrt(5_000_000/(width*height)));
  return {left,top,width,height,margin,resolution};
}

export function renderReliefAtlas(tiles,map,landmarkTiles=[],paintLandmark){
  // Passing explored tiles is intentional. Hidden terrain is never consulted,
  // and the cropped raster keeps the opening sharp even on the Epic map.
  const source=tiles.length?tiles:[{q:0,r:0,id:'0,0',terrain:'ocean'}];
  const layout=reliefRasterLayout(source),{left,top,width,height,margin,resolution}=layout;
  const buffer=typeof OffscreenCanvas==='function'?new OffscreenCanvas(Math.ceil(width*resolution),Math.ceil(height*resolution)):document.createElement('canvas');
  buffer.width=Math.ceil(width*resolution);buffer.height=Math.ceil(height*resolution);
  const g=buffer.getContext('2d');g.scale(resolution,resolution);g.translate(-left,-top);
  const known=new Map(tiles.map(tile=>[tile.id,tile])),landmarks=new Map(landmarkTiles.filter(t=>known.has(t.id)).map(t=>[t.id,t]));
  const ordered=[...tiles].sort((a,b)=>a.r-b.r||a.q-b.q);
  // Water details are behind every elevated land face. Sorting mesh faces
  // globally prevents a southern flat tile from cutting off a taller ridge.
  for(const tile of ordered)if(tile.terrain==='ocean'||tile.waterway){
    const water=tile.waterway?[49,132,145]:regionStyle(map.id).colors.ocean||COLORS.ocean;
    flat(g,hexPoints(tile),color(water,.97+hash(tile.q,tile.r,8)*.04));
    seaDetails(g,tile,known);
  }
  // Opaque soil underneath every triangle prevents antialiased mesh seams
  // from appearing as a dense triangular grid on otherwise level ground.
  const flatLight=reliefFacetLight([0,0,0],[1,0,0],[0,1,0]);
  for(const tile of ordered)if(tile.terrain!=='ocean'&&!tile.waterway){
    const base=regionStyle(map.id).colors[tile.terrain]||COLORS[tile.terrain]||COLORS.plains;
    flat(g,hexPoints(tile),color(base,flatLight));
  }
  const faces=ordered.flatMap(tile=>groundFaces(tile,map.id));
  faces.sort((a,b)=>a.depth-b.depth);
  for(const face of faces)facet(g,face.points,face.material,face.boost,face.softness);
  for(const tile of ordered)groundMarks(g,tile);
  coastBanks(g,ordered,known);roads(g,map,known);
  const scene=ordered.flatMap(tile=>reliefScenery(tile,map.id,landmarks.has(tile.id)));
  for(const tile of landmarks.values())if(paintLandmark){
    const [x,y]=pos(tile.q,tile.r);scene.push({x,y,z:0,height:20,width:14,kind:'landmark',tile,depth:reliefDepth([x,y,10])});
  }
  scene.sort((a,b)=>a.depth-b.depth);
  // Shadows stay on the ground; a later tree must not paint its shadow over
  // an already painted canopy or the roof of a neighboring building.
  for(const p of scene)groundShadow(g,p.x,p.y,p.z,p.height,p.width*.7);
  for(const p of scene){
    if(p.kind!=='landmark'){paintScenery(g,p);continue;}
    const {x,y}=p;g.save();g.translate(x,y);g.scale(1,1/RELIEF_PITCH);g.translate(-x,-y);
    paintLandmark(g,p.tile,x,y);g.restore();
  }
  if(typeof buffer.transferToImageBitmap==='function')return {buffer:buffer.transferToImageBitmap(),margin,resolution,left,top};
  return {buffer,margin,resolution,left,top};
}
