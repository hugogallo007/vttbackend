import crypto from "crypto";
import { getDataverseToken } from "./authHelper.js";

let cachedToken = null;
let tokenExpiry = null;

const getValidToken = async () => {
  const now = Date.now();
  if (!cachedToken || now >= tokenExpiry) {
    const token = await getDataverseToken();
    cachedToken = token;
    tokenExpiry = now + 60 * 60 * 1000 - 60 * 1000; // válido por 59 min
  }
  return cachedToken;
};

export const dataverseFetch = async (endpoint, options = {}) => {
  const token = await getValidToken();
  const baseUrl = `${process.env.WEB_API}/api/data/v9.2`;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...options.headers,
  };

  // ✅ soporta nextLink absoluto
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;

  const response = await fetch(url, { ...options, headers });

  return response; // sigues devolviendo Response como antes
};

/**
 * Envía un $batch request a Dataverse con múltiples operaciones
 * INDEPENDIENTES (sin changeset transaccional).
 * Cada operación se ejecuta por separado: si una falla, las demás continúan.
 *
 * @param {Array<{method: string, path: string, body?: object, contentId?: number}>} operations
 * @returns {{ ok: boolean, status: number, responses: Array<{contentId: string, status: number, statusText: string, body: object|null}> }}
 */
export const dataverseBatch = async (operations) => {
  const token = await getValidToken();
  const baseUrl = `${process.env.WEB_API}/api/data/v9.2`;

  const batchId = `batch_${crypto.randomUUID()}`;

  // ── Construir el body multipart (sin changeset = no transaccional) ───────
  let body = "";

  operations.forEach((op, i) => {
    body += `--${batchId}\r\n`;
    body += `Content-Type: application/http\r\n`;
    body += `Content-Transfer-Encoding: binary\r\n`;
    body += `Content-ID: ${op.contentId ?? i + 1}\r\n\r\n`;

    body += `${op.method} ${baseUrl}${op.path} HTTP/1.1\r\n`;
    body += `Content-Type: application/json\r\n`;
    body += `Accept: application/json\r\n`;

    if (op.body) {
      const json = JSON.stringify(op.body);
      body += `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n`;
      body += json;
    } else {
      body += `\r\n`;
    }

    body += `\r\n`;
  });

  body += `--${batchId}--\r\n`;

  // ── Enviar ───────────────────────────────────────────────────────────────
  const response = await fetch(`${baseUrl}/$batch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/mixed; boundary=${batchId}`,
      Accept: "application/json",
      Prefer: "odata.continue-on-error",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    },
    body,
  });

  // ── Parsear la respuesta multipart ───────────────────────────────────────
  const responseText = await response.text();
  const parsed = parseBatchResponse(responseText);

  return {
    ok: response.ok,
    status: response.status,
    responses: parsed,
    raw: responseText,
  };
};

/**
 * Parsea la respuesta multipart del $batch de Dataverse.
 * Cada parte es una respuesta HTTP independiente separada por el boundary.
 * Extrae status, statusText y body JSON completo de cada sub-respuesta.
 */
function parseBatchResponse(text) {
  const results = [];

  // Extraer el boundary de la respuesta
  const boundaryMatch = text.match(/^--(.+)/);
  if (!boundaryMatch) return results;
  const boundary = boundaryMatch[1].trim();

  // Dividir por boundary
  const parts = text.split(`--${boundary}`);

  // El primer elemento es vacío, el último es "--" (cierre)
  // Las partes intermedias son las respuestas individuales
  let contentIdCounter = 1;

  for (const part of parts) {
    // Ignorar partes vacías y el cierre "--"
    if (!part.trim() || part.trim() === "--") continue;

    // Buscar la línea HTTP status
    const httpMatch = part.match(/HTTP\/1\.1\s+(\d+)\s+([^\r\n]*)/);
    if (!httpMatch) continue;

    const status = parseInt(httpMatch[1], 10);
    const statusText = httpMatch[2];

    // Extraer Content-ID si existe, sino usar el contador secuencial
    const cidMatch = part.match(/Content-ID:\s*(\d+)/i);
    const contentId = cidMatch ? cidMatch[1] : String(contentIdCounter);

    // Extraer JSON body completo: buscar desde la primera { hasta la última }
    let body = null;
    const jsonStart = part.indexOf("{");
    const jsonEnd = part.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      try {
        body = JSON.parse(part.slice(jsonStart, jsonEnd + 1));
      } catch {
        body = null;
      }
    }

    results.push({ contentId, status, statusText, body });
    contentIdCounter++;
  }

  return results;
}
