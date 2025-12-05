/**
 * UI/UX Tests for Peta Rawan Narkoba
 * Tests basic functionality and user experience
 */

const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'password';

let browser, page;

// Test utilities
async function setup() {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  page = await context.newPage();
}

async function teardown() {
  if (page) await page.close();
  if (browser) await browser.close();
}

async function login() {
  await page.goto(`${BASE_URL}/admin`);
  await page.setExtraHTTPHeaders({
    'Authorization': 'Basic ' + Buffer.from(`${ADMIN_USER}:${ADMIN_PASS}`).toString('base64')
  });
  await page.goto(`${BASE_URL}/admin`);
}

// Test Suite
async function runTests() {
  console.log('🧪 Starting UI/UX Tests...\n');
  let passed = 0;
  let failed = 0;

  // Test 1: Homepage loads successfully
  try {
    await setup();
    console.log('Test 1: Homepage loads successfully');
    await page.goto(BASE_URL);
    const title = await page.title();
    if (title.includes('Peta Rawan Narkoba')) {
      console.log('✅ PASS: Homepage loaded with correct title');
      passed++;
    } else {
      throw new Error(`Wrong title: ${title}`);
    }
    await teardown();
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    failed++;
    await teardown();
  }

  // Test 2: Navigation elements are present
  try {
    await setup();
    console.log('\nTest 2: Navigation elements are present');
    await page.goto(BASE_URL);
    
    const hasLogo = await page.locator('img[alt*="Logo"]').count() > 0;
    const hasHeading = await page.locator('h1').count() > 0;
    const hasBanner = await page.locator('img[alt*="Banner"]').count() > 0;
    
    if (hasLogo && hasHeading && hasBanner) {
      console.log('✅ PASS: All navigation elements present');
      passed++;
    } else {
      throw new Error('Missing navigation elements');
    }
    await teardown();
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    failed++;
    await teardown();
  }

  // Test 3: News section loads
  try {
    await setup();
    console.log('\nTest 3: News section loads');
    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);
    
    const newsSection = await page.locator('#newsGrid').isVisible();
    if (newsSection) {
      console.log('✅ PASS: News section is visible');
      passed++;
    } else {
      throw new Error('News section not found');
    }
    await teardown();
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    failed++;
    await teardown();
  }

  // Test 4: Admin page requires authentication
  try {
    await setup();
    console.log('\nTest 4: Admin page requires authentication');
    const response = await page.goto(`${BASE_URL}/admin`);
    const status = response.status();
    
    if (status === 401) {
      console.log('✅ PASS: Admin page requires authentication');
      passed++;
    } else {
      throw new Error(`Expected 401, got ${status}`);
    }
    await teardown();
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    failed++;
    await teardown();
  }

  // Test 5: API endpoints respond
  try {
    await setup();
    console.log('\nTest 5: API endpoints respond');
    await page.goto(BASE_URL);
    
    const response = await page.request.get(`${BASE_URL}/api/points`);
    const status = response.status();
    
    if (status === 200) {
      const data = await response.json();
      console.log(`✅ PASS: API returns data (${data.length} points)`);
      passed++;
    } else {
      throw new Error(`API returned ${status}`);
    }
    await teardown();
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    failed++;
    await teardown();
  }

  // Test 6: News API responds
  try {
    await setup();
    console.log('\nTest 6: News API responds');
    await page.goto(BASE_URL);
    
    const response = await page.request.get(`${BASE_URL}/api/news`);
    const status = response.status();
    
    if (status === 200) {
      const data = await response.json();
      console.log(`✅ PASS: News API returns data (${data.length} news items)`);
      passed++;
    } else {
      throw new Error(`News API returned ${status}`);
    }
    await teardown();
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    failed++;
    await teardown();
  }

  // Test 7: Health check endpoint
  try {
    await setup();
    console.log('\nTest 7: Health check endpoint');
    await page.goto(BASE_URL);
    
    const response = await page.request.get(`${BASE_URL}/health`);
    const status = response.status();
    
    if (status === 200) {
      const data = await response.json();
      if (data.status === 'ok') {
        console.log('✅ PASS: Health check returns OK');
        passed++;
      } else {
        throw new Error('Health check status not OK');
      }
    } else {
      throw new Error(`Health check returned ${status}`);
    }
    await teardown();
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    failed++;
    await teardown();
  }

  // Test 8: Responsive design - Mobile viewport
  try {
    await setup();
    console.log('\nTest 8: Responsive design - Mobile viewport');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    await page.waitForTimeout(500);
    
    const isVisible = await page.locator('h1').isVisible();
    if (isVisible) {
      console.log('✅ PASS: Page renders on mobile viewport');
      passed++;
    } else {
      throw new Error('Page not rendering properly on mobile');
    }
    await teardown();
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    failed++;
    await teardown();
  }

  // Results
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
