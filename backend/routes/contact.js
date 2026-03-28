const express = require("express");
const router = express.Router();
const pool = require("../db/database").pool;
const { sendContactNotification } = require("../services/email");
const jwt = require("jsonwebtoken");

// ── Middleware admin ──────────────────────────────────────────
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Non autorisé" });
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    if (!payload.isAdmin) return res.status(403).json({ error: "Accès refusé" });
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token invalide" });
  }
}

// ── POST /api/contact — Envoyer un message (public) ──────────
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ error: "Nom, email et message sont requis." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Email invalide." });
    }

    const result = await pool.query(
      `INSERT INTO contact_messages (name, email, phone, subject, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name.trim(), email.trim().toLowerCase(), phone?.trim() || null, subject?.trim() || null, message.trim()]
    );

    const msg = result.rows[0];

    // Notification email admin (non bloquant)
    sendContactNotification(msg).catch(() => {});

    res.status(201).json({ success: true, message: "Message envoyé avec succès." });
  } catch (err) {
    console.error("Erreur contact:", err.message);
    res.status(500).json({ error: "Erreur lors de l'envoi du message." });
  }
});

// ── GET /api/contact — Liste des messages (admin) ─────────────
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM contact_messages ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur liste messages:", err.message);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ── PATCH /api/contact/:id/read — Marquer comme lu (admin) ────
router.patch("/:id/read", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE contact_messages SET is_read = true WHERE id = $1`,
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ── DELETE /api/contact/:id — Supprimer un message (admin) ────
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await pool.query(`DELETE FROM contact_messages WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
