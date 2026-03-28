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
  const close = () => setMenuOpen(false);

  return (
    <header className="navbar">
      <div className="nav-inner">
        {/* Logo */}
        <Link to="/" className="nav-logo" onClick={close}>
          🌸 Agnès<span>Shop</span>
        </Link>

        {/* Liens navigation — desktop */}
        <nav className={`nav-links ${menuOpen ? "nav-links--open" : ""}`}>
          <Link to="/" className={`nav-link ${isActive("/") ? "active" : ""}`} onClick={close}>
            Accueil
          </Link>
          <Link to="/boutique" className={`nav-link ${isActive("/boutique") ? "active" : ""}`} onClick={close}>
            Boutique
          </Link>
          <Link to="/contact" className={`nav-link ${isActive("/contact") ? "active" : ""}`} onClick={close}>
            Contact
          </Link>

          {/* Compte client */}
          {customer ? (
            <>
              <Link to="/mon-compte" className={`nav-link ${isActive("/mon-compte") ? "active" : ""}`} onClick={close}>
                👤 {customer.first_name}
              </Link>
              <button
                onClick={() => { logout(); close(); }}
                className="nav-link"
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                Déconnexion
              </button>
            </>
          ) : (
            <Link to="/connexion" className={`nav-link ${isActive("/connexion") ? "active" : ""}`} onClick={close}>
              Connexion
            </Link>
          )}

          {/* Panier */}
          <Link to="/panier" className="nav-cart-btn" style={{ marginLeft: "0.5rem" }} onClick={close}>
            🛒 Panier
            {totalItems > 0 && (
              <span className="cart-badge">{totalItems}</span>
            )}
          </Link>
        </nav>

        {/* Boutons droite sur mobile : panier + hamburger */}
        <div className="nav-mobile-right">
          <Link to="/panier" className="nav-cart-btn nav-cart-mobile" onClick={close}>
            🛒
            {totalItems > 0 && (
              <span className="cart-badge">{totalItems}</span>
            )}
          </Link>
          <button
            className="nav-hamburger"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
          >
            <span className={`hamburger-line ${menuOpen ? "open" : ""}`} />
            <span className={`hamburger-line ${menuOpen ? "open" : ""}`} />
            <span className={`hamburger-line ${menuOpen ? "open" : ""}`} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
