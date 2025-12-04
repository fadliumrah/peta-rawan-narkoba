# 🚀 Panduan Deploy ke Hosting Gratis

## Pilihan 1: Render.com (Recommended) ⭐

### Langkah-langkah:

1. **Upload ke GitHub**
   ```bash
   # Buat repository baru di GitHub.com
   # Lalu jalankan:
   git remote add origin https://github.com/USERNAME/REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

2. **Deploy di Render.com** (Detailed Steps)
   - Buka [render.com](https://render.com) dan sign up dengan GitHub (gratis)
   - Klik **"New +"** di menu kiri → pilih **"Web Service"**
   - Hubungkan GitHub: 
     - Klik "Connect repository"
     - Pilih `fadliumrah/peta-rawan-narkoba`
     - Klik "Connect"
   - Isi Settings dengan TEPAT:
     - **Name**: `peta-rawan-narkoba`
     - **Environment**: `Node`
     - **Region**: pilih yang terdekat dengan Indonesia (Singapore recommended)
     - **Build Command**: `npm install`
     - **Start Command**: `node server.js`
     - **Instance Type**: `Free`
   
   - **PENTING: Tambah Environment Variables** (scroll ke bawah):
     - Klik **"+ Add Environment Variable"**
     - **Variable 1**:
       - Key: `ADMIN_USER`
       - Value: `admin`
     - **Variable 2**:
       - Key: `ADMIN_PASS`
       - Value: `password_kuat_anda` (ganti dengan password yang aman)
   
   - Klik **"Create Web Service"** di bawah
   - **TUNGGU 5-10 MENIT** hingga build selesai (monitor di tab "Logs")
   - Jika sukses, akan muncul URL seperti: `https://peta-rawan-narkoba-xxxx.onrender.com`

3. **Akses Aplikasi**
   - URL Publik (Peta): `https://peta-rawan-narkoba-xxxx.onrender.com` (ganti xxxx dengan ID yang diberikan Render)
   - Admin Panel: `https://peta-rawan-narkoba-xxxx.onrender.com/admin`
   - Login dengan:
     - Username: `admin`
     - Password: sesuai ADMIN_PASS yang Anda set

**Troubleshooting Render:**
- Jika masih tidak ada link hasil deploy:
  1. Cek tab **"Logs"** di Render dashboard untuk lihat error
  2. Pastikan **Start Command** adalah `node server.js` (bukan `npm start`)
  3. Pastikan **PORT** environment variable ada (Render set otomatis)
  4. Pastikan **ADMIN_USER** dan **ADMIN_PASS** sudah diisi di Variables

**Catatan**: Free tier Render akan "sleep" setelah 15 menit inaktif. Saat diakses kembali, butuh 30-60 detik untuk "wake up".

---

## Pilihan 2: Railway.app 🚂

1. **Upload ke GitHub** (sama seperti di atas)

2. **Deploy di Railway**
   - Buka [railway.app](https://railway.app)
   - Login dengan GitHub
   - Klik **"New Project"** → **"Deploy from GitHub repo"**
   - Pilih repository
   - Railway auto-detect Node.js
   - Tambah Variables di tab **"Variables"**:
     - `ADMIN_USER` = `admin`
     - `ADMIN_PASS` = `password_anda`
   - Deploy otomatis!
   - Klik **"Settings"** → **"Generate Domain"** untuk dapat URL publik

---

## Pilihan 3: Vercel ⚡

**PERHATIAN**: Vercel lebih cocok untuk static/serverless. Node.js dengan persistent storage (JSON files) bisa bermasalah.

Jika tetap ingin coba:
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow prompts
4. Set env vars di Vercel dashboard

---

## Pilihan 4: Cyclic.sh 🔄

1. Buka [cyclic.sh](https://cyclic.sh)
2. Connect GitHub
3. Import repo
4. Set environment variables
5. Deploy!

**Bonus**: Cyclic menyediakan persistent storage gratis.

---

## Tips Setelah Deploy

✅ **Ubah Password Admin** - jangan pakai default!
✅ **Backup Data** - download `data/points.json` secara berkala
✅ **Custom Domain** (opsional) - bisa tambah domain sendiri di Render/Railway
✅ **HTTPS** - semua platform gratis sudah include SSL otomatis

---

## Troubleshooting

**Error: EADDRINUSE**
- Cek PORT environment variable sudah diset di hosting

**Admin tidak bisa login**
- Pastikan ADMIN_USER dan ADMIN_PASS sudah di-set di environment variables

**Data hilang setelah redeploy**
- Free tier tidak persistent storage - pertimbangkan migrasi ke database (MongoDB Atlas gratis)

---

## Upgrade ke Persistent Database (Opsional)

Untuk production, disarankan pakai database:
- **MongoDB Atlas** (free tier 512MB)
- **PostgreSQL** di Railway/Render
- **Supabase** (free tier generous)

Butuh bantuan migrasi? Tanya saja! 😊
