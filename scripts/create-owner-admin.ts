import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
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
const auth = getAuth(app);
const dbId = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID;
const db = dbId ? getFirestore(app, dbId) : getFirestore(app);

async function createOwnerAdminUser(email: string, password: string) {
    console.log(`🚀 Creating/Updating owner admin user: ${email}...\n`);

    try {
        // Step 1: Sign in with the user credentials
        console.log("📝 Step 1: Authenticating user...");
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log(`✅ Authenticated successfully!`);
        console.log(`   UID: ${user.uid}`);
        console.log(`   Email: ${user.email}\n`);

        // Step 2: Check if user document exists
        console.log("📝 Step 2: Checking Firestore document...");
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const existingData = userDocSnap.data();
            console.log(`⚠️  Document already exists`);
            console.log(`   Current role: ${existingData.role || 'NOT SET'}\n`);

            if (existingData.role === 'owneradmin') {
                console.log(`✅ User already has owneradmin role. Nothing to update.\n`);
            } else {
                console.log(`📝 Step 3: Updating role to owneradmin...`);
                await setDoc(userDocRef, {
                    ...existingData,
                    role: 'owneradmin',
                    updated_at: new Date().toISOString()
                }, { merge: true });
                console.log(`✅ Role updated to owneradmin!\n`);
            }
        } else {
            // Step 3: Create new user document
            console.log(`📝 Step 3: Creating Firestore document...`);
            const userData = {
                uid: user.uid,
                email: user.email,
                full_name: "BRECOMPERU Admin",
                role: "owneradmin",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            await setDoc(userDocRef, userData);
            console.log(`✅ Firestore document created successfully!\n`);
        }

        // Step 4: Verify the document
        console.log("📝 Step 4: Verifying document...");
        const verifyDoc = await getDoc(userDocRef);
        if (verifyDoc.exists()) {
            const finalData = verifyDoc.data();
            console.log(`✅ Verification successful!`);
            console.log(`   UID: ${finalData.uid}`);
            console.log(`   Email: ${finalData.email}`);
            console.log(`   Role: ${finalData.role}`);
            console.log(`   Full Name: ${finalData.full_name}\n`);
        } else {
            console.log(`❌ ERROR: Document was not created properly!\n`);
        }

        // Sign out
        await signOut(auth);
        console.log(`🎉 SUCCESS! User is fully configured as owner admin.`);
        console.log(`\n✅ You can now log in to the admin panel with:`);
        console.log(`   Email: ${email}`);
        console.log(`   Password: [your password]\n`);

    } catch (error: any) {
        console.error("\n❌ ERROR:", error.message);
        console.error("   Code:", error.code || 'unknown');

        // Specific error handling
        if (error.code === 'auth/user-not-found') {
            console.log(`\n💡 SOLUTION: The user doesn't exist in Firebase Authentication.`);
            console.log(`   Create the user first in Firebase Console:`);
            console.log(`   1. Go to Authentication → Users`);
            console.log(`   2. Click "Add User"`);
            console.log(`   3. Email: ${email}`);
            console.log(`   4. Set a password`);
            console.log(`   5. Then run this script again\n`);
        } else if (error.code === 'auth/wrong-password') {
            console.log(`\n💡 SOLUTION: The password is incorrect.`);
            console.log(`   Make sure you're using the correct password for ${email}\n`);
        } else if (error.code === 'permission-denied' || error.message.includes('Missing or insufficient permissions')) {
            console.log(`\n💡 SOLUTION: Firestore rules are blocking the write.`);
            console.log(`   This might be because:`);
            console.log(`   1. The rules haven't been deployed yet`);
            console.log(`   2. The rules don't allow users to create their own documents`);
            console.log(`   \n   You'll need to create the document manually in Firebase Console.`);
            console.log(`   Follow the guide: create_firestore_user_guide.md\n`);
        } else if (error.code === 'auth/network-request-failed') {
            console.log(`\n💡 SOLUTION: Network error. Check your internet connection.\n`);
        }

        process.exit(1);
    }
}

const args = process.argv.slice(2);
if (args.length < 2) {
    console.log("Usage: npx tsx scripts/create-owner-admin.ts <email> <password>");
    console.log('Example: npx tsx scripts/create-owner-admin.ts management@brecomperu.com "Brecom2026!"');
    process.exit(1);
}

createOwnerAdminUser(args[0], args[1]);
