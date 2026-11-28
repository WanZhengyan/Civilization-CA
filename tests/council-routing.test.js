import assert from 'node:assert/strict';
import test from 'node:test';
import {createGame,getResearchOptions,getCivicOptions} from '../docs/rules.js';
import {councilGraphRows,routeCouncilEdges} from '../docs/council-graph.js';

const eras = ['frontier','industrial','modern'];
const game = createGame([{name:'Player'}],'la',{seed:624101,mapSize:'large',practice:true});

// Place the real rule graph using the same lanes and row gaps as the responsive
// grid. An expanded detail sheet adds a wide obstacle below the selected pair.
function diagram(options,width,selected) {
  const {rows,width:fullWidth} = councilGraphRows(options,eras);
  const compact = width < 620, columns = compact ? 2 : fullWidth;
  const margin = compact ? 16 : 20, gap = compact ? 14 : 22;
  const cardWidth = (width-2*margin-(columns-1)*gap)/columns;
  const nodes = new Map(), obstacles = [];
  let bottom = 0, era;
  for (const row of rows) {
    let y = bottom + (compact ? 28 : 35);
    if (row.era !== era) {
      const headingTop = bottom + (era ? 26 : 0);
      obstacles.push({left:margin,right:margin+135,top:headingTop+12,bottom:headingTop+39});
      y = headingTop+51;
      era = row.era;
    }
    const pairs = compact ? Math.ceil(row.nodes.length/2) : 1;
    for (let pair=0;pair<pairs;pair++) {
      const group = row.nodes.filter(node => !compact || Math.floor(node.compactIndex/2) === pair);
      bottom = y + (compact ? 118 : 88);
      for (const {lane,compactIndex,option} of group) {
        const column = compact ? compactIndex%2 : lane;
        const left = margin + column*(cardWidth+gap);
        nodes.set(option.item,{left,right:left+cardWidth,top:y,bottom});
      }
      if (group.some(node => node.option.item === selected)) {
        const sheet = {left:margin,right:width-margin,top:bottom+16,bottom:bottom+236};
        obstacles.push(sheet);
        bottom = sheet.bottom;
      }
      y = bottom+14;
    }
  }
  const edges = options.flatMap(option => option.requires.map(from => ({from,to:option.item})));
  if (selected) {
    const route = new Set();
    function trace(id) {
      if (route.has(id)) return;
      route.add(id);
      for (const parent of options.find(option=>option.item === id).requires) trace(parent);
    }
    trace(selected);
    for (const edge of edges) edge.visible = route.has(edge.to);
  }
  const routes = routeCouncilEdges(nodes,edges,width,obstacles);
  return {edges,nodes,obstacles,routes};
}

const inside = (n,a,b) => n > Math.min(a,b) && n < Math.max(a,b);
function intersectsRectangle(a,b,r) {
  if (a.x === b.x) return inside(a.x,r.left,r.right) && Math.max(a.y,b.y)>r.top && Math.min(a.y,b.y)<r.bottom;
  return inside(a.y,r.top,r.bottom) && Math.max(a.x,b.x)>r.left && Math.min(a.x,b.x)<r.right;
}
function throughCrossings(routes) {
  const segments = routes.map(points => points.slice(1).map((q,i)=>[points[i],q]));
  let count = 0;
  for (let i=0;i<segments.length;i++) for (let j=0;j<i;j++) {
    for (const [a,b] of segments[i]) for (const [c,d] of segments[j]) {
      if (a.x === b.x && c.y === d.y && inside(a.x,c.x,d.x) && inside(c.y,a.y,b.y)) count++;
      if (c.x === d.x && a.y === b.y && inside(c.x,a.x,b.x) && inside(a.y,c.y,d.y)) count++;
    }
  }
  return count;
}

for (const [name,read,goal] of [['technology',getResearchOptions,'ballistics'],['civics',getCivicOptions,'harborCommission']]) {
  test(name+' routes avoid project cards, headings and an open detail sheet at both widths',()=>{
    for (const researchPace of [1,2]) {
      const options = read({...game,researchPace},0);
      for (const width of [1020,309]) for (const selected of [null,goal]) {
        if (selected && !options.some(option=>option.item===selected)) continue;
        const {edges,nodes,obstacles,routes} = diagram(options,width,selected);
        assert.equal(routes.length,edges.length);
        for (const [i,points] of routes.entries()) {
          const {from,to} = edges[i];
          assert.ok(points.length >= 2,from+' → '+to);
          assert.equal(points[0].y,nodes.get(from).bottom);
          assert.equal(points.at(-1).y,nodes.get(to).top);
          const blockers = [...obstacles,...[...nodes].filter(([id])=>id!==from && id!==to).map(([,r])=>r)];
          for (const [j,p] of points.slice(1).entries()) {
            assert.ok(p.x === points[j].x || p.y === points[j].y);
            assert.ok(!blockers.some(r=>intersectsRectangle(p,points[j],r)),from+' → '+to);
          }
        }
        if (researchPace === 2 && !selected) {
          const threshold = width === 1020 ? 4 : name === 'technology' ? 12 : 7;
          assert.ok(throughCrossings(routes)<=threshold,'crossing budget on the full tree');
        }
        if (selected) {
          const onlyShown = routeCouncilEdges(nodes,edges.filter(edge=>edge.visible),width,obstacles);
          assert.deepEqual(routes.filter((_,i)=>edges[i].visible),onlyShown);
        }
      }
    }
  });
}
