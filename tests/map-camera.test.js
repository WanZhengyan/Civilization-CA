import assert from 'node:assert/strict';
import test from 'node:test';
import {getMap} from '../docs/rules.js';
import {chartExtent,chartHit,chartPerimeter,chartViewport,pos} from '../docs/hex-survey.js';
import {cityLabelAt,planCityLabels} from '../docs/city-labels.js';
import {cameraProject,cameraUnproject,centeredCamera,zoomedCamera,pannedCamera,mapFitZoom} from '../docs/map-camera.js';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} must match ${b}`);
const samePoint=(actual,expected)=>actual.forEach((value,i)=>close(value,expected[i]));
const screens=[
  {width:1363,height:936,insets:{left:196,right:250,top:114,bottom:70}},
  {width:390,height:844,insets:{top:98,bottom:84}},
  {width:844,height:390,insets:{top:96,bottom:82}}
];

test('tilted and flat maps pick every regional district after pan and zoom',()=>{
  for(const mapId of ['la','sf','sd'])for(const size of ['standard','large','grand','epic']) {
    const map=getMap(mapId,size),has=id=>Object.hasOwn(map.byId,id);
    for(const pitch of [.7,1])for(const scale of [.24,1.2,2.8]) {
      const camera={cx:734,cy:519,scale,pitch,width:1363,height:936};
      for(const tile of map.tiles) {
        const [x,y]=pos(tile.q,tile.r);
        // The outer samples lie just inside each sloped or vertical hex edge.
        for(const [dx,dy] of [[0,0],[35,0],[-35,0],[0,37],[0,-37]]) {
          const world=cameraUnproject(camera,...cameraProject(camera,x+dx,y+dy));
          samePoint(world,[x+dx,y+dy]);
          assert.equal(chartHit(...world,has),tile.id);
        }
      }
    }
  }
});

test('zoom and two-finger translation retain the intended ground anchor in both views',()=>{
  for(const screen of screens)for(const pitch of [.7,1]) {
    const camera={...screen,cx:850,cy:630,scale:.85,pitch};
    for(const cursor of [[20,35],[screen.width*.37,screen.height*.61]]) {
      const point=cameraUnproject(camera,...cursor);
      for(const scale of [.3,1.8,2.7]) {
        const zoomed={...camera,...zoomedCamera(camera,scale,...cursor),scale};
        samePoint(cameraProject(zoomed,...point),cursor);
        const pan=[47,-73],panned={...zoomed,...pannedCamera(zoomed,...pan)};
        samePoint(cameraProject(panned,...point),[cursor[0]+pan[0],cursor[1]+pan[1]]);
      }
    }
  }
});

test('focus, mode switching and region fit respect the open area around floating controls',()=>{
  for(const screen of screens)for(const pitch of [.7,1]) {
    const view=chartViewport(screen.width,screen.height,screen.insets);
    for(const mapId of ['la','sf','sd'])for(const size of ['standard','large','grand','epic']) {
      const map=getMap(mapId,size),extent=chartExtent(map.tiles),base=.63;
      const scale=base*mapFitZoom(view,extent,base,pitch);
      const camera={...screen,cx:0,cy:0,scale,pitch};
      Object.assign(camera,centeredCamera(camera,(extent.left+extent.right)/2,(extent.top+extent.bottom)/2,view));
      for(const ring of chartPerimeter(map.tiles))for(const point of ring) {
        const [x,y]=cameraProject(camera,...point);
        assert.ok(x>=view.left+13.99 && x<=view.left+view.width-13.99);
        assert.ok(y>=view.top+13.99 && y<=view.top+view.height-13.99);
      }
      for(const tile of [map.tiles[0],map.tiles.at(-1)]) {
        const point=pos(tile.q,tile.r),focused={...camera,...centeredCamera(camera,...point,view)};
        samePoint(cameraProject(focused,...point),[view.x,view.y]);
        const switched={...focused,pitch:pitch===1?.7:1,scale:scale*1.17};
        Object.assign(switched,centeredCamera(switched,...cameraUnproject(focused,view.x,view.y),view));
        samePoint(cameraProject(switched,...point),[view.x,view.y]);
      }
    }
  }
});

test('city names stay upright and selectable in the tilted view while orders pass through them',()=>{
  const map=getMap('la','large'),tile=map.tiles.find(t=>t.terrain==='urban');
  const byId=new Map(map.tiles.map(t=>[t.id,t])),city={id:'test-city',tile:tile.id,name:'A coastal city',seat:0,originalSeat:0};
  const model={cityTiles:new Set([tile.id]),moveTiles:['move'],attackTiles:['attack']};
  for(const screen of screens)for(const pitch of [.7,1]) {
    const view=chartViewport(screen.width,screen.height,screen.insets),camera={...screen,cx:0,cy:0,scale:1.1,pitch};
    Object.assign(camera,centeredCamera(camera,...pos(tile.q,tile.r),view));
    const marks=planCityLabels({cities:[city],byId,seat:0,project:(x,y)=>cameraProject(camera,x,y),view,scale:camera.scale,
      unitBoxes:[],measure:text=>Array.from(text).length*7,localize:String});
    const [mark]=marks;assert.ok(mark.box);samePoint([mark.x,mark.y],[view.x,view.y]);
    const [left,top,right,bottom]=mark.box;assert.equal(bottom-top,23);
    for(const x of [left+.1,right-.1])for(const y of [top+.1,bottom-.1]) {
      assert.equal(cityLabelAt(marks,x,y,tile.id,model),tile.id);
      for(const order of ['move','attack'])assert.equal(cityLabelAt(marks,x,y,order,model),null);
      assert.equal(cityLabelAt(marks,x,y,tile.id,{...model,fog:{visible:new Set()}}),null);
    }
  }
});
