const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api/leads'; // Adjust if needed

async function testLeadCapture() {
    console.log('--- Starting Lead Capture Security Tests ---');

    // 1. Test empty body
    console.log('\n[Test 1] Sending empty body...');
    const res1 = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    console.log('Status:', res1.status);
    const data1 = await res1.json();
    console.log('Response:', data1.success === false ? 'PASS (Rejected)' : 'FAIL (Accepted)');

    // 2. Test invalid email
    console.log('\n[Test 2] Sending invalid email...');
    const res2 = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test',
            email: 'invalid-email',
            company: 'Test Co',
            role: 'ceo',
            objectives: ['new'],
            stage: 'idea',
            timeline: 'now',
            investment_level: 'low',
            impact: 'Test impact description long enough',
            decision_maker: 'yes',
            turnstile_token: 'dummy'
        })
    });
    console.log('Status:', res2.status);
    const data2 = await res2.json();
    console.log('Response:', data2.success === false ? 'PASS (Rejected)' : 'FAIL (Accepted)');

    // 3. Test missing turnstile token
    console.log('\n[Test 3] Sending missing turnstile token...');
    const res3 = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test',
            email: 'valid@email.com',
            company: 'Test Co',
            role: 'ceo',
            objectives: ['new'],
            stage: 'idea',
            timeline: 'now',
            investment_level: 'low',
            impact: 'Test impact description long enough',
            decision_maker: 'yes',
            turnstile_token: ''
        })
    });
    console.log('Status:', res3.status);
    const data3 = await res3.json();
    console.log('Response:', data3.success === false ? 'PASS (Rejected)' : 'FAIL (Accepted)');

    console.log('\n--- Security Tests Completed ---');
}

// In a real environment, we'd run this against a dev server
testLeadCapture();
