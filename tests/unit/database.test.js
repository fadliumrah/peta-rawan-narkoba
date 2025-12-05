const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Create a test database
const TEST_DB_PATH = path.join(__dirname, '..', '..', 'data', 'test-peta-narkoba.db');

describe('Database Operations', () => {
  let db;
  let dbModule;

  beforeAll(() => {
    // Clean up test database if exists
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Create test database
    db = new Database(TEST_DB_PATH);
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

    // Create module-like exports
    dbModule = {
      db,
      getAllPoints: () => db.prepare('SELECT * FROM points ORDER BY created_at DESC').all(),
      getPointById: (id) => db.prepare('SELECT * FROM points WHERE id = ?').get(id),
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
          SET name = ?, lat = ?, lng = ?, category = ?, description = ?
          WHERE id = ?
        `).run(name, lat, lng, category, description, id);
      },
      deletePoint: (id) => db.prepare('DELETE FROM points WHERE id = ?').run(id),
      getBanner: () => db.prepare('SELECT * FROM banner WHERE id = 1').get(),
      updateBanner: (imageBuffer, mimeType, caption) => {
        if (imageBuffer === null || imageBuffer === undefined) {
          return db.prepare(`
            INSERT INTO banner (id, caption)
            VALUES (1, ?)
            ON CONFLICT(id) DO UPDATE SET caption = excluded.caption
          `).run(caption);
        } else {
          return db.prepare(`
            INSERT INTO banner (id, image_data, mime_type, caption)
            VALUES (1, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              image_data = excluded.image_data,
              mime_type = excluded.mime_type,
              caption = excluded.caption
          `).run(imageBuffer, mimeType, caption);
        }
      },
      getLogo: () => db.prepare('SELECT * FROM logo WHERE id = 1').get(),
      updateLogo: (imageBuffer, mimeType) => {
        return db.prepare(`
          INSERT INTO logo (id, image_data, mime_type)
          VALUES (1, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            image_data = excluded.image_data,
            mime_type = excluded.mime_type
        `).run(imageBuffer, mimeType);
      },
      getAllNews: () => db.prepare('SELECT * FROM news ORDER BY created_at DESC').all(),
      getNewsById: (id) => db.prepare('SELECT * FROM news WHERE id = ?').get(id),
      searchNews: (query) => {
        const searchPattern = `%${query}%`;
        return db.prepare(`
          SELECT * FROM news 
          WHERE title LIKE ? OR content LIKE ? OR author LIKE ?
          ORDER BY created_at DESC
        `).all(searchPattern, searchPattern, searchPattern);
      },
      createNews: (title, content, imageBuffer, mimeType, author) => {
        return db.prepare(`
          INSERT INTO news (title, content, image_data, mime_type, author)
          VALUES (?, ?, ?, ?, ?)
        `).run(title, content, imageBuffer, mimeType, author);
      },
      updateNews: (id, title, content, imageBuffer, mimeType, author) => {
        if (imageBuffer === null || imageBuffer === undefined) {
          return db.prepare(`
            UPDATE news 
            SET title = ?, content = ?, author = ?
            WHERE id = ?
          `).run(title, content, author, id);
        } else {
          return db.prepare(`
            UPDATE news 
            SET title = ?, content = ?, image_data = ?, mime_type = ?, author = ?
            WHERE id = ?
          `).run(title, content, imageBuffer, mimeType, author, id);
        }
      },
      deleteNews: (id) => db.prepare('DELETE FROM news WHERE id = ?').run(id),
    };
  });

  afterAll(() => {
    db.close();
    // Clean up test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  beforeEach(() => {
    // Clear all data before each test
    db.prepare('DELETE FROM points').run();
    db.prepare('DELETE FROM banner').run();
    db.prepare('DELETE FROM logo').run();
    db.prepare('DELETE FROM news').run();
  });

  describe('Points Operations', () => {
    test('should create a point', () => {
      const id = dbModule.createPoint('Test Location', 0.9167, 104.4510, 'sedang', 'Test description');
      expect(id).toBeDefined();
      expect(typeof id).toBe('number');

      const point = dbModule.getPointById(id);
      expect(point).toBeDefined();
      expect(point.name).toBe('Test Location');
      expect(point.lat).toBe(0.9167);
      expect(point.lng).toBe(104.4510);
      expect(point.category).toBe('sedang');
      expect(point.description).toBe('Test description');
    });

    test('should get all points', () => {
      const id1 = dbModule.createPoint('Location 1', 0.9167, 104.4510, 'rendah', 'Description 1');
      const id2 = dbModule.createPoint('Location 2', 0.9200, 104.4600, 'tinggi', 'Description 2');

      const points = dbModule.getAllPoints();
      expect(points).toHaveLength(2);
      // Verify both points exist
      expect(points.some(p => p.name === 'Location 1')).toBe(true);
      expect(points.some(p => p.name === 'Location 2')).toBe(true);
    });

    test('should update a point', () => {
      const id = dbModule.createPoint('Old Name', 0.9167, 104.4510, 'sedang', 'Old description');
      
      dbModule.updatePoint(id, 'New Name', 0.9200, 104.4600, 'tinggi', 'New description');
      
      const updated = dbModule.getPointById(id);
      expect(updated.name).toBe('New Name');
      expect(updated.lat).toBe(0.9200);
      expect(updated.lng).toBe(104.4600);
      expect(updated.category).toBe('tinggi');
      expect(updated.description).toBe('New description');
    });

    test('should delete a point', () => {
      const id = dbModule.createPoint('Test Location', 0.9167, 104.4510, 'sedang', 'Test description');
      
      const result = dbModule.deletePoint(id);
      expect(result.changes).toBe(1);
      
      const deleted = dbModule.getPointById(id);
      expect(deleted).toBeUndefined();
    });

    test('should validate category constraint', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO points (name, lat, lng, category, description)
          VALUES (?, ?, ?, ?, ?)
        `).run('Test', 0.9167, 104.4510, 'invalid', 'Test');
      }).toThrow();
    });
  });

  describe('Banner Operations', () => {
    test('should update banner with image', () => {
      const testBuffer = Buffer.from('test image data');
      dbModule.updateBanner(testBuffer, 'image/png', 'Test Caption');

      const banner = dbModule.getBanner();
      expect(banner).toBeDefined();
      expect(banner.caption).toBe('Test Caption');
      expect(banner.mime_type).toBe('image/png');
      expect(Buffer.compare(banner.image_data, testBuffer)).toBe(0);
    });

    test('should update banner caption only', () => {
      const testBuffer = Buffer.from('test image data');
      dbModule.updateBanner(testBuffer, 'image/png', 'Original Caption');
      
      dbModule.updateBanner(null, null, 'Updated Caption');

      const banner = dbModule.getBanner();
      expect(banner.caption).toBe('Updated Caption');
      expect(Buffer.compare(banner.image_data, testBuffer)).toBe(0); // Image unchanged
    });
  });

  describe('Logo Operations', () => {
    test('should update logo', () => {
      const testBuffer = Buffer.from('test logo data');
      dbModule.updateLogo(testBuffer, 'image/png');

      const logo = dbModule.getLogo();
      expect(logo).toBeDefined();
      expect(logo.mime_type).toBe('image/png');
      expect(Buffer.compare(logo.image_data, testBuffer)).toBe(0);
    });
  });

  describe('News Operations', () => {
    test('should create news', () => {
      const result = dbModule.createNews('Test Title', 'Test Content', null, null, 'Test Author');
      expect(result.lastInsertRowid).toBeDefined();

      const news = dbModule.getNewsById(result.lastInsertRowid);
      expect(news).toBeDefined();
      expect(news.title).toBe('Test Title');
      expect(news.content).toBe('Test Content');
      expect(news.author).toBe('Test Author');
    });

    test('should create news with image', () => {
      const testBuffer = Buffer.from('test image');
      const result = dbModule.createNews('Test Title', 'Test Content', testBuffer, 'image/jpeg', 'Test Author');

      const news = dbModule.getNewsById(result.lastInsertRowid);
      expect(news.mime_type).toBe('image/jpeg');
      expect(Buffer.compare(news.image_data, testBuffer)).toBe(0);
    });

    test('should get all news', () => {
      dbModule.createNews('News 1', 'Content 1', null, null, 'Author 1');
      dbModule.createNews('News 2', 'Content 2', null, null, 'Author 2');

      const news = dbModule.getAllNews();
      expect(news).toHaveLength(2);
      // Verify both news exist
      expect(news.some(n => n.title === 'News 1')).toBe(true);
      expect(news.some(n => n.title === 'News 2')).toBe(true);
    });

    test('should search news', () => {
      dbModule.createNews('Important News', 'Content about security', null, null, 'John Doe');
      dbModule.createNews('Another Story', 'Different content', null, null, 'Jane Smith');

      const results = dbModule.searchNews('Important');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Important News');

      const authorResults = dbModule.searchNews('John');
      expect(authorResults).toHaveLength(1);
      expect(authorResults[0].author).toBe('John Doe');
    });

    test('should update news', () => {
      const result = dbModule.createNews('Old Title', 'Old Content', null, null, 'Old Author');
      const id = result.lastInsertRowid;

      dbModule.updateNews(id, 'New Title', 'New Content', null, null, 'New Author');

      const updated = dbModule.getNewsById(id);
      expect(updated.title).toBe('New Title');
      expect(updated.content).toBe('New Content');
      expect(updated.author).toBe('New Author');
    });

    test('should delete news', () => {
      const result = dbModule.createNews('Test Title', 'Test Content', null, null, 'Test Author');
      const id = result.lastInsertRowid;

      const deleteResult = dbModule.deleteNews(id);
      expect(deleteResult.changes).toBe(1);

      const deleted = dbModule.getNewsById(id);
      expect(deleted).toBeUndefined();
    });
  });
});
