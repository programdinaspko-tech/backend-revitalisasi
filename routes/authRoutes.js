const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Memori sementara server untuk menampung data registrasi (sinkronisasi antar browser)
// Jika Anda menggunakan database PostgreSQL, penyimpanan ini bisa diganti dengan query database.
let registeredUsersDB = [];

// 1. Endpoint Login Asli
router.post('/login', authController.login);

// 2. Endpoint Registrasi Sekolah Baru
router.post('/register', (req, res) => {
  try {
    const payload = req.body;
    // Cek apakah NPSN sudah ada
    const existingIndex = registeredUsersDB.findIndex(u => u.npsn === payload.npsn);
    if (existingIndex >= 0) {
      registeredUsersDB[existingIndex] = payload;
    } else {
      registeredUsersDB.push(payload);
    }
    res.status(200).json({ success: true, message: 'Registrasi berhasil disimpan di server.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Endpoint untuk Admin Menarik Semua Data User (Sinkronisasi Antar Browser 1 & 2)
router.get('/users', (req, res) => {
  try {
    res.status(200).json({ users: registeredUsersDB });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Endpoint untuk Memperbarui Status User (Disetujui / Ditolak)
router.post('/update-status', (req, res) => {
  try {
    const { npsn, status } = req.body;
    let user = registeredUsersDB.find(u => u.npsn === npsn);
    if (user) {
      user.status = status;
      res.status(200).json({ success: true, message: 'Status berhasil diperbarui.' });
    } else {
      res.status(404).json({ success: false, message: 'User sekolah tidak ditemukan.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;