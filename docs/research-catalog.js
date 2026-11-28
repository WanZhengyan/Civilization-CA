import {getLanguage,translate} from './i18n.js';
import {councilGraphRows} from './council-graph.js';

const L=(en,zh)=>getLanguage()==='zh-CN'?zh:en;
const esc=value=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const txt=value=>esc(translate(value));
const eras=['frontier','industrial','modern'];
const eraName=id=>txt(id[0].toUpperCase()+id.slice(1)+' Era');
const points=resource=>resource==='science'?L('science','科研点'):L('culture','文化点');
const eta=turns=>turns===null?L('Awaiting income','等待收入'):turns===0?L('Ready now','立即完成'):L(turns+(turns===1?' turn':' turns'),turns+' 回合');

export function researchLinks(item, options, units, gate='tech') {
  const successors=options.filter(other=>other.requires.includes(item));
  return {
    successors,discoveries:successors.map(other=>other.label),
    formations:Object.values(units).filter(unit=>unit[gate]===item).map(unit=>unit.name)
  };
}

export function projectStatus(option) {
  if(option.completed)return 'complete';
  if(option.active)return 'active';
  return option.locked?'locked':'available';
}

export function matchesCouncilView(option,mode,era) {
  if(era && option.era!==era)return false;
  const status=projectStatus(option);
  if(mode==='available')return status==='available' || status==='active';
  return mode!=='complete' || status==='complete';
}

export function initialCouncilView() {
  return {mode:'all',era:''};
}

function projectDetails(option,catalog,track,options) {
  const gate=track==='research'?'tech':'civic';
  const matches=entries=>Object.values(entries).filter(def=>def[gate]===option.item).map(def=>def.name);
  const links=researchLinks(option.item,options,catalog.units,gate);
  const lines=[
    [L('Buildings','建筑'),matches(catalog.buildings)],
    [L('Universities','大学奇观'),matches(catalog.universities)],
    [L('Units','单位'),links.formations],
    [L('Policies','施政方针'),matches(catalog.policies)],
    [L('City projects','城市项目'),matches(catalog.projects)]
  ];
  const unlocks=lines.filter(([,names])=>names.length).map(([label,names])=>
    '<div><dt>'+label+'</dt><dd>'+names.map(txt).join(L(', ','、'))+'</dd></div>').join('');
  const successors=links.successors;
  const next=successors.length?'<div class="project-next"><dt>'+L('Leads to','后续项目')+'</dt><dd>'+successors.map(next=>
    '<button type="button" data-plan-item="'+esc(next.item)+'">'+txt(next.label)+'</button>').join('')+'</dd></div>':'';
  return unlocks||next?'<dl class="project-links">'+unlocks+next+'</dl>':'';
}

// Project portraits reuse the campaign's illustrated buildings, units and terrain.
const portraits = {
  agronomy:'grain',industry:'workshop',tactics:'melee',civics:'shop',navigation:'cutter',
  mechanics:'foundry',steam:'shipyard',ballistics:'artillery',metallurgy:'iron',electricity:'academy',
  radio:'signals',cartography:'cabrilloTidePools',railways:'lumberCamp',motorization:'armor',
  agriculturalScience:'farm',hydrography:'workboat',fieldMedicine:'riflemen',radar:'destroyer',rocketry:'orbitalSurvey',
  publicWorks:'neighborhood',irrigationDistricts:'orchard',charter:'civic-delegates',mutualAid:'pikes',
  landRegistry:'shop',federation:'monument',harborCommission:'harbor',normalSchools:'ucla',
  housingTrust:'neighborhood',publicLibraries:'printingHouse',publicRadio:'signals',conservation:'topanga',
  exposition:'berkeley',mobilization:'cavalry',regionalPlanning:'stanford'
};

function prerequisiteLinks(option, byId) {
  if (!option.requires.length) return '';
  const met=option.requires.every(id=>byId.get(id)?.completed);
  const buttons=option.requires.map(id=>{
    const parent=byId.get(id);
    return '<button type="button" data-tree-jump="'+esc(id)+'">'+(parent?.completed?'✓ ':'')+txt(parent?.label||id)+'</button>';
  }).join('<span aria-hidden="true"> + </span>');
  return '<div class="tree-prereqs"><strong>'+(met?L('Requirements met','前置条件已满足'):L('Requires','前置条件'))+'</strong> '+buttons+'</div>';
}

function projectCard(option,c,byId,catalog,canOrder,lane,selected,index) {
  const state=projectStatus(option);
  const status={complete:L('Completed','已完成'),active:L('In progress','进行中'),locked:L('Locked','未解锁'),available:L('Available','可选择')}[state];
  const name=txt(option.label), id=esc(option.item), region='tree-detail-'+id;
  const isOpen=state==='active'||state==='available';
  const quote=option.cost+' '+points(c.resource);
  const timing=isOpen?' · '+eta(option.turns):'';
  const remaining=isOpen && option.remaining>0 && option.remaining<option.cost
    ?'<small>'+L(option.remaining+' more needed','还差 '+option.remaining+' 点')+'</small>':'';
  const art=portraits[option.item];
  const plate=art?'<img class="tree-portrait" src="./art/'+art+'.webp" alt="" decoding="async" width="44" height="44">':'';
  let action='';
  if(state==='locked') {
    action='<button type="button" class="project-action" data-plan-item="'+id+'" aria-label="'+L('View prerequisites for ','查看前置路线 · ')+name+'">'+L('View prerequisites','查看前置路线')+'</button>';
  } else if(state==='available') {
    const verb=c.action==='research'?L('Research','研究'):L('Debate','议定');
    action='<button type="button" class="project-action" data-project="'+id+'" aria-label="'+verb+' · '+name+'"'+(canOrder && option.enabled?'':' disabled')+'>'+verb+'</button>';
  }
  return '<article class="tree-project" data-status="'+state+'" data-card="'+id+'" style="--tree-lane:'+(lane+1)+';--tree-pair:'+(1+2*Math.floor(index/2))+'">'+
    '<button type="button" class="tree-node" data-tree-inspect="'+id+'" aria-controls="'+region+'" aria-expanded="'+selected+'">'+
    plate+'<span class="tree-node-text"><span class="tree-node-name">'+name+'</span><span class="tree-price">'+quote+timing+'</span></span>'+
    '<span class="project-status"><i aria-hidden="true"></i>'+status+'</span></button>'+
    '<section class="tree-detail" id="'+region+'" aria-label="'+name+'"'+(selected?'':' hidden')+'>'+
    '<header><h4>'+name+'</h4><button type="button" data-tree-close="'+id+'" aria-label="'+L('Close project details','关闭项目详情')+'">×</button></header>'+
    '<p class="project-description">'+txt(option.description)+'</p>'+prerequisiteLinks(option,byId)+
    projectDetails(option,catalog,c.action,c.options)+
    '<footer class="project-meta"><span>'+quote+timing+remaining+'</span>'+action+'</footer></section></article>';
}

export function councilOverview(c,canOrder) {
  const unit=points(c.resource);
  const value=(name,amount)=>'<div><dt>'+name+'</dt><dd>'+amount+'</dd></div>';
  const active=c.active;
  const title=active?txt(active.label):c.completed===c.options.length?L('All projects completed','项目已全部完成'):L('Choose a project','选择一个项目');
  const note=active?'<div class="council-progress"><progress value="'+Math.min(c.balance,active.cost)+'" max="'+active.cost+'" aria-label="'+title+'"></progress><span>'+Math.min(c.balance,active.cost)+' / '+active.cost+' · '+eta(active.turns)+'</span></div>':'';
  const hint=!canOrder?txt(c.options.find(o=>!o.locked && !o.completed && !o.active)?.reason||'Wait for your turn.'):active?L('Switch projects at any time. Banked points carry over.','可以更换项目，已积累的点数会保留。'):'';
  return '<section class="council-overview" translate="no"><div><span class="council-section-label">'+L('Current project','当前项目')+'</span><h3>'+title+'</h3>'+note+'</div>'+
    '<dl class="council-figures">'+value(L('Banked ','已积累')+unit,c.balance)+value(L('Per turn','每回合'),'+'+c.rate)+value(L('Completed','已完成'),c.completed+' / '+c.options.length)+'</dl>'+
    (hint?'<p>'+hint+'</p>':'')+'</section>';
}

export function renderCouncilBrowser(c,prefs,catalog,canOrder) {
  const byId=new Map(c.options.map(option=>[option.item,option]));
  const modes=[['all',L('Full tree','完整树')],['available',L('Available','可选择')],['complete',L('Completed','已完成')]];
  const views=modes.map(([mode,label])=>'<button type="button" data-council-mode="'+mode+'" aria-pressed="'+(prefs.mode===mode)+'">'+label+'</button>').join('');
  const availableEras=eras.filter(era=>c.options.some(option=>option.era===era));
  const select='<label class="council-era">'+L('Era','时代')+' <select data-council-era><option value="">'+L('All eras','全部时代')+'</option>'+
    availableEras.map(era=>'<option value="'+era+'"'+(prefs.era===era?' selected':'')+'>'+eraName(era)+'</option>').join('')+'</select></label>';
  const visible=c.options.filter(option=>matchesCouncilView(option,prefs.mode,prefs.era));
  const included=new Set(visible.map(option=>option.item));
  const selected=included.has(prefs.selected)?prefs.selected:null;
  const {rows,width}=councilGraphRows(c.options,availableEras);
  const route=new Set();
  function trace(id) {
    if(route.has(id))return;
    route.add(id);
    for(const parent of byId.get(id)?.requires||[])trace(parent);
  }
  if(selected)trace(selected);
  const connections=visible.flatMap(option=>option.requires.filter(id=>included.has(id)).map(parent=>
    '<path data-from="'+esc(parent)+'" data-to="'+esc(option.item)+'" data-known="'+Boolean(byId.get(parent)?.completed)+'" data-traced="'+(route.has(option.item)||parent===selected)+'"/>'
  )).join('');
  const sections=availableEras.map(era=>{
    const eraRows=rows.filter(row=>row.era===era).map(row=>{
      const nodes=row.nodes.filter(({option})=>included.has(option.item));
      if(!nodes.length)return '';
      return '<div class="tree-row">'+nodes.map(({option,lane},index)=>projectCard(option,c,byId,catalog,canOrder,lane,option.item===selected,index)).join('')+'</div>';
    }).join('');
    return eraRows?'<section class="tree-era" data-era="'+era+'"><h3><span>'+eraName(era)+'</span></h3>'+eraRows+'</section>':'';
  }).join('');
  const count=L(visible.length+(visible.length===1?' project':' projects'),visible.length+' 个项目');
  const empty='<div class="council-empty"><p>'+L('No projects in this view.','此视图下没有项目。')+'</p><button type="button" data-council-reset>'+L('Show the full tree','查看完整树')+'</button></div>';
  const hint=L('Follow the lines down. Select a project to see its requirements and unlocks.','沿连线向下查看。选择项目可查看前置条件和解锁内容。');
  const graph='<div class="council-tree" data-council-graph data-selection="'+Boolean(selected)+'" style="--tree-columns:'+width+'">'+
    '<svg class="tree-wires" aria-hidden="true" focusable="false">'+connections+'</svg>'+sections+'</div>';
  return '<section class="council-browser" translate="no"><div class="council-filterbar"><div role="group" aria-label="'+L('Project view','项目视图')+'">'+views+'</div>'+select+'</div>'+
    '<div class="tree-key"><span>'+hint+'</span><span class="council-results" role="status">'+count+'</span></div>'+(sections?graph:empty)+'</section>';
}

// Native Tab and Enter continue to work. Arrow keys also cycle each horizontal switch.
export function navigateCouncilButtons(event,buttons) {
  const index=buttons.indexOf(event.target);
  if(index<0 || event.altKey || event.ctrlKey || event.metaKey)return;
  let target;
  switch(event.key){
    case 'Home': target=buttons[0];break;
    case 'End': target=buttons.at(-1);break;
    case 'ArrowLeft': target=buttons[(index+buttons.length-1)%buttons.length];break;
    case 'ArrowRight': target=buttons[(index+1)%buttons.length];break;
    default: return;
  }
  event.preventDefault();
  target.focus();
  target.click();
}
