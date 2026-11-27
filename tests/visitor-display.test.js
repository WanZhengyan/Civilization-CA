import test from "node:test";
import assert from "node:assert/strict";
import { readVisitorCounts, browserVisitorId } from "../docs/visitor-counts.js";

test("storage-restricted browsers read totals without generating new visitors", async () => {
  assert.equal(await browserVisitorId(null), null);
  assert.equal(await browserVisitorId({open() { throw Error("Storage unavailable"); }}), null);
  let options;
  const count = {total:44, month:9, day:3};
  const result = await readVisitorCounts("/api/visits", null, async (_url, value) => {
    options = value;
    return Response.json(count);
  });
  assert.deepEqual(result, count);
  assert.equal(options.method, undefined);
  assert.equal(options.body, undefined);
  assert.equal(options.credentials, "omit");
});

test("the counter submits a stable ID and displays an unavailable state when offline", async () => {
  const id = crypto.randomUUID();
  const read = responder => readVisitorCounts("/api/visits", id, async (url, options) => {
    assert.equal(url, "/api/visits"); assert.equal(options.method, "POST"); assert.equal(options.body, id);
    return responder();
  });
  assert.deepEqual(await read(() => Response.json({total:1, month:1, day:1})), {total:1, month:1, day:1});
  assert.equal(await read(() => Response.json({total:1, month:2, day:0})), null);
  assert.equal(await read(() => { throw Error("Offline"); }), null);
  assert.equal(await read(() => new Response(null, {status:503})), null);
});
