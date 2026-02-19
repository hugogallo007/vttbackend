import { Router } from "express";
import {
  createProblemCountry,
  deleteProblemCountry,
  deleteproblemCountryByName,
  findProblemCountryByName,
  getProblemCountries,
  updateProblemCountry,
} from "../services/dataverseService.js";
const router = Router();

router.get("/", async (req, res) => {
  try {
    const response = await getProblemCountries();
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const response = await findProblemCountryByName(name);
    if (response) {
      res.status(200).json(response);
    } else {
      res.status(404).json({ error: "Problem Country Not Found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const countryData = req.body;
    const existingCountry = await findProblemCountryByName(
      countryData.cr673_country,
    );
    if (existingCountry) {
      return res.status(400).json({ error: "Problem Country Already Exists" });
    }
    const response = await createProblemCountry(countryData);
    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/delete", async (req, res) => {
  const { id } = req.body;
  try {
    const response = await deleteProblemCountry(id);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/deleteByName", async (req, res) => {
  const { name } = req.body;
  try {
    const response = await deleteproblemCountryByName(name);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const countryData = req.body;
  try {
    const response = await updateProblemCountry(id, countryData);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
