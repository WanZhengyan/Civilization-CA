import assert from 'node:assert/strict';
import test from 'node:test';
import {boxesOverlap,cityFont,cityLabelAt,paintCityLabels,planCityLabels} from '../docs/city-labels.js';
import {chartViewport,pos} from '../docs/hex-survey.js';
import {translate} from '../docs/i18n.js';
import {applyAction,campaignView,createGame,getMap} from '../docs/rules.js';

const map=getMap('la');
const byId=new Map(map.tiles.map(t=>[t.id,t]));
const city=(tile,seat=0,originalSeat=null,name=byId.get(tile).name)=>({tile,seat,originalSeat,name});
function plan(cities,options={}) {
  return planCityLabels({cities,byId,seat:0,project:(x,y)=>[x,y],view:chartViewport(1400,900),
    scale:1,unitBoxes:[],measure:text=>Array.from(text).length*7,...options});
}

test('the original capital keeps its crown after capture; an ordinary city on a historical capital tile has no crown',()=>{
  const captured=city('8,5',1,0), ordinary=city('11,7',0);
  assert.equal(byId.get(ordinary.tile).capitalFor,0);
  const marks=plan([ordinary,captured]);
  assert.deepEqual(marks.map(({city,capital})=>[city.tile,capital]),[[captured.tile,true],[ordinary.tile,false]]);
  const fills=[],strokes=[],texts=[];
  const brush=new Proxy({}, {get(target,key) {
    if(key in target)return target[key];
    if(key==='fill')return ()=>fills.push(target.fillStyle);
    if(key==='stroke')return ()=>strokes.push(target.strokeStyle);
    if(key==='fillText')return value=>texts.push(value);
    return ()=>{};
  }});
  paintCityLabels(brush,marks,1,seat=>['own ink','rival ink'][seat]);
  assert.equal(fills.filter(ink=>ink==='#ffe598').length,1);
  assert.ok(strokes.includes('own ink') && strokes.includes('rival ink'));
  assert.deepEqual(texts,marks.map(mark=>mark.text));
});

test('neither the actual seat projection nor the planner exposes a city in remembered terrain',()=>{
  const game=createGame(['Pacific','Valley'],'la',{seed:417007});
  const first=game.units.find(u=>u.seat===0);
  const founded=applyAction(game,0,{type:'found',unit:first.id});
  const enemyView=campaignView(founded,1),mine=campaignView(founded,0);
  assert.ok(!enemyView.cities.some(c=>c.tile===first.tile));
  assert.equal(plan(mine.cities,{visible:new Set(mine.intel.visible)}).length,1);
  enemyView.intel.explored.push(first.tile);
  assert.deepEqual(plan(founded.cities,{visible:new Set(enemyView.intel.visible)}),[]);
});

test('geographic city names translate, a player rename is preserved, and long names fit without changing the save',()=>{
  const original=city('4,7'),renamed=city('10,8',0,null,'Pacific Union'),longName='城市🏙'.repeat(30);
  const long=city('12,3',0,null,longName);
  const marks=plan([original,renamed,long],{localize:text=>translate(text,'zh-CN')});
  assert.equal(marks.find(m=>m.city===original).text,translate(original.name,'zh-CN'));
  assert.equal(marks.find(m=>m.city===renamed).text,'Pacific Union');
  const abbreviated=marks.find(m=>m.city===long);
  assert.ok(abbreviated.text.endsWith('…'));
  assert.ok(abbreviated.box[2]-abbreviated.box[0]<=226);
  assert.equal(long.name,longName);
});

test('Fit region keeps a selected city readable while other city markers survive crowding',()=>{
  const cities=['6,4','9,4','12,4','6,7','9,7','12,7','6,10','9,10','12,10'].map((id,i)=>city(id,i%2,i===0?0:null));
  const selected=cities.at(-1),view=chartViewport(210,130);
  const marks=plan(cities,{scale:.12,project:(x,y)=>[x*.12+20,y*.12+8],view,selectedTile:selected.tile});
  assert.equal(cityFont(.12),'650 12px system-ui, sans-serif');
  assert.equal(marks[0].city,selected);
  assert.ok(marks[0].box);
  assert.equal(marks.length,cities.length);
  assert.ok(marks.some(m=>!m.box));
  const boxes=marks.filter(m=>m.box).map(m=>m.box);
  assert.ok(boxes.every(box=>box[0]>=0 && box[1]>=0 && box[2]<=view.width && box[3]<=view.height));
  assert.ok(boxes.every((box,i)=>boxes.slice(i+1).every(next=>!boxesOverlap(box,next,2))));
});

test('a garrison, a neighbouring badge and floating panels leave an identifiable nameplate anchored to the hex',()=>{
  const target=city('8,7'),[x,y]=pos(8,7),view=chartViewport(1350,850,{left:190,right:260,top:95,bottom:100});
  const obstacles=[[x-3,y+3,x+34,y+35],[x+18,y-48,x+38,y-24]];
  const [mark]=plan([target],{view,unitBoxes:obstacles});
  assert.deepEqual([mark.x,mark.y],[x,y]);
  assert.ok(mark.box);
  assert.ok(obstacles.every(box=>!boxesOverlap(box,mark.box,2)));
  assert.ok(mark.box[0]>=view.left && mark.box[2]<=view.left+view.width);
});

test('the whole painted name selects its city after pan or zoom, and legal orders pass through to the district',()=>{
  const c=city('8,7'),move='8,8',attack='9,7';
  const model={cityTiles:new Set([c.tile]),moveTiles:[move],attackTiles:[attack]};
  for(const [s,dx,dy] of [[1.15,-200,-100],[.2,80,35],[1.7,-750,-530]]) {
    const marks=plan([c],{scale:s,project:(x,y)=>[s*x+dx,s*y+dy]});
    const [left,top,right,bottom]=marks[0].box;
    for(const x of [left+.1,(left+right)/2,right-.1])for(const y of [top+.1,bottom-.1]) {
      assert.equal(cityLabelAt(marks,x,y,'8,6',model),c.tile);
      assert.equal(cityLabelAt(marks,x,y,move,model),null);
      assert.equal(cityLabelAt(marks,x,y,attack,model),null);
      assert.equal(cityLabelAt(marks,x,y,move,{...model,attackTiles:[c.tile]}),c.tile,'the hostile city name opens its siege');
      assert.equal(cityLabelAt(marks,x,y,attack,{...model,attackTiles:[attack,c.tile]}),c.tile);
      assert.equal(cityLabelAt(marks,x,y,'8,6',{...model,cityLabelPicking:false}),null);
      assert.equal(cityLabelAt(marks,x,y,'8,6',{...model,fog:{visible:new Set()}}),null);
    }
    assert.equal(cityLabelAt(marks,right+1,bottom+1,'8,6',model),null);
  }
});
