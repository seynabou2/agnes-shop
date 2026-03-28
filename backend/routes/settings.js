const express = require("express");
const router = express.Router();
const { pool } = require("../db/database");
const authMiddleware = require("../middleware/auth");

// GET /api/settings — lire tous les paramètres (public pour certains)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT key, value FROM site_settings ORDER BY key");
    const settings = {};
    result.rows.forEach(row => { settings[row.key] = row.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings — mettre à jour les paramètres (admin)
router.put("/", authMiddleware, async (req, res) => {
  const updates = req.body; // { key: value, ... }
  try {
    for (const [key, value] of Object.entries(updates)) {
      await pool.query(
        `INSERT INTO site_settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, value]
      );
    }
    res.json({ message: "Paramètres mis à jour." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
