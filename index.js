const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const sekolahRoutes = require('./routes/sekolahRoutes');
const sekolahUserRoutes = require('./routes/sekolah_user');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // <-- Ditambahkan untuk menangani data form/multipart dengan baik

// Melayani file statis frontend (HTML, CSS, JS) dari folder 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Melayani folder uploads secara publik agar foto/dokumen bisa diakses frontend
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // <-- [TAMBAHAN BARU]

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/sekolah', sekolahRoutes);
app.use('/api/sekolah-user', sekolahUserRoutes);

// Route Fallback ke Halaman Login
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
  console.log(`Server Express & Frontend berjalan profesional di port ${PORT}`);
});