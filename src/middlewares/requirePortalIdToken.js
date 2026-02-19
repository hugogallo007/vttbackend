// src/middlewares/requirePortalAccessToken.js
import { createRemoteJWKSet, jwtVerify } from "jose";

const TENANT_ID = process.env.AAD_TENANT_ID;
const API_CLIENT_ID = process.env.CLIENT_ID; // backend app id
const REQUIRED_SCOPE = "access_as_user";

console.log(process.env.AAD_TENANT_ID);

if (!TENANT_ID || !API_CLIENT_ID) {
  console.warn("[AUTH] Falta AAD_TENANT_ID o AAD_API_CLIENT_ID");
}

// ✅ JWKS endpoint correcto (keys públicas)
const jwks = createRemoteJWKSet(
  new URL(`https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`),
);

// Issuers posibles (a veces vienen v2, a veces sts)
const allowedIssuers = new Set([
  `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
  `https://sts.windows.net/${TENANT_ID}/`,
]);

// Audience posible (depende cómo esté tu Application ID URI)
const allowedAudiences = new Set([`api://${API_CLIENT_ID}`, API_CLIENT_ID]);

function getBearerToken(req) {
  const h = req.headers.authorization || req.headers.Authorization || "";
  if (typeof h !== "string") return null;
  return h.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

async function verifyAccessToken(token) {
  // Verifica firma + exp/nbf + etc. (sin issuer/aud primero)
  const { payload, protectedHeader } = await jwtVerify(token, jwks);

  // ✅ issuer check
  if (!payload.iss || !allowedIssuers.has(payload.iss)) {
    throw new Error(`unexpected iss claim value: ${payload.iss}`);
  }

  // ✅ audience check
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  const okAud = aud.some(
    (a) => typeof a === "string" && allowedAudiences.has(a),
  );
  if (!okAud) {
    throw new Error(`unexpected aud claim value: ${payload.aud}`);
  }

  // ✅ tenant check (extra)
  if (payload.tid && payload.tid !== TENANT_ID) {
    throw new Error("Invalid tenant (tid mismatch)");
  }

  // ✅ scope check (delegated permissions)
  const scp = typeof payload.scp === "string" ? payload.scp.split(" ") : [];
  if (REQUIRED_SCOPE && !scp.includes(REQUIRED_SCOPE)) {
    throw new Error(`Missing required scope: ${REQUIRED_SCOPE}`);
  }

  return { payload, protectedHeader };
}

export default async function requirePortalAccessToken(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res
        .status(401)
        .json({ error: "Unauthorized: missing Bearer token" });
    }

    const { payload } = await verifyAccessToken(token);
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({
      error: "Unauthorized: invalid token",
      details: e.message,
    });
  }
}
