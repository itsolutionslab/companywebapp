#!/usr/bin/env node

/**
 * Google Tag Manager Verification Script
 * 
 * This script verifies that GTM has been correctly configured in the Next.js application.
 * It checks:
 * 1. Environment variables are set
 * 2. GTM implementation is present in the layout
 * 3. Provides manual verification instructions for the browser
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
    console.log('');
    log('═'.repeat(60), 'cyan');
    log(message, 'bright');
    log('═'.repeat(60), 'cyan');
    console.log('');
}

function logSuccess(message) {
    log(`✓ ${message}`, 'green');
}

function logError(message) {
    log(`✗ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠ ${message}`, 'yellow');
}

function logInfo(message) {
    log(`ℹ ${message}`, 'blue');
}

// Main verification function
function verifyGTM() {
    let hasErrors = false;

    logHeader('Google Tag Manager Verification');

    // Step 1: Check .env.local file
    log('Step 1: Checking environment variables...', 'cyan');
    const envPath = path.join(process.cwd(), '.env.local');

    if (!fs.existsSync(envPath)) {
        logError('.env.local file not found!');
        hasErrors = true;
    } else {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const gtmIdMatch = envContent.match(/NEXT_PUBLIC_GTM_ID=(.+)/);

        if (!gtmIdMatch) {
            logError('NEXT_PUBLIC_GTM_ID not found in .env.local');
            hasErrors = true;
        } else {
            const gtmId = gtmIdMatch[1].trim();

            if (!gtmId) {
                logError('NEXT_PUBLIC_GTM_ID is empty');
                hasErrors = true;
            } else if (!gtmId.startsWith('GTM-')) {
                logWarning(`GTM ID format may be incorrect: ${gtmId}`);
                logInfo('Expected format: GTM-XXXXXXX');
            } else if (gtmId === 'GTM-XXXXXXX') {
                logWarning('GTM ID is still using placeholder: GTM-XXXXXXX');
                logInfo('Replace this with your actual GTM Container ID');
            } else {
                logSuccess(`GTM ID found: ${gtmId}`);
            }
        }
    }

    console.log('');

    // Step 2: Check layout.tsx implementation
    log('Step 2: Checking layout.tsx implementation...', 'cyan');
    const layoutPath = path.join(process.cwd(), 'app', 'layout.tsx');

    if (!fs.existsSync(layoutPath)) {
        logError('app/layout.tsx not found!');
        hasErrors = true;
    } else {
        const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

        // Check for GoogleTagManager import
        if (!layoutContent.includes('GoogleTagManager')) {
            logError('GoogleTagManager component not imported in layout.tsx');
            hasErrors = true;
        } else {
            logSuccess('GoogleTagManager component imported');
        }

        // Check for component usage
        if (!layoutContent.includes('<GoogleTagManager')) {
            logError('GoogleTagManager component not used in layout.tsx');
            hasErrors = true;
        } else {
            logSuccess('GoogleTagManager component implemented');
        }

        // Check for gtmId prop
        if (!layoutContent.includes('gtmId=')) {
            logError('gtmId prop not passed to GoogleTagManager');
            hasErrors = true;
        } else {
            logSuccess('gtmId prop configured');
        }
    }

    console.log('');

    // Step 3: Check GTMClickEvent component
    log('Step 3: Checking GTMClickEvent component...', 'cyan');
    const componentPath = path.join(process.cwd(), 'app', 'components', 'GTMClickEvent.tsx');

    if (!fs.existsSync(componentPath)) {
        logError('app/components/GTMClickEvent.tsx not found!');
        hasErrors = true;
    } else {
        const componentContent = fs.readFileSync(componentPath, 'utf-8');

        if (!componentContent.includes("'use client'")) {
            logError('GTMClickEvent is not marked as a client component');
            hasErrors = true;
        } else {
            logSuccess('GTMClickEvent is a client component');
        }

        if (!componentContent.includes('sendGTMEvent')) {
            logError('sendGTMEvent function not found');
            hasErrors = true;
        } else {
            logSuccess('sendGTMEvent function available');
        }

        if (!componentContent.includes('useGTMEvent')) {
            logWarning('useGTMEvent hook not found (optional)');
        } else {
            logSuccess('useGTMEvent hook available');
        }
    }

    console.log('');

    // Summary
    logHeader('Verification Summary');

    if (hasErrors) {
        logError('Verification failed! Please fix the errors above.');
        console.log('');
        return false;
    } else {
        logSuccess('All checks passed! ✨');
        console.log('');
    }

    // Browser verification instructions
    logHeader('Browser Verification Instructions');

    log('1. Start your development server:', 'bright');
    logInfo('   npm run dev');
    console.log('');

    log('2. Open your browser to: http://localhost:3000', 'bright');
    console.log('');

    log('3. Open Browser DevTools (F12 or Cmd+Option+I)', 'bright');
    console.log('');

    log('4. Go to the "Console" tab and run:', 'bright');
    logInfo('   dataLayer');
    console.log('');
    log('   Expected output: Array with GTM events', 'yellow');
    console.log('');

    log('5. Go to the "Network" tab:', 'bright');
    logInfo('   • Filter for "gtm"');
    logInfo('   • Reload the page');
    logInfo('   • Look for: gtm.js?id=GTM-XXXXXXX');
    console.log('');

    log('6. Go to the "Elements" tab:', 'bright');
    logInfo('   • Search for "googletagmanager"');
    logInfo('   • You should find <noscript> with GTM iframe');
    console.log('');

    log('7. Optional - Install GTM debugger extension:', 'bright');
    logInfo('   Chrome: Tag Assistant Legacy');
    logInfo('   Firefox: GTM Container Preview');
    console.log('');

    logHeader('Quick Verification Command');
    log('Run this in your browser console:', 'cyan');
    log('', 'reset');
    log('if (typeof dataLayer !== "undefined") {', 'yellow');
    log('  console.log("✓ GTM dataLayer is loaded!");', 'yellow');
    log('  console.log("Events:", dataLayer);', 'yellow');
    log('} else {', 'yellow');
    log('  console.error("✗ GTM dataLayer not found!");', 'yellow');
    log('}', 'yellow');
    console.log('');

    log('═'.repeat(60), 'cyan');
    console.log('');

    return true;
}

// Run verification
try {
    const success = verifyGTM();
    process.exit(success ? 0 : 1);
} catch (error) {
    logError(`Verification failed with error: ${error.message}`);
    console.error(error);
    process.exit(1);
}
