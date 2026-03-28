const express = require("express");
const router = express.Router();
const { pool } = require("../db/database");
const authMiddleware = require("../middleware/auth");
const { sendNewOrderNotification, sendRefundEmail } = require("../services/email");

// POST /api/orders — passer une commande (public)
router.post("/", async (req, res) => {
  try {
    const {
      customer_id, customer_name, customer_phone, customer_address,
      items, payment_method, payment_ref, notes, transaction_id,
    } = req.body;

    const cleanName = (customer_name || "").trim();
    const cleanPhone = (customer_phone || "").trim();

    if (!cleanName || !cleanPhone || !items || items.length === 0) {
      return res.status(400).json({ error: "Informations de commande incomplètes." });
    }

    // Validation basique du numéro de téléphone (chiffres, +, espaces, tirets)
    if (!/^[+\d\s\-()]{6,20}$/.test(cleanPhone)) {
      return res.status(400).json({ error: "Numéro de téléphone invalide." });
    }

    // Validation des articles
    for (const item of items) {
      if (!item.id || !item.price || !item.quantity || item.quantity < 1 || item.price < 0) {
        return res.status(400).json({ error: "Un ou plusieurs articles sont invalides." });
      }
    }

    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // ── Vérification du stock ────────────────────────────────
    for (const item of items) {
      if (!item.id || !item.quantity || item.quantity < 1) continue;
      const stockCheck = await pool.query(
        "SELECT name, stock FROM products WHERE id = $1",
        [item.id]
      );
      if (stockCheck.rows.length === 0) continue; // produit inconnu, on laisse passer
      const product = stockCheck.rows[0];
      if (product.stock !== null && product.stock < item.quantity) {
        return res.status(400).json({
          error: `Stock insuffisant pour "${product.name}". Stock disponible : ${product.stock}.`,
        });
      }
    }

    // On utilise customer_id seulement s'il est valide (évite les erreurs FK)
    let validCustomerId = null;
    if (customer_id) {
      try {
        const check = await pool.query("SELECT id FROM customers WHERE id = $1", [customer_id]);
        if (check.rows.length > 0) validCustomerId = customer_id;
      } catch (_) {}
    }

    // ── Statuts initiaux selon le mode de paiement ──────────────
    // cash     → confirmée d'emblée (paiement à la livraison, pas de vérification requise)
    // whatsapp → en attente (Agnès doit confirmer manuellement)
    // OM/Wave/Carte → en attente (paiement non encore reçu ou non vérifié)
    const method = payment_method || "whatsapp";
    const initialStatus =
      method === "cash" ? "confirmée" : "en attente";
    const initialPaymentStatus =
      method === "cash" ? "à la livraison"
      : method === "whatsapp" ? "à la livraison"
      : "en attente paiement"; // OM, Wave, Carte → paiement non encore confirmé

    const result = await pool.query(
      `INSERT INTO orders
         (customer_id, customer_name, customer_phone, customer_address, items, total,
          payment_method, payment_ref, transaction_id, payment_status, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        validCustomerId,
        cleanName,
        cleanPhone,
        (customer_address || "").trim(),
        JSON.stringify(items),
        total,
        method,
        payment_ref || null,
        transaction_id || null,
        initialPaymentStatus,
        initialStatus,
        notes || null,
      ]
    );

    // ── Décrémentation du stock ──────────────────────────────
    for (const item of items) {
      if (!item.id || !item.quantity) continue;
      await pool.query(
        "UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id = $2 AND stock IS NOT NULL",
        [item.quantity, item.id]
      );
    }

    // Notification email à l'admin (non-bloquant)
    sendNewOrderNotification(result.rows[0]).catch(() => {});

    res.status(201).json({ message: "Commande enregistrée !", order: result.rows[0] });
  } catch (err) {
    console.error("❌ Erreur création commande:", err.message);
    res.status(500).json({ error: "Erreur serveur : " + err.message });
  }
});

// PATCH /api/orders/:id/payment — confirmer le paiement (public, appelé par le frontend après CinetPay)
router.patch("/:id/payment", async (req, res) => {
  try {
    const { payment_status, payment_ref, transaction_id } = req.body;
    const result = await pool.query(
      `UPDATE orders SET
        payment_status = COALESCE($1, payment_status),
        payment_ref    = COALESCE($2, payment_ref),
        transaction_id = COALESCE($3, transaction_id),
        status = CASE WHEN $1 = 'payée' THEN 'confirmée' ELSE status END
       WHERE id = $4 RETURNING *`,
      [payment_status || null, payment_ref || null, transaction_id || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Commande introuvable." });
    res.json({ message: "Paiement mis à jour.", order: result.rows[0] });
  } catch (err) {
    console.error("❌ Erreur mise à jour paiement:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders — toutes les commandes (admin)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { status, payment_method, payment_status } = req.query;
    let query = "SELECT * FROM orders";
    const params = [];
    const conditions = [];

    if (status) { conditions.push(`status = $${params.length + 1}`); params.push(status); }
    if (payment_method) { conditions.push(`payment_method = $${params.length + 1}`); params.push(payment_method); }
    if (payment_status) { conditions.push(`payment_status = $${params.length + 1}`); params.push(payment_status); }
    if (conditions.length) query += " WHERE " + conditions.join(" AND ");
    query += " ORDER BY created_at DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/stats — statistiques (admin)
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const [total, revenue, today, pending, paid] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM orders"),
      pool.query("SELECT COALESCE(SUM(total), 0) as revenue FROM orders WHERE status NOT IN ('annulée')"),
      pool.query("SELECT COUNT(*) FROM orders WHERE created_at::date = CURRENT_DATE"),
      pool.query("SELECT COUNT(*) FROM orders WHERE status = 'en attente'"),
      pool.query("SELECT COUNT(*) FROM orders WHERE payment_status = 'payée'"),
    ]);
    res.json({
      total_orders: parseInt(total.rows[0].count),
      total_revenue: parseInt(revenue.rows[0].revenue),
      orders_today: parseInt(today.rows[0].count),
      pending_orders: parseInt(pending.rows[0].count),
      paid_orders: parseInt(paid.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id (admin)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM orders WHERE id = $1", [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: "Commande introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/status (admin)
router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    const { status, payment_status } = req.body;
    const validStatuses = ["en attente", "confirmée", "expédiée", "livrée", "annulée"];
    const validPayments = ["en attente", "en attente paiement", "payée", "remboursée", "à la livraison"];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: "Statut commande invalide." });
    }
    if (payment_status && !validPayments.includes(payment_status)) {
      return res.status(400).json({ error: "Statut paiement invalide." });
    }

    const result = await pool.query(
      `UPDATE orders SET
        status         = COALESCE($1, status),
        payment_status = COALESCE($2, payment_status)
       WHERE id = $3 RETURNING *`,
      [status || null, payment_status || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Commande introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders/:id/refund — annuler et rembourser (admin)
router.post("/:id/refund", authMiddleware, async (req, res) => {
  try {
    const { reason, refund_method, refund_number, customer_email } = req.body;
    const { id } = req.params;

    // Récupérer la commande avant modification
    const existing = await pool.query("SELECT * FROM orders WHERE id = $1", [id]);
    if (!existing.rows.length) return res.status(404).json({ error: "Commande introuvable." });
    const order = existing.rows[0];

    if (order.status === "annulée") {
      return res.status(400).json({ error: "Cette commande est déjà annulée." });
    }

    const refundNote = [
      reason ? `Motif : ${reason}` : null,
      refund_method ? `Remboursement via : ${refund_method}` : null,
      refund_number ? `Numéro : ${refund_number}` : null,
    ].filter(Boolean).join(" | ");

    // Mettre à jour la commande
    const result = await pool.query(
      `UPDATE orders SET
        status = 'annulée',
        payment_status = 'remboursée',
        refund_notes = $1,
        customer_email = COALESCE($2, customer_email)
       WHERE id = $3 RETURNING *`,
      [refundNote || null, customer_email || null, id]
    );

    const updatedOrder = result.rows[0];

    // Envoyer l'email de remboursement au client (non bloquant)
    sendRefundEmail(updatedOrder, {
      reason,
      refundMethod: refund_method,
      refundNumber: refund_number,
      customerEmail: customer_email || updatedOrder.customer_email,
    }).catch(() => {});

    res.json({
      message: "Commande annulée et remboursement enregistré.",
      order: updatedOrder,
    });
  } catch (err) {
    console.error("❌ Erreur remboursement :", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/orders/:id (admin)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM orders WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: "Commande introuvable." });
    res.json({ message: "Commande supprimée." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
