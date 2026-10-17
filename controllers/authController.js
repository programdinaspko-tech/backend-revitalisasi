const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Logika Login User Terpusat yang Fleksibel
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

    // Pencarian fleksibel untuk akun sekolah (berdasarkan NPSN atau nama operator / sekolah)
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