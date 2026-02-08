import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const dbId = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID;
const db = dbId ? getFirestore(app, dbId) : getFirestore(app);

async function checkUserRole(email: string) {
    console.log(`🔍 Checking user role for: ${email}...\n`);

    try {
        const q = query(collection(db, "users"), where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log("❌ ERROR: No user found in Firestore 'users' collection with that email.");
            console.log("📋 ACTION REQUIRED: Create the user document first using scripts/setup-root.ts\n");
            return;
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        console.log("✅ User found in Firestore:");
        console.log(`   UID: ${userDoc.id}`);
        console.log(`   Email: ${userData.email}`);
        console.log(`   Role: ${userData.role || 'NOT SET'}`);
        console.log(`   Full Name: ${userData.full_name || 'N/A'}`);
        console.log(`   Created: ${userData.created_at || 'N/A'}\n`);

        // Check if role is valid
        const validRoles = ['owneradmin', 'admin', 'staff'];
        if (!userData.role) {
            console.log("❌ PROBLEM: User has NO ROLE assigned!");
            console.log("📋 FIX: User needs a role to access admin panel\n");
        } else if (!validRoles.includes(userData.role)) {
            console.log(`⚠️  WARNING: Role '${userData.role}' is not a standard admin role`);
            console.log(`📋 Valid admin roles: ${validRoles.join(', ')}\n`);
        } else {
            console.log(`✅ Role is valid: Users with '${userData.role}' can access leads\n`);
        }

        // Check custom claims
        console.log("🔐 Custom Claims Status:");
        console.log("   Note: Custom claims are used for Storage rules validation");
        console.log("   Run scripts/set-admin.ts to set custom claims for this user\n");

    } catch (error: any) {
        console.error("❌ Error:", error.message);
    }
}

const args = process.argv.slice(2);
if (args.length < 1) {
    console.log("Usage: npx tsx scripts/check-user-role.ts <email>");
    process.exit(1);
}

checkUserRole(args[0]);
