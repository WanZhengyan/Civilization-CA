import { handleRoomHTTP } from "./lib/room-http.js";

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== "/api/room") {
      return new Response("Civilization CA · room service", {status:404});
    }
    return handleRoomHTTP(request, env.DB, env.PROJECT_ORIGIN);
  }
};
