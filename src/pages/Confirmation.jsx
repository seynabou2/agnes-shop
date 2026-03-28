import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const PAYMENT_LABELS = {
  orange_money: { icon: "🟠", name: "Orange Money", color: "#FF6600" },
  wave: { icon: "🔵", name: "Wave", color: "#1A6FC4" },
  card: { icon: "💳", name: "Carte bancaire", color: "#1E1B4B" },
  cash: { icon: "📦", name: "Paiement à la livraison", color: "#059669" },
  whatsapp: { icon: "💬", name: "Via WhatsApp", color: "#25D366" },
};

const STATUS_STEPS = [
  { key: "confirmed", label: "Commande reçue", icon: "✅" },
  { key: "processing", label: "En préparation", icon: "🪡" },
  { key: "shipping", label: "En livraison", icon: "🚚" },
  { key: "delivered", label: "Livrée", icon: "🎁" },
];

function Confirmation() {
  const location = useLocation();
  const orderData = location.state?.order || null;
  const [confetti, setConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  const payment = orderData?.payment_method
    ? PAYMENT_LABELS[orderData.payment_method] || { icon: "💰", name: orderData.payment_method, color: "#1E1B4B" }
    : null;

  const whatsappMsg = encodeURIComponent(
    orderData
      ? `Bonjour ! J'ai passé une commande (#${orderData.id || "..."}) sur Agnès Shop. Pouvez-vous confirmer la livraison ?`
      : "Bonjour ! J'ai passé une commande sur Agnès Shop. Pouvez-vous confirmer la livraison ?"
  );

  return (
    <div style={{ padding: "3rem 0 5rem", minHeight: "80vh" }}>
      {/* Confettis animés (cercles décoratifs) */}
      {confetti && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: `${Math.random() * 14 + 6}px`,
                height: `${Math.random() * 14 + 6}px`,
                borderRadius: "50%",
                background: ["#D4A017", "#E11D48", "#1E1B4B", "#4ADE80", "#60A5FA"][i % 5],
                top: `-20px`,
                left: `${Math.random() * 100}%`,
                animation: `fall ${Math.random() * 2 + 2}s ease-in forwards`,
                animationDelay: `${Math.random() * 1.5}s`,
                opacity: 0.85,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes pop-in {
          0% { transform: scale(0.7); opacity: 0; }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div className="container" style={{ maxWidth: "680px" }}>

        {/* Card principale */}
        <div className="card" style={{ padding: "3rem 2.5rem", textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "5rem", marginBottom: "1rem", animation: "pop-in 0.6s ease-out" }}>
            🎉
          </div>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
            background: "#DCFCE7", color: "#15803D", borderRadius: "999px",
            padding: "4px 14px", fontSize: "0.82rem", fontWeight: "700",
            marginBottom: "1.25rem", letterSpacing: "0.04em",
          }}>
            ✓ COMMANDE CONFIRMÉE
          </div>

          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
            color: "var(--primary)",
            marginBottom: "0.75rem",
          }}>
            Merci pour votre commande !
          </h1>

          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.97rem", marginBottom: "2rem" }}>
            Agnès a bien reçu votre commande et vous contactera très prochainement
            pour confirmer la livraison. Préparez-vous à recevoir votre nouvelle tenue ! ✨
          </p>

          {/* Détails de la commande */}
          {orderData && (
            <div style={{
              background: "var(--bg)",
              borderRadius: "12px",
              padding: "1.25rem 1.5rem",
              textAlign: "left",
              marginBottom: "2rem",
              border: "1px solid var(--border)",
            }}>
              <div style={{ fontWeight: "700", marginBottom: "0.75rem", fontSize: "0.9rem", color: "var(--primary)" }}>
                📋 Récapitulatif de commande
              </div>
              {[
                orderData.id && { label: "N° de commande", value: `#${orderData.id}` },
                orderData.customer_name && { label: "Nom", value: orderData.customer_name },
                orderData.customer_phone && { label: "Téléphone", value: orderData.customer_phone },
                orderData.delivery_address && { label: "Adresse", value: orderData.delivery_address },
                orderData.total_price && { label: "Total", value: `${Number(orderData.total_price).toLocaleString()} FCFA`, bold: true },
              ].filter(Boolean).map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid var(--border)", fontSize: "0.87rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>{row.label}</span>
                  <span style={{ fontWeight: row.bold ? "700" : "600", color: row.bold ? "var(--accent)" : "var(--text)" }}>{row.value}</span>
                </div>
              ))}

              {/* Mode de paiement */}
              {payment && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", fontSize: "0.87rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Paiement</span>
                  <span style={{ fontWeight: "600", color: payment.color }}>
                    {payment.icon} {payment.name}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Suivi visuel */}
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ fontWeight: "700", marginBottom: "1rem", fontSize: "0.9rem" }}>Suivi de votre commande</div>
            <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
              {/* Ligne de fond */}
              <div style={{ position: "absolute", top: "20px", left: "10%", right: "10%", height: "3px", background: "var(--border)", zIndex: 0 }} />
              {/* Ligne active (1ère étape) */}
              <div style={{ position: "absolute", top: "20px", left: "10%", width: "0%", height: "3px", background: "var(--success)", zIndex: 1 }} />

              {STATUS_STEPS.map((step, i) => (
                <div key={step.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 2, flex: 1 }}>
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "50%",
                    background: i === 0 ? "var(--success)" : "white",
                    border: `2px solid ${i === 0 ? "var(--success)" : "var(--border)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.1rem", marginBottom: "0.5rem",
                    boxShadow: i === 0 ? "0 0 0 4px rgba(16,185,129,0.15)" : "none",
                  }}>
                    {step.icon}
                  </div>
                  <div style={{ fontSize: "0.72rem", fontWeight: i === 0 ? "700" : "500", color: i === 0 ? "var(--success)" : "var(--text-muted)", textAlign: "center", maxWidth: "70px", lineHeight: 1.3 }}>
                    {step.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions de paiement si mobile money */}
          {orderData?.payment_method === "orange_money" && (
            <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.5rem", textAlign: "left" }}>
              <div style={{ fontWeight: "700", color: "#EA580C", marginBottom: "0.5rem" }}>🟠 Instructions Orange Money</div>
              <p style={{ fontSize: "0.87rem", color: "#9A3412", lineHeight: 1.6 }}>
                Composez <strong>#144#</strong> → Transfert d'argent → Entrez le numéro Agnès Shop et le montant exact.
                Référence de la transaction : <strong>{orderData.payment_ref || "à communiquer"}</strong>
              </p>
            </div>
          )}
          {orderData?.payment_method === "wave" && (
            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.5rem", textAlign: "left" }}>
              <div style={{ fontWeight: "700", color: "#1D4ED8", marginBottom: "0.5rem" }}>🔵 Instructions Wave</div>
              <p style={{ fontSize: "0.87rem", color: "#1E40AF", lineHeight: 1.6 }}>
                Ouvrez l'appli Wave → Envoyer de l'argent → Entrez le numéro Agnès Shop et le montant.
                Référence : <strong>{orderData.payment_ref || "à communiquer"}</strong>
              </p>
            </div>
          )}

          {/* Boutons d'action */}
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
            <a
              href={`https://wa.me/33668557785?text=${whatsappMsg}`}
              target="_blank"
              rel="noreferrer"
              className="btn"
              style={{ background: "#25D366", color: "white", border: "none", textDecoration: "none" }}
            >
              💬 Confirmer via WhatsApp
            </a>
            <Link to="/mon-compte" className="btn btn-outline">
              Mes commandes
            </Link>
            <Link to="/boutique" className="btn btn-primary">
              Continuer mes achats →
            </Link>
          </div>
        </div>

        {/* Carte assurance */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          {[
            { icon: "✂️", title: "Fait main", desc: "Confectionné avec soin" },
            { icon: "🚚", title: "Livraison rapide", desc: "24-48h à Dakar" },
            { icon: "💬", title: "Support WhatsApp", desc: "Disponible 7j/7" },
          ].map((item) => (
            <div key={item.title} className="card" style={{ padding: "1.25rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: "0.4rem" }}>{item.icon}</div>
              <div style={{ fontWeight: "700", fontSize: "0.87rem", color: "var(--primary)", marginBottom: "0.2rem" }}>{item.title}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{item.desc}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default Confirmation;
