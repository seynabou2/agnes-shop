const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { pool } = require("../db/database");
require("dotenv").config();

function customerAuthMiddleware(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Non connecté." });
  try {
    req.customer = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ error: "Session expirée, reconnecte-toi." });
  }
}

// POST /api/customers/register — Créer un compte client
router.post("/register", async (req, res) => {
  const { first_name, last_name, email, phone, address, password } = req.body;

  const cleanFirst = (first_name || "").trim();
  const cleanLast = (last_name || "").trim();
  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanPhone = (phone || "").trim();

  if (!cleanFirst || !cleanLast || !cleanEmail || !password) {
    return res.status(400).json({ error: "Prénom, nom, email et mot de passe sont obligatoires." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: "Adresse email invalide." });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères." });
  }

  try {
    const existing = await pool.query("SELECT id FROM customers WHERE email = $1", [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Un compte existe déjà avec cet email." });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO customers (first_name, last_name, email, phone, address, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, first_name, last_name, email, phone`,
      [cleanFirst, cleanLast, cleanEmail, cleanPhone || null, address?.trim() || null, password_hash]
    );

    const customer = result.rows[0];
    const token = jwt.sign(
      { id: customer.id, email: customer.email, role: "customer" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ message: "Compte créé !", customer, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers/login — Connexion client
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = (email || "").trim().toLowerCase();

  if (!cleanEmail || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }

  try {
    const result = await pool.query("SELECT * FROM customers WHERE email = $1", [cleanEmail]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }

    const customer = result.rows[0];
    const valid = await bcrypt.compare(password, customer.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }

    const token = jwt.sign(
      { id: customer.id, email: customer.email, role: "customer" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Connexion réussie.",
      customer: {
        id: customer.id,
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
        phone: customer.phone,
      },
      token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/me — Profil du client connecté
router.get("/me", customerAuthMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, first_name, last_name, email, phone, address, created_at FROM customers WHERE id = $1",
      [req.customer.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Compte introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/my-orders — Historique des commandes du client
router.get("/my-orders", customerAuthMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, items, total, status, payment_method, payment_status, refund_notes, created_at FROM orders WHERE customer_id = $1 ORDER BY created_at DESC",
      [req.customer.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers — Tous les clients (admin uniquement)
const authMiddleware = require("../middleware/auth");
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id, c.first_name, c.last_name, c.email, c.phone, c.address, c.created_at,
        COUNT(o.id) AS order_count,
        COALESCE(SUM(o.total), 0) AS total_spent
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id AND o.status != 'annulée'
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
