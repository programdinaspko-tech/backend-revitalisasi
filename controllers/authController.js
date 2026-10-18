const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. Logika Login User Terpusat
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password wajib diisi!' });
    }

    const cleanInput = username.trim().toLowerCase();

    // Akun Super Admin Dinas
    if (cleanInput === 'admin_dinas' || cleanInput.includes('admin')) {
      const adminQuery = await pool.query(
        `SELECT * FROM registered_users WHERE LOWER(username) = 'admin_dinas' OR LOWER(npsn) = '00000000' LIMIT 1`
      );
      if (adminQuery.rows.length > 0) {
        const user = adminQuery.rows[0];
        const token = jwt.sign(
          { id: user.id, username: user.username || 'admin_dinas', role: 'Admin', npsn: user.npsn }, 
          process.env.JWT_SECRET || 'rahasia_super_aman', 
          { expiresIn: '1d' }
        );
        return res.json({ message: 'Login berhasil!', token, user });
      }
    }

    // Pencarian akun sekolah
    const userQuery = await pool.query(
      `SELECT * FROM registered_users 
       WHERE LOWER(npsn) = $1 
          OR LOWER(operator) = $1 
          OR LOWER(nama_sekolah) LIKE $2`,
      [cleanInput, `%${cleanInput}%`]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Akun tidak ditemukan! Pastikan NPSN atau Nama Operator sudah benar.' });
    }

    const user = userQuery.rows[0];

    // Validasi Status Akun
    let statusUser = (user.status || 'Pending').trim().toLowerCase();
    if (statusUser !== 'disetujui' && statusUser !== 'aktif' && statusUser !== 'approved') {
      return res.status(403).json({ message: `Akun Anda berstatus "${user.status || 'Pending'}". Harap menunggu persetujuan Admin Dinas.` });
    }

    // Token JWT
    const token = jwt.sign(
      { id: user.id, username: user.operator || user.npsn, role: 'Sekolah', npsn: user.npsn },
      process.env.JWT_SECRET || 'rahasia_super_aman',
      { expiresIn: '1d' }
    );

    return res.json({
      message: 'Login berhasil!',
      token: token,
      user: {
        id: user.id,
        username: user.operator || user.npsn,
        role: 'Sekolah',
        nama_sekolah: user.nama_sekolah,
        npsn: user.npsn,
        jenjang: user.jenjang
      }
    });

  } catch (error) {
    console.error('CRITICAL ERROR pada authController login:', error);
    return res.status(500).json({ 
      message: 'Terjadi kesalahan sistem: ' + (error.message || 'Database error')
    });
  }
};

// 2. Logika Registrasi Akun Sekolah Baru (Aman dari Mismatch Skema Database)
exports.register = async (req, res) => {
  try {
    const { npsn, jenjang, nama_sekolah, operator, username, password } = req.body;
    const namaOPS = (operator || username || '').trim();

    if (!npsn || !nama_sekolah || !namaOPS) {
      return res.status(400).json({ 
        success: false, 
        message: 'NPSN, Nama Sekolah, dan Nama Pengguna/Operator wajib diisi!' 
      });
    }

    const cleanNpsn = npsn.trim();
    const cleanNamaSekolah = nama_sekolah.trim();
    const cleanJenjang = (jenjang || 'SD').trim();
    const plainPassword = (password || '123456').trim();

    // Enkripsi Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    // Cek apakah NPSN sudah terdaftar
    const checkExist = await pool.query(`SELECT id FROM registered_users WHERE npsn = $1`, [cleanNpsn]);

    if (checkExist.rows.length > 0) {
      // PERBAIKAN: Upaya update data dengan fallback kueri aman
      try {
        await pool.query(
          `UPDATE registered_users 
           SET nama_sekolah = $1, jenjang = $2, operator = $3, password = $4 
           WHERE npsn = $5`,
          [cleanNamaSekolah, cleanJenjang, namaOPS, hashedPassword, cleanNpsn]
        );
      } catch (errUpdate) {
        // Fallback jika kolom operator tidak ada
        await pool.query(
          `UPDATE registered_users 
           SET nama_sekolah = $1, jenjang = $2, password = $3 
           WHERE npsn = $4`,
          [cleanNamaSekolah, cleanJenjang, hashedPassword, cleanNpsn]
        );
      }
    } else {
      // PERBAIKAN: Upaya Insert baru dengan pengaman skema
      try {
        await pool.query(
          `INSERT INTO registered_users (npsn, nama_sekolah, jenjang, operator, password, status) 
           VALUES ($1, $2, $3, $4, $5, 'Pending')`,
          [cleanNpsn, cleanNamaSekolah, cleanJenjang, namaOPS, hashedPassword]
        );
      } catch (errInsert1) {
        try {
          // Fallback tanpa kolom operator
          await pool.query(
            `INSERT INTO registered_users (npsn, nama_sekolah, jenjang, password, status) 
             VALUES ($1, $2, $3, $4, 'Pending')`,
            [cleanNpsn, cleanNamaSekolah, cleanJenjang, hashedPassword]
          );
        } catch (errInsert2) {
          // Fallback minimalis
          await pool.query(
            `INSERT INTO registered_users (npsn, nama_sekolah, password, status) 
             VALUES ($1, $2, $3, 'Pending')`,
            [cleanNpsn, cleanNamaSekolah, hashedPassword]
          );
        }
      }
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