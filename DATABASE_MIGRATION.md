# Database Migration Guide

## Overview
Aplikasi Peta Rawan Narkoba kini menggunakan **SQLite** sebagai database untuk menyimpan data dengan aman dan terstruktur.

## Perubahan Utama

### 1. **Database SQLite (better-sqlite3)**
- File database: `data/peta-narkoba.db`
- Synchronous API untuk performa optimal
- Automatic migration dari JSON ke database
- Persistent storage untuk Railway deployment

### 2. **Struktur Data Baru**

#### Tabel `points`:
```sql
CREATE TABLE points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,              -- Nama lokasi (misal: "Kelurahan Tanjung Pinang Timur")
  lat REAL NOT NULL,               -- Latitude
  lng REAL NOT NULL,               -- Longitude
  category TEXT NOT NULL,          -- Kategori: 'rendah', 'sedang', 'tinggi'
  description TEXT,                -- Deskripsi detail (optional)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### Tabel `banner`:
```sql
CREATE TABLE banner (
  id INTEGER PRIMARY KEY CHECK(id = 1),  -- Always 1 (singleton)
  image_data TEXT,                        -- Base64 data URL
  caption TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### Tabel `logo`:
```sql
CREATE TABLE logo (
  id INTEGER PRIMARY KEY CHECK(id = 1),   -- Always 1 (singleton)
  image_data TEXT,                         -- Base64 data URL
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### 3. **Perubahan dari Sistem Lama**

| Sistem Lama (JSON) | Sistem Baru (SQLite) |
|--------------------|---------------------|
| `kelurahan` field | `name` field (nama lokasi) |
| `note` field | `description` field |
| Tidak ada kategori | `category` field (rendah/sedang/tinggi) |
| Warna per kelurahan | Warna per kategori risiko |
| File-based (points.json) | Database (peta-narkoba.db) |

### 4. **Kategori Kerawanan**

Aplikasi sekarang menggunakan **3 tingkat kerawanan**:

| Kategori | Warna | Emoji | Deskripsi |
|----------|-------|-------|-----------|
| `rendah` | 🟢 Hijau (#4CAF50) | 🟢 | Tingkat Rendah |
| `sedang` | 🟡 Kuning (#FFC107) | 🟡 | Tingkat Sedang |
| `tinggi` | 🔴 Merah (#F44336) | 🔴 | Tingkat Tinggi |

## Migration Otomatis

Saat server pertama kali dijalankan, `database.js` akan:

1. ✅ Membuat file database `data/peta-narkoba.db`
2. ✅ Membuat tabel `points`, `banner`, dan `logo`
3. ✅ Migrasi data dari `data/points.json` (jika ada)
4. ✅ Migrasi banner dari `data/banner.json` (jika ada)
5. ✅ Konversi otomatis:
   - `kelurahan` atau `note` → `name`
   - `note` → `description`
   - Default `category` = 'sedang'

## API Endpoints (Updated)

### Points API

**GET /api/points**
- Returns: Array of all points with new structure
```json
[
  {
    "id": 1,
    "name": "Kelurahan Tanjung Pinang Timur",
    "lat": 0.9167,
    "lng": 104.4510,
    "category": "tinggi",
    "description": "Area dengan tingkat kerawanan tinggi",
    "created_at": "2025-12-04T16:30:00.000Z",
    "updated_at": "2025-12-04T16:30:00.000Z"
  }
]
```

**POST /api/points** (Admin only)
- Required fields: `name`, `lat`, `lng`, `category`
- Optional: `description`
```json
{
  "name": "Lokasi Baru",
  "lat": 0.9200,
  "lng": 104.4600,
  "category": "sedang",
  "description": "Deskripsi lokasi"
}
```

**DELETE /api/points/:id** (Admin only)
- Deletes point by ID

**PATCH /api/points/:id** (Admin only)
- Update point fields (name, lat, lng, category, description)

### Banner API

**GET /api/banner**
- Returns: `{ url: "data:image/...", caption: "..." }`

**POST /api/banner** (Admin only)
- Required: `data` (base64 data URL)
- Optional: `caption`

## Admin Panel Changes

### Form Input Baru:
- ✅ **Nama Lokasi** - wajib diisi
- ✅ **Kategori Rawan** - dropdown (Rendah/Sedang/Tinggi)
- ✅ **Deskripsi** - textarea untuk detail

### Form Dihapus:
- ❌ Kelurahan dropdown (tidak digunakan lagi)

### Points List Display:
- Menampilkan: Nama, Kategori (dengan emoji), Koordinat, Deskripsi, Tanggal
- Tombol: Hapus only (tidak ada edit kelurahan)

## Public Map Changes

### Legend Baru:
- **Tingkat Kerawanan** (bukan per kelurahan)
- 🟢 Tingkat Rendah
- 🟡 Tingkat Sedang
- 🔴 Tingkat Tinggi
- Counter per kategori

### Marker Popup:
- Nama lokasi
- Tingkat kerawanan (dengan emoji dan label)
- Koordinat
- Deskripsi (jika ada)
- Timestamp

## Deployment Notes

### Railway.app:
- Database file `data/peta-narkoba.db` akan di-deploy bersama aplikasi
- Setiap perubahan data tersimpan permanen di database
- Tidak ada lagi dependency pada JSON files
- Backup database dapat dilakukan dengan copy file `.db`

### Environment Variables:
Tidak ada perubahan - masih menggunakan:
- `ADMIN_USER` (default: admin)
- `ADMIN_PASS` (default: password)
- `PORT` (default: 3000)
- `HOST` (default: 0.0.0.0)

## Backup & Recovery

### Backup Database:
```bash
# Copy database file
cp data/peta-narkoba.db data/backup/peta-narkoba-$(date +%Y%m%d).db
```

### Restore Database:
```bash
# Restore from backup
cp data/backup/peta-narkoba-20251204.db data/peta-narkoba.db
```

### Export to JSON (for compatibility):
```javascript
// In Node.js REPL or script:
const db = require('./database');
const points = db.getAllPoints();
const fs = require('fs');
fs.writeFileSync('export-points.json', JSON.stringify(points, null, 2));
```

## Testing

### Local Testing:
```bash
# Install dependencies
npm install

# Start server
npm start

# Access:
# - Public map: http://localhost:3000
# - Admin panel: http://localhost:3000/admin
```

### Verify Database:
```bash
# Check database file exists
ls -lh data/peta-narkoba.db

# Query database (requires sqlite3 CLI):
sqlite3 data/peta-narkoba.db "SELECT COUNT(*) FROM points;"
sqlite3 data/peta-narkoba.db "SELECT * FROM points LIMIT 5;"
```

## Troubleshooting

### Problem: "better-sqlite3" install failed
**Solution**: Pastikan sudah install build tools:
```bash
# Windows
npm install --global windows-build-tools

# Or install better-sqlite3 dengan rebuild
npm rebuild better-sqlite3
```

### Problem: Database locked
**Solution**: Hanya satu proses boleh akses database. Stop duplikat server.

### Problem: Migration failed
**Solution**: Hapus database dan restart:
```bash
rm data/peta-narkoba.db
npm start
```

### Problem: Old data tidak muncul
**Solution**: Cek file `data/points.json` ada dan valid JSON. Migration otomatis hanya jalan jika database kosong.

## Benefits

✅ **Data Security**: Database lebih aman dari file JSON  
✅ **Data Integrity**: Constraint validation (NOT NULL, CHECK)  
✅ **Performance**: Index otomatis pada PRIMARY KEY  
✅ **Atomicity**: Transaction support untuk bulk operations  
✅ **Simplicity**: Tidak perlu setup PostgreSQL/MySQL  
✅ **Portability**: Single file database, mudah backup  
✅ **Railway Compatible**: Persistent storage di Railway  

## Future Improvements

- [ ] Add database backup scheduler
- [ ] Implement soft delete (deleted_at field)
- [ ] Add user authentication table
- [ ] Add activity log table
- [ ] Implement full-text search
- [ ] Add database migration versioning

---

**Last Updated**: December 4, 2025  
**Version**: 2.0.0 (Database Migration)
