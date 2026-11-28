import {fieldReport,studies,corridorIncome} from './field-expeditions.js';
import {NATURAL_WONDERS} from './natural-wonders.js';
import {getLanguage,translate} from './i18n.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lang=()=>getLanguage()==='zh-CN'?1:0;
const local=(en,zh)=>lang()?zh:en;
const label=(value)=>esc(value[lang()]);
const currencies={food:['city food','交付城市的粮食'],capital:['gold','金币'],science:['science','科研'],culture:['culture','文化'],influence:['influence','影响力']};
const rewardText=reward=>Object.entries(reward).map(([key,n])=>'+'+n+' '+label(currencies[key])).join(' · ');
const button=(cmd,text,enabled)=>'<button type="button" class="btn" data-do="'+cmd+'"'+(enabled?'':' disabled')+'>'+text+'</button>';

export function openFieldDesk(read,act) {
  const dialog=document.createElement('dialog');dialog.className='order-dialog field-desk';dialog.setAttribute('aria-labelledby','field-desk-title');
  dialog.innerHTML='<div class="modal-shell"><header class="modal-head"><h2 class="modal-title" id="field-desk-title">'+local('Field expeditions','野外考察')+'</h2><button type="button" data-close class="modal-close" aria-label="'+local('Close','关闭')+'">×</button></header><div class="modal-body"></div></div>';
  let selected;
  const body=dialog.querySelector('.modal-body');
  function paint(){
    const ctx=read();
    if(!ctx){dialog.close();return;}
    const {state,unit,map,distance,mayOrder}=ctx;
    const r=fieldReport(state,unit,map,distance);
    if(!r){dialog.close();return;}
    const active=r.mission, options=r.open;
    const key=active?.key || options.find(([id])=>id===selected)?.[0] || options[0]?.[0];
    const spec=studies[key];
    const ready=mayOrder && unit.moves>0;
    let html='';
    if(!active && options.length)html+='<label>'+local('Choose a study','选择课题')+' <select data-study>'+options.map(([id,s])=>'<option value="'+id+'"'+(id===key?' selected':'')+'>'+label(s.name)+'</option>').join('')+'</select></label>';
    if(spec){
      html+='<h3>'+label(spec.name)+'</h3><p>'+local('Commission','委托费')+' '+spec.fee+' '+local('gold','金币')+' · '+local('On filing','交付后获得')+' '+rewardText(spec.reward)+'</p>';
      if(spec.benefit)html+='<p>'+label(spec.benefit)+'</p>';
      html+='<ol>'+spec.steps.map((step,i)=>'<li>'+((active?.notes.length||0)>i?'✓ ':'')+label(step)+(active?.notes[i]?' <small>('+esc(active.notes[i].tile)+' · '+local('Turn ','回合 ')+active.notes[i].round+')</small>':'')+'</li>').join('')+'</ol>';
      const photographed=active?.notes[0]?.wonder;
      if(photographed)html+='<p>'+local('Subject','记录对象')+' · '+esc(translate(NATURAL_WONDERS[photographed].name))+' ('+esc(active.notes[0].wonderTile)+')</p>';
      html+='<p>'+local('Commission at a field camp or within one hex of your city. File at a city. Study orders cost one movement.','可在营地或己方城市一格内领取课题，在城市一格内交付。课题指令消耗 1 移动力。')+'</p>';
      if(!active)html+=button('start',local('Commission study','委托考察'),ready && r.office && r.player.capital>=spec.fee);
      else if(r.complete){
        html+=button('file',local('File the report','交付报告')+' · '+rewardText(spec.reward),ready && r.base);
        if(!r.base && !spec.reward.food){
          html+='<p>'+local('A Field archive can send a written report to its sponsoring city for 2 influence. Carry food and ore home in person.','在田野档案馆花 2 影响力可将书面报告寄回委托城市。粮食和矿物须由侦察兵自行带回。')+'</p>';
          if(r.archive)html+=button('mail',local('Send by archive courier','委托档案馆递送'),ready && r.canMail);
        }
        if(key==='assay'){
          const ore=active.notes[0].resource==='iron'?local('iron','铁'):local('stone','石料');
          html+=button('deliverOre',local('Supply the treasury instead','改为向国库供应物资')+' · +2 '+ore,ready && r.base);
        }
      }
      else html+=button('sample',local('Record observation','记录观察'),ready && r.canSample);
    }
    html+='<details><summary>'+local('Field camp','野外营地')+'</summary><p>'+local('Spend 7 gold and all remaining movement to establish your field office here. It replaces your previous camp. Choose neutral or friendly ground at least two hexes from your cities.','花费 7 金币和全部剩余移动力，就地设立营地以领取课题。新营地取代旧营地，须位于距己方城市至少两格的中立或己方领土。')+'</p>';
    if(r.player.fieldCamp)html+='<p>'+local('Current camp','现有营地')+' · '+esc(r.player.fieldCamp.tile)+'</p>';
    html+=button('camp',local('Pitch camp here','在此扎营'),ready && r.canCamp)+'</details>';
    if(Object.keys(r.filed).length)html+='<h3>'+local('Filed reports','已交付报告')+'</h3><ul>'+Object.entries(r.filed).map(([id,f])=>'<li>'+label(studies[id].name)+' · '+local('Turn ','回合 ')+f.filed+'</li>').join('')+'</ul>';
    if(r.filed.corridor)html+='<p>'+local('Habitat dividend this harvest','本次收获的栖息地收益')+' · '+corridorIncome(state,unit.seat)+' '+local('culture','文化')+'</p>';
    body.innerHTML=html;
    body.querySelector('select[data-study]')?.addEventListener('change',e=>{selected=e.target.value;paint();});
    body.querySelectorAll('[data-do]').forEach(b=>b.onclick=()=>{
      dialog.close();
      act({type:'fieldStudy',unit:unit.id,item:b.dataset.do,study:key,step:active?.notes.length||0});
    });
  }
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  document.body.append(dialog);paint();if(dialog.isConnected)dialog.showModal();
}
