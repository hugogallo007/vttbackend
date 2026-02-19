// config/ownerConfig.js
// ─────────────────────────────────────────────────────────────────
// Definición de owners y sus reglas de filtrado.
//
// Cada owner tiene:
//   - id / name:         identificador que llega como query param
//   - rcaIds:            valores base de cr673_rcastatus que le pertenecen
//                        (se aplican cuando reviewstatus NO es "Reviewed")
//   - remarkOverrides:   valores de cr673_gcoremark que transfieren un
//                        registro a este owner cuando reviewstatus ES
//                        "Reviewed"
//
// Lógica:
//   1. Si cr673_reviewstatus != "Reviewed" (o es null):
//      → el owner se determina por cr673_rcastatus según rcaIds.
//   2. Si cr673_reviewstatus == "Reviewed":
//      → el owner se determina por cr673_gcoremark según remarkOverrides.
//      → Si el remark mapea a "N/A" (vacío, Blank, Other), el registro
//        no pertenece a ningún owner.
//
// Para agregar un nuevo owner o regla, basta con editar este array.
// El filter builder lo toma automáticamente.
// ─────────────────────────────────────────────────────────────────

/** Campo de Dataverse que indica si el registro fue revisado */
export const REVIEW_STATUS_FIELD = "cr673_reviewstatus";
export const REVIEW_STATUS_REVIEWED = "Reviewed";

/** Campo de remark que determina el nuevo owner cuando está revisado */
export const REMARK_FIELD = "cr673_gcoremark";

export const OWNERS = [
  {
    id: "DC",
    name: "DC",
    rcaIds: [
      "rma-creation",
      "received-damaged",
      "consumption",
      "gr-dc",
      "disposition",
      "rvrs-load-id",
    ],
    remarkOverrides: [],
  },
  {
    id: "SI",
    name: "SI",
    rcaIds: ["rma-obtained", "fwd-load-id", "gr-si"],
    remarkOverrides: ["Pending GR @ SI"],
  },
  {
    id: "Logistics",
    name: "Logistics",
    rcaIds: ["fwd-shipment", "fwd-delivery", "rvrs-shipment", "rvrs-delivery"],
    remarkOverrides: ["Lost in Transit", "In transit"],
  },
  {
    id: "GCO",
    name: "GCO",
    rcaIds: ["discrepancy-sn", "reconciliation"],
    remarkOverrides: [
      "Lost at DC",
      "Returned to DC/DC to Reship",
      "DC Returned Wrong Part",
    ],
  },
  {
    id: "S3D",
    name: "S3D",
    rcaIds: [],
    remarkOverrides: [
      "Awaiting EOR/Export license",
      "Trade Exception. Microsoft responsibility",
    ],
  },
  {
    id: "SI OPS",
    name: "SI OPS",
    rcaIds: [],
    remarkOverrides: ["Trade Exception. SI responsibility"],
  },
];

/**
 * Buscar un owner por su id (case-insensitive).
 * @param {string} ownerId
 * @returns {object|null}
 */
export function findOwner(ownerId) {
  if (!ownerId) return null;
  const upper = ownerId.toUpperCase();
  return OWNERS.find((o) => o.id.toUpperCase() === upper) || null;
}
