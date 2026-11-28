import {hexDistance} from './rules.js';
import {getLanguage,translate} from './i18n.js';

const local=(en,zh)=>getLanguage()==='zh-CN'?zh:en;
const normalize=value=>String(value).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().trim();

export function findLensSites(rows,map,query='',sort='priority',from=null) {
  const needle=normalize(query),sites=[];
  for(const [id,row] of rows){
    const tile=map.byId[id];
    if(!tile)continue;
    const name=tile.name||id;
    if(needle && !normalize([id,name,translate(name,'zh-CN'),row.en,row.zh].join(' ')).includes(needle))continue;
    sites.push({id,name,row,distance:from && map.byId[from]?hexDistance(from,id):null});
  }
  return sites.sort((a,b)=>(sort==='distance'?(a.distance??Infinity)-(b.distance??Infinity):0) ||
    b.row.rank-a.row.rank || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

export function mountLensFinder(parent,locate) {
  function element(tag,container){
    const el=document.createElement(tag);container.append(el);return el;
  }
  const box=element('details',parent);box.className='lens-finder';
  const heading=element('summary',box),holder=element('div',box);
  const search=element('input',holder),sort=element('select',holder),status=element('span',holder);
  const list=element('div',holder),pager=element('div',holder),previous=element('button',pager),next=element('button',pager);
  const priority=element('option',sort),distance=element('option',sort);
  previous.type=next.type='button';search.type='search';priority.value='priority';distance.value='distance';
  status.setAttribute('role','status');list.className='lens-matches';pager.className='lens-pages';
  let snapshot=null,page=0;
  function render(){
    if(!snapshot || !box.open)return;
    const {rows,map,selection,entry}=snapshot;
    const all=findLensSites(rows,map,search.value,sort.value,selection),size=5;
    const pages=Math.max(1,Math.ceil(all.length/size));page=Math.min(page,pages-1);
    status.textContent=all.length?local(all.length+' matches · page '+(page+1)+'/'+pages,all.length+' 处 · 第 '+(page+1)+'/'+pages+' 页'):
      local('No matching parcels.','没有匹配的地块。');
    list.replaceChildren();
    for(const hit of all.slice(page*size,(page+1)*size)){
      const button=element('button',list);button.type='button';
      const name=element('strong',button),text=element('small',button),band=entry.bands[hit.row.band];
      name.textContent=translate(hit.name)+' · '+hit.id;
      text.textContent=local(...band)+(sort.value==='distance' && hit.distance!=null?
        local(' · '+hit.distance+' hexes away',' · 相距 '+hit.distance+' 格'):'');
      button.onclick=()=>locate(hit.id);
    }
    pager.hidden=pages===1;previous.disabled=page===0;next.disabled=page+1>=pages;
  }
  function reset(){page=0;render();}
  search.oninput=sort.onchange=reset;box.ontoggle=render;
  previous.onclick=()=>{if(page>0){page--;render();}};
  next.onclick=()=>{page++;render();};
  box.hidden=true;
  return (entry,rows,map,selection)=>{
    box.hidden=!entry;
    if(!entry){snapshot=null;search.value='';page=0;return;}
    if(snapshot?.entry!==entry){search.value='';page=0;}
    const en=local('Find on map','在地图上查找');
    heading.textContent=en;search.setAttribute('aria-label',local('Search this lens','搜索本专题'));
    search.placeholder=local('Place, coordinate or detail','地点、坐标或详情');
    sort.setAttribute('aria-label',local('Order matching parcels','排列匹配地块'));
    priority.textContent=local('Highest priority','优先级最高');distance.textContent=local('Nearest to selection','距选中地块最近');
    previous.textContent=local('Previous','上一页');next.textContent=local('Next','下一页');
    snapshot={entry,rows,map,selection};render();
  };
}
