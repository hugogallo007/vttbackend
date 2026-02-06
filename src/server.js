import express from "express";
import morgan from "morgan";
import cors from "cors";
import testRoutes from "./routes/testRoutes.js";
import problemCountryRoutes from "./routes/problemCountryRoutes.js";
const server = express();

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      "https://site-8wfcj.powerappsportals.com",
      "https://www.neurolead.io",
      "https://flowintelli1.app.n8n.cloud/",
      "https://neuroleadbackend-csaehadph5duakcb.centralus-01.azurewebsites.net",
      "http://localhost:5173", // desarrollo local
      /^http:\/\/192\.168\.10\.\d{1,3}:5173$/, // desarrollo local
    ];

    if (
      !origin || // permite Postman/Insomnia
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

server.get("/", (req, res) => {
  res.json({ message: "API is working!" });
});

server.use(cors(corsOptions));
server.use(express.json());
server.use(morgan("dev"));

server.use("/test", testRoutes);
server.use("/problem-countries", problemCountryRoutes);
export default server;
