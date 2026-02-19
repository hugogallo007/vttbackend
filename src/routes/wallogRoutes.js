// routes/recordsRoutes.js
import express from "express";
import requirePortalAccessToken from "../middlewares/requirePortalIdToken.js"; // el que ya te funciona
import { resolveAccessFromEmail } from "../auth/resolveAccess.js";

import {
  listAdminRecords,
  listSupplierRecords,
  listAllSupplierRecords,
  listAllAdminRecords,
  getFieldsPermissions,
  batchUpdateRecords,
  supplierBatchUpdate,
} from "../services/dataverseService.js";
import { VIEWS } from "../config/supplierViews.js";
import { findOwner, OWNERS } from "../config/ownerConfig.js";
import ExcelService from "../utils/excelUtils.js";

const router = express.Router();

router.get("/records", requirePortalAccessToken, async (req, res) => {
  try {
    const email =
      req.user?.unique_name ||
      req.user?.preferred_username ||
      req.user?.upn ||
      req.user?.email;
    console.log(email);

    const access = resolveAccessFromEmail(email);

    if (access.kind === "deny") {
      return res.status(403).json({ error: "Forbidden: user not allowed" });
    }

    const pageSize = Math.min(
      Math.max(Number(req.query.pageSize) || 100, 1),
      500,
    );
    const cursor = req.query.cursor ? String(req.query.cursor) : null;

    const filters = {
      from: req.query.from ? String(req.query.from) : null,
      to: req.query.to ? String(req.query.to) : null,
      q: req.query.searchTerm ? String(req.query.searchTerm) : null,
      status: req.query.status ? String(req.query.status) : null,
    };

    // Filtro por owner (DC, GCO, SI, RMS)
    const ownerParam = req.query.owner ? String(req.query.owner) : null;
    let owner = null;
    if (ownerParam) {
      owner = findOwner(ownerParam);
      if (!owner) {
        return res.status(400).json({
          error: `Invalid owner: ${ownerParam}. Valid values: ${OWNERS.map((o) => o.id).join(", ")}`,
        });
      }
    }

    // Filtro para admin: permite consultar una tabla específica de supplier
    const parentManufacturer = req.query.parentManufacturer
      ? String(req.query.parentManufacturer)
      : null;

    // (Opcional) Para que el frontend pueda mostrar "X resultados" al aplicar filtros:
    const includeCount = req.query.includeCount === "true";

    if (access.kind === "supplier") {
      const view = access.view;

      const out = await listSupplierRecords({
        table: view.table,
        select: view.select,
        orderby: `createdon desc,${view.idField} desc`,
        pageSize,
        cursor,
        filters,
        includeCount,
        owner,
      });

      return res.json({
        mode: "supplier",
        view: view.key,
        items: out.items,
        nextCursor: out.nextCursor,
        count: out.count,
      });
    }

    // admin: une las 4 tablas o consulta una específica según parentManufacturer
    try {
      const out = await listAdminRecords({
        views: VIEWS,
        pageSize,
        cursor,
        filters,
        includeCount,
        parentManufacturer,
        owner,
      });

      return res.json({
        mode: "admin",
        items: out.items,
        nextCursor: out.nextCursor,
        count: out.count,
      });
    } catch (validationError) {
      if (validationError.message.includes("Invalid parentManufacturer")) {
        return res.status(400).json({
          error: validationError.message,
        });
      }
      throw validationError; // Re-throw si no es error de validación
    }
  } catch (e) {
    return res.status(500).json({
      error: "Server error",
      details: e.message,
    });
  }
});

router.get("/download", requirePortalAccessToken, async (req, res) => {
  try {
    // ── 1. Resolver usuario desde el token de auth ──────────────────────────
    const email =
      req.user?.unique_name ||
      req.user?.preferred_username ||
      req.user?.upn ||
      req.user?.email;

    const access = resolveAccessFromEmail(email);

    if (access.kind === "deny") {
      return res.status(403).json({ error: "Forbidden: user not allowed" });
    }

    // ── 2. Parsear query params (mismos que GET /records) ───────────────────
    const filters = {
      from: req.query.from ? String(req.query.from) : null,
      to: req.query.to ? String(req.query.to) : null,
      q: req.query.searchTerm ? String(req.query.searchTerm) : null,
      status: req.query.status ? String(req.query.status) : null,
    };

    const ownerParam = req.query.owner ? String(req.query.owner) : null;
    let owner = null;
    if (ownerParam) {
      owner = findOwner(ownerParam);
      if (!owner) {
        return res.status(400).json({
          error: `Invalid owner: ${ownerParam}. Valid values: ${OWNERS.map((o) => o.id).join(", ")}`,
        });
      }
    }

    const parentManufacturer = req.query.parentManufacturer
      ? String(req.query.parentManufacturer)
      : null;

    // ── 3. Cargar TODOS los registros (sin paginación) ──────────────────────
    let records;

    if (access.kind === "supplier") {
      const view = access.view;

      records = await listAllSupplierRecords({
        table: view.table,
        select: view.select,
        orderby: `createdon desc,${view.idField} desc`,
        filters,
        owner,
      });
    } else {
      // admin
      try {
        records = await listAllAdminRecords({
          views: VIEWS,
          filters,
          parentManufacturer,
          owner,
        });
      } catch (validationError) {
        if (validationError.message.includes("Invalid parentManufacturer")) {
          return res.status(400).json({ error: validationError.message });
        }
        throw validationError;
      }
    }

    if (!records || records.length === 0) {
      return res.status(404).json({ error: "No records found to download" });
    }

    // ── 4. Obtener field permissions ────────────────────────────────────────
    const rawPermissions = await getFieldsPermissions();

    console.log("rawPermissions", rawPermissions);

    // Transformar a { fieldName: { isReadOnly: boolean } }
    // Cada value es un JSON string: '{"isReadOnly":true,...}' o null
    const fieldPermissions = {};
    if (rawPermissions && typeof rawPermissions === "object") {
      for (const [key, value] of Object.entries(rawPermissions)) {
        if (!key.startsWith("cr673_") || !value) continue;
        try {
          const parsed = typeof value === "string" ? JSON.parse(value) : value;
          fieldPermissions[key] = parsed;
        } catch {
          // Si no es JSON válido, ignorar el campo
        }
      }
    }

    // ── 5. Armar currentUser desde el token + access ────────────────────────
    const excelService = new ExcelService();

    const currentUser = {
      role: access.kind === "admin" ? "MS_ADMIN" : "SUPPLIER",
      name: req.user?.name || req.user?.given_name || email,
      organizationId:
        access.kind === "supplier" ? access.view.key : "microsoft",
    };

    console.log("fields permission", fieldPermissions);

    // ── 6. Generar Excel ────────────────────────────────────────────────────
    const result = await excelService.downloadExcelTemplateWithData(
      records,
      currentUser,
      fieldPermissions,
    );

    if (!result) {
      return res.status(500).json({ error: "Failed to generate Excel file" });
    }

    const { buffer, fileName } = result;

    // ── 7. Enviar como respuesta de descarga ────────────────────────────────
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", buffer.length);

    return res.send(buffer);
  } catch (e) {
    console.error("Download error:", e);
    return res.status(500).json({
      error: "Server error generating download",
      details: e.message,
    });
  }
});

// ── Upload (batch update) ───────────────────────────────────────────────────

router.post("/upload", requirePortalAccessToken, async (req, res) => {
  try {
    // ── 1. Resolver usuario ─────────────────────────────────────────────────
    const email =
      req.user?.unique_name ||
      req.user?.preferred_username ||
      req.user?.upn ||
      req.user?.email;

    const access = resolveAccessFromEmail(email);

    if (access.kind === "deny") {
      return res.status(403).json({ error: "Forbidden: user not allowed" });
    }

    // ── 2. Validar body ─────────────────────────────────────────────────────
    const items = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "Request body must be a non-empty array of records",
      });
    }

    // Validar que cada item tenga id y table
    for (const item of items) {
      if (!item.id || !item.table) {
        return res.status(400).json({
          error: `Record at rowIndex ${item.__rowIndex ?? "?"} is missing 'id' or 'table'`,
        });
      }
    }

    // ── 3. Ejecutar según rol ───────────────────────────────────────────────

    if (access.kind === "admin") {
      // Admin: batch con diff para change history
      const result = await batchUpdateRecords(items, email, "excel-upload");

      const statusCode = result.errors.length === 0 ? 200 : 207;
      return res.status(statusCode).json({
        message:
          result.errors.length === 0
            ? "All records updated successfully"
            : "Some records failed to update",
        totalReceived: items.length,
        totalUpdated: result.totalUpdated,
        totalChangeHistories: result.totalChangeHistories,
        totalErrors: result.errors.length,
        errors: result.errors,
      });
    }

    if (access.kind === "supplier") {
      // Supplier: validar campos editables, diff con Dataverse, validar reglas
      const rawPermissions = await getFieldsPermissions();

      const fieldPermissions = {};
      if (rawPermissions && typeof rawPermissions === "object") {
        for (const [key, value] of Object.entries(rawPermissions)) {
          if (!key.startsWith("cr673_") || !value) continue;
          try {
            const parsed =
              typeof value === "string" ? JSON.parse(value) : value;
            fieldPermissions[key] = parsed;
          } catch {
            // Si no es JSON válido, ignorar
          }
        }
      }

      const result = await supplierBatchUpdate(
        items,
        fieldPermissions,
        email,
        "upload",
      );

      const statusCode =
        result.totalErrors === 0 && result.totalValidationWarnings === 0
          ? 200
          : 207;

      return res.status(statusCode).json({
        message:
          result.totalErrors === 0
            ? "Upload processed successfully"
            : "Some records failed to update",
        ...result,
      });
    }

    return res.status(403).json({ error: "Forbidden" });
  } catch (e) {
    console.error("Upload error:", e);
    return res.status(500).json({
      error: "Server error processing upload",
      details: e.message,
    });
  }
});

export default router;
