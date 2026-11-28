import assert from 'node:assert/strict';
import test from 'node:test';
import {createAtlas} from '../docs/atlas.js';
import {chartHit,chartViewport,pos} from '../docs/hex-survey.js';
import {RELIEF_PITCH} from '../docs/terrain-relief.js';

// Exercise the atlas's real event handlers and drawing transforms without a
// browser. The brush records painted screen coordinates rather than duplicating
// the camera implementation in the test's expected values.
const multiply=(a,b)=>[
  a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],
  a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],
  a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]
];
const point=(m,x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];

function brush(record=false){
  let matrix=[1,0,0,1,0,0],path=[],stack=[];
  const calls=[];
  const target={
    calls,
    save(){stack.push({matrix:[...matrix],fillStyle:this.fillStyle,font:this.font});},
    restore(){const state=stack.pop();assert.ok(state,'balanced canvas save/restore');matrix=state.matrix;this.fillStyle=state.fillStyle;this.font=state.font;},
    translate(x,y){matrix=multiply(matrix,[1,0,0,1,x,y]);},
    scale(x,y){matrix=multiply(matrix,[x,0,0,y,0,0]);},
    rotate(a){matrix=multiply(matrix,[Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0]);},
    setTransform(...m){matrix=m;},
    transform(...m){matrix=multiply(matrix,m);},
    beginPath(){path=[];},
    moveTo(x,y){if(record)path.push(point(matrix,x,y));},
    lineTo(x,y){if(record)path.push(point(matrix,x,y));},
    ellipse(x,y,rx,ry){if(record)path.push({ellipse:point(matrix,x,y),rx:rx*matrix[0],ry:ry*matrix[3]});},
    roundRect(x,y,w,h){if(record)path.push({rect:[...point(matrix,x,y),...point(matrix,x+w,y+h)]});},
    fill(){if(record)calls.push({kind:'fill',ink:this.fillStyle,path:[...path]});},
    fillRect(x,y,w,h){if(record)calls.push({kind:'rect',ink:this.fillStyle,rect:[...point(matrix,x,y),...point(matrix,x+w,y+h)]});},
    fillText(text,x,y){if(record)calls.push({kind:'text',text,point:point(matrix,x,y),matrix:[...matrix],font:this.font});},
    drawImage(...args){if(record)calls.push({kind:'image',matrix:[...matrix],args});},
    measureText(text){return {width:Array.from(String(text)).length*7};},
    createImageData(width,height){return {data:new Uint8ClampedArray(width*height*4)};},
    getImageData(x,y,width,height){return {data:new Uint8ClampedArray(width*height*4)};},
    createLinearGradient(){return {addColorStop(){}};},
    createRadialGradient(){return {addColorStop(){}};}
  };
  return new Proxy(target,{get(object,key){return key in object?object[key]:()=>{};}});
}

function harness(t,{width=1100,height=760,reliefView=true,insets={left:140,right:210,top:70,bottom:90},tiles}={}){
  const frames=new Map(),events=new Map(),captures=new Set(),selected=[],hovered=[],zooms=[];
  let nextFrame=0,visibleCanvas,removed=false;
  const allTiles=tiles||Array.from({length:49},(_,i)=>({q:i%7,r:Math.floor(i/7),id:`${i%7},${Math.floor(i/7)}`,terrain:'plains',name:'Test district'}));
  const attrs=new Map();
  const dimensions={width,height,left:0,top:0};
  const canvasFactory=(record=false)=>({
    width:1,height:1,style:{},context:brush(record),
    getContext(){return this.context;},
    getBoundingClientRect(){return dimensions;},
    setAttribute(key,value){attrs.set(key,value);},
    addEventListener(name,fn,{signal}={}){events.set(name,fn);signal?.addEventListener('abort',()=>events.delete(name),{once:true});},
    setPointerCapture(id){captures.add(id);},
    hasPointerCapture(id){return captures.has(id);},
    releasePointerCapture(id){captures.delete(id);},
    remove(){removed=true;},
    transferToImageBitmap(){return {width:this.width,height:this.height,close(){}};}
  });
  const replacements={
    document:{createElement(tag){assert.equal(tag,'canvas');const canvas=canvasFactory(!visibleCanvas);visibleCanvas??=canvas;return canvas;},addEventListener(){}},
    window:{devicePixelRatio:1,matchMedia:()=>({matches:true})},
    ResizeObserver:class {observe(){}disconnect(){}},
    Path2D:class {moveTo(){}lineTo(){}closePath(){}addPath(){}quadraticCurveTo(){}bezierCurveTo(){}},
    OffscreenCanvas:class {constructor(width,height){Object.assign(this,canvasFactory(),{width,height});}},
    requestAnimationFrame(fn){const id=++nextFrame;frames.set(id,fn);return id;},
    cancelAnimationFrame(id){frames.delete(id);}
  };
  const saved=new Map(Object.keys(replacements).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  for(const [key,value] of Object.entries(replacements))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
  let atlas;
  t.after(()=>{
    atlas?.destroy();
    for(const [key,descriptor] of saved)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
  });
  atlas=createAtlas({appendChild(){},getBoundingClientRect:()=>dimensions},{
    tiles:allTiles,reliefView,viewInsets:()=>insets,onSelect:(...args)=>selected.push(args),onHover:id=>hovered.push(id),onZoom:z=>zooms.push(z)
  });
  atlas.setLabels(false);atlas.setTerritories(false);
  const flush=()=>{
    if(frames.size)visibleCanvas.context.calls.length=0;
    for(let i=0;frames.size;i++){
      assert.ok(i<12,'drawing reaches an idle frame');
      const batch=[...frames];frames.clear();for(const [,fn] of batch)fn(performance.now()+1000);
    }
  };
  const emit=(name,values={})=>events.get(name)?.({pointerId:1,pointerType:'mouse',button:0,preventDefault(){},...values});
  const click=(x,y)=>{emit('pointerdown',{clientX:x,clientY:y});emit('pointerup',{clientX:x,clientY:y});};
  const matrix=()=>{
    const entry=visibleCanvas.context.calls.find(call=>call.kind==='image');
    assert.ok(entry,'terrain is painted');return entry.matrix;
  };
  const project=(x,y)=>point(matrix(),x,y);
  const underlying=(x,y)=>{const m=matrix();return chartHit((x-m[4])/m[0],(y-m[5])/m[3],id=>allTiles.some(tile=>tile.id===id));};
  return {atlas,flush,emit,click,matrix,project,underlying,selected,hovered,zooms,tiles:allTiles,
    view:chartViewport(width,height,insets),calls:visibleCanvas.context.calls,events,captures,get removed(){return removed;}};
}

test('actual atlas focus, mouse selection and keyboard navigation agree in relief and flat views',t=>{
  const h=harness(t);h.atlas.focus('3,3',true);h.flush();
  for(const relief of [true,false,true]){
    h.atlas.setReliefView(relief);h.flush();
    const m=h.matrix();assert.ok(Math.abs(m[3]/m[0]-(relief?RELIEF_PITCH:1))<1e-12);
    const center=h.project(...pos(3,3));
    assert.ok(Math.abs(center[0]-h.view.x)<1e-8 && Math.abs(center[1]-h.view.y)<1e-8,'focus stays in the open play area');
    h.click(...center);assert.equal(h.selected.at(-1)[0],'3,3');
    h.emit('keydown',{key:'ArrowRight'});assert.equal(h.hovered.at(-1),'4,3');
    h.emit('keydown',{key:'Enter'});assert.equal(h.selected.at(-1)[0],'4,3');
    h.atlas.focus('3,3');h.flush();
  }
});

test('actual wheel zoom, drag and view switching preserve the ground the player points at',t=>{
  const h=harness(t);h.atlas.focus('3,3',true);h.flush();
  for(const relief of [true,false]){
    h.atlas.setReliefView(relief);h.flush();
    const before=h.project(...pos(4,3));
    h.emit('wheel',{clientX:before[0],clientY:before[1],deltaY:-80});h.flush();
    const after=h.project(...pos(4,3));
    assert.ok(Math.hypot(after[0]-before[0],after[1]-before[1])<1e-8,'wheel anchor is stationary');
    h.click(...before);assert.equal(h.selected.at(-1)[0],'4,3');h.flush();
    const start=h.project(...pos(3,3)),delta=[43,67];
    h.emit('pointerdown',{clientX:start[0],clientY:start[1]});
    h.emit('pointermove',{clientX:start[0]+delta[0],clientY:start[1]+delta[1]});
    h.emit('pointerup',{clientX:start[0]+delta[0],clientY:start[1]+delta[1]});h.flush();
    const end=h.project(...pos(3,3));
    assert.ok(Math.hypot(end[0]-start[0]-delta[0],end[1]-start[1]-delta[1])<1e-8,'drag tracks both screen axes');
    h.click(...end);assert.equal(h.selected.at(-1)[0],'3,3');h.flush();
    const atCenter=h.underlying(h.view.x,h.view.y);
    h.atlas.setReliefView(!relief);h.flush();
    assert.equal(h.underlying(h.view.x,h.view.y),atCenter,'mode switch keeps the viewed ground');
    h.atlas.focus('3,3');h.flush();
  }
});

test('the painted upright unit badge remains selectable after toggling the camera',t=>{
  const h=harness(t);const unit={id:'settler',tile:'3,3',type:'settler',seat:0,hp:45,maxHp:60};
  h.atlas.update({units:[unit],players:[{color:'#efbb62'}],selectedUnitId:unit.id});h.atlas.focus(unit.tile,true);h.flush();
  for(const relief of [true,false,true]){
    h.atlas.setReliefView(relief);h.flush();
    const badge=h.calls.find(call=>call.kind==='text'&&call.text==='S');assert.ok(badge);
    assert.ok(Math.abs(badge.matrix[0]-badge.matrix[3])<1e-8,'badge retains upright proportions');
    h.click(...badge.point);assert.deepEqual(h.selected.at(-1).slice(0,2),[unit.tile,unit.id]);
    // The top of the miniature is above its flat ground hex under the tilted
    // camera. It must still resolve to the unit rather than the tile behind it.
    const [gx,gy]=h.project(...pos(3,3)),s=h.matrix()[0],p=relief?RELIEF_PITCH:1;
    h.click(gx,gy+16*s*p-37*1.48*s);
    assert.deepEqual(h.selected.at(-1).slice(0,2),[unit.tile,unit.id]);
  }
});

test('a two-finger pinch follows its moving midpoint without selecting a district',t=>{
  const h=harness(t,{width:390,height:844,insets:{top:110,bottom:130}});h.atlas.focus('3,3',true);h.flush();
  const before=h.project(...pos(3,3));
  h.emit('pointerdown',{pointerType:'touch',pointerId:1,clientX:before[0]-60,clientY:before[1]});
  h.emit('pointerdown',{pointerType:'touch',pointerId:2,clientX:before[0]+60,clientY:before[1]});
  h.emit('pointermove',{pointerType:'touch',pointerId:1,clientX:before[0]-80,clientY:before[1]+30});
  h.emit('pointermove',{pointerType:'touch',pointerId:2,clientX:before[0]+80,clientY:before[1]+30});
  h.emit('pointerup',{pointerType:'touch',pointerId:1,clientX:before[0]-80,clientY:before[1]+30});
  h.emit('pointerup',{pointerType:'touch',pointerId:2,clientX:before[0]+80,clientY:before[1]+30});h.flush();
  const after=h.project(...pos(3,3));
  assert.ok(Math.hypot(after[0]-before[0],after[1]-before[1]-30)<1e-8,'pinch keeps the same ground under its new midpoint');
  assert.equal(h.zooms.at(-1),220);assert.equal(h.selected.length,0);assert.equal(h.captures.size,0);
  h.click(...after);assert.equal(h.selected.at(-1)[0],'3,3');
});

test('clicking the visible health-bar edge selects its unit rather than the ground behind it',t=>{
  const h=harness(t),unit={id:'settler',tile:'3,3',type:'settler',seat:0,hp:45,maxHp:60};
  h.atlas.update({units:[unit],players:[{color:'#efbb62'}],selectedUnitId:unit.id});h.atlas.focus(unit.tile,true);h.flush();
  for(const relief of [true,false]){
    h.atlas.setReliefView(relief);h.flush();
    const bar=h.calls.find(call=>call.kind==='rect'&&call.ink==='#202d32');assert.ok(bar);
    const [left,top,right,bottom]=bar.rect;
    h.click(left+(right-left)*.9,(top+bottom)/2);
    assert.deepEqual(h.selected.at(-1).slice(0,2),[unit.tile,unit.id]);
  }
});

test('screen-space city names select their city while movement orders pass through in either view',t=>{
  const h=harness(t);const city={id:'city',tile:'3,3',seat:0,name:'Harbor Test Settlement',buildings:[]};
  h.atlas.update({cities:[city],players:[{color:'#efbb62'}]});h.atlas.focus(city.tile);h.flush();
  for(const relief of [true,false,true]){
    h.atlas.setReliefView(relief);h.flush();
    const name=h.calls.find(call=>call.kind==='text'&&call.text===city.name);assert.ok(name);
    assert.deepEqual(name.matrix,[1,0,0,1,0,0],'nameplates use CSS pixels');
    const location=[name.point[0]+4,name.point[1]];
    h.click(...location);assert.equal(h.selected.at(-1)[0],city.tile);assert.equal(h.selected.at(-1)[2],true);h.flush();
    const label=h.calls.find(call=>call.kind==='text'&&call.text===city.name);
    const x=label.point[0]+5,y=label.point[1],tile=h.underlying(x,y);assert.ok(tile);
    h.atlas.update({moveTiles:[tile],cityLabelPicking:true});h.flush();
    h.click(x,y);assert.equal(h.selected.at(-1)[0],tile);assert.equal(h.selected.at(-1)[2],false,'legal ground order passes through label');
    h.atlas.update({moveTiles:[],selectedId:city.tile});h.flush();
  }
});

test('destroy removes input handlers and scheduled painting',t=>{
  const h=harness(t);h.flush();h.atlas.destroy();
  assert.equal(h.removed,true);assert.equal(h.events.size,0);assert.equal(h.captures.size,0);
  h.emit('keydown',{key:'Enter'});assert.equal(h.selected.length,0);
});
