const { parseImageData, validateImageSize, getMimeType } = require('../../utils/imageHandler');

describe('Image Handler Utilities', () => {
  describe('parseImageData', () => {
    test('should parse base64 data with data URL prefix', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const result = parseImageData(dataUrl);
      
      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.mimeType).toBe('image/png');
      expect(result.buffer.length).toBeGreaterThan(0);
    });

    test('should parse base64 data without data URL prefix', () => {
      const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const result = parseImageData(base64);
      
      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.mimeType).toBe('image/png'); // default
    });

    test('should extract correct mime type from data URL', () => {
      const jpegDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBD';
      const result = parseImageData(jpegDataUrl);
      
      expect(result.mimeType).toBe('image/jpeg');
    });

    test('should throw error for empty data', () => {
      expect(() => parseImageData('')).toThrow('No image data provided');
      expect(() => parseImageData(null)).toThrow('No image data provided');
    });
  });

  describe('validateImageSize', () => {
    test('should accept buffer within size limit', () => {
      const smallBuffer = Buffer.alloc(1024 * 1024); // 1MB
      expect(validateImageSize(smallBuffer, 50)).toBe(true);
    });

    test('should reject buffer exceeding size limit', () => {
      const largeBuffer = Buffer.alloc(60 * 1024 * 1024); // 60MB
      expect(validateImageSize(largeBuffer, 50)).toBe(false);
    });

    test('should use default max size of 50MB', () => {
      const mediumBuffer = Buffer.alloc(40 * 1024 * 1024); // 40MB
      expect(validateImageSize(mediumBuffer)).toBe(true);
    });

    test('should handle edge case at exact limit', () => {
      const exactBuffer = Buffer.alloc(50 * 1024 * 1024); // Exactly 50MB
      expect(validateImageSize(exactBuffer, 50)).toBe(true);
    });
  });

  describe('getMimeType', () => {
    test('should extract png mime type', () => {
      const dataUrl = 'data:image/png;base64,abc123';
      expect(getMimeType(dataUrl)).toBe('image/png');
    });

    test('should extract jpeg mime type', () => {
      const dataUrl = 'data:image/jpeg;base64,abc123';
      expect(getMimeType(dataUrl)).toBe('image/jpeg');
    });

    test('should extract svg mime type', () => {
      const dataUrl = 'data:image/svg+xml;base64,abc123';
      expect(getMimeType(dataUrl)).toBe('image/svg+xml');
    });

    test('should return default mime type for non-data URL', () => {
      expect(getMimeType('abc123')).toBe('image/png');
    });

    test('should handle webp format', () => {
      const dataUrl = 'data:image/webp;base64,abc123';
      expect(getMimeType(dataUrl)).toBe('image/webp');
    });
  });
});
