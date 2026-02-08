
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
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

async function createAdmin(email: string, pass: string, name: string) {
    console.log(`Creating admin: ${email}...`);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            name,
            email,
            role: "admin",
            created_at: new Date().toISOString()
        });

        console.log("✅ Admin created successfully!");
        console.log(`UID: ${user.uid}`);

        await signOut(auth);
    } catch (error: any) {
        console.error("❌ Error creating admin:", error.message);
    }
}

// Usage: node -r ts-node/register scripts/create-admin.ts <email> <password> <name>
const args = process.argv.slice(2);
if (args.length < 3) {
    console.log("Usage: npx tsx scripts/create-admin.ts <email> <password> <name>");
    process.exit(1);
}

createAdmin(args[0], args[1], args[2]);
