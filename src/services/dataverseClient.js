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

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  return response;
};
