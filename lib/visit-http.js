import { PROJECT_ORIGIN, serveProjectAPI } from "./project-http.js";
import { isVisitorId, visitCounts } from "./visitors.js";

async function readIdentifier(request) {
  const stream = request.body?.getReader();
  if (!stream) return null;
  const decoder = new TextDecoder();
  let size = 0, text = "";
  try {
    while (true) {
      const {done, value} = await stream.read();
      if (done) return text + decoder.decode();
      size += value.length;
      if (size > 36) {
        await stream.cancel();
        return null;
      }
      text += decoder.decode(value, {stream:true});
    }
  } finally {
    stream.releaseLock();
  }
}

export function handleVisitsHTTP(request, db, projectOrigin = PROJECT_ORIGIN) {
  return serveProjectAPI(request, projectOrigin, async () => {
    const headers = {"Cache-Control":"no-store"};
    if (request.method !== "GET" && request.method !== "POST") {
      return new Response(null, {status:405, headers:{...headers, Allow:"GET, POST, OPTIONS"}});
    }
    let id = null;
    if (request.method === "POST") {
      if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "text/plain") {
        return new Response(null, {status:415, headers});
      }
      id = await readIdentifier(request);
      if (!isVisitorId(id)) return new Response(null, {status:400, headers});
    }
    try {
      return Response.json(await visitCounts(db, id), {headers});
    } catch {
      return new Response(null, {status:503, headers});
    }
  });
}
