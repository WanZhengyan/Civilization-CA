import assert from 'node:assert/strict';
import test from 'node:test';
import {drawBarbarians} from '../docs/barbarian-art.js';
import {battleMarkers,paintBattleReport} from '../docs/battle-overlay.js';

function recordingContext(pitch=1) {
  let matrix=[1,0,0,pitch,0,0];
  const stack=[],calls=[];
  const transform=next=>{
    const [a,b,c,d,e,f]=matrix,[A,B,C,D,E,F]=next;
    matrix=[a*A+c*B,b*A+d*B,a*C+c*D,b*C+d*D,a*E+c*F+e,b*E+d*F+f];
  };
  const point=(x,y)=>[matrix[0]*x+matrix[2]*y+matrix[4],matrix[1]*x+matrix[3]*y+matrix[5]];
  const ctx={
    save(){stack.push([...matrix]);},restore(){matrix=stack.pop();},
    translate(x,y){transform([1,0,0,1,x,y]);},
    scale(x,y){transform([x,0,0,y,0,0]);calls.push({op:'scale',args:[x,y],matrix:[...matrix]});},
    rotate(angle){const c=Math.cos(angle),s=Math.sin(angle);transform([c,s,-s,c,0,0]);},
    measureText(text){return {width:text.length*7};},
    fillText(text,x,y){calls.push({op:'text',text,point:point(x,y),matrix:[...matrix]});},
    fillRect(x,y,w,h){calls.push({op:'rect',point:point(x,y),end:point(x+w,y+h)});},
    moveTo(x,y){calls.push({op:'move',point:point(x,y)});},
    lineTo(x,y){calls.push({op:'line',point:point(x,y)});},
    ellipse(x,y,rx,ry){calls.push({op:'ellipse',point:point(x,y),radii:[rx*matrix[0],ry*matrix[3]]});}
  };
  for(const name of ['beginPath','closePath','stroke','fill','arc','setLineDash','bezierCurveTo'])ctx[name]=()=>{};
  return {ctx,calls,depth:()=>stack.length};
}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} must match ${b}`);

test('neutral pieces retain their height while contact shadows follow the tilted ground',()=>{
  for(const type of ['camp','raider','scout']) {
    const piece={tile:'known',type,hp:30,maxHp:60},known={q:0,r:0};
    const model={byId:new Map([['known',known]]),state:{intel:{visible:['known']},barbarians:{
      camps:type==='camp'?[piece]:[],parties:type==='camp'?[]:[piece]
    }}};
    const pictures=[1,.7].map(pitch=>{
      const record=recordingContext(pitch);drawBarbarians(record.ctx,{...model,pitch},()=>[120,180]);
      assert.equal(record.depth(),0);return record.calls;
    });
    const [flat,tilted]=pictures;
    const shadow=tilted.find(c=>c.op==='ellipse');
    close(shadow.point[0],122);close(shadow.point[1],(180+9)*.7);close(shadow.radii[1],6*.7);
    // Damage bars and patrol insignia remain the same screen size and offsets.
    for(const op of ['rect','text']) {
      const a=flat.filter(c=>c.op===op),b=tilted.filter(c=>c.op===op);assert.equal(a.length,b.length);
      a.forEach((entry,i)=>{
        close(entry.point[0],b[i].point[0]);close(entry.point[1]-180,b[i].point[1]-180*.7);
        if(op==='rect')close(entry.end[1]-entry.point[1],b[i].end[1]-b[i].point[1]);
        else close(b[i].matrix[3],1);
      });
    }
  }
});

test('upright neutral drawing never looks up or draws hidden camps or patrols',()=>{
  const accessed=[],record=recordingContext(.7);
  drawBarbarians(record.ctx,{pitch:.7,byId:{get(id){accessed.push(id);return {q:1,r:1};}},state:{
    intel:{visible:['known']},barbarians:{camps:[{tile:'secret-camp',type:'camp'}],parties:[{tile:'secret-party',type:'raider'}]}
  }},()=>[120,180]);
  assert.deepEqual(accessed,[]);assert.deepEqual(record.calls,[]);assert.equal(record.depth(),0);
});

const report={attacker:{kind:'unit',type:'ranged',tile:'source'},target:{kind:'unit',type:'scout',tile:'target'},damage:35,retaliation:0};
const replay={report,to:[180,160],from:[60,90],still:true,color:'#d2ab6b',start:0,duration:1000};

test('battle damage and retaliation labels keep screen height above their exact ground anchors',()=>{
  for(const pitch of [1,.7]) {
    const {ctx,calls,depth}=recordingContext(pitch);
    paintBattleReport(ctx,replay,1,500,pitch);
    const texts=calls.filter(c=>c.op==='text');assert.deepEqual(texts.map(c=>c.text),['−35','0']);
    texts.forEach((text,i)=>{
      const anchor=i?replay.from:replay.to;close(text.point[0],anchor[0]);
      close(text.point[1],anchor[1]*pitch-(i?27:26));close(text.matrix[0],text.matrix[3]);
    });
    const rects=calls.filter(c=>c.op==='rect');
    close(rects[0].end[1]-rects[0].point[1],18);close(rects[1].end[1]-rects[1].point[1],16);
    assert.equal(depth(),0);
  }
});

test('replay figures stay upright while their launch point and firing path stay on the pitched map',()=>{
  const images=[1,.7].map(pitch=>{
    const record=recordingContext(pitch);
    paintBattleReport(record.ctx,{...replay,still:false},1,250,pitch);
    assert.equal(record.depth(),0);return record.calls;
  });
  const [flat,tilted]=images;
  const paths=images.map(calls=>calls.filter(c=>c.op==='move'||c.op==='line').slice(0,4));
  paths[0].forEach((op,i)=>{close(op.point[0],paths[1][i].point[0]);close(op.point[1]*.7,paths[1][i].point[1]);});
  const unit=tilted.find(c=>c.op==='scale' && c.args[0]===.83 && c.args[1]===.83);
  assert.ok(unit);close(unit.matrix[0],.83);close(unit.matrix[3],.83);
  close(unit.matrix[4],replay.from[0]);close(unit.matrix[5],(replay.from[1]+3)*.7);
  assert.equal(flat.filter(c=>c.op==='scale' && c.args[0]===.83).length,1);
});

test('tilted unknown-origin replays expose only the witnessed target',()=>{
  const accessed=[],hidden={...report,attacker:{kind:'unknown'},retaliation:null};
  const markers=battleMarkers(hidden,{get(id){accessed.push(id);return id==='target'?{q:2,r:3}:null;}});
  assert.deepEqual(accessed,['target']);assert.equal(markers.from,null);
  const {ctx,calls}=recordingContext(.7);
  paintBattleReport(ctx,{...replay,report:hidden,...markers},1,500,.7);
  assert.deepEqual(calls.filter(c=>c.op==='text').map(c=>c.text),['−35']);
  assert.ok(!calls.some(c=>c.op==='line'));
});
