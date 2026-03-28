import React, { useState, useEffect } from "react";
import { getSettings, sendContact } from "../services/api";

function Contact() {
  const [settings, setSettings] = useState({});
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getSettings().then(setSettings).catch(() => {});
  }, []);

  const phone = settings.store_phone || "+33668557785";
  const email = settings.store_email || "nabousene2002@gmail.com";
  const address = settings.store_address || "Dakar, Sénégal";
  const whatsapp = settings.whatsapp_number || "33668557785";

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      await sendContact(form);
      setSent(true);
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err) {
      setError(err.message || "Erreur lors de l'envoi. Veuillez réessayer.");
    } finally {
      setSending(false);
    }
  }

  const whatsappMsg = encodeURIComponent(
    `Bonjour Agnès Shop ! Je m'appelle ${form.name || "..."} et je souhaite vous contacter.`
  );

  return (
    <div style={{ padding: "2.5rem 0 5rem" }}>
      <div className="container">

        {/* En-tête */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h1 className="page-title">💬 Nous Contacter</h1>
          <p className="page-subtitle" style={{ maxWidth: "520px", margin: "0 auto" }}>
            Une question sur une commande, une demande sur mesure ? Nous sommes là pour vous !
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "2rem", alignItems: "start" }}>

          {/* ── Colonne gauche : infos de contact ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Carte WhatsApp (mise en avant) */}
            <a
              href={`https://wa.me/${whatsapp}?text=${whatsappMsg}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: "1rem",
                background: "linear-gradient(135deg, #25D366, #128C7E)",
                borderRadius: "16px", padding: "1.5rem",
                textDecoration: "none", color: "white",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 30px rgba(37,211,102,0.35)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
            >
              <div style={{ fontSize: "2.5rem", lineHeight: 1 }}>💬</div>
              <div>
                <div style={{ fontWeight: "800", fontSize: "1.05rem", marginBottom: "0.2rem" }}>
                  Commander sur WhatsApp
                </div>
                <div style={{ fontSize: "0.85rem", opacity: 0.85 }}>
                  Réponse rapide · Sur mesure disponible
                </div>
              </div>
              <div style={{ marginLeft: "auto", fontSize: "1.4rem" }}>→</div>
            </a>

            {/* Infos de contact */}
            {[
              {
                icon: "📞",
                label: "Téléphone",
                value: phone,
                href: `tel:${phone.replace(/\s/g, "")}`,
              },
              {
                icon: "✉️",
                label: "Email",
                value: email,
                href: `mailto:${email}`,
              },
              {
                icon: "📍",
                label: "Adresse",
                value: address,
                href: null,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="card"
                style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}
              >
                <div style={{
                  width: "46px", height: "46px", borderRadius: "12px",
                  background: "var(--bg)", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "1.4rem", flexShrink: 0,
                }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                    {item.label}
                  </div>
                  {item.href ? (
                    <a href={item.href} style={{ color: "var(--primary)", fontWeight: "600", textDecoration: "none", fontSize: "0.95rem" }}>
                      {item.value}
                    </a>
                  ) : (
                    <div style={{ color: "var(--text)", fontWeight: "600", fontSize: "0.95rem" }}>{item.value}</div>
                  )}
                </div>
              </div>
            ))}

            {/* Horaires */}
            <div className="card" style={{ padding: "1.5rem" }}>
              <div style={{ fontWeight: "700", marginBottom: "1rem", fontSize: "0.95rem" }}>🕐 Disponibilité</div>
              {[
                { day: "Lun – Sam", hours: "8h00 – 20h00" },
                { day: "Dimanche", hours: "10h00 – 17h00" },
                { day: "WhatsApp", hours: "7j/7 – Réponse dans la journée" },
              ].map((h) => (
                <div key={h.day} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--border)", fontSize: "0.87rem" }}>
                  <span style={{ color: "var(--text-secondary)", fontWeight: "500" }}>{h.day}</span>
                  <span style={{ color: "var(--text)", fontWeight: "600" }}>{h.hours}</span>
                </div>
              ))}
            </div>

          </div>

          {/* ── Colonne droite : formulaire ── */}
          <div className="card" style={{ padding: "2rem" }}>
            {sent ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <div style={{
                  width: "72px", height: "72px", borderRadius: "20px",
                  background: "linear-gradient(135deg,#10B981,#059669)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 1.25rem", fontSize: "2rem"
                }}>✓</div>
                <h3 style={{ fontSize: "1.3rem", marginBottom: "0.75rem", color: "var(--primary)" }}>
                  Message envoyé !
                </h3>
                <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
                  Merci de nous avoir contactés. Nous vous répondrons dans les plus brefs délais.
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="btn btn-outline"
                >
                  Envoyer un autre message
                </button>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: "1.2rem", marginBottom: "1.5rem", fontFamily: "'Playfair Display', serif" }}>
                  Envoyer un message
                </h2>
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label className="form-label">Votre nom *</label>
                      <input
                        type="text"
                        name="name"
                        className="form-input"
                        placeholder="Fatou Diallo"
                        value={form.name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">Téléphone</label>
                      <input
                        type="tel"
                        name="phone"
                        className="form-input"
                        placeholder="+221 77 000 00 00"
                        value={form.phone}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Email *</label>
                    <input
                      type="email"
                      name="email"
                      className="form-input"
                      placeholder="votre@email.com"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Sujet</label>
                    <select
                      name="subject"
                      className="form-select"
                      value={form.subject}
                      onChange={handleChange}
                    >
                      <option value="">Choisir un sujet</option>
                      <option value="commande">Question sur une commande</option>
                      <option value="mesure">Commande sur mesure</option>
                      <option value="livraison">Livraison et délais</option>
                      <option value="retour">Retour / échange</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Message *</label>
                    <textarea
                      name="message"
                      className="form-input"
                      placeholder="Décrivez votre demande en détail..."
                      rows={5}
                      value={form.message}
                      onChange={handleChange}
                      required
                      style={{ resize: "vertical", minHeight: "120px" }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={sending}
                      style={{ flex: 1, minWidth: "160px" }}
                    >
                      {sending ? "Envoi en cours..." : "Envoyer le message"}
                    </button>
                    <a
                      href={`https://wa.me/${whatsapp}?text=${whatsappMsg}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn"
                      style={{ background: "#25D366", color: "white", border: "none", flex: 1, minWidth: "160px", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      💬 WhatsApp directement
                    </a>
                  </div>

                  {error && (
                    <div style={{
                      background: "#FEF2F2", border: "1px solid #FECACA",
                      borderRadius: "10px", padding: "0.75rem 1rem",
                      color: "#DC2626", fontSize: "0.87rem", fontWeight: "600"
                    }}>
                      ⚠️ {error}
                    </div>
                  )}
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center" }}>
                    * Champs obligatoires. Nous répondons sous 24h ouvrées.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>

        {/* FAQ rapide */}
        <div style={{ marginTop: "3rem" }}>
          <h2 style={{ fontSize: "1.4rem", marginBottom: "1.5rem", textAlign: "center" }}>Questions fréquentes</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            {[
              {
                q: "Faites-vous des commandes sur mesure ?",
                a: "Oui ! Contactez-nous via WhatsApp avec vos mesures et vos préférences de tissu. Délai habituel : 5 à 7 jours ouvrés.",
              },
              {
                q: "Quelle est votre politique de retour ?",
                a: "Les échanges sont possibles sous 7 jours après réception, si l'article est dans son état d'origine. Contactez-nous pour initier la démarche.",
              },
              {
                q: "Livrez-vous en dehors de Dakar ?",
                a: "Oui, nous expédions dans tout le Sénégal via DHL et La Poste. Délai : 2 à 4 jours ouvrés. Contactez-nous pour un tarif précis.",
              },
              {
                q: "Comment suivre ma commande ?",
                a: "Connectez-vous à votre compte pour voir le statut de vos commandes en temps réel. Nous vous envoyons aussi une confirmation par message.",
              },
            ].map((faq) => (
              <div key={faq.q} className="card" style={{ padding: "1.5rem" }}>
                <div style={{ fontWeight: "700", marginBottom: "0.6rem", color: "var(--primary)", fontSize: "0.92rem" }}>
                  {faq.q}
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.87rem", lineHeight: 1.65 }}>
                  {faq.a}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Contact;
