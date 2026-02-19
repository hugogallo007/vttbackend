// config/supplierViews.js
export const VIEWS = [
  {
    key: "delta",
    domains: ["deltaww.com"], // o emails específicos
    table: "cr6c3_deltasuppliers",
    idField: "cr6c3_deltasupplierid",
    select: ["*"], // lo que renderizas
  },
  {
    key: "ingrasys",
    domains: ["fii-foxconn.com"],
    table: "cr6c3_ingrasyssuppliers",
    idField: "cr6c3_ingrasyssupplierid",
    select: ["*"],
  },
  {
    key: "quanta",
    domains: ["quantatw.com"],
    table: "cr6c3_quantasuppliers",
    idField: "cr6c3_quantasupplierid",
    select: ["*"],
  },
  {
    key: "ztsystems",
    domains: ["ztsystems.com", "flowintelli.com"],
    table: "cr6c3_ztsuppliers",
    idField: "cr6c3_ztsupplierid",
    select: ["*"],
  },
];

// admins por dominio
export const ADMIN_DOMAINS = new Set(
  (process.env.ADMIN_DOMAINS || "microsoft.com")
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/^@/, "")) // eliminar @ si existe
    .filter(Boolean),
);
