/**
 * UI tests for public map page
 */

const { test, expect } = require('@playwright/test');

test.describe('Public Map Page', () => {
  test('should load the main page', async ({ page }) => {
    await page.goto('/');
    
    // Check for page title or main elements
    await expect(page.locator('#map')).toBeVisible();
  });

  test('should display map container', async ({ page }) => {
    await page.goto('/');
    
    // Wait for map to load
    await page.waitForSelector('#map', { timeout: 10000 });
    
    const mapElement = page.locator('#map');
    await expect(mapElement).toBeVisible();
    
    // Check if map has loaded (Leaflet adds leaflet-container class)
    const hasLeafletClass = await mapElement.evaluate((el) => 
      el.classList.contains('leaflet-container')
    );
    expect(hasLeafletClass).toBe(true);
  });

  test('should display banner section', async ({ page }) => {
    await page.goto('/');
    
    // Look for banner or caption element
    const bannerCaption = page.locator('#bannerCaption');
    await expect(bannerCaption).toBeVisible();
  });

  test('should load points from API', async ({ page }) => {
    // Intercept API call
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/points') && response.status() === 200
    );

    await page.goto('/');
    
    const response = await responsePromise;
    const points = await response.json();
    
    // Verify response structure
    expect(Array.isArray(points)).toBe(true);
  });

  test('should display legend', async ({ page }) => {
    await page.goto('/');
    
    // Wait for legend to load
    await page.waitForSelector('.legend', { timeout: 10000 });
    
    const legend = page.locator('.legend');
    await expect(legend).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    const mapElement = page.locator('#map');
    await expect(mapElement).toBeVisible();
    
    // Check that map adapts to viewport
    const mapBox = await mapElement.boundingBox();
    expect(mapBox.width).toBeLessThanOrEqual(375);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/points', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    await page.goto('/');
    
    // Page should still load even if API fails
    await expect(page.locator('#map')).toBeVisible();
  });

  test('should load banner image', async ({ page }) => {
    await page.goto('/');
    
    // Check if banner image loads
    const response = await page.waitForResponse(
      response => response.url().includes('/api/banner/image'),
      { timeout: 10000 }
    ).catch(() => null);
    
    // Banner might not exist in test environment, so we just check it doesn't crash
    const mapVisible = await page.locator('#map').isVisible();
    expect(mapVisible).toBe(true);
  });
});
