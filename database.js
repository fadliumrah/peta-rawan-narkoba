const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Use Railway volume mount path if available, otherwise use local data directory
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH 
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'database')
  : path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`📁 Created data directory: ${DATA_DIR}`);
}

const DB_PATH = path.join(DATA_DIR, 'peta-narkoba.db');
console.log(`🗄️  Database path: ${DB_PATH}`);
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Helper function to get Indonesia time (WIB = UTC+7)
function getIndonesiaTime() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wibTime = new Date(utc + (7 * 3600000)); // UTC+7
  return wibTime.toISOString().slice(0, 19).replace('T', ' ');
}

// Initialize database schema
function initializeDatabase() {
  // Create points table
  db.exec(`
    CREATE TABLE IF NOT EXISTS points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('rendah', 'sedang', 'tinggi')),
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create banner table with BLOB storage
  db.exec(`
    CREATE TABLE IF NOT EXISTS banner (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      image_data BLOB,
      mime_type TEXT,
      caption TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create logo table with BLOB storage
  db.exec(`
    CREATE TABLE IF NOT EXISTS logo (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      image_data BLOB,
      mime_type TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create news table with BLOB storage for images
  db.exec(`
    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      image_data BLOB,
      mime_type TEXT,
      author TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Database initialized successfully');
}

// Initialize on module load
initializeDatabase();

// Migrate existing data from JSON files (run once)
function migrateExistingData() {
  const pointsFile = path.join(DATA_DIR, 'points.json');
  const bannerFile = path.join(DATA_DIR, 'banner.json');

  // Migrate points
  if (fs.existsSync(pointsFile)) {
    try {
      const pointsData = JSON.parse(fs.readFileSync(pointsFile, 'utf-8'));
      const existingPoints = db.prepare('SELECT COUNT(*) as count FROM points').get();
      
      if (existingPoints.count === 0 && pointsData.length > 0) {
        const insertPoint = db.prepare(`
          INSERT INTO points (name, lat, lng, category, description)
          VALUES (?, ?, ?, ?, ?)
        `);
        
        const insertMany = db.transaction((points) => {
          for (const point of points) {
            // Old data structure used kelurahan and note, convert to new structure
            const name = point.name || point.kelurahan || point.note || `Lokasi ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
            const category = point.category || 'sedang'; // default to sedang
            const description = point.description || point.note || null;
            
            insertPoint.run(
              name,
              point.lat,
              point.lng,
              category,
              description
            );
          }
        });
        
        insertMany(pointsData);
        console.log(`✅ Migrated ${pointsData.length} points from JSON`);
      }
    } catch (err) {
      console.log('⚠️ No existing points data to migrate:', err.message);
    }
  }

  // Banner migration removed - now loaded directly from file in seedSampleData()
}

// Run migration
migrateExistingData();

// Add sample data if database is empty (for first deployment)
function seedSampleData() {
  const pointsCount = db.prepare('SELECT COUNT(*) as count FROM points').get();
  
  if (pointsCount.count === 0) {
    console.log('📊 Adding sample data...');
    
    const samplePoints = [
      { name: 'Batu IX', lat: 0.9167, lng: 104.4510, category: 'sedang', description: 'Area pemantauan kerawanan narkoba' },
      { name: 'Dompak', lat: 0.9300, lng: 104.4200, category: 'sedang', description: 'Wilayah pengawasan khusus' },
      { name: 'Kampung Bugis', lat: 0.9100, lng: 104.4600, category: 'sedang', description: 'Lokasi monitoring rutin' },
      { name: 'Sei Jang', lat: 0.9400, lng: 104.4400, category: 'sedang', description: 'Area perhatian khusus' },
      { name: 'Bukit Cermin', lat: 0.9200, lng: 104.4300, category: 'sedang', description: 'Zona pengawasan intensif' }
    ];
    
    const insertPoint = db.prepare(`
      INSERT INTO points (name, lat, lng, category, description)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const insertMany = db.transaction((points) => {
      for (const point of points) {
        insertPoint.run(point.name, point.lat, point.lng, point.category, point.description);
      }
    });
    
    insertMany(samplePoints);
    console.log(`✅ Added ${samplePoints.length} sample points`);
  }
  
  // Load banner as BLOB from physical file
  const bannerCount = db.prepare('SELECT COUNT(*) as count FROM banner').get();
  if (bannerCount.count === 0) {
    let bannerBuffer = null;
    let bannerMimeType = 'image/svg+xml';
    let bannerCaption = 'Informasi Area Rawan Narkoba - Kota Tanjungpinang';
    
    // Load banner from physical file as BLOB
    try {
      const bannerFilePath = path.join(__dirname, 'public', 'banner-bnn.svg');
      if (fs.existsSync(bannerFilePath)) {
        bannerBuffer = fs.readFileSync(bannerFilePath);
        bannerMimeType = 'image/svg+xml';
        console.log('✅ Loaded banner from file as BLOB:', bannerFilePath);
      }
      
      // Load caption from backup
      const backupPath = path.join(__dirname, 'banner-backup.json');
      if (fs.existsSync(backupPath)) {
        const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        bannerCaption = backup.caption || bannerCaption;
      }
    } catch (err) {
      console.warn('⚠️ Could not load banner file:', err.message);
    }
    
    if (bannerBuffer) {
      db.prepare(`
        INSERT INTO banner (id, image_data, mime_type, caption)
        VALUES (1, ?, ?, ?)
      `).run(bannerBuffer, bannerMimeType, bannerCaption);
      console.log('✅ Added banner BLOB to database');
    }
  }
  
  // Load logo as BLOB from physical file
  const logoCount = db.prepare('SELECT COUNT(*) as count FROM logo').get();
  if (logoCount.count === 0) {
    try {
      const logoFilePath = path.join(__dirname, 'public', 'logo-bnn.png');
      if (fs.existsSync(logoFilePath)) {
        const logoBuffer = fs.readFileSync(logoFilePath);
        db.prepare(`
          INSERT INTO logo (id, image_data, mime_type)
          VALUES (1, ?, ?)
        `).run(logoBuffer, 'image/png');
        console.log('✅ Loaded logo from file as BLOB:', logoFilePath);
      }
    } catch (err) {
      console.warn('⚠️ Could not load logo file:', err.message);
    }
  }
  
  // Restore news from backup if table is empty
  const newsCount = db.prepare('SELECT COUNT(*) as count FROM news').get();
  if (newsCount.count === 0) {
    try {
      const newsBackupPath = path.join(__dirname, 'data', 'news-backup.json');
      if (fs.existsSync(newsBackupPath)) {
        const newsBackup = JSON.parse(fs.readFileSync(newsBackupPath, 'utf8'));
        if (Array.isArray(newsBackup) && newsBackup.length > 0) {
          const insertNews = db.prepare(`
            INSERT INTO news (title, content, image_data, author, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          
          const restoreNews = db.transaction((newsList) => {
            for (const news of newsList) {
              insertNews.run(
                news.title,
                news.content,
                news.image_data || null,
                news.author,
                news.created_at,
                news.updated_at
              );
            }
          });
          
          restoreNews(newsBackup);
          console.log(`✅ Restored ${newsBackup.length} news articles from backup`);
        }
      }
    } catch (newsBackupErr) {
      console.warn('⚠️ Could not restore news from backup:', newsBackupErr.message);
    }
  }
}

// Seed sample data
seedSampleData();

// Export database instance and helper functions
module.exports = {
  db,
  
  // Points operations
  getAllPoints: () => {
    return db.prepare('SELECT * FROM points ORDER BY created_at DESC').all();
  },
  
  getPointById: (id) => {
    return db.prepare('SELECT * FROM points WHERE id = ?').get(id);
  },
  
  createPoint: (name, lat, lng, category, description) => {
    const wibTime = getIndonesiaTime();
    const result = db.prepare(`
      INSERT INTO points (name, lat, lng, category, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, lat, lng, category, description, wibTime, wibTime);
    return result.lastInsertRowid;
  },
  
  updatePoint: (id, name, lat, lng, category, description) => {
    const wibTime = getIndonesiaTime();
    return db.prepare(`
      UPDATE points 
      SET name = ?, lat = ?, lng = ?, category = ?, description = ?,
          updated_at = ?
      WHERE id = ?
    `).run(name, lat, lng, category, description, wibTime, id);
  },
  
  deletePoint: (id) => {
    return db.prepare('DELETE FROM points WHERE id = ?').run(id);
  },
  
  // Banner operations
  getBanner: () => {
    return db.prepare('SELECT * FROM banner WHERE id = 1').get();
  },
  
  updateBanner: (imageBuffer, mimeType, caption) => {
    const wibTime = getIndonesiaTime();
    // If no new image provided, only update caption
    if (imageBuffer === null || imageBuffer === undefined) {
      return db.prepare(`
        INSERT INTO banner (id, caption, updated_at)
        VALUES (1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          caption = excluded.caption,
          updated_at = excluded.updated_at
      `).run(caption, wibTime);
    } else {
      return db.prepare(`
        INSERT INTO banner (id, image_data, mime_type, caption, updated_at)
        VALUES (1, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          image_data = excluded.image_data,
          mime_type = excluded.mime_type,
          caption = excluded.caption,
          updated_at = excluded.updated_at
      `).run(imageBuffer, mimeType, caption, wibTime);
    }
  },
  
  // Logo operations
  getLogo: () => {
    return db.prepare('SELECT * FROM logo WHERE id = 1').get();
  },
  
  updateLogo: (imageBuffer, mimeType) => {
    const wibTime = getIndonesiaTime();
    return db.prepare(`
      INSERT INTO logo (id, image_data, mime_type, updated_at)
      VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        image_data = excluded.image_data,
        mime_type = excluded.mime_type,
        updated_at = excluded.updated_at
    `).run(imageBuffer, mimeType, wibTime);
  },

  // News operations
  getAllNews: () => {
    return db.prepare('SELECT * FROM news ORDER BY created_at DESC').all();
  },

  getNewsById: (id) => {
    return db.prepare('SELECT * FROM news WHERE id = ?').get(id);
  },

  searchNews: (query) => {
    const searchPattern = `%${query}%`;
    return db.prepare(`
      SELECT * FROM news 
      WHERE title LIKE ? OR content LIKE ? OR author LIKE ?
      ORDER BY created_at DESC
    `).all(searchPattern, searchPattern, searchPattern);
  },

  createNews: (title, content, imageBuffer, mimeType, author) => {
    const wibTime = getIndonesiaTime();
    return db.prepare(`
      INSERT INTO news (title, content, image_data, mime_type, author, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title, content, imageBuffer, mimeType, author, wibTime, wibTime);
  },

  updateNews: (id, title, content, imageBuffer, mimeType, author) => {
    // If no new image provided, only update text fields
    if (imageBuffer === null || imageBuffer === undefined) {
      const wibTime = getIndonesiaTime();
      return db.prepare(`
        UPDATE news 
        SET title = ?, content = ?, author = ?,
            updated_at = ?
        WHERE id = ?
      `).run(title, content, author, wibTime, id);
    } else {
      const wibTime = getIndonesiaTime();
      return db.prepare(`
        UPDATE news 
        SET title = ?, content = ?, image_data = ?, mime_type = ?, author = ?,
            updated_at = ?
        WHERE id = ?
      `).run(title, content, imageBuffer, mimeType, author, wibTime, id);
    }
  },

  deleteNews: (id) => {
    return db.prepare('DELETE FROM news WHERE id = ?').run(id);
  }
};
