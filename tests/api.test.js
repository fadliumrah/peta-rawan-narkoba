/**
 * Unit tests for API endpoints
 */

const request = require('supertest');
const express = require('express');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Mock database module
let mockDb;
let testDbPath;

jest.mock('../database', () => {
  return {
    db: mockDb,
    getAllPoints: jest.fn(),
    getPointById: jest.fn(),
    createPoint: jest.fn(),
    updatePoint: jest.fn(),
    deletePoint: jest.fn(),
    getBanner: jest.fn(),
    updateBanner: jest.fn(),
    getLogo: jest.fn(),
    updateLogo: jest.fn(),
    getAllNews: jest.fn(),
    getNewsById: jest.fn(),
    searchNews: jest.fn(),
    createNews: jest.fn(),
    updateNews: jest.fn(),
    deleteNews: jest.fn()
  };
});

const db = require('../database');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.ADMIN_USER = 'testadmin';
process.env.ADMIN_PASS = 'testpass';

// Import app after mocking
const app = require('../server');

// Helper function for basic auth
function getAuthHeader(username, password) {
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${credentials}`;
}

describe('API Endpoints', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('GET /api/points', () => {
    test('should return all points', async () => {
      const mockPoints = [
        { id: 1, name: 'Location 1', lat: 0.9167, lng: 104.4510, category: 'rendah', description: 'Desc 1' },
        { id: 2, name: 'Location 2', lat: 0.9200, lng: 104.4520, category: 'sedang', description: 'Desc 2' }
      ];
      db.getAllPoints.mockReturnValue(mockPoints);

      const response = await request(app)
        .get('/api/points')
        .expect(200);

      expect(response.body).toEqual(mockPoints);
      expect(db.getAllPoints).toHaveBeenCalledTimes(1);
    });

    test('should handle errors', async () => {
      db.getAllPoints.mockImplementation(() => {
        throw new Error('Database error');
      });

      await request(app)
        .get('/api/points')
        .expect(500);
    });
  });

  describe('POST /api/points', () => {
    test('should create a new point with valid data', async () => {
      const newPoint = {
        name: 'New Location',
        lat: 0.9167,
        lng: 104.4510,
        category: 'sedang',
        description: 'New description'
      };

      db.createPoint.mockReturnValue(1);
      db.getPointById.mockReturnValue({ id: 1, ...newPoint });

      const response = await request(app)
        .post('/api/points')
        .set('Authorization', getAuthHeader('testadmin', 'testpass'))
        .send(newPoint)
        .expect(200);

      expect(response.body.id).toBe(1);
      expect(response.body.name).toBe(newPoint.name);
    });

    test('should reject request without authentication', async () => {
      const newPoint = {
        name: 'New Location',
        lat: 0.9167,
        lng: 104.4510,
        category: 'sedang'
      };

      await request(app)
        .post('/api/points')
        .send(newPoint)
        .expect(401);
    });

    test('should reject invalid category', async () => {
      const invalidPoint = {
        name: 'New Location',
        lat: 0.9167,
        lng: 104.4510,
        category: 'invalid'
      };

      await request(app)
        .post('/api/points')
        .set('Authorization', getAuthHeader('testadmin', 'testpass'))
        .send(invalidPoint)
        .expect(400);
    });

    test('should reject missing required fields', async () => {
      const invalidPoint = {
        lat: 0.9167,
        lng: 104.4510
      };

      await request(app)
        .post('/api/points')
        .set('Authorization', getAuthHeader('testadmin', 'testpass'))
        .send(invalidPoint)
        .expect(400);
    });
  });

  describe('PATCH /api/points/:id', () => {
    test('should update an existing point', async () => {
      const existingPoint = {
        id: 1,
        name: 'Old Name',
        lat: 0.9167,
        lng: 104.4510,
        category: 'rendah',
        description: 'Old description'
      };

      const updates = {
        name: 'Updated Name',
        category: 'tinggi'
      };

      db.getPointById.mockReturnValue(existingPoint);
      db.updatePoint.mockReturnValue({ changes: 1 });
      db.getPointById.mockReturnValueOnce(existingPoint).mockReturnValueOnce({
        ...existingPoint,
        ...updates
      });

      const response = await request(app)
        .patch('/api/points/1')
        .set('Authorization', getAuthHeader('testadmin', 'testpass'))
        .send(updates)
        .expect(200);

      expect(response.body.name).toBe(updates.name);
      expect(response.body.category).toBe(updates.category);
    });

    test('should return 404 for non-existent point', async () => {
      db.getPointById.mockReturnValue(null);

      await request(app)
        .patch('/api/points/999')
        .set('Authorization', getAuthHeader('testadmin', 'testpass'))
        .send({ name: 'Updated' })
        .expect(404);
    });
  });

  describe('DELETE /api/points/:id', () => {
    test('should delete a point', async () => {
      db.deletePoint.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .delete('/api/points/1')
        .set('Authorization', getAuthHeader('testadmin', 'testpass'))
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.removed).toBe(1);
    });

    test('should require authentication', async () => {
      await request(app)
        .delete('/api/points/1')
        .expect(401);
    });
  });

  describe('GET /api/banner', () => {
    test('should return banner caption', async () => {
      db.getBanner.mockReturnValue({
        caption: 'Test Banner Caption',
        image_data: Buffer.from('test'),
        mime_type: 'image/png'
      });

      const response = await request(app)
        .get('/api/banner')
        .expect(200);

      expect(response.body.caption).toBe('Test Banner Caption');
    });

    test('should return default caption if none exists', async () => {
      db.getBanner.mockReturnValue(null);

      const response = await request(app)
        .get('/api/banner')
        .expect(200);

      expect(response.body.caption).toBe('Informasi Area Rawan Narkoba - Kota Tanjungpinang');
    });
  });

  describe('GET /api/news', () => {
    test('should return all news', async () => {
      const mockNews = [
        { id: 1, title: 'News 1', content: 'Content 1', author: 'Author 1' },
        { id: 2, title: 'News 2', content: 'Content 2', author: 'Author 2' }
      ];
      db.getAllNews.mockReturnValue(mockNews);

      const response = await request(app)
        .get('/api/news')
        .expect(200);

      expect(response.body).toEqual(mockNews);
    });
  });

  describe('POST /api/news', () => {
    test('should create news with valid data', async () => {
      const newNews = {
        title: 'Test News',
        content: 'Test Content',
        author: 'Test Author'
      };

      db.createNews.mockReturnValue({ lastInsertRowid: 1 });

      const response = await request(app)
        .post('/api/news')
        .set('Authorization', getAuthHeader('testadmin', 'testpass'))
        .send(newNews)
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.id).toBe(1);
    });

    test('should reject news without required fields', async () => {
      await request(app)
        .post('/api/news')
        .set('Authorization', getAuthHeader('testadmin', 'testpass'))
        .send({ title: 'Only Title' })
        .expect(400);
    });
  });

  describe('GET /api/news/search', () => {
    test('should search news by query', async () => {
      const mockResults = [
        { id: 1, title: 'Breaking News', content: 'Important', author: 'Author' }
      ];
      db.searchNews.mockReturnValue(mockResults);

      const response = await request(app)
        .get('/api/news/search?q=Breaking')
        .expect(200);

      expect(response.body).toEqual(mockResults);
    });

    test('should return empty array for empty query', async () => {
      const response = await request(app)
        .get('/api/news/search?q=')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('Health Check', () => {
    test('GET /health should return ok status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to API endpoints', async () => {
      db.getAllPoints.mockReturnValue([]);

      // Make multiple requests
      for (let i = 0; i < 5; i++) {
        await request(app).get('/api/points').expect(200);
      }

      // Rate limit headers should be present
      const response = await request(app).get('/api/points');
      expect(response.headers['ratelimit-limit']).toBeDefined();
    });
  });
});
