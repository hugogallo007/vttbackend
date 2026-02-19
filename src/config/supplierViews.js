// config/supplierViews.js
export const VIEWS = [
  {
    key: "delta",
    domains: ["deltaww.com"], // o emails específicos
    table: "cr673_deltasuppliers",
    idField: "cr673_deltasupplierid",
    select: ["*"], // lo que renderizas
  },
  {
    key: "ingrasys",
    domains: ["fii-foxconn.com"],
    table: "cr673_ingrasyssuppliers",
    idField: "cr673_ingrasyssupplierid",
    select: ["*"],
  },
  {
    key: "quanta",
    domains: ["quantatw.com"],
    table: "cr673_quantasuppliers",
    idField: "cr673_quantasupplierid",
    select: ["*"],
  },
  {
    key: "ztsystems",
    domains: ["ztsystems.com", "flowintelli.com"],
    table: "cr673_ztsuppliers",
    idField: "cr673_ztsupplierid",
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
