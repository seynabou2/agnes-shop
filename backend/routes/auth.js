const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// POST /api/auth/login
// Connexion admin avec mot de passe sécurisé
router.post("/login", async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: "Mot de passe requis." });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;

  // Comparaison directe (le mot de passe est en clair dans .env)
  if (password !== adminPassword) {
    return res.status(401).json({ error: "Mot de passe incorrect." });
  }

  // Générer un token JWT valide 8h
  const token = jwt.sign(
    { role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({
    message: "Connexion réussie.",
    token,
    expiresIn: "8h",
  });
});

// POST /api/auth/verify
// Vérifier si le token est encore valide
router.post("/verify", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ valid: false });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true });
  } catch {
    res.json({ valid: false });
  }
});

module.exports = router;
