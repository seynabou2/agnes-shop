import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { getProducts, getCategories } from "../services/api";

function Shop() {
  const { addToCart, cart } = useCart();
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(params.get("category") || "");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  function getQtyInCart(id) {
    return cart.find((i) => i.id === id)?.quantity || 0;
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
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          border: "1px solid #F3F4F6",
        }}>
          <input
            type="text"
            placeholder="🔍 Rechercher un article..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ flex: 1, minWidth: "200px" }}
          />

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="form-select"
            style={{ minWidth: "180px" }}
          >
            <option value="">Toutes les catégories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="form-select"
            style={{ minWidth: "160px" }}
          >
            <option value="recent">Plus récents</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
            <option value="name">Nom A-Z</option>
          </select>
        </div>

        {/* Filtres catégories (chips) */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.75rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setSelectedCategory("")}
            className="btn btn-sm"
            style={{
              background: !selectedCategory ? "var(--primary)" : "white",
              color: !selectedCategory ? "white" : "var(--text-secondary)",
              border: !selectedCategory ? "none" : "1.5px solid var(--border)",
            }}
          >
            Tout
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? "" : cat)}
              className="btn btn-sm"
              style={{
                background: selectedCategory === cat ? "var(--primary)" : "white",
                color: selectedCategory === cat ? "white" : "var(--text-secondary)",
                border: selectedCategory === cat ? "none" : "1.5px solid var(--border)",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* États */}
        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Chargement des produits...</p>
          </div>
        )}

        {error && !loading && (
          <div className="alert alert-error">
            ⚠️ {error}
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <div className="empty-title">Aucun produit trouvé</div>
            <div className="empty-desc">Essayez avec d'autres mots-clés ou une autre catégorie.</div>
          </div>
        )}

        {/* Grille */}
        {!loading && !error && products.length > 0 && (
          <div className="product-grid">
            {products.map((product) => {
              const qty = getQtyInCart(product.id);
              const unavailable = product.is_available === false;
              const hasPromo = product.in_promotion && product.discount_percent > 0;
              const discountedPrice = hasPromo
                ? Math.round(product.price * (1 - product.discount_percent / 100))
                : null;
              // Prix effectif pour le panier
              const effectivePrice = discountedPrice ?? product.price;
              return (
                <div key={product.id} className="product-card" style={{ opacity: unavailable ? 0.72 : 1 }}>
                  <div className="product-image-wrap">
                    <img
                      src={product.image?.startsWith("/uploads") ? `${process.env.REACT_APP_API_URL || "http://localhost:5000"}${product.image}` : product.image}
                      alt={product.name}
                      className="product-image"
                      onError={(e) => { e.target.src = "https://placehold.co/300x260/E8E6FF/1E1B4B?text=Photo"; }}
                    />
                    {/* Badge catégorie */}
                    {product.category && !unavailable && !hasPromo && (
                      <span className="product-badge">{product.category}</span>
                    )}
                    {/* Badge rupture */}
                    {unavailable && (
                      <span style={{
                        position: "absolute", top: "10px", left: "10px",
                        background: "#EF4444", color: "white",
                        padding: "4px 10px", borderRadius: "999px",
                        fontSize: "0.72rem", fontWeight: "800", letterSpacing: "0.02em",
                      }}>
                        Rupture de stock
                      </span>
                    )}
                    {/* Badge nouveauté */}
                    {product.is_new && !unavailable && !hasPromo && (
                      <span style={{
                        position: "absolute", top: "10px", left: "10px",
                        background: "#059669", color: "white",
                        padding: "4px 12px", borderRadius: "999px",
                        fontSize: "0.75rem", fontWeight: "800", letterSpacing: "0.04em",
                      }}>
                        ✨ Nouveau
                      </span>
                    )}
                    {/* Badge promo */}
                    {hasPromo && !unavailable && (
                      <span style={{
                        position: "absolute", top: "10px", left: "10px",
                        background: "#D4A017", color: "white",
                        padding: "4px 12px", borderRadius: "999px",
                        fontSize: "0.8rem", fontWeight: "800",
                      }}>
                        -{product.discount_percent}%
                      </span>
                    )}
                    {/* Compteur panier */}
                    {qty > 0 && (
                      <span style={{
                        position: "absolute", top: "10px", right: "10px",
                        background: "var(--success)", color: "white",
                        width: "26px", height: "26px", borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.78rem", fontWeight: "800",
                      }}>
                        {qty}
                      </span>
                    )}
                  </div>
                  <div className="product-body">
                    <div className="product-name">{product.name}</div>
                    {product.description && <div className="product-desc">{product.description}</div>}
                    {/* Prix */}
                    {hasPromo ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
                        <span style={{ textDecoration: "line-through", color: "#9CA3AF", fontSize: "0.88rem" }}>
                          {product.price.toLocaleString()} FCFA
                        </span>
                        <span className="product-price" style={{ margin: 0, color: "#E11D48" }}>
                          {discountedPrice.toLocaleString()} FCFA
                        </span>
                      </div>
                    ) : (
                      <div className="product-price">{product.price.toLocaleString()} FCFA</div>
                    )}
                    <button
                      className="btn btn-primary btn-full"
                      onClick={() => !unavailable && addToCart({ ...product, price: effectivePrice })}
                      disabled={unavailable}
                      style={unavailable ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                    >
                      {unavailable ? "Indisponible" : qty > 0 ? `✓ Ajouter encore` : "+ Ajouter au panier"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Shop;
