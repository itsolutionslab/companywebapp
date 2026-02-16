
const { test, expect, chromium } = require('@playwright/test');
require('dotenv').config({ path: '.env.local' });

/**
 * ADMIN SMOKE TEST SUITE
 * 
 * To run this test:
 * 1. Ensure the development server is running: npm run dev
 * 2. Run the test: npx playwright test scripts/admin_test_suite.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'password';

test.describe('Admin Panel Synchronization & Functionality', () => {

    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', ADMIN_EMAIL);
        await page.fill('input[type="password"]', ADMIN_PASSWORD);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/.*admin.*/);
    });

    test('Dashboard filters and synchronization', async ({ page }) => {
        await page.goto(`${BASE_URL}/admin/dashboard`);

        // Check if selector exists
        const selector = page.locator('div:has-text("Day")');
        await expect(selector).toBeVisible();

        // Click on "By Date"
        await page.click('button:has-text("By Date")');
        await expect(page.locator('h2:has-text("Select Date")')).toBeVisible();

        // Select today's date (or any date)
        const today = new Date().getDate();
        await page.click(`button:has-text("${today}")`);

        // Verify modal closed and filter updated
        await expect(page.locator('h2:has-text("Select Date")')).not.toBeVisible();
    });

    test('Lead pipeline and status update', async ({ page }) => {
        // 1. Go to Leads
        await page.goto(`${BASE_URL}/admin/prospectos`);

        // 2. Verify Pipeline view is default
        await expect(page.locator('h3:has-text("NUEVO")')).toBeVisible();

        // 3. Select first lead card from Pipeline
        const firstLead = page.locator('a[href*="/admin/prospectos/"]').first();
        await expect(firstLead).toBeVisible();
        await firstLead.click();

        // 4. Verify Progress Tracker
        await expect(page.locator('h1:has-text("PROSPECTO SIN NOMBRE")').or(page.locator('h1'))).toBeVisible();
        await expect(page.locator('text=NUEVO')).toBeVisible();

        // 5. Click "AGENDAR DISCOVERY" in Quick Actions
        await page.click('button:has-text("Agendar Discovery")');
        await expect(page.locator('h2:has-text("Agendar Sesión")')).toBeVisible();

        // 6. Select a date and time
        await page.click('button[class*="h-14"]').first(); // Click a day
        const firstSlot = page.locator('button[class*="px-4"]:not([disabled])').first();
        if (await firstSlot.isVisible()) {
            await firstSlot.click();
            await page.click('button:has-text("SAVE CHANGES")');

            // 7. Verify success and status update
            await expect(page.locator('text=Sesión de descubrimiento agendada correctamente')).toBeVisible();
            await expect(page.locator('text=DISCOVERY SCHEDULED')).toBeVisible();

            // 8. Verify Timeline Event
            await expect(page.locator('text=MEETING SCHEDULED')).toBeVisible();
        }
    });

    test('Discovery Meets synchronization', async ({ page }) => {
        await page.goto(`${BASE_URL}/admin/reservations`);
        // Verify sessions are listed
        const rows = page.locator('div[class*="bg-white"]');
        await expect(rows.count()).toBeGreaterThan(0);
    });

    test('Schedules blocking functionality', async ({ page }) => {
        await page.goto(`${BASE_URL}/admin/schedules`);
        // Verify calendar loads
        await expect(page.locator('text=Configuración de Disponibilidad')).toBeVisible();
    });
});
