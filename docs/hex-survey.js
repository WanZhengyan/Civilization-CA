// Chart coordinates match the point-up, odd-row grid used by movement and picking.
export const W = 72, H = 76, ROW = H * .75;
export const dX = [0, W / 2, W / 2, 0, -W / 2, -W / 2];
export const dY = [-H / 2, -H / 4, H / 4, H / 2, H / 4, -H / 4];
export const pos = (q,r) => [W / 2 + (q + (r & 1) * .5) * W, H / 2 + r * ROW];
export const idFor = (q,r) => q + ',' + r;

export function adjacent(q, r, side) {
  const odd = r & 1;
  return [[q+odd,r-1],[q+1,r],[q+odd,r+1],[q-1+odd,r+1],[q-1,r],[q-1+odd,r-1]][side];
}

// Picking, text placement and the camera all use the playable survey.
export function chartHit(x,y,hasTile) {
  const row=Math.round((y-H/2)/ROW);
  for(let r=row-1;r<=row+1;r++){
    const q=Math.round((x-W/2)/W-(r&1)*.5),id=idFor(q,r);
    if(!hasTile(id))continue;
    const [tx,ty]=pos(q,r),dx=Math.abs(x-tx);
    if(dx<=W/2 && Math.abs(y-ty)<=H/2-dx*H/(2*W))return id;
  }
  return null;
}

export function chartExtent(tiles) {
  let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
  for(const {q,r} of tiles){
    const [x,y]=pos(q,r);
    left=Math.min(left,x-W/2);right=Math.max(right,x+W/2);
    top=Math.min(top,y-H/2);bottom=Math.max(bottom,y+H/2);
  }
  return {left,right,top,bottom,width:right-left,height:bottom-top};
}

// Only coordinates enter the frame. Unseen oceans, deposits and opponents
// cannot move the line that marks the outermost playable hexes.
export function chartPerimeter(tiles) {
  const present = new Set(tiles.map(t => idFor(t.q,t.r)));
  const outgoing = new Map();
  for (const {q,r} of tiles) {
    const [x,y] = pos(q,r);
    for (let side = 0; side < 6; side++) {
      if (present.has(idFor(...adjacent(q,r,side)))) continue;
      const next = (side+1)%6;
      const start = [x+dX[side],y+dY[side]];
      const end = [x+dX[next],y+dY[next]];
      outgoing.set(start.join(','), {start,end});
    }
  }
  const rings = [];
  while (outgoing.size) {
    const first = outgoing.values().next().value.start;
    const ring = [];
    let point = first;
    do {
      const key = point.join(',');
      ring.push(point);
      point = outgoing.get(key).end;
      outgoing.delete(key);
    } while (point[0] !== first[0] || point[1] !== first[1]);
    rings.push(ring);
  }
  return rings;
}

export function chartFrame(tiles) {
  const frame = new Path2D();
  for (const ring of chartPerimeter(tiles)) {
    frame.moveTo(...ring[0]);
    for (const point of ring.slice(1)) frame.lineTo(...point);
    frame.closePath();
  }
  return frame;
}

export function paintChartMargin(ctx, width, height) {
  ctx.fillStyle = '#17232b';
  ctx.fillRect(0,0,width,height);
  ctx.beginPath();
  for (let x = -height; x < width; x += 10) {
    ctx.moveTo(x,0);
    ctx.lineTo(x+height,height);
  }
  ctx.strokeStyle = '#26323a';
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function inkChartFrame(ctx, frame, scale) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1b262c';
  ctx.lineWidth = 5 / scale;
  ctx.stroke(frame);
  ctx.strokeStyle = '#e1cf9e';
  ctx.lineWidth = 2 / scale;
  ctx.stroke(frame);
  ctx.restore();
}

// Each shared edge has exactly one north-east, east or south-east half-edge.
export function interiorEdges(tiles) {
  const present = new Set(tiles.map(t => idFor(t.q,t.r)));
  const segments = [];
  for (const {q,r} of tiles) {
    const [x,y] = pos(q,r);
    for (let side = 0; side < 3; side++) {
      if (!present.has(idFor(...adjacent(q,r,side)))) continue;
      segments.push([x+dX[side],y+dY[side],x+dX[side+1],y+dY[side+1]]);
    }
  }
  return segments;
}

export function chartMesh(tiles) {
  const mesh = new Path2D();
  for (const [x1,y1,x2,y2] of interiorEdges(tiles)) {
    mesh.moveTo(x1,y1);
    mesh.lineTo(x2,y2);
  }
  return mesh;
}

export function inkHexGrid(ctx, mesh, scale) {
  // Use screen-pixel widths for surveying at either an overview or a close zoom.
  // Two inks retain contrast on both dark water and pale inland terrain.
  ctx.save();
  ctx.strokeStyle = 'rgba(18,40,43,.64)';
  ctx.lineWidth = 1.45 / scale;
  ctx.stroke(mesh);
  ctx.translate(0,.47 / scale);
  ctx.strokeStyle = 'rgba(228,226,191,.53)';
  ctx.lineWidth = .8 / scale;
  ctx.stroke(mesh);
  ctx.restore();
}

export function regionOverviewZoom(viewWidth, viewHeight, worldWidth, worldHeight, base) {
  // Keep a small margin in CSS pixels even on tall phones and ultra-wide displays.
  const availableWidth = Math.max(1, viewWidth - 28);
  const availableHeight = Math.max(1, viewHeight - 28);
  return Math.min(availableWidth / worldWidth, availableHeight / worldHeight) / base;
}

// Camera space remains the full canvas; the focus point and fit use the open
// rectangle between the fixed controls so every edge hex can be reached.
export function chartViewport(width,height,insets={}) {
  const left=insets.left||0,top=insets.top||0;
  const innerWidth=Math.max(1,width-left-(insets.right||0));
  const innerHeight=Math.max(1,height-top-(insets.bottom||0));
  return {left,top,width:innerWidth,height:innerHeight,x:left+innerWidth/2,y:top+innerHeight/2};
}
