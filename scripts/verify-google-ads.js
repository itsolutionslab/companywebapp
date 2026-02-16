#!/usr/bin/env node

/**
 * Google Ads & GTM Verification Script
 * Verifies that Google Ads (gtag.js) and Google Tag Manager are properly installed
 */

const puppeteer = require('puppeteer');

async function verifyGoogleAds() {
    console.log('🔍 Verifying Google Ads and GTM installation...\n');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Navigate to the landing page
        console.log('📄 Loading http://localhost:3000/us...');
        await page.goto('http://localhost:3000/us', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // Check for gtag script
        const gtagScriptExists = await page.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script'));
            return scripts.some(script =>
                script.src && script.src.includes('googletagmanager.com/gtag/js?id=AW-17950295820')
            );
        });

        // Check for GTM
        const gtmExists = await page.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script'));
            return scripts.some(script =>
                script.src && script.src.includes('googletagmanager.com/gtm.js')
            );
        });

        // Check for dataLayer
        const dataLayerExists = await page.evaluate(() => {
            return typeof window.dataLayer !== 'undefined';
        });

        // Check for gtag function
        const gtagFunctionExists = await page.evaluate(() => {
            return typeof window.gtag === 'function';
        });

        // Check Google Ads config
        const googleAdsConfigExists = await page.evaluate(() => {
            return window.dataLayer && window.dataLayer.some(item =>
                item && item[0] === 'config' && item[1] === 'AW-17950295820'
            );
        });

        // Report results
        console.log('\n📊 Verification Results:\n');
        console.log(`${gtagScriptExists ? '✅' : '❌'} Google Ads Script (gtag.js) loaded`);
        console.log(`${gtmExists ? '✅' : '❌'} Google Tag Manager (GTM) loaded`);
        console.log(`${dataLayerExists ? '✅' : '❌'} dataLayer initialized`);
        console.log(`${gtagFunctionExists ? '✅' : '❌'} gtag() function available`);
        console.log(`${googleAdsConfigExists ? '✅' : '❌'} Google Ads config (AW-17950295820) initialized`);

        if (gtagScriptExists && dataLayerExists && gtagFunctionExists && googleAdsConfigExists) {
            console.log('\n✨ Success! Google Ads is properly installed and configured.');
            console.log('🔍 You can now verify in Google Ads using the Tag Assistant or Debugger.');
        } else {
            console.log('\n⚠️  Some issues detected. Please check the implementation.');
        }

        // Additional debugging info
        console.log('\n🔧 Debug Info:');
        const dataLayerContent = await page.evaluate(() => {
            return JSON.stringify(window.dataLayer, null, 2);
        });
        console.log('dataLayer content:', dataLayerContent);

    } catch (error) {
        console.error('❌ Error during verification:', error.message);
    } finally {
        await browser.close();
    }
}

// Run verification
verifyGoogleAds().catch(console.error);
