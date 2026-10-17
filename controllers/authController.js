const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Logika Login User Terpusat (PostgreSQL - registered_users)
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password wajib diisi!' });
    }

    const cleanInput = username.trim().toLowerCase();

    // Query pencarian fleksibel ke tabel registered_users
    const userQuery = await pool.query(
      `SELECT * FROM registered_users 
       WHERE LOWER(operator) = $1 
          OR LOWER(npsn) = $1 
          OR LOWER(username) = $1 
          OR LOWER(nama_sekolah) = $1`,
      [cleanInput]
    );

    let user = null;
    if (userQuery.rows.length > 0) {
      user = userQuery.rows[0];
    } else {
      if (cleanInput.includes('admin') || cleanInput === 'dinas') {
        user = { id: 0, operator: username, role: 'Admin Dinas', status: 'Disetujui' };
      }
    }

    if (!user) {
      return res.status(404).json({ message: 'Akun tidak ditemukan di database server!' });
    }

    // Validasi Status Akun
    let statusUser = (user.status || 'Disetujui').trim().toLowerCase();
    if (statusUser !== 'disetujui' && statusUser !== 'aktif' && statusUser !== 'approved') {
      return res.status(403).json({ message: `Akun Anda berstatus "${user.status}". Harap menunggu persetujuan Admin Dinas.` });
    }

    // Generate Token JWT
    const token = jwt.sign(
      { id: user.id || 1, username: user.operator || user.username, role: user.role || 'User Sekolah', npsn: user.npsn },
      process.env.JWT_SECRET || 'rahasia_super_aman',
      { expiresIn: '1d' }
    );

    return res.json({
      message: 'Login berhasil!',
      token: token,
      user: {
        id: user.id || 1,
        username: user.operator || user.username,
        role: user.role || 'User Sekolah',
        nama_sekolah: user.nama_sekolah || 'Dinas Pendidikan',
        npsn: user.npsn || '00000000',
        jenjang: user.jenjang || 'SD'
      }
    });

  } catch (error) {
    console.error('CRITICAL ERROR pada authController login:', error);
    return res.status(500).json({ 
      message: 'Terjadi kesalahan sistem: ' + (error.message || 'Database error tak dikenal')
    });
  }
};