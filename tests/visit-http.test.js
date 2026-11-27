import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { handleVisitsHTTP } from "../lib/visit-http.js";

function database() {
  const sql = new DatabaseSync(":memory:");
  sql.exec(readFileSync(new URL("../drizzle/0001_site_visitors.sql", import.meta.url), "utf8"));
  return {
    prepare(query) {
      const stmt = sql.prepare(query);
      return {bind: (...args) => ({run: () => stmt.run(...args), first: () => stmt.get(...args)})};
    }
  };
}
const url = "https://game.example/api/visits";
const project = "https://wanzhengyan.github.io";
const visit = (id, origin = project) => new Request(url, {method:"POST", headers:{Origin:origin, "Content-Type":"text/plain;charset=UTF-8"}, body:id});

test("Pages and the hosted game read the same durable audience and duplicate submissions count once", async () => {
  const db = database();
  const serve = req => handleVisitsHTTP(req, db);
  const id = crypto.randomUUID();
  const [a,b] = await Promise.all([serve(visit(id)), serve(visit(id, "https://game.example"))]);
  for (const r of [a,b]) assert.deepEqual(await r.json(), {total:1, month:1, day:1});
  assert.equal(a.headers.get("Access-Control-Allow-Origin"), project);
  assert.equal(a.headers.get("Cache-Control"), "no-store");
  assert.equal(b.headers.get("Access-Control-Allow-Origin"), null);
  assert.deepEqual(await (await serve(new Request(url))).json(), {total:1, month:1, day:1});
});

test("an invalid origin, method or identifier never records a visitor", async () => {
  const db = database();
  const send = request => handleVisitsHTTP(request, db);
  assert.equal((await send(visit(crypto.randomUUID(), "https://foreign.example"))).status, 403);
  assert.equal((await send(visit("email@example.com"))).status, 400);
  assert.equal((await send(visit("x".repeat(8000)))).status, 400);
  assert.equal((await send(new Request(url, {method:"POST", headers:{"Content-Type":"application/json"}, body:"{}"}))).status, 415);
  assert.equal((await send(new Request(url, {method:"PUT"}))).status, 405);
  const preflight = await send(new Request(url, {method:"OPTIONS", headers:{Origin:project}}));
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Headers"), "Content-Type");
  assert.deepEqual(await (await send(new Request(url))).json(), {total:0, month:0, day:0});
  const error = await handleVisitsHTTP(new Request(url), {});
  assert.equal(error.status, 503);
  assert.equal(await error.text(), "");
});
