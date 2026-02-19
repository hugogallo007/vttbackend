import express from "express";
import morgan from "morgan";
import cors from "cors";
import testRoutes from "./routes/testRoutes.js";
import problemCountryRoutes from "./routes/problemCountryRoutes.js";
import requirePortalIdToken from "./middlewares/requirePortalIdToken.js";
import allowedEmailsRoutes from "./routes/allowedEmailsRoutes.js";
import wallogRoutes from "./routes/wallogRoutes.js";
import rcaJobRoutes from "./routes/rcaJobRoutes.js";
const server = express();

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = ["https://site-8wfcj.powerappsportals.com"];
    // 1) Permite requests sin Origin (health checks / server-to-server)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.some((o) =>
        typeof o === "string" ? origin === o : o.test(origin),
      )
    ) {
      callback(null, origin); // permite sólo los de la lista
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

server.use(cors(corsOptions));
server.use(requirePortalIdToken);
server.get("/", (req, res) => {
  res.json({ message: "API is working!" });
});

server.use(express.json());
server.use(morgan("dev"));

server.use("/problem-countries", problemCountryRoutes);
server.use("/test", testRoutes);
server.use("/allowed-emails", allowedEmailsRoutes);
server.use("/wallog", wallogRoutes);
server.use("/rca-job", rcaJobRoutes);
export default server;
