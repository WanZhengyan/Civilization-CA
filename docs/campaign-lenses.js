// Every thematic layer is built from a seat projection. Unknown parcels never enter the layer.
import {getMap} from './rules.js';
import {getLanguage,translate} from './i18n.js';

const t=(en,zh)=>getLanguage()==='zh-CN'?zh:en;
const ink=['#83bde2','#edb45e','#8fd3a0','#d18ec8','#b5b7c2'];
const definition=(id,en,zh,guide,guideZh,bands,measure)=>({id,en,zh,guide,guideZh,bands,measure});
const reading=(band,en,zh,rank=0)=>({band,en,zh,rank});
const lenses=[
  definition('survey','Survey coverage','勘探覆盖','Separate live sight from remembered terrain before giving an order.','先看当前视野和已探索区域，再下达指令。',
    [['In sight','当前可见'],['Charted earlier','曾经探索']],({known,visible})=>{
      const rows=new Map();
      for(const id of known)rows.set(id,visible.has(id)
        ? reading(0,'Live sight. Units and ownership can be inspected now.','当前可见，可以查看单位和归属。',1)
        : reading(1,'Charted terrain. Units and current ownership need fresh sight.','已探索地形。查看当前单位和归属需要重新获得视野。'));
      return rows;
    }),
];
export const campaignLenses=lenses;
export function surveyLayer(state,seat,id) {
  const lens=lenses.find(l=>l.id===id);
  if(!lens || state?.intel?.seat!==seat)return new Map();
  const map=getMap(state),known=new Set(state.intel.explored),visible=new Set(state.intel.visible);
  const rows=lens.measure({state,seat,map,known,visible,own:state.cities.filter(c=>c.seat===seat)});
  for(const key of rows.keys())if(!known.has(key))rows.delete(key);
  return rows;
}

export function paintCampaignLens(ctx,rows,model,path,viewport,scale) {
  if(!rows?.size)return;
  ctx.save();
  for(const [id,row] of rows){
    const tile=model.byId.get(id);
    if(!tile || !model.fog?.explored.has(id))continue;
    const x=36+(tile.q+(tile.r&1)*.5)*72,y=38+tile.r*57;
    if(x+36<viewport.left || x-36>viewport.right || y+38<viewport.top || y-38>viewport.bottom)continue;
    const p=path(tile.q,tile.r);
    ctx.fillStyle=ink[row.band];ctx.globalAlpha=.34;ctx.fill(p);
    ctx.strokeStyle=ink[row.band];ctx.lineWidth=1.4/scale;ctx.globalAlpha=.8;ctx.stroke(p);
  }
  ctx.restore();
}

export function mountCampaignLenses(menu,inspect,redraw,locate) {
  const box=document.createElement('section'); box.className='campaign-lens';box.translate=false;
  const element=(tag,parent)=>{const node=document.createElement(tag);parent.append(node);return node;};
  const label=element('label',box),caption=element('span',label),picker=element('select',label);
  const guide=element('p',box),key=element('div',box);
  key.className='lens-legend';
  const detail=document.createElement('section');detail.className='lens-inspection';detail.translate=false;
  inspect.after(detail);menu.prepend(box);
  let language,entry=null,lastState,lastSeat,lastLens,lastSelection,campaign,rows;
  picker.onchange=()=>{entry=lenses.find(l=>l.id===picker.value)||null;redraw();};
  function localize(){
    language=getLanguage();caption.textContent=t('Map lens','专题地图');
    picker.replaceChildren();
    for(const item of [{id:'',en:'Terrain',zh:'地形原图'},...lenses]){
      const o=element('option',picker);o.value=item.id;o.textContent=t(item.en,item.zh);
    }
    picker.value=entry?.id||'';
  }
  localize();key.hidden=guide.hidden=detail.hidden=true;
  return (state,seat,selection,match)=>{
    if(match!==campaign){campaign=match;entry=null;picker.value='';lastState=null;}
    const translated=language!==getLanguage();if(translated)localize();
    if(lastState===state && lastLens===entry && lastSelection===selection && lastSeat===seat && !translated)return rows;
    const changed=lastState!==state || lastLens!==entry || lastSeat!==seat;
    if(changed)rows=entry?surveyLayer(state,seat,entry.id):null;
    lastState=state;lastLens=entry;lastSelection=selection;lastSeat=seat;
    key.hidden=guide.hidden=detail.hidden=!entry;
    if(!entry)return rows;
    if(changed || translated){
      guide.textContent=t(entry.guide,entry.guideZh);
      key.replaceChildren();
      entry.bands.forEach(([en,zh],i)=>{
        const item=element('span',key),swatch=element('i',item);
        swatch.style.backgroundColor=ink[i];item.append(t(en,zh));
      });
    }
    const row=rows.get(selection);
    detail.replaceChildren();
    const title=element('strong',detail);title.textContent=t(entry.en,entry.zh);
    element('p',detail).textContent=row?t(row.en,row.zh):state.intel?.explored.includes(selection)?
      t('No matching observation on this parcel.','此地块没有符合条件的记录。'):
      t('Uncharted. Explore this hex to inspect it.','尚未探索，探明后可查看此处。');
    return rows;
  };
}
