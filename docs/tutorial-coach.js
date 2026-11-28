// The practice campaign uses the regular councils, city queues and unit orders.
const stages = ['found','research','civic','produce','influence','turn','explore'];
const copy = {
  found: [
    ['Found your capital','建立首都'],
    ['Your settler can found a city on its starting tile. A city earns science and culture each turn and can start training a scout.','开拓者可以在起始地块建都。首都会在每回合获得科研点和文化，也能训练侦察兵。'],
    ['Find my settler','定位开拓者']
  ],
  restFounder: [
    ['Restore your settler’s movement','等开拓者恢复移动力'],
    ['Founding takes movement. Resolve the turn button and end the turn. Then select your settler and found on an eligible tile.','建城需要剩余移动力。先处理右下角的待办并结束回合，下一回合再选开拓者，在可以建城的地块建立首都。'],
    ['Find the turn button','定位回合按钮']
  ],
  research: [
    ['Choose your first technology','选第一项科技'],
    ['Agronomy adds food so your city can grow sooner. Workshop Engineering adds production so it can finish its next project sooner. Pick either, or try another technology.','农学能增加粮食，让城市更快增长。工坊工程能提高生产力，缩短项目工期。选其中一项，或试试其他科技。'],
    ['Open technology tree','打开科技树']
  ],
  civic: [
    ['Set a civic goal','选一项市政'],
    ['Your city earns culture alongside science. Municipal Charter adds culture each turn and unlocks Public Lectures. Choose a civic to put that culture to work.','城市在产出科研点的同时也会获得文化。市政宪章能提高每回合文化收入，并解锁「公众讲堂」政策。选一项市政，开始积累进度。'],
    ['Open civics tree','打开市政树']
  ],
  produce: [
    ['Give the city a project','安排城市生产'],
    ['A scout can uncover land while your city builds its next project. Choose Scout, then confirm production. Any available project works here.','侦察兵可以在城市生产下一个项目时探索地图。选「侦察兵」，再确认生产。你也可以选择其他项目。'],
    ['Open city production','打开城市生产']
  ],
  influence: [
    ['Expand now or save influence','提前扩地，还是保留影响力？'],
    ['Compare the next parcel with its natural growth timer. Paying 6 influence claims it now. Waiting keeps your balance and leaves the city to expand on its own.','看看下一格土地在哪里，以及自然扩张还要几回合。花 6 点影响力可以立即取得它，也可以保留余额，等城市自然扩张。'],
    ['Review the parcel','查看扩地选项']
  ],
  turn: [
    ['Collect your first harvest','结算第一个回合'],
    ['The lower-right button shows what still needs a choice. When it reads End turn, press it to collect income and add production to the city project.','右下角按钮会显示还需要处理的事。等它显示「结束回合」时点击，城市就会结算收入，并给生产项目增加进度。'],
    ['Find the turn button','定位回合按钮']
  ],
  explore: [
    ['Explore with a unit','用单位探索地图'],
    ['Select a highlighted hex near the fog to reveal more of the map. To stay here, choose Skip this turn. The unit keeps its remaining movement.','选择靠近迷雾的高亮地块可以扩大视野。如果想留在原地，点「跳过本回合」，剩余移动力仍会保留。'],
    ['Find my unit','定位单位']
  ],
  wait: [
    ['Bring a unit into the field','让单位出城'],
    ['Your city works on its project each time you end a turn. Follow the lower-right prompt until your unit is ready. You can also finish the lesson here and keep building.','每结束一回合，城市就会推进生产。按右下角的提示继续，等单位就绪。也可以在这里结束教学，继续建设城市。'],
    ['Find the turn button','定位回合按钮']
  ],
  restart: [
    ['Make another landing','重新开始练习'],
    ['Your settler is gone. Restart this practice campaign to try founding a city again.','你的开拓者已经失去。可以重新开始这场练习，再试一次建城。'],
    ['Review restart','重新开始练习']
  ],
  complete: [
    ['You have played your opening','开局教学已完成'],
    ['Your capital can now grow, research and produce. Keep exploring this practice map, or choose another campaign when you are ready.','你已经安排好首都的增长、研究和生产。可以留在这张练习地图上继续探索，也可以开始另一场战役。'],
    ['Keep playing','继续游玩']
  ]
};

export function tutorialLesson(view) {
  if (!view?.tutorial || !view.state || view.tutorialProgress?.completed) return null;
  const {state,seat}=view, progress=view.tutorialProgress || {};
  const city=state.cities.find(c=>c.seat===seat);
  const units=state.units.filter(u=>u.seat===seat);
  const mobile=units.filter(u=>u.hp>0 && u.moves>0 && !u.fortified && u.skippedRound!==state.round);
  const fieldUnit=mobile.find(u=>u.type==='scout') || mobile[0];
  const player=state.players[seat];
  const done=[
    progress.founded || city,
    progress.choseResearch || player.research || player.technologies?.length,
    progress.choseCivic || player.civic || player.civics?.length,
    progress.choseProduction || city?.queue,
    progress.expanded || progress.seenInfluence,
    progress.endedTurn,
    progress.mobileUnitOrder || progress.movedScout || progress.skippedScout
  ];
  const index=state.phase==='finished'?-1:done.findIndex(done=>!done);
  let step=index<0?'complete':stages[index];
  const settler=units.find(u=>u.type==='settler');
  if (step==='found' && !settler) step='restart';
  else if (step==='found' && !settler.moves) step='restFounder';
  if (step==='explore' && !fieldUnit) step='wait';
  return {step, index:index<0?stages.length:index+1, total:stages.length, city,
    unit:step==='found'?settler:fieldUnit};
}

export function mountTutorialCoach({getView,getLanguage,locate,saveProgress}) {
  const card=document.createElement('section');
  card.id='tutorial-coach';
  card.hidden=true;
  card.setAttribute('translate','no');
  card.setAttribute('aria-labelledby','tutorial-caption');
  card.innerHTML='<div class="tutor-line"><span id="tutorial-caption"></span><span class="tutor-count"></span><button type="button" data-tutor-toggle aria-controls="tutorial-body"></button></div>'+
    '<div id="tutorial-body"><progress></progress><h2 aria-live="polite" aria-atomic="true"></h2><p></p><div class="tutor-actions"><button type="button" data-tutor-go></button><button type="button" data-tutor-alt></button></div></div>';
  document.querySelector('.map-workspace').append(card);
  const field=selector=>card.querySelector(selector);
  const toggle=field('[data-tutor-toggle]'), go=field('[data-tutor-go]'), alt=field('[data-tutor-alt]');
  const write=(el,value)=>{if(el.textContent!==value)el.textContent=value;};
  let target=null;
  function clearTarget(){
    if(target)target.classList.remove('tutorial-target');
    target=null;
  }
  function highlight(node){
    clearTarget();
    if(node && !node.disabled){target=node;node.classList.add('tutorial-target');}
  }
  function paint(){
    const view=getView(), lesson=tutorialLesson(view);
    const active=Boolean(lesson) && !document.body.classList.contains('on-title');
    card.hidden=!active;
    if(!active){clearTarget();return;}
    const zh=getLanguage()==='zh-CN'?1:0;
    const language=(en,cn)=>zh?cn:en;
    const collapsed=Boolean(view.tutorialProgress?.collapsed);
    write(field('#tutorial-caption'),language('First campaign','新手战役'));
    write(field('.tutor-count'),lesson.index+' / '+lesson.total);
    write(toggle,collapsed?language('Show tips','展开提示'):language('Hide tips','收起提示'));
    toggle.setAttribute('aria-expanded',String(!collapsed));
    field('#tutorial-body').hidden=collapsed;
    if (collapsed){clearTarget();return;}
    const [title,detail,action]=copy[lesson.step];
    field('progress').max=lesson.total;
    field('progress').value=lesson.step==='complete'?lesson.total:lesson.index-1;
    field('progress').setAttribute('aria-label',language('Tutorial progress','教学进度'));
    write(field('h2'),title[zh]);write(field('p'),detail[zh]);write(go,action[zh]);
    alt.hidden=lesson.step!=='influence' && lesson.step!=='wait';
    if(!alt.hidden)write(alt,lesson.step==='influence'?language('Save my influence','暂时保留影响力'):language('Finish lesson','结束教学'));
    highlight(document.querySelector(({
      found:'[data-order="found"]:not(:disabled)',research:'#research-card',civic:'#civics-card',
      produce:'[data-order="choose-production"]:not(:disabled)',influence:'#influence-open',
      turn:'#end-turn',wait:'#end-turn',restFounder:'#end-turn',explore:'[data-order="move"]:not(:disabled)'
    })[lesson.step] || '#tutorial-coach [data-tutor-go]'));
  }
  toggle.onclick=()=>saveProgress({collapsed:toggle.getAttribute('aria-expanded')==='true'});
  go.onclick=()=>{
    const lesson=tutorialLesson(getView());
    if(!lesson)return;
    if(lesson.step==='complete'){saveProgress({completed:true});document.getElementById('end-turn')?.focus({preventScroll:true});return;}
    locate(lesson);
  };
  alt.onclick=()=>{
    const lesson=tutorialLesson(getView());
    if(lesson?.step==='influence'){saveProgress({seenInfluence:true});go.focus({preventScroll:true});}
    if(lesson?.step==='wait'){
      saveProgress({completed:true});
      document.getElementById('end-turn')?.focus({preventScroll:true});
    }
  };
  document.addEventListener('civitas-language',paint);
  document.addEventListener('civitas-screen',paint);
  return {paint};
}
