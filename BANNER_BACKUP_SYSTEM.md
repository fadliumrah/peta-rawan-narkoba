# Banner Backup System

## Cara Kerja

Sistem ini memastikan banner tidak hilang setelah redeploy dengan cara:

1. **Auto-backup saat upload**: Setiap kali upload banner baru, sistem otomatis menyimpan ke `banner-backup.json`
2. **Auto-restore saat deploy**: Saat database fresh/kosong, sistem akan load dari `banner-backup.json` 
3. **Commit backup ke Git**: File `banner-backup.json` di-commit ke repository, sehingga tersedia di setiap deploy

## Workflow

### Upload Banner (Admin Panel):
```
User upload banner → Save to SQLite → Backup to banner-backup.json → Success
```

### Fresh Deploy:
```
Database kosong → Check banner-backup.json → Load last banner → Insert to database → Done
```

### Fallback:
```
Jika banner-backup.json tidak ada → Gunakan placeholder SVG default
```

## Keuntungan

✅ Banner terakhir selalu tersedia setelah redeploy
✅ Tidak perlu setup Railway Volume
✅ Tidak perlu external storage (Cloudinary, S3)
✅ Otomatis ter-backup di Git repository
✅ Lightweight dan simple

## Update Banner

Setiap kali Anda upload banner baru:
1. Banner tersimpan di database SQLite (untuk session saat ini)
2. Banner otomatis di-backup ke `banner-backup.json`
3. Untuk persistence permanent, commit `banner-backup.json` ke Git:

```bash
git add banner-backup.json
git commit -m "Update banner backup"
git push
```

Railway akan otomatis redeploy dan banner baru akan muncul!

## File Terkait

- `banner-backup.json` - Backup file yang di-commit ke Git
- `database.js` - Auto-load banner dari backup saat init
- `server.js` - Auto-save banner ke backup saat upload

---

**Note:** Dengan sistem ini, banner tidak akan kosong lagi setelah redeploy Railway! 🎉
