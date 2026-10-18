const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Logika Login User Terpusat yang Fleksibel & Aman
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password wajib diisi!' });
    }

    const cleanInput = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Jika login menggunakan akun khusus admin dinas
    if (cleanInput === 'admin_dinas' || cleanInput.includes('admin')) {
      const adminQuery = await pool.query(
        `SELECT * FROM registered_users WHERE LOWER(username) = 'admin_dinas' OR LOWER(npsn) = '00000000' LIMIT 1`
      );
      
      if (adminQuery.rows.length > 0) {
        const user = adminQuery.rows[0];
        
        // Validasi Password untuk Admin Dinas (Mendukung password terenkripsi maupun teks biasa)
        let isPasswordValid = false;
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
          isPasswordValid = await bcrypt.compare(cleanPassword, user.password);
        } else {
          isPasswordValid = (cleanPassword === user.password);
        }

        if (!isPasswordValid) {
          return res.status(401).json({ message: 'Password Admin Dinas salah!' });
        }

        const token = jwt.sign(
          { id: user.id, username: user.username || 'admin_dinas', role: user.role || 'Admin', npsn: user.npsn }, 
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
          OR LOWER(username) = $1 
          OR LOWER(nama_sekolah) LIKE $2`,
      [cleanInput, `%${cleanInput}%`]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Akun tidak ditemukan di database server!' });
    }

    const user = userQuery.rows[0];

    // Validasi Password Sekolah
    let isPasswordValid = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isPasswordValid = await bcrypt.compare(cleanPassword, user.password);
    } else {
      isPasswordValid = (cleanPassword === user.password);
    }

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Kata sandi / password salah!' });
    }

    // Validasi Status Akun Sekolah
    let statusUser = (user.status || 'Pending').trim().toLowerCase();
    if (statusUser !== 'disetujui' && statusUser !== 'aktif' && statusUser !== 'approved') {
      return res.status(403).json({ message: `Akun Anda berstatus "${user.status || 'Pending'}". Harap menunggu persetujuan Admin Dinas.` });
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

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    // Cek apakah NPSN sudah terdaftar
    const checkExist = await pool.query(`SELECT id FROM registered_users WHERE npsn = $1`, [cleanNpsn]);

    if (checkExist.rows.length > 0) {
      await pool.query(
        `UPDATE registered_users 
         SET nama_sekolah = $1, jenjang = $2, operator = $3, password = $4 
         WHERE npsn = $5`,
        [cleanNamaSekolah, cleanJenjang, namaOPS, hashedPassword, cleanNpsn]
      );
    } else {
      await pool.query(
        `INSERT INTO registered_users (npsn, nama_sekolah, jenjang, operator, password, role, status) 
         VALUES ($1, $2, $3, $4, $5, 'Sekolah', 'Pending')`,
        [cleanNpsn, cleanNamaSekolah, cleanJenjang, namaOPS, hashedPassword]
      );
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Permohonan registrasi berhasil dikirim!' 
    });

  } catch (error) {
    // CETAK DETAIL ERROR ASLI KE KONSOL RAILWAY
    console.error('DETAIL ERROR REGISTER SQL:', error.message);
    console.error('DETAIL LENGKAP:', error);
    
    return res.status(500).json({ 
      success: false, 
      message: 'Gagal melakukan registrasi: ' + error.message 
    });
  }
};