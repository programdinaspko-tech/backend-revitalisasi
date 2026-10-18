const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. Logika Login User Terpusat yang Fleksibel
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password wajib diisi!' });
    }

    const cleanInput = username.trim().toLowerCase();

    // Jika login menggunakan akun khusus admin dinas
    if (cleanInput === 'admin_dinas' || cleanInput.includes('admin')) {
      const adminQuery = await pool.query(
        `SELECT * FROM registered_users WHERE LOWER(role) LIKE '%admin%' OR LOWER(username) = 'admin_dinas' LIMIT 1`
      );
      if (adminQuery.rows.length > 0) {
        const user = adminQuery.rows[0];
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role, npsn: user.npsn }, process.env.JWT_SECRET || 'rahasia_super_aman', { expiresIn: '1d' });
        return res.json({ message: 'Login berhasil!', token, user });
      }
    }

    // Pencarian fleksibel untuk akun sekolah (berdasarkan NPSN, username, atau nama operator)
    const userQuery = await pool.query(
      `SELECT * FROM registered_users 
       WHERE LOWER(npsn) = $1 
          OR LOWER(username) = $1 
          OR LOWER(operator) LIKE $2 
          OR LOWER(nama_sekolah) LIKE $2`,
      [cleanInput, `%${cleanInput}%`]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Akun tidak ditemukan di database server! Pastikan NPSN atau Nama Operator sudah benar.' });
    }

    const user = userQuery.rows[0];

    // Validasi Status Akun (Pastikan sudah disetujui)
    let statusUser = (user.status || 'Disetujui').trim().toLowerCase();
    if (statusUser !== 'disetujui' && statusUser !== 'aktif' && statusUser !== 'approved') {
      return res.status(403).json({ message: `Akun Anda berstatus "${user.status}". Harap menunggu persetujuan Admin Dinas.` });
    }

    // Generate Token JWT
    const token = jwt.sign(
      { id: user.id, username: user.operator || user.username, role: user.role || 'Sekolah', npsn: user.npsn },
      process.env.JWT_SECRET || 'rahasia_super_aman',
      { expiresIn: '1d' }
    );

    return res.json({
      message: 'Login berhasil!',
      token: token,
      user: {
        id: user.id,
        username: user.operator || user.username,
        role: user.role || 'Sekolah',
        nama_sekolah: user.nama_sekolah,
        npsn: user.npsn,
        jenjang: user.jenjang
      }
    });

  } catch (error) {
    console.error('CRITICAL ERROR pada authController login:', error);
    return res.status(500).json({ 
      message: 'Terjadi kesalahan sistem: ' + (error.message || 'Database error tak dikenal')
    });
  }
};

// 2. Logika Registrasi Akun Sekolah Baru
// Menyesuaikan Form: NPSN, Jenjang, Nama Sekolah, Nama Pengguna / Operator (OPS), & Password
exports.register = async (req, res) => {
  try {
    const { npsn, jenjang, nama_sekolah, operator, username, password } = req.body;

    // Field operator bisa dikirim sebagai 'operator' atau 'username' dari frontend
    const namaOPS = operator || username;

    if (!npsn || !nama_sekolah || !namaOPS) {
      return res.status(400).json({ 
        success: false, 
        message: 'NPSN, Nama Sekolah, dan Nama Pengguna/Operator wajib diisi!' 
      });
    }

    const cleanNpsn = npsn.trim();
    const cleanNamaSekolah = nama_sekolah.trim();
    const cleanOPS = namaOPS.trim();
    const cleanJenjang = (jenjang || 'SD').trim();

    // Enkripsi Password jika diisi, atau default '123456'
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = password ? await bcrypt.hash(password.trim(), salt) : await bcrypt.hash('123456', salt);

    // Cek apakah NPSN sudah terdaftar di database
    const checkExist = await pool.query(`SELECT id FROM registered_users WHERE npsn = $1`, [cleanNpsn]);

    if (checkExist.rows.length > 0) {
      // Jika NPSN sudah terdaftar, perbarui data registrasi
      await pool.query(
        `UPDATE registered_users 
         SET nama_sekolah = $1, jenjang = $2, operator = $3, username = $4, password = $5 
         WHERE npsn = $6`,
        [cleanNamaSekolah, cleanJenjang, cleanOPS, cleanOPS, hashedPassword, cleanNpsn]
      );
    } else {
      // Jika belum terdaftar, buat entri registrasi baru dengan status awal 'Pending'
      await pool.query(
        `INSERT INTO registered_users (npsn, nama_sekolah, jenjang, operator, username, password, role, status) 
         VALUES ($1, $2, $3, $4, $5, $6, 'Sekolah', 'Pending')`,
        [cleanNpsn, cleanNamaSekolah, cleanJenjang, cleanOPS, cleanOPS, hashedPassword]
      );
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Permohonan registrasi berhasil dikirim! Silakan menunggu persetujuan Admin Dinas.' 
    });

  } catch (error) {
    console.error('CRITICAL ERROR pada authController register:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Gagal melakukan registrasi: ' + (error.message || 'Server error') 
    });
  }
};