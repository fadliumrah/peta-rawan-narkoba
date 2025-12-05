/**
 * Unit tests for validation middleware
 */

const { validationResult } = require('express-validator');
const {
  validatePoint,
  validateBanner,
  validateNews,
  validateId,
  validateSearchQuery
} = require('../middleware/validation');

// Mock express request and response
function createMockRequest(body = {}, params = {}, query = {}) {
  return {
    body,
    params,
    query
  };
}

function createMockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const mockNext = jest.fn();

/**
 * Helper to run validation middleware without the error handler
 * (which is always the last item in the validation chain)
 */
async function runValidatorsOnly(validators, req, res, next) {
  const validationRulesOnly = validators.slice(0, -1); // Exclude handleValidationErrors
  for (const validator of validationRulesOnly) {
    if (typeof validator === 'function') {
      await validator(req, res, next);
    }
  }
}

/**
 * Helper to run all validators including error handler
 */
async function runAllValidators(validators, req, res, next) {
  for (const validator of validators) {
    if (typeof validator === 'function') {
      await validator(req, res, next);
    }
  }
}

describe('Validation Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validatePoint', () => {
    test('should pass with valid point data', async () => {
      const req = createMockRequest({
        name: 'Test Location',
        lat: 0.9167,
        lng: 104.4510,
        category: 'sedang',
        description: 'Test description'
      });
      const res = createMockResponse();

      // Run all validators
      await runAllValidators(validatePoint, req, res, mockNext);

      // Should not have validation errors
      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(true);
    });

    test('should fail with missing name', async () => {
      const req = createMockRequest({
        lat: 0.9167,
        lng: 104.4510,
        category: 'sedang'
      });
      const res = createMockResponse();

      // Run validators without error handler
      await runValidatorsOnly(validatePoint, req, res, mockNext);

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array().some(e => e.path === 'name')).toBe(true);
    });

    test('should fail with invalid category', async () => {
      const req = createMockRequest({
        name: 'Test',
        lat: 0.9167,
        lng: 104.4510,
        category: 'invalid'
      });
      const res = createMockResponse();

      await runValidatorsOnly(validatePoint, req, res, mockNext);

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array().some(e => e.path === 'category')).toBe(true);
    });

    test('should fail with invalid latitude', async () => {
      const req = createMockRequest({
        name: 'Test',
        lat: 91, // Out of range
        lng: 104.4510,
        category: 'sedang'
      });
      const res = createMockResponse();

      await runValidatorsOnly(validatePoint, req, res, mockNext);

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array().some(e => e.path === 'lat')).toBe(true);
    });

    test('should fail with invalid longitude', async () => {
      const req = createMockRequest({
        name: 'Test',
        lat: 0.9167,
        lng: 181, // Out of range
        category: 'sedang'
      });
      const res = createMockResponse();

      await runValidatorsOnly(validatePoint, req, res, mockNext);

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array().some(e => e.path === 'lng')).toBe(true);
    });
  });

  describe('validateNews', () => {
    test('should pass with valid news data', async () => {
      const req = createMockRequest({
        title: 'Test News',
        content: 'Test Content',
        author: 'Test Author'
      });
      const res = createMockResponse();

      await runAllValidators(validateNews, req, res, mockNext);

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(true);
    });

    test('should fail with missing required fields', async () => {
      const req = createMockRequest({
        title: 'Test News'
        // Missing content and author
      });
      const res = createMockResponse();

      await runValidatorsOnly(validateNews, req, res, mockNext);

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
    });

    test('should fail with too long title', async () => {
      const req = createMockRequest({
        title: 'A'.repeat(301), // Exceeds 300 characters
        content: 'Test Content',
        author: 'Test Author'
      });
      const res = createMockResponse();

      await runValidatorsOnly(validateNews, req, res, mockNext);

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array().some(e => e.path === 'title')).toBe(true);
    });
  });

  describe('validateId', () => {
    test('should pass with valid ID', async () => {
      const req = createMockRequest({}, { id: '123' });
      const res = createMockResponse();

      await runAllValidators(validateId, req, res, mockNext);

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(true);
    });

    test('should fail with negative ID', async () => {
      const req = createMockRequest({}, { id: '-1' });
      const res = createMockResponse();

      await runValidatorsOnly(validateId, req, res, mockNext);

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
    });

    test('should fail with non-numeric ID', async () => {
      const req = createMockRequest({}, { id: 'abc' });
      const res = createMockResponse();

      await runValidatorsOnly(validateId, req, res, mockNext);

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
    });
  });

  describe('validateSearchQuery', () => {
    test('should pass with valid search query', async () => {
      const req = createMockRequest({}, {}, { q: 'test search' });
      const res = createMockResponse();

      await runAllValidators(validateSearchQuery, req, res, mockNext);

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(true);
    });

    test('should pass with empty query', async () => {
      const req = createMockRequest({}, {}, { q: '' });
      const res = createMockResponse();

      await runAllValidators(validateSearchQuery, req, res, mockNext);

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(true);
    });

    test('should fail with too long query', async () => {
      const req = createMockRequest({}, {}, { q: 'A'.repeat(201) });
      const res = createMockResponse();

      await runValidatorsOnly(validateSearchQuery, req, res, mockNext);

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
    });
  });
});
