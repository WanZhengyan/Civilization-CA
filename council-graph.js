export {councilGraphRows} from './council-layout.js';

const middle = rectangle => (rectangle.left + rectangle.right) / 2;
const point = (x,y) => ({x,y});

function makeRoute(vertices) {
  const points = [];
  for (const p of vertices) {
    const a = points.at(-2), b = points.at(-1);
    if (b && p.x === b.x && p.y === b.y) continue;
    if (a && ((a.x === b.x && p.x === b.x) || (a.y === b.y && p.y === b.y))) points.pop();
    points.push(p);
  }
  let length = 0;
  const segments = points.slice(1).map((q,i) => {
    const p = points[i], vertical = p.x === q.x;
    const start = vertical ? p.y : p.x, end = vertical ? q.y : q.x;
    length += Math.abs(end-start);
    return {vertical, line:vertical ? p.x : p.y, low:Math.min(start,end), high:Math.max(start,end)};
  });
  return {points,segments,length};
}

function hits(segment, box) {
  if (segment.vertical) {
    return segment.line > box.left-2 && segment.line < box.right+2 &&
      segment.low < box.bottom + 1 && segment.high > box.top - 1;
  }
  return segment.line > box.top-2 && segment.line < box.bottom+2 &&
    segment.low < box.right + 1 && segment.high > box.left - 1;
}

function interference(a,b) {
  let cost = 0;
  for (const s of a.segments) for (const t of b.segments) {
    // Children may branch from one vertical stem; several prerequisites
    // may likewise converge on the same destination port.
    const sharedStem = (a.from === b.from && s === a.segments[0] && t === b.segments[0]) ||
      (a.to === b.to && s === a.segments[a.segments.length-1] && t === b.segments[b.segments.length-1]);
    if (sharedStem) continue;
    if (s.vertical === t.vertical) {
      const distance = Math.abs(s.line-t.line);
      if (distance >= 3) continue;
      const overlap = Math.min(s.high,t.high)-Math.max(s.low,t.low);
      if (overlap > 1) cost += (3-distance) * (35+overlap*.65);
    } else {
      const v = s.vertical ? s : t, h = s.vertical ? t : s;
      if (v.line >= h.low && v.line <= h.high && h.line >= v.low && h.line <= v.high) {
        const sharedEndpoint = (a.from === b.from || a.to === b.to) &&
          (v.line === h.low || v.line === h.high || h.line === v.low || h.line === v.high);
        if (!sharedEndpoint) cost += 320;
      }
    }
  }
  return cost;
}

function routingCandidates(source,target,sourcePort,targetPort,boxes,width) {
  const a = middle(source) + sourcePort, b = middle(target) + targetPort;
  const y = source.bottom, z = target.top;
  const obstacles = boxes.filter(rect => rect !== source && rect !== target && rect.bottom > y-2 && rect.top < z+2);
  const first = Math.min(z, ...obstacles.filter(rect => rect.top > y).map(rect => rect.top));
  const last = Math.max(y, ...obstacles.filter(rect => rect.bottom < z).map(rect => rect.bottom));
  const tracks = new Set([a,b, 4,8,12, width-4,width-8,width-12]);
  for (const rect of obstacles) for (const offset of [5,10]) {
    tracks.add(rect.left-offset);
    tracks.add(rect.right+offset);
  }
  // Several heights in each inter-row channel let competing routes pass
  // independently. The center is preferred in a channel without other wires.
  const ranks = [.5,.24,.76];
  const candidates = [], seen = new Set();
  function offer(vertices) {
    const route = makeRoute(vertices);
    if (route.segments.some(segment => obstacles.some(rect => hits(segment,rect)))) return;
    const key = route.points.map(p => p.x+','+p.y).join('|');
    if (seen.has(key)) return;
    seen.add(key);
    route.penalty = route.length*.10 + (route.points.length-2)*8;
    candidates.push(route);
  }
  for (const f of ranks) {
    const through = y+(z-y)*f;
    offer([point(a,y),point(a,through),point(b,through),point(b,z)]);
  }
  for (const lane of tracks) {
    if (lane < 2 || lane > width-2) continue;
    for (const f of ranks) for (const g of ranks) {
      const enter = y+(first-y)*f, leave = z-(z-last)*g;
      if (enter >= leave) continue;
      offer([point(a,y),point(a,enter),point(lane,enter),point(lane,leave),point(b,leave),point(b,z)]);
    }
  }
  // Full-width detail sheets and heading labels leave at least a narrow
  // margin on both sides in the tree's CSS.
  return candidates.sort((p,q) => p.penalty-q.penalty);
}

function svgPath(points) {
  return points.map((p,i) => !i ? 'M'+p.x+' '+p.y :
    p.x === points[i-1].x ? 'V'+p.y : 'H'+p.x).join('');
}

// A single wire is also useful for inspecting geometry apart from the rest
// of the diagram. The whole tree below chooses its routes jointly.
export function councilEdgePath(start,end,startPort,endPort,nodes,width) {
  const route = routingCandidates(start,end,startPort,endPort,nodes,width)[0];
  return route ? svgPath(route.points) : '';
}

export function routeCouncilEdges(nodes,edges,width,extraObstacles=[]) {
  const boxes = [...nodes.values(),...extraObstacles];
  const options = edges.map(({from,to}) => {
    const candidates = routingCandidates(nodes.get(from),nodes.get(to),0,0,boxes,width);
    for (const route of candidates) { route.from=from; route.to=to; }
    return candidates;
  });
  // Off-route wires retain legal geometry for the full diagram, but cannot
  // displace a visible ancestor into a crossing in a focused diagram.
  const sorted = edges.map((_,i) => i).filter(i => edges[i].visible !== false)
    .sort((a,b) => options[a].length-options[b].length || a-b);
  const chosen = [];
  // Assign the least flexible edges first. Then reroute individual edges
  // against their actual neighbors, accounting for both crossings and overlap.
  for (let pass=0; pass<5; pass++) {
    let changed = false;
    for (const i of pass%2 ? [...sorted].reverse() : sorted) {
      if (!options[i].length) continue;
      let best = chosen[i], bestCost = Infinity;
      const other = chosen.filter((route,j) => route && i !== j);
      for (const route of options[i]) {
        let score = route.penalty;
        for (const neighbor of other) {
          score += interference(route,neighbor);
          if (score >= bestCost) break;
        }
        if (score < bestCost) { bestCost=score; best=route; }
      }
      changed ||= best !== chosen[i];
      chosen[i] = best;
    }
    if (!changed) break;
  }
  return edges.map((_,i) => (chosen[i] || options[i][0])?.points || []);
}

const graphObservers = new WeakMap();
export function mountCouncilGraph(panel) {
  graphObservers.get(panel)?.disconnect();
  graphObservers.delete(panel);
  const graph = panel.querySelector('[data-council-graph]');
  if (!graph) return;
  const buttons = [...graph.querySelectorAll('[data-tree-inspect]')];
  const paths = [...graph.querySelectorAll('path[data-from]')];
  const extras = [...graph.querySelectorAll('.tree-detail:not([hidden]),.tree-era h3 span')];
  const edges = paths.map(path => ({
    from:path.dataset.from, to:path.dataset.to,
    visible:graph.dataset.selection !== 'true' || path.dataset.traced === 'true'
  }));
  let previousGeometry;
  function draw() {
    const origin = graph.getBoundingClientRect();
    if (!origin.width || !origin.height) return;
    function relative(element) {
      const r = element.getBoundingClientRect();
      return {left:r.left-origin.left,right:r.right-origin.left,top:r.top-origin.top,bottom:r.bottom-origin.top};
    }
    const nodes = new Map(buttons.map(button => [button.dataset.treeInspect,relative(button)]));
    const obstacles = extras.map(relative);
    const geometry = JSON.stringify([origin.width,...nodes.values(),...obstacles]);
    if (geometry === previousGeometry) return;
    previousGeometry = geometry;
    routeCouncilEdges(nodes,edges,origin.width,obstacles).forEach((points,i) => {
      const shape = svgPath(points);
      paths[i].setAttribute('d',shape);
      paths[i].parentNode.querySelector('.wire-casing')?.setAttribute('d',shape);
    });
  }
  draw();
  const observer = new ResizeObserver(draw);
  for (const element of [graph,...buttons,...extras]) observer.observe(element);
  graphObservers.set(panel,observer);
}
