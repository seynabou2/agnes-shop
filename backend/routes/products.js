const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { pool } = require("../db/database");
const authMiddleware = require("../middleware/auth");

// Config upload d'images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname.replace(/\s/g, "_");
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Seuls les fichiers JPG, PNG et WEBP sont acceptés."));
    }
  },
});

// GET /api/products — tous les produits (public)
router.get("/", async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = "SELECT * FROM products";
    const params = [];

    if (category && search) {
      query += " WHERE category = $1 AND (name ILIKE $2 OR description ILIKE $2)";
      params.push(category, `%${search}%`);
    } else if (category) {
      query += " WHERE category = $1";
      params.push(category);
    } else if (search) {
      query += " WHERE name ILIKE $1 OR description ILIKE $1";
      params.push(`%${search}%`);
    }

    query += " ORDER BY created_at DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur : " + err.message });
  }
});

// GET /api/products/categories — liste des catégories (public)
router.get("/categories", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT category FROM products ORDER BY category"
    );
    res.json(result.rows.map((r) => r.category));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id — un produit (public)
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Produit introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products — ajouter un produit (admin uniquement)
router.post("/", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    const { name, price, category, description, stock, is_available, in_promotion, discount_percent, is_new } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: "Nom et prix sont obligatoires." });
    }

    const imageUrl = req.file
      ? `/uploads/${req.file.filename}`
      : req.body.imageUrl || null;

    const stockVal = stock !== "" && stock !== undefined ? parseInt(stock) : null;
    const isAvail = is_available === "false" || is_available === false ? false : true;
    const inPromo = in_promotion === "true" || in_promotion === true ? true : false;
    const discountPct = parseInt(discount_percent) || 0;
    const isNew = is_new === "true" || is_new === true ? true : false;

    const result = await pool.query(
      `INSERT INTO products (name, price, image, category, description, stock, is_available, in_promotion, discount_percent, is_new)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [name, parseInt(price), imageUrl, category || "Général", description || "", stockVal, isAvail, inPromo, discountPct, isNew]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id — modifier un produit (admin uniquement)
router.put("/:id", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    const { name, price, category, description, stock, imageUrl, is_available, in_promotion, discount_percent, is_new } = req.body;
    const id = req.params.id;

    const existing = await pool.query("SELECT * FROM products WHERE id = $1", [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: "Produit introuvable." });

    const image = req.file
      ? `/uploads/${req.file.filename}`
      : imageUrl || existing.rows[0].image;

    // Gestion is_available (peut venir en string depuis FormData)
    const isAvail = is_available === undefined ? null
      : is_available === "false" || is_available === false ? false : true;

    const inPromo = in_promotion === undefined ? null
      : in_promotion === "true" || in_promotion === true ? true : false;

    const isNewVal = is_new === undefined ? null
      : is_new === "true" || is_new === true ? true : false;

    const result = await pool.query(
      `UPDATE products SET
        name = COALESCE($1, name),
        price = COALESCE($2, price),
        image = $3,
        category = COALESCE($4, category),
        description = COALESCE($5, description),
        stock = COALESCE($6, stock),
        is_available = COALESCE($7, is_available),
        in_promotion = COALESCE($8, in_promotion),
        discount_percent = COALESCE($9, discount_percent),
        is_new = COALESCE($10, is_new)
       WHERE id = $11 RETURNING *`,
      [
        name || null,
        price ? parseInt(price) : null,
        image,
        category || null,
        description !== undefined ? description : null,
        stock !== undefined && stock !== "" ? parseInt(stock) : null,
        isAvail,
        inPromo,
        discount_percent !== undefined ? parseInt(discount_percent) || 0 : null,
        isNewVal,
        id,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id — supprimer un produit (admin uniquement)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM products WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Produit introuvable." });
    res.json({ message: "Produit supprimé.", product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
