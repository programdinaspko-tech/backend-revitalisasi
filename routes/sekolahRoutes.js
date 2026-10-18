const express = require('express');
const router = express.Router();
const sekolahController = require('../controllers/sekolahController');
const verifyToken = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Semua route di bawah dilindungi oleh JWT Middleware
router.get('/all', verifyToken, sekolahController.getAllSekolah);
router.get('/:id', verifyToken, sekolahController.getSekolahById);
router.post('/', verifyToken, sekolahController.createSekolah);
router.put('/:id', verifyToken, sekolahController.updateSekolah);
router.delete('/:id', verifyToken, sekolahController.deleteSekolah);

// 1. ENDPOINT KHUSUS UPLOAD FILE MANDIRI (Untuk modal Tanah, Bangunan, Ruang)
router.post('/upload', verifyToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah' });
    }
    // Menghasilkan URL publik file
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({
      success: true,
      fileUrl: fileUrl,
      fileName: req.file.originalname
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. ENDPOINT SINKRONISASI DATA + MULTI FILE UPLOAD
router.post('/sinkronisasi', verifyToken, upload.fields([
  { name: 'pdf_sertifikat', maxCount: 1 },
  { name: 'denah', maxCount: 1 },
  { name: 'foto_gps_1', maxCount: 1 },
  { name: 'foto_gps_2', maxCount: 1 },
  { name: 'foto_gps_3', maxCount: 1 },
  { name: 'foto_gps_4', maxCount: 1 },
  { name: 'foto_gps_5', maxCount: 1 },
  { name: 'foto_gps_6', maxCount: 1 }
]), sekolahController.sinkronisasiData);

module.exports = router;