const languageKey = 'civitas.language';
const records = [];
for (const [dataAttribute, attribute] of [['zh', null], ['zhAlt', 'alt'], ['zhLabel', 'aria-label']]) {
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

let initialLanguage = 'en';
try {
  if (localStorage.getItem(languageKey) === 'zh-CN') initialLanguage = 'zh-CN';
} catch { /* The page can still switch language when browser storage is unavailable. */ }
showLanguage(initialLanguage);

for (const button of document.querySelectorAll('[data-language]')) {
  button.addEventListener('click', () => {
    showLanguage(button.dataset.language);
    try { localStorage.setItem(languageKey, button.dataset.language); } catch { /* Session preference only. */ }
  });
}

const selector = document.querySelector('.region-switch');
function showRegion() {
  const selected = selector.querySelector(':checked').value;
  for (const region of document.querySelectorAll('[data-region]')) {
    region.hidden = region.dataset.region !== selected;
  }
}
selector.addEventListener('change', showRegion);
selector.hidden = false;
showRegion();
