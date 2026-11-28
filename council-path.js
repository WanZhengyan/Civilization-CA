import {getLanguage,translate} from './i18n.js';

const eras=['frontier','industrial','modern'];
const esc=v=>String(v).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
const L=(en,zh)=>getLanguage()==='zh-CN'?zh:en;
const txt=v=>esc(translate(v));
const eraLabel=id=>txt(id[0].toUpperCase()+id.slice(1)+' Era');

export function councilCourse(options,goal,bank) {
  const byId=new Map(options.map(option=>[option.item,option]));
  if(!byId.has(goal))return null;
  const seen=new Set(),steps=[];
  function visit(id) {
    const step=byId.get(id);
    if(!step || seen.has(id))return;
    seen.add(id);
    if(!step.completed)step.requires.forEach(visit);
    steps.push(step);
  }
  visit(goal);
  // A depth-first walk already orders prerequisites before their children;
  // stable era ordering also keeps early foundations together across branches.
  steps.sort((a,b)=>eras.indexOf(a.era)-eras.indexOf(b.era) || (a.tier||0)-(b.tier||0));
  const cost=steps.reduce((sum,step)=>sum+(step.completed?0:step.cost),0);
  return {steps,cost,remaining:Math.max(0,cost-bank)};
}

export function councilStages(options) {
  const sorted=[...options].sort((a,b)=>(a.tier||0)-(b.tier||0) || a.cost-b.cost);
  const stages=new Map();
  for(const option of sorted) {
    if(!stages.has(option.tier))stages.set(option.tier,[]);
    stages.get(option.tier).push(option);
  }
  return [...stages];
}

export function stageHeading(tier) {
  return tier ? '<h4 class="council-stage" translate="no">'+L('Stage '+tier,'第 '+tier+' 阶段')+'</h4>' : '';
}

export function renderCouncilPath(c,goal,canOrder) {
  const path=councilCourse(c.options,goal,c.balance);
  const resource=getLanguage()==='zh-CN' ? (c.action==='research'?'科研点':'文化点') : c.resource;
  const groups=eras.map(era=>{
    const choices=councilStages(c.options.filter(o=>o.era===era)).flatMap(([,items])=>items);
    if(!choices.length)return '';
    return '<optgroup label="'+eraLabel(era)+'">'+choices.map(o=>'<option value="'+esc(o.item)+'"'+(o.item===goal?' selected':'')+'>'+txt(o.label)+'</option>').join('')+'</optgroup>';
  }).join('');
  const label=L('Plan a project','规划项目路线');
  const select='<label class="council-goal-label"><span>'+label+'</span><select data-council-goal><option value="">'+L('Browse the tree','浏览完整树')+'</option>'+groups+'</select></label>';
  if(!path)return '<section class="council-planner" translate="no">'+select+'</section>';
  const byId=new Map(c.options.map(o=>[o.item,o]));
  const list=path.steps.map(o=>{
    const status=o.completed?L('Complete','已完成'):o.active?L('In progress','进行中'):o.locked?L('Locked','未解锁'):L('Available','已解锁');
    const missing=o.requires.filter(id=>!byId.get(id)?.completed).map(id=>txt(byId.get(id)?.label||id));
    const reason=missing.length?L('Needs ','待完成：')+missing.join(L(' + ','、')):'';
    const study=c.action==='research'?L('Research','研究'):L('Debate','议定');
    const action=o.enabled && canOrder ? '<button type="button" data-route-order="'+esc(o.item)+'" aria-label="'+study+' · '+txt(o.label)+'">'+study+'</button>' : '';
    return '<li data-step="'+esc(o.item)+'" data-step-state="'+(o.completed?'complete':o.locked?'locked':'open')+'"><div class="route-step-main"><strong>'+txt(o.label)+'</strong><small>'+eraLabel(o.era)+' · '+status+'</small>'+
      (reason?'<small class="route-needs">'+reason+'</small>':'')+'</div><div class="route-step-price"><b>'+o.cost+' '+resource+'</b>'+action+'</div></li>';
  }).join('');
  const title=txt(byId.get(goal).label);
  const price=L('Additional '+resource+' needed','尚需'+resource);
  return '<section class="council-planner has-goal" translate="no">'+select+
    '<header class="route-overview"><div><small>'+L('Path to','目标')+'</small><h3 tabindex="-1" data-path-title>'+title+'</h3></div><div><small>'+price+'</small><strong>'+path.remaining+'</strong></div></header>'+
    '<div class="route-ledger"><span>'+L('Unfinished project cost','未完成项目总成本')+' <b>'+path.cost+'</b></span><span>'+L('Banked','已积累')+' <b>'+c.balance+'</b></span></div>'+
    (!canOrder?'<p class="route-wait">'+txt(c.options.find(o=>!o.completed && !o.locked && !o.active)?.reason||'Wait for your turn.')+'</p>':'')+
    '<ol class="council-path">'+list+'</ol><button type="button" class="route-back" data-path-back>'+L('Back to tree','返回完整树')+'</button></section>';
}

export function prerequisiteLine(option,byId) {
  if(!option.requires.length)return '';
  const missing=option.requires.filter(id=>!byId.get(id)?.completed);
  const required=option.requires.map(id=>{
    const known=byId.get(id)?.completed;
    return '<span class="required-project'+(known?' known':'')+'">'+(known?'✓ ':'')+txt(byId.get(id)?.label||id)+'</span>';
  }).join(' + ');
  return '<span class="project-prereq" translate="no">'+(missing.length?L('Requires ','前置条件：'):L('Requirements met · ','前置条件已满足 · '))+required+'</span>';
}
