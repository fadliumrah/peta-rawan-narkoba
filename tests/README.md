# UI/UX Tests

## Overview
Automated UI/UX tests untuk Peta Rawan Narkoba menggunakan Playwright.

## Setup
```bash
# Install dependencies (termasuk Playwright)
npm install

# Install Playwright browsers (optional, jika belum terinstall)
npx playwright install chromium
```

## Running Tests
```bash
# Run all tests
npm test

# Atau
npm run test:ui

# With custom server URL
BASE_URL=http://localhost:3000 npm test

# With custom credentials
ADMIN_USER=admin ADMIN_PASS=password npm test
```

## Test Coverage

### 1. Homepage Load Test
- Memverifikasi homepage dapat diakses
- Memeriksa title halaman

### 2. Navigation Elements Test
- Memverifikasi logo tampil
- Memverifikasi heading tampil
- Memverifikasi banner tampil

### 3. News Section Test
- Memverifikasi section berita dapat dimuat
- Memeriksa keberadaan news grid

### 4. Authentication Test
- Memverifikasi admin panel membutuhkan autentikasi
- Memeriksa HTTP 401 response

### 5. API Points Test
- Memverifikasi API /api/points berfungsi
- Memeriksa response JSON

### 6. API News Test
- Memverifikasi API /api/news berfungsi
- Memeriksa response JSON

### 7. Health Check Test
- Memverifikasi endpoint /health berfungsi
- Memeriksa status 'ok'

### 8. Responsive Design Test
- Memverifikasi tampilan mobile (375x667)
- Memeriksa elemen utama tetap visible

## Environment Variables
- `BASE_URL` - URL aplikasi (default: http://localhost:3000)
- `ADMIN_USER` - Username admin (default: admin)
- `ADMIN_PASS` - Password admin (default: password)

## Exit Codes
- `0` - All tests passed
- `1` - One or more tests failed

## Adding New Tests
Tambahkan test cases baru di `ui.test.js` dengan pattern:
```javascript
try {
  await setup();
  console.log('\nTest N: Test description');
  
  // Test implementation
  
  console.log('✅ PASS: Test passed');
  passed++;
  await teardown();
} catch (error) {
  console.log(`❌ FAIL: ${error.message}`);
  failed++;
  await teardown();
}
```

## Best Practices
1. Selalu gunakan `setup()` di awal test
2. Selalu gunakan `teardown()` di akhir test (baik success/fail)
3. Gunakan timeout yang reasonable untuk operasi async
4. Test harus independent (tidak depend pada test lain)
5. Gunakan descriptive error messages
