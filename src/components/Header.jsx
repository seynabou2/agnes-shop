import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useCustomer } from "../context/CustomerContext";

function Header() {
  const { totalItems } = useCart();
  const { customer, logout } = useCustomer();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar">
      <div className="nav-inner">
        {/* Logo */}
        <Link to="/" className="nav-logo">
          🌸 Agnès<span>Shop</span>
        </Link>

        {/* Liens navigation */}
        <nav className="nav-links">
          <Link to="/" className={`nav-link ${isActive("/") ? "active" : ""}`}>
            Accueil
          </Link>
          <Link to="/boutique" className={`nav-link ${isActive("/boutique") ? "active" : ""}`}>
            Boutique
          </Link>
          <Link to="/contact" className={`nav-link ${isActive("/contact") ? "active" : ""}`}>
            Contact
          </Link>

          {/* Compte client */}
          {customer ? (
            <>
              <Link to="/mon-compte" className={`nav-link ${isActive("/mon-compte") ? "active" : ""}`}>
                👤 {customer.first_name}
              </Link>
              <button
                onClick={logout}
                className="nav-link"
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                Déconnexion
              </button>
            </>
          ) : (
            <Link to="/connexion" className={`nav-link ${isActive("/connexion") ? "active" : ""}`}>
              Connexion
            </Link>
          )}

          {/* Panier */}
          <Link to="/panier" className="nav-cart-btn" style={{ marginLeft: "0.5rem" }}>
            🛒 Panier
            {totalItems > 0 && (
              <span className="cart-badge">{totalItems}</span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default Header;
