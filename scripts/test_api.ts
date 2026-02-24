import * as dotenv from "dotenv";
import * as path from "path";
// Using native global fetch available in Node 18+

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const API_URL = "http://localhost:3000/api/leads";

/**
 * Basic Base64 encoding + reversal (Matching app/lib/obfuscation.ts)
 */
function obfuscateData(data: any): string {
    const jsonStr = JSON.stringify(data);
    const encoded = Buffer.from(jsonStr).toString('base64');
    return encoded.split('').reverse().join('');
}

async function testAPI() {
    console.log("--- Starting API Security Verification ---");

    console.log("\n[Test 1] Attempting request with RAW JSON (No obfuscation)...");
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ name: "Attacker" }),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (res.status === 400 && data.error.includes("Formato")) {
            console.log("✅ SUCCESS: API rejected raw JSON (Obfuscation required).");
        } else {
            console.log("❌ FAILURE: API responded with status", res.status, data);
        }
    } catch (e: any) {
        console.log("❓ Connection Error (Is the server running?):", e.message);
    }

    console.log("\n[Test 2] Attempting request with WRONG Turnstile token...");
    try {
        const payload = obfuscateData({
            name: "Test User",
            email: "test@example.com",
            phone: "999888777",
            company: "Test Co",
            role: "dev",
            objectives: ["scale"],
            stage: "idea",
            timeline: "now",
            investment_level: "low",
            impact: "test impact",
            decision_maker: "yes",
            turnstile_token: "invalid-token"
        });

        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ payload }),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (res.status === 403 || (res.status === 400 && data.error.includes("seguridad"))) {
            console.log("✅ SUCCESS: API rejected invalid Turnstile token.");
        } else {
            console.log("❌ FAILURE: API responded with status", res.status, data);
        }
    } catch (e: any) {
        console.log("❓ Connection Error:", e.message);
    }

    console.log("\n--- API Verification Complete ---");
}

testAPI();
