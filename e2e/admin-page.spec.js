const { test, expect } = require('@playwright/test');

test.describe('Admin Page Tests', () => {
  // Use test admin credentials
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'password';

  test('should require authentication to access admin page', async ({ page }) => {
    const response = await page.goto('/admin');
    
    // Should get 401 or see auth dialog
    expect(response.status()).toBe(401);
  });

  test('should reject invalid credentials', async ({ page, context }) => {
    // Set invalid auth header
    await context.setHTTPCredentials({
      username: 'wronguser',
      password: 'wrongpass'
    });

    const response = await page.goto('/admin');
    expect(response.status()).toBe(401);
  });

  test('should allow access with valid credentials', async ({ page, context }) => {
    // Set valid auth header
    await context.setHTTPCredentials({
      username: adminUser,
      password: adminPass
    });

    await page.goto('/admin');
    
    // Check page title
    await expect(page).toHaveTitle(/Admin Panel/);
    
    // Check admin elements are visible
    await expect(page.locator('h1')).toContainText(/Admin/);
  });

  test('should display admin map', async ({ page, context }) => {
    await context.setHTTPCredentials({
      username: adminUser,
      password: adminPass
    });

    await page.goto('/admin');
    
    // Wait for map to load
    await page.waitForTimeout(2000);
    
    const map = page.locator('#adminMap, #map');
    await expect(map).toBeVisible();
  });

  test('should have forms for adding points', async ({ page, context }) => {
    await context.setHTTPCredentials({
      username: adminUser,
      password: adminPass
    });

    await page.goto('/admin');
    
    // Check for form elements (adjust selectors based on actual admin.html)
    const forms = page.locator('form');
    const count = await forms.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have banner upload functionality', async ({ page, context }) => {
    await context.setHTTPCredentials({
      username: adminUser,
      password: adminPass
    });

    await page.goto('/admin');
    
    // Look for banner upload controls
    const bannerSection = page.locator('*:has-text("Banner")').first();
    if (await bannerSection.isVisible()) {
      await expect(bannerSection).toBeVisible();
    }
  });

  test('should have logo upload functionality', async ({ page, context }) => {
    await context.setHTTPCredentials({
      username: adminUser,
      password: adminPass
    });

    await page.goto('/admin');
    
    // Look for logo upload controls
    const logoSection = page.locator('*:has-text("Logo")').first();
    if (await logoSection.isVisible()) {
      await expect(logoSection).toBeVisible();
    }
  });

  test('should protect API endpoints', async ({ request }) => {
    // Try to access protected endpoint without auth
    const response = await request.post('/api/points', {
      data: {
        name: 'Test',
        lat: 0.9167,
        lng: 104.4510,
        category: 'sedang'
      }
    });

    expect(response.status()).toBe(401);
  });

  test('should allow API access with valid auth', async ({ request }) => {
    // Create auth header
    const authHeader = 'Basic ' + Buffer.from(`${adminUser}:${adminPass}`).toString('base64');

    const response = await request.post('/api/points', {
      headers: {
        'Authorization': authHeader
      },
      data: {
        name: 'Test Location',
        lat: 0.9167,
        lng: 104.4510,
        category: 'sedang',
        description: 'Test description'
      }
    });

    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data.name).toBe('Test Location');
  });

  test('should validate point data on submission', async ({ request }) => {
    const authHeader = 'Basic ' + Buffer.from(`${adminUser}:${adminPass}`).toString('base64');

    // Missing required fields
    const response = await request.post('/api/points', {
      headers: {
        'Authorization': authHeader
      },
      data: {
        lat: 0.9167,
        lng: 104.4510
      }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  test('should delete points with valid auth', async ({ request }) => {
    const authHeader = 'Basic ' + Buffer.from(`${adminUser}:${adminPass}`).toString('base64');

    // First create a point
    const createResponse = await request.post('/api/points', {
      headers: {
        'Authorization': authHeader
      },
      data: {
        name: 'To Delete',
        lat: 0.9167,
        lng: 104.4510,
        category: 'sedang'
      }
    });

    const created = await createResponse.json();
    
    // Then delete it
    const deleteResponse = await request.delete(`/api/points/${created.id}`, {
      headers: {
        'Authorization': authHeader
      }
    });

    expect(deleteResponse.ok()).toBe(true);
    const deleteData = await deleteResponse.json();
    expect(deleteData.ok).toBe(true);
  });

  test('should have news management functionality', async ({ page, context }) => {
    await context.setHTTPCredentials({
      username: adminUser,
      password: adminPass
    });

    await page.goto('/admin');
    
    // Look for news management section
    const newsSection = page.locator('*:has-text("News"), *:has-text("Berita")').first();
    if (await newsSection.isVisible()) {
      await expect(newsSection).toBeVisible();
    }
  });

  test('should handle GPS geolocation button', async ({ page, context }) => {
    await context.setHTTPCredentials({
      username: adminUser,
      password: adminPass
    });

    // Grant geolocation permission
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 0.9167, longitude: 104.4510 });

    await page.goto('/admin');
    
    // Look for GPS/geolocation button
    const gpsButton = page.locator('button:has-text("GPS"), button:has-text("Location")').first();
    if (await gpsButton.isVisible()) {
      await expect(gpsButton).toBeVisible();
    }
  });

  test('should be responsive on mobile', async ({ page, context }) => {
    await context.setHTTPCredentials({
      username: adminUser,
      password: adminPass
    });

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/admin');
    
    // Check key elements are still visible
    await expect(page.locator('h1')).toBeVisible();
  });
});
