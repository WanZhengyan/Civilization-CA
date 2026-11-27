import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { handleRoomHTTP } from "./lib/room-http.js";

const docs = new URL("./docs/", import.meta.url);
const local = new URL("./.civitas-local/", import.meta.url);
await mkdir(local, {recursive:true});
const sqlite = new DatabaseSync(new URL("rooms.sqlite", local));
const schema = await readFile(new URL("./drizzle/0000_game_rooms.sql", import.meta.url), "utf8");
if (!sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='game_rooms'").get()) sqlite.exec(schema);
const db = {
  prepare(sql) {
    const statement = sqlite.prepare(sql);
    return {bind(...parameters) {
      return {
        async first() { return statement.get(...parameters) ?? null; },
        async run() { return {meta:{changes:statement.run(...parameters).changes}}; }
      };
    }};
  }
};
const assets = new Set((await readdir(fileURLToPath(docs),{recursive:true,withFileTypes:true}))
  .filter(entry=>entry.isFile())
  .map(entry=>relative(fileURLToPath(docs),entry.parentPath+"/"+entry.name).replaceAll("\\","/"))
  .filter(file=>file.split("/").every(part=>!part.startsWith("."))));
const types = {
  ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"text/javascript; charset=utf-8",
  ".mjs":"text/javascript; charset=utf-8", ".webp":"image/webp", ".svg":"image/svg+xml",
  ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".avif":"image/avif",
  ".gif":"image/gif", ".ico":"image/x-icon", ".woff":"font/woff", ".woff2":"font/woff2", ".ttf":"font/ttf",
  ".ogg":"audio/ogg", ".mp3":"audio/mpeg", ".wav":"audio/wav"
};
const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || "127.0.0.1";
const prefix = "/Civilization-LA/";
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url,"http://"+req.headers.host);
    if (url.pathname === "/api/room") {
      const parts = [];
      let size = 0;
      for await (const part of req) {
        size += part.length;
        if (size>4096) { res.writeHead(413); res.end(); return; }
        parts.push(part);
      }
      const body = parts.length ? Buffer.concat(parts) : undefined;
      const request = new Request(url, {method:req.method, headers:req.headers, body});
      const response = await handleRoomHTTP(request,db);
      res.writeHead(response.status,Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (!["HEAD","GET"].includes(req.method)) { res.writeHead(405); res.end(); return; }
    if (url.pathname === "/" || url.pathname === prefix.slice(0,-1)) {
      res.writeHead(302,{Location:prefix+url.search}); res.end(); return;
    }
    const file = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length)||"index.html" : "";
    if (!assets.has(file) || file.startsWith(".")) { res.writeHead(404); res.end(); return; }
    let content = await readFile(new URL(file,docs));
    if (file==="index.html") {
      content=Buffer.from(content.toString().replace(/(<meta name="civitas-api-origin" content=")[^"]*(")/, "$1$2"));
    }
    res.writeHead(200,{"Content-Type":types[extname(file).toLowerCase()] || "application/octet-stream","Cache-Control":"no-store"});
    res.end(req.method==="HEAD" ? undefined : content);
  } catch (error) {
    console.error(error.message);
    res.writeHead(500); res.end();
  }
});
server.listen(port,host,()=>console.log("Civitas LA: http://"+host+":"+server.address().port+prefix));
