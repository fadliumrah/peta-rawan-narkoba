# 🚀 SOLUSI RAILWAY TANPA VOLUME

## Masalah
Railway tidak memiliki menu "Volumes" di plan yang digunakan, sehingga data database hilang setiap kali redeploy.

## Solusi: Database Version Control

### ✅ Yang Sudah Dilakukan

1. **Database di-commit ke Git**
   - File `data/peta-narkoba.db` sekarang ter-commit
   - Database akan ter-deploy bersama aplikasi
   - Data tidak hilang saat redeploy

2. **Update .gitignore**
   - Database file sekarang **TIDAK** diabaikan
   - Bisa di-track dan di-commit ke Git
   - Version control untuk data

3. **Simplified Database Path**
   - Tidak lagi depend on Railway Volume
   - Menggunakan path simple: `./data/peta-narkoba.db`
   - Compatible dengan Railway tanpa volume

---

## 📋 CARA KERJA

### Deploy Pertama Kali:
```
1. Push code ke GitHub (termasuk database)
2. Railway auto-deploy
3. Database ter-deploy dengan data awal
4. ✅ Aplikasi berjalan dengan data lengkap
```

### Setelah Upload Data Baru di Railway:
```
Ada 2 opsi:

OPSI A - Update Lokal (Recommended):
1. Upload data di LOKAL (localhost:3000/admin)
2. Commit database: git add data/peta-narkoba.db
3. Push ke GitHub
4. Railway auto-redeploy dengan data baru
5. ✅ Data update permanen

OPSI B - Railway Direct:
1. Upload data di Railway production
2. Data tersimpan sampai redeploy berikutnya
3. Sebelum redeploy, backup dulu via Railway CLI
4. ⚠️ Data hilang jika redeploy tanpa backup
```

---

## 🎯 WORKFLOW YANG BENAR

### Untuk Development:
```bash
# 1. Edit/upload data di lokal
http://localhost:3000/admin

# 2. Commit database
git add data/peta-narkoba.db
git commit -m "Update: add new banner/news/points"
git push origin main

# 3. Railway auto-deploy dengan data baru
# ✅ Data sekarang permanen di production
```

### Untuk Production Emergency:
```bash
# Jika harus upload langsung di Railway:
1. Upload data di https://your-app.railway.app/admin
2. Download database via Railway CLI
3. Replace lokal dengan database Railway
4. Commit dan push
5. Deploy ulang
```

---

## ⚠️ PENTING!

### ✅ DO (Lakukan):
- Upload data di **LOKAL** lalu commit database
- Commit database setelah setiap perubahan data penting
- Push ke GitHub untuk backup otomatis
- Treat database sebagai part of source code

### ❌ DON'T (Jangan):
- Upload data langsung di Railway tanpa backup
- Redeploy tanpa commit database terbaru
- Edit database di Railway dan lokal bersamaan (conflict!)
- Lupa commit database setelah update data

---

## 🔧 Railway CLI (Optional)

Jika perlu download database dari Railway:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Download file dari Railway
railway run bash
# Dalam bash Railway:
cat data/peta-narkoba.db > /tmp/db-backup.db
# Download via SFTP atau scp
```

---

## 📊 Status Database Saat Ini

```
File: data/peta-narkoba.db
Size: ~204 KB
Tables:
  - points:  5 titik map
  - banner:  1 banner image (BLOB)
  - logo:    1 logo image (BLOB)  
  - news:    0 berita (siap diisi)
```

---

## ✅ Keuntungan Sistem Ini

1. ✅ **Tidak perlu Railway Volume** (gratis!)
2. ✅ **Version control untuk data** (Git tracking)
3. ✅ **Backup otomatis** (setiap commit)
4. ✅ **Rollback mudah** (git revert)
5. ✅ **Deploy predictable** (data selalu sama)
6. ✅ **No ephemeral filesystem issue**

---

## 🎯 Kesimpulan

**Database sekarang permanen karena di-commit ke Git!**

Setiap kali Railway redeploy:
- Code terbaru dari GitHub
- Database terbaru dari GitHub
- Data tetap ada ✅
- Tidak hilang lagi ✅

**Workflow sederhana:**
1. Edit data lokal
2. Commit database
3. Push
4. Done! ✅

---

## 📞 Support

Jika ada masalah:
1. Cek Railway logs
2. Pastikan database ter-commit
3. Verify di GitHub repo (file `data/peta-narkoba.db` ada)
4. Redeploy Railway
