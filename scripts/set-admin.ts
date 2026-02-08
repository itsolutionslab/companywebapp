
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Try to initialize without explicit credentials
try {
    if (admin.apps.length === 0) {
        admin.initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
    }
} catch (e) {
    console.log("Admin initialization error:", e);
}

const dbId = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID;
const db = getFirestore(admin.app(), dbId || "(default)");

async function setAdminRole(email: string) {
    console.log(`🚀 Setting ADMIN role for: ${email}...`);
    try {
        const auth = getAuth(admin.app());
        const user = await auth.getUserByEmail(email);

        if (!user) {
            console.log("❌ User not found in Firebase Auth.");
            return;
        }

        console.log(`✅ Found Auth User: ${user.uid}`);

        // Update Firestore
        await db.collection("users").doc(user.uid).set({
            uid: user.uid,
            email: email,
            role: "owneradmin",
            updated_at: new Date().toISOString()
        }, { merge: true });

        console.log("✅ Firestore profile updated to owneradmin!");

        // Also set custom claims
        await auth.setCustomUserClaims(user.uid, { role: "owneradmin" });
        console.log("✅ Custom claims updated to owneradmin!");

    } catch (error: any) {
        console.error("❌ Error:", error.message);
        console.log("\n💡 TIP: If you see 'credential' errors, you may need to set GOOGLE_APPLICATION_CREDENTIALS or provide a service account key.");
    }
}

const args = process.argv.slice(2);
if (args.length < 1) {
    console.log("Usage: npx tsx scripts/set-admin.ts <email>");
    process.exit(1);
}

setAdminRole(args[0]);
