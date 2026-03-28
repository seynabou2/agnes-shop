const nodemailer = require("nodemailer");
require("dotenv").config();

// Crée le transporteur SMTP (Gmail — port 587 STARTTLS)
function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,          // STARTTLS (port 587, non bloqué sur Render)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

const PAYMENT_LABELS = {
  orange_money: "Orange Money",
  wave: "Wave",
  card: "Carte bancaire",
  cash: "Paiement à la livraison",
  whatsapp: "WhatsApp",
};

/**
 * Notifie l'admin par email à chaque nouvelle commande.
 */
async function sendNewOrderNotification(order) {
  const transporter = createTransporter();
  if (!transporter) {
    console.log("📧 Email non configuré — notification ignorée.");
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
  const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;

  const itemsHtml = items
    .map((i) => `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;">${i.name}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center;">×${i.quantity}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:700;">${(i.price * i.quantity).toLocaleString("fr-FR")} FCFA</td>
    </tr>`)
    .join("");

  const html = `
  <div style="font-family:Inter,sans-serif;max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:linear-gradient(135deg,#1E1B4B,#6366F1);padding:24px 28px;color:white;">
      <h2 style="margin:0;font-size:20px;">🛍️ Nouvelle commande #${order.id}</h2>
      <p style="margin:6px 0 0;opacity:0.85;font-size:14px;">
        ${new Date(order.created_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
    <div style="padding:24px 28px;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#F8F7FF;">
            <th style="padding:8px 12px;text-align:left;font-size:13px;color:#6B7280;">Article</th>
            <th style="padding:8px 12px;text-align:center;font-size:13px;color:#6B7280;">Qté</th>
            <th style="padding:8px 12px;text-align:right;font-size:13px;color:#6B7280;">Prix</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:10px 12px;font-weight:800;font-size:15px;">TOTAL</td>
            <td style="padding:10px 12px;font-weight:800;font-size:16px;color:#E11D48;text-align:right;">${order.total?.toLocaleString("fr-FR")} FCFA</td>
          </tr>
        </tfoot>
      </table>

      <div style="background:#F8F7FF;border-radius:10px;padding:16px 18px;margin-bottom:16px;">
        <p style="margin:0 0 6px;font-weight:700;font-size:14px;color:#1E1B4B;">👤 Client</p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">
          <strong>${order.customer_name}</strong><br/>
          📞 ${order.customer_phone}<br/>
          ${order.customer_address ? `📍 ${order.customer_address}<br/>` : ""}
          💳 ${PAYMENT_LABELS[order.payment_method] || order.payment_method}
        </p>
      </div>

      ${order.payment_ref ? `<p style="font-size:13px;color:#6B7280;margin:0 0 12px;">Référence paiement : <strong>${order.payment_ref}</strong></p>` : ""}
      ${order.notes ? `<p style="font-size:13px;color:#6B7280;margin:0 0 12px;">Note client : <em>${order.notes}</em></p>` : ""}

      <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/admin" style="display:inline-block;background:#1E1B4B;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
        Voir dans l'admin →
      </a>
    </div>
    <div style="background:#F3F4F6;padding:12px 28px;font-size:12px;color:#9CA3AF;text-align:center;">
      Agnès Shop · notification automatique
    </div>
  </div>`;

  try {
    await transporter.sendMail({
      from: `"Agnès Shop 🛍️" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: `🛍️ Nouvelle commande #${order.id} — ${order.customer_name} (${order.total?.toLocaleString("fr-FR")} FCFA)`,
      html,
    });
    console.log(`📧 Email envoyé à ${adminEmail} pour commande #${order.id}`);
  } catch (err) {
    console.error("❌ Erreur envoi email :", err.message);
  }
}

/**
 * Envoie un email de remboursement au client.
 */
async function sendRefundEmail(order, { reason, refundMethod, refundNumber, customerEmail }) {
  const transporter = createTransporter();
  const to = customerEmail || order.customer_email;
  if (!transporter || !to) {
    console.log("📧 Email remboursement non envoyé (pas de config ou pas d'email client).");
    return;
  }

  const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
  const itemsHtml = items
    .map((i) => `<tr>
      <td style="padding:5px 10px;border-bottom:1px solid #eee;">${i.name}</td>
      <td style="padding:5px 10px;border-bottom:1px solid #eee;text-align:center;">×${i.quantity}</td>
      <td style="padding:5px 10px;border-bottom:1px solid #eee;text-align:right;">${(i.price * i.quantity).toLocaleString("fr-FR")} FCFA</td>
    </tr>`).join("");

  const html = `
  <div style="font-family:Inter,sans-serif;max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:linear-gradient(135deg,#EF4444,#DC2626);padding:24px 28px;color:white;">
      <h2 style="margin:0;font-size:20px;">💸 Remboursement de votre commande #${order.id}</h2>
      <p style="margin:6px 0 0;opacity:0.9;font-size:14px;">Agnès Shop vous rembourse suite à l'annulation de votre commande</p>
    </div>
    <div style="padding:24px 28px;">
      <p style="color:#374151;font-size:15px;margin:0 0 18px;">
        Bonjour <strong>${order.customer_name}</strong>,<br><br>
        Nous sommes désolés de vous informer que votre commande <strong>#${order.id}</strong> a dû être annulée.
        ${reason ? `<br><br><strong>Raison :</strong> ${reason}` : ""}
      </p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;background:#FFF9F9;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#FEE2E2;">
            <th style="padding:8px 10px;text-align:left;font-size:13px;color:#991B1B;">Article</th>
            <th style="padding:8px 10px;text-align:center;font-size:13px;color:#991B1B;">Qté</th>
            <th style="padding:8px 10px;text-align:right;font-size:13px;color:#991B1B;">Prix</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:10px;font-weight:800;font-size:15px;color:#DC2626;">Montant à rembourser</td>
            <td style="padding:10px;font-weight:800;font-size:17px;color:#DC2626;text-align:right;">${order.total?.toLocaleString("fr-FR")} FCFA</td>
          </tr>
        </tfoot>
      </table>

      <div style="background:#FFF3CD;border:2px solid #F59E0B;border-radius:12px;padding:18px 20px;margin-bottom:20px;">
        <p style="margin:0 0 10px;font-weight:800;font-size:15px;color:#92400E;">💰 Modalités de remboursement</p>
        ${refundMethod ? `<p style="margin:0 0 6px;font-size:14px;color:#78350F;">Mode : <strong>${refundMethod}</strong></p>` : ""}
        ${refundNumber ? `<p style="margin:0 0 6px;font-size:14px;color:#78350F;">Numéro de remboursement : <strong>${refundNumber}</strong></p>` : ""}
        <p style="margin:8px 0 0;font-size:13px;color:#92400E;">
          ⏱️ Le remboursement sera effectué dans les <strong>24 à 48 heures</strong>.<br>
          Si vous n'avez pas reçu votre remboursement passé ce délai, contactez-nous sur WhatsApp.
        </p>
      </div>

      <p style="font-size:13px;color:#6B7280;margin:0 0 18px;">
        Nous nous excusons pour la gêne occasionnée et espérons vous revoir prochainement sur Agnès Shop 🙏
      </p>

      <a href="https://wa.me/${process.env.WHATSAPP_NUMBER || '33668557785'}?text=${encodeURIComponent(`Bonjour Agnès Shop, je souhaite des nouvelles de mon remboursement pour la commande #${order.id}`)}"
        style="display:inline-block;background:#25D366;color:white;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
        💬 Contacter Agnès Shop
      </a>
    </div>
    <div style="background:#F3F4F6;padding:12px 28px;font-size:12px;color:#9CA3AF;text-align:center;">
      Agnès Shop · Dakar, Sénégal
    </div>
  </div>`;

  try {
    await transporter.sendMail({
      from: `"Agnès Shop 🛍️" <${process.env.EMAIL_USER}>`,
      to,
      subject: `💸 Remboursement commande #${order.id} — ${order.total?.toLocaleString("fr-FR")} FCFA`,
      html,
    });
    console.log(`📧 Email remboursement envoyé à ${to} pour commande #${order.id}`);
  } catch (err) {
    console.error("❌ Erreur envoi email remboursement :", err.message);
  }
}

/**
 * Notifie le client quand le statut de sa commande change.
 */
async function sendOrderStatusEmail(order) {
  const transporter = createTransporter();
  const to = order.customer_email;
  if (!transporter || !to) return;

  const STATUS_INFO = {
    "confirmée":  { icon: "✅", color: "#10B981", bg: "#F0FDF4", label: "Commande confirmée",  msg: "Votre commande a bien été confirmée. Nous préparons vos articles avec soin." },
    "expédiée":   { icon: "🚚", color: "#6366F1", bg: "#EEF2FF", label: "Commande expédiée",   msg: "Vos articles sont en route ! Vous serez livré très prochainement." },
    "livrée":     { icon: "🎉", color: "#D4A017", bg: "#FFFBEB", label: "Commande livrée",     msg: "Votre commande a été livrée. Merci de votre confiance chez Agnès Shop !" },
    "annulée":    { icon: "❌", color: "#EF4444", bg: "#FFF1F2", label: "Commande annulée",    msg: "Votre commande a été annulée. Contactez-nous pour plus d'informations." },
    "en attente": { icon: "⏳", color: "#F59E0B", bg: "#FFFBEB", label: "En attente",          msg: "Votre commande est en attente de traitement. Nous vous contacterons rapidement." },
  };

  const info = STATUS_INFO[order.status] || { icon: "📦", color: "#6366F1", bg: "#EEF2FF", label: order.status, msg: "Le statut de votre commande a été mis à jour." };
  const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;

  const itemsHtml = items.map((i) => `
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;">${i.name}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center;">×${i.quantity}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:700;">${(i.price * i.quantity).toLocaleString("fr-FR")} FCFA</td>
    </tr>`).join("");

  const html = `
  <div style="font-family:Inter,sans-serif;max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:linear-gradient(135deg,#1E1B4B,#6366F1);padding:24px 28px;color:white;">
      <h2 style="margin:0;font-size:20px;">🌸 Agnès Shop — Suivi de commande</h2>
      <p style="margin:6px 0 0;opacity:0.85;font-size:14px;">Commande #${order.id}</p>
    </div>
    <div style="padding:24px 28px;">
      <div style="background:${info.bg};border-left:4px solid ${info.color};border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:22px;">${info.icon} <strong style="color:${info.color};">${info.label}</strong></p>
        <p style="margin:8px 0 0;font-size:14px;color:#374151;">${info.msg}</p>
      </div>

      <p style="font-size:15px;color:#374151;margin:0 0 20px;">
        Bonjour <strong>${order.customer_name}</strong>,<br/>
        voici le récapitulatif de votre commande :
      </p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#F8F7FF;">
            <th style="padding:8px 12px;text-align:left;font-size:13px;color:#6B7280;">Article</th>
            <th style="padding:8px 12px;text-align:center;font-size:13px;color:#6B7280;">Qté</th>
            <th style="padding:8px 12px;text-align:right;font-size:13px;color:#6B7280;">Prix</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:10px 12px;font-weight:800;font-size:15px;">TOTAL</td>
            <td style="padding:10px 12px;font-weight:800;font-size:16px;color:#E11D48;text-align:right;">${order.total?.toLocaleString("fr-FR")} FCFA</td>
          </tr>
        </tfoot>
      </table>

      <a href="https://wa.me/${process.env.WHATSAPP_NUMBER || '33668557785'}?text=${encodeURIComponent(`Bonjour Agnès Shop, je souhaite des informations sur ma commande #${order.id}`)}"
        style="display:inline-block;background:#25D366;color:white;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
        💬 Contacter Agnès Shop
      </a>
    </div>
    <div style="background:#F3F4F6;padding:12px 28px;font-size:12px;color:#9CA3AF;text-align:center;">
      Agnès Shop · Dakar, Sénégal · nabousene2002@gmail.com
    </div>
  </div>`;

  try {
    await transporter.sendMail({
      from: `"Agnès Shop 🌸" <${process.env.EMAIL_USER}>`,
      to,
      subject: `${info.icon} Commande #${order.id} — ${info.label}`,
      html,
    });
    console.log(`📧 Email statut "${order.status}" envoyé à ${to}`);
  } catch (err) {
    console.error("❌ Erreur email statut :", err.message);
  }
}

/**
 * Notifie l'admin quand un client envoie un message via le formulaire de contact.
 */
async function sendContactNotification(msg) {
  const transporter = createTransporter();
  if (!transporter) return;

  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
  const subjectLabels = {
    commande: "Question sur une commande",
    mesure: "Commande sur mesure",
    livraison: "Livraison et délais",
    retour: "Retour / échange",
    autre: "Autre",
  };
  const subjectLabel = subjectLabels[msg.subject] || msg.subject || "Sans sujet";

  const html = `
  <div style="font-family:Inter,sans-serif;max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:linear-gradient(135deg,#1E1B4B,#6366F1);padding:24px 28px;color:white;">
      <h2 style="margin:0;font-size:20px;">💬 Nouveau message de contact</h2>
      <p style="margin:6px 0 0;opacity:0.85;font-size:14px;">
        ${new Date(msg.created_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
    <div style="padding:24px 28px;">
      <div style="background:#F8F7FF;border-radius:10px;padding:16px 18px;margin-bottom:20px;">
        <p style="margin:0 0 8px;font-weight:700;font-size:14px;color:#1E1B4B;">👤 Expéditeur</p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.8;">
          <strong>${msg.name}</strong><br/>
          ✉️ <a href="mailto:${msg.email}" style="color:#6366F1;">${msg.email}</a><br/>
          ${msg.phone ? `📞 ${msg.phone}<br/>` : ""}
          📌 Sujet : <strong>${subjectLabel}</strong>
        </p>
      </div>

      <div style="background:#FAFAFA;border-left:4px solid #6366F1;border-radius:0 8px 8px 0;padding:16px 18px;margin-bottom:20px;">
        <p style="margin:0 0 8px;font-weight:700;font-size:14px;color:#1E1B4B;">📝 Message</p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap;">${msg.message}</p>
      </div>

      <a href="mailto:${msg.email}?subject=Re: ${encodeURIComponent(subjectLabel)} — Agnès Shop"
        style="display:inline-block;background:#1E1B4B;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin-right:10px;">
        ✉️ Répondre par email
      </a>
      ${msg.phone ? `<a href="https://wa.me/${msg.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour ${msg.name}, merci pour votre message. `)}
        " style="display:inline-block;background:#25D366;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
        💬 WhatsApp
      </a>` : ""}

      <p style="margin:16px 0 0;font-size:12px;color:#9CA3AF;">
        Voir tous les messages : <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/admin" style="color:#6366F1;">Admin Agnès Shop</a>
      </p>
    </div>
    <div style="background:#F3F4F6;padding:12px 28px;font-size:12px;color:#9CA3AF;text-align:center;">
      Agnès Shop · formulaire de contact
    </div>
  </div>`;

  try {
    await transporter.sendMail({
      from: `"Agnès Shop 🛍️" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      replyTo: msg.email,
      subject: `💬 Nouveau message : ${msg.name} — ${subjectLabel}`,
      html,
    });
    console.log(`📧 Notif contact envoyée pour message de ${msg.name}`);
  } catch (err) {
    console.error("❌ Erreur email contact :", err.message);
  }
}

module.exports = { sendNewOrderNotification, sendRefundEmail, sendContactNotification, sendOrderStatusEmail };
