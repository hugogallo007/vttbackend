import { Router } from "express";
import { executeRCAJob } from "../jobs/rcaCron.js";

const router = Router();

/**
 * POST /rca-job/run
 * Dispara el cálculo de RCA status manualmente.
 * Protegido por el middleware requirePortalIdToken del server.
 */
router.post("/run", async (req, res) => {
  try {
    console.log("[RCA Route] Job disparado manualmente");
    const result = await executeRCAJob();

    if (result.skipped) {
      return res.status(409).json({
        message: "El job ya está en ejecución",
        ...result,
      });
    }

    if (result.error) {
      return res.status(500).json({
        message: "Error en la ejecución del job",
        ...result,
      });
    }

    return res.json({
      message: "Job completado exitosamente",
      ...result,
    });
  } catch (error) {
    console.error("[RCA Route] Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
