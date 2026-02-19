// auth/resolveAccess.js
import { VIEWS, ADMIN_DOMAINS } from "../config/supplierViews.js";

export function resolveAccessFromEmail(emailRaw) {
  const email = (emailRaw || "").toLowerCase().trim();
  if (!email) return { kind: "deny" };

  const domain = email.split("@")[1] || "";

  // Verificar si es admin por dominio
  if (ADMIN_DOMAINS.has(domain)) {
    return { kind: "admin", views: VIEWS };
  }

  // Verificar si es supplier
  const view = VIEWS.find((v) => v.domains?.includes(domain));

  if (!view) return { kind: "deny" };
  return { kind: "supplier", view };
}
