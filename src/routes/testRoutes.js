import { Router } from "express";
import { getChangeHistory } from "../services/dataverseService.js";

const router = Router();

router.get("/", (req, res) => {
  res.json({ message: "Test route is working!" });
});

router.get("/change-history", async (req, res) => {
  const response = await getChangeHistory();
  if (response) {
    return res.json(response);
  }

  res.json({ message: "Change history route is working!" });
});

export default router;
