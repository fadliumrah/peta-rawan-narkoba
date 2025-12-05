const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Setup test environment
process.env.ADMIN_USER = 'testadmin';
process.env.ADMIN_PASS = 'testpass';

// Create test database
const TEST_DB_PATH = path.join(__dirname, '..', '..', 'data', 'test-api-peta-narkoba.db');

describe('API Integration Tests', () => {
  let app;
  let db;
  let server;

  beforeAll(() => {
    // Clean up test database if exists
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Mock the database module
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

    // Create a simplified app for testing
    app = express();
    app.use(express.json({ limit: '50mb' }));

    const { basicAuth } = require('../../middleware/auth');
    const { apiLimiter } = require('../../middleware/security');
    const { validatePoint } = require('../../middleware/validation');

    // Mock db module
    const dbModule = {
      getAllPoints: () => db.prepare('SELECT * FROM points ORDER BY created_at DESC').all(),
      getPointById: (id) => db.prepare('SELECT * FROM points WHERE id = ?').get(id),
      createPoint: (name, lat, lng, category, description) => {
        const result = db.prepare(`
          INSERT INTO points (name, lat, lng, category, description)
          VALUES (?, ?, ?, ?, ?)
        `).run(name, lat, lng, category, description);
        return result.lastInsertRowid;
      },
      deletePoint: (id) => db.prepare('DELETE FROM points WHERE id = ?').run(id),
      getBanner: () => db.prepare('SELECT * FROM banner WHERE id = 1').get(),
      getAllNews: () => db.prepare('SELECT * FROM news ORDER BY created_at DESC').all(),
    };

    // API routes
    app.get('/api/points', (req, res) => {
      try {
        const points = dbModule.getAllPoints();
        res.json(points);
      } catch (err) {
        res.status(500).json({ error: 'Failed to fetch points' });
      }
    });

    app.post('/api/points', basicAuth, validatePoint, (req, res) => {
      try {
        const { name, lat, lng, category, description } = req.body;
        const id = dbModule.createPoint(name, Number(lat), Number(lng), category, description || null);
        const point = dbModule.getPointById(id);
        res.json(point);
      } catch (err) {
        res.status(500).json({ error: 'Failed to add point' });
      }
    });

    app.delete('/api/points/:id', basicAuth, (req, res) => {
      try {
        const id = Number(req.params.id);
        const result = dbModule.deletePoint(id);
        res.json({ ok: true, removed: result.changes });
      } catch (err) {
        res.status(500).json({ error: 'Failed to delete point' });
      }
    });

    app.get('/api/banner', (req, res) => {
      try {
        const banner = dbModule.getBanner();
        res.json({ 
          caption: banner?.caption || 'Informasi Area Rawan Narkoba - Kota Tanjungpinang'
        });
      } catch (err) {
        res.status(500).json({ error: 'Failed to fetch banner' });
      }
    });

    app.get('/api/news', (req, res) => {
      try {
        const news = dbModule.getAllNews();
        res.json(news);
      } catch (err) {
        res.status(500).json({ error: 'Failed to fetch news' });
      }
    });

    app.get('/health', (req, res) => {
      try {
        const points = dbModule.getAllPoints();
        res.status(200).json({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          database: 'connected',
          pointsCount: points.length
        });
      } catch (err) {
        res.status(500).json({ 
          status: 'error', 
          timestamp: new Date().toISOString(),
          database: 'disconnected',
          error: err.message
        });
      }
    });
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  beforeEach(() => {
    // Clear all data before each test
    db.prepare('DELETE FROM points').run();
    db.prepare('DELETE FROM banner').run();
    db.prepare('DELETE FROM news').run();
  });

  describe('GET /api/points', () => {
    test('should return empty array when no points exist', async () => {
      const response = await request(app).get('/api/points');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test('should return all points', async () => {
      db.prepare(`
        INSERT INTO points (name, lat, lng, category, description)
        VALUES (?, ?, ?, ?, ?)
      `).run('Test Location', 0.9167, 104.4510, 'sedang', 'Test description');

      const response = await request(app).get('/api/points');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Test Location');
    });
  });

  describe('POST /api/points', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/points')
        .send({
          name: 'Test Location',
          lat: 0.9167,
          lng: 104.4510,
          category: 'sedang',
          description: 'Test'
        });
      
      expect(response.status).toBe(401);
    });

    test('should create a point with valid authentication', async () => {
      const response = await request(app)
        .post('/api/points')
        .auth('testadmin', 'testpass')
        .send({
          name: 'Test Location',
          lat: 0.9167,
          lng: 104.4510,
          category: 'sedang',
          description: 'Test description'
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Test Location');
      expect(response.body.lat).toBe(0.9167);
      expect(response.body.category).toBe('sedang');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/points')
        .auth('testadmin', 'testpass')
        .send({
          lat: 0.9167,
          lng: 104.4510
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('name and category required');
    });

    test('should validate category values', async () => {
      const response = await request(app)
        .post('/api/points')
        .auth('testadmin', 'testpass')
        .send({
          name: 'Test',
          lat: 0.9167,
          lng: 104.4510,
          category: 'invalid'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('category must be');
    });

    test('should validate coordinates', async () => {
      const response = await request(app)
        .post('/api/points')
        .auth('testadmin', 'testpass')
        .send({
          name: 'Test',
          lat: 100, // Invalid latitude
          lng: 104.4510,
          category: 'sedang'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Latitude');
    });
  });

  describe('DELETE /api/points/:id', () => {
    test('should require authentication', async () => {
      const response = await request(app).delete('/api/points/1');
      expect(response.status).toBe(401);
    });

    test('should delete a point with valid authentication', async () => {
      const result = db.prepare(`
        INSERT INTO points (name, lat, lng, category, description)
        VALUES (?, ?, ?, ?, ?)
      `).run('Test Location', 0.9167, 104.4510, 'sedang', 'Test');

      const response = await request(app)
        .delete(`/api/points/${result.lastInsertRowid}`)
        .auth('testadmin', 'testpass');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.removed).toBe(1);
    });
  });

  describe('GET /api/banner', () => {
    test('should return default caption when no banner exists', async () => {
      const response = await request(app).get('/api/banner');
      expect(response.status).toBe(200);
      expect(response.body.caption).toContain('Informasi Area Rawan Narkoba');
    });

    test('should return banner caption', async () => {
      db.prepare('INSERT INTO banner (id, caption) VALUES (1, ?)').run('Test Caption');

      const response = await request(app).get('/api/banner');
      expect(response.status).toBe(200);
      expect(response.body.caption).toBe('Test Caption');
    });
  });

  describe('GET /api/news', () => {
    test('should return empty array when no news exist', async () => {
      const response = await request(app).get('/api/news');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test('should return all news', async () => {
      db.prepare(`
        INSERT INTO news (title, content, author)
        VALUES (?, ?, ?)
      `).run('Test News', 'Test Content', 'Test Author');

      const response = await request(app).get('/api/news');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Test News');
    });
  });

  describe('GET /health', () => {
    test('should return health status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.database).toBe('connected');
      expect(response.body.pointsCount).toBeDefined();
    });
  });
});
