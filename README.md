# 🗺️ Peta Rawan Narkoba - BNN Kota Tanjungpinang

Aplikasi web interaktif untuk visualisasi dan manajemen data area rawan narkoba di Kota Tanjungpinang menggunakan Leaflet (OpenStreetMap) dan Express.js.

## ✨ Fitur Utama

### Halaman Publik
- 🗺️ Peta interaktif dengan CartoDB Voyager basemap (warna hijau natural)
- 📍 Marker point dengan **3 tingkat kerawanan** (Rendah 🟢 / Sedang 🟡 / Tinggi 🔴)
- 📊 Legenda tingkat kerawanan dengan statistik real-time
- 🖼️ Banner informasi yang dapat diupdate admin
- 📱 Responsive design untuk mobile dan desktop

### Admin Panel (Protected)
- 🔐 Basic HTTP Authentication
- ➕ Tambah/hapus point lokasi rawan dengan kategori risiko
- 📍 **GPS Geolocation** - ambil koordinat langsung dari perangkat
- 🗺️ Click map untuk tambah point
- 🖼️ Upload banner dengan drag & drop
- 🎨 Upload logo BNN custom
- 📝 Input nama lokasi, kategori, dan deskripsi detail
- 💾 **SQLite Database** - data tersimpan aman dan permanen

Quick start (Windows PowerShell)
1. Install dependencies:
```
npm install
```
2. Start server:
```
npm start
```
3. Open pages:
- User: `http://localhost:3000/index.html`

Admin access
- The admin page `http://localhost:3000/admin.html` is protected with HTTP Basic Auth.
- Default credentials (change before deploying):
	- username: `admin`
	- password: `password`
- To change credentials, set environment variables before starting the server (PowerShell):
```
$env:ADMIN_USER = 'youruser'; $env:ADMIN_PASS = 'yourpass'; npm start
```
- When you open `admin.html` the browser will prompt for username/password.


## 💾 Database

Aplikasi menggunakan **SQLite** (better-sqlite3) untuk storage:
- Database file: `data/peta-narkoba.db`
- Auto-migration dari JSON files (jika ada)
- 3 tabel: `points`, `banner`, `logo`
- Lihat detail di [DATABASE_MIGRATION.md](DATABASE_MIGRATION.md)

## 📊 Data Structure

**Points** (Lokasi Rawan):
- `name` - Nama lokasi
- `lat`, `lng` - Koordinat GPS
- `category` - Kategori: 'rendah', 'sedang', 'tinggi'
- `description` - Deskripsi detail (optional)

**Kategori Kerawanan**:
- 🟢 **Rendah** - Hijau (#4CAF50)
- 🟡 **Sedang** - Kuning (#FFC107)
- 🔴 **Tinggi** - Merah (#F44336)

## 📝 Notes
- Change admin credentials sebelum deploy (gunakan environment variables)
- Database di-backup otomatis saat push ke Railway
- Kelurahan boundaries sudah dihapus, fokus pada category-based risk levels
