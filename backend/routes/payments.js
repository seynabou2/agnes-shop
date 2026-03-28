const express = require("express");
const router = express.Router();
const { pool } = require("../db/database");
const authMiddleware = require("../middleware/auth");

/**
 * POST /api/payments/cinetpay-webhook
 * Endpoint de notification CinetPay (IPN - Instant Payment Notification)
 * CinetPay envoie une requête POST à cette URL quand un paiement est confirmé.
 * À configurer dans le dashboard CinetPay comme "notify_url".
 *
 * En production, cette URL doit être publique (ex: https://votresite.com/api/payments/cinetpay-webhook)
 */
router.post("/cinetpay-webhook", async (req, res) => {
  try {
    const { cpm_trans_id, cpm_amount, cpm_site_id, cpm_payment_config, cpm_result } = req.body;

    // Vérifier que c'est bien une notification valide
    if (!cpm_trans_id) {
      return res.status(400).json({ error: "Transaction ID manquant" });
    }

    // cpm_result = "00" signifie succès
    const isSuccess = cpm_result === "00";
    const payment_status = isSuccess ? "payée" : "refusée";

    // Mettre à jour la commande correspondante
    // Le transaction_id dans notre DB correspond à cpm_trans_id (format: "Agnes-{orderId}-{timestamp}")
    const result = await pool.query(
      `UPDATE orders SET
        payment_status = $1,
        payment_ref    = $2,
        status         = CASE WHEN $1 = 'payée' THEN 'confirmée' ELSE status END
       WHERE transaction_id LIKE $3 RETURNING *`,
      [payment_status, cpm_trans_id, `${cpm_trans_id}%`]
    );

    if (!result.rows.length) {
      console.warn("⚠️ Webhook CinetPay: commande introuvable pour transaction", cpm_trans_id);
    } else {
      console.log(`✅ Webhook CinetPay: commande #${result.rows[0].id} mise à jour -> ${payment_status}`);
    }

    // CinetPay attend une réponse 200
    res.status(200).json({ message: "Webhook reçu." });
  } catch (err) {
    console.error("❌ Erreur webhook CinetPay:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/payments/verify/:transactionId
 * Vérification manuelle d'un paiement (appelable par le frontend)
 */
router.get("/verify/:transactionId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, status, payment_status, payment_method, total FROM orders WHERE transaction_id = $1",
      [req.params.transactionId]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "Transaction introuvable." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/payments/pending — commandes en attente de validation de paiement (admin)
 */
router.get("/pending", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM orders
       WHERE payment_method IN ('orange_money', 'wave', 'card')
         AND payment_status = 'en attente'
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
