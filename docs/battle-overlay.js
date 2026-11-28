import {pos} from './hex-survey.js';
import {witnessedMode} from './attack-mode.js';
import {UNIT_TYPES} from './rules.js';
import {drawUnitArt} from './unit-art.js';

// Replay only coordinates explicitly included in this seat's report, even if
// the live unit has since moved into (or out of) sight.
export function battleMarkers(report,byId) {
  const target=byId.get(report.target.tile);
  if(!target)return null;
  const origin=report.attacker.kind!=='unknown' && report.attacker.tile ? byId.get(report.attacker.tile) : null;
  return {to:pos(target.q,target.r),from:origin?pos(origin.q,origin.r):null};
}

function path(g,points,color,width) {
  g.beginPath();g.moveTo(...points[0]);for(const point of points.slice(1))g.lineTo(...point);
  g.strokeStyle=color;g.lineWidth=width;g.stroke();
}
function ring(g,x,y,r,color,width) {
  g.beginPath();g.ellipse(x,y,r,r*.60,0,0,Math.PI*2);
  g.strokeStyle=color;g.lineWidth=width;g.stroke();
}

export function paintBattleReport(g,replay,scale,now) {
  const f=Math.min(1,Math.max(0,(now-replay.start)/replay.duration));
  if(f>=1)return false;
  const {report,to,from,still,color}=replay,[tx,ty]=to;
  const screen=Math.max(.72,Math.min(1.85,1/scale));
  g.save();g.lineCap='round';g.lineJoin='round';
  const ranged=witnessedMode(report,UNIT_TYPES)==='ranged';
  const impact=still?1:Math.min(1,Math.max(0,(f-(from?0.36:0))/.26));
  if(from){
    const [sx,sy]=from, dx=tx-sx,dy=ty-sy, length=Math.hypot(dx,dy);
    if(length>0){
      const ux=dx/length,uy=dy/length, side=[-uy,ux];
      const a=[sx+ux*11,sy+uy*11],b=[tx-ux*13,ty-uy*13];
      path(g,[a,b],'#271d21de',5*screen);
      g.setLineDash([5*screen,5*screen]);path(g,[a,b],'#ffbd90',1.7*screen);g.setLineDash([]);
      const tip=still?1:Math.min(1,Math.max(0,(f-.08)/.33));
      const x=a[0]+(b[0]-a[0])*tip,y=a[1]+(b[1]-a[1])*tip,arrow=6*screen;
      path(g,[[x-ux*arrow+side[0]*arrow*.62,y-uy*arrow+side[1]*arrow*.62],[x,y],[x-ux*arrow-side[0]*arrow*.62,y-uy*arrow-side[1]*arrow*.62]],'#ffe9b2',2.4*screen);
      if (ranged && !still && tip<1) {
        g.beginPath();g.arc(x,y,3.4*screen,0,2*Math.PI);
        g.fillStyle='#fff2b6';g.fill();
      }
      ring(g,sx,sy,15,'#2c2424',3.8*screen);ring(g,sx,sy,15,color,1.8*screen);
      if(!still && report.attacker.kind==='unit' && f<.55){
        const lunge=Math.sin(Math.PI*Math.min(1,f/.55)),distance=ranged?0:Math.min(17,length*.23)*lunge;
        drawUnitArt(g,report.attacker.type,sx+ux*distance,sy+uy*distance+3,{color,scale:.83,facing:dx<0?-1:1,strike:lunge});
      }
    }
  }
  if(impact>0){
    const burst=still?0:Math.sin(Math.PI*impact);
    ring(g,tx,ty,20+burst*9,'#392626',5*screen);ring(g,tx,ty,20+burst*9,'#ffad83',2.9*screen);
    if(burst>.01){
      for(let i=0;i<6;i++){
        const a=Math.PI*i/3;
        path(g,[[tx+Math.cos(a)*(24+burst*5),ty+Math.sin(a)*(17+burst*4)],[tx+Math.cos(a)*(27+burst*10),ty+Math.sin(a)*(19+burst*9)]],'#ffe3b1',1.7*screen);
      }
    }
    const damage=report.damage>0?'−'+report.damage:'◇';
    const y=ty-(26+(!still?4*impact:0))*screen;
    g.font='bold '+(13*screen)+'px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';
    const width=g.measureText(damage).width+12*screen;
    g.fillStyle='#412a2c';g.fillRect(tx-width/2,y-9*screen,width,18*screen);
    g.fillStyle='#ffe2bb';g.fillText(damage,tx,y);
    if (from && report.retaliation!=null && (ranged || report.retaliation>0)) {
      const label=report.retaliation ? '−'+report.retaliation : '0';
      const xx=from[0], yy=from[1]-27*screen, width=g.measureText(label).width+10*screen;
      g.fillStyle=ranged?'#233e37':'#412a2c';g.fillRect(xx-width/2,yy-8*screen,width,16*screen);
      g.fillStyle=ranged?'#c5f2d6':'#ffe2bb';g.fillText(label,xx,yy);
    }
  }
  g.restore();return !still;
}
