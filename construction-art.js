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
  const block=(dx,dy,w,h,roof,front='#d5bd92',side='#8b806d')=>{
    polygon([[dx-w,dy],[dx,dy+3],[dx,dy+3-h],[dx-w,dy-h]],front);
    polygon([[dx,dy+3],[dx+w,dy],[dx+w,dy-h],[dx,dy+3-h]],side);
    polygon([[dx-w,dy-h],[dx,dy-h-3],[dx+w,dy-h],[dx,dy+3-h]],roof);
  };
  const stroke=(points,color,width=1.2)=>{
    g.beginPath();g.moveTo(...points[0]);for(const p of points.slice(1)) g.lineTo(...p);
    g.strokeStyle=color;g.lineWidth=width;g.stroke();
  };
  polygon([[-11,4],[-2,8],[12,3],[2,-2]],'#79735c');
  if(item==='monument'){block(0,2,6,3,'#dbd1a7');polygon([[-2,-1],[1,-15],[3,-1],[1,1]],'#e2cda4');}
  else if(item==='walls'){block(-4,1,4,7,'#b5a286');block(4,1,4,7,'#b5a286');block(0,1,4,4,'#af9e86');}
  else if(item==='workshop'){
    block(0,1,8,5,'#ab654a','#c98768','#946b56');block(-4,-1,1.8,12,'#925b48','#a16e54');
    polygon([[0,3],[5,1],[5,-3],[0,-1]],'#463b31');
  }
  else if(item==='shop'){
    block(0,1,8,6,'#bca36c','#5e9890','#687b68');
    // The striped canopy projects beyond the storefront and reads at map scale.
    for(let column=0;column<4;column++){
      const x=-8+column*2,y=-4+column*.75;
      polygon([[x,y],[x+2,y+.75],[x,y+3.5],[x-2,y+2.75]],column%2?'#f3dfad':'#b65842');
    }
    stroke([[-7,0],[-7,3]],'#3d6e67');stroke([[-2,2],[-2,5]],'#3d6e67');
  }
  else if(item==='academy'){
    block(0,1,9,6,'#ae6550','#ead9af');
    polygon([[-8,-5],[-5,-8],[-5,-10],[-3,-11],[-1,-9],[-1,-6],[1,-2]],'#ecd4a3');
    for(let i=0;i<3;i++)stroke([[-6+i*2.4,-2+i*.8],[-6+i*2.4,1+i*.8]],'#665a48',1.5);
  }
  else if(item==='grainMill'){
    block(-2,1,6,7,'#b79064');
    g.beginPath();g.ellipse(5,0,3.6,5,.25,0,2*Math.PI);g.fillStyle='#6a4933';g.fill();
    g.strokeStyle='#dfb574';g.lineWidth=1;g.stroke();
    stroke([[3.2,-3.9],[6.8,3.9]],'#e8bc75');stroke([[2,2.2],[8,-2.2]],'#e8bc75');
  }
  else if(item==='foundry'){
    block(3,-1,2.2,12,'#73574b','#887361');block(-3,1,5.5,8,'#755648','#8f6b55','#6e5f54');
    polygon([[-5,1],[-5,-3],[-3,-4],[-1,-2],[-1,2]],'#f5a748');
    stroke([[-3,1],[-2,3],[2,4]],'#f8cb72',1.7);
  }
  else if(item==='printingHouse'){
    block(0,1,7,6,'#688280','#c2b89b','#8b8879');
    // A dark iron hand press and pale platen stand in the open street-level bay.
    stroke([[-6,2],[-6,-5],[-3,-6],[0,-5],[0,3]],'#443f38',1.6);
    polygon([[-7,0],[-4,-1],[0,0],[-3,1.4]],'#ede3c1');
    stroke([[-3,-5],[2,-8]],'#4b463d');
  }
  else if(item==='shipyard'){
    polygon([[-8,0],[3,3],[8,1],[6,4],[2,5],[-6,3]],'#9a6f49');
    stroke([[-3,0],[-3,-11],[6,-7]],'#695340',1.8);
    stroke([[-3,-5],[1,-9]],'#b7986c');stroke([[6,-7],[6,-3]],'#635c4e',.8);
  }
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
