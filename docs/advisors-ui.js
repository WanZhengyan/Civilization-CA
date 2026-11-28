import {getLanguage} from './i18n.js';
import {advisorReport} from './advisors.js';

const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountAdvisors(getView,review){
  const dialog=document.createElement('dialog');
  dialog.className='order-dialog advisor-council';
  dialog.setAttribute('aria-labelledby','advisor-heading');
  dialog.setAttribute('translate','no');
  document.body.append(dialog);
  let cards=[],last='',source,locale;
  function paint(){
    if(!dialog.open)return;
    const view=getView();
    if(!view || view.state.phase!=='playing'){dialog.close();return;}
    const lang=getLanguage(),L=(en,zh)=>lang==='zh-CN'?zh:en;
    if(source!==view.state || locale!==lang){
      cards=advisorReport(view.state,view.seat,lang);
      source=view.state;locale=lang;
    }
    const html='<div class="modal-shell"><header class="modal-head"><div><p class="modal-kicker">'+L('Campaign council','战役议会')+'</p><h2 class="modal-title" id="advisor-heading">'+L('Advisors','顾问团')+'</h2></div>'+
      '<button type="button" class="modal-close" data-dismiss aria-label="'+L('Close','关闭')+'">×</button></header><div class="modal-body">'+
      (cards.length?'<ol>'+cards.map((card,index)=>'<li><h3>'+esc(card.title)+'</h3><p>'+esc(card.detail)+'</p><button type="button" data-brief="'+index+'">'+L('Review','查看方案')+'</button></li>').join('')+'</ol>':'<p>'+L('No decisions flagged on your current chart.','当前已探索地图上暂无顾问建议。')+'</p>')+'</div></div>';
    if(html===last)return;
    const focused=dialog.querySelector(':focus')?.dataset.brief;
    const scroll=dialog.querySelector('.modal-body')?.scrollTop||0;
    dialog.innerHTML=html;last=html;
    dialog.querySelector('.modal-body').scrollTop=scroll;
    if(focused!=null)dialog.querySelector('[data-brief="'+focused+'"]')?.focus({preventScroll:true});
  }
  dialog.onclick=event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.hasAttribute('data-dismiss')){dialog.close();return;}
    if(button.dataset.brief!=null){
      const card=cards[Number(button.dataset.brief)];if(card){dialog.close();review(card.link);}
    }
  };
  document.addEventListener('civitas-advisors',()=>{if(!dialog.open){dialog.showModal();paint();dialog.querySelector('[data-dismiss]')?.focus();}});
  return paint;
}
