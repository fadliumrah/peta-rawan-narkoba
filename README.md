# 🗺️ Peta Rawan Narkoba - BNN Kota Tanjungpinang

Aplikasi web interaktif untuk visualisasi dan manajemen data area rawan narkoba di Kota Tanjungpinang menggunakan Leaflet (OpenStreetMap) dan Express.js.

## ✨ Fitur Utama

### Halaman Publik
- 🗺️ Peta interaktif dengan CartoDB Voyager basemap (warna hijau natural)
- 📍 Marker point berdasarkan kelurahan dengan color coding
- 📊 Legenda kelurahan dengan statistik jumlah point
- 🖼️ Banner informasi yang dapat diupdate admin
- 📱 Responsive design untuk mobile dan desktop

### Admin Panel (Protected)
- 🔐 Basic HTTP Authentication
- ➕ Tambah/edit/hapus point lokasi rawan
- 📍 **GPS Geolocation** - ambil koordinat langsung dari perangkat
- 🗺️ Click map untuk tambah point
- 🖼️ Upload banner dengan drag & drop
- 🎨 Upload logo BNN custom
- 📝 Edit caption dan catatan
- ✅ Validasi kelurahan otomatis

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


Notes
- The app ships with a small sample `public/data/kelurahan.geojson`. Replace it with official Tanjungpinang kelurahan GeoJSON for production.
- There is no admin authentication in this scaffold — add auth before deploying publicly.
