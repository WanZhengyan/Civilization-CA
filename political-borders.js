import {adjacent, dX, dY, idFor, pos} from './hex-survey.js';

function observed(board, visible, id) {
  return Object.hasOwn(board, id) && (!visible || visible.has(id));
}

// The two sides of a border are sampled together. Unseen parcels and cutouts
// have no political meaning, even when a saved board still contains their owner.
export function frontierEdges(tiles, board, visible) {
  const present = new Set(tiles.map(tile => tile.id));
  const edges = [];
  for (const {id, q, r} of tiles) {
    if (!observed(board, visible, id)) continue;
    const owner = board[id].owner;
    const [x, y] = pos(q, r);
    for (let side = 0; side < 3; side++) {
      const other = idFor(...adjacent(q, r, side));
      if (!present.has(other) || !observed(board, visible, other)) continue;
      const neighbor = board[other].owner;
      if (owner === neighbor || (owner == null && neighbor == null)) continue;
      edges.push({
        cells: [id, other],
        owners: [owner, neighbor],
        a: [x + dX[side], y + dY[side]],
        b: [x + dX[side + 1], y + dY[side + 1]]
      });
    }
  }
  return edges;
}

export function frontierSeatsAt(id, board, visible, byId) {
  const tile = byId[id];
  if (!tile || !observed(board, visible, id) || board[id].owner == null) return [];
  const seats = new Set([board[id].owner]);
  for (let side = 0; side < 6; side++) {
    const other = idFor(...adjacent(tile.q, tile.r, side));
    if (byId[other] && observed(board, visible, other) && board[other].owner != null) {
      seats.add(board[other].owner);
    }
  }
  return seats.size > 1 ? [...seats] : [];
}

// Each group belongs to a single pair of owners. A hex corner has either
// two incident edges of that pair or a single endpoint at a three-way junction.
export function borderChains(edges) {
  const joins = new Map();
  const unused = new Set(edges);
  for (const edge of edges) {
    for (const point of [edge.a, edge.b]) {
      const key = point.join(',');
      if (!joins.has(key)) joins.set(key, []);
      joins.get(key).push(edge);
    }
  }
  const chains = [];
  function trace(key) {
    const chain = [key.split(',').map(Number)];
    let next;
    while ((next = joins.get(key).find(edge => unused.has(edge)))) {
      unused.delete(next);
      const point = next.a.join(',') === key ? next.b : next.a;
      chain.push(point);
      key = point.join(',');
    }
    if (chain.length > 1) chains.push(chain);
  }
  for (const [key, edgesAtCorner] of joins) if (edgesAtCorner.length === 1) trace(key);
  while (unused.size) trace(unused.values().next().value.a.join(','));
  return chains;
}

function outline(edges) {
  const path = new Path2D();
  for (const points of borderChains(edges)) {
    path.moveTo(...points[0]);
    for (const point of points.slice(1)) path.lineTo(...point);
    if (points[0].join(',') === points.at(-1).join(',')) path.closePath();
  }
  return path;
}

export function politicalPaths(tiles, board, visible, hexPath) {
  const claims = new Map(), pairs = new Map(), cells = new Map();
  for (const edge of frontierEdges(tiles, board, visible)) {
    const [first, second] = edge.owners;
    if (first == null || second == null) {
      const seat = first ?? second;
      if (!claims.has(seat)) claims.set(seat, []);
      claims.get(seat).push(edge);
    } else {
      const key = [Math.min(first, second), Math.max(first, second)].join(',');
      if (!pairs.has(key)) pairs.set(key, []);
      pairs.get(key).push(edge);
      for (const [i, seat] of edge.owners.entries()) {
        if (!cells.has(seat)) cells.set(seat, new Set());
        cells.get(seat).add(edge.cells[i]);
      }
    }
  }
  const contacts = new Path2D();
  for (const edges of pairs.values()) contacts.addPath(outline(edges));
  const ribbons = new Map();
  for (const [seat, ids] of cells) {
    const clip = new Path2D();
    for (const id of ids) clip.addPath(hexPath(...id.split(',').map(Number)));
    ribbons.set(seat, clip);
  }
  return {claims: [...claims].map(([seat, edges]) => [seat, outline(edges)]), contacts, ribbons};
}

export function inkPolitics(ctx, paths, scale, color) {
  if (!paths) return;
  // Keep the inks legible when zooming, with a cap in world units so a phone
  // overview never loses an entire district under a frontier.
  const pen = Math.min(1 / scale, 1.7);
  function stroke(path, ink, width) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = width * pen;
    ctx.stroke(path);
  }
  ctx.save();
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  for (const [seat, path] of paths.claims) {
    stroke(path, '#263237', 3.6);
    stroke(path, color(seat), 1.9);
  }
  if (paths.ribbons.size) {
    for (const [seat, clip] of paths.ribbons) {
      ctx.save();
      ctx.clip(clip);
      stroke(paths.contacts, '#203036', 9.4);
      stroke(paths.contacts, color(seat), 7.2);
      ctx.restore();
    }
    stroke(paths.contacts, '#253137', 2);
    ctx.setLineDash([3.2 * pen, 4.2 * pen]);
    stroke(paths.contacts, '#fff3cf', 1.15);
  }
  ctx.restore();
}
