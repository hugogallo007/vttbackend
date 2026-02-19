import { dvJson } from "../utils/jsonHelper.js";
import { dataverseFetch, dataverseBatch } from "./dataverseClient.js";
import { buildFilter, buildOwnerFilter } from "../utils/filterBuilder.js";

export const getChangeHistory = async () => {
  try {
    const response = await dataverseFetch("/cr6c3_changehistories");
    if (!response.ok) {
      throw new Error(
        `Error en la solicitud a Dataverse: ${response.status} ${response.statusText}`,
      );
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(
      "Error al obtener el historial de cambios: " + error.message,
    );
  }
};

//todo problem country

export const getProblemCountries = async () => {
  try {
    const response = await dataverseFetch("/cr6c3_problemcountries");
    if (!response.ok) {
      throw new Error(
        `Error en la solicitud a Dataverse
: ${response.status} ${response.statusText}`,
      );
    }
    const data = await response.json();
    return data.value || [];
  } catch (error) {
    throw new Error(
      "Error al obtener los países con problemas: " + error.message,
    );
  }
};

export const findProblemCountryByName = async (name) => {
  try {
    const response = await dataverseFetch(
      `/cr6c3_problemcountries?$filter=cr6c3_country eq '${encodeURIComponent(
        name,
      )}'`,
    );

    if (!response.ok) {
      throw new Error(
        `Error en la solicitud a Dataverse: ${response.status} ${response.statusText}`,
      );
    }
    const data = await response.json();
    return data.value && data.value.length > 0 ? data.value[0] : null;
  } catch (error) {
    throw new Error(
      `Error al buscar el país con problemas por nombre: ${error.message}`,
    );
  }
};

export const createProblemCountry = async (countryData) => {
  try {
    const response = await dataverseFetch("/cr6c3_problemcountries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(countryData),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Dataverse ${response.status} ${response.statusText} ${text}`,
      );
    }

    // Dataverse suele responder 204 con Location / OData-EntityId del registro creado
    if (response.status === 204) {
      const entityId =
        response.headers.get("odata-entityid") ||
        response.headers.get("location");
      return { ok: true, entityId };
    }

    // Si en algún caso sí viene contenido, parsea solo si hay body
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return await response.json();
    }
    return await response.text();
  } catch (error) {
    throw new Error(`Error al crear el país con problemas: ${error.message}`);
  }
};
export const deleteProblemCountry = async (id) => {
  try {
    const response = await dataverseFetch(`/cr6c3_problemcountries(${id})`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(
        `Error en la solicitud a Dataverse: ${response.status} ${response.statusText}`,
      );
    } else {
      return { message: "Problem Country deleted successfully" };
    }
  } catch (error) {
    throw new Error(
      `Error al eliminar el país con problemas: ${error.message}`,
    );
  }
};

export const deleteproblemCountryByName = async (name) => {
  try {
    const country = await findProblemCountryByName(name);
    if (!country) {
      throw new Error(
        `No se encontró el país con problemas con el nombre: ${name}`,
      );
    }
    return await deleteProblemCountry(country.cr6c3_problemcountryid);
  } catch (error) {
    throw new Error(
      `Error al eliminar el país con problemas por nombre: ${error.message}`,
    );
  }
};

export const updateProblemCountry = async (id, updatedData) => {
  try {
    const response = await dataverseFetch(`/cr6c3_problemcountries(${id})`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedData),
    });

    if (!response.ok) {
      throw new Error(
        `Error en la solicitud a Dataverse: ${response.status} ${response.statusText}`,
      );
    } else {
      return { message: "Problem Country updated successfully" };
    }
  } catch (error) {
    throw new Error(
      `Error al actualizar el país con problemas: ${error.message}`,
    );
  }
};

//todo Allowed Emails

export const getAllowedEmails = async () => {
  try {
    const response = await dataverseFetch(
      "/cr6c3_allowedemailses?$select=cr6c3_allowedemailsid,cr6c3_email,createdon,modifiedon&$orderby=cr6c3_email asc",
    );
    if (!response.ok) {
      throw new Error(
        `Error en la solicitud a Dataverse: ${response.status} ${response.statusText}`,
      );
    }
    const data = await response.json();
    return data.value || [];
  } catch (error) {
    throw new Error(
      "Error al obtener los correos electrónicos permitidos: " + error.message,
    );
  }
};

export const createAllowedEmail = async (emailData) => {
  try {
    const response = await dataverseFetch("/cr6c3_allowedemailses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      throw new Error(
        `Error en la solicitud a Dataverse: ${response.status} ${response.statusText}`,
      );
    }
    const data = await response.json();

    return data;
  } catch (error) {
    throw new Error(
      `Error al crear el correo electrónico permitido: ${error.message}`,
    );
  }
};

export const updateAllowedEmail = async (id, updatedData) => {
  try {
    const response = await dataverseFetch(`/cr6c3_allowedemailses(${id})`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedData),
    });

    if (!response.ok) {
      throw new Error(
        `Error en la solicitud a Dataverse: ${response.status} ${response.statusText}`,
      );
    } else {
      return { message: "Allowed Email updated successfully" };
    }
  } catch (error) {
    throw new Error(
      `Error al actualizar el correo electrónico permitido: ${error.message}`,
    );
  }
};

export const deleteAllowedEmail = async (id) => {
  try {
    const response = await dataverseFetch(`/cr6c3_allowedemailses(${id})`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(
        `Error en la solicitud a Dataverse: ${response.status} ${response.statusText}`,
      );
    } else {
      return { message: "Allowed Email deleted successfully" };
    }
  } catch (error) {
    throw new Error(
      `Error al eliminar el correo electrónico permitido: ${error.message}`,
    );
  }
};

//* supplier get records

export async function listSupplierRecords({
  table,
  select = [],
  orderby = "createdon desc",
  pageSize = 10,
  cursor = null,
  filters = {},
  includeCount = false,
  owner = null,
}) {
  const top = Math.min(Math.max(parseInt(pageSize, 10) || 10, 1), 5000);

  const preferHeaders = {
    Prefer: `odata.maxpagesize=${top}`,
  };

  // ✅ Página siguiente (nextLink)
  if (cursor) {
    const nextLink = Buffer.from(String(cursor), "base64").toString("utf8");

    const { data } = await dvJson(nextLink, {
      headers: preferHeaders,
    });

    const next = data["@odata.nextLink"]
      ? Buffer.from(data["@odata.nextLink"], "utf8").toString("base64")
      : null;

    return {
      items: data.value || [],
      nextCursor: next,
    };
  }

  const $filter = buildFilter(filters);
  const ownerFilter = buildOwnerFilter(owner);

  // Combinar filtros: base + owner
  const combinedFilter =
    [$filter, ownerFilter].filter(Boolean).join(" and ") || null;

  const $select = select.length
    ? `?$select=${encodeURIComponent(select.join(","))}`
    : "";
  const $orderby = orderby ? `&$orderby=${encodeURIComponent(orderby)}` : "";
  const $top = `?$top=${top}`;
  const $count = includeCount ? `&$count=true` : "";
  const filterPart = combinedFilter
    ? `&$filter=${encodeURIComponent(combinedFilter)}`
    : "";

  const endpoint = `/${table}${$select}${$orderby}${$count}${filterPart}`;

  const { data } = await dvJson(endpoint, {
    headers: preferHeaders,
  });

  const next = data["@odata.nextLink"]
    ? Buffer.from(data["@odata.nextLink"], "utf8").toString("base64")
    : null;

  return {
    items: data.value || [],
    nextCursor: next,
    count: includeCount ? data["@odata.count"] : undefined,
  };
}

//* admin get records

// ---------- helpers ----------
function encodeCursor(obj) {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64");
}

function decodeCursor(cursor) {
  if (!cursor) return null;
  return JSON.parse(Buffer.from(String(cursor), "base64").toString("utf8"));
}

function escapeODataString(s = "") {
  return s.replace(/'/g, "''");
}

/**
 * OJO: esto asume que TODAS las tablas comparten:
 * - createdon
 * - versionnumber
 * - (opcional) new_name/emailaddress1/statuscode según tu filtro
 * Si alguna tabla difiere, conviene hacer buildFilter por view.
 */
function buildBaseFilter({ from, to, q, status, owner }) {
  const parts = [];

  if (from)
    parts.push(`cr6c3_creationtimestamp ge ${new Date(from).toISOString()}`);

  if (to) {
    const d = new Date(to);
    d.setDate(d.getDate() + 1);
    parts.push(`cr6c3_creationtimestamp lt ${d.toISOString()}`);
  }

  if (q?.trim()) {
    const term = escapeODataString(q.trim());
    // Ajusta campos a los reales en tus tablas
    parts.push(`(contains(cr6c3_notificationid,'${term}'))`);
  }

  if (status) parts.push(`statuscode eq ${Number(status)}`);

  // Filtro por owner (cr6c3_rcastatus)
  const ownerFilter = buildOwnerFilter(owner);
  if (ownerFilter) parts.push(ownerFilter);

  return parts.length ? parts.map((p) => `(${p})`).join(" and ") : null;
}

/**
 * Filtro de paginación (watermark):
 * - si ya hay wm: trae todo lo <= wm
 * - y si ya consumimos parte de wm, usa versionnumber < lastV para no repetir
 */
function buildPagingFilter({ wm, lastV }) {
  if (!wm) return null;

  if (lastV != null) {
    // (createdon < wm) OR (createdon == wm AND versionnumber < lastV)
    return `(createdon lt ${wm} or (createdon eq ${wm} and versionnumber lt ${lastV}))`;
  }

  // todavía no hemos consumido wm en esta tabla
  return `createdon le ${wm}`;
}

// --------- core ---------
async function fetchChunkForView({ view, top, baseFilter, cursor }) {
  const wm = cursor?.wm || null;
  const lastVForTable = cursor?.lastV?.[view.key] ?? null;

  const parts = [];
  if (baseFilter) parts.push(baseFilter);

  const paging = buildPagingFilter({ wm, lastV: lastVForTable });
  if (paging) parts.push(paging);

  const finalFilter = parts.length ? parts.join(" and ") : null;

  const select = Array.from(
    new Set([
      ...view.select,
      view.idField,
      "createdon",
      "versionnumber", // ✅ necesario para tie-break + paginación
    ]),
  );

  const orderby = `createdon desc,versionnumber desc`;

  const endpoint =
    `/${view.table}` +
    `?$select=${encodeURIComponent(select.join(","))}` +
    `&$orderby=${encodeURIComponent(orderby)}` +
    (finalFilter ? `&$filter=${encodeURIComponent(finalFilter)}` : "");

  const { data } = await dvJson(endpoint);

  const items = (data.value || []).map((r) => ({
    ...r,
    __src: view.key,
  }));

  return items;
}

/**
 * Suma conteos filtrados en las 4 tablas:
 * GET ...?$count=true&$top=0&$filter=...
 */
async function fetchCountForView({ view, baseFilter }) {
  const endpoint =
    `/${view.table}` +
    `?$count=true` +
    (baseFilter ? `&$filter=${encodeURIComponent(baseFilter)}` : "");

  const { data } = await dvJson(endpoint);
  return Number(data["@odata.count"] || 0);
}

/**
 * Admin: une 4 tablas, aplica filtros globales, pagina con cursor.
 * cursor base64 json:
 *   {
 *     wm: "2026-02-12T00:00:00.000Z",
 *     lastV: { supplierA: 123, supplierB: 456 } // last versionnumber consumido en wm
 *   }
 */
export async function listAdminRecords({
  views,
  pageSize = 100,
  cursor = null,
  filters = {},
  includeCount = false,
  parentManufacturer = null,
  owner = null,
}) {
  // Si hay filtro de manufacturer, consultar solo esa tabla específica
  if (parentManufacturer) {
    const specificView = views.find((view) => view.key === parentManufacturer);

    if (!specificView) {
      throw new Error(
        `Invalid parentManufacturer: ${parentManufacturer}. Valid values: ${views.map((v) => v.key).join(", ")}`,
      );
    }

    return await listSupplierRecords({
      table: specificView.table,
      select: specificView.select,
      orderby: `createdon desc,${specificView.idField} desc`,
      pageSize,
      cursor,
      filters,
      includeCount,
      owner,
    });
  }

  // Comportamiento original: consultar las 4 tablas
  const decoded = decodeCursor(cursor);

  const baseFilter = buildBaseFilter({ ...filters, owner });

  // Para poder “mezclar”, trae un chunk de cada tabla.
  // Si tus tablas son muy desbalanceadas, puedes subir esto a 150-250.
  const perTableTop = Math.min(Math.max(pageSize, 50), 200);

  // 1) data (4 tablas en paralelo)
  const chunks = await Promise.all(
    views.map((view) =>
      fetchChunkForView({
        view,
        top: perTableTop,
        baseFilter,
        cursor: decoded,
      }),
    ),
  );

  // 2) merge + sort
  const merged = chunks.flat();
  merged.sort((a, b) => {
    const da = new Date(a.createdon).getTime();
    const db = new Date(b.createdon).getTime();
    if (db !== da) return db - da;

    const va = Number(a.versionnumber || 0);
    const vb = Number(b.versionnumber || 0);
    if (vb !== va) return vb - va;

    // tie final determinista: por source (para no “bailar”)
    return String(b.__src).localeCompare(String(a.__src));
  });

  const page = merged.slice(0, pageSize);
  const last = page[page.length - 1];

  // 3) cursor nuevo
  let nextCursor = null;

  if (page.length === pageSize && last?.createdon) {
    const newWm = new Date(last.createdon).toISOString();

    // Si seguimos en la misma wm, acumulamos lastV; si cambiamos wm, reseteamos
    const prevWm = decoded?.wm || null;
    const sameWm = prevWm && newWm === prevWm;
    const lastV = sameWm ? { ...(decoded?.lastV || {}) } : {};

    // Para cada tabla, encuentra el "último" versionnumber consumido en esa wm
    // (como ordenamos desc, el último consumido es el más pequeño dentro de esa wm)
    for (const v of views) {
      const rowsAtWm = page.filter(
        (r) =>
          r.__src === v.key && new Date(r.createdon).toISOString() === newWm,
      );
      if (!rowsAtWm.length) continue;

      const minV = Math.min(
        ...rowsAtWm.map((r) => Number(r.versionnumber || 0)),
      );
      const prev = lastV[v.key];

      // si ya había uno (misma wm), actualiza al menor (porque vamos bajando)
      lastV[v.key] = prev == null ? minV : Math.min(prev, minV);
    }

    nextCursor = encodeCursor({ wm: newWm, lastV });
  }

  // 4) count opcional (sumado)
  let count;
  if (includeCount) {
    const counts = await Promise.all(
      views.map((view) => fetchCountForView({ view, baseFilter })),
    );
    count = counts.reduce((a, b) => a + b, 0);
  }

  return { items: page, nextCursor, count };
}

//todo Fields permissions

export const getFieldsPermissions = async () => {
  try {
    const response = await dataverseFetch("/cr6c3_fieldspermissionses");
    if (!response.ok) {
      throw new Error(
        `Error en la solicitud a Dataverse: ${response.status} ${response.statusText}`,
      );
    }
    const data = await response.json();
    return data.value[0] || [];
  } catch (error) {
    throw new Error(
      "Error al obtener los permisos de campos: " + error.message,
    );
  }
};

// ── Fetch ALL records (para descarga de Excel) ──────────────────────────────

/**
 * Carga TODOS los registros de supplier iterando por cursores.
 */
export async function listAllSupplierRecords({
  table,
  select = [],
  orderby = "createdon desc",
  filters = {},
  owner = null,
}) {
  const allItems = [];
  let cursor = null;

  do {
    const result = await listSupplierRecords({
      table,
      select,
      orderby,
      pageSize: 5000,
      cursor,
      filters,
      includeCount: false,
      owner,
    });

    allItems.push(...result.items);
    cursor = result.nextCursor;
  } while (cursor);

  return allItems;
}

/**
 * Carga TODOS los registros admin (4 tablas) iterando por cursores.
 */
export async function listAllAdminRecords({
  views,
  filters = {},
  parentManufacturer = null,
  owner = null,
}) {
  const allItems = [];
  let cursor = null;

  do {
    const result = await listAdminRecords({
      views,
      pageSize: 5000,
      cursor,
      filters,
      includeCount: false,
      parentManufacturer,
      owner,
    });

    allItems.push(...result.items);
    cursor = result.nextCursor;
  } while (cursor);

  return allItems;
}

// ── Batch Update Records ────────────────────────────────────────────────────

const BATCH_CHUNK_SIZE = 1000; // Dataverse limit per $batch changeset

/**
 * Recibe un array de items (con id, table, __rowIndex y campos a actualizar),
 * agrupa por tabla, fetch records actuales para diff, crea change histories
 * y arma peticiones $batch para los updates.
 *
 * @param {Array<Object>} items - Records con { id, table, __rowIndex, ...fields }
 * @param {string} changedBy - Email del usuario
 * @param {string} source - Fuente del cambio
 * @returns {{ totalUpdated, totalChangeHistories, errors }}
 */
export async function batchUpdateRecords(
  items,
  changedBy = "admin",
  source = "excel-upload",
) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Items array is empty or invalid");
  }

  // ── 1. Fetch records actuales y construir operaciones con diff ───────────
  const allChangeEntries = [];
  const allOperations = [];
  const errors = [];

  const results = await Promise.all(
    items.map(async (item) => {
      const { id, table, __rowIndex, ...fields } = item;

      if (!id || !table) {
        return {
          type: "error",
          data: {
            rowIndex: __rowIndex,
            id,
            table,
            status: 400,
            detail: "Missing 'id' or 'table'",
          },
        };
      }

      // Fetch el record actual para obtener old values
      let currentRecord;
      try {
        currentRecord = await fetchRecord(table, id);
      } catch (err) {
        return {
          type: "error",
          data: {
            rowIndex: __rowIndex,
            id,
            table,
            status: 404,
            detail: `Failed to fetch record: ${err.message}`,
          },
        };
      }

      // Generar change entries por cada campo que difiere
      const changeEntries = [];
      for (const [field, newVal] of Object.entries(fields)) {
        const oldVal = currentRecord[field];
        if (hasValueChanged(oldVal, newVal)) {
          changeEntries.push({
            cr6c3_notificationid: currentRecord.cr6c3_notificationid || "",
            cr6c3_field: field,
            cr6c3_oldvalue: oldVal == null ? "" : String(oldVal),
            cr6c3_newvalue: newVal == null ? "" : String(newVal),
            cr6c3_changeby: changedBy,
            cr6c3_supplier: getSupplierNameFromTable(table),
            cr6c3_source: source,
            cr6c3_status: "170260000",
          });
        }
      }

      return {
        type: "operation",
        data: {
          method: "PATCH",
          path: `/${table}(${id})`,
          body: fields,
          __meta: { rowIndex: __rowIndex, id, table },
          changeEntries,
        },
      };
    }),
  );

  const patchOps = [];
  for (const r of results) {
    if (r.type === "error") errors.push(r.data);
    else if (r.type === "operation") {
      patchOps.push(r.data);
      allChangeEntries.push(...r.data.changeEntries);
    }
  }

  // ── 2. Batch de Change Histories (POST) ──────────────────────────────────
  let totalChangeHistories = 0;

  if (allChangeEntries.length > 0) {
    const historyChunks = [];
    for (let i = 0; i < allChangeEntries.length; i += BATCH_CHUNK_SIZE) {
      historyChunks.push(allChangeEntries.slice(i, i + BATCH_CHUNK_SIZE));
    }

    const historyResults = await Promise.all(
      historyChunks.map((chunk) => {
        const ops = chunk.map((entry, idx) => ({
          method: "POST",
          path: "/cr6c3_changehistories",
          body: entry,
          contentId: idx + 1,
        }));
        return dataverseBatch(ops);
      }),
    );

    for (const result of historyResults) {
      if (result.ok && result.responses.length === 0) {
        totalChangeHistories += allChangeEntries.length;
      } else {
        for (const sub of result.responses) {
          if (sub.status >= 200 && sub.status < 300) {
            totalChangeHistories++;
          }
        }
      }
    }

    console.log(
      `[Admin] Change histories created: ${totalChangeHistories}/${allChangeEntries.length}`,
    );
  }

  // ── 3. Dividir en chunks y ejecutar batches de PATCH en paralelo ─────────
  let totalUpdated = 0;

  if (patchOps.length > 0) {
    const chunks = [];
    for (let i = 0; i < patchOps.length; i += BATCH_CHUNK_SIZE) {
      chunks.push(patchOps.slice(i, i + BATCH_CHUNK_SIZE));
    }

    const batchResults = await Promise.all(
      chunks.map((chunk) => {
        const ops = chunk.map((op, idx) => ({
          method: op.method,
          path: op.path,
          body: op.body,
          contentId: idx + 1,
        }));
        return dataverseBatch(ops).then((result) => ({ result, chunk }));
      }),
    );

    for (const { result, chunk } of batchResults) {
      if (result.ok && result.responses.length === 0) {
        totalUpdated += chunk.length;
        continue;
      }

      if (!result.ok && result.responses.length === 0) {
        for (const op of chunk) {
          errors.push({
            rowIndex: op.__meta.rowIndex,
            id: op.__meta.id,
            table: op.__meta.table,
            status: result.status,
            detail: `Batch failed with status ${result.status}`,
          });
        }
        continue;
      }

      for (const sub of result.responses) {
        const idx = parseInt(sub.contentId, 10) - 1;
        const op = chunk[idx];

        if (sub.status >= 200 && sub.status < 300) {
          totalUpdated++;
        } else {
          const errorBody = sub.body?.error || sub.body || {};
          errors.push({
            rowIndex: op?.__meta?.rowIndex,
            id: op?.__meta?.id,
            table: op?.__meta?.table,
            status: sub.status,
            statusText: sub.statusText,
            code: errorBody.code || null,
            detail: errorBody.message || `${sub.status} ${sub.statusText}`,
            innerError: errorBody.innererror || null,
          });
        }
      }

      if (result.ok && result.responses.length < chunk.length) {
        totalUpdated += chunk.length - result.responses.length;
      }
    }
  }

  return { totalUpdated, totalChangeHistories, errors };
}

// ── Helpers: tabla → nombre legible de supplier ─────────────────────────────

const TABLE_TO_SUPPLIER = {
  cr6c3_deltasuppliers: "Delta",
  cr6c3_ingrasyssuppliers: "Ingrasys",
  cr6c3_quantasuppliers: "Quanta",
  cr6c3_ztsuppliers: "ZT Systems",
};

function getSupplierNameFromTable(table) {
  return TABLE_TO_SUPPLIER[table] || "Unknown";
}

// ── Supplier Batch Update (with validation + diff) ──────────────────────────

/**
 * Valida un valor contra una validationRule del field permission.
 * @param {any} value
 * @param {{ type: string, pattern?: string, message?: string }} rule
 * @returns {{ valid: boolean, message?: string }}
 */
function validateFieldValue(value, rule) {
  if (!rule) return { valid: true };

  if (rule.type === "regex" && rule.pattern) {
    const str = value == null ? "" : String(value);
    const regex = new RegExp(rule.pattern);
    if (!regex.test(str)) {
      return {
        valid: false,
        message:
          rule.message ||
          `Value "${str}" does not match pattern ${rule.pattern}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Compara dos valores para determinar si cambiaron.
 * Maneja nulls, strings, booleans, numbers y fechas.
 */
function hasValueChanged(oldVal, newVal) {
  // Normalizar nulls / undefined / empty string
  const normalizeNull = (v) =>
    v === null || v === undefined || v === "" ? null : v;
  const a = normalizeNull(oldVal);
  const b = normalizeNull(newVal);

  if (a === b) return false;
  if (a == null && b == null) return false;

  // Comparar como strings para manejar tipos mixtos (number vs string, etc)
  return String(a) !== String(b);
}

/**
 * Fetch de un record individual de Dataverse.
 * @param {string} table
 * @param {string} id
 * @returns {object} El record de Dataverse
 */
async function fetchRecord(table, id) {
  const { data } = await dvJson(`/${table}(${id})`);
  return data;
}

/**
 * Upload para suppliers: recibe items, filtra solo campos editables,
 * compara con Dataverse, valida, arma batch de change histories y luego batch de updates.
 *
 * @param {Array<Object>} items - Records con { id, table, __rowIndex, ...fields }
 * @param {Record<string, object>} fieldPermissions - Parsed field permissions
 * @param {string} changedBy - Email del usuario que hace el upload
 * @param {string} source - Fuente del cambio ("excel-upload", "ui", etc.)
 * @returns {{ totalReceived, totalUpdated, totalSkipped, totalErrors, totalValidationWarnings, totalChangeHistories, skipped, validationWarnings, errors }}
 */
export async function supplierBatchUpdate(
  items,
  fieldPermissions,
  changedBy,
  source = "upload",
) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Items array is empty or invalid");
  }

  // ── 1. Determinar campos editables ───────────────────────────────────────
  const editableFields = {};
  for (const [field, perm] of Object.entries(fieldPermissions)) {
    if (perm && perm.isReadOnly === false) {
      editableFields[field] = perm;
    }
  }

  const editableKeys = Object.keys(editableFields);
  if (editableKeys.length === 0) {
    throw new Error("No editable fields found in field permissions");
  }

  console.log("editable fields", editableKeys);

  // ── 2. Fetch records de Dataverse en paralelo y hacer diff ───────────────
  const validationWarnings = [];
  const skipped = [];
  const operations = [];

  const results = await Promise.all(
    items.map(async (item) => {
      const { id, table, __rowIndex, ...uploadFields } = item;

      if (!id || !table) {
        return {
          type: "error",
          data: {
            rowIndex: __rowIndex,
            id,
            table,
            status: 400,
            detail: "Missing 'id' or 'table'",
          },
        };
      }

      // Fetch el record actual de Dataverse
      let currentRecord;
      try {
        currentRecord = await fetchRecord(table, id);
      } catch (err) {
        return {
          type: "error",
          data: {
            rowIndex: __rowIndex,
            id,
            table,
            status: 404,
            detail: `Failed to fetch record: ${err.message}`,
          },
        };
      }

      // Comparar solo los campos editables
      const changedFields = {};
      const changeEntries = []; // Para change history
      for (const field of editableKeys) {
        // Solo procesar si el campo viene en el upload
        if (!(field in uploadFields)) continue;

        const newVal = uploadFields[field];
        const oldVal = currentRecord[field];

        if (!hasValueChanged(oldVal, newVal)) continue;

        // Validar si tiene regla de validación
        const perm = editableFields[field];
        if (perm.validationRule) {
          const { valid, message } = validateFieldValue(
            newVal,
            perm.validationRule,
          );
          if (!valid) {
            validationWarnings.push({
              rowIndex: __rowIndex,
              id,
              table,
              field,
              value: newVal,
              message,
            });
            continue; // No incluir este campo en el PATCH
          }
        }

        changedFields[field] = newVal;

        // Registrar para change history
        changeEntries.push({
          cr6c3_notificationid: currentRecord.cr6c3_notificationid || "",
          cr6c3_field: field,
          cr6c3_oldvalue: oldVal == null ? "" : String(oldVal),
          cr6c3_newvalue: newVal == null ? "" : String(newVal),
          cr6c3_changeby: changedBy,
          cr6c3_supplier: getSupplierNameFromTable(table),
          cr6c3_source: source,
          cr6c3_status: "170260000", // auto-approved
        });
      }

      // Si no hay cambios reales, skip
      if (Object.keys(changedFields).length === 0) {
        return {
          type: "skipped",
          data: { rowIndex: __rowIndex, id, table },
        };
      }

      // Stagear la operación PATCH + change entries
      return {
        type: "operation",
        data: {
          method: "PATCH",
          path: `/${table}(${id})`,
          body: changedFields,
          __meta: { rowIndex: __rowIndex, id, table },
          changeEntries,
        },
      };
    }),
  );

  // ── 3. Clasificar resultados ─────────────────────────────────────────────
  const errors = [];
  const patchOps = [];

  for (const r of results) {
    if (r.type === "error") errors.push(r.data);
    else if (r.type === "skipped") skipped.push(r.data);
    else if (r.type === "operation") patchOps.push(r.data);
  }

  // ── 4. Batch de Change Histories (POST) ───────────────────────────────────
  let totalChangeHistories = 0;

  if (patchOps.length > 0) {
    // Recolectar todos los change entries de todas las operaciones
    const allChangeEntries = patchOps.flatMap((op) => op.changeEntries || []);

    if (allChangeEntries.length > 0) {
      const historyChunks = [];
      for (let i = 0; i < allChangeEntries.length; i += BATCH_CHUNK_SIZE) {
        historyChunks.push(allChangeEntries.slice(i, i + BATCH_CHUNK_SIZE));
      }

      const historyResults = await Promise.all(
        historyChunks.map((chunk) => {
          const ops = chunk.map((entry, idx) => ({
            method: "POST",
            path: "/cr6c3_changehistories",
            body: entry,
            contentId: idx + 1,
          }));
          return dataverseBatch(ops);
        }),
      );

      for (const result of historyResults) {
        if (result.ok && result.responses.length === 0) {
          totalChangeHistories += allChangeEntries.length;
        } else {
          for (const sub of result.responses) {
            if (sub.status >= 200 && sub.status < 300) {
              totalChangeHistories++;
            }
            // No bloquear el update si falla un change history
          }
          if (result.ok && result.responses.length === 0) {
            // fallback cuando no hay sub-responses
          }
        }
      }

      console.log(
        `Change histories created: ${totalChangeHistories}/${allChangeEntries.length}`,
      );
    }
  }

  // ── 5. Ejecutar batch con las operaciones de PATCH ───────────────────────
  let totalUpdated = 0;

  if (patchOps.length > 0) {
    const chunks = [];
    for (let i = 0; i < patchOps.length; i += BATCH_CHUNK_SIZE) {
      chunks.push(patchOps.slice(i, i + BATCH_CHUNK_SIZE));
    }

    const batchResults = await Promise.all(
      chunks.map((chunk) => {
        const ops = chunk.map((op, idx) => ({
          method: op.method,
          path: op.path,
          body: op.body,
          contentId: idx + 1,
        }));
        return dataverseBatch(ops).then((result) => ({ result, chunk }));
      }),
    );

    // Consolidar resultados del batch
    for (const { result, chunk } of batchResults) {
      if (result.ok && result.responses.length === 0) {
        totalUpdated += chunk.length;
        continue;
      }

      if (!result.ok && result.responses.length === 0) {
        for (const op of chunk) {
          errors.push({
            rowIndex: op.__meta.rowIndex,
            id: op.__meta.id,
            table: op.__meta.table,
            status: result.status,
            detail: `Batch failed with status ${result.status}`,
          });
        }
        continue;
      }

      for (const sub of result.responses) {
        const idx = parseInt(sub.contentId, 10) - 1;
        const op = chunk[idx];

        if (sub.status >= 200 && sub.status < 300) {
          totalUpdated++;
        } else {
          const errorBody = sub.body?.error || sub.body || {};
          errors.push({
            rowIndex: op?.__meta?.rowIndex,
            id: op?.__meta?.id,
            table: op?.__meta?.table,
            status: sub.status,
            statusText: sub.statusText,
            code: errorBody.code || null,
            detail: errorBody.message || `${sub.status} ${sub.statusText}`,
            innerError: errorBody.innererror || null,
          });
        }
      }

      if (result.ok && result.responses.length < chunk.length) {
        totalUpdated += chunk.length - result.responses.length;
      }
    }
  }

  return {
    totalReceived: items.length,
    totalUpdated,
    totalSkipped: skipped.length,
    totalErrors: errors.length,
    totalValidationWarnings: validationWarnings.length,
    totalChangeHistories,
    skipped,
    validationWarnings,
    errors,
  };
}

export const createChangeHistory = async (changeData) => {
  try {
    const response = await dataverseFetch("/cr6c3_changehistories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(changeData),
    });

    if (!response.ok) {
      throw new Error(
        `Error en la solicitud a Dataverse: ${response.status} ${response.statusText}`,
      );
    }
    const data = await response.json();

    return data;
  } catch (error) {
    throw new Error(`Error al crear el historial de cambios: ${error.message}`);
  }
};
