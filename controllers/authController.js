const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Logika Login User
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const userQuery = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Username tidak ditemukan!' });
    }

    const user = userQuery.rows[0];

    // Cek password (bisa teks biasa untuk dummy lama atau terenkripsi bcrypt)
    let isMatch = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = (password === user.password); // Fallback data dummy
    }

    if (!isMatch) {
      return res.status(400).json({ message: 'Password salah!' });
    }

    // Generate Token JWT (Berlaku 1 Hari)
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'rahasia_super_aman',
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login berhasil!',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error saat login' });
  }
};