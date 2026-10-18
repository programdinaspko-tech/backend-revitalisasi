const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const pool = require('../config/db'); // Hubungkan ke database PostgreSQL

// 1. Endpoint Login Asli
router.post('/login', authController.login);

// 2. Endpoint Registrasi Sekolah Baru (Tersimpan permanen ke Database)
router.post('/register', async (req, res) => {
  try {
    const { npsn, nama_sekolah, jenjang, operator, password, wa_operator } = req.body;
    
    if (!npsn || !nama_sekolah) {
      return res.status(400).json({ success: false, message: 'NPSN dan Nama Sekolah wajib diisi!' });
    }

    // Cek apakah NPSN sudah terdaftar
    const checkExist = await pool.query(`SELECT id FROM registered_users WHERE npsn = $1`, [npsn]);

    if (checkExist.rows.length > 0) {
      // Update jika sudah ada
      await pool.query(
        `UPDATE registered_users SET nama_sekolah = $1, jenjang = $2, operator = $3, wa_operator = $4 WHERE npsn = $5`,
        [nama_sekolah, jenjang || 'SD', operator || '', wa_operator || '', npsn]
      );
    } else {
      // Insert baru dengan status Pending
      await pool.query(
        `INSERT INTO registered_users (npsn, nama_sekolah, jenjang, operator, password, wa_operator, status) 
         VALUES ($1, $2, $3, $4, $5, $6, 'Pending')`,
        [npsn, nama_sekolah, jenjang || 'SD', operator || '', password || '123456', wa_operator || '']
      );
    }

    res.status(200).json({ success: true, message: 'Registrasi berhasil disimpan ke database server.' });
  } catch (err) {
    console.error('Error register:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Endpoint Tarik Data User untuk Admin Dinas
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM registered_users ORDER BY id ASC`);
    res.status(200).json({ users: result.rows });
  } catch (err) {
    console.error('Error get users:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Endpoint Update Status User (Setuju / Tolak)
router.post('/update-status', async (req, res) => {
  try {
    const { npsn, status } = req.body;
    
    if (!npsn || !status) {
      return res.status(400).json({ success: false, message: 'NPSN dan status wajib disertakan!' });
    }

    await pool.query(`UPDATE registered_users SET status = $1 WHERE npsn = $2`, [status, npsn]);
    res.status(200).json({ success: true, message: 'Status berhasil diperbarui.' });
  } catch (err) {
    console.error('Error update-status:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Endpoint Hapus User / Sekolah berdasarkan NPSN
router.delete('/users/:npsn', async (req, res) => {
  try {
    const { npsn } = req.params;
    
    if (!npsn || npsn === '00000000') {
      return res.status(400).json({ success: false, message: 'Akun Super Admin Dinas tidak dapat dihapus!' });
    }

    await pool.query(`DELETE FROM registered_users WHERE npsn = $1`, [npsn]);
    res.status(200).json({ success: true, message: 'User berhasil dihapus dari sistem.' });
  } catch (err) {
    console.error('Error delete user:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;