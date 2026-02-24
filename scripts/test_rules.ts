import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function testRules() {
    console.log("--- Starting Security Rules Verification ---");
    console.log("Project ID:", firebaseConfig.projectId);

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app, (process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID as any));

    console.log("\n[Test 1] Attempting UNAUTHORIZED direct write to 'leads'...");
    try {
        const dummyLead = {
            name: "Attacker Bot",
            status_flow: { current: "LEAD_DRAFT" },
            audit_logs: { created_at: new Date() }
        };

        await addDoc(collection(db, "leads"), dummyLead);
        console.log("❌ FAILURE: Direct write was ALLOWED. Security rules are too loose!");
    } catch (error: any) {
        if (error.message.includes("permission-denied") || error.code === "permission-denied") {
            console.log("✅ SUCCESS: Direct write was BLOCKED by security rules.");
        } else {
            console.log("❓ UNKNOWN ERROR:", error.message);
        }
    }

    console.log("\n[Test 2] Attempting UNAUTHORIZED direct write to 'interactions'...");
    try {
        const dummyInteraction = {
            event_type: "bot_attack",
            session_id: "malicious-session"
        };

        await addDoc(collection(db, "interactions"), dummyInteraction);
        console.log("❌ FAILURE: Direct write to interactions was ALLOWED.");
    } catch (error: any) {
        if (error.message.includes("permission-denied") || error.code === "permission-denied") {
            console.log("✅ SUCCESS: Direct write to interactions was BLOCKED.");
        } else {
            console.log("❓ UNKNOWN ERROR:", error.message);
        }
    }

    console.log("\n--- Verification Complete ---");
    process.exit(0);
}

testRules().catch(err => {
    console.error("Test failed to execute:", err);
    process.exit(1);
});
