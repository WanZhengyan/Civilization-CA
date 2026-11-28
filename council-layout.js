// The era and tier of every project come from the rules. Only horizontal
// placement changes. Evaluate predecessors AND successors, including edges
// that skip a tier, rather than positioning each row from its parents alone.
function tierRows(options, eras) {
  const byId = new Map(options.map(option => [option.item, option]));
  const depths = new Map();
  function depth(option) {
    if (!depths.has(option.item)) {
      const parents = option.requires.map(id => byId.get(id)).filter(parent => parent?.era === option.era);
      depths.set(option.item, Math.max(option.tier || 1, 1 + Math.max(0, ...parents.map(depth))));
    }
    return depths.get(option.item);
  }
  return eras.flatMap(era => {
    const inEra = options.filter(option => option.era === era);
    return [...new Set(inEra.map(depth))].sort((a,b) => a-b).map(tier => ({
      era, tier, options: inEra.filter(option => depth(option) === tier)
    }));
  });
}

function arrangements(count, slots) {
  // The shipped councils have at most four cards per tier. Bound the work
  // for expanded catalogs by exploring rotations and adjacent swaps instead.
  if (slots > 5) {
    const choices = [];
    for (let offset = 0; offset < slots; offset++) {
      const base = Array.from({length:count}, (_, index) => (offset+index)%slots);
      choices.push(base, [...base].reverse());
      for (let j = 1; j < count; j++) {
        const swap = [...base];
        [swap[j-1], swap[j]] = [swap[j], swap[j-1]];
        choices.push(swap);
      }
    }
    return choices;
  }
  const results = [];
  function visit(prefix) {
    if (prefix.length === count) { results.push(prefix); return; }
    for (let i = 0; i < slots; i++) if (!prefix.includes(i)) visit([...prefix, i]);
  }
  visit([]);
  return results;
}

function orderRows(rows, width, compact) {
  const indices = new Map();
  const points = [];
  let y = 0;
  const levels = rows.map(row => {
    const firstY = y;
    const ids = row.options.map(option => {
      const index = points.length;
      indices.set(option.item, index);
      points.push({x:0,y:firstY});
      return index;
    });
    y += compact ? Math.ceil(ids.length / 2) : 1;
    return {ids, firstY, choices:arrangements(ids.length, compact ? ids.length : width)};
  });
  const edges = rows.flatMap(row => row.options.flatMap(option =>
    option.requires.filter(id => indices.has(id)).map(id => [indices.get(id),indices.get(option.item)])));
  function place(level, choice) {
    level.ids.forEach((id, i) => {
      points[id].x = compact ? choice[i] % 2 : choice[i];
      points[id].y = level.firstY + (compact ? Math.floor(choice[i] / 2) : 0);
    });
  }
  function cost() {
    let total = 0;
    for (let i = 0; i < edges.length; i++) {
      const [a,b] = edges[i], p = points[a], q = points[b];
      const slope = (q.x - p.x) / (q.y - p.y);
      total += Math.abs(q.x - p.x);
      for (const node of points) {
        if (node.y <= p.y || node.y >= q.y) continue;
        const distance = Math.abs(node.x - p.x - slope * (node.y - p.y));
        if (distance < .65) total += (.65-distance)*5;
      }
      for (let j = 0; j < i; j++) {
        const [c,d] = edges[j];
        if (a === c || a === d || b === c || b === d) continue;
        const r = points[c], s = points[d];
        const top = Math.max(p.y,r.y), bottom = Math.min(q.y,s.y);
        if (top >= bottom) continue;
        const other = (s.x-r.x) / (s.y-r.y);
        const gap = row => p.x + slope*(row-p.y) - r.x - other*(row-r.y);
        const start = gap(top), end = gap(bottom);
        if (start * end < 0) total += 26;
        else if (start === 0 && end === 0) total += 14 * (bottom-top);
        else if (start === 0 || end === 0) total += 6;
      }
    }
    return total;
  }

  let winner, minimum = Infinity;
  // Four deterministic starts keep the layout stable while avoiding a local
  // minimum from the original catalog's insertion order.
  for (let seed = 0; seed < 4; seed++) {
    const chosen = levels.map((level, i) => level.choices[
      seed ? ((i+1) * (seed*7+3)) % level.choices.length : 0]);
    levels.forEach((level,i) => place(level,chosen[i]));
    let price = cost();
    for (let sweep = 0; sweep < 8; sweep++) {
      const before = price;
      for (let t = 0; t < levels.length; t++) {
        const i = sweep % 2 ? levels.length-1-t : t, level = levels[i];
        for (const choice of level.choices) {
          place(level,choice);
          const value = cost();
          if (value < price - 1e-6) { chosen[i] = choice; price = value; }
        }
        place(level,chosen[i]);
      }
      if (price === before) break;
    }
    if (price < minimum) { minimum = price; winner = chosen; }
  }
  return winner;
}

// Cache only placements. Selection, descriptions, completion and costs are
// supplied fresh on every render, even when an older save uses the same DAG.
const cache = new Map();
export function councilGraphRows(options, eras) {
  const rows = tierRows(options,eras);
  const width = Math.max(1,...rows.map(row => row.options.length));
  const key = JSON.stringify(rows.map(row => row.options.map(o=>[o.item,o.requires])));
  let layout = cache.get(key);
  if (!layout) {
    layout = {desktop:orderRows(rows,width,false), compact:orderRows(rows,width,true)};
    if (cache.size >= 12) cache.delete(cache.keys().next().value);
    cache.set(key,layout);
  }
  rows.forEach((row,i) => {
    row.nodes = row.options.map((option,j) => ({
      option,lane:layout.desktop[i][j],compactIndex:layout.compact[i][j]
    })).sort((a,b) => a.lane-b.lane);
  });
  return {rows,width};
}
