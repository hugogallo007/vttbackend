import {
  REVIEW_STATUS_FIELD,
  REVIEW_STATUS_REVIEWED,
  REMARK_FIELD,
} from "../config/ownerConfig.js";

function escapeODataString(s = "") {
  return s.replace(/'/g, "''");
}

export function buildFilter({ from, to, q, status }) {
  const parts = [];

  if (from) parts.push(`createdon ge ${new Date(from).toISOString()}`);

  if (to) {
    const d = new Date(to);
    d.setDate(d.getDate() + 1);
    parts.push(`createdon lt ${d.toISOString()}`);
  }

  if (q?.trim()) {
    const term = escapeODataString(q.trim());
    // ajusta campos según tu tabla
    parts.push(`(contains(cr6c3_notificationid,'${term}'))`);
  }

  if (status) parts.push(`statuscode eq ${Number(status)}`);

  return parts.length ? parts.map((p) => `(${p})`).join(" and ") : null;
}

// ─────────────────────────────────────────────────────────────────
// Owner filter: genera el fragmento OData para filtrar por owner
// teniendo en cuenta el review status y remark overrides.
// ─────────────────────────────────────────────────────────────────

/**
 * Construye el filtro OData para un owner dado.
 *
 * Lógica:
 *   1. Registros cuyo cr6c3_rcastatus pertenece al owner Y cuyo
 *      reviewstatus NO es "Reviewed" (incluye null).
 *      → mantienen su owner base.
 *
 *   2. Registros cuyo reviewstatus ES "Reviewed" Y cuyo remark
 *      (cr6c3_gcoremark) mapea a este owner.
 *      → el remark sobreescribe el owner original.
 *
 *   Ambos grupos se unen con OR.
 *
 * @param {object} owner  - Objeto owner de ownerConfig.js
 * @returns {string|null}   Fragmento OData o null si no hay owner
 */
export function buildOwnerFilter(owner) {
  if (!owner) return null;

  const clauses = [];

  // ── 1) Registros base (RCA) que NO están revisados ──────────────────────
  if (owner.rcaIds && owner.rcaIds.length > 0) {
    const rcaClauses = owner.rcaIds.map(
      (id) => `cr6c3_rcastatus eq '${escapeODataString(id)}'`,
    );
    const rcaPart = `(${rcaClauses.join(" or ")})`;

    // "No revisado" = reviewstatus es null O distinto de "Reviewed"
    const notReviewed = `(${REVIEW_STATUS_FIELD} eq null or ${REVIEW_STATUS_FIELD} ne '${REVIEW_STATUS_REVIEWED}')`;

    clauses.push(`(${rcaPart} and ${notReviewed})`);
  }

  // ── 2) Registros revisados cuyo remark pertenece a este owner ───────────
  if (owner.remarkOverrides && owner.remarkOverrides.length > 0) {
    const remarkClauses = owner.remarkOverrides.map(
      (r) => `${REMARK_FIELD} eq '${escapeODataString(r)}'`,
    );
    const remarkPart = `(${remarkClauses.join(" or ")})`;

    const reviewed = `${REVIEW_STATUS_FIELD} eq '${REVIEW_STATUS_REVIEWED}'`;

    clauses.push(`(${reviewed} and ${remarkPart})`);
  }

  if (!clauses.length) return null;

  return `(${clauses.join(" or ")})`;
}
