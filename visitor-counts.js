// IndexedDB serializes read/write transactions on the same store, including
// two tabs that first visit together. The random ID stays on this origin.
export function browserVisitorId(factory) {
  if (!factory) return Promise.resolve(null);
  return new Promise(resolve => {
    let request;
    try { request = factory.open("civilization-ca.audience", 1); }
    catch { resolve(null); return; }
    request.onupgradeneeded = () => request.result.createObjectStore("settings");
    request.onerror = request.onblocked = () => resolve(null);
    request.onsuccess = () => {
      const db = request.result;
      try {
        const transaction = db.transaction("settings", "readwrite");
        const settings = transaction.objectStore("settings");
        const lookup = settings.get("visitor");
        let id = null;
        lookup.onsuccess = () => {
          id = lookup.result;
          if (!id) {
            id = crypto.randomUUID();
            settings.add(id, "visitor");
          }
        };
        transaction.oncomplete = () => { db.close(); resolve(id); };
        transaction.onabort = transaction.onerror = () => { db.close(); resolve(null); };
      } catch { db.close(); resolve(null); }
    };
  });
}

export async function readVisitorCounts(endpoint, id, fetcher = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const options = {cache:"no-store", credentials:"omit", signal:controller.signal};
    if (id) Object.assign(options, {method:"POST", body:id, headers:{"Content-Type":"text/plain"}});
    const response = await fetcher(endpoint, options);
    if (!response.ok) return null;
    const counts = await response.json();
    if (![counts.total, counts.month, counts.day].every(n => Number.isSafeInteger(n) && n >= 0)) return null;
    if (counts.day > counts.month || counts.month > counts.total) return null;
    return counts;
  } catch { return null; }
  finally { clearTimeout(timer); }
}

const words = {
  en: {
    visitors:"Visitors", total:"Total", month:"This month", day:"Today",
    help:"Unique anonymous browsers since the counter launched. Days and months follow Los Angeles time. Refreshing or opening another tab counts once. A different browser, site address or cleared storage can count again. A dash means the count is unavailable."
  },
  "zh-CN": {
    visitors:"访客", total:"累计", month:"本月", day:"今日",
    help:"从计数功能上线起按匿名浏览器去重，日和月按洛杉矶时间计算。刷新或打开多个标签页只计一次。更换浏览器、访问另一个站点地址或清除浏览器数据后可能重新计数。横线表示暂未取得数据。"
  }
};

function installVisitorCounts(element) {
  const origin = document.querySelector('meta[name="civitas-api-origin"]')?.content.trim() || location.origin;
  const endpoint = new URL("/api/visits", origin).href;
  let identity;
  try { identity = browserVisitorId(window.indexedDB); }
  catch { identity = Promise.resolve(null); }
  let counts = null, pending = false, lastRequest = -Infinity;
  function paint() {
    const locale = document.documentElement.lang === "zh-CN" ? "zh-CN" : "en";
    const copy = words[locale];
    const numbers = new Intl.NumberFormat(locale);
    element.setAttribute("aria-label", copy.visitors);
    element.querySelector("summary").title = copy.help;
    for (const key of ["visitors","total","month","day","help"]) {
      element.querySelector('[data-visit-label="'+key+'"]').textContent = copy[key];
    }
    for (const key of ["total","month","day"]) {
      element.querySelector('[data-visit-count="'+key+'"]').textContent = counts ? numbers.format(counts[key]) : "—";
    }
  }
  async function refresh() {
    if (pending || document.visibilityState === "hidden" || performance.now() - lastRequest < 2000) return;
    pending = true;
    lastRequest = performance.now();
    counts = await readVisitorCounts(endpoint, await identity);
    pending = false;
    paint();
  }
  paint();
  refresh();
  document.addEventListener("civitas-language", paint);
  document.addEventListener("visibilitychange", refresh);
  window.addEventListener("pageshow", refresh);
  window.addEventListener("online", refresh);
  // A visible tab left open past midnight picks up the new California day.
  window.setInterval(refresh, 5 * 60 * 1000);
}

if (typeof document !== "undefined") {
  const element = document.getElementById("visitor-counts");
  if (element) installVisitorCounts(element);
}
