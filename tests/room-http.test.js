import assert from "node:assert/strict";
import { test } from "node:test";
import { handleRoomHTTP, PROJECT_ORIGIN } from "../lib/room-http.js";

test("the Pages origin can preflight room actions with Content-Type and Authorization", async () => {
  const request=new Request("https://api.test/api/room",{
    method:"OPTIONS",headers:{Origin:PROJECT_ORIGIN,"Access-Control-Request-Method":"POST","Access-Control-Request-Headers":"Authorization, Content-Type"}
  });
  const response=await handleRoomHTTP(request,null);
  assert.equal(response.status,204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"),PROJECT_ORIGIN);
  assert.match(response.headers.get("Access-Control-Allow-Headers"),/Authorization/i);
  assert.match(response.headers.get("Access-Control-Allow-Headers"),/Content-Type/i);
  assert.match(response.headers.get("Access-Control-Allow-Methods"),/POST/);
});

test("an independently deployed Worker can allow a fork's Pages origin",async () => {
  const origin="https://civitas-fork.github.io";
  const request=new Request("https://api.test/api/room",{method:"OPTIONS",headers:{Origin:origin}});
  assert.equal((await handleRoomHTTP(request,null)).status,403);
  const fork=await handleRoomHTTP(request,null,origin);
  assert.equal(fork.status,204);
  assert.equal(fork.headers.get("Access-Control-Allow-Origin"),origin);
});
