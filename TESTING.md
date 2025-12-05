# Testing Guide

This document describes the testing infrastructure and how to run tests for the Peta Rawan Narkoba application.

## Test Structure

```
tests/
├── unit/               # Unit tests for individual modules
│   ├── database.test.js       # Database operations tests
│   ├── imageHandler.test.js   # Image utility tests
│   └── middleware.test.js     # Validation middleware tests
├── integration/        # Integration tests for API endpoints
│   └── api.test.js           # API endpoint tests
e2e/                    # End-to-end UI tests
├── public-page.spec.js        # Public page UI tests
└── admin-page.spec.js         # Admin page UI tests
```

## Running Tests

### Unit and Integration Tests

Run all tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm test -- --coverage
```

Run specific test file:
```bash
npm test -- tests/unit/database.test.js
```

Watch mode for development:
```bash
npm run test:watch
```

### UI Tests (Playwright)

Run all UI tests:
```bash
npm run test:ui
```

Run UI tests in headed mode (see browser):
```bash
npm run test:ui:headed
```

Debug UI tests:
```bash
npm run test:ui:debug
```

## Test Coverage

Current test coverage includes:

### Unit Tests (45 tests)
- **Database Operations**: CRUD operations for points, banner, logo, and news
- **Image Handler**: Base64 parsing, validation, and mime type detection
- **Validation Middleware**: Input validation and sanitization
- **Authentication**: Basic auth and security checks

### Integration Tests (23 tests)
- **API Endpoints**: GET, POST, PUT, DELETE operations
- **Authentication**: Protected routes and credentials validation
- **Error Handling**: Proper error responses and status codes
- **Data Validation**: Input validation on API endpoints

### UI Tests (E2E)
- **Public Page**: Homepage, map display, news section, responsive design
- **Admin Page**: Authentication, admin panel access, forms, uploads
- **Security**: Protected routes, API endpoint protection

## Writing New Tests

### Unit Test Example

```javascript
const { parseImageData } = require('../../utils/imageHandler');

describe('Image Handler', () => {
  test('should parse base64 data', () => {
    const dataUrl = 'data:image/png;base64,abc123';
    const result = parseImageData(dataUrl);
    
    expect(result).toBeDefined();
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.mimeType).toBe('image/png');
  });
});
```

### Integration Test Example

```javascript
const request = require('supertest');
const app = require('../server');

test('should get all points', async () => {
  const response = await request(app).get('/api/points');
  expect(response.status).toBe(200);
  expect(Array.isArray(response.body)).toBe(true);
});
```

### UI Test Example

```javascript
const { test, expect } = require('@playwright/test');

test('should load homepage', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Peta Rawan Narkoba/);
});
```

## Test Database

- Unit tests use a separate test database: `data/test-peta-narkoba.db`
- Integration tests use: `data/test-api-peta-narkoba.db`
- Test databases are automatically created and cleaned up
- Test databases are excluded from version control via `.gitignore`

## Continuous Integration

Tests can be run in CI/CD pipelines:

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run UI tests (requires browser)
npx playwright install
npm run test:ui
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Tests should clean up after themselves (database, files, etc.)
3. **Mocking**: Use mocks for external dependencies when appropriate
4. **Coverage**: Aim for high code coverage but focus on critical paths
5. **Speed**: Keep tests fast - use unit tests for quick feedback
6. **Documentation**: Document complex test scenarios

## Debugging Tests

### Debug a specific test:
```bash
npm test -- tests/unit/database.test.js --verbose
```

### Debug with Node inspector:
```bash
node --inspect-brk node_modules/.bin/jest tests/unit/database.test.js
```

### Debug Playwright tests:
```bash
npm run test:ui:debug
```

## Common Issues

### Database locked error
- Make sure no other process is using the test database
- Check that previous test runs properly cleaned up

### Timeout errors in UI tests
- Increase timeout in playwright.config.js
- Check if server is starting correctly
- Use `--headed` mode to see what's happening

### Authentication failures
- Verify environment variables are set correctly
- Check that credentials match in tests and config

## Test Configuration

### Jest Configuration (package.json)
```json
{
  "jest": {
    "testEnvironment": "node",
    "coverageDirectory": "coverage",
    "collectCoverageFrom": [
      "server.js",
      "database.js",
      "middleware/**/*.js",
      "utils/**/*.js"
    ]
  }
}
```

### Playwright Configuration (playwright.config.js)
- Uses chromium for E2E tests
- Automatically starts server before tests
- Captures screenshots on failure
- Generates HTML report

## Coverage Reports

After running tests with coverage, view the report:
```bash
npm test -- --coverage
open coverage/lcov-report/index.html
```

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all existing tests pass
3. Add tests for new functionality
4. Maintain or improve code coverage
5. Document any new test utilities or patterns
