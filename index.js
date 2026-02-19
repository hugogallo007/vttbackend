import "dotenv/config";
import server from "./src/server.js";
import http from "http";
import { startRCACron } from "./src/jobs/rcaCron.js";

const PORT = process.env.PORT || 3000;

const serverHttp = http.createServer(server);

serverHttp.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  startRCACron();
});
