# Setup Railway Persistent Storage - Panduan Lengkap

## ⚠️ MASALAH: Banner Hilang Setelah Redeploy

Railway menggunakan **ephemeral filesystem** - semua file hilang saat redeploy.

---

## 🎯 SOLUSI 1: Setup Volume via Railway CLI (RECOMMENDED)

Jika tidak ada menu "Volumes" di dashboard, gunakan Railway CLI:

### Langkah-langkah:

1. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login ke Railway**
   ```bash
   railway login
   ```

3. **Link ke Project**
   ```bash
   railway link
   ```
   Pilih project: `peta-rawan-narkoba`

4. **Tambah Volume**
   ```bash
   railway volume create database-storage
   ```

5. **Mount Volume**
   ```bash
   railway volume mount database-storage /app/data
   ```

6. **Deploy Ulang**
   ```bash
   railway up
   ```

---

## 🎯 SOLUSI 2: Setup Volume via Railway Dashboard (New UI)

Jika menggunakan Railway dashboard terbaru:

1. Buka **Railway Dashboard** → https://railway.app
2. Pilih project **peta-rawan-narkoba**
3. Klik **service/deployment** Anda
4. Cari tab **"Data"** atau **"Storage"** (bukan Settings)
5. Klik **"+ Add Volume"** atau **"New Volume"**
6. Set **Mount Path**: `/app/data`
7. Save dan tunggu redeploy otomatis

---

## 🎯 SOLUSI 3: Railway Legacy Volume (Old Dashboard)

1. Buka **Settings** tab
2. Scroll ke bagian **"Environment"**
3. Tambahkan variable baru:
   ```
   Key: RAILWAY_VOLUME_MOUNT_PATH
   Value: /data
   ```
4. Di bagian **"Deployments"** atau **"Service"**, tambahkan volume mount

---

## 🎯 SOLUSI 4: Tanpa Volume (Backup Manual)

Jika semua cara di atas tidak berhasil, gunakan pendekatan ini:

### A. Export Database Sebelum Deploy
```bash
# Download database dari Railway
railway run -- cat /app/data/peta-narkoba.db > backup.db
```

### B. Restore Setelah Deploy
Upload kembali via admin panel atau:
```bash
# Upload database ke Railway
railway run -- sh -c "cat > /app/data/peta-narkoba.db" < backup.db
```

---

## ✅ Verifikasi Volume Berhasil

Setelah setup volume, cek di logs Railway:

```
📁 Created data directory: /app/data/database
🗄️  Database path: /app/data/database/peta-narkoba.db
```

Atau:

```
📁 Created data directory: /data/database
🗄️  Database path: /data/database/peta-narkoba.db
```

Jika muncul path seperti di atas, artinya volume sudah aktif!

---

## 🚀 Test Persistence

1. Upload banner baru dari admin panel
2. Push code baru ke GitHub (trigger redeploy)
3. Tunggu deploy selesai
4. Buka homepage - banner masih ada ✅

---

## 📞 Jika Masih Bermasalah

Contact Railway Support atau gunakan alternatif:
- PostgreSQL Railway (free tier, auto-persistent)
- Cloudinary untuk image storage
- Supabase Storage (free tier)

---

**Note:** Code sudah diupdate untuk support `RAILWAY_VOLUME_MOUNT_PATH` environment variable.
