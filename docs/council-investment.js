import {getMap, getProductionOptions, getProjectSites, getStats} from './rules.js';
import {councilCourse} from './council-path.js';
import {WONDERS} from './wonders.js';
import {getLanguage, translate} from './i18n.js';

const L=(en,zh)=>getLanguage()==='zh-CN'?zh:en;
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const quotesByState=new WeakMap();

// Quote this seat's economy on the actual proposed parcel, with today's
// population, focus and policies. Do not advance turns or charge a charter.
export function councilInvestments(state,seat) {
  if (!state || (state.intel && state.intel.seat!==seat)) return [];
  let seats=quotesByState.get(state);
  if (!seats) {seats=new Map();quotesByState.set(state,seats);}
  if (seats.has(seat)) return seats.get(seat);
  const current=getStats(state,seat), quotes=[];
  for (const city of state.cities.filter(c=>c.seat===seat)) {
    for (const option of getProductionOptions(state,city.id,{replace:true})) {
      if (option.kind!=='building' || !option.enabled) continue;
      const school=WONDERS[option.item];
      if (!school && !['monument','workshop'].includes(option.item)) continue;
      const site=getProjectSites(state,city.id,option.item)[0];
      if (!site) continue;
      const proposed={...city,buildings:[...city.buildings,option.item]};
      if (school && site.favored) proposed.campusHonors=[...(city.campusHonors||[]),option.item];
      const after=getStats({...state,cities:state.cities.map(c=>c.id===city.id?proposed:c)},seat);
      const science=after.scienceIncome-current.scienceIncome, culture=after.cultureIncome-current.cultureIncome;
      if (science>0 || culture>0) quotes.push({city:city.id,cityName:city.name,customName:city.name!==getMap(state).byId[city.tile]?.name,
        item:option.item,label:option.label,site:site.id,turns:option.turns,science,culture,fee:school?.grant||0,paused:city.queue?.item});
    }
  }
  seats.set(seat,quotes);
  return quotes;
}

export function incomeHorizon(points,rate,gain=0,construction=0) {
  if (points<=0) return 0;
  const normal=rate>0 ? Math.ceil(points/rate) : null;
  if (normal!==null && normal<=construction) return normal;
  const remaining=points-rate*construction;
  return rate+gain>0 ? construction+Math.ceil(remaining/(rate+gain)) : null;
}
const turns=n=>n==null?L('no income','暂无收入'):L(n+(n===1?' turn':' turns'),n+' 回合');

export function investmentPanel(state,seat,council,goal,canOrder) {
  if (!state.cities.some(c=>c.seat===seat) || state.phase!=='playing' || council.completed===council.options.length) return '';
  const resource=council.resource, unit=resource==='science'?L('science','科研'):L('culture','文化');
  const path=goal ? councilCourse(council.options,goal,council.balance) : null;
  const points=path?.remaining ?? council.active?.remaining;
  const target=path ? council.options.find(o=>o.item===goal) : council.active;
  const horizon=points==null?null:incomeHorizon(points,council.rate);
  const quotes=councilInvestments(state,seat).filter(q=>q[resource]>0).map(q=>({...q,
    estimate:points==null?null:incomeHorizon(points,council.rate,q[resource],q.turns)}));
  quotes.sort((a,b)=>(a.estimate??Infinity)-(b.estimate??Infinity) || b[resource]-a[resource] || a.turns-b.turns);
  const title=L('City investments','城市投资');
  const explanation=target && points>0 ?
    '<p>'+escape(translate(target.label))+L(' · time to earn the remaining ',' · 按当前收入积累剩余 ')+points+' '+unit+L(' at current income: ','所需时间：')+turns(horizon)+'</p>' : '';
  if (!canOrder || !quotes.length) return '<details class="income-plan" translate="no"><summary>'+title+'</summary>'+explanation+'<p>'+
    (!canOrder?L('Review available city investments on your turn.','在你的回合可查看可建项目。'):L('No available city building would increase '+unit+' income right now.','当前可建的城市项目不会直接增加'+unit+'收入。'))+'</p></details>';
  const cards=quotes.slice(0,3).map(q=>{
    const gain='+'+council.rate+' → +'+(council.rate+q[resource])+' '+unit+L('/turn','／回合');
    const project=escape(translate(q.label)),city=escape(q.customName?q.cityName:translate(q.cityName));
    return '<article><div><strong>'+project+'</strong> · '+city+'<small>'+gain+' · '+L('Build in ','建造 ')+turns(q.turns)+
      (q.fee?' · '+q.fee+L(' gold charter',' 金币特许费'):'')+'</small>'+
      (points>0?'<small>'+L('With construction: ','含建造时间：')+turns(q.estimate)+'</small>':'')+
      (q.paused?'<small>'+L('Pauses the current city project.','将暂停当前城市项目。')+'</small>':'')+
      '</div><button type="button" data-invest-city="'+escape(q.city)+'" data-invest-item="'+escape(q.item)+'">'+L('Review site','查看选址')+'</button></article>';
  }).join('');
  return '<details class="income-plan" translate="no"><summary>'+title+' · '+L('Compare income','比较收入')+'</summary>'+explanation+cards+
    '<p>'+L('Uses current production and income. The higher rate starts after the building opens.','按当前生产与收入估算。建筑完工后才会提高每回合收入。')+'</p></details>';
}
