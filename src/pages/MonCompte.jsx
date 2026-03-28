import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCustomer } from "../context/CustomerContext";
import { getMyOrders } from "../services/api";

const ORDER_STEPS = [
  { key: "en attente",  label: "Reçue",        icon: "📬", desc: "Votre commande a été reçue par Agnès" },
  { key: "confirmée",   label: "Confirmée",     icon: "✅", desc: "Agnès a confirmé votre commande !" },
  { key: "expédiée",    label: "En livraison",  icon: "🚚", desc: "Votre commande est en route vers vous" },
  { key: "livrée",      label: "Livrée",        icon: "🎁", desc: "Commande livrée avec succès !" },
];

const STATUS_COLOR = {
  "en attente": { color: "#F59E0B", bg: "#FFF9E6", label: "En attente" },
  "confirmée":  { color: "#6366F1", bg: "#EEF2FF", label: "Confirmée" },
  "expédiée":   { color: "#0EA5E9", bg: "#F0F9FF", label: "En livraison" },
  "livrée":     { color: "#10B981", bg: "#F0FDF4", label: "Livrée ✓" },
  "annulée":    { color: "#EF4444", bg: "#FFF1F2", label: "Annulée" },
};

const PAYMENT_STATUS_COLOR = {
  "en attente":          { color: "#F59E0B", label: "Paiement en attente" },
  "en attente paiement": { color: "#F59E0B", label: "Paiement à confirmer" },
  "payée":               { color: "#10B981", label: "Paiement reçu ✓" },
  "à la livraison":      { color: "#6366F1", label: "Paiement à la livraison" },
  "refusée":             { color: "#EF4444", label: "Paiement refusé" },
  "remboursée":          { color: "#8B5CF6", label: "💸 Remboursement en cours" },
};

const PAYMENT_METHOD_LABEL = {
  orange_money: "🟠 Orange Money",
  wave:         "🔵 Wave",
  card:         "💳 Carte bancaire",
  cash:         "📦 Paiement à la livraison",
  whatsapp:     "💬 WhatsApp",
};

function OrderTracker({ status }) {
  const stepIndex = ORDER_STEPS.findIndex((s) => s.key === status);
  const isCancelled = status === "annulée";

  if (isCancelled) {
    return (
      <div style={{ background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "10px", padding: "0.75rem 1rem", fontSize: "0.83rem", color: "#EF4444", fontWeight: "600" }}>
        ✗ Cette commande a été annulée
      </div>
    );
  }

  const activeIdx = stepIndex === -1 ? 0 : stepIndex;

  return (
    <div style={{ padding: "0.5rem 0" }}>
      <div style={{ display: "flex", position: "relative", justifyContent: "space-between" }}>
        <div style={{ position: "absolute", top: "15px", left: "16px", right: "16px", height: "2px", background: "#E5E7EB", zIndex: 0 }} />
        <div style={{
          position: "absolute", top: "15px", left: "16px",
          width: `${(activeIdx / (ORDER_STEPS.length - 1)) * 100}%`,
          height: "2px", background: "linear-gradient(90deg, #6366F1, #10B981)", zIndex: 1,
          transition: "width 0.6s ease",
        }} />
        {ORDER_STEPS.map((step, i) => {
          const done = i <= activeIdx;
          const current = i === activeIdx;
          return (
            <div key={step.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2, flex: 1 }}>
              <div style={{
                width: "30px", height: "30px", borderRadius: "50%", marginBottom: "6px",
                background: done ? (current ? "#6366F1" : "#10B981") : "white",
                border: `2px solid ${done ? (current ? "#6366F1" : "#10B981") : "#E5E7EB"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.85rem",
                boxShadow: current ? "0 0 0 4px rgba(99,102,241,0.2)" : "none",
              }}>
                {done ? (current ? step.icon : "✓") : <span style={{ fontSize: "0.6rem", color: "#D1D5DB" }}>○</span>}
              </div>
              <div style={{ fontSize: "0.66rem", fontWeight: current ? "800" : "500", color: done ? "#374151" : "#9CA3AF", textAlign: "center", lineHeight: 1.3, maxWidth: "58px" }}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
      {stepIndex !== -1 && (
        <p style={{ textAlign: "center", fontSize: "0.8rem", color: "#6366F1", fontWeight: "600", marginTop: "0.75rem" }}>
          {ORDER_STEPS[activeIdx].desc}
        </p>
      )}
    </div>
  );
}

function OrderCard({ order, expanded, onToggle }) {
  const items = typeof order.items === "string" ? JSON.parse(order.items) : (order.items || []);
  const sc = STATUS_COLOR[order.status] || STATUS_COLOR["en attente"];
  const pc = PAYMENT_STATUS_COLOR[order.payment_status] || PAYMENT_STATUS_COLOR["en attente"];
  const needsPayment =
    ["en attente paiement", "en attente"].includes(order.payment_status) &&
    ["orange_money", "wave", "card"].includes(order.payment_method);

  return (
    <div style={{
      background: "white", borderRadius: "16px",
      border: `2px solid ${needsPayment ? "#F59E0B" : expanded ? "#6366F1" : "#E5E7EB"}`,
      marginBottom: "1rem", overflow: "hidden",
      boxShadow: expanded ? "0 8px 24px rgba(99,102,241,0.1)" : "0 2px 6px rgba(0,0,0,0.04)",
      transition: "all 0.2s",
    }}>
      {needsPayment && (
        <div style={{ background: "#FEF3C7", padding: "7px 1.25rem", fontSize: "0.8rem", color: "#92400E", fontWeight: "600" }}>
          ⚠️ Votre paiement {PAYMENT_METHOD_LABEL[order.payment_method]} est en attente de validation
        </div>
      )}

      <div onClick={onToggle} style={{ padding: "1rem 1.25rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
            <span style={{ fontWeight: "800", fontSize: "1rem", color: "#1E1B4B" }}>Commande #{order.id}</span>
            <span style={{ fontSize: "0.75rem", fontWeight: "700", color: sc.color, background: sc.bg, padding: "2px 9px", borderRadius: "999px" }}>
              {sc.label}
            </span>
          </div>
          <div style={{ fontSize: "0.78rem", color: "#9CA3AF" }}>
            {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            {" · "}
            {items.slice(0, 2).map((it, i) => `${it.name} ×${it.quantity}`).join(", ")}
            {items.length > 2 ? ` +${items.length - 2} article(s)` : ""}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontWeight: "800", fontSize: "1.05rem", color: "#E11D48" }}>
            {order.total?.toLocaleString()} FCFA
          </div>
          <div style={{ fontSize: "0.73rem", color: pc.color, fontWeight: "600" }}>{pc.label}</div>
        </div>
        <div style={{ color: "#D1D5DB" }}>{expanded ? "▲" : "▼"}</div>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid #E5E7EB", padding: "1.25rem", background: "#FAFAFE" }}>
          {/* Tracker */}
          <div style={{ marginBottom: "1.25rem" }}>
            <p style={{ fontSize: "0.82rem", fontWeight: "700", color: "#1E1B4B", marginBottom: "0.5rem" }}>📍 Suivi de votre commande</p>
            <OrderTracker status={order.status} />
          </div>

          {/* Articles */}
          <div style={{ marginBottom: "1.25rem" }}>
            <p style={{ fontSize: "0.82rem", fontWeight: "700", color: "#1E1B4B", marginBottom: "0.5rem" }}>🛍 Articles commandés</p>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", padding: "5px 0", borderBottom: "1px solid #E5E7EB" }}>
                <span style={{ color: "#374151" }}>{it.name} <span style={{ color: "#9CA3AF" }}>×{it.quantity}</span></span>
                <span style={{ fontWeight: "600", color: "#374151" }}>{(it.price * it.quantity).toLocaleString()} FCFA</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "800", marginTop: "8px", fontSize: "0.95rem", color: "#E11D48" }}>
              <span>Total</span><span>{order.total?.toLocaleString()} FCFA</span>
            </div>
          </div>

          {/* Bloc remboursement */}
          {order.payment_status === "remboursée" && (
            <div style={{ background: "#F5F3FF", border: "2px solid #8B5CF6", borderRadius: "12px", padding: "1rem 1.1rem", marginBottom: "1.25rem" }}>
              <p style={{ fontWeight: "800", color: "#6D28D9", fontSize: "0.9rem", margin: "0 0 0.4rem" }}>
                💸 Remboursement en cours
              </p>
              <p style={{ fontSize: "0.83rem", color: "#7C3AED", margin: "0 0 0.3rem" }}>
                Votre commande a été annulée et un remboursement de <strong>{order.total?.toLocaleString()} FCFA</strong> est en cours de traitement.
              </p>
              {order.refund_notes && (
                <p style={{ fontSize: "0.8rem", color: "#6B7280", margin: "0.4rem 0 0" }}>
                  ℹ️ {order.refund_notes}
                </p>
              )}
              <p style={{ fontSize: "0.78rem", color: "#8B5CF6", margin: "0.5rem 0 0", fontWeight: "600" }}>
                ⏱️ Délai estimé : 24 à 48 heures. Contactez-nous si vous n'avez pas reçu votre remboursement.
              </p>
            </div>
          )}

          {/* Infos paiement */}
          <div style={{ background: needsPayment ? "#FFF9E6" : "#F8F7FF", borderRadius: "10px", padding: "0.9rem 1rem", marginBottom: "1rem" }}>
            <p style={{ fontSize: "0.82rem", fontWeight: "700", color: "#1E1B4B", marginBottom: "0.4rem" }}>💳 Paiement</p>
            <p style={{ fontSize: "0.83rem", color: "#4B5563" }}>
              Mode : <strong>{PAYMENT_METHOD_LABEL[order.payment_method] || order.payment_method}</strong>
            </p>
            <p style={{ fontSize: "0.83rem", color: pc.color, fontWeight: "600" }}>{pc.label}</p>
            {order.payment_ref && (
              <p style={{ fontSize: "0.8rem", color: "#6B7280" }}>Référence : <strong>{order.payment_ref}</strong></p>
            )}
            {needsPayment && (
              <div style={{ marginTop: "0.65rem", background: "#FEF3C7", borderRadius: "8px", padding: "0.65rem 0.9rem", fontSize: "0.8rem", color: "#92400E" }}>
                📌 Envoyez <strong>{order.total?.toLocaleString()} FCFA</strong> et contactez Agnès Shop sur WhatsApp avec la référence de votre commande pour valider le paiement.
              </div>
            )}
          </div>

          {/* Boutons */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <a
              href={`https://wa.me/33668557785?text=${encodeURIComponent(`Bonjour Agnès Shop ! Je voudrais des nouvelles de ma commande #${order.id}. Merci !`)}`}
              target="_blank" rel="noreferrer"
              className="btn"
              style={{ background: "#25D366", color: "white", border: "none", fontSize: "0.82rem", textDecoration: "none" }}
            >
              💬 Demander des nouvelles
            </a>
            {order.status !== "annulée" && order.status !== "livrée" && (
              <Link to="/contact" className="btn btn-outline" style={{ fontSize: "0.82rem" }}>📞 Contacter Agnès</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MonCompte() {
  const { customer, logout } = useCustomer();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!customer) { navigate("/connexion"); return; }
    getMyOrders()
      .then((data) => {
        setOrders(data);
        // Ouvrir automatiquement la commande la plus récente en cours
        const inProgress = data.find((o) => !["livrée", "annulée"].includes(o.status));
        if (inProgress) setExpanded(inProgress.id);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [customer, navigate]);

  const active = orders.filter((o) => !["livrée", "annulée"].includes(o.status));
  const past = orders.filter((o) => ["livrée", "annulée"].includes(o.status));

  return (
    <div style={{ padding: "2.5rem 0 5rem" }}>
      <div className="container" style={{ maxWidth: "720px" }}>

        {/* Carte profil */}
        <div style={{
          background: "linear-gradient(135deg, #1E1B4B 0%, #6366F1 60%, #D4A017 100%)",
          borderRadius: "20px", padding: "2rem 2.5rem",
          color: "white", display: "flex", alignItems: "center", gap: "1.5rem",
          marginBottom: "2.5rem", flexWrap: "wrap",
          boxShadow: "0 12px 40px rgba(30,27,75,0.25)",
        }}>
          <div style={{
            width: "68px", height: "68px", borderRadius: "50%",
            background: "rgba(255,255,255,0.2)", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: "1.8rem", fontWeight: "700", flexShrink: 0,
            backdropFilter: "blur(8px)",
          }}>
            {customer?.first_name?.[0]}{customer?.last_name?.[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", fontWeight: "700", letterSpacing: "-0.01em" }}>
              {customer?.first_name} {customer?.last_name}
            </div>
            <div style={{ opacity: 0.8, fontSize: "0.88rem", marginTop: "3px" }}>{customer?.email}</div>
            {customer?.phone && <div style={{ opacity: 0.7, fontSize: "0.82rem" }}>📞 {customer.phone}</div>}
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: "1.8rem", fontWeight: "900", lineHeight: 1 }}>{orders.length}</div>
            <div style={{ fontSize: "0.78rem", opacity: 0.8, marginBottom: "0.75rem" }}>commande{orders.length > 1 ? "s" : ""}</div>
            <button
              onClick={() => { logout(); navigate("/"); }}
              style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "8px", padding: "6px 14px", fontSize: "0.78rem", cursor: "pointer", backdropFilter: "blur(4px)" }}
            >
              Déconnexion
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state"><div className="spinner" /><p>Chargement de vos commandes...</p></div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <div className="empty-title">Aucune commande pour l'instant</div>
            <div className="empty-desc">Votre historique de commandes apparaîtra ici.</div>
            <Link to="/boutique" className="btn btn-primary" style={{ marginTop: "1.5rem" }}>
              Découvrir la boutique →
            </Link>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section style={{ marginBottom: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10B981", animation: "pulse-dot 2s infinite" }} />
                  <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#1E1B4B" }}>
                    Commandes en cours ({active.length})
                  </h2>
                </div>
                {active.map((o) => (
                  <OrderCard key={o.id} order={o} expanded={expanded === o.id} onToggle={() => setExpanded(expanded === o.id ? null : o.id)} />
                ))}
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h2 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#9CA3AF", marginBottom: "1rem" }}>
                  Historique ({past.length})
                </h2>
                {past.map((o) => (
                  <OrderCard key={o.id} order={o} expanded={expanded === o.id} onToggle={() => setExpanded(expanded === o.id ? null : o.id)} />
                ))}
              </section>
            )}
          </>
        )}

        <style>{`
          @keyframes pulse-dot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(1.5); }
          }
        `}</style>
      </div>
    </div>
  );
}
