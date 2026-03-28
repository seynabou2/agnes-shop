import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useCustomer } from "../context/CustomerContext";
import { useTracking } from "../context/TrackingContext";
import { placeOrder, getSettings, updatePaymentStatus, getProducts } from "../services/api";

const CINETPAY_APIKEY = process.env.REACT_APP_CINETPAY_APIKEY || "";
const CINETPAY_SITE_ID = process.env.REACT_APP_CINETPAY_SITE_ID || "";
const CINETPAY_MODE = process.env.REACT_APP_CINETPAY_MODE || "SANDBOX";
const CINETPAY_CONFIGURED = CINETPAY_APIKEY !== "" && CINETPAY_SITE_ID !== "";

const PAYMENT_METHODS = [
  {
    id: "orange_money",
    name: "Orange Money",
    icon: "🟠",
    color: "#FF7900",
    bg: "#FFF7F0",
    desc: "Paiement mobile sécurisé via CinetPay",
    online: true,
  },
  {
    id: "wave",
    name: "Wave",
    icon: "🔵",
    color: "#1B4FD8",
    bg: "#EFF6FF",
    desc: "Transférez et entrez votre référence",
    online: false,
  },
  {
    id: "card",
    name: "Carte bancaire",
    icon: "💳",
    color: "#059669",
    bg: "#F0FDF4",
    desc: "Visa, Mastercard – paiement sécurisé",
    online: true,
  },
  {
    id: "cash",
    name: "Paiement à la livraison",
    icon: "📦",
    color: "#D97706",
    bg: "#FFFBEB",
    desc: "Payez en espèces à la réception",
    online: false,
  },
  {
    id: "whatsapp",
    name: "Commander via WhatsApp",
    icon: "💬",
    color: "#25D366",
    bg: "#F0FFF4",
    desc: "Commandez maintenant, payez à la livraison",
    online: false,
  },
];

function Cart() {
  const { cart, addToCart, removeFromCart, deleteFromCart, clearCart, totalPrice } = useCart();
  const { customer } = useCustomer();
  const [step, setStep] = useState(1); // 1: récap, 2: infos, 3: paiement
  const [name, setName] = useState(customer?.first_name ? `${customer.first_name} ${customer.last_name || ""}`.trim() : "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [address, setAddress] = useState(customer?.address || "");
  const [paymentMethod, setPaymentMethod] = useState("orange_money");
  const [paymentRef, setPaymentRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({});
  const [unavailableItems, setUnavailableItems] = useState([]);
  const navigate = useNavigate();
  const { emitUpdate } = useTracking() || {};

  useEffect(() => {
    getSettings().then(setSettings).catch(() => {});
  }, []);

  const selectedPayment = PAYMENT_METHODS.find((p) => p.id === paymentMethod);

  async function checkCartAvailability() {
    try {
      const allProducts = await getProducts({});
      const unavail = cart.filter((item) => {
        const p = allProducts.find((p) => p.id === item.id);
        return p && p.is_available === false;
      });
      setUnavailableItems(unavail);
      return unavail;
    } catch {
      return [];
    }
  }

  function buildWhatsAppMessage() {
    return encodeURIComponent(
      `Bonjour Agnès, je souhaite commander :\n` +
      cart.map((i) => `• ${i.name} ×${i.quantity} — ${(i.price * i.quantity).toLocaleString()} FCFA`).join("\n") +
      `\n\nTotal : ${totalPrice.toLocaleString()} FCFA` +
      `\nNom : ${name}\nTél : ${phone}` +
      (address ? `\nAdresse : ${address}` : "") +
      `\nPaiement : ${selectedPayment?.name}`
    );
  }

  function buildOrderPayload(extraFields = {}) {
    return {
      customer_id: customer?.id || null,
      customer_name: name,
      customer_phone: phone,
      customer_address: address,
      items: cart.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
      payment_method: paymentMethod,
      payment_ref: paymentRef || null,
      ...extraFields,
    };
  }

  function buildOrderState(orderResult, extra = {}) {
    return {
      order: {
        ...(orderResult?.order || orderResult || {}),
        customer_name: name,
        customer_phone: phone,
        delivery_address: address,
        payment_method: paymentMethod,
        payment_ref: paymentRef || null,
        total_price: totalPrice,
        ...extra,
      },
    };
  }

  async function handlePlaceOrder() {
    if (!name || !phone) return;

    // ── WhatsApp : commande sans paiement immédiat ──────────────
    if (paymentMethod === "whatsapp") {
      window.open(
        `https://wa.me/${settings.whatsapp_number || "33668557785"}?text=${buildWhatsAppMessage()}`,
        "_blank"
      );
      // Enregistrer la commande en BD pour que l'admin puisse la voir
      try {
        const orderResult = await placeOrder(buildOrderPayload({ notes: "Commande WhatsApp – paiement à la livraison" }));
        clearCart();
        navigate("/confirmation", { state: buildOrderState(orderResult, { payment_status: "à la livraison" }) });
      } catch {
        clearCart();
        navigate("/confirmation", { state: buildOrderState({}) });
      }
      return;
    }

    // ── Paiement à la livraison ─────────────────────────────────
    if (paymentMethod === "cash") {
      setLoading(true);
      try {
        const orderResult = await placeOrder(buildOrderPayload({ notes: "Paiement espèces à la livraison" }));
        clearCart();
        navigate("/confirmation", { state: buildOrderState(orderResult, { payment_status: "à la livraison" }) });
      } catch (e) {
        alert("Erreur : " + (e.message || "Impossible de passer la commande. Réessayez."));
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── Wave : transfert manuel + référence ────────────────────
    if (paymentMethod === "wave") {
      setLoading(true);
      try {
        const orderResult = await placeOrder(buildOrderPayload());
        clearCart();
        navigate("/confirmation", { state: buildOrderState(orderResult) });
      } catch (e) {
        alert("Erreur : " + (e.message || "Impossible de passer la commande. Réessayez."));
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── Orange Money / Carte : paiement en ligne via CinetPay ──
    if (paymentMethod === "orange_money" || paymentMethod === "card") {
      // Vérifier que CinetPay est configuré
      if (!CINETPAY_CONFIGURED) {
        // Fallback : même comportement que Wave (référence manuelle)
        setLoading(true);
        try {
          const orderResult = await placeOrder(buildOrderPayload());
          clearCart();
          navigate("/confirmation", { state: buildOrderState(orderResult) });
        } catch (e) {
          alert("Erreur : " + (e.message || "Impossible de passer la commande."));
        } finally {
          setLoading(false);
        }
        return;
      }

      // Vérifier que le SDK CinetPay est chargé
      if (!window.CinetPay) {
        alert("Le module de paiement ne s'est pas chargé. Vérifiez votre connexion et réessayez.");
        return;
      }

      setLoading(true);

      let createdOrder = null;
      try {
        // 1. Créer la commande en BD (statut "en attente paiement")
        const orderResult = await placeOrder(buildOrderPayload({ payment_status: "en attente paiement" }));
        createdOrder = orderResult?.order || orderResult;
      } catch (e) {
        setLoading(false);
        alert("Erreur lors de la création de la commande : " + (e.message || "Réessayez."));
        return;
      }

      const transactionId = `Agnes-${createdOrder.id}-${Date.now()}`;

      // 2. Ouvrir le module de paiement CinetPay
      try {
        window.CinetPay.setConfig({
          apikey: CINETPAY_APIKEY,
          site_id: CINETPAY_SITE_ID,
          mode: CINETPAY_MODE,
          notify_url: `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/payments/cinetpay-webhook`,
          return_url: `${window.location.origin}/confirmation`,
        });

        window.CinetPay.getCheckout({
          transaction_id: transactionId,
          amount: totalPrice,
          currency: "XOF",
          channels: paymentMethod === "card" ? "CREDIT_CARD" : "MOBILE_MONEY",
          description: `Commande Agnès Shop #${createdOrder.id}`,
          customer_name: name,
          customer_email: customer?.email || "",
          customer_phone_number: phone.replace(/\s/g, ""),
          customer_address: address || "Dakar",
          customer_city: "Dakar",
          customer_country: "SN",
          customer_state: "SN",
          customer_zip_code: "00000",
        });

        window.CinetPay.waitResponse(async function (data) {
          if (data.status === "ACCEPTED") {
            // Paiement réussi → mettre à jour le statut
            try {
              await updatePaymentStatus(createdOrder.id, {
                payment_status: "payée",
                transaction_id: transactionId,
                payment_ref: data.pm_token || data.transaction_id || transactionId,
              });
            } catch (_) {}
            clearCart();
            navigate("/confirmation", {
              state: buildOrderState(createdOrder, {
                payment_status: "payée",
                transaction_id: transactionId,
              }),
            });
          } else {
            // Paiement refusé / annulé
            setLoading(false);
            try {
              await updatePaymentStatus(createdOrder.id, { payment_status: "refusée" });
            } catch (_) {}
            alert(
              "Paiement refusé ou annulé. Votre commande reste en attente.\n" +
              "Vous pouvez réessayer ou choisir un autre mode de paiement."
            );
          }
        });

        window.CinetPay.onError(function (error) {
          setLoading(false);
          console.error("CinetPay error:", error);
          alert("Une erreur s'est produite avec le module de paiement. Réessayez ou contactez-nous.");
        });

      } catch (e) {
        setLoading(false);
        console.error("CinetPay init error:", e);
        alert("Erreur lors du lancement du paiement. Vérifiez votre connexion.");
      }
      return;
    }
  }

  if (cart.length === 0) {
    return (
      <div style={{ padding: "4rem 0" }}>
        <div className="container">
          <div className="empty-state">
            <div className="empty-icon">🛒</div>
            <div className="empty-title">Votre panier est vide</div>
            <div className="empty-desc">Ajoutez des articles depuis la boutique pour commencer.</div>
            <a href="/boutique" className="btn btn-primary" style={{ marginTop: "1.5rem" }}>
              Voir la boutique
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "2.5rem 0 4rem" }}>
      <div className="container" style={{ maxWidth: "900px" }}>
        <h1 className="page-title" style={{ marginBottom: "0.25rem" }}>Mon Panier</h1>
        <p className="page-subtitle" style={{ marginBottom: "2rem" }}>
          {cart.length} article{cart.length > 1 ? "s" : ""}
        </p>

        {/* Indicateur d'étapes */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0", marginBottom: "2.5rem",
          background: "white", borderRadius: "12px", padding: "1rem 1.5rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #F3F4F6",
        }}>
          {[
            { n: 1, label: "Récapitulatif" },
            { n: 2, label: "Livraison" },
            { n: 3, label: "Paiement" },
          ].map((s, i) => (
            <React.Fragment key={s.n}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
                <div style={{
                  width: "30px", height: "30px", borderRadius: "50%",
                  background: step >= s.n ? "var(--primary)" : "#E5E7EB",
                  color: step >= s.n ? "white" : "#9CA3AF",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.8rem", fontWeight: "700", flexShrink: 0,
                }}>
                  {step > s.n ? "✓" : s.n}
                </div>
                <span style={{
                  fontSize: "0.85rem", fontWeight: step === s.n ? "700" : "500",
                  color: step >= s.n ? "var(--primary)" : "#9CA3AF",
                }}>
                  {s.label}
                </span>
              </div>
              {i < 2 && (
                <div style={{ flex: 0, height: "2px", width: "40px", background: step > s.n ? "var(--primary)" : "#E5E7EB", margin: "0 0.5rem" }} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem", alignItems: "start" }}>
          {/* Colonne principale */}
          <div>
            {/* ─ ÉTAPE 1 : Récap ─ */}
            {step === 1 && (
              <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #F3F4F6" }}>
                <h3 style={{ fontFamily: "'Inter',sans-serif", fontWeight: "700", marginBottom: "1.25rem", fontSize: "1rem" }}>
                  Articles commandés
                </h3>
                {cart.map((item) => (
                  <div key={item.id} style={{
                    display: "flex", alignItems: "center", gap: "1rem",
                    padding: "0.9rem 0", borderBottom: "1px solid #F3F4F6",
                  }}>
                    <img
                      src={item.image?.startsWith("/uploads") ? `${process.env.REACT_APP_API_URL || "http://localhost:5000"}${item.image}` : item.image?.startsWith("/") ? `${process.env.PUBLIC_URL}${item.image}` : item.image}
                      alt={item.name}
                      style={{ width: "56px", height: "56px", objectFit: "cover", borderRadius: "8px", background: "#F3F4F6" }}
                      onError={(e) => { e.target.src = "https://placehold.co/56x56/E8E6FF/1E1B4B?text=?"; }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "700", fontSize: "0.92rem" }}>{item.name}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{item.price.toLocaleString()} FCFA / unité</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <button onClick={() => removeFromCart(item.id)} style={{ width: "28px", height: "28px", borderRadius: "50%", border: "1.5px solid #E5E7EB", background: "white", cursor: "pointer", fontWeight: "700", fontSize: "1rem" }}>–</button>
                      <span style={{ fontWeight: "700", minWidth: "22px", textAlign: "center" }}>{item.quantity}</span>
                      <button onClick={() => addToCart(item)} style={{ width: "28px", height: "28px", borderRadius: "50%", border: "none", background: "var(--primary)", color: "white", cursor: "pointer", fontWeight: "700", fontSize: "1rem" }}>+</button>
                    </div>
                    <div style={{ fontWeight: "800", color: "var(--rose)", minWidth: "90px", textAlign: "right", fontSize: "0.95rem" }}>
                      {(item.price * item.quantity).toLocaleString()} FCFA
                    </div>
                    <button onClick={() => deleteFromCart(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#D1D5DB", fontSize: "1.2rem", padding: "4px" }} title="Supprimer">✕</button>
                  </div>
                ))}
                {unavailableItems.length > 0 && (
                  <div style={{ marginTop: "1rem", background: "#FFF1F2", border: "1.5px solid #FECDD3", borderRadius: "10px", padding: "0.9rem 1.1rem" }}>
                    <div style={{ fontWeight: "700", color: "#BE123C", fontSize: "0.88rem", marginBottom: "0.35rem" }}>
                      ⚠️ Article(s) indisponible(s) dans votre panier
                    </div>
                    {unavailableItems.map((i) => (
                      <div key={i.id} style={{ fontSize: "0.83rem", color: "#9F1239" }}>
                        • <strong>{i.name}</strong> est actuellement en rupture de stock — veuillez le retirer avant de continuer.
                      </div>
                    ))}
                  </div>
                )}
                <button
                  className="btn btn-primary"
                  style={{ marginTop: "1.5rem", float: "right" }}
                  onClick={async () => {
                    const unavail = await checkCartAvailability();
                    if (unavail.length === 0) {
                      setStep(2);
                      emitUpdate?.({ checkoutStep: "Livraison (étape 2)", page: "Panier → Livraison" });
                    }
                  }}
                >
                  Continuer → Livraison
                </button>
              </div>
            )}

            {/* ─ ÉTAPE 2 : Livraison ─ */}
            {step === 2 && (
              <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #F3F4F6" }}>
                <h3 style={{ fontFamily: "'Inter',sans-serif", fontWeight: "700", marginBottom: "1.25rem", fontSize: "1rem" }}>
                  Informations de livraison
                </h3>
                <div style={{ display: "grid", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Nom complet *</label>
                    <input className="form-input" placeholder="Prénom et nom" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Téléphone *</label>
                    <input className="form-input" type="tel" placeholder="+221 77 XXX XX XX" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Adresse de livraison</label>
                    <input className="form-input" placeholder="Quartier, rue, repère..." value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                  {settings.delivery_info && (
                    <div className="alert alert-info" style={{ fontSize: "0.84rem" }}>
                      📦 {settings.delivery_info}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost" onClick={() => setStep(1)}>← Retour</button>
                  <button className="btn btn-primary" disabled={!name || !phone} onClick={() => {
                    setStep(3);
                    emitUpdate?.({ checkoutStep: "Paiement (étape 3)", page: "Panier → Paiement", customerName: name });
                  }}>
                    Continuer → Paiement
                  </button>
                </div>
              </div>
            )}

            {/* ─ ÉTAPE 3 : Paiement ─ */}
            {step === 3 && (
              <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #F3F4F6" }}>
                <h3 style={{ fontFamily: "'Inter',sans-serif", fontWeight: "700", marginBottom: "1.25rem", fontSize: "1rem" }}>
                  Choisissez votre paiement
                </h3>

                {/* Liste des méthodes de paiement */}
                <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1.5rem" }}>
                  {PAYMENT_METHODS.map((pm) => (
                    <div
                      key={pm.id}
                      className={`payment-option ${paymentMethod === pm.id ? "selected" : ""}`}
                      onClick={() => setPaymentMethod(pm.id)}
                      style={{ position: "relative" }}
                    >
                      <div className="payment-option-icon" style={{ background: pm.bg }}>
                        {pm.icon}
                      </div>
                      <div className="payment-option-body">
                        <div className="payment-option-name">
                          {pm.name}
                          {pm.online && CINETPAY_CONFIGURED && (
                            <span style={{
                              marginLeft: "8px", fontSize: "0.68rem", fontWeight: "700",
                              background: "#DCFCE7", color: "#15803D", borderRadius: "999px",
                              padding: "2px 8px", verticalAlign: "middle",
                            }}>
                              EN LIGNE ✓
                            </span>
                          )}
                        </div>
                        <div className="payment-option-desc">{pm.desc}</div>
                      </div>
                      <div style={{
                        width: "20px", height: "20px", borderRadius: "50%",
                        border: `2px solid ${paymentMethod === pm.id ? "var(--primary)" : "#D1D5DB"}`,
                        background: paymentMethod === pm.id ? "var(--primary)" : "white",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        {paymentMethod === pm.id && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "white" }} />}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Instructions dynamiques selon le mode */}
                {paymentMethod === "orange_money" && (
                  CINETPAY_CONFIGURED ? (
                    <div style={{ background: "#FFF7F0", border: "1px solid #FDBA74", borderRadius: "12px", padding: "1rem", marginBottom: "1rem", fontSize: "0.87rem" }}>
                      🟠 <strong>Paiement Orange Money sécurisé :</strong> Après confirmation, une fenêtre de paiement CinetPay s'ouvrira. Suivez les instructions pour effectuer le transfert depuis votre application Orange Money.
                    </div>
                  ) : (
                    <div className="alert alert-warning" style={{ marginBottom: "1rem" }}>
                      <strong>🟠 Payer via Orange Money :</strong>
                      <ol style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", fontSize: "0.87rem", lineHeight: 1.8 }}>
                        <li>Composez <strong>*144*{settings.orange_money_number || "668557785"}*{totalPrice}#</strong></li>
                        <li>Ou : App Orange Money → Envoyer → Numéro <strong>{settings.orange_money_number || "668557785"}</strong></li>
                        <li>Montant : <strong>{totalPrice.toLocaleString()} FCFA</strong></li>
                        <li>Notez le code SMS reçu et entrez-le ci-dessous</li>
                      </ol>
                    </div>
                  )
                )}

                {paymentMethod === "card" && (
                  CINETPAY_CONFIGURED ? (
                    <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: "12px", padding: "1rem", marginBottom: "1rem", fontSize: "0.87rem" }}>
                      💳 <strong>Paiement par carte sécurisé :</strong> Après confirmation, vous serez redirigé vers une page de paiement sécurisée (Visa / Mastercard). Vos données bancaires ne sont jamais partagées avec Agnès Shop.
                    </div>
                  ) : (
                    <div className="alert alert-info" style={{ marginBottom: "1rem", fontSize: "0.87rem" }}>
                      💳 <strong>Carte bancaire :</strong> Cette option sera disponible prochainement. En attendant, utilisez Orange Money, Wave, ou commandez via WhatsApp.
                    </div>
                  )
                )}

                {paymentMethod === "wave" && (
                  <div className="alert alert-info" style={{ marginBottom: "1rem" }}>
                    <strong>🔵 Payer via Wave :</strong>
                    <ol style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", fontSize: "0.87rem", lineHeight: 1.8 }}>
                      <li>Ouvrez l'application <strong>Wave</strong> → Envoyer</li>
                      <li>Numéro destinataire : <strong>{settings.wave_number || "668557785"}</strong></li>
                      <li>Montant : <strong>{totalPrice.toLocaleString()} FCFA</strong></li>
                      <li>Entrez le code de transaction reçu ci-dessous (optionnel)</li>
                    </ol>
                  </div>
                )}

                {paymentMethod === "cash" && (
                  <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: "12px", padding: "1rem", marginBottom: "1rem", fontSize: "0.87rem" }}>
                    📦 <strong>Paiement à la livraison :</strong> Préparez <strong>{totalPrice.toLocaleString()} FCFA</strong> en espèces. Notre livreur accepte uniquement les espèces en monnaie exacte.
                  </div>
                )}

                {paymentMethod === "whatsapp" && (
                  <div style={{ background: "#F0FFF4", border: "1px solid #86EFAC", borderRadius: "12px", padding: "1rem", marginBottom: "1rem", fontSize: "0.87rem" }}>
                    💬 <strong>Commander via WhatsApp :</strong> Votre commande sera envoyée directement à Agnès. Elle vous contactera pour confirmer la livraison et le paiement (espèces, OM ou Wave à la livraison).
                  </div>
                )}

                {/* Champ référence pour Wave + OM sans CinetPay */}
                {(paymentMethod === "wave" || (paymentMethod === "orange_money" && !CINETPAY_CONFIGURED)) && (
                  <div className="form-group" style={{ marginBottom: "1rem" }}>
                    <label className="form-label">Référence de transaction (optionnel)</label>
                    <input
                      className="form-input"
                      placeholder="Ex: OM-12345678 ou code Wave"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                    />
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                      L'admin confirmera votre paiement après vérification.
                    </p>
                  </div>
                )}

                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost" onClick={() => setStep(2)} disabled={loading}>← Retour</button>
                  <button
                    className="btn btn-accent btn-lg"
                    disabled={loading || (paymentMethod === "card" && !CINETPAY_CONFIGURED)}
                    onClick={handlePlaceOrder}
                    style={{ minWidth: "200px" }}
                  >
                    {loading
                      ? "⏳ Traitement en cours..."
                      : paymentMethod === "whatsapp"
                        ? "💬 Commander sur WhatsApp"
                        : (paymentMethod === "orange_money" || paymentMethod === "card") && CINETPAY_CONFIGURED
                          ? "🔒 Payer maintenant"
                          : "✅ Confirmer la commande"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Résumé ── */}
          <div style={{
            background: "white", borderRadius: "16px", padding: "1.25rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #F3F4F6",
            position: "sticky", top: "84px",
          }}>
            <h3 style={{ fontFamily: "'Inter',sans-serif", fontWeight: "700", marginBottom: "1rem", fontSize: "0.95rem" }}>
              Résumé de commande
            </h3>
            {cart.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                <span>{item.name} ×{item.quantity}</span>
                <span style={{ fontWeight: "600" }}>{(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
            <hr className="divider" style={{ margin: "0.75rem 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem", fontSize: "0.88rem", color: "var(--text-muted)" }}>
              <span>Sous-total</span>
              <span>{totalPrice.toLocaleString()} FCFA</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", fontSize: "0.88rem", color: "var(--text-muted)" }}>
              <span>Livraison</span>
              <span style={{ color: "var(--success)", fontWeight: "600" }}>À confirmer</span>
            </div>
            <hr className="divider" style={{ margin: "0.75rem 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: "700", fontSize: "1rem" }}>Total</span>
              <span style={{ fontWeight: "800", fontSize: "1.3rem", color: "var(--rose)" }}>
                {totalPrice.toLocaleString()} <small style={{ fontSize: "0.7rem", fontWeight: "600" }}>FCFA</small>
              </span>
            </div>
            {step === 3 && selectedPayment && (
              <div style={{
                marginTop: "1rem", padding: "0.65rem 0.9rem",
                background: "#F8F7FF", borderRadius: "8px",
                fontSize: "0.82rem", color: "var(--primary)", fontWeight: "600",
                display: "flex", alignItems: "center", gap: "0.5rem",
              }}>
                {selectedPayment.icon} {selectedPayment.name}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cart;
