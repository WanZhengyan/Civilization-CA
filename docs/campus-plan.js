import {WONDERS,campusStatus} from './wonders.js';

const safe=text=>String(text??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const terrainNames={urban:"Urban",plains:"Lowlands",coast:"Coast",forest:"Woodland",hills:"Foothills"};
const colors={urban:"#b59579",plains:"#96a66c",coast:"#baa97e",forest:"#5e8768",hills:"#849780",mountains:"#797d76",ocean:"#497b89"};
const ground=(q,r)=>[q*17+(r%2)*8.5,r*15];
const hex="0,-9 8.4,-4.5 8.4,4.5 0,9 -8.4,4.5 -8.4,-4.5";

export function campusPlan(map,state,city,item,sites,selected,allow) {
  const campus=WONDERS[item],chosen=sites.find(s=>s.id===selected),center=map.byId[city.tile];
  const eligible=new Set(sites.map(s=>s.id)), [cx,cy]=ground(center.q,center.r);
  let chart='';
  for(const t of map.tiles) {
    const [x,y]=ground(t.q,t.r);
    if(Math.abs(x-cx)>47||Math.abs(y-cy)>36)continue;
    const surveyed=state.board[t.id]?.owner===city.seat || state.intel?.explored?.includes(t.id);
    const active=t.id===selected;
    const fill=active?'#f4d78d':surveyed?colors[t.terrain]:'#424954';
    chart+='<g transform="translate('+x+' '+y+')"><polygon points="'+hex+'" fill="'+fill+'" stroke="'+(eligible.has(t.id)?'#f0d192':'#313c43')+'" stroke-width="'+(active?2:1)+'"/>'+
       (t.id===city.tile?'<circle r="3" fill="#f9f0d8"/>':active?'<circle r="2" fill="#51402a"/>':'')+'</g>';
  }
  const details=chosen?'<strong>'+safe(chosen.name)+'</strong><small>'+safe(terrainNames[chosen.terrain])+'</small><small>'+(chosen.favored?'<span>Site bonus</span> · +1 <span>'+campus.specialty+'</span>':'<span>Standard campus yield</span>')+'</small>':'';
  const buttons=sites.map(site=>'<button type="button" class="campus-site" data-campus-site="'+safe(site.id)+'" aria-pressed="'+(site.id===selected)+'"><strong>'+safe(site.name)+'</strong><small>'+safe(terrainNames[site.terrain])+' · '+safe(site.id)+'</small></button>').join('');
  return '<section class="campus-plan"><button class="modal-secondary" type="button" data-campus-back>Back to production</button>'+
    '<img class="campus-plate" alt="" src="./art/'+item+'.webp"><h3>'+safe(campus.name)+'</h3><p class="campus-budget"><span>Charter fee</span> · <span>'+campus.grant+' capital</span> · <span>'+(campusStatus(state,item)==='commissioned'?'A rival charter is underway.':'Available worldwide.')+'</span></p><p>Choose a campus site in this city’s territory.</p>'+
    '<div class="campus-preview"><svg aria-hidden="true" viewBox="'+[cx-51,cy-43,102,86].join(' ')+'">'+chart+'</svg><div>'+details+'</div></div>'+
    '<div class="campus-sites">'+buttons+'</div><button type="button" class="modal-primary" data-campus-confirm '+(chosen&&allow?'':'disabled')+'>Commission campus</button></section>';
}
