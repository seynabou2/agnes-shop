import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../services/api";
import { useCart } from "../context/CartContext";

const CATEGORIES = [
  { label: "Robes", emoji: "👗", color: "#FFF1F2", border: "#FECDD3" },
  { label: "Boubous", emoji: "🥻", color: "#F0F9FF", border: "#BAE6FD" },
  { label: "Tops", emoji: "👚", color: "#FFF7ED", border: "#FED7AA" },
  { label: "Pantalons", emoji: "👖", color: "#F0FDF4", border: "#A7F3D0" },
];

function Home() {
  const [featured, setFeatured] = useState([]);
  const { addToCart } = useCart();

  useEffect(() => {
    getProducts().then((d) => setFeatured(d.slice(0, 4))).catch(() => {});
  }, []);

  return (
    <div>
      {/* ── Hero ── */}
      <section style={{
        background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4C1D95 100%)",
        padding: "6rem 0 5rem",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Cercles décoratifs */}
        <div style={{
          position: "absolute", top: "-80px", right: "-80px",
          width: "400px", height: "400px", borderRadius: "50%",
          background: "rgba(212,160,23,0.08)", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "-60px", left: "-60px",
          width: "300px", height: "300px", borderRadius: "50%",
          background: "rgba(225,29,72,0.08)", pointerEvents: "none",
        }} />

        <div className="container" style={{ position: "relative" }}>
          <div style={{ maxWidth: "620px" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              background: "rgba(212,160,23,0.2)", border: "1px solid rgba(212,160,23,0.3)",
              borderRadius: "999px", padding: "4px 14px", marginBottom: "1.5rem",
            }}>
              <span style={{ color: "#D4A017", fontSize: "0.8rem", fontWeight: "700", letterSpacing: "0.06em" }}>
                ✨ NOUVELLE COLLECTION 2025
              </span>
            </div>

            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
              fontWeight: "700",
              color: "white",
              lineHeight: 1.2,
              marginBottom: "1.25rem",
            }}>
              La Mode Africaine<br />
              <span style={{ color: "#D4A017" }}>Réinventée</span> pour Vous
            </h1>

            <p style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: "1.05rem",
              lineHeight: 1.7,
              marginBottom: "2rem",
              maxWidth: "500px",
            }}>
              Robes en pagne, boubous modernes, tops wax — des pièces uniques
              confectionnées avec passion à Dakar.
            </p>

            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <Link to="/boutique" className="btn btn-accent btn-lg">
                Découvrir la collection →
              </Link>
              <Link to="/contact" className="btn btn-lg" style={{
                background: "rgba(255,255,255,0.12)",
                color: "white",
                border: "1.5px solid rgba(255,255,255,0.3)",
              }}>
                Nous contacter
              </Link>
            </div>

            <div style={{
              display: "flex", gap: "2.5rem", marginTop: "3rem",
              flexWrap: "wrap",
            }}>
              {[
                { value: "500+", label: "Clientes satisfaites" },
                { value: "100%", label: "Fait main" },
                { value: "24h", label: "Livraison Dakar" },
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#D4A017", fontFamily: "'Inter', sans-serif" }}>{s.value}</div>
                  <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.55)", marginTop: "2px" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Catégories ── */}
      <section className="section" style={{ background: "white" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.9rem", marginBottom: "0.5rem" }}>Nos Catégories</h2>
            <p className="page-subtitle">Trouvez la pièce parfaite pour chaque occasion</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.label}
                to={`/boutique?category=${cat.label}`}
                style={{
                  background: cat.color,
                  border: `1.5px solid ${cat.border}`,
                  borderRadius: "16px",
                  padding: "1.75rem 1.25rem",
                  textAlign: "center",
                  transition: "0.2s ease",
                  display: "block",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>{cat.emoji}</div>
                <div style={{ fontWeight: "700", color: "#1C1C2E", fontSize: "1rem" }}>{cat.label}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Produits vedettes ── */}
      {featured.length > 0 && (
        <section className="section">
          <div className="container">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.9rem", marginBottom: "0.25rem" }}>Articles Vedettes</h2>
                <p className="page-subtitle">Nos pièces les plus appréciées</p>
              </div>
              <Link to="/boutique" className="btn btn-outline">Voir tout →</Link>
            </div>

            <div className="product-grid">
              {featured.map((product) => (
                <div key={product.id} className="product-card">
                  <div className="product-image-wrap">
                    <img
                      src={product.image?.startsWith("/uploads") ? `${process.env.REACT_APP_API_URL || "http://localhost:5000"}${product.image}` : product.image?.startsWith("/") ? `${process.env.PUBLIC_URL}${product.image}` : product.image}
                      alt={product.name}
                      className="product-image"
                      onError={(e) => { e.target.src = "https://placehold.co/300x260/E8E6FF/1E1B4B?text=Photo"; }}
                    />
                    {product.category && (
                      <span className="product-badge">{product.category}</span>
                    )}
                  </div>
                  <div className="product-body">
                    <div className="product-name">{product.name}</div>
                    {product.description && <div className="product-desc">{product.description}</div>}
                    <div className="product-price">{product.price.toLocaleString()} FCFA</div>
                    <button className="btn btn-primary btn-full" onClick={() => addToCart(product)}>
                      + Ajouter au panier
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Paiements acceptés ── */}
      <section style={{ background: "white", padding: "4rem 0" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>Paiements Acceptés</h2>
            <p className="page-subtitle">Plusieurs moyens de paiement pour votre confort</p>
          </div>
          <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { icon: "🟠", name: "Orange Money", desc: "Paiement mobile" },
              { icon: "🔵", name: "Wave", desc: "Paiement mobile" },
              { icon: "💳", name: "Carte bancaire", desc: "Visa / Mastercard" },
              { icon: "📦", name: "À la livraison", desc: "Paiement en espèces" },
              { icon: "💬", name: "WhatsApp", desc: "Commander directement" },
            ].map((p) => (
              <div key={p.name} style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                background: "#F8F7FF", border: "1.5px solid #E0DEFF",
                borderRadius: "12px", padding: "0.9rem 1.25rem", minWidth: "160px",
              }}>
                <span style={{ fontSize: "1.8rem" }}>{p.icon}</span>
                <div>
                  <div style={{ fontWeight: "700", fontSize: "0.9rem", color: "#1E1B4B" }}>{p.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Avantages ── */}
      <section className="section">
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem" }}>
            {[
              { icon: "✂️", title: "Couture artisanale", desc: "Chaque vêtement est cousu à la main avec une attention particulière aux détails." },
              { icon: "🌍", title: "Tissus authentiques", desc: "Nous sélectionnons les meilleurs tissus wax et pagne d'Afrique de l'Ouest." },
              { icon: "🚚", title: "Livraison rapide", desc: "Livraison sous 24-48h à Dakar. Expédition dans tout le Sénégal." },
              { icon: "💬", title: "Service personnalisé", desc: "Commandez sur mesure via WhatsApp pour un vêtement adapté à votre morphologie." },
            ].map((item) => (
              <div key={item.title} className="card" style={{ padding: "1.5rem" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{item.icon}</div>
                <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: "1rem", marginBottom: "0.5rem" }}>{item.title}</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.87rem", lineHeight: 1.65 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section style={{
        background: "linear-gradient(135deg, #1E1B4B, #312E81)",
        padding: "4rem 0",
        textAlign: "center",
      }}>
        <div className="container">
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: "white", marginBottom: "0.75rem" }}>
            Prête à craquer pour une nouvelle tenue ?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.65)", marginBottom: "1.75rem" }}>
            Découvrez toute la collection et commandez en quelques clics.
          </p>
          <Link to="/boutique" className="btn btn-accent btn-lg">
            Explorer la boutique →
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Home;
