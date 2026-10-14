const multer = require('multer');
const path = require('path');

// Pengaturan penyimpanan fisik ke folder uploads/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Menyimpan ke folder uploads di root backend
  },
  filename: (req, file, cb) => {
    // Membuat nama file uniks agar tidak bentrok (contoh: timestamp-namaasli.ext)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Batas maksimal ukuran file 5 MB
});

module.exports = upload;