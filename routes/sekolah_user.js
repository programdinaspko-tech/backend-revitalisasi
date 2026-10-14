const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // Sesuaikan dengan konfigurasi koneksi DB Anda
const verifyToken = require('../middleware/authMiddleware'); // Sesuaikan middleware auth Anda

// ==========================================
// 1. DATA SEKOLAH (Profil & Infrastruktur)
// ==========================================
router.get('/profil', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query('SELECT * FROM sekolah WHERE user_id = $1', [userId]);
    res.json({ data: result.rows[0] || null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/profil', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      nama_sekolah, npsn, jenjang, status_sekolah, 
      sk_pendirian, akreditasi, jenis_listrik, jenis_internet, 
      nama_kepala_sekolah, nip_kepala_sekolah 
    } = req.body;

    const query = `
      UPDATE sekolah SET 
        nama_sekolah = $1, npsn = $2, jenjang = $3, status_sekolah = $4,
        sk_pendirian = $5, akreditasi = $6, jenis_listrik = $7, jenis_internet = $8,
        nama_kepala_sekolah = $9, nip_kepala_sekolah = $10, status_sinkron = 'Draft'
      WHERE user_id = $11 RETURNING *;
    `;
    
    const values = [
      nama_sekolah, npsn, jenjang, status_sekolah, 
      sk_pendirian, akreditasi, jenis_listrik, jenis_internet, 
      nama_kepala_sekolah, nip_kepala_sekolah, userId
    ];

    const result = await pool.query(query, values);
    res.json({ message: 'Profil sekolah berhasil diperbarui', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// 2. GTK (Guru & Tenaga Kependidikan)
// ==========================================
router.get('/gtk/:sekolah_id', verifyToken, async (req, res) => {
  try {
    const { sekolah_id } = req.params;
    const result = await pool.query('SELECT * FROM gtk WHERE sekolah_id = $1 ORDER BY id DESC', [sekolah_id]);
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/gtk', verifyToken, async (req, res) => {
  try {
    const { 
      sekolah_id, nama_lengkap, jenis_kelamin, status_kepegawaian, 
      status_serdik, jabatan_guru, kualifikasi_ijazah, kebutuhan_jam_mengajar 
    } = req.body;

    const query = `
      INSERT INTO gtk (
        sekolah_id, nama_lengkap, jenis_kelamin, status_kepegawaian, 
        status_serdik, jabatan_guru, kualifikasi_ijazah, kebutuhan_jam_mengajar
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;
    `;

    const values = [
      sekolah_id, nama_lengkap, jenis_kelamin, status_kepegawaian, 
      status_serdik, jabatan_guru, kualifikasi_ijazah, kebutuhan_jam_mengajar || 0
    ];

    const result = await pool.query(query, values);
    res.status(201).json({ message: 'Data GTK berhasil ditambahkan', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// 3. PESERTA DIDIK
// ==========================================
router.get('/peserta-didik/:sekolah_id', verifyToken, async (req, res) => {
  try {
    const { sekolah_id } = req.params;
    const result = await pool.query('SELECT * FROM peserta_didik WHERE sekolah_id = $1 ORDER BY tingkat_kelas ASC', [sekolah_id]);
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/peserta-didik', verifyToken, async (req, res) => {
  try {
    const { sekolah_id, tingkat_kelas, jenis_kelamin, umur, jumlah_siswa, penerima_pip, siswa_drop_out } = req.body;

    const query = `
      INSERT INTO peserta_didik (
        sekolah_id, tingkat_kelas, jenis_kelamin, umur, jumlah_siswa, penerima_pip, siswa_drop_out
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
    `;

    const values = [
      sekolah_id, tingkat_kelas, jenis_kelamin, umur || 0, jumlah_siswa || 0, penerima_pip || 0, siswa_drop_out || 0
    ];

    const result = await pool.query(query, values);
    res.status(201).json({ message: 'Data Peserta Didik berhasil disimpan', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// 4. ROMBEL (Rombongan Belajar)
// ==========================================
router.get('/rombel/:sekolah_id', verifyToken, async (req, res) => {
  try {
    const { sekolah_id } = req.params;
    const result = await pool.query('SELECT * FROM rombel WHERE sekolah_id = $1 ORDER BY tingkat_kelas ASC', [sekolah_id]);
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/rombel', verifyToken, async (req, res) => {
  try {
    const { sekolah_id, tingkat_kelas, jumlah_rombel } = req.body;

    const query = `
      INSERT INTO rombel (sekolah_id, tingkat_kelas, jumlah_rombel)
      VALUES ($1, $2, $3) RETURNING *;
    `;

    const result = await pool.query(query, [sekolah_id, tingkat_kelas, jumlah_rombel || 1]);
    res.status(201).json({ message: 'Data Rombel berhasil disimpan', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// 5. SINKRONISASI DATA
// ==========================================
router.post('/sinkronkan', verifyToken, async (req, res) => {
  try {
    const { sekolah_id } = req.body;
    
    const query = `
      UPDATE sekolah 
      SET status_sinkron = 'Ter-Sinkron', last_sync = CURRENT_TIMESTAMP 
      WHERE id = $1 RETURNING *;
    `;

    const result = await pool.query(query, [sekolah_id]);
    res.json({ message: 'Data sekolah berhasil disinkronkan ke Dinas!', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;