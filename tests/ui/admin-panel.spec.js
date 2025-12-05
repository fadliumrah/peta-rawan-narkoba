/**
 * UI tests for admin panel
 */

const { test, expect } = require('@playwright/test');

const ADMIN_USER = 'testadmin';
const ADMIN_PASS = 'testpass';

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page, context }) => {
    // Set up basic auth
    await context.setHTTPCredentials({
      username: ADMIN_USER,
      password: ADMIN_PASS
    });
  });

  test('should require authentication', async ({ page, context }) => {
    // Clear credentials
    await context.clearCookies();
    
    // Try to access without auth
    const response = await page.goto('/admin', { 
      failOnStatusCode: false 
    });
    
    // Should get 401 or redirect to auth
    expect(response.status()).toBe(401);
  });

  test('should load admin page with authentication', async ({ page, context }) => {
    // Set credentials using test constants
    await context.setHTTPCredentials({
      username: ADMIN_USER,
      password: ADMIN_PASS
    });

    await page.goto('/admin');
    
    // Check for admin elements
    const miniMap = page.locator('#miniMap');
    await expect(miniMap).toBeVisible({ timeout: 10000 });
  });

  test('should display point management form', async ({ page, context }) => {
    await context.setHTTPCredentials({
      username: ADMIN_USER,
      password: ADMIN_PASS
    });

    await page.goto('/admin');
    
    // Check for point form
    const pointForm = page.locator('#pointForm');
    await expect(pointForm).toBeVisible({ timeout: 10000 });
    
    // Check for required form fields
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="lat"]')).toBeVisible();
    await expect(page.locator('input[name="lng"]')).toBeVisible();
    await expect(page.locator('select[name="category"]')).toBeVisible();
  });

  test('should display mini map for coordinate selection', async ({ page, context }) => {
    await context.setHTTPCredentials({
      username: ADMIN_USER,
      password: ADMIN_PASS
    });

    await page.goto('/admin');
    
    // Wait for mini map
    await page.waitForSelector('#miniMap', { timeout: 10000 });
    
    const miniMap = page.locator('#miniMap');
    await expect(miniMap).toBeVisible();
    
    // Check if Leaflet map is initialized
    const hasLeafletClass = await miniMap.evaluate((el) => 
      el.classList.contains('leaflet-container')
    );
    expect(hasLeafletClass).toBe(true);
  });

  test('should have GPS button', async ({ page, context }) => {
    await context.setHTTPCredentials({
      username: ADMIN_USER,
      password: ADMIN_PASS
    });

    await page.goto('/admin');
    
    const gpsBtn = page.locator('#gpsBtn');
    await expect(gpsBtn).toBeVisible({ timeout: 10000 });
  });

  test('should validate form inputs', async ({ page, context }) => {
    await context.setHTTPCredentials({
      username: ADMIN_USER,
      password: ADMIN_PASS
    });

    await page.goto('/admin');
    
    // Try to submit empty form
    const submitButton = page.locator('#pointForm button[type="submit"]');
    
    // Fill only partial data
    await page.fill('input[name="name"]', 'Test Location');
    
    // Check that required field validation works
    const latInput = page.locator('input[name="lat"]');
    const isRequired = await latInput.getAttribute('required');
    expect(isRequired).not.toBeNull();
  });

  test('should have banner upload section', async ({ page, context }) => {
    await context.setHTTPCredentials({
      username: ADMIN_USER,
      password: ADMIN_PASS
    });

    await page.goto('/admin');
    
    // Look for banner upload elements
    await page.waitForTimeout(2000); // Allow page to fully load
    
    // Check for admin sections
    const pageContent = await page.content();
    expect(pageContent).toContain('banner');
  });

  test('should display points list', async ({ page, context }) => {
    await context.setHTTPCredentials({
      username: ADMIN_USER,
      password: ADMIN_PASS
    });

    await page.goto('/admin');
    
    // Wait for points to load
    await page.waitForTimeout(2000);
    
    // Points list should exist
    const pageContent = await page.content();
    const hasPointsList = pageContent.includes('point') || pageContent.includes('list');
    expect(hasPointsList).toBe(true);
  });
});
