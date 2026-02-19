import { Router } from "express";
import {
  createAllowedEmail,
  deleteAllowedEmail,
  getAllowedEmails,
  updateAllowedEmail,
} from "../services/dataverseService.js";
const router = Router();

router.get("/", async (req, res) => {
  try {
    const response = await getAllowedEmails();
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const emailData = req.body;
    const response = await createAllowedEmail(emailData);
    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const emailData = req.body;
  try {
    const response = await updateAllowedEmail(id, emailData);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const response = await deleteAllowedEmail(id);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
