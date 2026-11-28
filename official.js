const languageKey = 'civitas.language';
const records = [];
for (const [dataAttribute, attribute] of [['zh', null], ['zhAlt', 'alt'], ['zhLabel', 'aria-label'], ['zhSrc', 'src'], ['zhHref', 'href']]) {
  const selector = '[data-' + dataAttribute.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase()) + ']';
  for (const node of document.querySelectorAll(selector)) {
    records.push({ node, attribute, en: attribute ? node.getAttribute(attribute) : node.textContent, zh: node.dataset[dataAttribute] });
  }
}

function showLanguage(language) {
  const isChinese = language === 'zh-CN';
  document.documentElement.lang = language;
  for (const entry of records) {
    const value = isChinese ? entry.zh : entry.en;
    if (entry.attribute) entry.node.setAttribute(entry.attribute, value);
    else entry.node.textContent = value;
  }
  for (const button of document.querySelectorAll('[data-language]')) {
    button.setAttribute('aria-pressed', String(button.dataset.language === language));
  }
  document.dispatchEvent(new Event('civitas-language'));
}

function restoreLanguage() {
  try {
    showLanguage(localStorage.getItem(languageKey) === 'zh-CN' ? 'zh-CN' : 'en');
  } catch {
    showLanguage(document.documentElement.lang === 'zh-CN' ? 'zh-CN' : 'en');
  }
}
restoreLanguage();

function refreshReturnLinks() {
  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch { return null; }
  }
  const solo = read('angel-basin.solo.v1');
  const hasCampaign = Array.isArray(solo?.players) && solo.board && Array.isArray(solo.log) &&
    ['playing', 'finished'].includes(solo.phase);
  const code = read('angel-basin.active-room.v1');
  const seats = read('angel-basin.room-seats.v1');
  const hasRoom = typeof code === 'string' && /^[A-Z0-9]{6}$/.test(code) && Boolean(seats?.[code]);
  document.querySelector('#continue-campaign').hidden = !hasCampaign;
  const rejoin = document.querySelector('#rejoin-room');
  if (hasRoom) rejoin.href = './game.html?room=' + code;
  else rejoin.removeAttribute('href');
  rejoin.hidden = !hasRoom;
  document.querySelector('.return-actions').hidden = !hasCampaign && !hasRoom;
}
refreshReturnLinks();
window.addEventListener('pageshow', event => {
  if (event.persisted) {
    restoreLanguage();
    refreshReturnLinks();
  }
});
window.addEventListener('storage', event => {
  if (!event.key || event.key === languageKey) restoreLanguage();
  if (!event.key || ['angel-basin.solo.v1', 'angel-basin.active-room.v1', 'angel-basin.room-seats.v1'].includes(event.key)) refreshReturnLinks();
});

for (const button of document.querySelectorAll('[data-language]')) {
  button.addEventListener('click', () => {
    showLanguage(button.dataset.language);
    try { localStorage.setItem(languageKey, button.dataset.language); } catch { /* Session preference only. */ }
  });
}

function connectPicker(fieldset, panels) {
  function showSelected() {
    const {name, value} = fieldset.querySelector(':checked');
    for (const panel of panels) panel.hidden = panel.dataset[name] !== value;
  }
  fieldset.addEventListener('change', showSelected);
  showSelected();
  fieldset.hidden = false;
}
connectPicker(document.querySelector('.region-switch'), document.querySelectorAll('[data-region]'));
connectPicker(document.querySelector('.screen-switch'), document.querySelectorAll('[data-screen]'));
