import { dataverseFetch } from "../services/dataverseClient.js";

export async function dvJson(endpoint, options = {}) {
  const res = await dataverseFetch(endpoint, options);

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = data?.error?.message || `${res.status} ${res.statusText}`;
    throw new Error(`Dataverse error: ${msg}`);
  }
  return { data, res };
}
