// Fixed screen-weight outlines separate construction sites from movement paths.
export function paintWorkSurvey(g,model,scale,hexPath,pos) {
  if (!model.workSites?.length) return;
  g.save();
  for(const id of model.workSites) {
    const tile=model.byId.get(id);
    if (!tile || (model.fog && !model.fog.visible.has(id))) continue;
    const chosen=id===model.workSelection;
    const shape=hexPath(tile.q,tile.r),[x,y]=pos(tile.q,tile.r);
    g.fillStyle=chosen?'rgba(255,220,120,.48)':'rgba(91,210,190,.32)';g.fill(shape);
    g.strokeStyle=chosen?'#fff0ac':'#a6f6dc';g.lineWidth=(chosen?3.8:2.2)/Math.max(.45,scale);g.stroke(shape);
    g.fillStyle=chosen?'#f8d48b':'#b1efd7';
    g.strokeStyle='#213338';g.lineWidth=1.25/scale;
    g.beginPath();g.moveTo(x,y-6);g.lineTo(x+5,y);g.lineTo(x,y+6);g.lineTo(x-5,y);g.closePath();g.fill();g.stroke();
  }
  g.restore();
}

// Isometric district glyphs remain small enough to leave terrain and selected units legible.
export function drawCivicBuilding(g,item,x,y,color,siteScale=1) {
  g.save();g.translate(x,y);g.scale(siteScale,siteScale);
  const polygon=(points,fill)=>{
    g.beginPath();g.moveTo(...points[0]);for(const p of points.slice(1))g.lineTo(...p);
    g.closePath();g.fillStyle=fill;g.fill();g.strokeStyle='#453c33';g.lineWidth=.8;g.stroke();
  };
  const block=(dx,dy,w,h,roof)=>{
    polygon([[dx-w,dy],[dx,dy+3],[dx,dy+3-h],[dx-w,dy-h]],'#d5bd92');
    polygon([[dx,dy+3],[dx+w,dy],[dx+w,dy-h],[dx,dy+3-h]],'#8b806d');
    polygon([[dx-w,dy-h],[dx,dy-h-3],[dx+w,dy-h],[dx,dy+3-h]],roof);
  };
  polygon([[-11,4],[-2,8],[12,3],[2,-2]],'#79735c');
  if(item==='monument'){block(0,2,6,3,'#dbd1a7');polygon([[-2,-1],[1,-15],[3,-1],[1,1]],'#e2cda4');}
  else if(item==='walls'){block(-4,1,4,7,'#b5a286');block(4,1,4,7,'#b5a286');block(0,1,4,4,'#af9e86');}
  else if(item==='workshop'||item==='shipyard'){block(0,1,8,5,'#b48762');block(4,-1,2,11,'#886951');}
  else if(item==='granary'){block(-3,2,5,8,'#bd8f57');block(4,2,4,6,'#c7a261');}
  else{block(-4,1,5,5,'#b88265');block(4,3,5,7,'#ad765f');}
  polygon([[-1,4],[2,5],[5,4],[2,3]],color||'#d2b476');
  g.restore();
}
export function drawWorkInProgress(g,x,y) {
  g.save();g.translate(x+9,y+7);g.strokeStyle='#3b3028';g.fillStyle='#d1b380';g.lineWidth=1.3;
  g.fillRect(-5,-2,10,3);g.strokeRect(-5,-2,10,3);
  for(const dx of [-4,4]){g.beginPath();g.moveTo(dx,0);g.lineTo(dx,-10);g.stroke();}
  g.beginPath();g.moveTo(-5,-8);g.lineTo(5,-8);g.lineTo(-4,-1);g.stroke();g.restore();
}
