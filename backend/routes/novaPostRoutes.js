// backend/routes/novaPostRoutes.js
const express = require("express");
const router = express.Router();
const service = require("../services/novaPostService");

router.get("/cities", async (req, res) => {
  const { search } = req.query;
  try {
    const list = await service.getCities(search || "");
    res.json(list);
  } catch (e) {
    console.log("[NovaPost] cities error:", e?.message);
    res.status(500).json({ error: "Помилка отримання міст" });
  }
});

router.get("/warehouses/:cityRef", async (req, res) => {
  try {
    const list = await service.getWarehouses(req.params.cityRef);
    res.json(list);
  } catch (e) {
    console.log("[NovaPost] warehouses error:", e?.message);
    res.status(500).json({ error: "Помилка отримання відділень" });
  }
});

module.exports = router;
