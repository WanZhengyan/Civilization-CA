import {mountLensFinder} from './lens-finder.js';
import {FIELD_STATIONS,fieldStationReport} from './field-stations.js';
import {seatMayOrder} from './team-turns.js';
import {getRouteDetail,hexDistance,UNIT_TYPES} from './rules.js';
import {recoveryAt} from './unit-service.js';
import {BUILDINGS} from './rules.js';
import {getPopulationReport} from './rules.js';
import {SETTLER_MIN_POPULATION,SETTLER_RESIDENT_COST} from './population.js';
import {getWonderSites,getProductionOptions} from './rules.js';
import {WONDERS,campusStatus} from './wonders.js';
import {waterDistances,waterKind} from './water-navigation.js';
import {getUnitOptions} from './rules.js';
import {scoutingRoutes} from './scout-routes.js';
import {getCityExpansions,getBorderCharter} from './rules.js';
import {borderParcels} from './city-expansion.js';
import {RESOURCES,connectedDeposit,serviceCity,canSeeDeposits} from './resources.js';
import {IMPROVEMENTS} from './rules.js';
import {getCitizenWorkforce} from './rules.js';
import {assignWorkforce} from './workforce.js';
import {neighboringWonders} from './natural-wonders.js';
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
  definition('land','Land potential','地块潜力','Compare the food, production and science one citizen could earn here if this land can be worked.','比较居民在可工作地块上能够获得的粮食、生产力和科研。',[
    ['Food','粮食'],['Production','生产力'],['Science','科研'],['Mixed yield','综合产出']
  ],({state,map,known})=>{
    const rows=new Map();
    for(const id of known){
      const tile=map.byId[id];
      if(!tile || state.board[id]?.naturalWonder)continue;
      const wonders=neighboringWonders(state.board,map,id,n=>known.has(n));
      const job=assignWorkforce({population:1},[{...tile,naturalWonders:wonders}]).eligibleTiles[0];
      if(!job)continue;
      const [food,production,science]=job.output,peak=Math.max(...job.output);
      const tied=job.output.filter(n=>n===peak).length>1;
      rows.set(id,reading(tied?3:job.output.indexOf(peak),
        'One worker · '+food+' food, '+production+' production, '+science+' science.',
        '每名居民 · '+food+' 粮食、'+production+' 生产力、'+science+' 科研。',food+production+science));
    }
    return rows;
  }),
  definition('jobs','Citizen assignments','市民分布','See which districts supply a city today and which eligible jobs have no worker.','查看城市实际工作的地块及其仍可分配的空缺岗位。',[
    ['City center','市中心'],['Vacant job','空缺岗位'],['Worked district','正在工作']
  ],({state,own})=>{
    const rows=new Map();
    for(const city of own){
      const work=getCitizenWorkforce(state,city.id),staff=new Set(work.workedTiles.filter(j=>!j.specialist).map(j=>j.id));
      const specialists=work.workedTiles.filter(j=>j.specialist).reduce((sum,j)=>sum+j.workers,0);
      rows.set(city.tile,reading(0,city.name+' · '+staff.size+' field workers, '+specialists+' specialists.',
        translate(city.name,'zh-CN')+' · 地块上有 '+staff.size+' 名居民，城内有 '+specialists+' 名专员。',city.population));
      for(const job of work.eligibleTiles)rows.set(job.id,reading(staff.has(job.id)?2:1,
        (staff.has(job.id)?'Worked by ':'Eligible for ')+city.name+'. Output per worker · '+job.output.join(' / ')+' (food / production / science).',
        (staff.has(job.id)?'居民来自':'可供分配给')+translate(city.name,'zh-CN')+'。每人粮食／生产力／科研 · '+job.output.join(' / ')+'。',staff.has(job.id)?2:1));
    }
    return rows;
  }),
  ...[['food','Food focus preview','预览粮食优先'],['industry','Industry focus preview','预览生产优先'],['science','Science focus preview','预览科研优先']].map(([focus,en,zh])=>
    definition('focus-'+focus,en,zh,'Compare current assignments with the proposed city focus before changing citizen orders.',
      '在改变市民分配前查看新方案与现状的差别。',[
        ['City totals','城市总量'],['Leaves assignment','撤出居民'],['Gains worker','增加居民'],['Keeps worker','保持工作']
      ],({state,own})=>{
        const rows=new Map();
        for(const city of own){
          const current=getCitizenWorkforce(state,city.id),after=getCitizenWorkforce(state,city.id,focus);
          const oldJobs=new Set(current.workedTiles.filter(j=>!j.specialist).map(j=>j.id));
          const nextJobs=new Set(after.workedTiles.filter(j=>!j.specialist).map(j=>j.id));
          const delta=['food','production','science'].map(k=>after.yields[k]-current.yields[k]);
          const figures=delta.map(n=>(n>0?'+':'')+n).join(' / ');
          rows.set(city.tile,reading(0,city.name+' · change in worker income (food / production / science) '+figures+'.',
            translate(city.name,'zh-CN')+' · 居民产出变化（粮食／生产力／科研）'+figures+'。',Math.abs(delta[0])+Math.abs(delta[1])+Math.abs(delta[2])));
          for(const id of new Set([...oldJobs,...nextJobs])){
            const band=oldJobs.has(id)?(nextJobs.has(id)?3:1):2;
            rows.set(id,reading(band,[null,'This worker would move elsewhere.','One citizen would start working here.','The worker would stay here.'][band],
              [null,'这名居民将转往其他岗位。','将会有一名居民到这里工作。','这名居民仍会在此工作。'][band],band===2?2:1));
          }
        }
        return rows;
      })),
  definition('supply','Resource connections','物资供应','Find surveyed deposits, the improvement they need and which city receives their goods.','找到已勘探矿藏、所需设施以及接收物资的城市。',[
    ['Surveyed deposit','已发现资源'],['Needs improvement','待修建'],['In supply','已接通'],['Service interrupted','供应中断']
  ],({state,seat,map,known,visible})=>{
    const rows=new Map();
    if(!canSeeDeposits(state,seat))return rows;
    for(const id of known){
      const cell=state.board[id],deposit=RESOURCES[cell?.resource];
      if(!deposit)continue;
      const name=deposit.name,zh=translate(name,'zh-CN');
      if(!visible.has(id) || cell.owner!==seat){rows.set(id,reading(0,name+' recorded. Production is shown for your visible holdings.',zh+'已记录。仅显示己方可见地块的生产情况。'));continue;}
      const city=serviceCity(state,id,map.byId,map.neighbors),improvement=IMPROVEMENTS[deposit.improvement].name;
      if(connectedDeposit(cell) && city)rows.set(id,reading(2,name+' · 1 good each harvest via '+city.name+'.',zh+' · 经'+translate(city.name,'zh-CN')+'每回合入库 1 份。',2));
      else if(!cell.pillaged && cell.improvement!==deposit.improvement)rows.set(id,reading(1,'Improve '+name+' with '+improvement+'.',zh+'需要'+translate(improvement,'zh-CN')+'。',3));
      else rows.set(id,reading(3,cell.pillaged?'Pillaged. Repair the site to resume production.':'The site needs a city connection.',
        cell.pillaged?'遭劫掠。修复后才能恢复产出。':'该地块需要城市连接。',4));
    }
    return rows;
  }),
  definition('borders','City frontiers','城市边界','Follow natural expansion from the city to its nominated parcel. Compare the wait with an immediate influence charter.','找到各城将自然并入的地块，对比等待时间和立即签发特许状的影响力成本。',[
    ['City','城市'],['Next parcel','下个地块'],['Charter available','可签特许状'],['Later candidate','后续候选']
  ],({state,seat,map,own,visible})=>{
    const rows=new Map(),reports=getCityExpansions(state,seat);
    for(const city of own){
      for(const candidate of borderParcels(state,city,map,visible)){
        if(!rows.has(candidate.id))rows.set(candidate.id,reading(3,'Within the growth frontier of '+city.name+'. Nomination can change as ownership changes.',
          '位于'+translate(city.name,'zh-CN')+'的扩张候选范围。归属变化会影响下次提名。'));
      }
    }
    for(const city of own){
      const report=reports.get(city.id),quote=getBorderCharter(state,seat,city.id,reports);
      if(!report)continue;
      rows.set(city.tile,reading(0,city.name+' · '+report.progress+'/'+report.required+' border progress, +'+report.rate+' per turn.',
        translate(city.name,'zh-CN')+' · 边界进度 '+report.progress+'/'+report.required+'，每回合 +'+report.rate+'。',1));
      if(!report.tile)continue;
      rows.set(report.tile,reading(quote.enabled?2:1,city.name+' · joins in '+report.turns+' turns. Charter for '+quote.cost+' influence. '+quote.reason,
        translate(city.name,'zh-CN')+' · '+report.turns+' 回合后并入。特许状消耗 '+quote.cost+' 影响力。'+translate(quote.reason,'zh-CN'),4));
    }
    return rows;
  }),
  definition('recon','Reconnaissance routes','侦察路线','Inspect a destination to see which scout can reach it and how much previously uncharted land it would reveal this turn.','点选目的地，查看哪名侦察兵能在本回合抵达，以及预计新探明的地块数量。',[
    ['Already charted','无新增视野'],['Reveals 1–3 hexes','新探明 1–3 格'],['Reveals 4+ hexes','新探明 4 格以上']
  ],({state,seat})=>{
    const rows=new Map(),bestCost=new Map();
    for(const scout of state.units.filter(u=>u.seat===seat && u.type==='scout' && u.moves>0)){
      for(const route of scoutingRoutes(state,scout,getUnitOptions(state,scout.id).moves)){
        if((bestCost.get(route.tile)??Infinity)<=route.cost)continue;
        bestCost.set(route.tile,route.cost);
        rows.set(route.tile,reading(route.newHexes===0?0:route.newHexes<=3?1:2,
          'Scout at '+scout.tile+' · reveals '+route.newHexes+' new hexes. Move cost '+route.cost+', '+route.left+' movement left.',
          '位于 '+scout.tile+' 的侦察兵 · 可新探明 '+route.newHexes+' 格。消耗 '+route.cost+' 移动力，剩余 '+route.left+'。',route.newHexes));
      }
    }
    return rows;
  }),
  definition('water','Harbor connections','港口水网','Follow charted water from your berths. Each tile reports its nearest home berth, sailing distance in hexes and number of connected home ports.','沿已探明水域查看己方泊位，点选水格查看最近的母港、航程格数和已连通的己方港口数。',[
    ['Home berth','己方泊位'],['Single port','连接单港'],['Linked ports','多港互通'],['No charted link','尚无已知航线']
  ],({map,own,known})=>{
    const rows=new Map(),routes=new Map(),berths=new Set();
    for(const city of own.filter(c=>c.portTile)){
      berths.add(city.portTile);
      for(const [id,distance] of waterDistances(city.portTile,map.byId,map.neighbors,Infinity,known)){
        const list=routes.get(id)||[];list.push({city,distance});routes.set(id,list);
      }
    }
    for(const id of known){
      if(!waterKind(map.byId[id]))continue;
      const ports=routes.get(id)||[];
      if(!ports.length){rows.set(id,reading(3,'No charted water route to a home berth. Explore further or commission a harbor.',
        '尚无通往己方泊位的已知水路。可继续勘探或建设港口。'));continue;}
      const {city,distance}=ports.sort((a,b)=>a.distance-b.distance)[0];
      rows.set(id,reading(berths.has(id)?0:ports.length>1?2:1,'Nearest berth · '+city.name+', '+distance+' water hexes. Connected home ports · '+ports.length+'.',
        '最近泊位 · '+translate(city.name,'zh-CN')+'，水路 '+distance+' 格。已接通 '+ports.length+' 个己方港口。',ports.length));
    }
    return rows;
  }),
  definition('campus','University charters','大学选址','Compare legal sites for researched campuses. Favored terrain adds one point to the university’s specialty each harvest.','为已解锁的大学比较合规地块。匹配地形每回合额外获得 1 点该校的专长产出。',[
    ['Standard site','普通选址'],['Favored terrain','优势地形'],['Order unavailable','暂不可委托']
  ],({state,own})=>{
    const rows=new Map(),matches=new Map();
    for(const city of own){
      const options=getProductionOptions(state,city.id,{replace:true});
      for(const option of options.filter(o=>WONDERS[o.item] && campusStatus(state,o.item)!=='complete')){
        const school=WONDERS[option.item];
        for(const site of getWonderSites(state,city.id,option.item)){
          const list=matches.get(site.id)||[];list.push({city,option,school,site});matches.set(site.id,list);
        }
      }
    }
    for(const [id,list] of matches){
      const available=list.filter(m=>m.option.enabled),bonus=available.filter(m=>m.site.favored).length;
      const info=lang=>list.map(({city,option,school,site})=>{
        const zh=lang==='zh-CN',name=translate(school.name,lang),town=translate(city.name,lang);
        const specialty={production:['production','生产力'],science:['science','科研'],culture:['culture','文化']}[school.specialty];
        return town+' · '+name+' · '+school.grant+(zh?' 金币':' gold')+
          (site.favored?' · +1 '+specialty[Number(zh)]:'')+(option.enabled?'':' · '+translate(option.reason,lang));
      }).join(' / ');
      rows.set(id,reading(!available.length?2:bonus?1:0,info('en'),info('zh-CN'),bonus*10+available.length));
    }
    return rows;
  }),
  definition('growth','Population and food reserves','人口与粮仓','Find cities that need food or housing, and identify towns that can spare a settler household.','找出粮食紧张或住房不足的城市，查看哪些城市可以派出开拓者家庭。',[
    ['Steady','稳定'],['Housing limit','住房已满'],['Growing','正在增长'],['Food deficit','粮食赤字']
  ],({state,own})=>{
    const rows=new Map();
    for(const city of own){
      const f=getPopulationReport(state,city.id),band=f.surplus<0?3:f.housingLimited?1:f.growthTurns?2:0;
      const status=f.starvationTurns?['Resident lost in '+f.starvationTurns+' turns.','预计 '+f.starvationTurns+' 回合后减少一名居民。']:
        f.housingLimited?['More housing needed to grow.','增加住房后可继续增长。']:
        f.growthTurns?['Growth in '+f.growthTurns+' turns.','预计 '+f.growthTurns+' 回合后增加一名居民。']:['No growth forecast.','目前没有人口增长预期。'];
      const departure=f.population>=SETTLER_MIN_POPULATION?['Can sponsor a settler for '+SETTLER_RESIDENT_COST+' resident.','可招募开拓者，完成时消耗 '+SETTLER_RESIDENT_COST+' 名居民。']:
        ['Needs '+(SETTLER_MIN_POPULATION-f.population)+' more residents to sponsor a settler.','再增加 '+(SETTLER_MIN_POPULATION-f.population)+' 名居民即可招募开拓者。'];
      rows.set(city.tile,reading(band,city.name+' · population '+f.population+'/'+f.housing+' housing. Food '+f.food+' stored, '+f.harvest+' harvested, '+f.consumption+' consumed. '+status[0]+' '+departure[0],
        translate(city.name,'zh-CN')+' · 人口 '+f.population+'／住房 '+f.housing+'。存粮 '+f.food+'，收获 '+f.harvest+'，消耗 '+f.consumption+'。'+status[1]+departure[1],band===3?100-(f.starvationTurns||0):band===1?40:f.growthTurns?20-f.growthTurns:0));
    }
    return rows;
  }),
  definition('works','Civic works register','公共工程台账','Inspect completed facilities and active sites. The city center also reports recruitment and projects without a separate site.','查看已竣工设施和当前工地。没有独立场址的招募或项目会列在市中心。',[
    ['City administration','城市行政中心'],['Under construction','建造中'],['Operating facility','设施运营中'],['Order held','项目暂停']
  ],({state,own,known})=>{
    const rows=new Map(),sites=new Map();
    function record(id,band,en,zh){
      const site=sites.get(id)||{band:0,en:[],zh:[]};
      const priority=[0,2,1,3];
      if(priority[band]>priority[site.band])site.band=band;
      site.en.push(en);site.zh.push(zh);sites.set(id,site);
    }
    for(const city of own){
      record(city.tile,0,city.name,translate(city.name,'zh-CN'));
      for(const item of city.buildings){
        const def=BUILDINGS[item];if(!def)continue;
        const campus=WONDERS[item]&&[...known].find(id=>state.board[id]?.wonderCity===city.id && state.board[id]?.wonder===item);
        const id=city.buildingSites?.[item] || campus || (item==='harbor' && city.portTile) || city.tile;
        record(id,2,def.name+' operating for '+city.name+'.',translate(def.name,'zh-CN')+'已为'+translate(city.name,'zh-CN')+'投入运营。');
      }
      const queue=city.queue;
      if(!queue){record(city.tile,0,'No active production order.','暂无进行中的生产项目。');continue;}
      const quote=getProductionOptions(state,city.id,{replace:true}).find(o=>o.item===queue.item);
      if(!quote)continue;
      const site=queue.site || queue.portTile || city.tile;
      const held=quote.turns==null;
      record(site,held?3:1,quote.label+' · '+city.name+' · '+queue.progress+'/'+quote.required+' production. '+(held?quote.reason:quote.turns+' turns estimated.'),
        translate(quote.label,'zh-CN')+' · '+translate(city.name,'zh-CN')+' · 生产进度 '+queue.progress+'/'+quote.required+'。'+(held?translate(quote.reason,'zh-CN'):'预计还需 '+quote.turns+' 回合。'));
    }
    for(const [id,site] of sites)rows.set(id,reading(site.band,site.en.join(' '),site.zh.join(' '),[0,3,1,4][site.band]));
    return rows;
  }),
  definition('recovery','Medical evacuation routes','部队疗养路线','Compare the recovery available to an injured unit in place or at a destination it can reach this turn. Rest requires spare movement.','比较受伤单位留在原地或在本回合可抵达地点休整后的恢复量。主动休息需要剩余移动力。',[
    ['No recovery','无恢复'],['Rest only','仅休息可恢复'],['Medical service','驻地疗养'],['Service and rest','驻地疗养加休息']
  ],({state,seat})=>{
    const rows=new Map(),sites=new Map();
    for(const unit of state.units.filter(u=>u.seat===seat && u.hp<u.maxHp)){
      const def=UNIT_TYPES[unit.type];
      for(const tile of [unit.tile,...getUnitOptions(state,unit.id).moves]){
        const cost=tile===unit.tile?0:getRouteDetail(state,unit.id,tile)?.cost;
        if(cost==null)continue;
        const report=recoveryAt(state,{...unit,tile,moves:unit.moves-cost},def,hexDistance);
        const extra=report.canRest?report.restGain-report.gain:0;
        const band=report.rate>0?(extra>0?3:2):extra>0?1:0;
        const list=sites.get(tile)||[];list.push({unit,def,report,extra,band});sites.set(tile,list);
      }
    }
    for(const [id,list] of sites){
      list.sort((a,b)=>b.report.gain+b.extra-a.report.gain-a.extra);
      const summary=zh=>list.map(({unit,def,report,extra})=>{
        const name=zh?translate(def.name,'zh-CN'):def.name;
        return name+' ('+unit.tile+') · '+unit.hp+'/'+unit.maxHp+' HP · '+(zh?'下回合恢复 ':'next turn +')+report.gain+
          (extra?(zh?'，下令休息还可多恢复 ':'; rest order adds ')+extra:'')+(report.place?' · '+(zh?translate(report.place,'zh-CN'):report.place):'');
      }).join(' / ');
      rows.set(id,reading(list[0].band,summary(false),summary(true),list[0].report.gain+list[0].extra));
    }
    return rows;
  }),
  definition('stations','Field station exchanges','野外站点交换','Plan visits to charted posts, archives and lodges. Each civilization may choose one exchange per station.','为已探明的驿站、档案馆和驿舍安排访问。每个文明在每个站点只能选择一次交换。',[
    ['Scout needed','需派侦察兵'],['Scout on site','侦察兵已抵达'],['Exchange available','可立即交换'],['Already visited','已访问']
  ],({state,seat,known})=>{
    const rows=new Map(),scouts=state.units.filter(u=>u.seat===seat && u.type==='scout');
    for(const tile of known){
      const station=FIELD_STATIONS[state.board[tile]?.fieldStation];if(!station)continue;
      const here=scouts.find(u=>u.tile===tile);
      const report=fieldStationReport(state,here||{seat,tile,type:'scout',moves:0,hp:1,maxHp:1});
      if(!report)continue;
      const available=here && state.phase==='playing' && seatMayOrder(state,seat) && report.choices.some(c=>c.enabled);
      const band=report.visited?3:available?2:here?1:0;
      const options=lang=>report.choices.map(c=>translate(c.name,lang)+' ('+translate(c.label,lang)+')').join(' / ');
      const status=[['Bring a scout.','派一名侦察兵前来。'],['Wait for the scout’s next move.','等待侦察兵恢复移动力。'],
        ['Select this scout to make an exchange.','选择此侦察兵即可交换。'],['Your civilization has used this exchange.','己方已在此完成过交换。']][band];
      rows.set(tile,reading(band,station.name+' · '+status[0]+(report.visited?'':' '+options('en')),
        translate(station.name,'zh-CN')+' · '+status[1]+(report.visited?'':options('zh-CN')),[2,3,4,0][band]));
    }
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
  const updateFinder=mountLensFinder(box,locate);
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
    updateFinder(entry,rows,entry?getMap(state):null,selection);
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
