const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || "boutiqueagnes",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD,
      }
);

async function initDB() {
  const client = await pool.connect();
  try {
    // ── Tables ────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price INTEGER NOT NULL,
        image VARCHAR(500),
        category VARCHAR(100) DEFAULT 'Général',
        description TEXT,
        stock INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        customer_address TEXT,
        items JSONB NOT NULL,
        total INTEGER NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'whatsapp',
        payment_ref VARCHAR(200),
        payment_status VARCHAR(50) DEFAULT 'en attente',
        transaction_id VARCHAR(200),
        status VARCHAR(50) DEFAULT 'en attente',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        subject VARCHAR(200),
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Colonnes promotion / disponibilité / nouveauté ────────
    const productMigrations = [
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS in_promotion BOOLEAN DEFAULT false`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false`,
    ];
    for (const sql of productMigrations) {
      try { await client.query(sql); } catch (_) {}
    }

    // ── Migration stock : 0 → NULL (stock non géré = illimité) ──
    // Les produits sans stock défini passent de 0 à NULL (pas de blocage)
    await client.query(`
      UPDATE products SET stock = NULL WHERE stock = 0
    `).catch(() => {});

    // ── Index pour les performances ───────────────────────────
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)",
      "CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id)",
      "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)",
      "CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)",
      "CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)",
    ];
    for (const sql of indexes) {
      try { await client.query(sql); } catch (_) {}
    }

    // ── Migrations (colonnes éventuellement manquantes) ───────
    const migrations = [
      // customer_id — référence vers la table customers (ajout si manquant)
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id INTEGER`,
      // Tentative d'ajout de la contrainte FK (ignoré si déjà là ou si pb)
      `DO $$ BEGIN
         ALTER TABLE orders ADD CONSTRAINT orders_customer_id_fkey
           FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
       EXCEPTION WHEN duplicate_object OR undefined_column THEN NULL;
       END $$`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address TEXT`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'whatsapp'`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_ref VARCHAR(200)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'en attente'`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(200)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_notes TEXT`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255)`,
      // Colonnes de base qui pourraient manquer sur très ancienne table
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS items JSONB`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS total INTEGER`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'en attente'`,
    ];

    for (const sql of migrations) {
      try { await client.query(sql); } catch (_) { /* ignore si déjà existant */ }
    }

    // ── Données de base ───────────────────────────────────────
    const checkProducts = await client.query("SELECT COUNT(*) FROM products");
    if (checkProducts.rows[0].count === "0") {
      await client.query(`
        INSERT INTO products (name, price, image, category, description) VALUES
        ('Robe en pagne', 8500, '/images/robe.jpg', 'Robes', 'Magnifique robe en pagne wax, confectionnée avec soin.'),
        ('Boubou moderne', 12000, '/images/boubou.jpg', 'Boubous', 'Boubou élégant alliant tradition et modernité.'),
        ('Top wax', 6500, '/images/top.jpg', 'Tops', 'Top en tissu wax, coupe ajustée et colorée.'),
        ('Pantalon élégant', 9000, '/images/pantalon.jpg', 'Pantalons', 'Pantalon en pagne, coupe droite et élégante.');
      `);
      console.log("✅ Produits de base insérés.");
    }

    const checkSettings = await client.query("SELECT COUNT(*) FROM site_settings");
    if (checkSettings.rows[0].count === "0") {
      await client.query(`
        INSERT INTO site_settings (key, value) VALUES
        ('store_name', 'Agnès Shop'),
        ('store_phone', '+33668557785'),
        ('store_email', 'nabousene2002@gmail.com'),
        ('store_address', 'Dakar, Sénégal'),
        ('orange_money_number', '668557785'),
        ('wave_number', '668557785'),
        ('whatsapp_number', '33668557785'),
        ('instagram', ''),
        ('facebook', ''),
        ('delivery_info', 'Livraison sous 24-48h à Dakar. Frais de livraison : 1 000 FCFA.'),
        ('about_text', 'Agnès Shop, votre boutique de mode africaine à Dakar. Des vêtements authentiques, élégants et modernes, confectionnés avec passion.');
      `);
      console.log("✅ Paramètres par défaut insérés.");
    }

    console.log("✅ Base de données initialisée.");
  } catch (err) {
    console.error("❌ Erreur d'initialisation DB :", err.message);
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
