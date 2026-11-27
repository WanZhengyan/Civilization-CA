import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { calendarDay, visitCounts } from "../lib/visitors.js";

function storage() {
  const sql = new DatabaseSync(":memory:");
  sql.exec(readFileSync(new URL("../drizzle/0001_site_visitors.sql", import.meta.url), "utf8"));
  return {
    sql,
    prepare(query) {
      const statement = sql.prepare(query);
      return {bind: (...args) => ({run: () => statement.run(...args), first: () => ({...statement.get(...args)})})};
    }
  };
}

test("a visitor remains unique through refreshes and concurrent submissions", async () => {
  const db = storage(), id = crypto.randomUUID(), at = new Date("2026-07-03T18:00:00Z");
  assert.deepEqual(await visitCounts(db, null, at), {total:0, month:0, day:0});
  await Promise.all(Array.from({length:24}, () => visitCounts(db, id, at)));
  assert.deepEqual(await visitCounts(db, null, at), {total:1, month:1, day:1});
  const row = db.sql.prepare("SELECT * FROM site_visitors").get();
  assert.match(row.browser_hash, /^[a-f0-9]{64}$/);
  assert.deepEqual(Object.keys(row).sort(), ["browser_hash", "last_day"]);
  assert.equal(row.last_day, "2026-07-03");
  db.sql.close();
});

test("all-time, month and day distinguish returning and new visitors at Los Angeles midnight", async () => {
  const db = storage(), alice = crypto.randomUUID(), bob = crypto.randomUUID(), carol = crypto.randomUUID();
  const prior = new Date("2026-11-01T06:59:59Z"), start = new Date("2026-11-01T07:00:00Z"), next = new Date("2026-11-02T08:00:00Z");
  await visitCounts(db, alice, prior);
  await visitCounts(db, bob, prior);
  assert.deepEqual(await visitCounts(db, null, start), {total:2, month:0, day:0});
  await visitCounts(db, alice, start);
  await visitCounts(db, carol, start);
  await visitCounts(db, alice, prior); // An in-flight request from yesterday arrives late.
  assert.deepEqual(await visitCounts(db, null, start), {total:3, month:2, day:2});
  assert.deepEqual(await visitCounts(db, bob, next), {total:3, month:3, day:1});
  assert.deepEqual(await visitCounts(db, null, new Date("2026-12-01T08:00:00Z")), {total:3, month:0, day:0});
  db.sql.close();
});

test("Los Angeles periods follow daylight saving time through spring and fall", () => {
  const day = iso => calendarDay(new Date(iso));
  assert.equal(day("2026-03-08T07:59:59Z"), "2026-03-07");
  assert.equal(day("2026-03-08T08:00:00Z"), "2026-03-08");
  assert.equal(day("2026-03-09T07:00:00Z"), "2026-03-09");
  assert.equal(day("2026-11-01T09:01:00Z"), "2026-11-01");
  assert.equal(day("2026-11-02T07:59:59Z"), "2026-11-01");
});
