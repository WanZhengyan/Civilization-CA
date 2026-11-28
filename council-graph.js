// Keep each era together while placing every prerequisite above its successors,
// including in older campaigns that predate the tier field.
export function councilGraphRows(options, eras) {
  const byId = new Map(options.map(option => [option.item, option]));
  const depths = new Map();
  function depth(option) {
    if (!depths.has(option.item)) {
      const parents = option.requires.map(id => byId.get(id)).filter(parent => parent?.era === option.era);
      depths.set(option.item, Math.max(option.tier || 1, 1 + Math.max(0, ...parents.map(depth))));
    }
    return depths.get(option.item);
  }
  const rows = eras.flatMap(era => {
    const inEra = options.filter(option => option.era === era);
    return [...new Set(inEra.map(depth))].sort((a, b) => a - b).map(tier => ({
      era, tier, options: inEra.filter(option => depth(option) === tier)
    }));
  });
  const width = Math.max(1, ...rows.map(row => row.options.length));
  const positions = new Map();
  for (const row of rows) {
    const ranked = row.options.map((option, index) => {
      const parents = option.requires.map(id => positions.get(id)).filter(Number.isFinite);
      const ideal = parents.length ? parents.reduce((sum, n) => sum + n, 0) / parents.length
        : (index + .5) * width / row.options.length - .5;
      return {option, ideal};
    }).sort((a, b) => a.ideal - b.ideal);
    let previous = -1;
    row.nodes = ranked.map(({option, ideal}, i) => {
      const lane = Math.max(previous + 1, Math.min(width - (ranked.length - i), Math.round(ideal)));
      positions.set(option.item, lane);
      previous = lane;
      return {option, lane};
    });
  }
  return {rows, width};
}

const center = rect => (rect.left + rect.right) / 2;

// A short connection bends only in the whitespace between rows. Connections
// skipping nodes use a column gutter clear of all intervening project buttons.
export function councilEdgePath(start, end, startPort, endPort, nodes, width, slot) {
  const a = center(start) + startPort, b = center(end) + endPort;
  const y = start.bottom, z = end.top;
  const between = nodes.filter(rect => rect.top < z - 1 && rect.bottom > y + 1);
  const first = Math.min(z, ...between.map(rect => rect.top));
  const last = Math.max(y, ...between.map(rect => rect.bottom));
  const offset = 6 + (slot % 4) * 3;
  if (!between.length) {
    const bend = (y + z) / 2 + (slot % 5 - 2) * Math.min(3, (z - y) / 14);
    return 'M' + a + ' ' + y + 'V' + bend + 'H' + b + 'V' + z;
  }
  const depart = y + Math.max(3, Math.min(offset, (first - y) / 2));
  const arrive = z - Math.max(3, Math.min(offset, (z - last) / 2));
  const candidates = [a, b, offset, width - offset,
    ...nodes.flatMap(rect => [rect.left - offset, rect.right + offset])];
  const clear = candidates.filter(x => x >= 1 && x <= width - 1 &&
    between.every(rect => x < rect.left - 2 || x > rect.right + 2));
  const lane = clear.sort((x1, x2) => (Math.abs(a-x1) + Math.abs(b-x1)) - (Math.abs(a-x2) + Math.abs(b-x2)))[0] ?? offset;
  return 'M' + a + ' ' + y + 'V' + depart + 'H' + lane + 'V' + arrive + 'H' + b + 'V' + z;
}

const graphObservers = new WeakMap();
export function mountCouncilGraph(panel) {
  graphObservers.get(panel)?.disconnect();
  graphObservers.delete(panel);
  const graph = panel.querySelector('[data-council-graph]');
  if (!graph) return;
  const svg = graph.querySelector('.tree-wires');
  const buttons = [...graph.querySelectorAll('[data-tree-inspect]')];
  const paths = [...svg.querySelectorAll('[data-from]')];
  function draw() {
    const origin = graph.getBoundingClientRect();
    if (!origin.width || !origin.height) return;
    const nodes = new Map(buttons.map(button => {
      const rect = button.getBoundingClientRect();
      return [button.dataset.treeInspect, {
        left: rect.left-origin.left, right: rect.right-origin.left, top: rect.top-origin.top, bottom: rect.bottom-origin.top
      }];
    }));
    const rects = [...nodes.values()];
    const port = (edges, path) => (edges.indexOf(path) - (edges.length - 1) / 2) * 7;
    for (const [i, path] of paths.entries()) {
      const {from, to} = path.dataset;
      path.setAttribute('d', councilEdgePath(nodes.get(from), nodes.get(to),
        port(paths.filter(p => p.dataset.from === from), path),
        port(paths.filter(p => p.dataset.to === to), path), rects, origin.width, i));
    }
  }
  draw();
  const observer = new ResizeObserver(draw);
  observer.observe(graph);
  for (const button of buttons) observer.observe(button);
  graphObservers.set(panel, observer);
}
