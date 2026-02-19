import cron from "node-cron";
import { runRCAStatusJob } from "../services/rcaService.js";

let isRunning = false;

/**
 * Ejecuta el job de RCA manualmente o desde el cron.
 * Evita ejecuciones simultáneas.
 */
export async function executeRCAJob() {
  if (isRunning) {
    console.log("[RCA Cron] El job ya está en ejecución, saltando...");
    return { skipped: true, reason: "Job already running" };
  }

  isRunning = true;
  try {
    const result = await runRCAStatusJob();
    return result;
  } catch (err) {
    console.error("[RCA Cron] Error fatal en el job:", err.message);
    return { error: err.message };
  } finally {
    isRunning = false;
  }
}

/**
 * Inicia el cron job que recalcula el RCA status diariamente a medianoche.
 * Cron: "0 0 * * *" = a las 00:00 todos los días.
 */
export function startRCACron() {
  const schedule = process.env.RCA_CRON_SCHEDULE || "0 0 * * *";

  cron.schedule(schedule, async () => {
    console.log(
      `[RCA Cron] Ejecutando job programado a las ${new Date().toISOString()}`,
    );
    await executeRCAJob();
  });

  console.log(`[RCA Cron] Programado con schedule: "${schedule}"`);
}
