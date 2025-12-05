# Cara Setup Railway Volume untuk Persistent Database

Banner hilang setiap redeploy karena Railway menggunakan ephemeral filesystem. Ikuti langkah ini:

## Setup Railway Volume (PENTING!)

1. **Login ke Railway Dashboard**
   - Buka https://railway.app
   - Pilih project: `peta-rawan-narkoba`

2. **Buat Volume Baru**
   - Klik service/deployment Anda
   - Pilih tab **"Settings"**
   - Scroll ke bagian **"Volumes"** atau **"Storage"**
   - Klik **"New Volume"** atau **"+ Add Volume"**

3. **Konfigurasi Volume**
   ```
   Mount Path: /app/data
   ```
   - Klik **"Add"** atau **"Create"**

4. **Redeploy Otomatis**
   - Railway akan otomatis redeploy setelah volume ditambahkan
   - Tunggu build selesai (~2-3 menit)

5. **Upload Banner Baru**
   - Setelah deploy selesai, buka admin panel
   - Upload banner baru
   - Banner sekarang akan persist selamanya!

## Verifikasi Berhasil

1. Upload banner di admin panel
2. Tunggu berhasil tersimpan
3. Push code update apa saja ke GitHub (trigger redeploy)
4. Cek homepage - banner masih ada! ✅

## Catatan Penting

- Volume Railway adalah persistent storage
- Data tidak akan hilang saat redeploy
- File `data/peta-narkoba.db` tersimpan permanen
- Semua upload banner & points akan tetap ada

---

**File `start-railway.sh` sudah dibuat untuk memastikan folder `/app/data` ada dengan permission yang benar.**
