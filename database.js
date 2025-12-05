const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'peta-narkoba.db');
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

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

  // Create banner table
  db.exec(`
    CREATE TABLE IF NOT EXISTS banner (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      image_data TEXT,
      caption TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create logo table
  db.exec(`
    CREATE TABLE IF NOT EXISTS logo (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      image_data TEXT,
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

  // Migrate banner
  if (fs.existsSync(bannerFile)) {
    try {
      const bannerData = JSON.parse(fs.readFileSync(bannerFile, 'utf-8'));
      const existingBanner = db.prepare('SELECT COUNT(*) as count FROM banner').get();
      
      if (existingBanner.count === 0) {
        db.prepare(`
          INSERT INTO banner (id, image_data, caption)
          VALUES (1, ?, ?)
        `).run(bannerData.dataUrl || null, bannerData.caption || null);
        
        console.log('✅ Migrated banner from JSON');
      }
    } catch (err) {
      console.log('⚠️ No existing banner data to migrate:', err.message);
    }
  }
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
  
  // Ensure banner has default caption
  const bannerCount = db.prepare('SELECT COUNT(*) as count FROM banner').get();
  if (bannerCount.count === 0) {
    db.prepare(`
      INSERT INTO banner (id, image_data, caption)
      VALUES (1, NULL, ?)
    `).run('Informasi Area Rawan Narkoba - Kota Tanjungpinang');
    console.log('✅ Added default banner caption');
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
    const result = db.prepare(`
      INSERT INTO points (name, lat, lng, category, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, lat, lng, category, description);
    return result.lastInsertRowid;
  },
  
  updatePoint: (id, name, lat, lng, category, description) => {
    return db.prepare(`
      UPDATE points 
      SET name = ?, lat = ?, lng = ?, category = ?, description = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, lat, lng, category, description, id);
  },
  
  deletePoint: (id) => {
    return db.prepare('DELETE FROM points WHERE id = ?').run(id);
  },
  
  // Banner operations
  getBanner: () => {
    let banner = db.prepare('SELECT * FROM banner WHERE id = 1').get();
    if (!banner) {
      // Insert default banner if not exists
      db.prepare(`
        INSERT INTO banner (id, image_data, caption)
        VALUES (1, NULL, 'Informasi Area Rawan Narkoba - Kota Tanjungpinang')
      `).run();
      banner = db.prepare('SELECT * FROM banner WHERE id = 1').get();
    }
    return banner;
  },
  
  updateBanner: (imageData, caption) => {
    return db.prepare(`
      INSERT INTO banner (id, image_data, caption, updated_at)
      VALUES (1, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        image_data = excluded.image_data,
        caption = excluded.caption,
        updated_at = CURRENT_TIMESTAMP
    `).run(imageData, caption);
  },
  
  // Logo operations
  getLogo: () => {
    return db.prepare('SELECT * FROM logo WHERE id = 1').get();
  },
  
  updateLogo: (imageData) => {
    return db.prepare(`
      INSERT INTO logo (id, image_data, updated_at)
      VALUES (1, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        image_data = excluded.image_data,
        updated_at = CURRENT_TIMESTAMP
    `).run(imageData);
  }
};
