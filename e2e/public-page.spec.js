const { test, expect } = require('@playwright/test');

test.describe('Public Page Tests', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check page title
    await expect(page).toHaveTitle(/Peta Rawan Narkoba/);
    
    // Check navigation elements
    await expect(page.locator('.nav-title')).toContainText('Peta Rawan Narkoba');
    await expect(page.locator('.nav-subtitle')).toContainText('BNN Kota Tanjungpinang');
  });

  test('should display banner section', async ({ page }) => {
    await page.goto('/');
    
    // Check banner elements
    const bannerImg = page.locator('#bannerImg');
    await expect(bannerImg).toBeVisible();
    
    const bannerCaption = page.locator('#bannerCaption');
    await expect(bannerCaption).toBeVisible();
  });

  test('should display logo', async ({ page }) => {
    await page.goto('/');
    
    const logo = page.locator('#logoImg');
    await expect(logo).toBeVisible();
  });

  test('should display map', async ({ page }) => {
    await page.goto('/');
    
    const map = page.locator('#map');
    await expect(map).toBeVisible();
    
    // Wait for map to load (Leaflet)
    await page.waitForTimeout(2000);
    
    // Check if leaflet container exists
    const leafletContainer = page.locator('.leaflet-container');
    await expect(leafletContainer).toBeVisible();
  });

  test('should display news section', async ({ page }) => {
    await page.goto('/');
    
    // Check news section title
    const newsTitle = page.locator('.section-title');
    await expect(newsTitle).toContainText('Berita & Informasi Terkini');
    
    // Check news search input
    const searchInput = page.locator('#newsSearchInput');
    await expect(searchInput).toBeVisible();
  });

  test('should have footer with contact information', async ({ page }) => {
    await page.goto('/');
    
    const footer = page.locator('.footer');
    await expect(footer).toBeVisible();
    
    // Check for phone link
    const phoneLink = page.locator('a[href^="tel:"]');
    await expect(phoneLink).toBeVisible();
    
    // Check for email link
    const emailLink = page.locator('a[href^="mailto:"]');
    await expect(emailLink).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check key elements are still visible
    await expect(page.locator('.nav-title')).toBeVisible();
    await expect(page.locator('#map')).toBeVisible();
    await expect(page.locator('.news-section')).toBeVisible();
  });

  test('should load and display API points on map', async ({ page }) => {
    await page.goto('/');
    
    // Wait for map to load
    await page.waitForTimeout(2000);
    
    // Check if markers are loaded (if any points exist)
    const markers = page.locator('.leaflet-marker-icon');
    const count = await markers.count();
    
    // If there are markers, verify they're visible
    if (count > 0) {
      await expect(markers.first()).toBeVisible();
    }
  });

  test('should handle news search', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.locator('#newsSearchInput');
    
    // Type in search box
    await searchInput.fill('test');
    
    // Wait for search to process
    await page.waitForTimeout(500);
    
    // Verify search input has the value
    await expect(searchInput).toHaveValue('test');
  });

  test('should display news modal when clicking news card', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForTimeout(1000);
    
    // Check if there are any news cards
    const newsCards = page.locator('.news-card');
    const count = await newsCards.count();
    
    if (count > 0) {
      // Click the first news card
      await newsCards.first().click();
      
      // Check if modal is visible
      const modal = page.locator('#newsModal');
      await expect(modal).toBeVisible();
      
      // Close modal
      const closeButton = page.locator('.modal-close');
      await closeButton.click();
      
      // Modal should be hidden
      await expect(modal).not.toBeVisible();
    }
  });

  test('should load external resources', async ({ page }) => {
    await page.goto('/');
    
    // Check that Leaflet CSS is loaded
    const leafletStyles = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      return links.some(link => link.href.includes('leaflet'));
    });
    expect(leafletStyles).toBe(true);
    
    // Check that local styles are loaded
    const localStyles = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      return links.some(link => link.href.includes('styles.css'));
    });
    expect(localStyles).toBe(true);
  });

  test('should have proper cache control headers for images', async ({ page }) => {
    const response = await page.goto('/api/banner/image');
    
    if (response && response.status() !== 404) {
      const headers = response.headers();
      expect(headers['cache-control']).toContain('max-age');
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.goto('/');
    
    // The page should load even if some APIs fail
    await expect(page.locator('.nav-title')).toBeVisible();
    await expect(page.locator('#map')).toBeVisible();
  });
});
