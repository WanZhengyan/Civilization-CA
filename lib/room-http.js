import { handleRoom } from "./room-service.js";

// Rooms use explicit bearer tokens. Only the designated project site can read
// responses from another origin, including when it is hosted under a subpath.
export const PROJECT_ORIGIN = "https://wanzhengyan.github.io";

export async function handleRoomHTTP(request, db, projectOrigin = PROJECT_ORIGIN) {
  const origin = request.headers.get("Origin");
  const crossOrigin = origin && origin !== new URL(request.url).origin;
  const headers = new Headers({ Vary: "Origin, Authorization" });
  if (crossOrigin) {
    if (origin !== projectOrigin) return new Response(null, { status: 403, headers });
    headers.set("Access-Control-Allow-Origin", origin);
  }
  if (request.method === "OPTIONS") {
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    headers.set("Access-Control-Max-Age", "600");
    return new Response(null, { status: 204, headers });
  }
  const response = await handleRoom(request, db);
  const finalHeaders = new Headers(response.headers);
  headers.forEach((value, key) => finalHeaders.set(key, value));
  return new Response(response.body, { status: response.status, headers: finalHeaders });
}
