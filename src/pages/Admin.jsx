import React, { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import {
  loginAdmin, verifyToken,
  getProducts, addProduct, updateProduct, deleteProduct,
  getOrders, updateOrderStatus, updatePaymentStatus,
  getSettings, updateSettings, refundOrder,
  getContactMessages, markMessageRead, deleteContactMessage,
} from "../services/api";

const SOCKET_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
function getAdminToken() { return localStorage.getItem("adminToken"); }
async function getCustomers() {
  const res = await fetch(`${BASE_URL}/api/customers`, {
    headers: { Authorization: `Bearer ${getAdminToken()}` },
  });
  if (!res.ok) throw new Error((await res.json()).error || "Erreur");
  return res.json();
}

const TABS = [
  { id: "dashboard", icon: "📊", label: "Dashboard" },
  { id: "visitors",  icon: "👁️", label: "En direct" },
  { id: "products",  icon: "📦", label: "Produits" },
  { id: "orders",    icon: "📋", label: "Commandes" },
  { id: "customers", icon: "👥", label: "Clients" },
  { id: "messages",  icon: "💬", label: "Messages" },
  { id: "settings",  icon: "⚙️", label: "Paramètres" },
];

const STATUS_MAP = {
  "en attente":  { label: "En attente",  cls: "badge-pending" },
  "confirmée":   { label: "Confirmée",   cls: "badge-confirmed" },
  "expédiée":    { label: "Expédiée",    cls: "badge-shipped" },
  "livrée":      { label: "Livrée",      cls: "badge-delivered" },
  "annulée":     { label: "Annulée",     cls: "badge-cancelled" },
};

const PAYMENT_STATUS_MAP = {
  "en attente":           { label: "En attente",          color: "#F59E0B", bg: "#FFFBEB" },
  "en attente paiement":  { label: "Paiement en attente", color: "#F59E0B", bg: "#FFFBEB" },
  "payée":                { label: "Payée ✓",             color: "#10B981", bg: "#F0FDF4" },
  "à la livraison":       { label: "À la livraison",      color: "#6366F1", bg: "#EEF2FF" },
  "refusée":              { label: "Refusée",             color: "#EF4444", bg: "#FFF1F2" },
  "remboursée":           { label: "Remboursée",          color: "#64748B", bg: "#F8FAFC" },
};

const PAYMENT_LABEL = {
  orange_money: "🟠 Orange Money",
  wave:         "🔵 Wave",
  card:         "💳 Carte",
  cash:         "📦 Livraison",
  whatsapp:     "💬 WhatsApp",
};

/* ─────────────── CONNEXION ─────────────── */
function LoginForm({ onLogin }) {
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const data = await loginAdmin(pwd);
      localStorage.setItem("adminToken", data.token);
      onLogin();
    } catch (e) {
      setErr(e.message || "Mot de passe incorrect.");
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8F7FF" }}>
      <div style={{ background: "white", borderRadius: "20px", padding: "2.5rem", width: "100%", maxWidth: "420px", boxShadow: "0 8px 32px rgba(30,27,75,0.12)" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🔐</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", color: "#1E1B4B" }}>Espace Admin</h2>
          <p style={{ color: "#9CA3AF", fontSize: "0.87rem", marginTop: "0.25rem" }}>Agnès Shop – Tableau de bord</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label className="form-label">Mot de passe</label>
            <input className="form-input" type="password" placeholder="••••••••" value={pwd} onChange={(e) => setPwd(e.target.value)} required autoFocus />
          </div>
          {err && <div className="alert alert-error" style={{ marginBottom: "1rem", fontSize: "0.87rem" }}>⚠️ {err}</div>}
          <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
            {loading ? "⏳ Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─────────────── DASHBOARD ─────────────── */
function Dashboard({ stats, orders, onValidatePayment }) {
  const revenue = stats?.total_revenue || 0;
  const recentOrders = orders.slice(0, 6);

  // Commandes avec paiement à valider manuellement (OM/Wave en attente)
  const pendingPayments = orders.filter(
    (o) => ["orange_money", "wave"].includes(o.payment_method) &&
            ["en attente", "en attente paiement"].includes(o.payment_status)
  );

  return (
    <div>
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.5rem", marginBottom: "1.5rem" }}>Tableau de bord</h2>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { icon: "📋", label: "Commandes totales", value: stats?.total_orders ?? "—", color: "#1E1B4B" },
          { icon: "💰", label: "Chiffre d'affaires", value: revenue ? `${revenue.toLocaleString()} FCFA` : "—", color: "#D4A017" },
          { icon: "🕐", label: "Aujourd'hui", value: stats?.orders_today ?? "—", color: "#059669" },
          { icon: "⏳", label: "En attente", value: stats?.pending_orders ?? "—", color: "#E11D48" },
          { icon: "✅", label: "Paiements reçus", value: stats?.paid_orders ?? "—", color: "#10B981" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Paiements à valider */}
      {pendingPayments.length > 0 && (
        <div style={{
          background: "#FFFBEB", border: "2px solid #F59E0B", borderRadius: "16px",
          padding: "1.5rem", marginBottom: "1.5rem",
        }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#92400E", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            🔔 Paiements à valider ({pendingPayments.length})
          </h3>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {pendingPayments.map((o) => (
              <div key={o.id} style={{
                background: "white", borderRadius: "10px", padding: "1rem",
                display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem",
              }}>
                <div>
                  <div style={{ fontWeight: "700", fontSize: "0.9rem" }}>#{o.id} – {o.customer_name}</div>
                  <div style={{ fontSize: "0.8rem", color: "#6B7280" }}>
                    {PAYMENT_LABEL[o.payment_method]} · {o.total.toLocaleString()} FCFA · {o.customer_phone}
                    {o.payment_ref && <span> · Réf: <strong>{o.payment_ref}</strong></span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => onValidatePayment(o.id, "payée")}
                    className="btn"
                    style={{ background: "#10B981", color: "white", border: "none", padding: "0.4rem 1rem", fontSize: "0.82rem" }}
                  >
                    ✓ Valider le paiement
                  </button>
                  <button
                    onClick={() => onValidatePayment(o.id, "refusée")}
                    className="btn btn-outline"
                    style={{ padding: "0.4rem 0.75rem", fontSize: "0.82rem", color: "#EF4444", borderColor: "#EF4444" }}
                  >
                    ✗ Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dernières commandes */}
      <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #F3F4F6" }}>
        <h3 style={{ fontFamily: "'Inter',sans-serif", fontSize: "1rem", fontWeight: "700", marginBottom: "1rem" }}>Dernières commandes</h3>
        {recentOrders.length === 0 ? (
          <div className="empty-state" style={{ padding: "2rem" }}>
            <div className="empty-icon">📋</div>
            <div className="empty-desc">Aucune commande pour le moment</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Client</th><th>Total</th><th>Paiement</th><th>Statut paiement</th><th>Statut</th><th>Date</th></tr></thead>
              <tbody>
                {recentOrders.map((o) => {
                  const ps = PAYMENT_STATUS_MAP[o.payment_status] || PAYMENT_STATUS_MAP["en attente"];
                  return (
                    <tr key={o.id}>
                      <td><strong>#{o.id}</strong></td>
                      <td>{o.customer_name}<br /><span style={{ fontSize: "0.78rem", color: "#9CA3AF" }}>{o.customer_phone}</span></td>
                      <td><strong style={{ color: "#E11D48" }}>{o.total.toLocaleString()} FCFA</strong></td>
                      <td>{PAYMENT_LABEL[o.payment_method] || o.payment_method}</td>
                      <td>
                        <span style={{ fontSize: "0.78rem", fontWeight: "700", color: ps.color, background: ps.bg, padding: "3px 8px", borderRadius: "999px" }}>
                          {ps.label}
                        </span>
                      </td>
                      <td><span className={`badge ${STATUS_MAP[o.status]?.cls}`}>{STATUS_MAP[o.status]?.label || o.status}</span></td>
                      <td style={{ fontSize: "0.8rem", color: "#9CA3AF" }}>{new Date(o.created_at).toLocaleDateString("fr-FR")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────── PRODUITS ─────────────── */
function Products({ products, reload }) {
  const EMPTY_FORM = { name: "", price: "", category: "", description: "", stock: "", in_promotion: false, discount_percent: "", is_new: false, colors: [], sizes: [] };
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [editingPromo, setEditingPromo] = useState({});
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#E11D48");

  const COMMON_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Unique", "36", "38", "40", "42", "44", "46"];

  function addColor() {
    if (!newColorName.trim()) return;
    setForm((f) => ({ ...f, colors: [...f.colors, { name: newColorName.trim(), hex: newColorHex }] }));
    setNewColorName("");
    setNewColorHex("#E11D48");
  }

  function removeColor(i) {
    setForm((f) => ({ ...f, colors: f.colors.filter((_, j) => j !== i) }));
  }

  function toggleSize(s) {
    setForm((f) => ({
      ...f,
      sizes: f.sizes.includes(s) ? f.sizes.filter((x) => x !== s) : [...f.sizes, s],
    }));
  } // { [id]: discountValue }

  function handleImg(e) {
    const f = e.target.files[0];
    setImageFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function handleAdd(e) {
    e.preventDefault();
    setErr(""); setOk("");
    if (!form.name || !form.price) { setErr("Nom et prix obligatoires."); return; }
    try {
      let payload;
      if (imageFile) {
        payload = new FormData();
        Object.entries(form).forEach(([k, v]) => {
          if (k === "colors" || k === "sizes") payload.append(k, JSON.stringify(v));
          else payload.append(k, v);
        });
        payload.append("image", imageFile);
      } else {
        payload = { ...form, colors: form.colors, sizes: form.sizes };
      }
      await addProduct(payload);
      setForm(EMPTY_FORM);
      setImageFile(null); setPreview(null); setNewColorName(""); setNewColorHex("#E11D48");
      setOk("Produit ajouté !");
      reload();
    } catch (e) { setErr(e.message); }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Supprimer "${name}" ?`)) return;
    try { await deleteProduct(id); reload(); }
    catch (e) { alert("Erreur : " + e.message); }
  }

  async function toggleAvailable(p) {
    try { await updateProduct(p.id, { is_available: !p.is_available }); reload(); }
    catch (e) { alert("Erreur : " + e.message); }
  }

  async function toggleNew(p) {
    try { await updateProduct(p.id, { is_new: !p.is_new }); reload(); }
    catch (e) { alert("Erreur : " + e.message); }
  }

  async function togglePromo(p) {
    try {
      await updateProduct(p.id, { in_promotion: !p.in_promotion, discount_percent: p.discount_percent || 0 });
      reload();
    } catch (e) { alert("Erreur : " + e.message); }
  }

  async function savePromoPercent(p) {
    const pct = parseInt(editingPromo[p.id]);
    if (isNaN(pct) || pct < 0 || pct > 99) { alert("Entrez un % valide (1-99)."); return; }
    try {
      await updateProduct(p.id, { in_promotion: true, discount_percent: pct });
      setEditingPromo((prev) => { const n = { ...prev }; delete n[p.id]; return n; });
      reload();
    } catch (e) { alert("Erreur : " + e.message); }
  }

  return (
    <div>
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.5rem", marginBottom: "1.5rem" }}>Gestion des Produits</h2>

      {/* Formulaire ajout */}
      <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", marginBottom: "2rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #F3F4F6" }}>
        <h3 style={{ fontFamily: "'Inter',sans-serif", fontSize: "1rem", fontWeight: "700", marginBottom: "1.25rem", color: "#1E1B4B" }}>
          ➕ Ajouter un nouveau produit
        </h3>
        <form onSubmit={handleAdd}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div className="form-group">
              <label className="form-label">Nom *</label>
              <input className="form-input" placeholder="Ex: Robe en pagne bleue" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Prix (FCFA) *</label>
              <input className="form-input" type="number" placeholder="8500" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Catégorie</label>
              <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">Sélectionner...</option>
                {["Robes", "Boubous", "Tops", "Pantalons", "Accessoires", "Ensemble"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Stock disponible</label>
              <input className="form-input" type="number" placeholder="10" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: "0.75rem" }}>
            <label className="form-label">Description</label>
            <textarea className="form-textarea" rows={2} placeholder="Description du produit..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">✨ Nouveauté ?</label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.87rem", marginTop: "0.35rem" }}>
                <input type="checkbox" checked={form.is_new} onChange={(e) => setForm({ ...form, is_new: e.target.checked })} />
                Marquer comme nouveau
              </label>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">🏷️ En promotion ?</label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.87rem", marginTop: "0.35rem" }}>
                <input type="checkbox" checked={form.in_promotion} onChange={(e) => setForm({ ...form, in_promotion: e.target.checked })} />
                Activer la promo
              </label>
            </div>
            {form.in_promotion && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">% de réduction</label>
                <input className="form-input" type="number" min="1" max="99" placeholder="Ex: 20" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
              </div>
            )}
          </div>
          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label className="form-label">📸 Photo du produit</label>
            <input type="file" accept="image/*" onChange={handleImg} style={{ fontSize: "0.87rem" }} />
            {preview && <img src={preview} alt="preview" style={{ width: "70px", height: "70px", objectFit: "cover", borderRadius: "8px", marginTop: "0.5rem" }} />}
          </div>

          {/* ── Couleurs ── */}
          <div className="form-group" style={{ marginBottom: "0.75rem" }}>
            <label className="form-label">🎨 Couleurs disponibles <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "var(--text-muted)" }}>(optionnel)</span></label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.5rem" }}>
              {form.colors.map((c, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "#F3F4F6", borderRadius: "999px", padding: "4px 10px", fontSize: "0.82rem", fontWeight: "600" }}>
                  <span style={{ width: "14px", height: "14px", borderRadius: "50%", background: c.hex, display: "inline-block", border: "1px solid rgba(0,0,0,0.15)", flexShrink: 0 }} />
                  {c.name}
                  <button type="button" onClick={() => removeColor(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: "1rem", lineHeight: 1, padding: "0 0 0 2px" }}>×</button>
                </span>
              ))}
              {form.colors.length === 0 && <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Aucune couleur ajoutée</span>}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <input
                className="form-input"
                placeholder="Nom de la couleur (ex: Rouge)"
                value={newColorName}
                onChange={(e) => setNewColorName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addColor())}
                style={{ flex: 1, minWidth: "140px" }}
              />
              <input
                type="color"
                value={newColorHex}
                onChange={(e) => setNewColorHex(e.target.value)}
                style={{ width: "44px", height: "38px", padding: "2px", border: "1.5px solid var(--border)", borderRadius: "6px", cursor: "pointer" }}
                title="Choisir la couleur"
              />
              <button type="button" className="btn btn-outline btn-sm" onClick={addColor}>+ Ajouter</button>
            </div>
          </div>

          {/* ── Tailles ── */}
          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label className="form-label">📏 Tailles disponibles <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "var(--text-muted)" }}>(optionnel)</span></label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {COMMON_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSize(s)}
                  style={{
                    padding: "4px 12px", borderRadius: "6px", fontSize: "0.82rem", fontWeight: "700", cursor: "pointer",
                    border: `1.5px solid ${form.sizes.includes(s) ? "var(--primary)" : "#E5E7EB"}`,
                    background: form.sizes.includes(s) ? "var(--primary)" : "white",
                    color: form.sizes.includes(s) ? "white" : "#374151",
                    transition: "all 0.15s",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            {form.sizes.length > 0 && (
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                Sélectionnées : {form.sizes.join(", ")}
              </p>
            )}
          </div>

          {err && <div className="alert alert-error" style={{ marginBottom: "0.75rem", fontSize: "0.87rem" }}>⚠️ {err}</div>}
          {ok && <div className="alert alert-success" style={{ marginBottom: "0.75rem", fontSize: "0.87rem" }}>✅ {ok}</div>}
          <button className="btn btn-accent" type="submit">Ajouter le produit</button>
        </form>
      </div>

      {/* Liste */}
      <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #F3F4F6" }}>
        <h3 style={{ fontFamily: "'Inter',sans-serif", fontSize: "1rem", fontWeight: "700", marginBottom: "1rem" }}>
          Catalogue ({products.length} produit{products.length !== 1 ? "s" : ""})
        </h3>
        {products.length === 0 ? (
          <div className="empty-state" style={{ padding: "2rem" }}>
            <div className="empty-icon">📦</div>
            <div className="empty-desc">Aucun produit. Ajoutez le premier ci-dessus.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Photo</th><th>Produit</th><th>Prix</th><th>Stock</th><th>Nouveauté</th><th>Disponibilité</th><th>Promotion</th><th>Action</th></tr></thead>
              <tbody>
                {products.map((p) => {
                  const isEditing = editingPromo[p.id] !== undefined;
                  const discounted = p.in_promotion && p.discount_percent > 0
                    ? Math.round(p.price * (1 - p.discount_percent / 100))
                    : null;
                  return (
                    <tr key={p.id} style={{ opacity: p.is_available === false ? 0.55 : 1 }}>
                      <td>
                        <img
                          src={p.image?.startsWith("/uploads") ? `${process.env.REACT_APP_API_URL || "http://localhost:5000"}${p.image}` : p.image?.startsWith("/") ? `${process.env.PUBLIC_URL}${p.image}` : p.image}
                          alt={p.name}
                          style={{ width: "44px", height: "44px", objectFit: "cover", borderRadius: "6px", background: "#F3F4F6" }}
                          onError={(e) => { e.target.src = "https://placehold.co/44x44/E8E6FF/1E1B4B?text=?"; }}
                        />
                      </td>
                      <td>
                        <strong>{p.name}</strong>
                        <div style={{ fontSize: "0.76rem", color: "#9CA3AF", marginTop: "2px" }}>{p.category || "—"}</div>
                      </td>
                      <td>
                        <strong style={{ color: discounted ? "#9CA3AF" : "#E11D48", textDecoration: discounted ? "line-through" : "none", fontSize: discounted ? "0.8rem" : "inherit" }}>
                          {p.price.toLocaleString()} FCFA
                        </strong>
                        {discounted && (
                          <div style={{ color: "#E11D48", fontWeight: "800", fontSize: "0.9rem" }}>{discounted.toLocaleString()} FCFA</div>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>{p.stock ?? <span style={{ color: "#9CA3AF" }}>∞</span>}</td>

                      {/* Nouveauté */}
                      <td>
                        <button
                          onClick={() => toggleNew(p)}
                          style={{
                            padding: "4px 10px", borderRadius: "999px", border: "none",
                            fontSize: "0.75rem", fontWeight: "700", cursor: "pointer",
                            background: p.is_new ? "#ECFDF5" : "#F3F4F6",
                            color: p.is_new ? "#059669" : "#6B7280",
                          }}
                        >
                          {p.is_new ? "✨ Nouveauté" : "+ Marquer"}
                        </button>
                      </td>

                      {/* Disponibilité */}
                      <td>
                        <button
                          onClick={() => toggleAvailable(p)}
                          style={{
                            padding: "4px 10px", borderRadius: "999px", border: "none",
                            fontSize: "0.75rem", fontWeight: "700", cursor: "pointer",
                            background: p.is_available !== false ? "#D1FAE5" : "#FEE2E2",
                            color: p.is_available !== false ? "#059669" : "#DC2626",
                          }}
                        >
                          {p.is_available !== false ? "✓ Disponible" : "⊘ Rupture"}
                        </button>
                      </td>

                      {/* Promotion */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <button
                            onClick={() => {
                              if (!p.in_promotion) {
                                setEditingPromo((prev) => ({ ...prev, [p.id]: p.discount_percent || "" }));
                              } else {
                                togglePromo(p);
                              }
                            }}
                            style={{
                              padding: "4px 10px", borderRadius: "999px", border: "none",
                              fontSize: "0.75rem", fontWeight: "700", cursor: "pointer",
                              background: p.in_promotion ? "#FEF3C7" : "#F3F4F6",
                              color: p.in_promotion ? "#D97706" : "#6B7280",
                            }}
                          >
                            {p.in_promotion ? `🏷️ Promo -${p.discount_percent}%` : "Ajouter promo"}
                          </button>
                          {isEditing && (
                            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                              <input
                                type="number" min="1" max="99" placeholder="%" autoFocus
                                value={editingPromo[p.id]}
                                onChange={(e) => setEditingPromo((prev) => ({ ...prev, [p.id]: e.target.value }))}
                                style={{ width: "52px", padding: "3px 6px", border: "1.5px solid #D4A017", borderRadius: "6px", fontSize: "0.82rem" }}
                              />
                              <button onClick={() => savePromoPercent(p)} style={{ background: "#D4A017", color: "white", border: "none", borderRadius: "6px", padding: "3px 8px", fontSize: "0.78rem", cursor: "pointer" }}>OK</button>
                              <button onClick={() => setEditingPromo((prev) => { const n = { ...prev }; delete n[p.id]; return n; })} style={{ background: "#F3F4F6", border: "none", borderRadius: "6px", padding: "3px 6px", fontSize: "0.78rem", cursor: "pointer" }}>✕</button>
                            </div>
                          )}
                        </div>
                      </td>

                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id, p.name)}>Supprimer</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────── COMMANDES ─────────────── */
const WORKFLOW = [
  { status: "en attente",  label: "En attente",  color: "#F59E0B", bg: "#FFF9E6", icon: "⏳" },
  { status: "confirmée",   label: "Confirmée",   color: "#6366F1", bg: "#EEF2FF", icon: "✅" },
  { status: "expédiée",    label: "Expédiée",    color: "#0EA5E9", bg: "#F0F9FF", icon: "🚚" },
  { status: "livrée",      label: "Livrée",      color: "#10B981", bg: "#F0FDF4", icon: "🎁" },
  { status: "annulée",     label: "Annulée",     color: "#EF4444", bg: "#FFF1F2", icon: "✗"  },
];

function OrderCard({ o, onAction, onRefund, expanded, onToggle }) {
  const items = typeof o.items === "string" ? JSON.parse(o.items) : (o.items || []);
  const ps = PAYMENT_STATUS_MAP[o.payment_status] || PAYMENT_STATUS_MAP["en attente"];
  const ws = WORKFLOW.find((w) => w.status === o.status) || WORKFLOW[0];
  const needsPaymentValidation =
    ["en attente paiement", "en attente"].includes(o.payment_status) &&
    ["orange_money", "wave", "card"].includes(o.payment_method);

  // Formulaire de remboursement
  const [showRefund, setShowRefund] = useState(false);
  const [refundForm, setRefundForm] = useState({ reason: "", refund_method: "", refund_number: "", customer_email: "" });
  const [refundLoading, setRefundLoading] = useState(false);

  const canRefund = o.status !== "annulée" && o.payment_status === "payée";

  async function handleRefund() {
    if (!window.confirm(`Annuler la commande #${o.id} et enregistrer le remboursement de ${o.total?.toLocaleString()} FCFA ?`)) return;
    setRefundLoading(true);
    try {
      await onRefund(o.id, refundForm);
      setShowRefund(false);
    } catch (e) {
      alert("Erreur : " + e.message);
    } finally {
      setRefundLoading(false);
    }
  }

  return (
    <div style={{ background: "white", borderRadius: "16px", border: `2px solid ${needsPaymentValidation ? "#F59E0B" : "#F3F4F6"}`, marginBottom: "1rem", overflow: "hidden" }}>
      {/* Barre supérieure */}
      {needsPaymentValidation && (
        <div style={{ background: "#FEF3C7", padding: "6px 1.25rem", fontSize: "0.8rem", color: "#92400E", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          🔔 Paiement {PAYMENT_LABEL[o.payment_method]} à valider
          {o.payment_ref && <span style={{ fontWeight: "400" }}>– Réf client : <strong>{o.payment_ref}</strong></span>}
        </div>
      )}

      {/* Ligne principale — cliquable */}
      <div
        onClick={onToggle}
        style={{ padding: "1rem 1.25rem", cursor: "pointer", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}
      >
        {/* ID + date */}
        <div style={{ minWidth: "60px" }}>
          <div style={{ fontWeight: "800", color: "#1E1B4B", fontSize: "0.95rem" }}>#{o.id}</div>
          <div style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>
            {new Date(o.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
          </div>
        </div>

        {/* Client */}
        <div style={{ flex: 1, minWidth: "140px" }}>
          <div style={{ fontWeight: "700", fontSize: "0.88rem" }}>{o.customer_name}</div>
          <div style={{ fontSize: "0.78rem", color: "#6B7280" }}>{o.customer_phone}</div>
        </div>

        {/* Articles */}
        <div style={{ flex: 2, minWidth: "160px", fontSize: "0.82rem", color: "#4B5563" }}>
          {items.slice(0, 2).map((it, i) => (
            <span key={i}>{it.name} ×{it.quantity}{i < Math.min(items.length, 2) - 1 ? ", " : ""}</span>
          ))}
          {items.length > 2 && <span style={{ color: "#9CA3AF" }}> +{items.length - 2}</span>}
        </div>

        {/* Montant */}
        <div style={{ fontWeight: "800", color: "#E11D48", minWidth: "90px", textAlign: "right", fontSize: "0.95rem" }}>
          {o.total?.toLocaleString()} FCFA
        </div>

        {/* Statut paiement */}
        <span style={{ fontSize: "0.72rem", fontWeight: "700", color: ps.color, background: ps.bg, padding: "4px 10px", borderRadius: "999px", whiteSpace: "nowrap" }}>
          {ps.label}
        </span>

        {/* Statut commande */}
        <span style={{ fontSize: "0.72rem", fontWeight: "700", color: ws.color, background: ws.bg, padding: "4px 10px", borderRadius: "999px", whiteSpace: "nowrap" }}>
          {ws.icon} {ws.label}
        </span>

        <div style={{ color: "#D1D5DB", fontSize: "0.9rem", marginLeft: "auto" }}>{expanded ? "▲" : "▼"}</div>
      </div>

      {/* Détail expandable */}
      {expanded && (
        <div style={{ borderTop: "1px solid #F3F4F6", padding: "1.25rem", background: "#FAFAFA" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.25rem" }}>
            {/* Infos client */}
            <div>
              <div style={{ fontWeight: "700", fontSize: "0.82rem", color: "#1E1B4B", marginBottom: "0.5rem" }}>👤 Client</div>
              <div style={{ fontSize: "0.83rem", color: "#4B5563", lineHeight: 1.8 }}>
                <div>{o.customer_name}</div>
                <div>📞 {o.customer_phone}</div>
                {o.customer_address && <div>📍 {o.customer_address}</div>}
              </div>
              <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.4rem" }}>
                <a href={`https://wa.me/${(o.customer_phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjour ${o.customer_name}, votre commande #${o.id} chez Agnès Shop est prête !`)}`}
                  target="_blank" rel="noreferrer"
                  className="btn" style={{ background: "#25D366", color: "white", border: "none", fontSize: "0.75rem", padding: "4px 10px", textDecoration: "none" }}>
                  💬 WhatsApp
                </a>
                <a href={`tel:${o.customer_phone}`} className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "4px 10px", textDecoration: "none" }}>
                  📞 Appeler
                </a>
              </div>
            </div>
            {/* Détail articles */}
            <div>
              <div style={{ fontWeight: "700", fontSize: "0.82rem", color: "#1E1B4B", marginBottom: "0.5rem" }}>🛍 Articles commandés</div>
              {items.map((it, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.83rem", color: "#4B5563", padding: "3px 0", borderBottom: "1px solid #E5E7EB" }}>
                  <span>{it.name} ×{it.quantity}</span>
                  <span style={{ fontWeight: "600" }}>{(it.price * it.quantity).toLocaleString()} FCFA</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "800", color: "#E11D48", marginTop: "6px", fontSize: "0.9rem" }}>
                <span>Total</span><span>{o.total?.toLocaleString()} FCFA</span>
              </div>
            </div>
          </div>

          {/* Actions — changer le statut */}
          <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: "1rem" }}>
            <div style={{ fontWeight: "700", fontSize: "0.82rem", color: "#1E1B4B", marginBottom: "0.75rem" }}>
              ⚡ Actions rapides
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>

              {/* Boutons de workflow (progression normale) */}
              {needsPaymentValidation && (
                <button onClick={() => onAction(o.id, "confirmée", "payée")}
                  style={{ background: "#10B981", color: "white", border: "none", borderRadius: "8px", padding: "0.5rem 1rem", fontSize: "0.83rem", fontWeight: "700", cursor: "pointer" }}>
                  ✅ Valider le paiement et confirmer
                </button>
              )}
              {o.status === "en attente" && !needsPaymentValidation && (
                <button onClick={() => onAction(o.id, "confirmée", null)}
                  style={{ background: "#6366F1", color: "white", border: "none", borderRadius: "8px", padding: "0.5rem 1rem", fontSize: "0.83rem", fontWeight: "700", cursor: "pointer" }}>
                  ✅ Confirmer la commande
                </button>
              )}
              {o.status === "confirmée" && (
                <button onClick={() => onAction(o.id, "expédiée", null)}
                  style={{ background: "#0EA5E9", color: "white", border: "none", borderRadius: "8px", padding: "0.5rem 1rem", fontSize: "0.83rem", fontWeight: "700", cursor: "pointer" }}>
                  🚚 Marquer comme expédiée
                </button>
              )}
              {o.status === "expédiée" && (
                <button onClick={() => onAction(o.id, "livrée", null)}
                  style={{ background: "#10B981", color: "white", border: "none", borderRadius: "8px", padding: "0.5rem 1rem", fontSize: "0.83rem", fontWeight: "700", cursor: "pointer" }}>
                  🎁 Marquer comme livrée
                </button>
              )}

              {/* Changer statut manuellement */}
              <select
                value={o.status}
                onChange={(e) => onAction(o.id, e.target.value, null)}
                style={{ fontSize: "0.82rem", padding: "0.5rem 0.75rem", border: "1.5px solid #E5E7EB", borderRadius: "8px", cursor: "pointer", background: "white" }}
              >
                <option value="" disabled>Changer le statut…</option>
                {WORKFLOW.map((w) => (
                  <option key={w.status} value={w.status}>{w.icon} {w.label}</option>
                ))}
              </select>

              {/* Annuler simple */}
              {o.status !== "annulée" && o.status !== "livrée" && !canRefund && (
                <button onClick={() => {
                  if (window.confirm(`Annuler la commande #${o.id} de ${o.customer_name} ?`)) onAction(o.id, "annulée", null);
                }}
                  style={{ background: "white", color: "#EF4444", border: "1.5px solid #EF4444", borderRadius: "8px", padding: "0.5rem 1rem", fontSize: "0.83rem", fontWeight: "700", cursor: "pointer" }}>
                  ✗ Annuler
                </button>
              )}

              {/* Annuler + Rembourser (si paiement déjà reçu) */}
              {canRefund && (
                <button
                  onClick={() => setShowRefund((v) => !v)}
                  style={{ background: showRefund ? "#FEE2E2" : "white", color: "#DC2626", border: "2px solid #DC2626", borderRadius: "8px", padding: "0.5rem 1rem", fontSize: "0.83rem", fontWeight: "700", cursor: "pointer" }}>
                  💸 Annuler & Rembourser
                </button>
              )}
            </div>

            {/* Formulaire de remboursement */}
            {showRefund && canRefund && (
              <div style={{ marginTop: "1rem", background: "#FFF5F5", border: "2px solid #FECACA", borderRadius: "12px", padding: "1.25rem" }}>
                <div style={{ fontWeight: "700", color: "#991B1B", fontSize: "0.9rem", marginBottom: "1rem" }}>
                  💸 Remboursement — Commande #{o.id} · <span style={{ color: "#DC2626" }}>{o.total?.toLocaleString()} FCFA</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Motif de l'annulation</label>
                    <input className="form-input" placeholder="Ex: Produit épuisé, erreur de stock..." value={refundForm.reason} onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Email du client (pour notifier)</label>
                    <input className="form-input" type="email" placeholder="client@email.com" value={refundForm.customer_email} onChange={(e) => setRefundForm({ ...refundForm, customer_email: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Mode de remboursement</label>
                    <select className="form-select" value={refundForm.refund_method} onChange={(e) => setRefundForm({ ...refundForm, refund_method: e.target.value })}>
                      <option value="">Sélectionner...</option>
                      <option value="Orange Money">🟠 Orange Money</option>
                      <option value="Wave">🔵 Wave</option>
                      <option value="Espèces">💵 Espèces à la livraison</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Numéro de remboursement</label>
                    <input className="form-input" placeholder="Ex: 77 XXX XX XX" value={refundForm.refund_number} onChange={(e) => setRefundForm({ ...refundForm, refund_number: e.target.value })} />
                  </div>
                </div>

                {/* Lien WhatsApp pré-rempli */}
                <a
                  href={`https://wa.me/${(o.customer_phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Bonjour ${o.customer_name} ! 👋\n\nNous sommes désolés, votre commande #${o.id} doit être annulée${refundForm.reason ? ` (${refundForm.reason})` : ""}.\n\nNous allons vous rembourser ${o.total?.toLocaleString()} FCFA${refundForm.refund_method ? ` via ${refundForm.refund_method}` : ""}${refundForm.refund_number ? ` au ${refundForm.refund_number}` : ""} dans les 24-48h.\n\nMerci pour votre compréhension 🙏\n— Agnès Shop`
                  )}`}
                  target="_blank" rel="noreferrer"
                  style={{ display: "inline-block", background: "#25D366", color: "white", padding: "0.5rem 1rem", borderRadius: "8px", fontSize: "0.82rem", fontWeight: "700", textDecoration: "none", marginBottom: "0.75rem" }}
                >
                  💬 Envoyer message WhatsApp au client
                </a>

                <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                  <button
                    onClick={handleRefund}
                    disabled={refundLoading}
                    style={{ background: "#DC2626", color: "white", border: "none", borderRadius: "8px", padding: "0.6rem 1.25rem", fontSize: "0.85rem", fontWeight: "700", cursor: "pointer" }}
                  >
                    {refundLoading ? "⏳ En cours..." : "✓ Confirmer l'annulation & remboursement"}
                  </button>
                  <button onClick={() => setShowRefund(false)} style={{ background: "white", border: "1.5px solid #D1D5DB", borderRadius: "8px", padding: "0.6rem 1rem", fontSize: "0.85rem", cursor: "pointer" }}>
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Orders({ orders, reload }) {
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const needsAction = orders.filter(o =>
    ["en attente paiement", "en attente"].includes(o.payment_status) &&
    ["orange_money", "wave", "card"].includes(o.payment_method)
  ).length;

  async function handleAction(id, status, payment_status) {
    try {
      await updateOrderStatus(id, status, payment_status);
      reload();
    } catch (e) { alert("Erreur : " + e.message); }
  }

  async function handleRefund(id, data) {
    await refundOrder(id, data);
    reload();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.5rem" }}>Gestion des Commandes</h2>
        {needsAction > 0 && (
          <div style={{ background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: "8px", padding: "6px 14px", fontSize: "0.82rem", fontWeight: "700", color: "#92400E" }}>
            🔔 {needsAction} paiement{needsAction > 1 ? "s" : ""} à valider
          </div>
        )}
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {[
          { val: "all",       label: "Toutes",     color: "#1E1B4B" },
          { val: "en attente", label: "⏳ En attente", color: "#F59E0B" },
          { val: "confirmée",  label: "✅ Confirmées", color: "#6366F1" },
          { val: "expédiée",   label: "🚚 Expédiées",  color: "#0EA5E9" },
          { val: "livrée",     label: "🎁 Livrées",    color: "#10B981" },
          { val: "annulée",    label: "✗ Annulées",    color: "#EF4444" },
        ].map((f) => {
          const count = f.val === "all" ? orders.length : orders.filter(o => o.status === f.val).length;
          const active = filter === f.val;
          return (
            <button key={f.val} onClick={() => setFilter(f.val)}
              style={{
                padding: "0.4rem 1rem", borderRadius: "999px", fontSize: "0.82rem", fontWeight: "700", cursor: "pointer",
                background: active ? f.color : "white",
                color: active ? "white" : f.color,
                border: `2px solid ${f.color}`,
              }}>
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: "3rem" }}>
          <div className="empty-icon">📋</div>
          <div className="empty-desc">Aucune commande dans cette catégorie</div>
        </div>
      ) : (
        <div>
          {filtered.map((o) => (
            <OrderCard
              key={o.id}
              o={o}
              onAction={handleAction}
              onRefund={handleRefund}
              expanded={expanded === o.id}
              onToggle={() => setExpanded(expanded === o.id ? null : o.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────── CLIENTS ─────────────── */
function Clients() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null); // client sélectionné pour détail

  useEffect(() => {
    setLoading(true);
    getCustomers()
      .then(setCustomers)
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter((c) =>
    `${c.first_name} ${c.last_name} ${c.email} ${c.phone || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = customers.reduce((s, c) => s + Number(c.total_spent || 0), 0);
  const totalOrders = customers.reduce((s, c) => s + Number(c.order_count || 0), 0);

  return (
    <div>
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.5rem", marginBottom: "1.5rem" }}>
        Gestion des Clients
      </h2>

      {/* Stats rapides */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { icon: "👥", label: "Clients inscrits", value: customers.length, color: "#1E1B4B" },
          { icon: "📋", label: "Commandes passées", value: totalOrders, color: "#6366F1" },
          { icon: "💰", label: "CA clients fidèles", value: `${totalRevenue.toLocaleString()} FCFA`, color: "#D4A017" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color, fontSize: "1.15rem" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Barre de recherche */}
      <div style={{ marginBottom: "1rem" }}>
        <input
          className="form-input"
          placeholder="🔍 Rechercher par nom, email ou téléphone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: "400px" }}
        />
      </div>

      {loading ? (
        <div className="loading-state"><div className="spinner" /><p>Chargement des clients...</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <div className="empty-title">{search ? "Aucun résultat" : "Aucun client inscrit"}</div>
          <div className="empty-desc">{search ? "Essayez un autre terme." : "Les clients apparaîtront ici quand ils créeront un compte."}</div>
        </div>
      ) : (
        <div style={{ background: "white", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #F3F4F6", overflow: "hidden" }}>
          {filtered.map((c, i) => (
            <div
              key={c.id}
              style={{
                display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.5rem",
                borderBottom: i < filtered.length - 1 ? "1px solid #F3F4F6" : "none",
                cursor: "pointer", background: selected?.id === c.id ? "#F8F7FF" : "white",
                transition: "background 0.15s",
              }}
              onClick={() => setSelected(selected?.id === c.id ? null : c)}
            >
              {/* Avatar */}
              <div style={{
                width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #1E1B4B, #6366F1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontWeight: "700", fontSize: "1rem",
              }}>
                {c.first_name[0]}{c.last_name[0]}
              </div>

              {/* Infos */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: "700", fontSize: "0.92rem", color: "#1E1B4B" }}>
                  {c.first_name} {c.last_name}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#6B7280", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <span>✉️ {c.email}</span>
                  {c.phone && <span>📞 {c.phone}</span>}
                  {c.address && <span>📍 {c.address}</span>}
                </div>
              </div>

              {/* Stats client */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontWeight: "700", color: "#E11D48", fontSize: "0.92rem" }}>
                  {Number(c.total_spent).toLocaleString()} FCFA
                </div>
                <div style={{ fontSize: "0.78rem", color: "#9CA3AF" }}>
                  {c.order_count} commande{c.order_count > 1 ? "s" : ""}
                </div>
              </div>

              {/* Date + badge */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>
                  Inscrit le {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
                {Number(c.order_count) >= 2 && (
                  <span style={{ fontSize: "0.7rem", background: "#FEF3C7", color: "#92400E", padding: "2px 8px", borderRadius: "999px", fontWeight: "700" }}>
                    ⭐ Fidèle
                  </span>
                )}
              </div>

              <div style={{ color: "#D1D5DB", fontSize: "1rem" }}>{selected?.id === c.id ? "▲" : "▼"}</div>
            </div>
          ))}

          {/* Détail client expandable */}
          {selected && (
            <div style={{ background: "#F8F7FF", padding: "1.25rem 1.5rem", borderTop: "2px solid var(--primary)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: "1rem" }}>
                <div>
                  <div style={{ fontWeight: "700", fontSize: "0.85rem", color: "#1E1B4B", marginBottom: "0.5rem" }}>
                    📋 Informations du compte
                  </div>
                  <div style={{ fontSize: "0.83rem", color: "#4B5563", lineHeight: 2 }}>
                    <div><strong>Email :</strong> {selected.email}</div>
                    <div><strong>Téléphone :</strong> {selected.phone || "—"}</div>
                    <div><strong>Adresse :</strong> {selected.address || "—"}</div>
                    <div><strong>Membre depuis :</strong> {new Date(selected.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: "700", fontSize: "0.85rem", color: "#1E1B4B", marginBottom: "0.5rem" }}>
                    💬 Contacter ce client
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {selected.phone && (
                      <>
                        <a
                          href={`https://wa.me/${selected.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjour ${selected.first_name}, c'est Agnès Shop ! 👗`)}`}
                          target="_blank" rel="noreferrer"
                          className="btn"
                          style={{ background: "#25D366", color: "white", border: "none", fontSize: "0.8rem", padding: "0.4rem 0.9rem", textDecoration: "none" }}
                        >
                          💬 WhatsApp
                        </a>
                        <a
                          href={`tel:${selected.phone}`}
                          className="btn btn-outline"
                          style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem", textDecoration: "none" }}
                        >
                          📞 Appeler
                        </a>
                      </>
                    )}
                    <a
                      href={`mailto:${selected.email}?subject=${encodeURIComponent("Agnès Shop – Message pour vous")}`}
                      className="btn btn-outline"
                      style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem", textDecoration: "none" }}
                    >
                      ✉️ Email
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────── MESSAGES DE CONTACT ─────────────── */
function Messages({ onUnreadChange }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const SUBJECT_LABELS = {
    commande: "Question sur une commande",
    mesure: "Commande sur mesure",
    livraison: "Livraison et délais",
    retour: "Retour / échange",
    autre: "Autre",
  };

  async function load() {
    try {
      const msgs = await getContactMessages();
      setMessages(msgs);
      onUnreadChange(msgs.filter((m) => !m.is_read).length);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line

  async function handleOpen(msg) {
    setSelected(msg);
    if (!msg.is_read) {
      await markMessageRead(msg.id).catch(() => {});
      setMessages((prev) =>
        prev.map((m) => m.id === msg.id ? { ...m, is_read: true } : m)
      );
      onUnreadChange((prev) => Math.max(0, prev - 1));
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Supprimer ce message ?")) return;
    await deleteContactMessage(id).catch(() => {});
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  if (loading) return <div style={{ padding: "2rem", color: "var(--text-muted)" }}>Chargement…</div>;

  return (
    <div>
      <h2 style={{ fontSize: "1.4rem", fontWeight: "800", marginBottom: "1.5rem" }}>
        💬 Messages de contact
        {messages.filter((m) => !m.is_read).length > 0 && (
          <span style={{ marginLeft: "0.75rem", background: "#EF4444", color: "white", borderRadius: "9999px", fontSize: "0.8rem", fontWeight: "700", padding: "2px 10px" }}>
            {messages.filter((m) => !m.is_read).length} non lu{messages.filter((m) => !m.is_read).length > 1 ? "s" : ""}
          </span>
        )}
      </h2>

      {messages.length === 0 ? (
        <div className="card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📭</div>
          <p>Aucun message pour le moment.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1.5fr" : "1fr", gap: "1.25rem", alignItems: "start" }}>

          {/* Liste des messages */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="card"
                onClick={() => handleOpen(msg)}
                style={{
                  padding: "1rem 1.25rem", cursor: "pointer",
                  borderLeft: `4px solid ${msg.is_read ? "var(--border)" : "#6366F1"}`,
                  background: selected?.id === msg.id ? "var(--bg)" : "white",
                  transition: "box-shadow 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                  <div>
                    <div style={{ fontWeight: msg.is_read ? "600" : "800", fontSize: "0.95rem", color: "var(--text)" }}>
                      {!msg.is_read && <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#6366F1", marginRight: "6px", verticalAlign: "middle" }} />}
                      {msg.name}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      {SUBJECT_LABELS[msg.subject] || msg.subject || "Sans sujet"}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "220px" }}>
                      {msg.message}
                    </div>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {new Date(msg.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Détail du message sélectionné */}
          {selected && (
            <div className="card" style={{ padding: "1.75rem", position: "sticky", top: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: "1.1rem", fontWeight: "800" }}>{selected.name}</h3>
                  <div style={{ fontSize: "0.83rem", color: "var(--text-muted)" }}>
                    {new Date(selected.created_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.25rem", background: "var(--bg)", borderRadius: "10px", padding: "1rem" }}>
                <div style={{ fontSize: "0.85rem" }}>✉️ <a href={`mailto:${selected.email}`} style={{ color: "var(--primary)", fontWeight: "600" }}>{selected.email}</a></div>
                {selected.phone && <div style={{ fontSize: "0.85rem" }}>📞 <a href={`tel:${selected.phone}`} style={{ color: "var(--primary)", fontWeight: "600" }}>{selected.phone}</a></div>}
                <div style={{ fontSize: "0.85rem" }}>📌 {SUBJECT_LABELS[selected.subject] || selected.subject || "Sans sujet"}</div>
              </div>

              <div style={{ background: "#FAFAFA", borderLeft: "4px solid #6366F1", borderRadius: "0 8px 8px 0", padding: "1rem 1.25rem", marginBottom: "1.5rem", fontSize: "0.92rem", lineHeight: "1.7", color: "var(--text)", whiteSpace: "pre-wrap" }}>
                {selected.message}
              </div>

              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <a
                  href={`mailto:${selected.email}?subject=Re: ${SUBJECT_LABELS[selected.subject] || "Votre message"} — Agnès Shop`}
                  className="btn btn-primary"
                  style={{ textDecoration: "none", fontSize: "0.87rem" }}
                >
                  ✉️ Répondre par email
                </a>
                {selected.phone && (
                  <a
                    href={`https://wa.me/${selected.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Bonjour ${selected.name}, merci pour votre message. `)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn"
                    style={{ background: "#25D366", color: "white", border: "none", textDecoration: "none", fontSize: "0.87rem" }}
                  >
                    💬 WhatsApp
                  </a>
                )}
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="btn btn-outline"
                  style={{ color: "#EF4444", borderColor: "#EF4444", fontSize: "0.87rem" }}
                >
                  🗑️ Supprimer
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────── PARAMÈTRES ─────────────── */
function Settings() {
  const [s, setS] = useState({});
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState("");

  useEffect(() => { getSettings().then(setS).catch(() => {}); }, []);

  const field = (key, label, placeholder, type = "text") => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {type === "textarea" ? (
        <textarea className="form-textarea" rows={2} placeholder={placeholder} value={s[key] || ""} onChange={(e) => setS({ ...s, [key]: e.target.value })} />
      ) : (
        <input className="form-input" type={type} placeholder={placeholder} value={s[key] || ""} onChange={(e) => setS({ ...s, [key]: e.target.value })} />
      )}
    </div>
  );

  async function handleSave() {
    setSaving(true); setOk("");
    try {
      await updateSettings(s);
      setOk("Paramètres sauvegardés !");
      setTimeout(() => setOk(""), 3000);
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.5rem", marginBottom: "1.5rem" }}>Paramètres du site</h2>

      <div style={{ display: "grid", gap: "1.5rem" }}>
        {/* Infos générales */}
        <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #F3F4F6" }}>
          <h3 style={{ fontFamily: "'Inter',sans-serif", fontSize: "0.95rem", fontWeight: "700", marginBottom: "1.25rem", color: "#1E1B4B" }}>🏪 Informations de la boutique</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {field("store_name", "Nom de la boutique", "Agnès Shop")}
            {field("store_phone", "Téléphone", "+221 77 XXX XX XX")}
            {field("store_email", "Email", "contact@agnesshop.com")}
            {field("store_address", "Adresse", "Dakar, Sénégal")}
          </div>
          <div style={{ marginTop: "0.75rem" }}>
            {field("about_text", "À propos de la boutique", "Description de votre boutique...", "textarea")}
          </div>
        </div>

        {/* Paiements */}
        <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #F3F4F6" }}>
          <h3 style={{ fontFamily: "'Inter',sans-serif", fontSize: "0.95rem", fontWeight: "700", marginBottom: "1.25rem", color: "#1E1B4B" }}>💳 Moyens de paiement</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group">
              <label className="form-label">🟠 Numéro Orange Money</label>
              <input className="form-input" placeholder="77 XXX XX XX" value={s.orange_money_number || ""} onChange={(e) => setS({ ...s, orange_money_number: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">🔵 Numéro Wave</label>
              <input className="form-input" placeholder="77 XXX XX XX" value={s.wave_number || ""} onChange={(e) => setS({ ...s, wave_number: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">💬 Numéro WhatsApp</label>
              <input className="form-input" placeholder="221774540996 (sans +)" value={s.whatsapp_number || ""} onChange={(e) => setS({ ...s, whatsapp_number: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Livraison */}
        <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #F3F4F6" }}>
          <h3 style={{ fontFamily: "'Inter',sans-serif", fontSize: "0.95rem", fontWeight: "700", marginBottom: "1.25rem", color: "#1E1B4B" }}>🚚 Livraison</h3>
          {field("delivery_info", "Message d'information livraison", "Ex: Livraison 24h à Dakar, frais 1 000 FCFA", "textarea")}
        </div>

        {/* Réseaux sociaux */}
        <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #F3F4F6" }}>
          <h3 style={{ fontFamily: "'Inter',sans-serif", fontSize: "0.95rem", fontWeight: "700", marginBottom: "1.25rem", color: "#1E1B4B" }}>🌐 Réseaux sociaux</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {field("instagram", "Instagram (URL)", "https://instagram.com/...")}
            {field("facebook", "Facebook (URL)", "https://facebook.com/...")}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1.5rem", alignItems: "center" }}>
        {ok && <span style={{ color: "var(--success)", fontWeight: "600", fontSize: "0.9rem" }}>✅ {ok}</span>}
        <button className="btn btn-accent btn-lg" onClick={handleSave} disabled={saving}>
          {saving ? "⏳ Sauvegarde..." : "💾 Sauvegarder les paramètres"}
        </button>
      </div>
    </div>
  );
}

/* ─────────────── VISITEURS EN DIRECT ─────────────── */
function LiveVisitors({ adminToken }) {
  const [visitors, setVisitors] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("admin:join", adminToken);
    });

    socket.on("visitors:list", (list) => {
      setVisitors(list);
    });

    return () => socket.disconnect();
  }, [adminToken]);

  const PAGE_ICON = {
    "Accueil":      "🏠",
    "Boutique":     "🛍️",
    "Panier":       "🛒",
    "Confirmation": "✅",
    "Connexion":    "🔑",
    "Mon Compte":   "👤",
    "Contact":      "✉️",
  };

  function timeSince(iso) {
    const sec = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (sec < 60) return `${sec}s`;
    if (sec < 3600) return `${Math.floor(sec / 60)}min`;
    return `${Math.floor(sec / 3600)}h`;
  }

  const active = visitors.filter((v) => {
    const secs = (Date.now() - new Date(v.lastSeen)) / 1000;
    return secs < 300; // actif dans les 5 dernières minutes
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.5rem", margin: 0 }}>
          Visiteurs en direct
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10B981", animation: "pulse-dot 2s infinite" }} />
          <span style={{ fontSize: "0.88rem", color: "#6B7280", fontWeight: "600" }}>
            {active.length} visiteur{active.length !== 1 ? "s" : ""} actif{active.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {active.length === 0 ? (
        <div className="empty-state" style={{ padding: "3rem" }}>
          <div className="empty-icon">👁️</div>
          <div className="empty-title">Aucun visiteur en ce moment</div>
          <div className="empty-desc">Les visiteurs apparaîtront ici dès qu'ils naviguent sur le site.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {active.map((v) => (
            <div key={v.id} style={{
              background: "white", borderRadius: "14px", padding: "1rem 1.25rem",
              border: v.checkoutStep ? "2px solid #D4A017" : "1px solid #F3F4F6",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap",
            }}>
              {/* Avatar */}
              <div style={{
                width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0,
                background: v.isLoggedIn
                  ? "linear-gradient(135deg,#1E1B4B,#6366F1)"
                  : "linear-gradient(135deg,#6B7280,#9CA3AF)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontSize: "1.1rem", fontWeight: "700",
              }}>
                {v.isLoggedIn ? (v.customerName?.[0] || "C") : "?"}
              </div>

              {/* Identité */}
              <div style={{ flex: 1, minWidth: "140px" }}>
                <div style={{ fontWeight: "700", fontSize: "0.9rem", color: "#1E1B4B" }}>
                  {v.isLoggedIn
                    ? (v.customerName || "Client connecté")
                    : "Visiteur anonyme"}
                  {v.isLoggedIn && (
                    <span style={{ marginLeft: "6px", fontSize: "0.7rem", background: "#EEF2FF", color: "#6366F1", padding: "2px 7px", borderRadius: "999px", fontWeight: "700" }}>
                      Compte
                    </span>
                  )}
                </div>
                {v.customerEmail && (
                  <div style={{ fontSize: "0.78rem", color: "#9CA3AF" }}>{v.customerEmail}</div>
                )}
              </div>

              {/* Page actuelle */}
              <div style={{ textAlign: "center", minWidth: "120px" }}>
                <div style={{ fontSize: "1.2rem" }}>
                  {PAGE_ICON[v.page] || "🌐"}
                </div>
                <div style={{ fontSize: "0.8rem", fontWeight: "700", color: "#374151" }}>
                  {v.checkoutStep || v.page}
                </div>
              </div>

              {/* Panier */}
              {v.cartCount > 0 && (
                <div style={{
                  background: "#FFF9E6", border: "1px solid #D4A017", borderRadius: "10px",
                  padding: "0.5rem 0.85rem", minWidth: "110px",
                }}>
                  <div style={{ fontSize: "0.75rem", color: "#92400E", fontWeight: "700", marginBottom: "3px" }}>
                    🛒 {v.cartCount} article{v.cartCount > 1 ? "s" : ""}
                  </div>
                  {v.cartItems?.slice(0, 2).map((it, i) => (
                    <div key={i} style={{ fontSize: "0.72rem", color: "#78350F" }}>
                      {it.name} ×{it.qty}
                    </div>
                  ))}
                  {v.cartItems?.length > 2 && (
                    <div style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>+{v.cartItems.length - 2} autre(s)</div>
                  )}
                </div>
              )}

              {/* Temps */}
              <div style={{ textAlign: "right", fontSize: "0.75rem", color: "#9CA3AF", flexShrink: 0 }}>
                <div>Dernière activité</div>
                <div style={{ fontWeight: "700", color: "#6B7280" }}>{timeSince(v.lastSeen)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.5); }
        }
      `}</style>
    </div>
  );
}

/* ─────────────── ADMIN PRINCIPAL ─────────────── */
export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [liveCount, setLiveCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const adminSocketRef = useRef(null);

  useEffect(() => {
    verifyToken().then((v) => { if (v) setLoggedIn(true); });
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [p, o] = await Promise.all([getProducts(), getOrders()]);
      setProducts(p);
      setOrders(o);
      setStats({
        total_orders: o.length,
        total_revenue: o.filter(x => x.status !== "annulée").reduce((s, x) => s + x.total, 0),
        orders_today: o.filter(x => new Date(x.created_at).toDateString() === new Date().toDateString()).length,
        pending_orders: o.filter(x => x.status === "en attente").length,
        paid_orders: o.filter(x => x.payment_status === "payée").length,
      });
    } catch {}
  }, []);

  async function handleValidatePayment(orderId, paymentStatus) {
    try {
      await updateOrderStatus(orderId, paymentStatus === "payée" ? "confirmée" : null, paymentStatus);
      loadAll();
    } catch (e) { alert("Erreur : " + e.message); }
  }

  useEffect(() => { if (loggedIn) loadAll(); }, [loggedIn, loadAll]);

  // Charger le nombre de messages non lus
  useEffect(() => {
    if (!loggedIn) return;
    getContactMessages()
      .then((msgs) => setUnreadMessages(msgs.filter((m) => !m.is_read).length))
      .catch(() => {});
  }, [loggedIn]);

  // Connexion socket pour le compteur de visiteurs dans la sidebar
  useEffect(() => {
    if (!loggedIn) return;
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    adminSocketRef.current = socket;
    socket.on("connect", () => {
      socket.emit("admin:join", localStorage.getItem("adminToken"));
    });
    socket.on("visitors:list", (list) => {
      const active = list.filter((v) => (Date.now() - new Date(v.lastSeen)) / 1000 < 300);
      setLiveCount(active.length);
    });
    return () => socket.disconnect();
  }, [loggedIn]);

  function handleLogout() {
    localStorage.removeItem("adminToken");
    setLoggedIn(false);
  }

  if (!loggedIn) return <LoginForm onLogin={() => setLoggedIn(true)} />;

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-title">Navigation</div>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`admin-nav-item ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="admin-nav-icon">{tab.icon}</span>
            {tab.label}
            {tab.id === "orders" && stats?.pending_orders > 0 && (
              <span style={{ marginLeft: "auto", background: "var(--rose)", color: "white", borderRadius: "9999px", fontSize: "0.7rem", fontWeight: "700", padding: "1px 7px", minWidth: "20px", textAlign: "center" }}>
                {stats.pending_orders}
              </span>
            )}
            {tab.id === "visitors" && liveCount > 0 && (
              <span style={{ marginLeft: "auto", background: "#10B981", color: "white", borderRadius: "9999px", fontSize: "0.7rem", fontWeight: "700", padding: "1px 7px", minWidth: "20px", textAlign: "center" }}>
                {liveCount}
              </span>
            )}
            {tab.id === "messages" && unreadMessages > 0 && (
              <span style={{ marginLeft: "auto", background: "#EF4444", color: "white", borderRadius: "9999px", fontSize: "0.7rem", fontWeight: "700", padding: "1px 7px", minWidth: "20px", textAlign: "center" }}>
                {unreadMessages}
              </span>
            )}
          </button>
        ))}

        <div style={{ marginTop: "auto", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <button className="admin-nav-item" onClick={handleLogout} style={{ color: "rgba(255,100,100,0.8)" }}>
            <span className="admin-nav-icon">🚪</span>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Contenu */}
      <div className="admin-content">
        {activeTab === "dashboard" && <Dashboard stats={stats} orders={orders} onValidatePayment={handleValidatePayment} />}
        {activeTab === "visitors"  && <LiveVisitors adminToken={localStorage.getItem("adminToken")} />}
        {activeTab === "products"  && <Products products={products} reload={loadAll} />}
        {activeTab === "orders"    && <Orders orders={orders} reload={loadAll} />}
        {activeTab === "customers" && <Clients />}
        {activeTab === "messages"  && <Messages onUnreadChange={setUnreadMessages} />}
        {activeTab === "settings"  && <Settings />}
      </div>
    </div>
  );
}
