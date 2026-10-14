const pool = require('../config/db');

// Get All Sekolah (Bisa diakses Dinas/Verifikator)
exports.getAllSekolah = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, u.username, u.email 
      FROM sekolah s 
      JOIN users u ON s.user_id = u.id 
      ORDER BY s.nama_sekolah ASC
    `);
    res.json({
      status: 'success',
      total: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error saat mengambil data sekolah' });
  }
};

// Get Detail Sekolah by ID
exports.getSekolahById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM sekolah WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Data sekolah tidak ditemukan' });
    }
    res.json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error saat mengambil detail sekolah' });
  }
};

// Tambah Data Sekolah Baru
exports.createSekolah = async (req, res) => {
  const { user_id, npsn, nama_sekolah, jenjang, status_sekolah, sk_pendirian, akreditasi, jenis_listrik, jenis_internet, nama_kepala_sekolah, nip_kepala_sekolah } = req.body;

  try {
    const newSekolah = await pool.query(
      `INSERT INTO sekolah 
      (user_id, npsn, nama_sekolah, jenjang, status_sekolah, sk_pendirian, akreditasi, jenis_listrik, jenis_internet, nama_kepala_sekolah, nip_kepala_sekolah) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [user_id, npsn, nama_sekolah, jenjang, status_sekolah, sk_pendirian, akreditasi, jenis_listrik, jenis_internet, nama_kepala_sekolah, nip_kepala_sekolah]
    );

    res.status(201).json({
      message: 'Data sekolah berhasil ditambahkan',
      data: newSekolah.rows[0]
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error saat menambah data sekolah' });
  }
};
// Delete Sekolah
exports.deleteSekolah = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM sekolah WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Data sekolah tidak ditemukan' });
    }
    res.json({ message: 'Data sekolah berhasil dihapus' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error saat menghapus data sekolah' });
  }
};
// Update / Simpan Profil Lengkap Sekolah
exports.updateSekolah = async (req, res) => {
  const { id } = req.params;
  const { 
    nama_sekolah, npsn, jenjang, status_sekolah, akreditasi, 
    sk_pendirian, tgl_sk_pendirian, alamat, kecamatan, kode_pos, 
    kabupaten, provinsi, nama_kepala_sekolah, nip_kepala_sekolah, 
    operator, wa_operator, nama_bank, no_rekening, pemilik_rekening, 
    daya_listrik, akses_internet, sumber_air, latitude, longitude 
  } = req.body;

  try {
    const updated = await pool.query(
      `UPDATE sekolah SET 
        nama_sekolah = $1, npsn = $2, jenjang = $3, status_sekolah = $4, akreditasi = $5,
        sk_pendirian = $6, tgl_sk_pendirian = $7, alamat = $8, kecamatan = $9, kode_pos = $10,
        kabupaten = $11, provinsi = $12, nama_kepala_sekolah = $13, nip_kepala_sekolah = $14,
        operator = $15, wa_operator = $16, nama_bank = $17, no_rekening = $18, pemilik_rekening = $19,
        daya_listrik = $20, akses_internet = $21, sumber_air = $22, latitude = $23, longitude = $24,
        updated_at = NOW()
       WHERE id = $25 RETURNING *`,
      [
        nama_sekolah, npsn, jenjang, status_sekolah, akreditasi, 
        sk_pendirian, tgl_sk_pendirian, alamat, kecamatan, kode_pos, 
        kabupaten, provinsi, nama_kepala_sekolah, nip_kepala_sekolah, 
        operator, wa_operator, nama_bank, no_rekening, pemilik_rekening, 
        daya_listrik, akses_internet, sumber_air, latitude, longitude, id
      ]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ message: 'Data sekolah tidak ditemukan untuk diperbarui' });
    }

    res.json({
      status: 'success',
      message: 'Profil sekolah berhasil diperbarui',
      data: updated.rows[0]
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error saat memperbarui profil sekolah' });
  }
};

// Endpoint Sinkronisasi Menyeluruh (Tanah, Bangunan, Ruang, Alat, GTK, Siswa, Rombel)
exports.sinkronisasiData = async (req, res) => {
  const { school_id, tanah, bangunan, ruang, alat, gtk, siswa, rombel } = req.body;

  try {
    // Anda dapat memproses transaksi database (BEGIN, INSERT/UPDATE data sarpras secara massal, COMMIT) di sini
    // Contoh respons sukses sinkronisasi:
    res.status(200).json({
      status: 'success',
      message: 'Sinkronisasi data pokok dan sarpras sekolah berhasil disimpan ke server dinas!',
      waktu_sinkron: new Date().toISOString()
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Gagal melakukan sinkronisasi data sarpras' });
  }
};