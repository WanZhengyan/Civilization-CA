import {translate} from './i18n.js';

function plainText(markup, lang) {
  // Guide entries may emphasize a rule or its price using inline tags. Translate
  // each text node just as the visible guide does before combining the pieces.
  return String(markup).split(/<[^>]+>/).map(part=>translate(part.trim(),lang)).filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
}

export function buildGuideIndex(chapters, readTopics) {
  return Object.entries(chapters).flatMap(([chapter,{label}])=>{
    const english=readTopics(chapter,'en'), chinese=readTopics(chapter,'zh-CN');
    return english.map(({title,body,key},i)=>{
      const fields=(topic,lang)=>({
        title:plainText(topic.title,lang), body:plainText(topic.body,lang), chapter:translate(label,lang)
      });
      return {chapter,key,en:fields({title,body},'en'), 'zh-CN':fields(chinese[i],'zh-CN')};
    });
  });
}

const normalize=value=>value.normalize('NFKC').toLowerCase().trim();

export function searchGuide(index, query, lang) {
  const words=normalize(query).split(/\s+/).filter(Boolean);
  if(!words.length)return [];
  return index.map(topic=>{
    let score=0;
    for(const word of words){
      let best=0;
      for(const locale of ['en','zh-CN']){
        const field=topic[locale],title=normalize(field.title),chapter=normalize(field.chapter);
        if(title===word)best=Math.max(best,12);
        else if(title.includes(word))best=Math.max(best,8);
        if(chapter.includes(word))best=Math.max(best,4);
        if(normalize(field.body).includes(word))best=Math.max(best,1);
      }
      if(!best)return null;
      score+=best;
    }
    const display=topic[lang], body=display.body;
    const match=words.map(word=>normalize(body).indexOf(word)).find(index=>index>=0) ?? 0;
    const start=match>64?Math.max(0,match-25):0;
    const limit=lang==='zh-CN'?70:125;
    const snippet=(start?'…':'')+body.slice(start,start+limit).trim()+(start+limit<body.length?'…':'');
    return {chapter:topic.chapter,key:topic.key,chapterName:display.chapter,title:display.title,snippet,score};
  }).filter(Boolean).sort((a,b)=>b.score-a.score);
}

export function guideSearchBox(lang){
  const zh=lang==='zh-CN', label=zh?'搜索指南':'Search the field guide';
  const hint=zh?'如：影响力、生产、移动':'Try influence, production or movement';
  return '<div class="guide-search" role="search"><label for="guide-query">'+label+'</label><div>'+
    '<input id="guide-query" type="search" maxlength="100" autocomplete="off" aria-controls="guide-results" placeholder="'+hint+'">'+
    '<button type="button" data-clear-search hidden>'+(zh?'清除':'Clear')+'</button></div></div>'+
    '<p class="guide-result-count" role="status" aria-live="polite"></p><div id="guide-results" hidden></div>';
}

export function bindGuideSearch(root, lang, buildIndex, showTopic, escapeHTML){
  const field=root.querySelector('#guide-query'), results=root.querySelector('#guide-results');
  const chapter=root.querySelector('[data-guide-chapter]'), clear=root.querySelector('[data-clear-search]');
  const count=root.querySelector('.guide-result-count');
  let topics, matches=[];
  function update(){
    const hasQuery=Boolean(field.value.trim());
    chapter.hidden=hasQuery;clear.hidden=!hasQuery;results.hidden=!hasQuery;
    if(!hasQuery){count.textContent='';results.replaceChildren();return;}
    topics ??= buildIndex();
    matches=searchGuide(topics,field.value,lang);
    count.textContent=lang==='zh-CN' ? (matches.length?'找到 '+matches.length+' 条结果':'没有找到相关条目，请换个关键词。') :
      (matches.length?matches.length+' '+(matches.length===1?'result':'results'):'No matching topics. Try a different word.');
    results.innerHTML=matches.map((result,i)=>'<button type="button" class="guide-match" data-match="'+i+'"><small>'+
      escapeHTML(result.chapterName)+'</small><strong>'+escapeHTML(result.title)+'</strong><span>'+escapeHTML(result.snippet)+'</span></button>').join('');
  }
  field.addEventListener('input',update);
  clear.onclick=()=>{field.value='';update();field.focus();};
  results.onclick=event=>{
    const item=event.target.closest('[data-match]');
    if(item)showTopic(matches[Number(item.dataset.match)]);
  };
  field.addEventListener('keydown',event=>{
    if(event.isComposing || event.keyCode===229)return;
    if(event.key==='Escape' && field.value){
      event.preventDefault();event.stopPropagation();clear.click();
    }else if(['ArrowDown','Enter'].includes(event.key) && !results.hidden && matches.length){
      event.preventDefault();
      if(event.key==='Enter')showTopic(matches[0]);
      else results.querySelector('button')?.focus();
    }
  });
}
