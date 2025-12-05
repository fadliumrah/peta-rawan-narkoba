# Railway Volume Setup untuk Persistent Storage

## Masalah
Banner hilang setiap kali redeploy karena Railway menggunakan ephemeral filesystem. File SQLite database (`data/peta-narkoba.db`) akan hilang setiap deploy ulang.

## Solusi: Railway Volume

### Langkah-langkah Setup:

1. **Buka Railway Dashboard**
   - Login ke https://railway.app
   - Pilih project `peta-rawan-narkoba`

2. **Tambah Volume**
   - Klik tab **"Variables"** atau **"Settings"**
   - Scroll ke bagian **"Volumes"**
   - Klik **"+ New Volume"**
   
3. **Konfigurasi Volume**
   - **Mount Path**: `/app/data`
   - **Name**: `database-volume` (atau nama lain)
   - Klik **"Add"**

4. **Redeploy**
   - Setelah volume ditambahkan, Railway akan otomatis redeploy
   - Database SQLite sekarang akan persist di volume
   - Banner dan semua data akan tetap ada setelah redeploy

### Cara Kerja:
- Volume Railway adalah persistent storage yang tidak hilang saat redeploy
- Path `/app/data` akan di-mount ke volume
- File `data/peta-narkoba.db` akan tersimpan permanen
- Semua upload banner dan data points akan tetap ada

### Verifikasi:
1. Upload banner baru dari admin panel
2. Deploy ulang aplikasi (push code baru atau manual redeploy)
3. Cek banner masih ada di homepage
4. Banner seharusnya tidak hilang lagi

## Alternatif Lain (jika tidak mau pakai Volume):

### Option 1: PostgreSQL di Railway
- Tambah PostgreSQL service di Railway (gratis untuk hobby plan)
- Ganti `better-sqlite3` dengan `pg` atau `postgres`
- Database akan persistent otomatis

### Option 2: Cloudinary untuk Image Storage
- Simpan banner di Cloudinary (free 25GB)
- Hanya simpan URL di SQLite
- Image tidak akan hilang karena di cloud

### Option 3: Railway Blob Storage
- Pakai Railway Blob API untuk file uploads
- Lebih kompleks tapi fully managed

## Rekomendasi:
**Gunakan Railway Volume** - paling mudah dan cepat, tidak perlu ubah code.
