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

## 🔒 Security Features

Aplikasi ini dilengkapi dengan fitur keamanan tingkat production:
- ✅ **Helmet.js** - HTTP security headers (XSS, Clickjacking protection)
- ✅ **Rate Limiting** - Perlindungan DDoS dan brute force
- ✅ **Input Validation** - Validasi dan sanitasi semua input user
- ✅ **SQL Injection Protection** - Prepared statements untuk query database
- ✅ **CORS Configuration** - Kontrol akses cross-origin
- ✅ **Error Handling** - Penanganan error terpusat
- ✅ **Compression** - Optimasi performa dengan response compression
- ✅ **Security Linting** - ESLint dengan security plugin

Lihat detail lengkap di [SECURITY.md](SECURITY.md)

## 🧪 Testing

### Unit Testing
Jalankan unit tests untuk database dan API:
```bash
npm test
```

Jalankan dengan coverage report:
```bash
npm run test:unit
```

### UI Testing
Jalankan UI tests dengan Playwright:
```bash
# Install Playwright browsers (pertama kali)
npm run playwright:install

# Run UI tests
npm run test:ui

# Run dengan browser visible
npm run test:ui:headed

# Debug mode
npm run test:ui:debug
```

### Security Linting
Jalankan security linting:
```bash
npm run lint

# Auto-fix issues
npm run lint:fix
```

### Check Vulnerabilities
```bash
npm audit
```

## 🚀 Development

### Development Mode
Jalankan dengan auto-reload:
```bash
npm run dev
```

### Environment Variables
Copy `.env.example` ke `.env` dan sesuaikan:
```bash
cp .env.example .env
```

Environment variables yang tersedia:
- `PORT` - Port server (default: 3000)
- `HOST` - Host address (default: 0.0.0.0)
- `NODE_ENV` - Environment (development/production)
- `ADMIN_USER` - Username admin
- `ADMIN_PASS` - Password admin
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)
- `GOOGLE_MAPS_API_KEY` - Optional Google Maps API key

## 📋 Code Quality

### Code Optimization
- ✅ Middleware modular (security, validation, error handling)
- ✅ Database query optimization dengan indices
- ✅ Response caching untuk static assets
- ✅ Compression untuk mengurangi bandwidth
- ✅ Centralized error handling
- ✅ Graceful shutdown handling
- ✅ Clean code structure dan separation of concerns

### Performance
- Database indices untuk query optimization
- Compression middleware untuk response size reduction
- Static file caching dengan appropriate headers
- Efficient database prepared statements

## 📝 Notes
- **PENTING**: Change admin credentials sebelum deploy production!
- Database di-backup otomatis saat push ke Railway
- Kelurahan boundaries sudah dihapus, fokus pada category-based risk levels
- Gunakan HTTPS di production
- Review security best practices di [SECURITY.md](SECURITY.md)
