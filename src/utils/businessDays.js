/**
 * Calcula los días hábiles (lunes–viernes) entre dos fechas.
 * Excluye fines de semana pero NO feriados.
 *
 * @param {Date} startDate - Fecha de inicio
 * @param {Date} endDate   - Fecha de fin
 * @returns {number} Cantidad de días hábiles entre ambas fechas
 */
export function calculateBusinessDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Normalizar a medianoche
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (end <= start) return 0;

  let count = 0;
  const current = new Date(start);
  current.setDate(current.getDate() + 1); // empezar desde el día siguiente

  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      // 0 = domingo, 6 = sábado
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Parsea un valor de fecha a objeto Date (local, sin timezone).
 *
 * @param {any} dateValue - string ISO, YYYY-MM-DD, o Date
 * @returns {Date|null}
 */
export function parseDate(dateValue) {
  if (!dateValue) return null;

  if (typeof dateValue === "string" && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateValue.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  // Formato ISO (YYYY-MM-DDTHH:mm:ss...) → extraer solo la fecha
  if (typeof dateValue === "string" && dateValue.includes("T")) {
    const datePart = dateValue.split("T")[0];
    if (datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = datePart.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
  }

  const date = new Date(dateValue + "T00:00:00"); // forzar local time
  return isNaN(date.getTime()) ? null : date;
}
