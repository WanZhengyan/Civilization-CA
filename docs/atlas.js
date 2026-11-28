import {inkWaterways,inkRiverBridge,waterCaptions} from './water-chart.js';
import {battleMarkers,paintBattleReport} from './battle-overlay.js';
import {boxesOverlap,cityFont,cityLabelAt,paintCityLabels,planCityLabels} from './city-labels.js';
import {NATURAL_WONDERS} from './natural-wonders.js';
import {drawFieldStation} from './field-stations.js';
import {drawNaturalWonder} from './natural-wonder-marker.js';
import {W,H,ROW,dX,dY,pos,idFor,adjacent,chartHit,chartExtent,chartFrame,paintChartMargin,inkChartFrame,chartMesh,inkHexGrid,regionOverviewZoom,chartViewport,atlasRasterLayout} from './hex-survey.js';
import {politicalPaths, inkPolitics} from './political-borders.js';
import {drawResource} from './resource-art.js';
import {drawCampus} from './campus-art.js';
import {WONDERS} from './wonders.js';
import {translate} from './i18n.js';
import {renderReliefAtlas, RELIEF_PITCH} from './terrain-relief.js';
import {cameraProject,cameraUnproject,centeredCamera,zoomedCamera,pannedCamera,mapFitZoom} from './map-camera.js';
/* Illustrated, pointy-top, odd-row-offset California campaign maps. */
const FACTION = ['#efbb62','#69b7c7','#8ab98a','#dc8c9f'];
const places = {
  griffith: 'Griffith Observatory', hollywood: 'Hollywood', pier: 'Santa Monica',
  downtown: 'Downtown LA', westwood: 'Westwood', rosebowl: 'Rose Bowl', airport: 'LAX'
};
export function getAtlasPlace(tile, holding) {
  const nature=NATURAL_WONDERS[holding?.naturalWonder];
  if(nature)return {name:nature.name,landmark:null};
  const campus=WONDERS[holding?.wonder];
  if(campus) return {name:campus.name, landmark:null};
  if(!tile.landmark) return null;
  const name=tile.landmark==='studios' ? 'Burbank' : places[tile.landmark] || tile.name;
  return {name,landmark:tile.landmark};
}
function noise(q, r, salt=0) {
  let a = Math.imul((q | 0) + 973, 0x1f123bb5) ^ Math.imul((r | 0) + 191, 0x5f356495) ^ Math.imul(salt | 0, 0x2af1d57d);
  a = Math.imul(a ^ (a >>> 16), 0x45d9f3b);
  return ((a ^ (a >>> 16)) >>> 0) / 4294967296;
}
function generator(q,r,salt=0) {
  let n = Math.floor(noise(q,r,salt) * 4294967295);
  return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; };
}
function hexPath(q,r) {
  const [x,y] = pos(q,r), p = new Path2D();
  for (let k=0;k<6;k++) k ? p.lineTo(x+dX[k], y+dY[k]) : p.moveTo(x+dX[k], y+dY[k]);
  p.closePath(); return p;
}
function line(g, pts, color, width=1) {
  g.beginPath(); g.moveTo(pts[0],pts[1]);
  for(let i=2;i<pts.length;i+=2) g.lineTo(pts[i],pts[i+1]);
  g.strokeStyle=color; g.lineWidth=width; g.stroke();
}
function poly(g, pts, fill, edge='', width=.65) {
  g.beginPath(); g.moveTo(pts[0],pts[1]);
  for(let i=2;i<pts.length;i+=2) g.lineTo(pts[i],pts[i+1]);
  g.closePath(); g.fillStyle=fill; g.fill();
  if(edge){g.strokeStyle=edge;g.lineWidth=width;g.stroke();}
}
function ellipse(g,x,y,rx,ry,fill) {
  g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=fill;g.fill();
}
// Geometry lies on the tilted ground; pieces and their flags stand upright.
function upright(g,x,y,pitch,paint) {
  g.save();g.translate(x,y);g.scale(1,1/(pitch||1));g.translate(-x,-y);
  paint();g.restore();
}
function mountain(g,x,y,s,rnd) {
  g.save();g.translate(x,y);g.scale(s*(.91+rnd()*.26),s*(.75+rnd()*.42));
  ellipse(g,3,2,19,5,'#27362a55');
  const peakY=-14-rnd()*7, ridge=1+rnd()*4;
  poly(g,[-20,1,-11,-8,-7,-9,-2,peakY,4,peakY+5,8,-8,12,-6,18,1,8,3,-5,4], '#bc9e79','#655e55',.85);
  poly(g,[-2,peakY,4,peakY+5,8,-8,12,-6,18,1,10,0,6,2,1,-5,ridge,-7], '#696966');
  poly(g,[-2,peakY,-7,-9,-11,-8,-20,1,-11,-3,-9,-2,-5,-8,-4,-7], '#d6bd8f');
  line(g,[-13,-1,-6,-6,-4,-10,-2,-12], '#897966',.67);
  line(g,[-8,1,-2,-5,0,-4,1,-7], '#e3c894',.67);
  line(g,[5,-10,9,-4,14,-1], '#555451',.65);
  for(let i=0;i<5;i++){const a=rnd()*19-10, b=rnd()*4;line(g,[a,b,a+2+rnd()*2,b-.7],'#c5ac8078',.65);}
  g.restore();
}
function conifer(g,x,y,s,variant=0) {
  g.save();g.translate(x,y);g.scale(s,s);
  ellipse(g,1.5,.6,3.8,1.2,'#172f335d');
  line(g,[0,0,0,-5],'#574c3c',1.1);
  const f=variant?'#3c6651':'#285447',l=variant?'#87a17c':'#789874';
  poly(g,[-3.8,-2.5,-1.7,-5.4,-3,-5.1,-.9,-8.1,-1.8,-8,0,-12.4,2,-8,1,-8,3,-5.3,1.8,-5.4,3.9,-2.5,0,-1.1],f,'#30483e',.42);
  poly(g,[-3.8,-2.5,-1.7,-5.4,-3,-5.1,-.9,-8.1,-1.8,-8,0,-12.4,.1,-3.1],l);
  g.restore();
}
function palm(g,x,y,s) {
  g.save();g.translate(x,y);g.scale(s,s);
  line(g,[.4,0,-.3,-4,-.4,-8], '#544b39',1);
  const top=-8;const a=['#45644b','#435e46','#57734f','#6b8560','#3d5845'];
  for(let i=0;i<5;i++){
    const dx=[-5,-3,.3,3.2,4.8][i],dy=[.3,-1.1,-3,-1,.7][i];
    g.beginPath();g.moveTo(-.4,top);g.quadraticCurveTo(dx*.67,top+dy-2.5,dx,top+dy+1.5);g.quadraticCurveTo(dx*.52,top+dy-.6,-.4,top+.2);g.fillStyle=a[i];g.fill();
  }g.restore();
}
function shrub(g,x,y,s,olive=false) {
  ellipse(g,x+.4*s,y+.6*s,3.2*s,1.4*s,'#293f3a52');
  ellipse(g,x,y-1*s,2.8*s,1.9*s,olive?'#606b4b':'#526d50');
  ellipse(g,x-.75*s,y-1.7*s,1.7*s,1*s,olive?'#89905e':'#84916a');
}
function town(g,x,y,w,d,h,tone,windows=false) {
  const l=w*.45, r=d*.45;
  const roof=['#cdad90','#c6b99e','#aaaab1','#c8a584','#a5acb1','#c3a4a0'][tone];
  const left=['#8f795f','#908b72','#777c7e','#968674','#707a7e','#8f8178'][tone];
  const right=['#615c51','#676a61','#5c636b','#716454','#555e65','#746558'][tone];
  poly(g,[x-w,y-l,x,y,x+d,y-r,x+d,y-r-h,x-w,y-l-h],right,'#414d4780',.55);
  poly(g,[x-w,y-l,x,y,x,y-h,x-w,y-l-h],left,'#50534980',.45);
  poly(g,[x-w,y-l-h,x-w+d,y-l-r-h,x+d,y-r-h,x,y-h],roof,'#5c60524a',.45);
  line(g,[x-w,y-l-h,x,y-h,x+d,y-r-h], '#e2c8a488',.45);
  if(windows && h>4){for(let j=2;j<h-1;j+=2.7) {line(g,[x-w*.82,y-l*.82-j,x-w*.22,y-l*.22-j], '#cfc5a588',.52);line(g,[x+d*.22,y-r*.22-j,x+d*.8,y-r*.8-j],'#becbd179',.5);}}
}
function seaBoat(g,x,y,s) {
  g.save();g.translate(x,y);g.scale(s,s);
  line(g,[-13,5,-5,5.2,4,3.7,12,1.7], '#82b4b77c',.75);
  poly(g,[-7,1,7,-1,4,2,-3,3.1], '#b5b2a1','#3a5861',.6);
  line(g,[.2,.2,-.4,-12], '#bdb7a3',.8);
  poly(g,[-.7,-11,-.7,-1.1,-6.4,.2], '#c8c3a9');
  poly(g,[.4,-9.2,4.8,-1.8,.6,-.7], '#939e98');
  g.restore();
}
const terrainPigment={
  ocean:[80,146,153],coast:[217,192,137],plains:[166,177,121],
  urban:[189,152,118],forest:[104,145,102],hills:[159,161,110],mountains:[151,143,111]
};

function nearTile(geo,x,y) {
  const r=Math.round((y-H*.5)/ROW),q=Math.round((x-W*.5)/W-(r&1)*.5);
  let closest=geo.get(idFor(q,r)),best=Infinity;
  for(let j=r-1;j<=r+1;j++){
    const a=Math.round((x-W*.5)/W-(j&1)*.5),t=geo.get(idFor(a,j));if(!t)continue;
    const [px,py]=pos(a,j),d=(x-px)**2+((y-py)*1.08)**2;
    if(d<best){closest=t;best=d;}
  }return closest;
}
function valueNoise(x,y,step,seed) {
  const px=x/step,py=y/step,ix=Math.floor(px),iy=Math.floor(py);
  let ax=px-ix,ay=py-iy;ax=ax*ax*(3-2*ax);ay=ay*ay*(3-2*ay);
  const a=noise(ix,iy,seed),b=noise(ix+1,iy,seed),c=noise(ix,iy+1,seed),d=noise(ix+1,iy+1,seed);
  return (a+(b-a)*ax)*(1-ay)+(c+(d-c)*ax)*ay;
}
function naturalShore(y){
  const r=(y-H/2)/ROW;
  const ys=[-4,2.75,3.6,4.1,4.7,5.1,5.55,6,6.25,6.52,6.9,7.15,7.5,8.15,8.65,9.1,9.5,10.2,11,12.4,16];
  const xs=[-235,-122,-85,-2,12,67,93,159,185,224,283,287,320,328,358,368,385,411,458,483,628];
  let i=0;while(i<ys.length-2&&ys[i+1]<r)i++;
  const z=Math.min(1,Math.max(0,(r-ys[i])/(ys[i+1]-ys[i]))),d=xs[i+1]-xs[i];
  const slope0=(xs[i+1]-xs[Math.max(0,i-1)])/(ys[i+1]-ys[Math.max(0,i-1)]||1),
    slope1=(xs[Math.min(xs.length-1,i+2)]-xs[i])/(ys[Math.min(ys.length-1,i+2)]-ys[i]||1);
  const curve=xs[i]+(z*z*(3-2*z))*d+z*(1-z)*(1-z)*slope0*(ys[i+1]-ys[i])-z*z*(1-z)*slope1*(ys[i+1]-ys[i]);
  return curve+2.5*Math.sin(y*.077)+1.9*Math.sin(y*.135);
}
function blendRGB(a,b,k){return a.map((v,i)=>v+(b[i]-v)*k);}
function rangeValue(v,a,b){let z=Math.max(0,Math.min(1,(v-a)/(b-a)));return z*z*(3-2*z);}
// Interpolate the land mask between neighboring hex centers. Waterways and islands
// keep the same playable centers as the rules, with soft shores between them.
function regionalShore(geo) {
  const mask=[];
  for(const {q,r,terrain} of geo.values())(mask[r+4]||=[])[q+4]=terrain==='ocean'?-1:1;
  function rowMask(x,r) {
    const q=(x-W/2)/W-(r&1)*.5, left=Math.floor(q);
    const values=mask[r+4],a=values?.[left+4]??1,b=values?.[left+5]??a;
    return a+(b-a)*(q-left);
  }
  return (x,y)=>{
    const r=(y-H/2)/ROW,top=Math.floor(r);
    const a=rowMask(x,top),b=rowMask(x,top+1);
    return (a+(b-a)*(r-top))*53 + 2.3*Math.sin(x*.058+y*.031)+1.2*Math.sin(y*.081);
  };
}
function terrainGround(geo,shore,{width:worldW,height:worldH,margin,terrainStep:step}){
  const w=Math.ceil((worldW+margin*2)/step),h=Math.ceil((worldH+margin*2)/step);
  const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d'),pixels=g.createImageData(w,h),data=pixels.data;
  const sin=Math.sin, samples=[];
  for(const tile of geo.values())(samples[tile.r+4]||=[])[tile.q+4]=tile;
  for(let row=0;row<h;row++){
    const y=row*step-margin;
    for(let col=0;col<w;col++){
      const x=col*step-margin,dx=shore(x,y),r0=Math.round((y-H/2)/ROW),current=[0,0,0];
      let total=0,high=0,woods=0,urban=0;
      for(let r=r0-1;r<=r0+1;r++){
        const yy=H/2+r*ROW,q0=Math.round((x-W/2)/W-(r&1)*.5);
        for(let q=q0-1;q<=q0+1;q++){
          const t=samples[r+4]?.[q+4];if(!t||t.terrain==='ocean')continue;
          const xx=W/2+(q+(r&1)*.5)*W,dd=(x-xx)**2+((y-yy)*1.09)**2;
          const w0=Math.max(0,1-dd/6350)**2.3;if(!w0)continue;
          const p=terrainPigment[t.terrain]||terrainPigment.plains;
          for(let i=0;i<3;i++)current[i]+=p[i]*w0;
          if(t.terrain==='mountains'||t.terrain==='hills')high+=w0*(t.terrain==='hills'?.62:1);
          if(t.terrain==='forest')woods+=w0;
          if(t.terrain==='urban')urban+=w0;
          total+=w0;
        }
      }
      let p=total?current.map(v=>v/total):[187,182,141];
      const n=valueNoise(x,y,55,1)-.5, n2=valueNoise(x+20,y-6,15,2)-.5,
        n3=valueNoise(x-7,y,122,3)-.5, detail=noise(col,row,46)-.5;
      const h0=total?high/total:0, w0=total?woods/total:0, u0=total?urban/total:0;
      const spine=sin(x*.023+y*.043+n*3+n3*5)+.66*sin(x*.043-y*.039+n3*4);
      const relief=spine*h0*11;
      let light=n*16+n2*7+n3*11+detail*3.7+relief;
      p[0]+=light+u0*5-w0*3;p[1]+=light+n*7;p[2]+=light*.84;
      if(dx<27){
        const deep=[22,85,111],middle=[53,136,149],shallows=[128,186,166],sand=[227,210,158];
        const water=blendRGB(blendRGB(deep,middle,rangeValue(dx,-340,-36)),shallows,rangeValue(dx,-86,1));
        for(let i=0;i<3;i++)water[i]+=(n*9+n2*3.5+n3*10+detail*2);
        p=dx<0?water:blendRGB(sand,p,rangeValue(dx,3,27));
      }
      const k=(row*w+col)*4;
      data[k]=p[0];data[k+1]=p[1];data[k+2]=p[2];data[k+3]=255;
    }
  }
  g.putImageData(pixels,0,0);return c;
}
function parkTree(g,x,y,s,v=0){
  g.save();g.translate(x,y);g.scale(s,s);
  ellipse(g,2,.6,4.7,1.55,'#495b4565');line(g,[0,.2,-.1,-4.8],'#706749',1.05);
  ellipse(g,.2,-5.1,4.0,4.3,v?'#5c795d':'#537b61');ellipse(g,-1.15,-6.4,3.15,3.05,v?'#87a171':'#8ba675');
  ellipse(g,-1.9,-7.3,1.85,1.4,'#b0bf8c');g.restore();
}
function house(g,x,y,w,d,h,tone,roof=true){
  const roofPalette=['#c27759','#c79d76','#c88967','#d5b68a','#9d9c91','#a99486'];
  const topPalette=['#e6d0a7','#dbc8ac','#ccb99a','#c4b7a1','#d8bfa0','#ccbcac'];
  const leftPalette=['#dcc09e','#d7b59b','#d0c6a7','#d5c5a7','#c4b5a3','#c5b4a5'];
  const rightPalette=['#a68974','#a79080','#a5a48d','#a9987f','#939787','#9b8a7b'];
  const xx=x,yy=y;const a=w*.36,b=d*.36;
  poly(g,[xx-w,yy-a,xx,yy,xx+d,yy-b,xx+d,yy-b-h,xx-w,yy-a-h],rightPalette[tone]);
  poly(g,[xx-w,yy-a,xx,yy,xx,yy-h,xx-w,yy-a-h],leftPalette[tone]);
  if(roof){
    const roofH=Math.max(1.7,Math.min(3.7,w*.4)),y0=yy-h;
    poly(g,[xx-w-.5,y0-a,xx-w+d*.5,y0-a-b*.5-roofH,xx+d*.5,y0-b*.5-roofH,xx,y0+.6],roofPalette[tone]);
    poly(g,[xx,y0+.6,xx+d*.5,y0-b*.5-roofH,xx+d+.4,y0-b],topPalette[tone]);
    line(g,[xx-w-.4,y0-a,xx,y0+.55], '#746e586b',.65);
  }else{
    poly(g,[xx-w,yy-a-h,xx-w+d,yy-a-b-h,xx+d,yy-b-h,xx,yy-h],topPalette[tone]);
    line(g,[xx-w,yy-a-h,xx,yy-h,xx+d,yy-b-h], '#f6e2bd',.64);
  }
  if(w>4.6&&h>3.8){
    line(g,[xx-w*.72,yy-a*.72-h*.56,xx-w*.37,yy-a*.37-h*.56],'#8e8c76',.85);
    line(g,[xx+d*.27,yy-b*.27-h*.53,xx+d*.64,yy-b*.64-h*.53], '#77877e',.8);
  }
}
function coastPath(shift,worldH) {
  const p=new Path2D();
  for(let y=-190;y<=worldH+190;y+=3){const x=naturalShore(y)+shift+(shift?Math.sin(y*.057+shift*.15)*1.3:0);if(y===-190)p.moveTo(x,y);else p.lineTo(x,y);}
  return p;
}
function bezierRoute(g,coords,colors) {
  const posFloat=(q,r)=>{
    const lo=Math.floor(r),f=r-lo;
    const offset=((lo&1)*(1-f)+((lo+1)&1)*f)*.5;
    return [W*.5+(q+offset)*W,H*.5+r*ROW];
  };
  const pts=coords.map(([q,r])=>posFloat(q,r)),p=new Path2D();p.moveTo(...pts[0]);
  for(let i=1;i<pts.length-1;i++){const [a,b]=pts[i],[c,d]=pts[i+1];p.quadraticCurveTo(a,b,(a+c)/2,(b+d)/2);}
  p.lineTo(...pts.at(-1));for(const [color,width] of colors){g.strokeStyle=color;g.lineWidth=width;g.stroke(p);}
  return p;
}
function roadNetwork(g, historic){
  g.save();g.lineJoin='round';g.lineCap='round';
  const highways=[
    [[3.72,7.13],[4.62,7.6],[5.81,7.85],[7.1,7.82],[8.61,7.35],[9.43,7.55],[10.69,7.94],[11.73,7.76],[12.67,7.23],[14.9,7.6],[17.5,6.8]],
    [[-1,2.38],[2.4,2.65],[4,2.77],[6.4,2.94],[7.48,3.25],[7.77,3.61],[8.73,3.85],[9.46,4.71],[10.27,5.35],[10.96,6.11],[11.51,6.87],[12.15,7.46],[13.18,8.29],[14.19,9.66],[15.75,11.05],[17.68,12.5]],
    [[4.66,13.2],[6.38,11.73],[6.55,10.73],[6.7,9.82],[6.43,8.58],[6.31,7.5],[6.18,6.53],[6.22,5.59],[6.60,4.55],[6.38,3.46],[6.85,2.69],[6.70,1.57],[6.02,-1.8]],
    [[9.7,13.5],[10.62,11.5],[10.55,10.1],[10.82,9.1],[10.86,8.2],[11.17,7.6],[11.71,6.94],[12.3,5.99],[13.06,5.05],[13.92,4.5],[14.75,3.85],[15.44,3.35],[17.1,1.67]]
  ];
  for(const highway of highways)bezierRoute(g,highway,[['#7d7b6390',5.2],['#efe0b9',3.8],['#c7b48d',.82]]);
  // The LA River and its greenbelt curve through the central basin.
  const river=[[6.3,2.55],[7.45,2.72],[8.42,2.86],[9.4,3.00],[10.02,3.15],[10.71,3.45],[11.37,3.43],[11.92,3.83],[12.06,4.49],[11.89,5.12],[11.67,5.87],[11.86,6.56],[11.9,7.17],[12.22,7.83],[12.36,8.5],[12.47,9.47],[13.0,10.22],[13.25,11.13],[13.9,12.3],[14.45,14.0]];
  if(historic)bezierRoute(g,river,[['#77977096',13],['#a5b486',8],['#c6bd99',6.1],['#4d9293',4.5],['#a2d0bd',1.35]]);
  g.restore();
}
function figuresOnTerrain(g,geo,extended,landmarks,shore,{width:worldW,height:worldH,resolution}){
  const spacing=Math.max(1,1/resolution),density=1/spacing;
  const scene=[], nearLandmark=(x,y,rx,ry)=>landmarks.some(([lx,ly])=>Math.abs(x-lx)<rx&&Math.abs(y-ly)<ry);

  // The two oblique streets of a city block share world coordinates across all districts.
  const block=(a,b)=>[(a*17-b*15.4)*spacing,(a*5.15+b*6.8)*spacing];

  // Invert the street grid at all four corners of the illustrated area.
  const corners=[[-120,-118],[-120,worldH+135],[worldW+125,-118],[worldW+125,worldH+135]];
  const determinant=17*6.8+15.4*5.15;
  const is=corners.map(([x,y])=>(6.8*x+15.4*y)/(determinant*spacing));
  const js=corners.map(([x,y])=>(17*y-5.15*x)/(determinant*spacing));
  const firstI=Math.floor(Math.min(...is)),lastI=Math.ceil(Math.max(...is));
  const firstJ=Math.floor(Math.min(...js)),lastJ=Math.ceil(Math.max(...js));
  for(let i=firstI;i<=lastI;i++)for(let j=firstJ;j<=lastJ;j++){
    const [x,y]=block(i,j);
    if(x< -120||x>worldW+125||y< -118||y>worldH+135||shore(x,y)<15)continue;
    const tile=nearTile(geo,x,y);if(!tile)continue;
    const rnd=generator(i,j,71),major=tile.terrain==='urban';
    const districtArea=valueNoise(x,y,97,82);
    const built=major||((tile.terrain==='plains'||tile.terrain==='coast')&&districtArea>.42&&rnd()>.19);
    if(!built||nearLandmark(x,y,32,15))continue;
    const p=block(i+1,j),q=block(i+1,j+1),r=block(i,j+1);
    g.save();g.lineCap='round';
    const warm=rnd();
    if(warm>.80&&districtArea>.64){
      poly(g,[x,y,p[0],p[1],q[0],q[1],r[0],r[1]],'#88a779b0');
      for(let a=0;a<2;a++){const [tx,ty]=block(i+.2+rnd()*.64,j+.2+rnd()*.6);scene.push({y:ty,run:()=>parkTree(g,tx,ty,.55+warm*.3,a%2)});}
    }else{
      const tone=['#c2b19365','#d4ae8f70','#b8b2955c','#b3a78964','#d2bb9e8a'][Math.floor(warm*5)];
      poly(g,[x,y,p[0],p[1],q[0],q[1],r[0],r[1]],tone);
      const dense=major&&districtArea>.44;
      const count=dense?(rnd()>.61?2:1):rnd()>.35?1:0;
      for(let h=0;h<count;h++){
        const ii=count===2?(h===0?.25:.66):.5,jj=.3+rnd()*.48,[bx,by]=block(i+ii,j+jj);
        const roofTone=Math.floor(rnd()*6),width=4.2+rnd()*3.6,depth=3.65+rnd()*3.1;
        const height=2.9+rnd()*(dense?4.2:2.7),lowRise=rnd()>.22;
        scene.push({y:by,run:()=>house(g,bx,by,width*spacing,depth*spacing,height*spacing,roofTone,lowRise)});
      }
      if(rnd()>.69){
        const [tx,ty]=block(i+.14,j+.8);const ts=.44+rnd()*.31;
        scene.push({y:ty,run:()=>parkTree(g,tx,ty,ts,warm>.5)});
      }
    }
    const street=i%4===0||j%4===0;
    line(g,[x,y,p[0],p[1]],street?'#e6d7b0a8':'#e9d5b084',street?1.65:1);
    line(g,[x,y,r[0],r[1]],'#ddcdaa9e',j%4===0?1.5:.9);
    g.restore();
  }
  for(const t of extended){
    const [x,y]=pos(t.q,t.r),rnd=generator(t.q,t.r,109),type=t.terrain;
    if(type==='ocean'||type==='urban')continue;
    if(type==='forest'){
      for(let j=0;j<29*density;j++){
        const xx=x+(rnd()-.5)*72,yy=y+(rnd()-.5)*54;
        if(shore(xx,yy)<7||nearLandmark(xx,yy,25,14))continue;
        const s=.60+rnd()*1.12,evergreen=rnd()>.81,a=rnd();
        scene.push({y:yy,run:()=>evergreen?conifer(g,xx,yy,s*1.15,a>.4):parkTree(g,xx,yy,s,a>.52)});
      }
    }else if(type==='mountains'||type==='hills'){
      const count=type==='mountains'?3:1;
      for(let j=0;j<count;j++){
        const xx=x+(rnd()-.5)*65,yy=y+(rnd()-.5)*30;
        if(shore(xx,yy)<4||nearLandmark(xx,yy,30,13))continue;
        const s=(type==='mountains'?.85:.45)+rnd()*.48;
        const ridgeRng=generator(t.q+j*72,t.r,80);
        scene.push({y:yy,run:()=>ridgeSilhouette(g,xx,yy,s,ridgeRng)});
      }
      for(let j=0;j<8*density;j++){
        const xx=x+(rnd()-.5)*W,yy=y+(rnd()-.5)*54;
        if(nearLandmark(xx,yy,27,17)||shore(xx,yy)<4)continue;
        const s=.43+rnd()*.48,v=rnd();
        scene.push({y:yy,run:()=>v>.4?parkTree(g,xx,yy,s,v>.75):shrub(g,xx,yy,s,true)});
      }
    }else{
      for(let j=0;j<(type==='coast'?9:5)*density;j++){
        const xx=x+(rnd()-.5)*65,yy=y+(rnd()-.5)*49;
        if(nearLandmark(xx,yy,24,13)||shore(xx,yy)<4)continue;
        const s=.57+rnd()*.6,v=rnd();
        scene.push({y:yy,run:()=>type==='coast'&&v>.28?palm(g,xx,yy,s*1.45):parkTree(g,xx,yy,s*.8,v>.6)});
      }
    }
  }
  return scene;
}
function ridgeSilhouette(g,x,y,s,rng) {
  g.save();g.translate(x,y);g.scale(s,s);
  const width=26+rng()*22,h=9+rng()*16,peak=-6+rng()*12;
  const base=2+rng()*2;
  g.beginPath();g.moveTo(-width,base);g.quadraticCurveTo(-width*.67,-3,peak-8,-h+3);
  g.quadraticCurveTo(peak-3,-h-1.4,peak,-h);
  g.lineTo(peak+5,-h+3.2);g.lineTo(peak+11,-h+6.9);g.quadraticCurveTo(width*.8,-3,width+2,base+.4);
  g.bezierCurveTo(width*.52,base+4,-width*.28,base+6,-width,base);
  const fill=g.createLinearGradient(0,-h,3,base+5);fill.addColorStop(0,'#a59c78');fill.addColorStop(1,'#929c73');g.fillStyle=fill;g.fill();
  poly(g,[peak,-h,peak+5,-h+3.2,peak+11,-h+6.9,width+2,base+.4,width*.55,base+2,peak+4,base-3,peak+6,-h*.29,peak+2,-h*.49], '#7d8a6b');
  g.beginPath();g.moveTo(-width*.91,base-.6);g.quadraticCurveTo(-width*.57,-6,peak-8,-h+3.1);g.quadraticCurveTo(peak-3,-h-1,peak,-h);g.strokeStyle='#d3c492';g.lineWidth=1.6;g.stroke();
  for(let i=0;i<6;i++){
    const d=i/7,xx=(1-d)*peak+d*(-width*.75),yy=(1-d)*(-h*.90)+d*base;
    g.beginPath();g.moveTo(xx,yy);g.quadraticCurveTo(xx-2.2,yy+3.3,xx-6-rng()*3,yy+5.5);
    g.strokeStyle=i%2?'#c9bb88':'#a2aa7a';g.lineWidth=.68;g.stroke();
  }
  line(g,[peak+2,-h+1,peak+5,-h*.58,peak+4,-h*.31,peak+9,-1],'#b3ab80',.8);
  g.restore();
}
function renderAtlas(tiles,map,landmarkTiles,drawHistoricRiver=true) {
  const survey=map.terrainAtlas || tiles;
  const layout=atlasRasterLayout(survey);
  const {width:worldW,height:worldH,rows,columns,margin,resolution}=layout;
  const illustratedCoast=map.id==='la' && (map.scaleFactor||1)===1;
  const width=Math.ceil((worldW+2*margin)*resolution),height=Math.ceil((worldH+2*margin)*resolution);
  const buffer=typeof OffscreenCanvas==='function'?new OffscreenCanvas(width,height):document.createElement('canvas');
  buffer.width=width;buffer.height=height;
  const g=buffer.getContext('2d');g.scale(resolution,resolution);g.translate(margin,margin);
  // Terrain interpolation needs samples just past the edge of the playable chart.
  const extended=[...survey],geo=new Map(survey.map(t=>[t.id,t])),landmarks=tiles.filter(t=>t.landmark).map(t=>pos(t.q,t.r));
  for(let r=-4;r<rows+4;r++)for(let q=-4;q<columns+4;q++){
    if(q>=0&&q<columns&&r>=0&&r<rows)continue;
    const clamp=(v,n)=>Math.max(0,Math.min(n,v)),nearest=geo.get(idFor(clamp(q,columns-1),clamp(r,rows-1)));
    const [x,y]=pos(q,r),terrain=illustratedCoast?(x<naturalShore(y)?'ocean':nearest?.terrain==='ocean'?'plains':nearest?.terrain||'plains'):nearest?.terrain||'ocean';
    const t={id:idFor(q,r),q,r,terrain};extended.push(t);geo.set(t.id,t);
  }
  const shore=illustratedCoast?(x,y)=>x-naturalShore(y):regionalShore(geo);
  const base=terrainGround(geo,shore,layout);
  g.drawImage(base,-margin,-margin,worldW+2*margin,worldH+2*margin);
  g.save();g.lineCap='round';g.lineJoin='round';
  // Soft breaker lines and the sandy tide mark follow a continuous coastline.
  for(const [offset,w,col] of [[-45,.9,'#a6d2c353'],[-29,.95,'#acd8cd78'],[-19,.85,'#c2e1d19b'],[-9,1.4,'#d4e9cda8'],[-3.5,2.5,'#e8efccd9'],[0,1.8,'#e9d9ac'],[2.8,.9,'#c6b385a6']]){
    if(illustratedCoast){g.lineWidth=w;g.strokeStyle=col;g.stroke(coastPath(offset,worldH));}
  }
  const rnd=generator(900,900,117);
  for(let i=0;i<5800;i++){
    const x=rnd()*(worldW+margin*2)-margin,y=rnd()*(worldH+margin*2)-margin,distance=-shore(x,y);
    if(distance>5){
      const l=.9+rnd()*(distance>55?5.4:3.4);
      g.beginPath();g.moveTo(x-l*.5,y);g.quadraticCurveTo(x,y+.6,x+l*.5,y-.31);
      g.strokeStyle=rnd()>.56?'#b4dacf67':'#2c728530';g.lineWidth=.54+rnd()*.4;g.stroke();
    }else if(distance < -5){
      g.fillStyle=rnd()>.5?'#f9e7af39':'#6a73512b';g.fillRect(x,y,.7+rnd()*.9,.55+rnd()*.45);
    }
  }
  g.restore();
  const scene=figuresOnTerrain(g,geo,extended,landmarks,shore,layout);
  if(map.routes)for(const route of map.routes)bezierRoute(g,route,[['#847964',4.7],['#e7d4ae',3.2],['#b69e78',.7]]);
  else {
    g.save();
    const factor=map.scaleFactor||1;
    g.translate((1-factor)*W/2,(1-factor)*H/2);g.scale(factor,factor);
    roadNetwork(g,drawHistoricRiver);
    g.restore();
  }
  for(const bridge of map.crossings||[]) {
    const a=map.byId[bridge.a],b=map.byId[bridge.b], pa=pos(a.q,a.r),pb=pos(b.q,b.r);
    const span=[...pa,...pb];
    if(bridge.kind==='ferry'){
      g.save();g.setLineDash([5,4]);line(g,span,'#e9e4c2',2);g.restore();
      for(const [x,y] of [pa,pb]){
        ellipse(g,x,y,3.5,3.5,'#396573');ellipse(g,x,y,1.8,1.8,'#ecdcb2');
      }
      continue;
    }
    line(g,span,'#394c4e',6);
    line(g,span,bridge.color,4.6);
    line(g,span,'#dcc7a0',1.05);
    for(const f of [.23,.77]){
      const x=pa[0]+(pb[0]-pa[0])*f,y=pa[1]+(pb[1]-pa[1])*f;
      line(g,[x-2,y+2,x-2,y-8,x+1,y-9,x+1,y],bridge.color,1.6);
    }
  }
  for(const t of landmarkTiles){
    const [x,y]=pos(t.q,t.r),scales={downtown:1.97,griffith:1.76,hollywood:1.52,pier:1.73,westwood:1.66,studios:1.69,airport:1.65,rosebowl:1.73};
    scene.push({y:y+4,run:()=>{
      g.save();g.shadowColor='#434c4060';g.shadowBlur=2.8;
      drawLandmark(g,t.landmark,x,y+2,scales[t.landmark]||1.55);g.restore();
    }});
  }
  scene.sort((a,b)=>a.y-b.y);for(const item of scene)item.run();
  const boats=illustratedCoast?[[.8,7,1.1],[3,11,1.15],[1,10,.73],[4,9,.9]]:tiles.filter(t=>t.terrain==='ocean'&&!t.waterway&&(t.q*73+t.r*37)%31===0).map(t=>[t.q,t.r,.82]);
  for(const [q,r,s] of boats){const [x,y]=pos(q,r);seaBoat(g,x+4,y+5,s);}
  if(typeof buffer.transferToImageBitmap==='function')return {buffer:buffer.transferToImageBitmap(),margin,resolution};
  // Snapshot the vector painting on engines without transferable canvas bitmaps.
  // Raster rows cap the temporary pixel allocation when finalizing the large chart.
  const still=document.createElement('canvas');still.width=width;still.height=height;
  const ink=still.getContext('2d');
  for(let row=0;row<height;row+=192){
    ink.putImageData(g.getImageData(0,row,width,Math.min(192,height-row)),0,row);
  }
  return {buffer:still,margin,resolution};
}

function smallCaps(g,txt,x,y,size,tracking,color) {
  txt=translate(txt);
  g.save();g.font='500 '+size+'px Georgia, serif';g.textAlign='left';g.textBaseline='middle';
  const widths=[...txt].map(ch=>g.measureText(ch).width),whole=widths.reduce((a,b)=>a+b,0)+(txt.length-1)*tracking;
  let left=x-whole/2;
  for(let i=0;i<txt.length;i++){g.fillStyle=color;g.fillText(txt[i],left,y);left+=widths[i]+tracking;}
  g.restore();
}
function flag(g,x,y,color){
  line(g,[x+1,y,x+1,y-19], '#24363d',2.6);line(g,[x,y,x,y-20], '#e9d7b3',1.1);
  poly(g,[x+.3,y-19,x+10,y-18,x+7.6,y-14.6,x+10,y-12.7,x+.3,y-13.8],color,'#413e36',.65);
}
function label(g,text,x,y,accent,scale) {
  g.save();g.translate(x,y);g.scale(scale,scale);
  g.font='600 12.2px Georgia, serif';g.textBaseline='middle';g.textAlign='center';
  const width=g.measureText(text).width+14;
  const h=18;
  g.shadowBlur=3.5;g.shadowColor='#15242bc9';g.shadowOffsetY=1.5;
  g.beginPath();g.roundRect(-width/2,-h/2,width,h,2.2);g.fillStyle='#27353a';g.fill();g.shadowBlur=0;g.shadowColor='transparent';
  g.lineWidth=.85;g.strokeStyle=accent||'#aa9e7a';g.stroke();
  g.fillStyle='#f3e9cf';g.fillText(text,0,.5);g.restore();
}
function factionColor(model,seat) {
  return model.players[seat]?.color||FACTION[seat%FACTION.length]||FACTION[0];
}
function unitAnchor(model,tile) {
  const t=model.byId.get(tile);if(!t)return null;
  const [x,y]=pos(t.q,t.r);
  return model.cityTiles.has(tile)||t.landmark?[x+17,y+17]:[x,y+16];
}
function drawImprovement(g,tile,kind) {
  const [x,y]=pos(tile.q,tile.r);
  g.save();g.translate(x,y+5);
  if(kind==='farm'){
    poly(g,[-23,0,0,-11,23,-1,0,12],'#755d37','#504534',1.1);
    for(let i=0;i<8;i++){
      const a=-21+i*2.8, b=1+i*1.25;
      line(g,[a,b,a+20,b-9.5],i%2?'#d4b76c':'#a5ae6d',1.9);
    }
    town(g,9,2,5,4,6,0);
    poly(g,[4,-5.7,8,-10.2,13,-7.8,13,-6.2,9,-4.6],'#bd7859','#614f41',.8);
  }else if(kind==='orchard'){
    poly(g,[-20,1,-2,-8,20,1,1,12],'#a48c5c','#644e34',1);
    for(const [a,b] of [[-11,1],[-3,-3],[5,-5],[-3,5],[5,1],[12,-1]]) {
      line(g,[a,b+3,a,b-1],'#594937',1.6);
      ellipse(g,a,b-2,3.1,2.3,'#72804d');ellipse(g,a+1,b-2,1.1,1.1,'#e2a553');
    }
  }else if(kind==='lumberCamp'){
    town(g,5,0,6,4,5,1);
    for(let i=0;i<3;i++){line(g,[-15,2+i*2.1,-4,-2+i*2.1],'#675139',2.6);ellipse(g,-15,2+i*2.1,1.4,1.2,'#d3b17d');}
  }else if(kind==='quarry'){
    for(let n=0;n<3;n++) {
      const w=17-4*n,h=n*2.8;
      poly(g,[-w,h,0,h-w*.4,w,h,0,h+w*.45],['#877f68','#afa188','#c0af91'][n],'#655f54',.8);
    }
  }else if(kind==='fishery'){
    // The mesh reads as a floating pen, distinct from solid rows on farmland.
    poly(g,[-13,-1,0,-7,14,-1,1,6],'#6c9687','#cdb27d',1.65);
    for(const t of [.24,.5,.76]){
      line(g,[-13+13*t,-1-6*t,1+13*t,6-7*t],'#c9c594',.8);
      line(g,[-13+14*t,-1+7*t,14*t,-7+6*t],'#c9c594',.8);
    }
    for(const [a,b] of [[-13,-1],[0,-7],[14,-1],[1,6]]){
      line(g,[a,b+.8,a,b-3],'#72533a',1.1);ellipse(g,a,b-2.5,1.9,1.3,'#e7a164');
      line(g,[a-2,b+2.65,a+2.4,b+2.1],'#b6d4c7',.6);
    }
  }else if(kind==='mine'){
    mountain(g,-1,5,1.02,generator(tile.q,tile.r,124));
    poly(g,[-9,3,-9,-3,-5,-6,2,-5,5,-1,4,4],'#353e3a','#d3a570',2);
    line(g,[-4,3,-13,13],'#4b423a',1.2);line(g,[2,4,-6,14],'#4b423a',1.2);
    for(let i=1;i<5;i++)line(g,[-5-i*2,3+i*2,1-i*2,6+i*2],'#b79671',1);
    town(g,10,2,4,4,4,4);
  }
  g.restore();
}
function drawHarbor(g,city,model,shipyard) {
  const berth=model.byId.get(city.portTile);
  if(!berth)return;
  const [px,py]=pos(berth.q,berth.r);
  const land=model.byId.get(city.tile),[lx,ly]=pos(land.q,land.r);
  // Keep the port on the shore-facing edge of its assigned ocean hex, leaving
  // the center clear for a ship and its selection ring.
  const length=Math.max(1,Math.hypot(lx-px,ly-py)),bias=14;
  g.save();g.translate(px+bias*(lx-px)/length,py+bias*(ly-py)/length+2);g.scale(1,1/(model.pitch||1));
  const ink='#4a493e',timber='#ad8b5b',light='#e4c28a';
  for(const [x,y] of [[-15,0],[-4,4],[12,-2],[17,-5]]) {
    line(g,[x,y-1,x,y+5],ink,2.2);
    line(g,[x+.55,y-.2,x+.55,y+4],timber,.85);
    line(g,[x-3.2,y+5.6,x-1,y+5.8,x+2,y+5.3],'#c1d7c4',.87);
  }
  poly(g,[-18,-1,-1,-8,18,-5,0,3],timber,ink,1);
  for(let i=0;i<6;i++)line(g,[-14+i*4,-2.8-i*.52,-8+i*3.7,.6-i*.6],light,.67);
  poly(g,[-16,-3,-15,-9,-9,-12,-2,-8.7,-2,-3,-8,-.7],'#c39f71',ink,.72);
  poly(g,[-16.8,-8.2,-10,-13.3,-1.1,-9.4,-8.1,-6.8],'#a25e47',ink,.7);
  poly(g,[-13.4,-6,-10.4,-5.1,-10.2,-2,-13.2,-3],'#584e40');
  const color=factionColor(model,city.seat);
  if(shipyard){
    line(g,[3,-6,4.6,-20,12,-8],ink,2.8);
    line(g,[3,-6,4.6,-20,12,-8],'#e7ba6e',1.5);
    line(g,[4.6,-20,15.6,-25.2,11.4,-18.1,4.6,-20],ink,2.2);
    line(g,[4.6,-20,15.6,-25.2,11.4,-18.1,4.6,-20],'#e6b875',1.2);
    line(g,[14.7,-24.3,14.7,-13],ink,.8);
    poly(g,[12.2,-13,16,-14.3,18,-11.8,14,-10],'#aa7753',ink,.65);
  }else{
    line(g,[8,-5,8,-16],ink,1.45);
    poly(g,[8.3,-16,14,-15.1,12.2,-13.5,8.4,-13.1],color,ink,.48);
    ellipse(g,3,-5.6,2.0,1.2,'#8a6651');
  }
  g.restore();
}

function drawCity(g,city,model) {
  const t=model.byId.get(city.tile);if(!t || (model.fog && !model.fog.visible.has(city.tile)))return;
  const [x,y]=pos(t.q,t.r),color=factionColor(model,city.seat);
  const buildings=city.buildings||[];
  if(buildings.includes('harbor'))drawHarbor(g,city,model,buildings.includes('shipyard'));
  g.save();g.translate(x,y);g.scale(1,1/(model.pitch||1));g.translate(-x,-y);
  if(!t.landmark){
    town(g,x-11,y+2,8,7,11,3,true);town(g,x+3,y-1,7.5,9,14,1,true);
    town(g,x-2,y+9,8,6,8,5,true);
    poly(g,[x-10,y-1,x-5,y-5,x+4,y-1,x-2,y+2],'#b37657','#625345',.6);
  }
  if(buildings.length){
    buildings.filter(name=>name!=='harbor'&&name!=='shipyard').slice(0,4).forEach((name,i)=>{
      const [a,b]=[[-23,8],[17,10],[-16,-8],[19,-6]][i];
      const xx=x+a,yy=y+b;
      if(name==='walls'){
        for(let j=0;j<4;j++)town(g,xx+j*2.2,yy+j*.9,2.5,3,j%2?4.5:6,2);
      }else if(name==='granary'){
        town(g,xx,yy,5,5,5,3);ellipse(g,xx-2,yy-7,3,1.5,'#d0ad72');
      }else {
        town(g,xx,yy,5,4,5+i*1.8,i%6,true);
        if(name==='monument')poly(g,[xx-1,yy-7,xx,yy-17,xx+1.2,yy-7],'#e5c492','#726b56',.5);
      }
    });
  }
  if(!t.landmark)flag(g,x+12,y+3,color);
  g.restore();
}
function tacticalLayer(g,model,scale) {
  const {moveTiles=[],attackTiles=[]}=model;
  function overlay(ids,attack) {
    const region=new Set(ids);
    for(const id of region) {
      const t=model.byId.get(id);if(!t)continue;
      const [x,y]=pos(t.q,t.r),p=hexPath(t.q,t.r);
      g.fillStyle=model.pitch<1?(attack?'rgba(211,74,62,.23)':'rgba(55,160,159,.11)'):(attack?'rgba(211,74,62,.34)':'rgba(55,160,159,.25)');g.fill(p);
      for(let k=0;k<6;k++){
        if(region.has(idFor(...adjacent(t.q,t.r,k))))continue;
        const j=(k+1)%6,e=[x+dX[k],y+dY[k],x+dX[j],y+dY[j]];
        g.setLineDash([]);line(g,e,'#1d494ecc',3.3/Math.max(.82,scale));
        g.setLineDash(attack?[]:[4/scale,3/scale]);line(g,e,attack?'#ffa884':'#bbf5e5',1.8/Math.max(.82,scale));g.setLineDash([]);
      }
      if(attack){
        g.save();g.translate(x-22,y-10);g.scale(1,1/(model.pitch||1));g.lineCap='round';ellipse(g,0,0,6.8,6.8,'#763e38');
        line(g,[-2.6,-2.6,2.6,2.6],'#ffe1bc',1.55);line(g,[-2.6,2.6,2.6,-2.6],'#ffe1bc',1.55);g.restore();
      }else{
        g.save();g.beginPath();g.moveTo(x,y+1);g.lineTo(x+3,y+4);g.lineTo(x,y+7);g.lineTo(x-3,y+4);g.closePath();
        g.fillStyle='#e3f6c9ce';g.fill();g.strokeStyle='#34766c';g.lineWidth=.85;g.stroke();g.restore();
      }
    }
  }
  g.save();overlay(moveTiles,false);overlay(attackTiles,true);g.restore();
}
function settlementMarkers(g,model,scale){
  const sites=model.settlementSites;
  if(!sites)return;
  const size=Math.min(1.38,Math.max(.92,.96/scale));
  function draw(ids,immediate){
    for(const id of ids||[]){
      const t=model.byId.get(id);if(!t)continue;
      const [x,y]=pos(t.q,t.r);
      g.save();g.translate(x-21,y+10);g.scale(size,size/(model.pitch||1));
      const cloth=[-.15,-6.8,7.15,-5.5,5.35,-3.4,7.3,-1.85,-.15,-2.75];
      const ink='#23373a',color=immediate?'#ffdc89':'#a3dfed';
      g.lineCap='round';g.lineJoin='round';
      line(g,[-.25,4.8,-.25,-7.4],ink,2.95);
      if(immediate){poly(g,cloth,color,ink,2.15);}
      else{
        g.beginPath();g.moveTo(cloth[0],cloth[1]);
        for(let i=2;i<cloth.length;i+=2)g.lineTo(cloth[i],cloth[i+1]);
        g.closePath();g.lineWidth=2.65;g.strokeStyle=ink;g.stroke();
        g.lineWidth=1.2;g.strokeStyle=color;g.stroke();
      }
      line(g,[-.25,4.75,-.25,-7.35],color,1.1);g.restore();
    }
  }
  draw(sites.nextTurn,false);draw(sites.now,true);
}
function projectedRoute(g,model,scale) {
  const path=model.reviewPath || model.previewPath;
  if(!path?.length||path.length<2)return;
  const positions=path.map(id=>model.byId.get(id)).filter(Boolean).map(t=>pos(t.q,t.r));
  if(positions.length<2)return;
  g.save();g.lineJoin='round';g.lineCap='round';
  const route=new Path2D();positions.forEach(([x,y],i)=>i?route.lineTo(x,y+4):route.moveTo(x,y+4));
  g.strokeStyle='#25494c';g.lineWidth=4.6/Math.max(.75,scale);g.stroke(route);
  g.strokeStyle='#e3f7d6';g.lineWidth=2.3/Math.max(.75,scale);g.setLineDash([5,4]);g.stroke(route);g.setLineDash([]);
  const [x,y]=positions.at(-1);
  g.strokeStyle='#e5f7d4';g.fillStyle='#387a77';g.lineWidth=1.7;
  g.beginPath();g.arc(x,y+4,5.4,0,Math.PI*2);g.fill();g.stroke();
  g.restore();
}
function updateBattleMotion(model,state,now) {
  const log=Array.isArray(state.log)?state.log:[];
  const mark=e=>JSON.stringify([e.round,e.type,e.seat,e.unit,e.from,e.tile,e.path,e.text,e.damage,e.retaliation]);
  // Remember the previous tail, since long campaigns remove old entries at the log cap.
  let recent=[];
  if(model.lastLog!=null){
    const index=log.findLastIndex(e=>mark(e)===model.lastLog);
    if(index>=0)recent=log.slice(index+1);
  }
  model.lastLog=log.length?mark(log[log.length-1]):null;
  const before=new Map(model.units.map(u=>[u.id,u]));
  const after=new Map((state.units||[]).map(u=>[u.id,u]));
  let offset=0;
  for(const e of recent.filter(e=>e.type==='move'||e.type==='attack').slice(-12)){
    const u=before.get(e.unit)||after.get(e.unit);if(!u)continue;
    const path=e.type==='move'&&e.path?.length>=2?e.path:[e.from,e.tile];
    if(path.some(id=>!model.byId.has(id)))continue;
    const span=e.type==='move'?Math.max(470,Math.min(1500,(path.length-1)*410+110)):950;
    const defender=e.type==='attack'?model.units.find(v=>v.tile===e.tile&&v.id!==u.id):null;
    model.motions.push({kind:e.type,unit:u,defender,from:e.from,tile:e.tile,path,damage:e.damage||0,retaliation:e.retaliation||0,start:now+offset,end:now+offset+span});
    offset+=Math.min(span*.37,185);
  }
  // A restored game snapshot may arrive between log writes; still move existing units visibly.
  if(model.haveState){
    for(const [id,newUnit] of after){
      const old=before.get(id);
      if(old&&newUnit.tile!==old.tile&&!recent.some(e=>e.unit===id && (e.type==='move'||e.type==='attack')))
        model.motions.push({kind:'move',unit:newUnit,path:[old.tile,newUnit.tile],from:old.tile,tile:newUnit.tile,start:now,end:now+535});
    }
  }
  model.haveState=true;model.motions=model.motions.filter(e=>e.end>now).slice(-24);
}
function shield(g,x,y,color,letter,selected,hp,maxHp,unitScale) {
  g.save();g.translate(x,y);g.scale(unitScale,unitScale);
  const width=8.4;
  g.shadowColor='#1b2830ce';g.shadowBlur=2.2;
  poly(g,[-width,-6.8,width,-6.8,width-1,2.6,0,7.7,-width+1,2.6], '#26343a',selected?'#fce5a1':color,1.55);
  g.shadowBlur=0;
  g.fillStyle=color;g.fillRect(-6.3,-5.35,12.6,1.45);
  g.textAlign='center';g.textBaseline='middle';g.font='bold 8.7px sans-serif';g.fillStyle='#f8ebca';g.fillText(letter,0,0);
  if(Number.isFinite(hp)&&maxHp>0){
    g.fillStyle='#202d32';g.fillRect(-8,8.5,16,3.2);
    g.fillStyle=hp/maxHp<.35?'#f48c73':hp/maxHp<.7?'#e8b569':'#b3d5a1';
    g.fillRect(-7.3,9.1,14.6*Math.max(0,Math.min(1,hp/maxHp)),1.8);
  }
  g.restore();
}
function battleFX(g,e,model,f) {
  const from=unitAnchor(model,e.from),to=unitAnchor(model,e.tile);if(!from||!to)return;
  const [ax,ay]=from,[bx,by]=to,dx=bx-ax,dy=by-ay;
  if((e.unit.type==='ranged'||e.unit.type==='skirmisher') && f>=.20 && f<.57) {
    const k=(f-.20)/.37,xx=ax+k*dx,yy=ay-19+k*dy-Math.sin(k*Math.PI)*15;
    g.save();g.translate(xx,yy);g.rotate(Math.atan2(dy-15*Math.PI*Math.cos(k*Math.PI),dx));
    line(g,[-12,0,1,0],'#352f2b',2.6);line(g,[-12,0,0,0],'#fff1bc',1.15);
    poly(g,[2,0,-3,-2,-2,0,-3,2],'#f6e3b5');g.restore();
  }
  if((e.unit.type==='artillery'||e.unit.type==='frigate'||e.unit.type==='ironclad'||e.unit.type==='destroyer'||e.unit.type==='armor'||e.unit.type==='riflemen')&&f>=.22&&f<.52){
    const k=(f-.22)/.30,arc=e.unit.type==='artillery'?17:4;
    const x=ax+dx*k,y=ay-18+dy*k-Math.sin(k*Math.PI)*arc;
    g.save();g.globalAlpha=1-k*.35;
    line(g,[x-dx*.042,y-dy*.042,x,y],'#ffe0a2',1.7);
    ellipse(g,x,y,2.55,1.75,'#e7b76e');
    if(k<.28){
      const side=Math.sign(dx)||1;
      poly(g,[ax+side*9,ay-17,ax+side*17,ay-21,ax+side*15,ay-17,ax+side*22,ay-16,ax+side*11,ay-14],'#ffe1a2');
    }
    g.restore();
  }
  if(f>.42 && f<.79){
    const a=(f-.42)/.37,ix=bx,iy=by-12;
    g.save();g.globalAlpha=Math.max(0,1-a);
    for(let i=0;i<8;i++){
      const angle=i*Math.PI/4+.17,rad=3+11*a;
      line(g,[ix+Math.cos(angle)*(rad+1),iy+Math.sin(angle)*(rad+1),ix+Math.cos(angle)*(rad+7),iy+Math.sin(angle)*(rad+7)],i%2?'#ffe0a4':'#e98761',2.1);
    }g.restore();
  }
  if(f>.46 && e.damage>0) {
    const a=(f-.46)/.54;
    g.save();g.globalAlpha=Math.min(1,(1-a)*3);g.font='bold 14px sans-serif';g.textAlign='center';g.textBaseline='middle';
    g.lineJoin='round';g.lineWidth=3.6;g.strokeStyle='#403138';g.fillStyle='#ffd3a4';
    g.strokeText('−'+e.damage,bx,by-34-a*15);g.fillText('−'+e.damage,bx,by-34-a*15);
    if(e.retaliation>0){g.strokeText('−'+e.retaliation,ax,ay-31-a*11);g.fillText('−'+e.retaliation,ax,ay-31-a*11);}
    g.restore();
  }
}
const UNIT_INSIGNIA = {
  ironclad:'I', destroyer:'D', sappers:'E', signals:'S', pikes:'P', skirmisher:'K', melee:'M', ranged:'R', settler:'S', builder:'B', scout:'◈', cavalry:'C', riflemen:'R',
  artillery:'A', armor:'T', cutter:'C', frigate:'F', workboat:'W'
};
function paintUnits(g,model,scale,now) {
  let motion=model.motions.filter(e=>e.end>now);model.motions=motion;model.hitUnits=[];
  const data=new Map(model.units.map(u=>[u.id,u]));
  // Keep a defeated attacker present long enough to complete the clash.
  const faded=new Map();
  for(const e of motion)if(e.kind==='attack'){
    if(!data.has(e.unit.id)){data.set(e.unit.id,e.unit);faded.set(e.unit.id,e);}
    if(e.defender&&!data.has(e.defender.id)){data.set(e.defender.id,e.defender);faded.set(e.defender.id,e);}
  }
  const paint=[];const effects=[];
  for(const u of data.values()) {
    let xy=unitAnchor(model,u.tile);if(!xy)continue;
    let stride=0,strike=0,facing=(u.seat%2===0?1:-1);
    const active=motion.find(e=>e.unit.id===u.id);
    if(active){
      const f=Math.max(0,Math.min(1,(now-active.start)/(active.end-active.start)));
      const start=unitAnchor(model,active.from),end=unitAnchor(model,active.tile);
      if(!start||!end)continue;
      facing=end[0]>=start[0]?1:-1;
      if(active.kind==='move'){
        const path=active.path.map(id=>unitAnchor(model,id)).filter(Boolean);
        if(path.length>=2){
          const step=f*(path.length-1),j=Math.min(path.length-2,Math.floor(step)),local=step-j;
          const p=path[j],next=path[j+1];xy=[p[0]+(next[0]-p[0])*local,p[1]+(next[1]-p[1])*local];
          facing=next[0]>=p[0]?1:-1;stride=f*Math.PI*2.0*(path.length-1)*1.46;
          xy[1]-=Math.abs(Math.sin(stride))*.9;
          if(now>=active.start){
            g.save();g.beginPath();g.moveTo(...xy);for(let i=j+1;i<path.length;i++)g.lineTo(...path[i]);g.strokeStyle='#dce7b9aa';g.lineWidth=1.5;g.setLineDash([3,4]);g.stroke();g.restore();
          }
        }
      }else{
        const ranged=['ranged','skirmisher','artillery','frigate','ironclad','destroyer'].includes(u.type),phase=Math.max(0,Math.min(1,(f-.10)/.70));
        const a=!ranged&&u.tile===active.tile
          ? (f<.48?.56*Math.sin(Math.min(1,Math.max(0,(f-.1)/.38))*Math.PI/2):.56+.44*Math.min(1,(f-.48)/.52))
          : Math.sin(Math.PI*phase)*(ranged?.085:.54);
        xy=[start[0]+(end[0]-start[0])*a,start[1]+(end[1]-start[1])*a];
        strike=Math.sin(Math.min(1,f/.56)*Math.PI*.78)*Math.max(0,1-Math.max(0,f-.56)*2.4);
        if(now>=active.start)effects.push([active,f]);
      }
    } else {
      const hit=motion.find(e=>e.kind==='attack'&&e.tile===u.tile&&e.unit.id!==u.id);
      if(hit){const f=(now-hit.start)/(hit.end-hit.start);if(f>.43&&f<.67)xy[0]+=Math.sin((f-.43)*62)*3.8*(1-(f-.43)/.24);}
    }
    paint.push({u,xy,stride,strike,facing,moving:Boolean(active)});
  }
  paint.sort((a,b)=>a.xy[1]-b.xy[1]);
  for(const {u,xy:[x,y],stride,strike,facing} of paint){
    const selected=u.id===model.selectedUnitId,colour=factionColor(model,u.seat),factor=selected?1.48:1.30;
    g.save();
    const defeated=faded.get(u.id);
    if(defeated){const f=(now-defeated.start)/(defeated.end-defeated.start);g.globalAlpha=Math.min(1,Math.max(0,(1-f)*2.75));}
    if(model.pitch<1){
      ellipse(g,x+9,y+5,19*factor,5.8*factor,'#152e343a');
      ellipse(g,x+3,y+2,13*factor,4.5*factor,'#172a3490');
      if(!selected){g.save();g.beginPath();g.ellipse(x,y+1,14.4*factor,5.6*factor,0,0,Math.PI*2);g.strokeStyle=colour;g.globalAlpha=.72;g.lineWidth=1.2;g.stroke();g.restore();}
    }else ellipse(g,x+1,y+1.5,15*factor,4.8*factor,'#1d2c35a8');
    if(selected){
      g.save();g.beginPath();g.ellipse(x,y+1,17.3,6.1,0,0,Math.PI*2);g.lineWidth=2.4;g.strokeStyle='#ffdc87';g.stroke();g.restore();
    }
    const pitch=model.pitch||1;
    upright(g,x,y,pitch,()=>drawUnitArt(g,u.type,x,y,{color:colour,facing,stride,strike,scale:factor}));
    const badgeScale=Math.max(1.0,Math.min(1.4,1.04/scale)),bx=x+13.2*factor,by=y-29*factor/pitch;
    upright(g,bx,by,pitch,()=>shield(g,bx,by,colour,UNIT_INSIGNIA[u.type]||'U',selected,u.hp,u.maxHp,badgeScale));
    if(!defeated)model.hitUnits.push({id:u.id,tile:u.tile,x,y,width:16*factor,height:40*factor/pitch,bx,by,badgeScale});
    g.restore();
  }
  for(const [e,f] of effects)battleFX(g,e,model,f);
  return motion.length>0;
}

import {paintWorkSurvey, drawCivicBuilding, drawWorkInProgress} from './construction-art.js';
import {drawBarbarians} from "./barbarian-art.js";

function paintHexFocus(g,model,scale) {
  const {selectedId,hoverId,byId:lookup}=model;
  if(model.frontierHexes?.length){
    g.save();g.strokeStyle='#9bcac3';g.lineWidth=1.4/scale;g.setLineDash([2/scale,3/scale]);
    for(const id of model.frontierHexes){
      const tile=lookup.get(id);if(tile)g.stroke(hexPath(tile.q,tile.r));
    }
    g.restore();
  }
  for(const [id,hover] of [[model.targetId||hoverId,true],[selectedId,false]]){
    const t=lookup.get(id);if(!t || (hover && id===selectedId))continue;
    const p=hexPath(t.q,t.r);g.save();
    const [cx,cy]=pos(t.q,t.r);g.translate(cx,cy);g.scale(.89,.89);g.translate(-cx,-cy);
    if(!hover){g.strokeStyle='#665634';g.lineWidth=4.1/Math.max(scale,.7);g.stroke(p);}
    g.strokeStyle=hover?'#e9ecd7e0':'#ffe197';g.lineWidth=(hover?1.6:2.4)/Math.max(scale,.7);
    if(!hover){g.shadowColor='#ffe9a6';g.shadowBlur=3;}
    g.stroke(p);g.shadowBlur=0;g.fillStyle=hover?'#ffefc51b':'#ffcd6728';g.fill(p);
    if(!hover){
      const [x,y]=pos(t.q,t.r);
      for(let k=0;k<6;k++){const xx=x+dX[k],yy=y+dY[k];ellipse(g,xx,yy,1.7/scale,1.7/scale,'#ffedb8');}
    }
    g.restore();
  }
}

// All rows contain these inner bounds, including the inset on alternating rows.
// Keep the complete nameplate inside the campaign's stepped cutline.
const captionStrips=new WeakMap();
function chartCaptionStrips(region) {
  if(captionStrips.has(region))return captionStrips.get(region);
  const strips=[];
  // Each contiguous row of same-width hexes contains an uninterrupted
  // rectangular strip between the upper and lower shoulders of the hexes.
  for(const tile of region.tiles){
    const [x,y]=pos(tile.q,tile.r),previous=strips.at(-1);
    if(previous && previous.y===y && previous.right===x-W/2)previous.right=x+W/2;
    else strips.push({left:x-W/2,right:x+W/2,y});
  }
  captionStrips.set(region,strips);
  return strips;
}

export function fitAtlasCaption(x,y,halfWidth,halfHeight,region=getMap('la')) {
  const hasTile=id=>Object.hasOwn(region.byId,id);
  const samples=Math.max(1,Math.ceil(2*halfWidth/(W/4)));
  let inside=true;
  for(let i=0;i<=samples && inside;i++){
    const xx=x-halfWidth+2*halfWidth*i/samples;
    inside=Boolean(chartHit(xx,y-halfHeight,hasTile) && chartHit(xx,y+halfHeight,hasTile));
  }
  if(inside)return [x,y];
  let best=[x,y],distance=Infinity;
  for(const strip of chartCaptionStrips(region)){
    const left=strip.left+halfWidth+2,right=strip.right-halfWidth-2;
    if(right<left)continue;
    const dy=Math.max(0,H/4-halfHeight-2);
    const xx=Math.max(left,Math.min(right,x)),yy=Math.max(strip.y-dy,Math.min(strip.y+dy,y));
    const squared=(xx-x)**2+(yy-y)**2;
    if(squared<distance){best=[xx,yy];distance=squared;}
  }
  return best;
}

function overlayUnitBoxes(model,scale) {
  const boxes=[],pitch=model.pitch||1;
  for(const u of model.units){
    const a=unitAnchor(model,u.tile);if(!a)continue;
    const f=u.id===model.selectedUnitId?1.48:1.30, badge=Math.max(1,Math.min(1.4,1.04/scale));
    boxes.push([a[0]-16*f,a[1]-40*f/pitch,a[0]+16*f,a[1]+5]);
    boxes.push([a[0]+13.2*f-9*badge,a[1]-(29*f+8*badge)/pitch,a[0]+13.2*f+9*badge,a[1]+(-29*f+12*badge)/pitch]);
  }
  if(model.motions.length)for(const u of model.hitUnits){
    boxes.push([u.x-u.width,u.y-u.height,u.x+u.width,u.y+5]);
    boxes.push([u.bx-9*u.badgeScale,u.by-8*u.badgeScale/pitch,u.bx+9*u.badgeScale,u.by+12*u.badgeScale/pitch]);
  }
  return boxes;
}

function renderOverlay(g,tiles,model,scale,labels,territories,unitBoxes,cityBoxes) {
  const {board={},players=[]}=model;
  const piece=(tile,paint)=>upright(g,...pos(tile.q,tile.r),model.pitch,paint);
  const pitch=model.pitch||1;
  const getFaction=owner=>players[owner]?.color||FACTION[owner%4]||FACTION[0];
  if(territories){
    for(const t of tiles){
      if(model.fog && !model.fog.visible.has(t.id))continue;
      const holding=board[t.id];if(holding?.owner==null)continue;
      g.save();g.globalAlpha=model.pitch<1?.095:.15;g.fillStyle=getFaction(holding.owner);g.fill(hexPath(t.q,t.r));g.restore();
      if(holding.level>0 && !t.landmark){
        const [x,y]=pos(t.q,t.r);
        piece(t,()=>{town(g,x+1,y+5,5.5,5.3,5+holding.level*2,2,true);
        if(holding.level>1)town(g,x-5,y+8,4,4,5,3,true);});
      }
    }
  }
  for(const t of tiles){const improvement=board[t.id]?.improvement;if(improvement)piece(t,()=>drawImprovement(g,t,improvement));}
  if(model.showResources) for(const tile of tiles) {
    const resource=board[tile.id]?.resource;
    if(resource)piece(tile,()=>drawResource(g,...pos(tile.q,tile.r),resource));
  }
  for(const t of tiles){
    const holding=board[t.id];
    if(holding?.fieldStation)piece(t,()=>drawFieldStation(g,holding.fieldStation,...pos(t.q,t.r)));
    if(holding?.naturalWonder)piece(t,()=>drawNaturalWonder(g,holding.naturalWonder,...pos(t.q,t.r),scale));
    if(holding?.facility){const [x,y]=pos(t.q,t.r);piece(t,()=>drawCivicBuilding(g,holding.facility,x,y,getFaction(holding.owner)));}
    if(holding?.wonder){const [x,y]=pos(t.q,t.r);piece(t,()=>drawCampus(g,holding.wonder,x,y,getFaction(holding.owner)));}
  }
  for(const c of model.cities||[])drawCity(g,c,model);
  for (const city of model.cities||[]) {
    const q=city.queue,t=q?.site && model.byId.get(q.site);
    if (t && (!model.fog || model.fog.visible.has(t.id))) piece(t,()=>drawWorkInProgress(g,...pos(t.q,t.r)));
    const center=Object.entries(city.buildingSites||{}).filter(([,id])=>id===city.tile).at(-1);
    if (center && model.byId.has(city.tile)) {
      const t=model.byId.get(city.tile),[x,y]=pos(t.q,t.r);piece(t,()=>drawCivicBuilding(g,center[0],x-11,y+7,getFaction(city.seat),.78));
    }
    const yard=city.buildingSites?.shipyard;
    if (yard && yard===city.portTile && model.byId.has(yard)) {
      const t=model.byId.get(yard),[x,y]=pos(t.q,t.r);piece(t,()=>drawCivicBuilding(g,'shipyard',x-9,y+5,getFaction(city.seat),.8));
    }
  }
  drawBarbarians(g,model,pos);
  if(territories)inkPolitics(g,model.politics,scale,getFaction);
  tacticalLayer(g,model,scale);projectedRoute(g,model,scale);settlementMarkers(g,model,scale);
  const lookup=model.byId;
  for(const city of model.cities || [])if(city.originalSeat!=null){
    const t=lookup.get(city.tile);if(!t || (model.fog && !model.fog.visible.has(city.tile)))continue;
    const [x,y]=pos(t.q,t.r);piece(t,()=>flag(g,x+22,y+8,getFaction(city.seat)));
  }
  if(!labels)return;
  // Wide ocean lettering uses two lines, like a small-scale nautical chart.
  const region=model.region||getMap('la');
  const [oq,or,topLine,bottomLine]=region.oceanLabel;
  const [ox,oy]=pos(oq,or);
  g.save();g.translate(ox-3,oy+7);g.rotate(-.15);
  g.shadowColor='#22576a';g.shadowBlur=2;smallCaps(g,topLine,0,-10,21,4,'#d6e3cf');smallCaps(g,bottomLine,0,14,17,4.1,'#d0e1d1');g.restore();
  const labelScale=Math.max(.78,Math.min(1.30,.96/scale));
  const [rq,rr,ridge]=region.ridgeLabel;
  const [mountX,mountY]=pos(rq,rr);g.save();g.translate(mountX,mountY+20);g.rotate(.022);
  g.shadowColor='#405b48';g.shadowBlur=2.3;smallCaps(g,ridge,0,0,9.3*labelScale,1.4,'#f9e9bd');g.restore();
  if(region.id==='sd'){
    const [bx,by]=pos(9.6,8.6),factor=region.scaleFactor||1;
    g.save();g.translate(factor*(bx-W/2)+W/2,factor*(by-H/2)+H/2);g.rotate(.22);
    g.shadowColor='#234651';g.shadowBlur=2;smallCaps(g,'SAN DIEGO BAY',0,0,9*labelScale,1.4,'#f5eac4');g.restore();
  }
  const labelBounds=[];
  function placeLabel(x,y,name){
    g.save();g.font='600 12.2px Georgia,serif';
    const half=(g.measureText(name).width+16)*labelScale/2,height=9.5*labelScale/pitch;g.restore();
    let best,minimum=Infinity;
    for(const [dx,dy] of [[0,0],[12,-7],[-12,-7],[23,-4],[-23,-4],[9,11],[-9,11],[25,8],[-25,8],[0,-11]]){
      const [xx,yy]=fitAtlasCaption(x+dx,y+dy,half,height,region);
      const rect=[xx-half,yy-height,xx+half,yy+height];
      if(cityBoxes.some(box=>boxesOverlap(rect,box,2/scale)))continue;
      let score=Math.abs(xx-x)*.7+Math.abs(yy-y);
      for(const box of unitBoxes.concat(labelBounds)){
        score+=Math.max(0,Math.min(rect[2],box[2])-Math.max(rect[0],box[0]))*
               Math.max(0,Math.min(rect[3],box[3])-Math.max(rect[1],box[1]))*2.4;
      }
      if(score<minimum){minimum=score;best={xx,yy,rect};}
      if(score===0)break;
    }
    if(!best)return null;
    labelBounds.push(best.rect);return [best.xx,best.yy];
  }
  for(const t of tiles){
    const place=getAtlasPlace(t,board[t.id]);
    if(!place || model.cityTiles.has(t.id))continue;
    const [x,y]=pos(t.q,t.r),owner=board[t.id]?.owner;
    const name=translate(place.name);
    const lx=x+(place.landmark==='hollywood'?-22:place.landmark==='griffith'?15:0);
    const ly=y+(place.landmark==='hollywood'?18:place.landmark==='griffith'?28:24);
    const point=placeLabel(lx,ly,name);
    if(point)upright(g,...point,pitch,()=>label(g,name,...point,owner!=null && territories?getFaction(owner):'#a5997a',labelScale));
  }
  if(scale>.45 && region.waterways){
    for(const {name,tile,alternates} of model.waterCaptions||[]){
      const caption=translate(name),size=Math.max(12,Math.min(20,12/scale));
      g.save();g.font='italic 600 '+size+'px Georgia, serif';g.textAlign='center';g.textBaseline='middle';
      const half=g.measureText(caption).width/2+2,occupied=[...cityBoxes,...unitBoxes,...labelBounds];
      for(const candidate of [tile,...alternates]){
        const [x,y]=pos(candidate.q,candidate.r),box=[x-half,y+5+size/2-size/(2*pitch),x+half,y+5+size/2+size/(2*pitch)];
        if(occupied.some(other=>boxesOverlap(box,other,2/scale)))continue;
        if(model.fog && [box[0],x,box[2]].some(xx=>[box[1],box[3]].some(yy=>
          !chartHit(xx,yy,id=>model.fog.explored.has(id)))))continue;
        upright(g,x,y+5+size/2,pitch,()=>{
          g.strokeStyle='#25515b';g.lineWidth=2.8/Math.max(.72,scale);g.strokeText(caption,x,y+5+size/2);
          g.fillStyle='#e8f6e8';g.fillText(caption,x,y+5+size/2);
        });labelBounds.push(box);break;
      }
      g.restore();
    }
  }
  if(scale>.88){
    for(const tile of tiles){
      if(!tile.localityLabel||tile.waterway||model.cityTiles.has(tile.id)||board[tile.id]?.wonder)continue;
      const [x,y]=pos(tile.q,tile.r),name=translate(tile.locality);
      g.save();g.font='italic 11px Georgia, serif';g.textAlign='center';g.textBaseline='middle';
      const half=g.measureText(name).width/2+2,box=[x-half,y+15-8/pitch,x+half,y+15+8/pitch];
      if(![...cityBoxes,...unitBoxes,...labelBounds].some(other=>boxesOverlap(box,other,2/scale))){
        upright(g,x,y+15,pitch,()=>{
          g.strokeStyle='#34463e';g.lineWidth=2.4;g.strokeText(name,x,y+15);
          g.fillStyle='#f6e6bf';g.fillText(name,x,y+15);
        });labelBounds.push(box);labelBounds.push(box);
      }
      g.restore();
    }
  }
  if(scale>1.02){
    const names=region.districts;
    for(const t of tiles) if(t.namedCenter!==false && names.includes(t.name)&&!getAtlasPlace(t,board[t.id])&&!model.cityTiles.has(t.id)){
      const [x,y]=pos(t.q,t.r);g.save();g.font='italic 13px Georgia, serif';g.textAlign='center';g.textBaseline='middle';
      const name=translate(t.name),half=g.measureText(name).width/2+2;
      const box=[x-half,y+14-9/pitch,x+half,y+14+9/pitch];
      if(![...cityBoxes,...unitBoxes,...labelBounds].some(other=>boxesOverlap(other,box,2/scale))){
        upright(g,x,y+14,pitch,()=>{
          g.strokeStyle='#39443e';g.lineWidth=2.5;g.strokeText(name,x,y+14);g.fillStyle='#eee1bd';g.fillText(name,x,y+14);
        });labelBounds.push(box);
      }
      g.restore();
    }
  }
}
import { getMap, getMovePath } from './rules.js';
import { drawUnitArt } from './unit-art.js';
export function createAtlas(host, options = {}) {
  const canvas=document.createElement('canvas');
  canvas.setAttribute('aria-label','Los Angeles strategy map. Use arrow keys to preview a district. Press Enter or Space to select it. Use plus and minus to zoom, and Home to reset the view.');
  canvas.setAttribute('role','group');canvas.tabIndex=0;
  Object.assign(canvas.style,{display:'block',height:'100%',width:'100%',touchAction:'none',cursor:'grab',position:'absolute',inset:'0'});
  host.appendChild(canvas);
  const ctx=canvas.getContext('2d'), input=new AbortController(), pointers=new Map();
  let tiles=options.tiles||getMap('la').tiles, model={selectedId:options.selectedId||null,hoverId:null,board:{},players:[],units:[],cities:[],cityTiles:new Set(),hitUnits:[],motions:[],selectedUnitId:null,haveState:false,moveTiles:[],attackTiles:[],byId:new Map(tiles.map(t=>[t.id,t]))};
  let replay=null,returnCamera=null,lastCameraInput=-Infinity;
  function manualCamera(){returnCamera=null;lastCameraInput=performance.now();}
  let background=null,boxW=1,boxH=1,base=1,zoom=1,cx=0,cy=0,request=0,resizeFrame=0,tween=0;
  let reliefView=options.reliefView!==false, reliefKey='',reliefWindow=null;
  const pitch=()=>reliefView?RELIEF_PITCH:1;
  const camera=()=>({cx,cy,scale:base*zoom,pitch:pitch(),width:boxW,height:boxH});
  model.pitch=pitch();
  let labels=true,territories=true,grid=true,fresh=true,pendingFocus=null,gesture=null,didDrag=false,disposed=false;
  let frame=chartFrame(tiles), mesh=chartMesh(tiles), extent=chartExtent(tiles);
  let landmarkTiles=tiles.filter(tile=>tile.landmark);
  let cityMarks=[],cityCamera=null;
  function forgetBackground(){background?.buffer.close?.();background=null;reliefWindow=null;}
  function ensureBackground() {
    const s=base*zoom,sy=s*pitch();
    const viewport={left:cx-boxW/(2*s),right:cx+boxW/(2*s),top:cy-boxH/(2*sy),bottom:cy+boxH/(2*sy)};
    if(background && reliefView && reliefWindow && (
      viewport.left<reliefWindow.left || viewport.right>reliefWindow.right ||
      viewport.top<reliefWindow.top || viewport.bottom>reliefWindow.bottom ||
      (s>reliefWindow.scale*1.5 && background.resolution<1.95)))forgetBackground();
    if(background)return;
    const region=model.region||getMap('la');
    // The printed plate is stable across discoveries. Water fills, bridges and
    // their labels are overprinted from this seat's changing survey below.
    const paper=region.waterways ? getMap(region.id,region.mapSize) : region;
    if(reliefView){
      // Repaint a padded viewport, not the entire Epic world at low resolution.
      // The cache remains stable through small pans and is bounded to 5M pixels.
      reliefWindow={left:viewport.left-W*2,right:viewport.right+W*2,top:viewport.top-H*2,bottom:viewport.bottom+H*2,scale:s};
      const known=(model.fog?.knownTiles||tiles).filter(tile=>{
        const [x,y]=pos(tile.q,tile.r);
        return x>reliefWindow.left-W && x<reliefWindow.right+W && y>reliefWindow.top-H && y<reliefWindow.bottom+H;
      }).map(tile=>tile.waterway?paper.byId[tile.id]||tile:tile);
      const landmarks=landmarkTiles.filter(tile=>!model.fog||model.fog.explored.has(tile.id));
      background=renderReliefAtlas(known,region,landmarks,(g,tile,x,y)=>{
        drawLandmark(g,tile.landmark,x,y,1.48);
      });
    }else background=renderAtlas(paper.tiles,paper,landmarkTiles,!region.waterways);
  }
  function draw(){
    request=0;if(disposed||boxW<2||boxH<2)return;ensureBackground();
    const dpi=canvas.width/boxW,s=base*zoom,sy=s*pitch();
    ctx.setTransform(dpi,0,0,dpi,0,0);
    if(reliefView){
      const surround=ctx.createLinearGradient(0,0,0,boxH);
      surround.addColorStop(0,'#182c36');surround.addColorStop(1,'#0d202a');
      ctx.fillStyle=surround;ctx.fillRect(0,0,boxW,boxH);
    }else paintChartMargin(ctx,boxW,boxH);
    const project=(x,y)=>cameraProject(camera(),x,y);
    const unitBoxes=overlayUnitBoxes(model,s);
    ctx.font=cityFont(s);
    cityMarks=planCityLabels({forecasts:model.borderForecasts,cities:model.cities,byId:model.byId,visible:model.fog?.visible,seat:model.state?.intel?.seat,
      selectedTile:model.selectedId,project,view:clearView(),scale:s,
      unitBoxes:unitBoxes.map(([a,b,c,d])=>[...project(a,b),...project(c,d)]),measure:name=>ctx.measureText(name).width});
    cityCamera={s,cx,cy,boxW,boxH,pitch:pitch()};
    const cityBoxes=cityMarks.flatMap(({x,y,radius,box})=>[[x-radius,y-radius,x+radius,y+radius],...(box?[box]:[])])
      .map(([a,b,c,d])=>[...toWorld(a,b),...toWorld(c,d)]);
    ctx.save();ctx.translate(boxW/2,boxH/2);ctx.scale(s,sy);ctx.translate(-cx,-cy);
    // The side wall is geographic-coordinate-only: it never discloses terrain.
    if(reliefView){
      ctx.save();ctx.translate(0,10);ctx.lineJoin='round';ctx.strokeStyle='#0d171c';ctx.lineWidth=12/s;ctx.stroke(frame);
      ctx.strokeStyle='#526466';ctx.lineWidth=3/s;ctx.stroke(frame);ctx.restore();
    }
    ctx.save();ctx.clip(frame);
    const {buffer,margin,resolution}=background;
    const originX=background.left??-margin,originY=background.top??-margin;
    // Paint every uncharted hex as a nautical survey grid. Clip the entire
    // illustrated layer so terrain never flashes before the first observation.
    if(model.fog) {
      const left=cx-boxW/(2*s),top=cy-boxH/(2*sy),ww=boxW/s,hh=boxH/sy;
      // A uniform blind layer contains no information about terrain. The
      // chart frame clips the margins and the explored window paints over it.
      if(reliefView){
        const mist=ctx.createLinearGradient(left,top,left,top+hh);
        mist.addColorStop(0,'#2b414b');mist.addColorStop(.5,'#233b47');mist.addColorStop(1,'#1b303d');
        ctx.fillStyle=mist;
      }else ctx.fillStyle='#263843';
      ctx.fillRect(left,top,ww,hh);
      ctx.fillStyle='#64757a';ctx.beginPath();
      const firstRow=Math.max(0,Math.floor((top-H/2)/ROW));
      const lastRow=Math.min((model.region?.rowsCount||13)-1,Math.ceil((top+hh-H/2)/ROW));
      for(let r=firstRow;r<=lastRow;r++){
        const shift=(r&1)/2,first=Math.max(0,Math.floor((left-W/2)/W-shift));
        const last=Math.min((model.region?.columns||17)-1,Math.ceil((left+ww-W/2)/W-shift));
        for(let q=first;q<=last;q++){const [x,y]=pos(q,r);ctx.rect(x-.65,y-.65,1.3,1.3);}
      }
      ctx.fill();
      ctx.save();ctx.clip(model.fog.window);
    }
    const visible=model.fog?.extent||extent;
    const bx=Math.max(originX,cx-boxW/(2*s)-2,visible.left-2),by=Math.max(originY,cy-boxH/(2*sy)-2,visible.top-2);
    const bw=Math.min(buffer.width/resolution+originX,cx+boxW/(2*s)+2,visible.right+2)-bx;
    const bh=Math.min(buffer.height/resolution+originY,cy+boxH/(2*sy)+2,visible.bottom+2)-by;
    if(bw>0&&bh>0)ctx.drawImage(buffer,(bx-originX)*resolution,(by-originY)*resolution,
      bw*resolution,bh*resolution,bx,by,bw,bh);
    if(model.region?.waterways){
      inkWaterways(ctx,model.region,{relief:reliefView,pitch:pitch()});
      for(const bridge of model.region.waterways.crossings || []){
        inkRiverBridge(ctx,model.region.byId[bridge.a],model.region.byId[bridge.b],{relief:reliefView,pitch:pitch()});
      }
    }
    if(model.fog)ctx.restore();
    if(grid){ctx.save();if(reliefView)ctx.globalAlpha=.48;inkHexGrid(ctx,mesh,s);ctx.restore();}
    if(model.fog){ctx.save();ctx.clip(model.fog.window);}
    renderOverlay(ctx,model.fog ? model.fog.knownTiles : tiles,model,s,labels,territories,unitBoxes,cityBoxes);
    if(model.fog){
      // Previously explored land stays readable, while live figures still
      // depend on sight. A narrow rim separates the survey from unknown mist.
      ctx.fillStyle=reliefView?'#19324480':'#24333c9c';ctx.fill(model.fog.memory);
      if(reliefView){
        ctx.save();ctx.strokeStyle='#b4c4bd3b';ctx.lineWidth=1.2/s;ctx.stroke(model.fog.window);ctx.restore();
      }
    }
    if(paintUnits(ctx,model,s,performance.now()))schedule();
    if(model.fog)ctx.restore();
    paintHexFocus(ctx,model,s);
    paintWorkSurvey(ctx,model,s,hexPath,pos);
    ctx.restore();
    inkChartFrame(ctx,frame,s);
    // The pin must be in sight; its linked nameplate may extend beyond the
    // explored terrain or the coast without disclosing neighbouring tiles.
    ctx.save();ctx.setTransform(dpi,0,0,dpi,0,0);
    paintCityLabels(ctx,cityMarks,s,seat=>factionColor(model,seat));ctx.restore();
    ctx.save();ctx.clip(frame);
    if(replay && paintBattleReport(ctx,replay,s,performance.now(),pitch()))schedule();
    ctx.restore();
    ctx.restore();
    // A very light vignette holds together all the terrain colours at the edge of the atlas.
    const shadow=ctx.createRadialGradient(boxW*.49,boxH*.45,Math.min(boxW,boxH)*.34,boxW*.5,boxH*.49,Math.hypot(boxW,boxH)*.57);
    shadow.addColorStop(0,'#13212700');shadow.addColorStop(1,reliefView?'#15283222':'#15283236');ctx.fillStyle=shadow;ctx.fillRect(0,0,boxW,boxH);
  }
  function schedule(){if(!request&&!disposed)request=requestAnimationFrame(draw);}
  document.addEventListener('civitas-language',schedule,{signal:input.signal});
  function clearView(){
    return chartViewport(boxW,boxH,options.viewInsets?.());
  }
  function bound(){
    // An edge tile must be pannable into the middle of the open map.
    // Retain a small strip of the survey at the furthest manual pan.
    const view=clearView(),s=base*zoom;
    const shiftX=(boxW/2-view.x)/s,shiftY=(boxH/2-view.y)/(s*pitch());
    const padX=.18*view.width/s,padY=.18*view.height/(s*pitch());
    cx=Math.max(extent.left+shiftX-padX,Math.min(extent.right+shiftX+padX,cx));
    cy=Math.max(extent.top+shiftY-padY,Math.min(extent.bottom+shiftY+padY,cy));
  }
  function centerAt(x,y){
    const next=centeredCamera(camera(),x,y,clearView());
    cx=next.cx;cy=next.cy;
    bound();
  }
  function obscured(x,y,pad){
    const view=clearView(),s=base*zoom;
    const [px,py]=cameraProject(camera(),x,y);
    return px<view.left+pad || px>view.left+view.width-pad || py<view.top+pad || py>view.top+view.height-pad;
  }
  function resetCenter(){centerAt((extent.left+extent.right)/2,(extent.top+extent.bottom)/2);}
  function referenceScale(){
    return Math.max(boxW/(extent.width+197),boxH/((extent.height+175)*pitch()),Math.min(boxW/(W*15.65),boxH/(ROW*12.55*pitch())));
  }
  function measure(){
    const rect=host.getBoundingClientRect();boxW=Math.round(rect.width);boxH=Math.round(rect.height);
    if(boxW<2||boxH<2)return;
    base=referenceScale();
    const dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(dpr*boxW);canvas.height=Math.round(dpr*boxH);
    if(pendingFocus){
      centerAt(...pendingFocus);pendingFocus=null;
    }else if(fresh)resetCenter();
    else bound();
    fresh=false;schedule();
  }
  function hoverTile(id){
    if(model.hoverId===id)return;
    model.hoverId=id;
    model.previewPath=model.state&&model.selectedUnitId&&model.moveTiles.includes(id)?getMovePath(model.state,model.selectedUnitId,id):[];
    options.onHover?.(id);schedule();
  }
  function local(e){const r=canvas.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];}
  function toWorld(x,y){return cameraUnproject(camera(),x,y);}
  function hitUnitAt(x,y){
    const [wx,wy]=toWorld(x,y);
    if(!chartHit(wx,wy,id=>model.byId.has(id)))return null;
    return model.hitUnits.findLast(u=>(Math.abs(wx-u.bx)<=9*u.badgeScale && wy>=u.by-8*u.badgeScale/pitch() && wy<=u.by+12*u.badgeScale/pitch())||(Math.abs(wx-u.x)<=u.width && wy>u.y-u.height && wy<u.y+5));
  }
  function hit(x,y){
    return chartHit(...toWorld(x,y),id=>model.byId.has(id));
  }
  function pointerTarget(x,y) {
    const unit=hitUnitAt(x,y);
    if(unit)return {id:unit.tile,unit};
    const tile=hit(x,y);
    const current=cityCamera && cityCamera.s===base*zoom && cityCamera.cx===cx && cityCamera.cy===cy &&
      cityCamera.boxW===boxW && cityCamera.boxH===boxH && cityCamera.pitch===pitch();
    const city=current && cityLabelAt(cityMarks,x,y,tile,model);
    return {id:city||tile,city:Boolean(city)};
  }
  function overviewZoom(){return mapFitZoom(clearView(),extent,base,pitch());}
  function clampZoom(target){return Math.max(Math.min(.75,overviewZoom()),Math.min(3,target));}
  function setZoom(target,x=boxW/2,y=boxH/2) {
    const next=zoomedCamera(camera(),base*clampZoom(target),x,y);zoom=clampZoom(target);
    cx=next.cx;cy=next.cy;
    bound();options.onZoom?.(Math.round(zoom*100));schedule();
  }
  function animateZoom(target,x,y) {
    cancelAnimationFrame(tween);
    const from=zoom,to=clampZoom(target),start=performance.now();
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){setZoom(to,x,y);return;}
    function tick(now){const f=Math.min(1,(now-start)/145);setZoom(from+(to-from)*(1-(1-f)**3),x,y);if(f<1)tween=requestAnimationFrame(tick);}
    tween=requestAnimationFrame(tick);
  }
  function on(name,fn,extra={}){canvas.addEventListener(name,fn,{...extra,signal:input.signal});}
  on('pointerdown',e=>{
    if(e.button!==0 && e.pointerType==='mouse')return;
    manualCamera();cancelAnimationFrame(tween);const xy=local(e);pointers.set(e.pointerId,xy);
    canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';hoverTile(null);
    if(pointers.size===1){didDrag=false;gesture={start:xy,center:[cx,cy]};}
    else if(pointers.size===2){didDrag=true;const [a,b]=[...pointers.values()];gesture={dist:Math.max(2,Math.hypot(a[0]-b[0],a[1]-b[1])),initial:zoom,mid:[(a[0]+b[0])/2,(a[1]+b[1])/2]};}
  });
  on('pointermove',e=>{
    const xy=local(e);
    if(!pointers.has(e.pointerId)){
      const {id}=pointerTarget(...xy);if(model.hoverId!==id){hoverTile(id);canvas.style.cursor=id?'pointer':'grab';}return;
    }
    pointers.set(e.pointerId,xy);
    if(pointers.size===2 && gesture?.dist) {
      const [a,b]=[...pointers.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]),mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;
      setZoom(gesture.initial*d/gesture.dist,...gesture.mid);cx+=(gesture.mid[0]-mx)/(base*zoom);cy+=(gesture.mid[1]-my)/(base*zoom*pitch());gesture.mid=[mx,my];bound();schedule();
    } else if(pointers.size===1 && gesture?.start){
      const dx=xy[0]-gesture.start[0],dy=xy[1]-gesture.start[1];
      if(Math.hypot(dx,dy)>4)didDrag=true;
      if(didDrag){const next=pannedCamera({...camera(),cx:gesture.center[0],cy:gesture.center[1]},dx,dy);cx=next.cx;cy=next.cy;bound();schedule();}
    }
  });
  function finishPointer(e,allowSelect) {
    if(!pointers.has(e.pointerId))return;
    if(!didDrag && allowSelect && pointers.size===1){
      const {id,unit,city}=pointerTarget(...local(e));
      if(id){model.selectedId=id;schedule();options.onSelect?.(id,unit?.id,city,e.pointerType);if(unit)options.onUnitSelect?.(unit.id,id);}
    }
    pointers.delete(e.pointerId);
    if(pointers.size===1)gesture={start:[...pointers.values()][0],center:[cx,cy]};else if(!pointers.size){gesture=null;canvas.style.cursor='grab';}
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  }
  on('pointerup',e=>finishPointer(e,true));on('pointercancel',e=>finishPointer(e,false));
  on('pointerleave',()=>hoverTile(null));
  on('wheel',e=>{e.preventDefault();manualCamera();const xy=local(e);cancelAnimationFrame(tween);setZoom(zoom*Math.exp(-Math.max(-100,Math.min(100,e.deltaY))*.0019),...xy);},{passive:false});
  on('keydown',e=>{
    manualCamera();
    const home=model.units.find(unit=>unit.seat===model.state?.intel?.seat);
    const t=model.byId.get(model.hoverId)||model.byId.get(model.selectedId)||model.byId.get(home?.tile)||model.byId.get('11,7')||tiles[0];
    let target=null;
    const dirs={ArrowRight:1,ArrowLeft:4,ArrowUp:5,ArrowDown:2};
    if(e.key in dirs&&t){target=model.byId.get(idFor(...adjacent(t.q,t.r,dirs[e.key])));e.preventDefault();}
    if(target){hoverTile(target.id);const [px,py]=pos(target.q,target.r);if(obscured(px,py,24))centerAt(px,py);schedule();}
    if(['+','=','-','Home'].includes(e.key)){e.preventDefault();if(e.key==='Home')api.reset();else api.zoomBy(e.key==='-'?1/1.2:1.2);}
    if((e.key==='Enter'||e.key===' ')&&t){e.preventDefault();model.selectedId=t.id;const unit=model.units.find(u=>u.tile===t.id);options.onSelect?.(t.id,unit?.id);if(unit)options.onUnitSelect?.(unit.id,t.id);schedule();}
  });
  const observer=new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(measure);});observer.observe(host);
  const api={
    update(o={}){
      const region=o.state?getMap(o.state):model.region;
      const nextTiles=o.tiles||region?.tiles;
      const sameSurvey=Boolean(region?.waterways && model.region?.waterways && o.campaignKey &&
        o.campaignKey===model.campaignKey && region.id===model.region.id && region.mapSize===model.region.mapSize);
      model.campaignKey=o.campaignKey;
      if(region && region!==model.region){
        model.region=region;
        canvas.setAttribute('aria-label',region.name+' strategy map. Use arrow keys to preview a district. Press Enter or Space to select it. Use plus and minus to zoom, and Home to reset the view.');
      }
      const tilesChanged=nextTiles && nextTiles!==tiles;
      if(tilesChanged){
        tiles=nextTiles;model.byId=new Map(tiles.map(t=>[t.id,t]));
        if(!sameSurvey){
          extent=chartExtent(tiles);frame=chartFrame(tiles);mesh=chartMesh(tiles);forgetBackground();
          model.motions=[];model.haveState=false;model.units=[];model.hitUnits=[];model.previewPath=[];model.hoverId=null;
          pendingFocus=null;returnCamera=null;replay=null;cityCamera=null;
          base=referenceScale();zoom=1;resetCenter();options.onZoom?.(100);
        }
      }
      const state=o.state||o;if(o.state)model.state=o.state;
      if(o.borderForecasts)model.borderForecasts=o.borderForecasts;
      const priorFog=model.fog;
      if(state.intel && (model.intel!==state.intel || tilesChanged)) {
        const explored=new Set(state.intel.explored), visible=new Set(state.intel.visible);
        const window=new Path2D(),memory=new Path2D(),knownTiles=tiles.filter(t=>explored.has(t.id));
        for(const t of knownTiles){window.addPath(hexPath(t.q,t.r));if(!visible.has(t.id)) memory.addPath(hexPath(t.q,t.r));}
        model.intel=state.intel;model.fog={explored,visible,window,memory,knownTiles,extent:chartExtent(knownTiles)};
      } else if(!state.intel){model.fog=null;model.intel=null;}
      if(reliefView){
        const key=(model.fog?.knownTiles||tiles).map(t=>t.id+':'+t.terrain+':'+(t.waterway||'')).join('|');
        if(key!==reliefKey){reliefKey=key;forgetBackground();}
      }
      if(tilesChanged || priorFog!==model.fog)model.waterCaptions=waterCaptions(model.fog?.knownTiles || tiles);
      const boardChanged=state.board && state.board!==model.board;
      if(tilesChanged || boardChanged || priorFog!==model.fog){
        model.politics=politicalPaths(tiles,state.board||model.board,model.fog?.visible,hexPath);
      }
      if(tilesChanged || boardChanged){
        if(state.board)model.board=state.board;
        // Only the seat's observed parcels may replace the printed landmark artwork.
        const next=tiles.filter(t=>t.landmark && getAtlasPlace(t,model.board[t.id])?.landmark);
        if(next.length!==landmarkTiles.length || next.some((t,i)=>t.id!==landmarkTiles[i].id))forgetBackground();
        landmarkTiles=next;
      }
      if(state.players)model.players=state.players;
      if(Array.isArray(state.units)){
        updateBattleMotion(model,state,performance.now());model.units=state.units;
      }
      if(Array.isArray(state.cities)){model.cities=state.cities;model.cityTiles=new Set(state.cities.map(c=>c.tile));}
      if(Object.hasOwn(o,'selectedUnitId')&&o.selectedUnitId!==model.selectedUnitId){model.selectedUnitId=o.selectedUnitId;model.previewPath=[];}
      if(Object.hasOwn(o,'showResources'))model.showResources=o.showResources;
      if(Object.hasOwn(o,'settlementSites'))model.settlementSites=o.settlementSites;
      else if(Object.hasOwn(o,'settlementSurvey')){
        const sites=o.settlementSurvey||[];
        model.settlementSites={now:sites.filter(s=>s.timing==='now').map(s=>s.tile),nextTurn:sites.filter(s=>s.timing==='next'||s.timing==='next-turn').map(s=>s.tile)};
      }
      if(Object.hasOwn(o,'frontierHexes'))model.frontierHexes=o.frontierHexes;
      if(Object.hasOwn(o,'reviewPath'))model.reviewPath=o.reviewPath;
      if(Object.hasOwn(o,'previewPath'))model.previewPath=o.previewPath||[];
      if(Object.hasOwn(o,'workSites')){model.workSites=o.workSites;model.workSelection=o.workSelection;}
      if(Object.hasOwn(o,'targetId'))model.targetId=o.targetId;
      if(o.moveTiles||o.moveIds)model.moveTiles=[...(o.moveTiles||o.moveIds)];
      if(o.attackTiles||o.attackIds)model.attackTiles=[...(o.attackTiles||o.attackIds)];
      if(Object.hasOwn(o,'selectedId'))model.selectedId=o.selectedId;
      if(Object.hasOwn(o,'cityLabelPicking'))model.cityLabelPicking=o.cityLabelPicking;
      if(model.previewPath?.length && !model.moveTiles.includes(model.previewPath.at(-1)))model.previewPath=[];
      schedule();return api;
    },
    playBattle(report,manual,duration){
      const points=battleMarkers(report,model.byId);if(!points)return;
      const still=Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
      const player=model.players[report.attacker.seat];
      if(manual && !replay?.pinned && !returnCamera)returnCamera=[cx,cy];
      replay={report,...points,still,pinned:manual,color:player?.color || FACTION[player?.faction] || '#d58a6c',start:performance.now(),duration};
      const [x,y]=points.to;
      const outside=obscured(x,y,48);
      if(manual){cancelAnimationFrame(tween);centerAt(x,y);}
      else if(outside && !still && !gesture && performance.now()-lastCameraInput>2600){
        if(!returnCamera)returnCamera=[cx,cy];
        centerAt(x,y);
      }
      schedule();
    },
    stopBattle(){replay=null;if(returnCamera){[cx,cy]=returnCamera;returnCamera=null;bound();}schedule();},
    zoomBy(factor){manualCamera();if(Number.isFinite(factor)&&factor>0){const view=clearView();animateZoom(zoom*factor,view.x,view.y);}},
    reset(){manualCamera();cancelAnimationFrame(tween);zoom=overviewZoom();resetCenter();options.onZoom?.(Math.round(zoom*100));schedule();},
    focus(id,opening=false){if(!opening)manualCamera();const t=model.byId.get(id);if(t){if(opening){zoom=1.65;options.onZoom?.(165);} const point=pos(t.q,t.r);
      if(fresh || boxW!==Math.round(host.getBoundingClientRect().width))pendingFocus=point;
      centerAt(...point);schedule();}},
    setReliefView(show){
      const next=Boolean(show);if(next===reliefView)return;
      manualCamera();cancelAnimationFrame(tween);
      const view=clearView(),point=toWorld(view.x,view.y);
      reliefView=next;model.pitch=pitch();
      forgetBackground();cityCamera=null;model.hitUnits=[];
      base=referenceScale();zoom=clampZoom(zoom);centerAt(...point);
      options.onZoom?.(Math.round(zoom*100));schedule();
    },
    setGrid(show){grid=Boolean(show);schedule();},
    setLabels(show){labels=Boolean(show);schedule();},
    setTerritories(show){territories=Boolean(show);schedule();},
    destroy(){disposed=true;observer.disconnect();input.abort();cancelAnimationFrame(request);cancelAnimationFrame(tween);cancelAnimationFrame(resizeFrame);canvas.remove();forgetBackground();}
  };
  measure();options.onZoom?.(100);return api;
}
if(typeof window!=='undefined')window.Atlas={createAtlas};
// Small architectural studies, all drawn in world coordinates from a ground anchor.
function drawLandmark(g, kind, x, y, scale = 1) {
  g.save();
  g.translate(x, y);
  g.scale(scale, scale);
  g.lineJoin = 'round';
  g.lineCap = 'round';

  const ink = '#313035';
  const darkWindow = '#3f474f';
  const rim = '#ead4a1';
  const cream = ['#f5deb0', '#c3a77d', '#927b65'];
  const put = (pts, color, stroke, width = 0.6) => {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
    if (color) { g.fillStyle = color; g.fill(); }
    if (stroke) { g.lineWidth = width; g.strokeStyle = stroke; g.stroke(); }
  };
  const line = (pts, color, w = 0.8) => {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.strokeStyle = color; g.lineWidth = w; g.stroke();
  };
  const oval = (cx,cy,rx,ry,fill,stroke,w=0.6,angle=0) => {
    g.beginPath(); g.ellipse(cx,cy,rx,ry,angle,0,Math.PI*2);
    if (fill) { g.fillStyle=fill; g.fill(); }
    if (stroke) { g.strokeStyle=stroke; g.lineWidth=w; g.stroke(); }
  };
  const curve = (cx,cy,a,b,c,d,ex,ey,color,w=0.8) => {
    g.beginPath(); g.moveTo(cx,cy); g.bezierCurveTo(a,b,c,d,ex,ey);
    g.strokeStyle=color; g.lineWidth=w; g.stroke();
  };
  const solid = (a,b,w,d,h,p,edge=ink) => {
    const k=.38;
    const l=[a-w,b-w*k], r=[a+d,b-d*k];
    const lt=[l[0],l[1]-h], rt=[r[0],r[1]-h];
    const f=[a,b], t=[a,b-h], far=[a-w+d,b-(w+d)*k-h];
    put([l,f,t,lt],p[1],edge,.62);
    put([f,r,rt,t],p[2],edge,.62);
    put([lt,t,rt,far],p[0],edge,.62);
    line([lt,t,rt],p[0],.67);
  };
  const windows = (a,b,w,d,h,nLeft,nRight,nRows,lit,shade) => {
    for (const [direction,span,count] of [[-1,w,nLeft],[1,d,nRight]]) {
      if (!count) continue;
      for(let c=0;c<count;c++) {
        const mid=span*(c+.5)/count, half=Math.min(.7,span/count*.22);
        const xx=a+direction*mid, yy=b-mid*.38;
        for(let r=0;r<nRows;r++) {
          const top=yy-h+(r+.6)*h/(nRows+.15);
          line([[xx-direction*half,top+half*.38],[xx+direction*half,top-half*.38]],direction===-1 ? lit : shade,Math.min(.95,h/nRows*.3));
        }
      }
    }
  };
  const dome = (a,b,r,h) => {
    oval(a,b,r+1,2,'#807a67',ink,.6);
    g.beginPath(); g.moveTo(a-r,b); g.bezierCurveTo(a-r,b-h*.77,a-r*.55,b-h,a,b-h);
    g.bezierCurveTo(a+r*.62,b-h,a+r,b-h*.65,a+r,b);
    g.quadraticCurveTo(a,b+2.3,a-r,b); g.closePath();
    g.fillStyle='#758e83'; g.fill(); g.strokeStyle=ink; g.lineWidth=.75; g.stroke();
    g.beginPath(); g.moveTo(a-r,b); g.bezierCurveTo(a-r,b-h*.77,a-r*.55,b-h,a,b-h);
    g.bezierCurveTo(a-r*.5,b-h*.55,a-r*.4,b-1,a-r*.39,b+.65);
    g.closePath(); g.fillStyle='#b9bc96'; g.fill();
    for(const v of [-.69,-.32,.36,.7]) curve(a,b-h,a+r*v*.65,b-h*.85,a+r*v,b-h*.2,a+r*v,b+.5,'#525f5a',.4);
    curve(a-r,b,a-r*.36,b+2,a+r*.32,b+2,a+r,b,'#dbc799',.7);
    line([[a,b-h],[a,b-h-1.7]],rim,.8);
  };
  const arch = (a,b,r,h,fill) => {
    g.fillStyle=fill; g.beginPath(); g.moveTo(a-r,b); g.lineTo(a-r,b-h+r);
    g.arc(a,b-h+r,r,Math.PI,Math.PI*2); g.lineTo(a+r,b);g.closePath();g.fill();
  };
  const shade = (rx,ry) => oval(2,1,rx,ry,'rgba(22,25,28,.4)',null,0,-.06);

  if (kind === 'goldengate') {
    shade(25,7);
    for(const a of [-13,13]){
      solid(a,1,1.1,1.35,23,['#eb7652','#b94c38','#833b2e']);
      line([[a-2,-18],[a+2,-18],[a+2,-15],[a-2,-15]],'#b94c38',1);
    }
    line([[-27,2],[26,-2]],'#854a3b',2.3);
    curve(-27,1,-21,-7,-17,-13,-13,-22,'#d35c40',1);
    curve(-13,-22,-9,-7,9,-4,13,-22,'#d35c40',1);
    curve(13,-22,17,-15,22,-5,26,-3,'#d35c40',1);
    for(let a=-9;a<=10;a+=4)line([[a,-9-Math.abs(a)*.39],[a,.6-a*.08]],'#ab513a',.65);
  } else if (kind === 'cranes') {
    shade(21,7);
    for(const a of [-10,3,12]){
      line([[a-3,1],[a-3,-11],[a+8,-21],[a+13,-20]],'#9b523f',1.6);
      line([[a+3,3],[a+3,-14],[a-3,-14],[a+8,-21]],'#bd7452',1.8);
      line([[a+11,-20],[a+11,-12]],'#514d43',.75);
      solid(a-2,5,4,2.3,2.6,['#9aa9a6','#688789','#526b74']);
    }
  } else if (kind === 'campanile' || kind === 'ferry' || kind === 'mission') {
    shade(17,6);
    if(kind!=='campanile')solid(0,3,13,6,5,cream);
    solid(0,1,2.8,3.3,kind==='campanile'?24:16,cream);
    const top=kind==='campanile'?-23:-15;
    solid(0,top,3.4,4,3,cream);oval(0,top-1,1.3,1.3,'#eee0ad',ink);
    line([[0,top-3],[0,top-8]],'#697777',1.55);
  } else if (kind === 'lighthouse') {
    shade(14,5); solid(6,3,6,4,4,cream);
    put([[-3,2],[-2,-14],[2,-14],[3,2]],'#e8e1ca',ink,.65);
    solid(0,-14,2.7,2.7,3,['#e9cb94','#98775c','#765e4e']);
    line([[-3,-18],[0,-20],[3,-18]],'#7f4e3a',1.6);
  } else if (kind === 'hotel') {
    shade(22,6); solid(0,4,13,6,7,cream);
    for(const a of [-10,1,11]){
      solid(a,2,3.7,4.5,8,cream);
      put([[a-5,-5],[a,-14],[a+5,-6]],'#b65b44','#813f32',.6);
    }
  } else if (kind === 'balboa') {
    shade(17,6); solid(0,3,12,6,6,cream);
    solid(7,-2,3.2,3.5,17,['#ecd9ac','#b79670','#927658']); dome(7,-20,3.1,4.3);
    dome(-4,-6,6,6.8);line([[7,-23],[7,-27]],rim,.65);
  } else if (kind === 'depot') {
    shade(19,5); solid(0,3,13,7,6,cream);
    for(const a of [-8,8]){solid(a,1,3.5,3.7,9,cream);dome(a,-9,3.8,3.8);}
  } else if (kind === 'marina' || kind === 'scripps') {
    shade(21,5);
    line([[-16,5],[16,-5]],'#8d7457',3.3);
    for(const a of [-13,-4,5,13])line([[a,-a*.3],[a,-a*.3+3.8]],'#584f41',1);
    if(kind==='scripps')solid(8,-3,6,3.5,4,cream);
    else for(const a of [-9,1,9]){
      line([[a,1],[a,-9]],'#e8d0a1',.8);
      put([[a-.4,-8],[a-4,.5],[a-.4,0]],'#e8ddba',ink,.45);
      line([[a-5,1],[a+3,.6]],'#985748',1.6);
    }
  } else if (kind === 'griffith') {
    shade(29,8);
    solid(-1,7,22,24,2.5,['#dbc9a4','#998f79','#71786e']);
    solid(-2,4,16,18,7,cream);
    solid(-1,3,10,11,10,cream);
    windows(-2,4,16,18,7,4,4,1,darkWindow,'#514c47');
    solid(-1,-5.5,10.7,11.3,1.4,['#f4dcb0','#baa486','#998974']);
    oval(0,-14,9.3,2.7,'#d6bd90',ink);
    dome(0,-15,8.7,8.6);
    for (const [a,b] of [[-20,-4],[18,-5]]) {
      solid(a,b,5.8,7,7.8,cream);
      windows(a,b,5.8,7,7.8,2,2,1,darkWindow,'#514c47');
      dome(a+.5,b-10.4,5.4,4.9);
    }
    solid(-1,6,8,5,4.5,['#efd7ac','#d8bc94','#ab9277']);
    for(const px of [-6.3,-3.7,-1.2]) line([[px,2.8+(px+1)*.38],[px,5.7+(px+1)*.38]],'#6f7063',.8);
    line([[-21,-1.6],[-18,-.6]],rim,.6);
  } else if (kind === 'hollywood') {
    shade(28,5);
    put([[-31,1],[-25,-6],[-15,-8],[-7,-12],[8,-13],[18,-10],[27,-7],[31,-2],[17,3],[-7,5]],'#667453','#39483e',.65);
    put([[-29,.7],[-18,-5],[-6,-7],[6,-9],[-3,-4],[-14,0]],'#a0a27a');
    put([[-4,3],[6,-4],[14,-5],[25,-4],[12,1]],'#86926d');
    for(let i=0;i<26;i++) {
      const xx=-24+(i*13%51), yy=-3+(i*7%5);
      line([[xx,yy],[xx+1.2,yy-.7]],i%2?'#a9ab83':'#414f40',.55);
    }
    g.save(); g.rotate(-.095); g.font='900 10.3px "Arial Narrow",Arial,sans-serif';
    g.textAlign='center'; g.textBaseline='alphabetic';
    const word='HOLLYWOOD';
    const spacing=5.45;
    for(let i=0;i<word.length;i++) {
      const xx=(i-4)*spacing, yy=-5-Math.sin(i*.63)*.8;
      line([[xx-1.1,yy-4],[xx-1.1,yy+3]],'#4a453b',.8);
      line([[xx+1.35,yy-4],[xx+2.5,yy+3]],'#544c3d',.7);
      g.save();g.translate(xx,yy);g.scale(.83,1);
      g.strokeStyle='#4f5449';g.lineWidth=1.4;g.strokeText(word[i],0,0);
      g.fillStyle='#fcf1d4';g.fillText(word[i],0,0);g.restore();
    }
    g.restore();
  } else if (kind === 'pier') {
    shade(28,5.6);
    const posts=[[-28,0],[-20,2],[-11,3],[-2,4],[7,4.4],[16,3],[25,1]];
    for(const [a,b] of posts) {
      line([[a,b-1],[a,b+4]],'#593a2d',1.35);
      line([[a+.35,b-.7],[a+.35,b+3]],'#bc9a72',.48);
    }
    put([[-31,-4],[-13,-7],[28,-2],[12,3],[-3,4],[-31,0]],'#ddb57d','#6f513e',.8);
    for(let i=0;i<27;i++){
      const xx=-27+i*1.94, yy=-1+Math.max(0,(i-8)*.06);
      line([[xx,yy-2.2],[xx-2.7,yy+.25]],'#a77a58',.46);
    }
    line([[-31,0],[-3,4],[12,3],[28,-2]],'#f4cf91',1.05);
    solid(12,.6,7,5,4.1,['#e6a46b','#cf7358','#9b554f']);
    put([[5,-6.2],[8,-9.5],[18,-6.1],[17,-4.9],[12,-3.4]],'#e9a57c',ink,.6);
    const fx=-7, fy=-14, rx=10.2, ry=12.5;
    for(const dx of [-2,0]) {
      oval(fx+dx,fy,rx,ry,null,dx?'#655150':'#e9bc79',dx?1.75:1.25,-.11);
    }
    for(let i=0;i<12;i++) {
      const theta=i*Math.PI/6, xx=fx+rx*Math.cos(theta), yy=fy+ry*Math.sin(theta);
      line([[fx,fy],[xx,yy]],i%2?'#e6bd86':'#b97661',.64);
      if(i%2===0){
        line([[xx,yy],[xx,yy+1.9]],'#5c5250',.68);
        put([[xx-1.5,yy+1.6],[xx+1.5,yy+1.6],[xx+1.15,yy+3],[xx-1.05,yy+3]],'#c96e55',ink,.45);
      }
    }
    line([[fx-4.8,0],[fx,fy],[fx+5.3,1]],'#694e43',2.1);
    line([[fx-4.9,-.7],[fx,fy+.5],[fx+5,0]],'#e1be8b',.83);
    oval(fx,fy,1.6,1.6,'#f3d29a',ink,.65);
    line([[20,-2.1],[20,-11.5]],'#6b534b',.82);
    put([[20,-11.5],[25,-10],[20,-8.8]],'#eeb573');
  } else if (kind === 'downtown') {
    shade(29,8.3);
    const blue=['#bdc2c4','#858ba0','#525a73'];
    const warm=['#d9cdbf','#a69ba7','#6e697f'];
    const mauve=['#bfb1b5','#8e8199','#5c5874'];
    const building=(a,b,w,d,h,p,rows) => {
      solid(a,b,w,d,h,p,'#343341');
      windows(a,b,w,d,h,Math.max(2,Math.floor(w/2.3)),Math.max(2,Math.floor(d/2.3)),rows,'#c8c7bd','#8c8c9f');
      line([[a,b-h],[a,b-1]],'#d0bec0',.46);
    };
    solid(-1,7,24,22,2,['#9e93a0','#676071','#494751']);
    building(-11,-2,8,6,21,warm,7);
    building(13,-4,7,6,27,blue,9);
    building(2,-5,7.4,8.2,35,mauve,13);
    const cx=1.7, by=-10;
    oval(cx,by,6.9,2.4,'#888698',ink,.6);
    g.fillStyle='#9796a6';g.fillRect(cx-6.9,by-28,13.8,28);
    g.fillStyle='#646478';g.fillRect(cx+1,by-28,5.9,28);
    oval(cx,by-28,6.9,2.4,'#d7c8be',ink,.6);
    for(let i=0;i<10;i++) {
      const yy=by-26+i*2.7;
      curve(cx-6.8,yy,cx-4,yy+2.7,cx+4.2,yy+2.7,cx+6.8,yy,'#5f6378',.68);
    }
    for(const dx of [-5,-2,1.1,4.8]) line([[cx+dx,by-27],[cx+dx,by]],'#c6bdbe',.57);
    for(const [off,rad,h] of [[28.8,5.8,4.6],[33.1,4.5,3.5],[36.3,3.1,2.4]]) {
      g.fillStyle='#9297a3';g.fillRect(cx-rad,by-off-h,rad*2,h);
      oval(cx,by-off-h,rad,rad*.28,'#e0d2bd','#56566c',.55);
      curve(cx-rad,by-off,cx-rad*.5,by-off+1.5,cx+rad*.55,by-off+1.5,cx+rad,by-off,'#596379',.55);
    }
    line([[cx,by-38.9],[cx,by-41.3]],'#d7c7aa',.7);
    building(-16,1,6.5,7.3,13,mauve,4);
    building(20,1.9,6.4,6,15,warm,5);
    building(8,6,6.8,6,17,blue,6);
    building(-6.2,5.3,4.9,6.2,10.8,warm,3);
  } else if (kind === 'westwood' || kind === 'cityhall') {
    solid(0,1,13,5,6,cream);
    solid(4,-2,3.5,4,12,cream);
    solid(4,-14,2,2,2,cream);
  } else if (kind === 'rosebowl') {
    shade(28,7);
    oval(0,-3,27,11,'#aa9588','#464648',.9,-.08);
    oval(0,-5.5,27,10.7,'#c6a493','#544b46',.78,-.08);
    oval(0,-5.8,23.2,8.3,'#ae6f65','#e6bba2',.75,-.08);
    oval(0,-6,20,6.4,'#996860','#dba78e',.7,-.08);
    oval(0,-5.9,16.7,4.9,'#68816b','#6f6657',.6,-.08);
    put([[-14,-5.8],[4.5,-8.4],[13.2,-6.2],[-5,-3.5]],'#87986c','#cfbf9d',.5);
    for(let i=0;i<5;i++) {
      const xx=-10+i*4.3;
      line([[xx,-6.1-(xx+10)*.14],[xx+4.6,-4.8-(xx+10)*.14]],'#cbbea0',.4);
    }
    for(let i=0;i<17;i++) {
      const a=i*Math.PI*2/17, cx=Math.cos(a), sy=Math.sin(a);
      line([[cx*20.8,sy*7-5.9-cx*1.5],[cx*25.2,sy*9.6-5.9-cx*1.5]],'#e0b99b',.5);
    }
    for(const [cx,cy] of [[-22,-7.5],[18,-11],[23,-3]]) {
      line([[cx,cy],[cx,cy-6]],'#5f6460',.9);
      line([[cx-1.7,cy-6],[cx+1.7,cy-6]],'#e6cfaa',1.1);
    }
    solid(1.5,4.4,5,5,2.6,cream);
  } else if (kind === 'studios') {
    shade(27,7);
    const stage = (a,b,w,d,h) => {
      solid(a,b,w,d,h,['#c6b5a1','#a28978','#745f60']);
      const top=b-h;
      put([[a-w,top-w*.38],[a-w+d*.5,top-(w+d*.5)*.38-2.4],[a+d*.5,top-d*.19-2.4],[a,top]],'#cca88a',ink,.6);
      put([[a,top],[a+d*.5,top-d*.19-2.4],[a+d,top-d*.38]],'#ab7f68',ink,.6);
      for(let i=1;i<5;i++) {
        const v=w*i/5;
        line([[a-v,top-v*.38],[a-v+d*.5,top-(v+d*.5)*.38-2.4]],'#a27f6d',.4);
      }
      put([[a-w*.82,b-w*.82*.38],[a-w*.36,b-w*.36*.38],[a-w*.36,b-w*.36*.38-h*.72],[a-w*.82,b-w*.82*.38-h*.72]],'#61585a','#d1b194',.45);
      line([[a-w*.58,b-w*.58*.38],[a-w*.58,b-w*.58*.38-h*.68]],'#9a796c',.45);
    };
    stage(12,-3,15,9,6.2);
    stage(5,5,14,8,6.7);
    const a=-12, b=.8, top=-15;
    for(const [u,v] of [[-6,0],[4,-2],[-3,-3],[7,-.5]]) {
      line([[a+u,b+v],[a+u*.62,top]],'#534a44',1.55);
      line([[a+u-.28,b+v],[a+u*.62-.28,top]],'#c5a275',.65);
    }
    line([[a-5,b-2],[a+3.4,top+.8]],'#9e805d',.84);
    line([[a+5,b-2],[a-3.6,top+.8]],'#a78a68',.84);
    line([[a-4.7,b-5.6],[a+5.1,b-6.3]],'#c4a17a',.76);
    put([[a-7,top-9.5],[a+7,top-9.5],[a+6.5,top],[a+2,top+2.2],[a-1,top+2.2],[a-6.5,top]],'#d8b277','#514740',.85);
    put([[a+2,top-10],[a+7,top-9.8],[a+6.5,top],[a+2,top+2.2]],'#af8864');
    oval(a,top-9.9,7.7,2.4,'#d9b585','#65564a',.62);
    put([[a-7.6,top-10],[a-.8,top-14],[a+7.6,top-10],[a+.5,top-11]],'#e8c28f','#755e4c',.55);
    curve(a-6.8,top-1.4,a-4,top+.4,a+4,top+.4,a+6.8,top-1.5,'#b29370',.65);
    g.fillStyle='#76503f';g.font='bold 4.2px Georgia,serif';g.textAlign='center';g.textBaseline='middle';
    g.fillText('LA',a-.7,top-5);
    line([[a-.7,top-14],[a-.7,top-15.7]],'#ead0a0',.55);
  } else if (kind === 'airport') {
    shade(27,7);
    oval(0,.6,24,6,'#959589','#565f5c',.65);
    for(const offset of [-1.3,1.2]) {
      curve(-23,1.4,-9,-20,7,-29,23,offset-1,'#646a6b',2.8);
      curve(-23,1.1,-9,-21.8,7,-30,23,offset-1.4,'#e2dcc3',1.35);
    }
    solid(1,1.5,4.8,4.7,9,['#d2cdb2','#929b93','#657477']);
    oval(0,-11.6,11.6,4,'#727f85',ink,.7);
    oval(0,-13,12.3,4.1,'#e6dcc1','#88918a',.7);
    oval(0,-14.4,9.5,2.7,'#b8c8b8','#7c8582',.6);
    for(const xx of [-7,-4.4,-1.5,1.7,4.6,7.6]) line([[xx,-13.1],[xx,-10.3-Math.abs(xx)*.12]],'#485f68',.63);
    curve(-16,4.7,-7,-3.3,2,-34,15,-25,'#606e70',3.4);
    curve(-16,4,-7,-4.1,2,-34.5,15,-25.4,'#eee4c8',1.8);
    curve(15,-25.4,17,-23,17.7,-9,20.7,-2.1,'#686f6f',2.5);
    curve(15,-25.7,17,-23.5,17.4,-10,20.2,-2.4,'#e4dec5',1.25);
    line([[-16.8,4.6],[-15,4.7]],'#e1d6b6',1);
  }
  g.restore();
}
