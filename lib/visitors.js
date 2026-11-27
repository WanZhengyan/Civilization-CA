// Only the hash of a browser-generated random ID and its most recent local
// calendar date are retained. The game never needs a per-page activity log.
const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit"
});

export function calendarDay(instant) {
  const parts = Object.fromEntries(formatter.formatToParts(instant).map(part => [part.type, part.value]));
  return parts.year + "-" + parts.month + "-" + parts.day;
}

const visitorFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function isVisitorId(value) {
  return typeof value === "string" && visitorFormat.test(value);
}

export async function visitCounts(database, visitorId, instant = new Date()) {
  const db = database.withSession?.("first-primary") ?? database;
  const day = calendarDay(instant);
  const totals = db.prepare(`SELECT
    (SELECT count(*) FROM site_visitors) AS total,
    (SELECT count(*) FROM site_visitors WHERE last_day BETWEEN ? AND ?) AS month,
    (SELECT count(*) FROM site_visitors WHERE last_day = ?) AS day`)
    .bind(day.slice(0, 7) + "-01", day, day);
  if (visitorId === null) return totals.first();
  if (!isVisitorId(visitorId)) throw new TypeError("Invalid visitor identifier");
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(visitorId));
  const hash = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
  const activity = db.prepare(`INSERT INTO site_visitors (browser_hash, last_day) VALUES (?, ?)
    ON CONFLICT(browser_hash) DO UPDATE SET last_day = excluded.last_day
    WHERE site_visitors.last_day < excluded.last_day`).bind(hash, day);
  if (db.batch) {
    const [, result] = await db.batch([activity, totals]);
    return result.results[0];
  }
  await activity.run();
  return totals.first();
}
