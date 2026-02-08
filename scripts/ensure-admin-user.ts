import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Initialize Firebase Admin
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

async function ensureAdminUser(email: string, password: string, fullName: string) {
    console.log(`🚀 Ensuring admin user exists: ${email}...\n`);

    try {
        const auth = getAuth(admin.app());
        let user;

        // Try to get existing user
        try {
            user = await auth.getUserByEmail(email);
            console.log(`✅ User already exists in Firebase Auth`);
            console.log(`   UID: ${user.uid}`);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // Create new user
                console.log(`📝 Creating new user in Firebase Auth...`);
                user = await auth.createUser({
                    email: email,
                    password: password,
                    displayName: fullName
                });
                console.log(`✅ User created in Firebase Auth`);
                console.log(`   UID: ${user.uid}`);
            } else {
                throw error;
            }
        }

        // Check Firestore document
        const userDocRef = db.collection("users").doc(user.uid);
        const userDoc = await userDocRef.get();

        if (userDoc.exists) {
            const data = userDoc.data();
            console.log(`\n✅ User document exists in Firestore`);
            console.log(`   Current role: ${data?.role}`);

            // Update role if needed
            if (data?.role !== 'owneradmin') {
                console.log(`   ⚠️  Role is not owneradmin, updating...`);
                await userDocRef.update({
                    role: 'owneradmin',
                    updated_at: new Date().toISOString()
                });
                console.log(`   ✅ Role updated to owneradmin`);
            }
        } else {
            // Create Firestore document
            console.log(`\n📝 Creating Firestore user document...`);
            await userDocRef.set({
                uid: user.uid,
                email: email,
                full_name: fullName,
                role: 'owneradmin',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
            console.log(`✅ Firestore document created`);
        }

        // Set custom claims
        console.log(`\n🔐 Setting custom claims...`);
        await auth.setCustomUserClaims(user.uid, { role: 'owneradmin' });
        console.log(`✅ Custom claims set`);

        console.log(`\n✅ SUCCESS! Admin user is fully configured:`);
        console.log(`   Email: ${email}`);
        console.log(`   UID: ${user.uid}`);
        console.log(`   Role: owneradmin`);
        console.log(`\n🎉 You can now log in to the admin panel!`);

    } catch (error: any) {
        console.error("\n❌ Error:", error.message);

        if (error.message.includes('Could not load the default credentials')) {
            console.log(`\n💡 TIP: This script requires Firebase Admin credentials.`);
            console.log(`   You have two options:`);
            console.log(`   1. Run this from Google Cloud Shell (has automatic credentials)`);
            console.log(`   2. Set GOOGLE_APPLICATION_CREDENTIALS environment variable`);
            console.log(`\n   OR manually create the user in Firebase Console:`);
            console.log(`   - Go to Authentication → Add User`);
            console.log(`   - Then go to Firestore → users collection → Add Document:`);
            console.log(`     Document ID: [the UID from Authentication]`);
            console.log(`     Fields:`);
            console.log(`       - email: "${email}"`);
            console.log(`       - role: "owneradmin"`);
            console.log(`       - full_name: "${fullName}"`);
            console.log(`       - created_at: [current timestamp]`);
        }
    }
}

const args = process.argv.slice(2);
if (args.length < 3) {
    console.log("Usage: npx tsx scripts/ensure-admin-user.ts <email> <password> <fullName>");
    console.log('Example: npx tsx scripts/ensure-admin-user.ts admin@example.com "MyPassword123!" "Admin User"');
    process.exit(1);
}

ensureAdminUser(args[0], args[1], args[2]);
