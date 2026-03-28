import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSettings } from "../services/api";

function Footer() {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    getSettings().then(setSettings).catch(() => {});
  }, []);

  const phone = settings.store_phone || "+33668557785";
  const email = settings.store_email || "nabousene2002@gmail.com";
  const address = settings.store_address || "Dakar, Sénégal";

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Col 1 : marque */}
          <div>
            <div className="footer-logo">🌸 Agnès<span>Shop</span></div>
            <p className="footer-desc">
              {settings.about_text || "Votre boutique de mode africaine à Dakar. Des vêtements authentiques, élégants et modernes confectionnés avec passion."}
            </p>
            <div className="footer-payment-icons" style={{ marginTop: "1.25rem" }}>
              <span className="payment-icon-badge">🟠 Orange Money</span>
              <span className="payment-icon-badge">🔵 Wave</span>
              <span className="payment-icon-badge">💳 Carte</span>
              <span className="payment-icon-badge">📦 Livraison</span>
            </div>
          </div>

          {/* Col 2 : boutique */}
          <div>
            <div className="footer-col-title">Boutique</div>
            <div className="footer-links">
              <Link to="/boutique" className="footer-link">Tous les articles</Link>
              <Link to="/boutique?category=Robes" className="footer-link">Robes en pagne</Link>
              <Link to="/boutique?category=Boubous" className="footer-link">Boubous</Link>
              <Link to="/boutique?category=Tops" className="footer-link">Tops wax</Link>
              <Link to="/boutique?category=Pantalons" className="footer-link">Pantalons</Link>
            </div>
          </div>

          {/* Col 3 : infos */}
          <div>
            <div className="footer-col-title">Informations</div>
            <div className="footer-links">
              <Link to="/contact" className="footer-link">Nous contacter</Link>
              <Link to="/connexion" className="footer-link">Mon compte</Link>
              <span className="footer-link" style={{ cursor: "default" }}>
                {settings.delivery_info || "Livraison 24-48h à Dakar"}
              </span>
            </div>
          </div>

          {/* Col 4 : contact */}
          <div>
            <div className="footer-col-title">Contact</div>
            <div className="footer-links">
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="footer-link">
                📞 {phone}
              </a>
              <a href={`mailto:${email}`} className="footer-link">
                ✉️ {email}
              </a>
              <span className="footer-link" style={{ cursor: "default" }}>
                📍 {address}
              </span>
              {settings.whatsapp_number && (
                <a
                  href={`https://wa.me/${settings.whatsapp_number}`}
                  target="_blank"
                  rel="noreferrer"
                  className="footer-link"
                  style={{ color: "#4ADE80" }}
                >
                  💬 WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>

        <hr className="footer-divider" />

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Agnès Shop – Tous droits réservés</span>
          <span>Fait avec ❤️ à Dakar, Sénégal</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
