import { calculateBusinessDays, parseDate } from "../utils/businessDays.js";
import { dataverseFetch, dataverseBatch } from "./dataverseClient.js";
import { dvJson } from "../utils/jsonHelper.js";
import { VIEWS } from "../config/supplierViews.js";

// ── Columnas necesarias para el cálculo de RCA ─────────────────────────────

const RCA_SELECT_FIELDS = [
  "cr673_rmacancelledflag",
  "cr673_forwardactualshipdatetime",
  "cr673_dispositiontype",
  "cr673_creationtimestamp",
  "cr673_rmarequestdate",
  "cr673_rmaobtaineddate",
  "cr673_forwardlogformmaterialreadinessda",
  "cr673_forwardlogformactualdeliverydate",
  "cr673_partreceiptdate",
  "cr673_usagenotificationposteddate",
  "cr673_dispositiondate",
  "cr673_reversematerialreadinessdatemmfre",
  "cr673_reverseactualshipdatetime",
  "cr673_reverseactualcarrierunloaddatetime",
  "cr673_goodsreceiptconfirmationdate",
  "cr673_damagedonarrival",
  "cr673_notificationid",
  "cr673_datacentercode",
  "cr673_outofstockflag",
  "cr673_rcastatus",
];

// ── Helpers para cargar datos auxiliares ─────────────────────────────────────

/**
 * Carga todos los SN disputes pendientes de la tabla changehistories.
 * Retorna un Set de notificationIds.
 */
async function loadSNDisputes() {
  const filter =
    "(cr673_field eq 'cr673_failedpartserialnumber' or cr673_field eq 'cr673_sparepartserialnumber') and cr673_status eq 170260000";
  const select = "cr673_notificationid";

  let allIds = [];
  let endpoint = `/cr673_changehistories?$select=${select}&$filter=${encodeURIComponent(filter)}`;

  // Paginar todos los resultados
  while (endpoint) {
    const { data } = await dvJson(endpoint);
    const ids = (data.value || [])
      .map((r) => r.cr673_notificationid)
      .filter((id) => typeof id === "string" && id.length > 0);
    allIds.push(...ids);
    endpoint = data["@odata.nextLink"] || null;
  }

  return new Set(allIds);
}

/**
 * Carga los datacenter codes de países problemáticos.
 * 1. Obtiene countries de cr673_problemcountries
 * 2. Busca datacenters cuyo cr673_country esté en ese set
 * 3. Retorna un Set de cr673_centercode (lowercase)
 */
async function loadProblemDataCenterCodes() {
  // 1. Obtener países problemáticos
  const { data: countriesData } = await dvJson(
    "/cr673_problemcountries?$select=cr673_country",
  );
  const countries = (countriesData.value || [])
    .map((r) => r.cr673_country)
    .filter(Boolean);

  if (countries.length === 0) return new Set();

  // 2. Construir filtro para datacenters
  const countryFilter = countries
    .map((c) => `cr673_country eq '${c.replace(/'/g, "''")}'`)
    .join(" or ");
  const dcFilter = encodeURIComponent(countryFilter);

  let allCodes = [];
  let endpoint = `/cr673_datacenters?$select=cr673_centercode&$filter=${dcFilter}`;

  while (endpoint) {
    const { data } = await dvJson(endpoint);
    const codes = (data.value || [])
      .map((r) => r.cr673_centercode?.toLowerCase())
      .filter(Boolean);
    allCodes.push(...codes);
    endpoint = data["@odata.nextLink"] || null;
  }

  return new Set(allCodes);
}

// ── Determinación de categoría RCA ──────────────────────────────────────────

/**
 * Determina la categoría RCA para un registro individual.
 *
 * @param {object} record            - El record de Dataverse
 * @param {Set<string>} snDisputes   - IDs de notificaciones con SN disputes
 * @param {Set<string>} problemDCs   - Datacenter codes problemáticos (lowercase)
 * @returns {string|null} La categoría RCA o null
 */
export function determineRCACategory(record, snDisputes, problemDCs) {
  // Priority 1: RMA Cancelled check
  if (record.cr673_rmacancelledflag === true) {
    if (
      record.cr673_forwardactualshipdatetime !== null &&
      record.cr673_dispositiontype !== "Return & Unused"
    ) {
      return "reconciliation";
    } else {
      return null;
    }
  }

  const creationTimestamp = parseDate(record.cr673_creationtimestamp);
  const rmaRequestDate = parseDate(record.cr673_rmarequestdate);
  const rmaObtainedDate = parseDate(record.cr673_rmaobtaineddate);
  const forwardMaterialReadiness = parseDate(
    record.cr673_forwardlogformmaterialreadinessda,
  );
  const forwardActualShip = parseDate(record.cr673_forwardactualshipdatetime);
  const forwardActualDelivery = parseDate(
    record.cr673_forwardlogformactualdeliverydate,
  );
  const partReceiptDate = parseDate(record.cr673_partreceiptdate);
  const usageNotificationPosted = parseDate(
    record.cr673_usagenotificationposteddate,
  );
  const dispositionDate = parseDate(record.cr673_dispositiondate);
  const reverseMaterialReadiness = parseDate(
    record.cr673_reversematerialreadinessdatemmfre,
  );
  const reverseActualShip = parseDate(record.cr673_reverseactualshipdatetime);
  const reverseActualCarrierUnload = parseDate(
    record.cr673_reverseactualcarrierunloaddatetime,
  );
  const goodsReceiptConfirmation = parseDate(
    record.cr673_goodsreceiptconfirmationdate,
  );
  const damageOnArrival = record.cr673_damagedonarrival === true;

  // Evaluar RCA desde la más avanzada (14) a la menos (1)

  // 14. Discrepancy on S/N
  if (
    record.cr673_notificationid &&
    snDisputes.has(record.cr673_notificationid)
  ) {
    return "discrepancy-sn";
  }

  // GR @ SI (con GR confirmation)
  if (goodsReceiptConfirmation) {
    if (reverseActualCarrierUnload) {
      if (
        calculateBusinessDays(
          reverseActualCarrierUnload,
          goodsReceiptConfirmation,
        ) > 2
      ) {
        return "gr-si";
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  // 13. GR @ SI
  if (reverseActualCarrierUnload) {
    if (
      !goodsReceiptConfirmation ||
      (goodsReceiptConfirmation &&
        calculateBusinessDays(
          reverseActualCarrierUnload,
          goodsReceiptConfirmation,
        ) > 2)
    ) {
      return "gr-si";
    } else {
      return null;
    }
  }

  // 12. RVRS Delivery
  if (reverseActualShip) {
    if (
      !reverseActualCarrierUnload ||
      calculateBusinessDays(reverseActualShip, reverseActualCarrierUnload) > 2
    ) {
      return "rvrs-delivery";
    }
  }

  // 11. RVRS Shipment
  if (reverseMaterialReadiness) {
    const datacenterCode = record.cr673_datacentercode?.toLowerCase();
    const isProblemDataCenter = problemDCs.has(datacenterCode || "");
    const maxDays = isProblemDataCenter ? 10 : 3;

    if (!reverseActualShip) {
      if (
        calculateBusinessDays(reverseMaterialReadiness, new Date()) > maxDays
      ) {
        return "rvrs-shipment";
      }
    } else {
      if (
        calculateBusinessDays(reverseMaterialReadiness, reverseActualShip) >
        maxDays
      ) {
        return "rvrs-shipment";
      }
    }
  }

  // 10. RVRS Load ID
  if (dispositionDate) {
    if (
      !reverseMaterialReadiness ||
      calculateBusinessDays(dispositionDate, reverseMaterialReadiness) > 1
    ) {
      return "rvrs-load-id";
    }
  }

  // 9. Disposition
  if (damageOnArrival && forwardActualDelivery) {
    if (
      !dispositionDate ||
      calculateBusinessDays(forwardActualDelivery, dispositionDate) > 2
    ) {
      return "disposition";
    }
  } else if (!damageOnArrival && usageNotificationPosted) {
    if (record.cr673_outofstockflag === true) {
      if (
        !dispositionDate ||
        calculateBusinessDays(usageNotificationPosted, dispositionDate) > 1
      ) {
        return "disposition";
      }
    }
  }

  // 8. Consumption (skip if damaged on arrival)
  if (!damageOnArrival && partReceiptDate) {
    if (
      !usageNotificationPosted ||
      calculateBusinessDays(partReceiptDate, usageNotificationPosted) > 1
    ) {
      return "consumption";
    }
  }

  // 7. GR @ DC (skip if damaged on arrival)
  if (!damageOnArrival && forwardActualDelivery) {
    if (
      !partReceiptDate ||
      calculateBusinessDays(forwardActualDelivery, partReceiptDate) > 1
    ) {
      return "gr-dc";
    }
  }

  // 6. Received Damaged
  if (damageOnArrival) {
    return "received-damaged";
  }

  // 5. FWD Delivery
  if (forwardActualShip) {
    if (
      !forwardActualDelivery ||
      calculateBusinessDays(forwardActualShip, forwardActualDelivery) > 2
    ) {
      return "fwd-delivery";
    }
  }

  // 4. FWD Shipment
  if (forwardMaterialReadiness) {
    if (
      !forwardActualShip ||
      calculateBusinessDays(forwardMaterialReadiness, forwardActualShip) > 2
    ) {
      return "fwd-shipment";
    }
  }

  // RCA para outofstockflag
  if (usageNotificationPosted) {
    if (record.cr673_outofstockflag === false) {
      if (
        !forwardMaterialReadiness ||
        calculateBusinessDays(
          usageNotificationPosted,
          forwardMaterialReadiness,
        ) > 1
      ) {
        return "fwd-load-id";
      } else {
        return null;
      }
    }
  }

  // 3. FWD Load ID
  if (rmaObtainedDate) {
    if (
      !forwardMaterialReadiness ||
      calculateBusinessDays(rmaObtainedDate, forwardMaterialReadiness) > 1
    ) {
      return "fwd-load-id";
    }
  }

  // 2. Wallog Resolution
  if (rmaRequestDate) {
    if (
      !rmaObtainedDate ||
      calculateBusinessDays(rmaRequestDate, rmaObtainedDate) > 1
    ) {
      return "wallog-resolution";
    }
  }

  // 1. RMA Creation
  if (creationTimestamp) {
    if (
      !rmaRequestDate ||
      calculateBusinessDays(creationTimestamp, rmaRequestDate) > 1
    ) {
      return "rma-creation";
    }
  }

  return null; // No RCA issues found
}

// ── Fetch ALL records de una tabla con paginación ───────────────────────────

/**
 * Carga TODOS los records de una tabla con solo los campos necesarios para RCA.
 * @param {string} table  - Nombre de la tabla en Dataverse
 * @param {string} idField - Campo ID de la tabla
 * @returns {Array<object>}
 */
async function fetchAllRecordsForRCA(table, idField) {
  const selectFields = [...new Set([idField, ...RCA_SELECT_FIELDS])];
  const select = encodeURIComponent(selectFields.join(","));

  let allRecords = [];
  let endpoint = `/${table}?$select=${select}`;

  while (endpoint) {
    const { data } = await dvJson(endpoint, {
      headers: { Prefer: "odata.maxpagesize=5000" },
    });
    allRecords.push(...(data.value || []));
    endpoint = data["@odata.nextLink"] || null;
  }

  return allRecords;
}

// ── Ejecución del job ───────────────────────────────────────────────────────

const BATCH_SIZE = 1000; // Dataverse batch limit

/**
 * Ejecuta el cálculo de RCA para todas las tablas de suppliers.
 * Solo actualiza los records cuyo valor calculado difiere del actual.
 *
 * @returns {{ totalProcessed, totalUpdated, totalSkipped, errors, duration }}
 */
export async function runRCAStatusJob() {
  const startTime = Date.now();
  console.log("[RCA Job] Iniciando cálculo de RCA status...");

  // 1. Cargar datos auxiliares en paralelo
  console.log("[RCA Job] Cargando SN disputes y problem datacenter codes...");
  const [snDisputes, problemDCs] = await Promise.all([
    loadSNDisputes(),
    loadProblemDataCenterCodes(),
  ]);
  console.log(
    `[RCA Job] SN disputes: ${snDisputes.size}, Problem DCs: ${problemDCs.size}`,
  );

  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  const errors = [];

  // 2. Procesar cada tabla
  for (const view of VIEWS) {
    console.log(`[RCA Job] Procesando tabla: ${view.table}...`);

    let records;
    try {
      records = await fetchAllRecordsForRCA(view.table, view.idField);
    } catch (err) {
      console.error(`[RCA Job] Error cargando ${view.table}: ${err.message}`);
      errors.push({
        table: view.table,
        phase: "fetch",
        detail: err.message,
      });
      continue;
    }

    console.log(`[RCA Job] ${view.table}: ${records.length} records cargados`);
    totalProcessed += records.length;

    // 3. Calcular RCA y filtrar los que cambiaron
    const updates = [];

    for (const record of records) {
      const newRCA = determineRCACategory(record, snDisputes, problemDCs);
      const currentRCA = record.cr673_rcastatus || null;

      // Solo actualizar si el valor cambió
      if (newRCA !== currentRCA) {
        updates.push({
          id: record[view.idField],
          table: view.table,
          newRCA,
        });
      } else {
        totalSkipped++;
      }
    }

    console.log(
      `[RCA Job] ${view.table}: ${updates.length} records a actualizar, ${records.length - updates.length} sin cambios`,
    );

    // 4. Ejecutar updates en batches
    if (updates.length > 0) {
      const chunks = [];
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        chunks.push(updates.slice(i, i + BATCH_SIZE));
      }

      for (let ci = 0; ci < chunks.length; ci++) {
        const chunk = chunks[ci];
        console.log(
          `[RCA Job] ${view.table}: batch ${ci + 1}/${chunks.length} (${chunk.length} ops)`,
        );

        const ops = chunk.map((u, idx) => ({
          method: "PATCH",
          path: `/${u.table}(${u.id})`,
          body: { cr673_rcastatus: u.newRCA },
          contentId: idx + 1,
        }));

        try {
          const result = await dataverseBatch(ops);

          if (result.ok && result.responses.length === 0) {
            // Todas exitosas (Dataverse omite respuestas 204)
            totalUpdated += chunk.length;
          } else if (!result.ok && result.responses.length === 0) {
            // Fallo general del batch
            errors.push({
              table: view.table,
              phase: "batch",
              batch: ci + 1,
              status: result.status,
              detail: `Batch failed with status ${result.status}`,
            });
          } else {
            for (const sub of result.responses) {
              if (sub.status >= 200 && sub.status < 300) {
                totalUpdated++;
              } else {
                const idx = parseInt(sub.contentId, 10) - 1;
                const op = chunk[idx];
                errors.push({
                  table: view.table,
                  phase: "update",
                  id: op?.id,
                  status: sub.status,
                  detail:
                    sub.body?.error?.message ||
                    `${sub.status} ${sub.statusText}`,
                });
              }
            }

            // Si result.ok y hay menos responses que ops → las omitidas son 204
            if (result.ok && result.responses.length < chunk.length) {
              totalUpdated += chunk.length - result.responses.length;
            }
          }
        } catch (err) {
          console.error(
            `[RCA Job] Error en batch ${ci + 1} de ${view.table}: ${err.message}`,
          );
          errors.push({
            table: view.table,
            phase: "batch",
            batch: ci + 1,
            detail: err.message,
          });
        }
      }
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  const summary = {
    totalProcessed,
    totalUpdated,
    totalSkipped,
    totalErrors: errors.length,
    errors: errors.slice(0, 50), // limitar errores en el response
    durationSeconds: Number(duration),
    completedAt: new Date().toISOString(),
  };

  console.log(
    `[RCA Job] Completado en ${duration}s | Procesados: ${totalProcessed} | Actualizados: ${totalUpdated} | Sin cambios: ${totalSkipped} | Errores: ${errors.length}`,
  );

  return summary;
}
