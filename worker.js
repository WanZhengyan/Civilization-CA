import { handleRoomHTTP } from "./lib/room-http.js";

import { handleVisitsHTTP } from "./lib/visit-http.js";

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === "/api/visits") return handleVisitsHTTP(request, env.DB, env.PROJECT_ORIGIN);
    if (path !== "/api/room") {
      return new Response("Civilization CA · room service", {status:404});
    }
    return handleRoomHTTP(request, env.DB, env.PROJECT_ORIGIN);
  }
};
