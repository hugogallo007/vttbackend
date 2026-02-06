import server from "./src/server.js";
import dotenv from "dotenv";
import http from "http";
dotenv.config();
const PORT = process.env.PORT || 3000;

const serverHttp = http.createServer(server);

serverHttp.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
