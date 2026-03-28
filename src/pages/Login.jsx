import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginCustomer, registerCustomer } from "../services/api";
import { useCustomer } from "../context/CustomerContext";
import "../index.css";

function Login() {
  const [mode, setMode] = useState("login"); // "login" ou "register"
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "",
    phone: "", address: "", password: "", confirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginSuccess } = useCustomer();
  const navigate = useNavigate();

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (mode === "register" && form.password !== form.confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      let data;
      if (mode === "login") {
        data = await loginCustomer(form.email, form.password);
      } else {
        data = await registerCustomer({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          password: form.password,
        });
      }
      loginSuccess(data.customer, data.token);
      navigate("/mon-compte");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: "460px", margin: "3rem auto", padding: "2rem",
        background: "white", borderRadius: "16px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
      }}
    >
      {/* Onglets Connexion / Inscription */}
      <div style={{ display: "flex", marginBottom: "1.5rem", borderBottom: "2px solid #e5e7eb" }}>
        {["login", "register"].map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(""); }}
            style={{
              flex: 1, padding: "0.65rem", border: "none", background: "none",
              cursor: "pointer", fontWeight: "700", fontSize: "0.95rem",
              color: mode === m ? "#7c3aed" : "#9ca3af",
              borderBottom: mode === m ? "2px solid #7c3aed" : "2px solid transparent",
              marginBottom: "-2px",
            }}
          >
            {m === "login" ? "🔑 Se connecter" : "✨ Créer un compte"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        {mode === "register" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <input
                name="first_name" placeholder="Prénom *"
                value={form.first_name} onChange={handleChange} required
                style={inputStyle}
              />
              <input
                name="last_name" placeholder="Nom *"
                value={form.last_name} onChange={handleChange} required
                style={inputStyle}
              />
            </div>
            <input
              name="phone" placeholder="Téléphone"
              value={form.phone} onChange={handleChange}
              style={inputStyle}
            />
            <input
              name="address" placeholder="Adresse de livraison"
              value={form.address} onChange={handleChange}
              style={inputStyle}
            />
          </>
        )}

        <input
          name="email" type="email" placeholder="Email *"
          value={form.email} onChange={handleChange} required
          style={inputStyle}
        />
        <input
          name="password" type="password"
          placeholder={mode === "register" ? "Mot de passe *" : "Mot de passe"}
          value={form.password} onChange={handleChange} required
          style={inputStyle}
        />
        {mode === "register" && (
          <input
            name="confirm" type="password" placeholder="Confirmer le mot de passe *"
            value={form.confirm} onChange={handleChange} required
            style={inputStyle}
          />
        )}

        {error && (
          <p style={{ color: "#dc2626", fontSize: "0.9rem", margin: 0 }}>⚠️ {error}</p>
        )}

        <button
          type="submit" className="button"
          disabled={loading}
          style={{ marginTop: "0.25rem" }}
        >
          {loading
            ? "⏳ Chargement..."
            : mode === "login" ? "Se connecter" : "Créer mon compte"
          }
        </button>
      </form>
    </div>
  );
}

const inputStyle = {
  padding: "0.65rem 1rem", borderRadius: "8px",
  border: "1px solid #d1d5db", fontSize: "0.95rem",
  width: "100%", boxSizing: "border-box",
};

export default Login;
