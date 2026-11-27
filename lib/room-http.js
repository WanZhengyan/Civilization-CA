import { handleRoom } from "./room-service.js";
import { PROJECT_ORIGIN, serveProjectAPI } from "./project-http.js";

export { PROJECT_ORIGIN };
export function handleRoomHTTP(request, db, projectOrigin = PROJECT_ORIGIN) {
  return serveProjectAPI(request, projectOrigin, () => handleRoom(request, db), true);
}
