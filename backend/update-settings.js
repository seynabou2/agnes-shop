const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const updates = [
  ['store_phone', '+33668557785'],
  ['store_email', 'nabousene2002@gmail.com'],
  ['orange_money_number', '668557785'],
  ['wave_number', '668557785'],
  ['whatsapp_number', '33668557785'],
];

async function run() {
  for (const [key, value] of updates) {
    const res = await pool.query(
      'UPDATE site_settings SET value = $1 WHERE key = $2',
      [value, key]
    );
    console.log(key, '->', res.rowCount === 1 ? '✅ mis à jour' : '⚠️ ligne non trouvée');
  }
  await pool.end();
  console.log('\nTerminé !');
}

run().catch(console.error);
