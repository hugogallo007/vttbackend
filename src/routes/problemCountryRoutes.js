import { Router } from "express";
import { getProblemCountries } from "../services/dataverseService.js";
const router = Router();

router.get("/", async (req, res) => {
  try {
    const response = await getProblemCountries();
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
