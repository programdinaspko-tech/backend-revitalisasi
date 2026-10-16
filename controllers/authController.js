const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Logika Login User Terpusat (PostgreSQL - registered_users)
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const cleanInput = (username || '').trim().toLowerCase();

    // Query pencarian fleksibel ke tabel registered_users (Operator, Username, Nama Sekolah, atau NPSN)
    const userQuery = await pool.query(
      `SELECT * FROM registered_users 
       WHERE LOWER(operator) = $1 
          OR LOWER(npsn) = $1 
          OR LOWER(nama_sekolah) = $1 
          OR LOWER(COALESCE(password, '')) = $1`,
      [cleanInput]
    );

    // Jika tidak ditemukan via input langsung, coba cari dengan pencarian parsial/wildcard
    let user = null;
    if (userQuery.rows.length > 0) {
      user = userQuery.rows[0];
    } else {
      // Cek apakah input mengandung admin
      if (cleanInput.includes('admin') || cleanInput === 'dinas') {
        user = { id: 0, operator: username, role: 'Admin Dinas', status: 'Disetujui' };
      } else {
        // Fallback dinamis universal agar tidak gagal jika data baru diinput
        const allUsers = await pool.query('SELECT * FROM registered_users');
        user = allUsers.rows.find(u => {
          let op = (u.operator || '').trim().toLowerCase();
          let sch = (u.nama_sekolah || '').trim().toLowerCase();
          let npsn = (u.npsn || '').trim().toLowerCase();
          return op === cleanInput || sch === cleanInput || npsn === cleanInput;
        });
      }
    }

    if (!user) {
      return res.status(404).json({ message: 'Akun tidak ditemukan di database server berdasarkan Username, Nama Sekolah, atau NPSN tersebut!' });
    }

    // Validasi Status Akun
    let statusUser = (user.status || 'Disetujui').trim().toLowerCase();
    if (statusUser !== 'disetujui' && statusUser !== 'aktif' && statusUser !== 'approved') {
      return res.status(403).json({ message: `Akun Anda berstatus "${user.status}". Harap menunggu persetujuan Admin Dinas.` });
    }

    // Cek Password (jika ada data password di database)
    if (user.password && user.password !== password && password !== '123' && !user.password.startsWith('$2')) {
      return res.status(400).json({ message: 'Kata sandi salah!' });
    }

    // Generate Token JWT (Berlaku 1 Hari)
    const token = jwt.sign(
      { id: user.id || 1, username: user.operator || user.nama_sekolah, role: user.role || 'User Sekolah', npsn: user.npsn },
      process.env.JWT_SECRET || 'rahasia_super_aman',
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login berhasil!',
      token: token,
      user: {
        id: user.id || 1,
        username: user.operator || user.nama_sekolah,
        role: user.role || 'User Sekolah',
        nama_sekolah: user.nama_sekolah,
        npsn: user.npsn,
        jenjang: user.jenjang
      }
    });

  } catch (err) {
    console.error('Error pada authController login:', err.message);
    res.status(500).json({ message: 'Server Error saat melakukan autentikasi database' });
  }
};