const http = require("http");
const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const { initDB } = require("./db/database");
const productsRouter = require("./routes/products");
const ordersRouter = require("./routes/orders");
const authRouter = require("./routes/auth");
const customersRouter = require("./routes/customers");
const settingsRouter = require("./routes/settings");
const paymentsRouter = require("./routes/payments");
const contactRouter = require("./routes/contact");

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;

// ── CORS ─────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.FRONTEND_URL,
].filter(Boolean);

// ── Sécurité HTTP ────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ── Rate limiting ────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de requêtes, réessayez dans 15 minutes." },
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives de connexion, réessayez dans 15 minutes." },
});

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Servir les images uploadées
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Routes API ───────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/customers/login", authLimiter);
app.use("/api/customers/register", authLimiter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/customers", customersRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/contact", contactRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Agnès Shop API est en ligne ✅" });
});

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} introuvable.` });
});

app.use((err, req, res, next) => {
  console.error("Erreur serveur :", err.message);
  res.status(500).json({ error: "Erreur interne du serveur." });
});

// ── Socket.io — Tracking visiteurs en temps réel ─────────────
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"] },
});

// Stockage en mémoire des visiteurs actifs : socketId → données
const visitors = new Map();

// Nettoyer les visiteurs inactifs depuis plus de 10 min
setInterval(() => {
  const limit = Date.now() - 10 * 60 * 1000;
  for (const [id, v] of visitors) {
    if (new Date(v.lastSeen).getTime() < limit) {
      visitors.delete(id);
    }
  }
  io.to("admins").emit("visitors:list", [...visitors.values()]);
}, 60 * 1000);

function broadcastVisitors() {
  io.to("admins").emit("visitors:list", [...visitors.values()]);
}

io.on("connection", (socket) => {

  // L'admin rejoint sa salle privée (token JWT requis)
  socket.on("admin:join", (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role === "admin") {
        socket.join("admins");
        // Envoyer la liste actuelle immédiatement
        socket.emit("visitors:list", [...visitors.values()]);
      }
    } catch {}
  });

  // Mise à jour d'un visiteur (page, panier, étape checkout...)
  socket.on("visitor:update", (data) => {
    visitors.set(socket.id, {
      id: socket.id,
      sessionId: data.sessionId || socket.id,
      page: data.page || "—",
      pathname: data.pathname || "/",
      customerName: data.customerName || null,
      customerEmail: data.customerEmail || null,
      isLoggedIn: !!data.isLoggedIn,
      cartCount: data.cartCount || 0,
      cartItems: data.cartItems || [],
      checkoutStep: data.checkoutStep || null,
      lastSeen: new Date().toISOString(),
      connectedAt: visitors.get(socket.id)?.connectedAt || new Date().toISOString(),
    });
    broadcastVisitors();
  });

  // Déconnexion
  socket.on("disconnect", () => {
    visitors.delete(socket.id);
    broadcastVisitors();
  });
});

// ── Démarrage ────────────────────────────────────────────────
async function start() {
  await initDB();
  httpServer.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📦 API produits : http://localhost:${PORT}/api/products`);
    console.log(`📋 API commandes : http://localhost:${PORT}/api/orders`);
    console.log(`🔐 API auth : http://localhost:${PORT}/api/auth/login`);
    console.log(`👁️  Tracking visiteurs : Socket.io actif`);
  });
}

start();
