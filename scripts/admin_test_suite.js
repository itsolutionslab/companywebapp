
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

    test('Lead scheduling and status update', async ({ page }) => {
        // 1. Go to Leads
        await page.goto(`${BASE_URL}/admin/prospectos`);

        // 2. Select first lead
        const firstLead = page.locator('div[class*="cursor-pointer"]').first();
        await firstLead.click();

        // 3. Click "AGENDAR CITA"
        await page.click('button:has-text("AGENDAR CITA")');
        await expect(page.locator('h2:has-text("AGENDAR SESIÓN")')).toBeVisible();

        // 4. Select a date and time
        // This is more complex depending on availability, but for smoke test we check visibility
        await page.click('button[class*="h-14"]').first(); // Click a day
        const firstSlot = page.locator('button[class*="px-4"]:not([disabled])').first();
        if (await firstSlot.isVisible()) {
            await firstSlot.click();
            await page.click('button:has-text("SAVE CHANGES")');

            // 5. Verify success notification and status
            await expect(page.locator('text=Sesión de descubrimiento agendada correctamente')).toBeVisible();
            await expect(page.locator('text=AGENDADO')).toBeVisible();
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
