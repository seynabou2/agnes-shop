import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { getProducts, getCategories } from "../services/api";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

function getImgSrc(img) {
  if (!img) return "https://placehold.co/400x400/E8E6FF/1E1B4B?text=Photo";
  if (img.startsWith("/uploads")) return `${API}${img}`;
  if (img.startsWith("/")) return `${process.env.PUBLIC_URL}${img}`;
  return img;
}

/* ── Modal produit style SHEIN ─────────────────────────────── */
function ProductModal({ product, onClose, onAdd }) {
  const colors = Array.isArray(product.colors) ? product.colors : [];
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];

  const [selectedColor, setSelectedColor] = useState(colors[0] || null);
  const [selectedSize, setSelectedSize] = useState(sizes.length === 1 ? sizes[0] : null);
  const [qty, setQty] = useState(1);

  const hasPromo = product.in_promotion && product.discount_percent > 0;
  const effectivePrice = hasPromo
    ? Math.round(product.price * (1 - product.discount_percent / 100))
    : product.price;

  // Image affichée : celle de la couleur sélectionnée, sinon l'image principale
  const displayImage = selectedColor?.image
    ? getImgSrc(selectedColor.image)
    : getImgSrc(product.image);

  function handleAdd() {
    if (sizes.length > 0 && !selectedSize) {
      alert("Veuillez choisir une taille.");
      return;
    }
    for (let i = 0; i < qty; i++) {
      onAdd({
        ...product,
        price: effectivePrice,
        selectedColor: selectedColor?.name || null,
        selectedColorHex: selectedColor?.hex || null,
        selectedSize: selectedSize || null,
      });
    }
    onClose();
  }

  // Fermeture avec Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white", borderRadius: "20px", width: "100%", maxWidth: "800px",
          maxHeight: "90vh", overflow: "auto",
          display: "grid", gridTemplateColumns: "1fr 1fr",
          boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
        }}
        className="product-modal-inner"
      >
        {/* Image */}
        <div style={{ position: "relative", background: "#F8F7FF", borderRadius: "20px 0 0 20px", overflow: "hidden", minHeight: "360px" }}>
          <img
            src={displayImage}
            alt={product.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
            onError={(e) => { e.target.src = "https://placehold.co/400x400/E8E6FF/1E1B4B?text=Photo"; }}
          />
          {/* Miniatures couleurs */}
          {colors.length > 1 && (
            <div style={{
              position: "absolute", bottom: "12px", left: "50%", transform: "translateX(-50%)",
              display: "flex", gap: "6px", background: "rgba(255,255,255,0.9)",
              borderRadius: "999px", padding: "6px 12px",
            }}>
              {colors.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setSelectedColor(c)}
                  title={c.name}
                  style={{
                    width: "22px", height: "22px", borderRadius: "50%",
                    background: c.hex, border: `3px solid ${selectedColor?.name === c.name ? "#1E1B4B" : "rgba(0,0,0,0.15)"}`,
                    cursor: "pointer", flexShrink: 0,
                    boxShadow: selectedColor?.name === c.name ? "0 0 0 2px white, 0 0 0 4px #1E1B4B" : "none",
                    transition: "all 0.15s",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Infos */}
        <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Fermer */}
          <button
            onClick={onClose}
            style={{
              position: "absolute", top: "1rem", right: "1rem",
              background: "#F3F4F6", border: "none", width: "36px", height: "36px",
              borderRadius: "50%", cursor: "pointer", fontSize: "1rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 10,
            }}
          >✕</button>

          {product.category && (
            <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#6366F1", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {product.category}
            </span>
          )}

          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", color: "#1E1B4B", margin: 0, lineHeight: 1.3 }}>
            {product.name}
          </h2>

          {/* Prix */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.6rem", fontWeight: "800", color: "#E11D48" }}>
              {effectivePrice.toLocaleString()} FCFA
            </span>
            {hasPromo && (
              <span style={{ fontSize: "1rem", color: "#9CA3AF", textDecoration: "line-through" }}>
                {product.price.toLocaleString()} FCFA
              </span>
            )}
            {hasPromo && (
              <span style={{ fontSize: "0.75rem", fontWeight: "700", background: "#FEF3C7", color: "#92400E", padding: "2px 8px", borderRadius: "999px" }}>
                -{product.discount_percent}%
              </span>
            )}
          </div>

          {product.description && (
            <p style={{ fontSize: "0.88rem", color: "#6B7280", lineHeight: 1.65, margin: 0 }}>
              {product.description}
            </p>
          )}

          {/* Couleurs */}
          {colors.length > 0 && (
            <div>
              <p style={{ fontSize: "0.82rem", fontWeight: "700", color: "#374151", marginBottom: "0.6rem" }}>
                Couleur : <span style={{ color: "#1E1B4B" }}>{selectedColor?.name || "—"}</span>
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {colors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColor(c)}
                    title={c.name}
                    style={{
                      width: "34px", height: "34px", borderRadius: "50%",
                      background: c.hex, border: "none", cursor: "pointer",
                      outline: selectedColor?.name === c.name ? `3px solid #1E1B4B` : "2px solid transparent",
                      outlineOffset: "2px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                      transition: "all 0.15s",
                      transform: selectedColor?.name === c.name ? "scale(1.15)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tailles */}
          {sizes.length > 0 && (
            <div>
              <p style={{ fontSize: "0.82rem", fontWeight: "700", color: "#374151", marginBottom: "0.6rem" }}>
                Taille : <span style={{ color: selectedSize ? "#1E1B4B" : "#EF4444" }}>{selectedSize || "Choisir"}</span>
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    style={{
                      minWidth: "44px", height: "36px", padding: "0 12px",
                      borderRadius: "8px",
                      border: `2px solid ${selectedSize === s ? "#1E1B4B" : "#E5E7EB"}`,
                      background: selectedSize === s ? "#1E1B4B" : "white",
                      color: selectedSize === s ? "white" : "#374151",
                      fontSize: "0.85rem", fontWeight: "700",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantité */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: "700", color: "#374151" }}>Qté :</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#F3F4F6", borderRadius: "8px", padding: "4px 8px" }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "700", fontSize: "1.1rem", padding: "0 4px" }}>–</button>
              <span style={{ minWidth: "24px", textAlign: "center", fontWeight: "700" }}>{qty}</span>
              <button onClick={() => setQty(qty + 1)} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "700", fontSize: "1.1rem", padding: "0 4px" }}>+</button>
            </div>
          </div>

          {/* Bouton ajouter */}
          <button
            className="btn btn-accent btn-lg btn-full"
            onClick={handleAdd}
            style={{ marginTop: "auto" }}
          >
            🛒 Ajouter au panier
          </button>

          {product.stock !== null && product.stock <= 5 && product.stock > 0 && (
            <p style={{ fontSize: "0.8rem", color: "#EF4444", fontWeight: "600", textAlign: "center", margin: 0 }}>
              ⚠️ Plus que {product.stock} en stock !
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Page Boutique ─────────────────────────────────────────── */
function Shop() {
  const { addToCart, getProductQty } = useCart();
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(params.get("category") || "");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalProduct, setModalProduct] = useState(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getProducts({ category: selectedCategory, search })
      .then((data) => {
        const sorted = [...data].sort((a, b) => {
          if (sort === "price-asc") return a.price - b.price;
          if (sort === "price-desc") return b.price - a.price;
          if (sort === "name") return a.name.localeCompare(b.name);
          return new Date(b.created_at) - new Date(a.created_at);
        });
        setProducts(sorted);
        setLoading(false);
      })
      .catch(() => {
        setError("Impossible de charger les produits. Vérifiez que le serveur est démarré.");
        setLoading(false);
      });
  }, [selectedCategory, search, sort]);

  function handleAddToCart(product) {
    const colors = Array.isArray(product.colors) ? product.colors : [];
    const sizes = Array.isArray(product.sizes) ? product.sizes : [];
    if (colors.length > 0 || sizes.length > 0) {
      setModalProduct(product);
    } else {
      const hasPromo = product.in_promotion && product.discount_percent > 0;
      const effectivePrice = hasPromo
        ? Math.round(product.price * (1 - product.discount_percent / 100))
        : product.price;
      addToCart({ ...product, price: effectivePrice });
    }
  }

  return (
    <div style={{ padding: "2.5rem 0 4rem" }}>
      <div className="container">
        {/* En-tête */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 className="page-title">🛍️ Notre Boutique</h1>
          <p className="page-subtitle">
            {loading ? "Chargement..." : `${products.length} article${products.length !== 1 ? "s" : ""} disponible${products.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Filtres */}
        <div style={{
          display: "flex", gap: "0.75rem", flexWrap: "wrap",
          marginBottom: "2rem", padding: "1.25rem",
          background: "white", borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #F3F4F6",
        }}>
          <input
            type="text" placeholder="🔍 Rechercher un article..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="form-input" style={{ flex: 1, minWidth: "200px" }}
          />
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
            className="form-select" style={{ minWidth: "180px" }}>
            <option value="">Toutes les catégories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            className="form-select" style={{ minWidth: "160px" }}>
            <option value="recent">Plus récents</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
            <option value="name">Nom A-Z</option>
          </select>
        </div>

        {/* Chips catégories */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.75rem", flexWrap: "wrap" }}>
          <button onClick={() => setSelectedCategory("")} className="btn btn-sm"
            style={{ background: !selectedCategory ? "var(--primary)" : "white", color: !selectedCategory ? "white" : "var(--text-secondary)", border: !selectedCategory ? "none" : "1.5px solid var(--border)" }}>
            Tout
          </button>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? "" : cat)} className="btn btn-sm"
              style={{ background: selectedCategory === cat ? "var(--primary)" : "white", color: selectedCategory === cat ? "white" : "var(--text-secondary)", border: selectedCategory === cat ? "none" : "1.5px solid var(--border)" }}>
              {cat}
            </button>
          ))}
        </div>

        {/* États */}
        {loading && <div className="loading-state"><div className="spinner" /><p>Chargement des produits...</p></div>}
        {error && !loading && <div className="alert alert-error">⚠️ {error}</div>}
        {!loading && !error && products.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <div className="empty-title">Aucun produit trouvé</div>
            <div className="empty-desc">Essayez avec d'autres mots-clés ou une autre catégorie.</div>
          </div>
        )}

        {/* Grille produits */}
        {!loading && !error && products.length > 0 && (
          <div className="product-grid">
            {products.map((product) => {
              const qty = getProductQty(product.id);
              const unavailable = product.is_available === false;
              const hasPromo = product.in_promotion && product.discount_percent > 0;
              const discountedPrice = hasPromo
                ? Math.round(product.price * (1 - product.discount_percent / 100))
                : null;
              const colors = Array.isArray(product.colors) ? product.colors : [];
              const sizes = Array.isArray(product.sizes) ? product.sizes : [];

              return (
                <div
                  key={product.id}
                  className="product-card"
                  style={{ opacity: unavailable ? 0.72 : 1, cursor: "pointer" }}
                  onClick={() => !unavailable && handleAddToCart(product)}
                >
                  <div className="product-image-wrap">
                    <img
                      src={getImgSrc(product.image)}
                      alt={product.name}
                      className="product-image"
                      onError={(e) => { e.target.src = "https://placehold.co/300x260/E8E6FF/1E1B4B?text=Photo"; }}
                    />
                    {product.category && !unavailable && !hasPromo && !product.is_new && (
                      <span className="product-badge">{product.category}</span>
                    )}
                    {unavailable && (
                      <span style={{ position: "absolute", top: "10px", left: "10px", background: "#EF4444", color: "white", padding: "4px 10px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: "800" }}>
                        Rupture de stock
                      </span>
                    )}
                    {product.is_new && !unavailable && !hasPromo && (
                      <span style={{ position: "absolute", top: "10px", left: "10px", background: "#059669", color: "white", padding: "4px 12px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "800" }}>
                        ✨ Nouveau
                      </span>
                    )}
                    {hasPromo && !unavailable && (
                      <span style={{ position: "absolute", top: "10px", left: "10px", background: "#D4A017", color: "white", padding: "4px 12px", borderRadius: "999px", fontSize: "0.8rem", fontWeight: "800" }}>
                        -{product.discount_percent}%
                      </span>
                    )}
                    {qty > 0 && (
                      <span style={{ position: "absolute", top: "10px", right: "10px", background: "var(--success)", color: "white", width: "26px", height: "26px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: "800" }}>
                        {qty}
                      </span>
                    )}
                    {/* Pastilles couleurs sur la carte */}
                    {colors.length > 0 && (
                      <div style={{ position: "absolute", bottom: "8px", left: "8px", display: "flex", gap: "4px" }}>
                        {colors.slice(0, 5).map((c) => (
                          <span key={c.name} title={c.name} style={{ width: "14px", height: "14px", borderRadius: "50%", background: c.hex, border: "1.5px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", display: "inline-block" }} />
                        ))}
                        {colors.length > 5 && <span style={{ fontSize: "0.65rem", color: "white", fontWeight: "700", background: "rgba(0,0,0,0.4)", borderRadius: "999px", padding: "0 4px", lineHeight: "14px" }}>+{colors.length - 5}</span>}
                      </div>
                    )}
                  </div>

                  <div className="product-body">
                    <div className="product-name">{product.name}</div>
                    {product.description && <div className="product-desc">{product.description}</div>}

                    {/* Tailles disponibles */}
                    {sizes.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", marginBottom: "0.5rem" }}>
                        {sizes.slice(0, 6).map((s) => (
                          <span key={s} style={{ fontSize: "0.68rem", padding: "1px 6px", border: "1px solid #E5E7EB", borderRadius: "4px", color: "#6B7280", fontWeight: "600" }}>{s}</span>
                        ))}
                        {sizes.length > 6 && <span style={{ fontSize: "0.68rem", color: "#9CA3AF" }}>+{sizes.length - 6}</span>}
                      </div>
                    )}

                    {/* Prix */}
                    {hasPromo ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
                        <span style={{ textDecoration: "line-through", color: "#9CA3AF", fontSize: "0.88rem" }}>{product.price.toLocaleString()} FCFA</span>
                        <span className="product-price" style={{ margin: 0 }}>{discountedPrice.toLocaleString()} FCFA</span>
                      </div>
                    ) : (
                      <div className="product-price">{product.price.toLocaleString()} FCFA</div>
                    )}

                    <button
                      className="btn btn-primary btn-full"
                      onClick={(e) => { e.stopPropagation(); !unavailable && handleAddToCart(product); }}
                      disabled={unavailable}
                      style={unavailable ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                    >
                      {unavailable ? "Indisponible"
                        : (colors.length > 0 || sizes.length > 0)
                          ? "🎨 Choisir options"
                          : qty > 0 ? "✓ Ajouter encore"
                          : "+ Ajouter au panier"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal produit */}
      {modalProduct && (
        <ProductModal
          product={modalProduct}
          onClose={() => setModalProduct(null)}
          onAdd={addToCart}
        />
      )}
    </div>
  );
}

export default Shop;
