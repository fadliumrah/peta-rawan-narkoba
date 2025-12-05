/**
 * Unit tests for database operations
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Create a test database module
function createTestDatabase() {
  const testDbPath = path.join(__dirname, 'test-peta-narkoba.db');
  
  // Remove test database if it exists
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  const db = new Database(testDbPath);
  db.pragma('foreign_keys = ON');
  
  // Initialize schema
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
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS banner (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      image_data BLOB,
      mime_type TEXT,
      caption TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS logo (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      image_data BLOB,
      mime_type TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
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
  
  // Create indices
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_points_category ON points(category);
    CREATE INDEX IF NOT EXISTS idx_points_created_at ON points(created_at);
    CREATE INDEX IF NOT EXISTS idx_news_created_at ON news(created_at);
    CREATE INDEX IF NOT EXISTS idx_news_author ON news(author);
  `);
  
  return { db, testDbPath };
}

describe('Database Operations', () => {
  let testDb;
  let testDbPath;
  
  beforeEach(() => {
    const result = createTestDatabase();
    testDb = result.db;
    testDbPath = result.testDbPath;
  });
  
  afterEach(() => {
    if (testDb) {
      testDb.close();
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });
  
  describe('Points Operations', () => {
    test('should create a new point', () => {
      const stmt = testDb.prepare(`
        INSERT INTO points (name, lat, lng, category, description)
        VALUES (?, ?, ?, ?, ?)
      `);
      const result = stmt.run('Test Location', 0.9167, 104.4510, 'sedang', 'Test description');
      
      expect(result.lastInsertRowid).toBe(1);
      expect(result.changes).toBe(1);
    });
    
    test('should retrieve all points', () => {
      // Insert test data
      const stmt = testDb.prepare(`
        INSERT INTO points (name, lat, lng, category, description)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run('Location 1', 0.9167, 104.4510, 'rendah', 'Description 1');
      stmt.run('Location 2', 0.9200, 104.4520, 'sedang', 'Description 2');
      stmt.run('Location 3', 0.9300, 104.4530, 'tinggi', 'Description 3');
      
      const points = testDb.prepare('SELECT * FROM points ORDER BY created_at DESC').all();
      expect(points).toHaveLength(3);
      expect(points[0].name).toBe('Location 3');
    });
    
    test('should update a point', () => {
      // Insert test data
      const insertStmt = testDb.prepare(`
        INSERT INTO points (name, lat, lng, category, description)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertStmt.run('Original Name', 0.9167, 104.4510, 'sedang', 'Original description');
      
      // Update
      const updateStmt = testDb.prepare(`
        UPDATE points 
        SET name = ?, lat = ?, lng = ?, category = ?, description = ?
        WHERE id = ?
      `);
      const result = updateStmt.run('Updated Name', 0.9200, 104.4520, 'tinggi', 'Updated description', 1);
      
      expect(result.changes).toBe(1);
      
      const point = testDb.prepare('SELECT * FROM points WHERE id = ?').get(1);
      expect(point.name).toBe('Updated Name');
      expect(point.category).toBe('tinggi');
    });
    
    test('should delete a point', () => {
      // Insert test data
      const insertStmt = testDb.prepare(`
        INSERT INTO points (name, lat, lng, category, description)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertStmt.run('To Delete', 0.9167, 104.4510, 'sedang', 'Will be deleted');
      
      // Delete
      const deleteStmt = testDb.prepare('DELETE FROM points WHERE id = ?');
      const result = deleteStmt.run(1);
      
      expect(result.changes).toBe(1);
      
      const point = testDb.prepare('SELECT * FROM points WHERE id = ?').get(1);
      expect(point).toBeUndefined();
    });
    
    test('should enforce category constraint', () => {
      const stmt = testDb.prepare(`
        INSERT INTO points (name, lat, lng, category, description)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      expect(() => {
        stmt.run('Invalid Category', 0.9167, 104.4510, 'invalid', 'Description');
      }).toThrow();
    });
  });
  
  describe('Banner Operations', () => {
    test('should insert and retrieve banner', () => {
      const buffer = Buffer.from('test image data');
      const stmt = testDb.prepare(`
        INSERT INTO banner (id, image_data, mime_type, caption)
        VALUES (1, ?, ?, ?)
      `);
      stmt.run(buffer, 'image/png', 'Test Caption');
      
      const banner = testDb.prepare('SELECT * FROM banner WHERE id = 1').get();
      expect(banner).toBeDefined();
      expect(banner.caption).toBe('Test Caption');
      expect(banner.mime_type).toBe('image/png');
      expect(banner.image_data).toEqual(buffer);
    });
    
    test('should update banner caption only', () => {
      // Insert initial banner
      const buffer = Buffer.from('test image data');
      testDb.prepare(`
        INSERT INTO banner (id, image_data, mime_type, caption)
        VALUES (1, ?, ?, ?)
      `).run(buffer, 'image/png', 'Original Caption');
      
      // Update caption only
      testDb.prepare(`
        UPDATE banner SET caption = ? WHERE id = 1
      `).run('Updated Caption');
      
      const banner = testDb.prepare('SELECT * FROM banner WHERE id = 1').get();
      expect(banner.caption).toBe('Updated Caption');
      expect(banner.image_data).toEqual(buffer);
    });
  });
  
  describe('News Operations', () => {
    test('should create news article', () => {
      const stmt = testDb.prepare(`
        INSERT INTO news (title, content, author, image_data, mime_type)
        VALUES (?, ?, ?, ?, ?)
      `);
      const imageBuffer = Buffer.from('news image');
      const result = stmt.run('Test News', 'Test Content', 'Test Author', imageBuffer, 'image/jpeg');
      
      expect(result.lastInsertRowid).toBe(1);
      
      const news = testDb.prepare('SELECT * FROM news WHERE id = ?').get(1);
      expect(news.title).toBe('Test News');
      expect(news.author).toBe('Test Author');
    });
    
    test('should search news by title', () => {
      // Insert test news
      const stmt = testDb.prepare(`
        INSERT INTO news (title, content, author)
        VALUES (?, ?, ?)
      `);
      stmt.run('Breaking News', 'Important content', 'Author 1');
      stmt.run('Regular Update', 'Regular content', 'Author 2');
      stmt.run('Breaking Story', 'Another important story', 'Author 3');
      
      const searchPattern = '%Breaking%';
      const results = testDb.prepare(`
        SELECT * FROM news 
        WHERE title LIKE ? OR content LIKE ? OR author LIKE ?
        ORDER BY created_at DESC
      `).all(searchPattern, searchPattern, searchPattern);
      
      expect(results).toHaveLength(2);
      expect(results[0].title).toContain('Breaking');
    });
    
    test('should delete news article', () => {
      const stmt = testDb.prepare(`
        INSERT INTO news (title, content, author)
        VALUES (?, ?, ?)
      `);
      stmt.run('To Delete', 'Will be deleted', 'Author');
      
      const deleteStmt = testDb.prepare('DELETE FROM news WHERE id = ?');
      const result = deleteStmt.run(1);
      
      expect(result.changes).toBe(1);
      
      const news = testDb.prepare('SELECT * FROM news WHERE id = ?').get(1);
      expect(news).toBeUndefined();
    });
  });
});
