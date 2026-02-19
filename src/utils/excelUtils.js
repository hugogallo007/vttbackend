import ExcelJS from "exceljs";

// ── Constantes a nivel de módulo ──────────────────────────────────────────────

const BOOLEAN_FIELDS = [
  "cr673_failedconsumableflag",
  "cr673_gpumanualwalflag",
  "cr673_outofstockflag",
  "cr673_outofwarrantyflag",
  "cr673_rmacancelledflag",
  "cr673_wtpflag",
  "cr673_damagedonarrival",
];

const DROPDOWN_FIELDS = {
  cr673_opsremark: [
    "",
    "Blank",
    "Closed",
    "Lost in-transit",
    "Lost in DC",
    "DC to action",
    "In transit",
    "Exception. Trade issue. Microsoft responsibility",
    "Exception. Trade issue. SI responsibility",
    "Exception. Others",
    "New Additions. GCO to action",
    "SI to acknowledge",
    "Others",
  ],
  cr673_gcoremark: [
    "",
    "Blank",
    "Physically Delivered, Not yet acknowledged by SI",
    "Physically Delivered, Closed by SI",
    "In transit",
    "Lost at DC",
    "Lost in Transit (SMF)",
    "Lost in Transit (MMF)",
    "Returned to DC/DC to Reship",
    "WAL Cancelled, Part Received",
    "Awaiting Shipment from DC",
    "Problem with In-Transit Shipment",
    "EOR/Export license",
    "Trade Issue: In-Transit",
    "Other",
    "DC Returned Wrong Part",
    "New",
  ],
};

// ── Clase ExcelService ────────────────────────────────────────────────────────

class ExcelService {
  /** Columnas predefinidas para suppliers en orden específico */
  SUPPLIER_EXCEL_COLUMNS = [
    "cr673_datacentercode",
    "cr673_datacenteroperationsregion",
    "cr673_facilityshortcode",
    "cr673_failedpartserialnumber",
    "cr673_failedpartserialnumberui",
    "cr673_reversetrackingnumber",
    "cr673_reversetrackingnumberui",
    "cr673_forwardtrackingnumber",
    "cr673_gputype",
    "cr673_gpumodel",
    "cr673_gcoremark",
    "cr673_siremark",
    "cr673_dispositiondate",
    "cr673_rmaobtaineddate",
    "cr673_datacenterreceiveddate",
    "cr673_partreceiptdate",
  ];

  // ── Métodos auxiliares ────────────────────────────────────────────────────

  /**
   * Determina si un campo es un "business field" de Dataverse.
   * Excluye campos de sistema, lookups internos, metadata OData, etc.
   * @param {string} key
   * @returns {boolean}
   */
  isBusinessField(key) {
    if (key.startsWith("@") || key.startsWith("_")) return false;
    if (key.endsWith("_value")) return false;
    if (key.includes("@odata") || key.includes("ODataType")) return false;

    const systemFields = [
      "statecode",
      "statuscode",
      "ownerid",
      "modifiedby",
      "createdby",
      "createdon",
      "modifiedon",
      "versionnumber",
      "importsequencenumber",
      "overriddencreatedon",
      "timezoneruleversionnumber",
      "utcconversiontimezonecode",
      "organizationid",
      "owningbusinessunit",
      "owningteam",
      "owninguser",
    ];
    if (systemFields.includes(key)) return false;

    // Solo campos cr673_* o "id"
    return key === "id" || key.startsWith("cr673_");
  }

  /**
   * Ordena columnas: id primero, cr673_notificationid segundo, resto alfabético.
   * @param {string[]} keys
   * @returns {string[]}
   */
  sortColumnsByPriority(keys) {
    const priority = [];
    const rest = [];

    for (const key of keys) {
      if (key === "id") {
        priority[0] = key;
      } else if (key === "cr673_notificationid") {
        priority[1] = key;
      } else {
        rest.push(key);
      }
    }

    rest.sort((a, b) => a.localeCompare(b));
    return [...priority.filter(Boolean), ...rest];
  }

  /**
   * Genera una etiqueta legible para una columna.
   * @param {string} key
   * @returns {string}
   */
  generateColumnLabel(key) {
    const specialMappings = {
      id: "Record ID",
      cr673_reverseactualcarrierunloaddatetime: "Delivered @ SI",
      cr673_notificationid: "Notification ID",
      cr673_wallog: "WALLOG",
      cr673_rma: "RMA",
      cr673_dc: "DC",
      cr673_region: "Region",
      cr673_gputype: "GPU Type",
      cr673_gpuparttype: "GPU Part Type",
      cr673_failedgpusn: "Failed GPU SN",
      cr673_valueinm: "Value ($M)",
      cr673_dcreceiveddate: "DC Received Date",
      cr673_agingbucket: "Aging Bucket",
      cr673_agingindays: "Aging Days",
      cr673_msf: "MSF",
      cr673_vpn: "VPN",
      cr673_returncarrierpersi: "Return Carrier SI",
      cr673_returnlabeltrackingpersi: "Return Label Tracking SI",
      cr673_mastertableid: "Master Table ID",
      cr673_name: "Name",
      cr673_rmaobtaineddate: "RMA Obtained Date",
      cr673_datacenterreceiveddate: "Datacenter Received Date",
      cr673_partreceiptdate: "Part Receipt Date",
      cr673_pickupdate: "Pickup Date",
      cr673_deliverydate: "Delivery Date",
      cr673_grdate: "GR Date",
      cr673_dispositiondate: "Disposition Date",
    };

    if (specialMappings[key]) return specialMappings[key];

    // Quitar prefijo cr673_, reemplazar _ con espacio, separar camelCase, capitalizar
    let label = key.replace(/^cr673_/, "");
    label = label.replace(/_/g, " ");
    label = label.replace(/([a-z])([A-Z])/g, "$1 $2");
    label = label
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    return label;
  }

  /**
   * Determina si un campo es de tipo fecha por su nombre.
   * @param {string} fieldName
   * @returns {boolean}
   */
  isDateField(fieldName) {
    const patterns = [
      /date$/i,
      /datetime$/i,
      /receiveddate$/i,
      /obtaineddate$/i,
      /receiptdate$/i,
      /pickupdate$/i,
      /deliverydate$/i,
      /grdate$/i,
      /dispositiondate$/i,
      /createdon$/i,
      /modifiedon$/i,
    ];
    return patterns.some((p) => p.test(fieldName));
  }

  /**
   * Determina si un campo es booleano.
   * @param {string} fieldName
   * @returns {boolean}
   */
  isBooleanField(fieldName) {
    return BOOLEAN_FIELDS.includes(fieldName) || /flag$/i.test(fieldName);
  }

  /**
   * Obtiene el nombre de la organización por ID.
   * @param {string} orgId
   * @returns {string}
   */
  getOrganizationName(orgId) {
    const map = {
      microsoft: "Microsoft",
      flowintelli: "FlowIntelli",
      ztsystems: "ZT_Systems",
      quantatw: "Quanta",
      "fii-foxconn": "Ingrasys",
      deltaww: "Delta",
    };
    return map[orgId] || orgId || "Unknown";
  }

  /**
   * Detecta el supplier mirando qué campo de ID existe en el record.
   * @param {object} record
   * @returns {string}
   */
  getSupplierNameFromRecord(record) {
    if (record.cr673_deltasupplierid) return "Delta";
    if (record.cr673_ingrasyssupplierid) return "Ingrasys";
    if (record.cr673_ztsupplierid) return "ZT_Systems";
    if (record.cr673_quantasupplierid) return "Quanta";
    return "Unknown";
  }

  /**
   * Extrae el ID lógico del record buscando en los 4 posibles campos de ID.
   * @param {object} record
   * @returns {string|null}
   */
  getRecordId(record) {
    return (
      record.cr673_deltasupplierid ||
      record.cr673_ztsupplierid ||
      record.cr673_ingrasyssupplierid ||
      record.cr673_quantasupplierid ||
      record.id ||
      null
    );
  }

  // ── Dropdowns ─────────────────────────────────────────────────────────────

  /**
   * Aplica validaciones dropdown usando una hoja oculta "Lists".
   * @param {ExcelJS.Workbook} workbook
   * @param {ExcelJS.Worksheet} sheet
   * @param {{ key: string; label: string }[]} tableHeaders
   * @param {number} lastRow
   * @param {number} extraRows
   */
  applyDropdownValidations(workbook, sheet, tableHeaders, lastRow, extraRows) {
    const listsSheet = workbook.addWorksheet("Lists", {
      state: "veryHidden",
    });

    let listCol = 1;

    for (const [field, options] of Object.entries(DROPDOWN_FIELDS)) {
      const colIndex = tableHeaders.findIndex((h) => h.key === field);
      if (colIndex === -1) continue;

      // Escribir opciones en la hoja oculta
      options.forEach((opt, rowIdx) => {
        listsSheet.getCell(rowIdx + 1, listCol).value = opt;
      });

      // Construir referencia al rango en la hoja oculta
      const startCell = listsSheet.getCell(1, listCol).address;
      const endCell = listsSheet.getCell(options.length, listCol).address;
      const formulae = `Lists!$${startCell.replace(/\d+/, "")}$1:$${endCell.replace(/\d+/, "")}$${options.length}`;

      // Aplicar validación a cada celda de la columna en el rango de datos
      const excelColIndex = colIndex + 1; // ExcelJS es 1-based
      for (let row = 2; row <= lastRow + extraRows; row++) {
        const cell = sheet.getCell(row, excelColIndex);
        cell.dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [formulae],
          errorStyle: "stop",
          showErrorMessage: true,
          showInputMessage: true,
          errorTitle: "Invalid Value",
          error: `Please select a value from the dropdown list.`,
          promptTitle: field,
          prompt: "Select a value from the list.",
        };
      }

      listCol++;
    }
  }

  // ── Función principal ─────────────────────────────────────────────────────

  /**
   * Genera un archivo Excel (.xlsx) con datos de registros
   * del portal de suppliers de Microsoft.
   *
   * @param {any[]} records - Los registros a incluir en el Excel.
   * @param {{ role: string; name?: string; organizationId?: string }} currentUser
   * @param {Record<string, { isReadOnly?: boolean }>} fieldPermissions
   * @returns {Promise<{ buffer: Buffer, fileName: string }>}
   */
  async downloadExcelTemplateWithData(
    records,
    currentUser,
    fieldPermissions = {},
  ) {
    if (!records || records.length === 0) return null;

    const isAdmin = currentUser.role === "MS_ADMIN";

    // ── PASO 1 – Determinar columnas según rol ──────────────────────────────

    let tableHeaders;

    if (isAdmin) {
      // Admin: mismas columnas fijas que supplier + columna "Supplier"
      const fixedCols = [
        "id",
        "cr673_notificationid",
        "supplier",
        ...this.SUPPLIER_EXCEL_COLUMNS,
      ];

      tableHeaders = fixedCols.map((key) => ({
        key,
        label: key === "supplier" ? "Supplier" : this.generateColumnLabel(key),
      }));
    } else {
      // Supplier: lista fija filtrada por existencia en el registro
      // "id" siempre se incluye (se resuelve desde el campo específico de cada tabla)
      const fixedCols = [
        "id",
        "cr673_notificationid",
        ...this.SUPPLIER_EXCEL_COLUMNS,
      ];
      const existingKeys = Object.keys(records[0]);
      const filteredCols = fixedCols.filter(
        (k) => k === "id" || existingKeys.includes(k),
      );

      tableHeaders = filteredCols.map((key) => ({
        key,
        label: this.generateColumnLabel(key),
      }));
    }

    // ── PASO 2 – Crear workbook y hoja ──────────────────────────────────────

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("WAL Records");

    sheet.columns = tableHeaders.map((col) => ({
      header: col.label,
      key: col.key,
      width: Math.max(col.label.length + 2, 15),
    }));

    // ── PASO 3 – Agregar filas de datos ─────────────────────────────────────

    for (const record of records) {
      const rowData = {};

      for (const col of tableHeaders) {
        const { key } = col;

        // Caso especial: columna "supplier" para admin
        if (key === "supplier" && isAdmin) {
          rowData[key] = this.getSupplierNameFromRecord(record);
          continue;
        }

        // Caso especial: columna "id" → resolver desde el campo específico de la tabla
        if (key === "id") {
          rowData[key] = this.getRecordId(record) || "";
          continue;
        }

        const value = record[key];

        if (value === null || value === undefined) {
          rowData[key] = "";
        } else if (value instanceof Date) {
          rowData[key] = value.toLocaleDateString();
        } else if (typeof value === "boolean") {
          rowData[key] = value ? "Yes" : "No";
        } else if (typeof value === "number") {
          rowData[key] = value;
        } else if (typeof value === "object") {
          rowData[key] =
            typeof value.toString === "function" &&
            value.toString() !== "[object Object]"
              ? value.toString()
              : JSON.stringify(value);
        } else {
          rowData[key] = String(value);
        }
      }

      sheet.addRow(rowData);
    }

    const lastRow = records.length + 1; // +1 por el header en fila 1

    // ── PASO 3.5 – Dropdowns con hoja oculta ───────────────────────────────

    this.applyDropdownValidations(workbook, sheet, tableHeaders, lastRow, 200);

    // ── PASO 3.5b – Comentarios en campos de fecha ──────────────────────────

    const dateNote =
      "Date Format: MM/DD/YYYY\n\nExample: 12/25/2024\nUse this format when entering dates.";

    for (let colIdx = 0; colIdx < tableHeaders.length; colIdx++) {
      const { key } = tableHeaders[colIdx];
      if (!this.isDateField(key)) continue;

      const excelCol = colIdx + 1;

      // Comentario en el encabezado (fila 1)
      const headerCell = sheet.getCell(1, excelCol);
      headerCell.note = {
        texts: [{ text: dateNote }],
        protection: { locked: "True", lockText: "True" },
      };

      // Comentario en cada celda de datos
      for (let row = 2; row <= lastRow; row++) {
        const dataCell = sheet.getCell(row, excelCol);
        dataCell.note = {
          texts: [{ text: dateNote }],
          protection: { locked: "False" },
        };
      }
    }

    // ── PASO 4 – Protección por columnas ────────────────────────────────────

    if (!isAdmin) {
      // 4.1) Desbloquear TODAS las celdas
      for (let row = 1; row <= lastRow + 200; row++) {
        for (let col = 1; col <= tableHeaders.length; col++) {
          const cell = sheet.getCell(row, col);
          cell.protection = { locked: false };
        }
      }

      // 4.2) Bloquear fila 1 (encabezados)
      for (let col = 1; col <= tableHeaders.length; col++) {
        const cell = sheet.getCell(1, col);
        cell.protection = { locked: true };
        cell.font = { bold: true };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD9D9D9" },
        };
      }

      // 4.3) Protección de columnas de datos
      for (let colIdx = 0; colIdx < tableHeaders.length; colIdx++) {
        const { key } = tableHeaders[colIdx];
        const excelCol = colIdx + 1;

        const isReadOnly =
          key === "id" ||
          (fieldPermissions[key] && fieldPermissions[key].isReadOnly === true);

        for (let row = 2; row <= lastRow + 200; row++) {
          const cell = sheet.getCell(row, excelCol);

          if (isReadOnly) {
            cell.protection = { locked: true };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF5F5F5" },
            };
          } else {
            cell.protection = { locked: false };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF3BB66B" },
            };
          }
        }
      }

      // 4.4) Proteger la hoja con contraseña
      await sheet.protect("supplierportal2025", {
        selectLockedCells: true,
        selectUnlockedCells: true,
        formatCells: false,
        formatColumns: false,
        formatRows: false,
        insertColumns: false,
        insertRows: true,
        deleteColumns: false,
        deleteRows: false,
        sort: true,
        autoFilter: true,
      });
    } else {
      // Admin: solo bold en encabezados, sin protección
      for (let col = 1; col <= tableHeaders.length; col++) {
        const cell = sheet.getCell(1, col);
        cell.font = { bold: true };
      }
    }

    // ── PASO 5 – Hoja de instrucciones (solo suppliers) ─────────────────────

    if (!isAdmin) {
      const instrSheet = workbook.addWorksheet("Instructions");

      const editableFields = tableHeaders
        .filter((h) => {
          if (h.key === "id") return false;
          return !(
            fieldPermissions[h.key] &&
            fieldPermissions[h.key].isReadOnly === true
          );
        })
        .map((h) => h.label);

      const readOnlyFields = tableHeaders
        .filter((h) => {
          return (
            h.key === "id" ||
            (fieldPermissions[h.key] &&
              fieldPermissions[h.key].isReadOnly === true)
          );
        })
        .map((h) => h.label);

      const orgName = this.getOrganizationName(currentUser.organizationId);
      const today = new Date().toISOString().split("T")[0];

      const instructions = [
        ["WAL Portal - Excel Template Instructions"],
        [],
        ["User Information"],
        ["Name:", currentUser.name || "N/A"],
        ["Organization:", orgName],
        ["Role:", currentUser.role],
        ["Date Generated:", today],
        [],
        ["Editable Fields (highlighted in green):"],
        ...editableFields.map((f) => [`  - ${f}`]),
        [],
        ["Read-Only Fields (highlighted in grey):"],
        ...readOnlyFields.map((f) => [`  - ${f}`]),
        [],
        ["Notes:"],
        [
          "1. Do not modify the Record ID column. It is used to match records on import.",
        ],
        [
          "2. Read-only fields are protected and cannot be edited in this file.",
        ],
        [
          "3. Use the dropdown lists where available to ensure valid data entry.",
        ],
        ["4. Date fields must follow the format MM/DD/YYYY."],
        [
          "5. Do not rename, reorder, or delete columns. This may cause import errors.",
        ],
        ["6. You may add new rows at the bottom of the data if needed."],
      ];

      instructions.forEach((row) => {
        instrSheet.addRow(row);
      });

      // Estilo del título
      const titleCell = instrSheet.getCell(1, 1);
      titleCell.font = { bold: true, size: 14 };
      instrSheet.getColumn(1).width = 60;
      instrSheet.getColumn(2).width = 30;
    }

    // ── PASO 6 – Generar buffer ─────────────────────────────────────────────

    const orgName = this.getOrganizationName(currentUser.organizationId);
    const roleLabel = isAdmin ? "Admin" : "Supplier";
    const dateStamp = new Date().toISOString().split("T")[0];
    const fileName = `WAL_Template_${roleLabel}_${orgName}_${dateStamp}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();

    return { buffer: Buffer.from(buffer), fileName };
  }
}

export default ExcelService;
export { BOOLEAN_FIELDS, DROPDOWN_FIELDS };
