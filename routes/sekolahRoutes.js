const express = require('express');
const router = express.Router();
const sekolahController = require('../controllers/sekolahController');
const verifyToken = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Semua route di bawah dilindungi oleh JWT Middleware
router.get('/', verifyToken, sekolahController.getAllSekolah);
router.get('/:id', verifyToken, sekolahController.getSekolahById);
router.post('/', verifyToken, sekolahController.createSekolah);
router.put('/:id', verifyToken, sekolahController.updateSekolah);
router.post('/sinkronisasi', verifyToken, sekolahController.sinkronisasiData);
router.delete('/:id', verifyToken, sekolahController.deleteSekolah);
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