const { Pool } = require('pg');
require('dotenv').config();

// Mengutamakan DATABASE_URL dari Railway (dengan fallback variabel lokal jika dijalankan di komputer lokal)
const isProduction = process.env.DATABASE_URL || process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('✓ Terhubung ke database PostgreSQL Railway');
});

pool.on('error', (err) => {
  console.error('❌ Error Koneksi PostgreSQL:', err);
});

module.exports = pool;