import {pos} from './hex-survey.js';
import {translate} from './i18n.js';

export const cityFont = scale => '650 '+(scale<.6?12:scale<1.25?13:15)+'px system-ui, sans-serif';

export function boxesOverlap(a,b,gap=0) {
  return a[0]<b[2]+gap && a[2]>b[0]-gap && a[1]<b[3]+gap && a[3]>b[1]-gap;
}

export function cityLabelAt(marks,x,y,underlying,model) {
  if(model.cityLabelPicking===false || model.moveTiles.includes(underlying) || model.attackTiles.includes(underlying))return null;
  const mark=marks.find(({box})=>box && x>=box[0] && x<=box[2] && y>=box[1] && y<=box[3]);
  const tile=mark?.city.tile;
  return model.cityTiles.has(tile) && (!model.fog || model.fog.visible.has(tile)) ? tile : null;
}

// Measurements, collision distances and viewport insets are in CSS pixels,
// independent of the world transform or the physical screen's pixel ratio.
export function planCityLabels({cities,byId,visible,seat,forecasts,selectedTile,project,view,scale,unitBoxes,measure,localize=translate}) {
  const anchors=[];
  const right=view.left+view.width,bottom=view.top+view.height;
  for(const city of cities) {
    const tile=byId.get(city.tile);
    if(!tile || (visible && !visible.has(city.tile)))continue;
    const [x,y]=project(...pos(tile.q,tile.r));
    if(x<view.left || x>right || y<view.top || y>bottom)continue;
    const capital=city.originalSeat!=null,selected=city.tile===selectedTile;
    const name=city.name && city.name!==tile.name ? city.name : localize(tile.name);
    const priority=(selected?4:0)+(capital?2:0)+(city.seat===seat?1:0);
    const distance=(x-view.x)**2+(y-view.y)**2;
    const forecast=city.seat===seat ? forecasts?.get(city.id) : null;
    const border=forecast ? String(forecast.turns ?? '–') : '';
    anchors.push({city,x,y,capital,selected,name,border,priority,distance,radius:capital?6:3.5});
  }
  anchors.sort((a,b)=>b.priority-a.priority || a.distance-b.distance || a.city.tile.localeCompare(b.city.tile));
  const occupied=[...unitBoxes,...anchors.map(({x,y,radius:r})=>[x-r,y-r,x+r,y+r])];
  const height=scale<.6?20:23, maxText=Math.min(scale<.6?135:210,view.width-24);
  for(const mark of anchors) {
    const badge=mark.border ? 17+measure(mark.border) : 0, nameLimit=maxText-badge;
    if(nameLimit<12 || view.height<height+4)continue;
    let text=mark.name;
    if(measure(text)>nameLimit) {
      const letters=Array.from(text);
      while(letters.length && measure(letters.join('')+'…')>nameLimit)letters.pop();
      text=letters.join('')+'…';
    }
    const width=Math.ceil(measure(text)+badge)+16,hw=width/2,hh=height/2;
    const dx=hw+mark.radius+5,dy=hh+Math.min(32,Math.max(mark.radius+4,19*scale));
    const candidates=[[0,dy],[0,-dy],[-dx,0],[dx,0],[-hw*.7,dy],[hw*.7,dy],[-hw*.7,-dy],[hw*.7,-dy]];
    for(const [dx0,dy0] of candidates) {
      const x=Math.max(view.left+hw+2,Math.min(right-hw-2,mark.x+dx0));
      const y=Math.max(view.top+hh+2,Math.min(bottom-hh-2,mark.y+dy0));
      const box=[x-hw,y-hh,x+hw,y+hh];
      if(occupied.some(other=>boxesOverlap(box,other,2)))continue;
      mark.box=box;mark.text=text;occupied.push(box);
      break;
    }
  }
  return anchors;
}

function capitalCrown(g,x,y) {
  g.beginPath();g.moveTo(x-4,y-2);g.lineTo(x-2,y);g.lineTo(x,y-3.5);
  g.lineTo(x+2,y);g.lineTo(x+4,y-2);g.lineTo(x+3,y+2.5);g.lineTo(x-3,y+2.5);
  g.closePath();g.fillStyle='#ffe598';g.fill();
}

export function paintCityLabels(g,marks,scale,colorForSeat) {
  g.save();g.font=cityFont(scale);g.textBaseline='middle';g.textAlign='left';g.lineJoin='round';
  for(const {box,x,y} of marks) {
    if(!box)continue;
    const endX=Math.max(box[0],Math.min(box[2],x)),endY=Math.max(box[1],Math.min(box[3],y));
    g.beginPath();g.moveTo(x,y);g.lineTo(endX,endY);
    g.strokeStyle='#16232b';g.lineWidth=3.2;g.stroke();g.strokeStyle='#eadab0';g.lineWidth=1.25;g.stroke();
  }
  // Unlabelled cities still occupy their exact hex and retain capital status.
  for(const {city,x,y,radius,capital} of marks) {
    g.beginPath();
    if(capital)g.arc(x,y,radius,0,2*Math.PI);
    else g.rect(x-radius,y-radius,radius*2,radius*2);
    g.fillStyle='#172831';g.fill();g.strokeStyle='#132029';g.lineWidth=3.5;g.stroke();
    g.strokeStyle=colorForSeat(city.seat);g.lineWidth=1.7;g.stroke();
    if(capital)capitalCrown(g,x,y);
  }
  for(const {box,text,border,city,selected} of marks) {
    if(!box)continue;
    const [left,top,right,bottom]=box;
    g.beginPath();g.roundRect(left,top,right-left,bottom-top,3);g.fillStyle='#172831';g.fill();
    g.strokeStyle=selected?'#fff2c3':'#c7c5aa';g.lineWidth=selected?1.8:1;g.stroke();
    g.fillStyle=colorForSeat(city.seat);g.fillRect(left+2,top+3,3,bottom-top-6);
    g.fillStyle='#fff5db';g.fillText(text,left+9,(top+bottom)/2+.5);
    if(border) {
      const y=(top+bottom)/2, x=left+13+g.measureText(text).width;
      g.save();g.strokeStyle='#a8dfb4';g.fillStyle='#b8ebbe';g.lineWidth=1.25;
      g.beginPath();g.moveTo(x,y-2.5);g.lineTo(x+4,y-5);g.lineTo(x+8,y-2.5);
      g.lineTo(x+8,y+2.5);g.lineTo(x+4,y+5);g.lineTo(x,y+2.5);g.closePath();g.stroke();
      g.fillRect(x+2,y-.5,4,1);g.fillRect(x+3.5,y-2,1,4);
      g.fillText(border,x+11,y+.5);g.restore();
    }
    if(city.maxHp && city.hp<city.maxHp){
      g.fillStyle='#743f39';g.fillRect(left+2,bottom-3,right-left-4,2);
      g.fillStyle='#ffae88';g.fillRect(left+2,bottom-3,(right-left-4)*Math.max(0,city.hp/city.maxHp),2);
    }
  }
  g.restore();
}
