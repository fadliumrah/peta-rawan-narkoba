const { validatePoint, validateNews, validateImageData, sanitizeHtml } = require('../../middleware/validation');

describe('Validation Middleware', () => {
  describe('validatePoint', () => {
    let req, res, next;

    beforeEach(() => {
      req = { body: {} };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });

    test('should accept valid point data', () => {
      req.body = {
        name: 'Test Location',
        lat: 0.9167,
        lng: 104.4510,
        category: 'sedang',
        description: 'Test description'
      };

      validatePoint(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject missing lat/lng', () => {
      req.body = { name: 'Test', category: 'sedang' };
      validatePoint(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('lat,lng required')
      }));
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject missing name', () => {
      req.body = { lat: 0.9167, lng: 104.4510, category: 'sedang' };
      validatePoint(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('name and category required')
      }));
    });

    test('should reject invalid category', () => {
      req.body = {
        name: 'Test',
        lat: 0.9167,
        lng: 104.4510,
        category: 'invalid'
      };
      validatePoint(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('category must be')
      }));
    });

    test('should reject invalid latitude', () => {
      req.body = {
        name: 'Test',
        lat: 100, // Invalid
        lng: 104.4510,
        category: 'sedang'
      };
      validatePoint(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('Latitude')
      }));
    });

    test('should reject invalid longitude', () => {
      req.body = {
        name: 'Test',
        lat: 0.9167,
        lng: 200, // Invalid
        category: 'sedang'
      };
      validatePoint(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('Longitude')
      }));
    });

    test('should reject name that is too long', () => {
      req.body = {
        name: 'A'.repeat(201),
        lat: 0.9167,
        lng: 104.4510,
        category: 'sedang'
      };
      validatePoint(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('Name too long')
      }));
    });

    test('should reject description that is too long', () => {
      req.body = {
        name: 'Test',
        lat: 0.9167,
        lng: 104.4510,
        category: 'sedang',
        description: 'A'.repeat(1001)
      };
      validatePoint(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('Description too long')
      }));
    });

    test('should accept valid categories: rendah, sedang, tinggi', () => {
      const categories = ['rendah', 'sedang', 'tinggi'];
      
      categories.forEach(category => {
        req.body = {
          name: 'Test',
          lat: 0.9167,
          lng: 104.4510,
          category: category
        };
        next.mockClear();
        validatePoint(req, res, next);
        expect(next).toHaveBeenCalled();
      });
    });
  });

  describe('validateNews', () => {
    let req, res, next;

    beforeEach(() => {
      req = { body: {} };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });

    test('should accept valid news data', () => {
      req.body = {
        title: 'Test News',
        content: 'Test content for the news',
        author: 'Test Author'
      };

      validateNews(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject missing required fields', () => {
      req.body = { title: 'Test' };
      validateNews(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('required')
      }));
    });

    test('should reject title that is too long', () => {
      req.body = {
        title: 'A'.repeat(201),
        content: 'Test content',
        author: 'Test Author'
      };
      validateNews(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('Title too long')
      }));
    });

    test('should reject content that is too long', () => {
      req.body = {
        title: 'Test',
        content: 'A'.repeat(10001),
        author: 'Test Author'
      };
      validateNews(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('Content too long')
      }));
    });

    test('should reject author that is too long', () => {
      req.body = {
        title: 'Test',
        content: 'Test content',
        author: 'A'.repeat(101)
      };
      validateNews(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('Author name too long')
      }));
    });
  });

  describe('validateImageData', () => {
    test('should accept valid base64 data URL', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const result = validateImageData(dataUrl);
      
      expect(result.valid).toBe(true);
    });

    test('should accept valid plain base64', () => {
      const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const result = validateImageData(base64);
      
      expect(result.valid).toBe(true);
    });

    test('should reject invalid base64', () => {
      const result = validateImageData('invalid!@#$%^&*()');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should reject empty data', () => {
      const result = validateImageData('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No image data provided');
    });

    test('should reject null data', () => {
      const result = validateImageData(null);
      expect(result.valid).toBe(false);
    });
  });

  describe('sanitizeHtml', () => {
    test('should escape HTML special characters', () => {
      const input = '<script>alert("XSS")</script>';
      const output = sanitizeHtml(input);
      
      expect(output).not.toContain('<');
      expect(output).not.toContain('>');
      expect(output).toContain('&lt;');
      expect(output).toContain('&gt;');
    });

    test('should escape ampersands', () => {
      expect(sanitizeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    test('should escape quotes', () => {
      const input = 'He said "Hello"';
      const output = sanitizeHtml(input);
      expect(output).toContain('&quot;');
    });

    test('should escape single quotes', () => {
      const input = "It's a test";
      const output = sanitizeHtml(input);
      expect(output).toContain('&#x27;');
    });

    test('should escape forward slashes', () => {
      const input = '</script>';
      const output = sanitizeHtml(input);
      expect(output).toContain('&#x2F;');
    });

    test('should handle null and undefined', () => {
      expect(sanitizeHtml(null)).toBe(null);
      expect(sanitizeHtml(undefined)).toBe(undefined);
    });

    test('should handle empty string', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    test('should prevent XSS attacks', () => {
      const xssAttempts = [
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>',
        '<iframe src="javascript:alert(1)">',
        '<script>alert("XSS")</script>',
      ];

      xssAttempts.forEach(xss => {
        const sanitized = sanitizeHtml(xss);
        // HTML tags should be escaped
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('<img');
        expect(sanitized).not.toContain('<svg');
        expect(sanitized).not.toContain('<iframe');
        // Should contain escaped characters
        expect(sanitized).toContain('&lt;');
        expect(sanitized).toContain('&gt;');
      });
    });
  });
});
