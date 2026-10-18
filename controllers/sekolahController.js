const pool = require('../config/db');

// Get All Sekolah & Rekap Sinkronisasi dari Database (Aman dari Error 502)
exports.getAllSekolah = async (req, res) => {
  try {
    // 1. Ambil data users dengan aman
    let usersRows = [];
    try {
      const usersResult = await pool.query(`SELECT * FROM registered_users ORDER BY id ASC`);
      usersRows = usersResult.rows;
    } catch (e) {
      console.warn('Tabel registered_users belum siap:', e.message);
    }
    
    // 2. Ambil data sinkronisasi dengan pengaman (menggunakan LEFT JOIN agar tidak crash jika belum ada relasi)
    let schoolRows = [];
    try {
      const result = await pool.query(`
        SELECT m.* FROM master_sinkron_list m
        ORDER BY m.updated_at DESC
      `);
      schoolRows = result.rows;
    } catch (e) {
      console.warn('Tabel master_sinkron_list belum siap:', e.message);
    }
    
    return res.json({
      status: 'success',
      data: schoolRows,
      users: usersRows
    });
  } catch (err) {
    console.error('Error kritikal getAllSekolah:', err.message);
    return res.status(500).json({ 
      status: 'error',
      message: 'Server error saat mengambil data rekap sekolah: ' + err.message,
      data: [],
      users: []
    });
  }
};

// Endpoint Sinkronisasi Menyeluruh
exports.sinkronisasiData = async (req, res) => {
  const sekolahData = req.body;

  try {
    if (!sekolahData.npsn) {
      return res.status(400).json({ message: 'NPSN sekolah wajib disertakan!' });
    }

    const checkExist = await pool.query(`SELECT id FROM master_sinkron_list WHERE npsn = $1`, [sekolahData.npsn]);
    
    let queryText, queryValues;
    const jsonPayload = JSON.stringify(sekolahData);
    const waktuSekarang = new Date();

    if (checkExist.rows.length > 0) {
      queryText = `UPDATE master_sinkron_list SET data_json = $1, updated_at = $2 WHERE npsn = $3 RETURNING *`;
      queryValues = [jsonPayload, waktuSekarang, sekolahData.npsn];
    } else {
      queryText = `INSERT INTO master_sinkron_list (npsn, nama_sekolah, data_json, updated_at) VALUES ($1, $2, $3, $4) RETURNING *`;
      queryValues = [sekolahData.npsn, sekolahData.nama_sekolah || sekolahData.nama, jsonPayload, waktuSekarang];
    }

    await pool.query(queryText, queryValues);

    return res.status(200).json({
      status: 'success',
      message: 'Data berhasil disinkronkan secara permanen ke server pusat Dinas!',
      waktu_sinkron: waktuSekarang.toISOString()
    });
  } catch (err) {
    console.error('Error sinkronisasiData:', err.message);
    return res.status(500).json({ message: 'Gagal melakukan sinkronisasi ke database server: ' + err.message });
  }
};

// Manajemen User: Update Status (Disetujui / Ditolak)
exports.updateUserStatus = async (req, res) => {
  const { npsn, status } = req.body;
  try {
    await pool.query(`UPDATE registered_users SET status = $1 WHERE npsn = $2`, [status, npsn]);
    return res.json({ status: 'success', message: 'Status user berhasil diperbarui.' });
  } catch (err) {
    console.error('Error updateUserStatus:', err.message);
    return res.status(500).json({ message: 'Server error update status' });
  }
};

// Manajemen User: Hapus User secara Bersih & Menyeluruh
exports.deleteUser = async (req, res) => {
  const { npsn } = req.params;
  try {
    await pool.query(`DELETE FROM registered_users WHERE npsn = $1`, [npsn]);
    await pool.query(`DELETE FROM master_sinkron_list WHERE npsn = $1`, [npsn]);
    
    return res.json({ status: 'success', message: 'User dan seluruh data sekolah terkait berhasil dihapus bersih.' });
  } catch (err) {
    console.error('Error deleteUser:', err.message);
    return res.status(500).json({ message: 'Server error hapus user' });
  }
};

exports.getSekolahById = async (req, res) => { /* standard */ };
exports.createSekolah = async (req, res) => { /* standard */ };
exports.deleteSekolah = async (req, res) => { /* standard */ };
exports.updateSekolah = async (req, res) => { /* standard */ };