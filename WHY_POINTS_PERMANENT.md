# 🎯 KENAPA POINTS PERMANEN TAPI BANNER/BERITA HILANG?

## Masalah yang Ditemukan

### ✅ POINTS (Mark Peta) Selalu Permanen
**Alasan:**
- Points di-upload → Tersimpan di database
- Database di-commit ke Git (commit 1d88dad)
- Setiap deploy Railway → Database dengan 5 points ikut ter-deploy
- **✅ PERMANEN!**

### ❌ BANNER & BERITA Hilang Setelah Deploy
**Alasan:**
- Banner/Berita di-upload di Railway (production)
- Tersimpan di database Railway
- **Database Railway TIDAK ter-sync ke Git lokal**
- Redeploy → Pakai database dari Git (yang lama, tanpa banner/berita baru)
- **❌ DATA HILANG!**

---

## 📊 Diagram Masalah

```
┌─────────────────────────────────────────────────┐
│  LOKAL (Development)                            │
├─────────────────────────────────────────────────┤
│  peta-narkoba.db                                │
│  - 5 Points ✅                                   │
│  - Banner lama ✅                                │
│  - Logo lama ✅                                  │
│  - News: 0 ✅                                    │
│                                                 │
│  Git Commit → Push → GitHub                    │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  RAILWAY (Production)                           │
├─────────────────────────────────────────────────┤
│  Deploy from GitHub                             │
│  - Database dari Git ter-copy                   │
│                                                 │
│  USER UPLOAD:                                   │
│  - Banner BARU ❌ (hanya di RAM Railway)        │
│  - Berita BARU ❌ (hanya di RAM Railway)        │
│                                                 │
│  Redeploy → Database reset ke versi Git         │
│  ❌ BANNER & BERITA HILANG!                     │
└─────────────────────────────────────────────────┘
```

---

## ✅ SOLUSI PERMANEN

### Workflow yang Benar:

```bash
┌──────────────────────────────────────────────┐
│ 1. UPLOAD DATA DI LOKAL (localhost:3000)    │
│    - Upload banner                           │
│    - Upload logo                             │
│    - Upload berita                           │
│    ✅ Data tersimpan di database lokal       │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│ 2. SYNC DATABASE KE GIT                      │
│    npm run sync                              │
│    atau: node sync-database.js               │
│    ✅ Database di-commit otomatis            │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│ 3. PUSH KE GITHUB                            │
│    npm run sync-push                         │
│    atau: git push origin main                │
│    ✅ Database ter-push ke GitHub            │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│ 4. RAILWAY AUTO-DEPLOY                       │
│    ✅ Database terbaru ter-deploy            │
│    ✅ Banner permanen                        │
│    ✅ Berita permanen                        │
│    ✅ Semua data ada!                        │
└──────────────────────────────────────────────┘
```

---

## 🛠️ Cara Menggunakan

### Opsi 1: One Command (Recommended)
```bash
npm run deploy
```
**Apa yang terjadi:**
1. Sync database ke Git
2. Commit otomatis
3. Push ke GitHub
4. Railway auto-deploy

### Opsi 2: Step by Step
```bash
# 1. Backup database
npm run backup

# 2. Sync ke Git
npm run sync

# 3. Push ke GitHub
git push origin main
```

### Opsi 3: Manual
```bash
# Cek perubahan database
git status data/peta-narkoba.db

# Commit database
git add data/peta-narkoba.db
git commit -m "Update: add new banner/news"
git push origin main
```

---

## 📋 NPM Scripts Available

| Command | Fungsi |
|---------|--------|
| `npm run backup` | Backup database + verifikasi data |
| `npm run sync` | Commit database ke Git |
| `npm run sync-push` | Commit + Push ke GitHub |
| `npm run deploy` | Full deploy (sync + push) |

---

## ⚠️ PENTING!

### ✅ DO (Lakukan):
1. **Selalu upload data di LOKAL** (localhost:3000/admin)
2. **Jalankan `npm run deploy`** setelah upload
3. **Tunggu Railway deploy selesai**
4. **Verifikasi data di production**

### ❌ DON'T (Jangan):
1. ❌ Upload data langsung di Railway production
2. ❌ Redeploy tanpa sync database
3. ❌ Edit database di 2 tempat bersamaan

---

## 🔍 Troubleshooting

### Q: Banner saya hilang setelah deploy!
**A:** Anda upload banner di Railway, tapi tidak sync database ke Git. 
**Solusi:** Upload ulang banner di lokal, lalu `npm run deploy`

### Q: Berita saya hilang setelah deploy!
**A:** Same as above. Upload di lokal, sync database.

### Q: Points tidak pernah hilang, kenapa?
**A:** Karena points sudah di-commit di database sejak awal. Banner/berita Anda upload di Railway, tidak ter-commit.

### Q: Bagaimana cara backup database Railway?
**A:** Download dari Railway CLI atau upload ulang semua data di lokal lalu sync.

---

## 📊 Verifikasi

Untuk memastikan semua data tersimpan:
```bash
npm run backup
```

Output akan menunjukkan:
- ✅ Jumlah data di setiap tabel
- ✅ Ukuran BLOB (gambar)
- ✅ Database file size
- ✅ Backup file created

---

## 🎯 Kesimpulan

**Masalah:** 
- Points permanen karena database-nya di-commit
- Banner/Berita hilang karena database Railway tidak ter-sync ke Git

**Solusi:**
- Upload data di LOKAL
- Jalankan `npm run deploy`
- Database ter-sync otomatis
- Semua data PERMANEN!

---

**💡 Remember:** 
```
Upload di Lokal → npm run deploy → Data Permanen ✅
Upload di Railway → (tanpa sync) → Data Hilang ❌
```
