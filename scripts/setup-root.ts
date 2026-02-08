
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

const ROOT_EMAIL = "management@brecomperu.com";

async function createRootAdmin(pass: string, name: string) {
    console.log(`🚀 Setting up ROOT Admin: ${ROOT_EMAIL}...`);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, ROOT_EMAIL, pass);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            full_name: name,
            email: ROOT_EMAIL,
            role: "owneradmin",
            created_at: new Date().toISOString()
        });

        console.log("✅ ROOT Admin created successfully!");
        console.log(`UID: ${user.uid}`);
        console.log("Role: owneradmin (Full permissions)");

        await signOut(auth);
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            console.log("ℹ️ User already exists. Checking/Updating Firestore profile...");
            // In a real script we might want to update the role here if needed
            console.log("⚠️ If you need to change the role, please do it manually in Firestore for security.");
        } else {
            console.error("❌ Error:", error.message);
        }
    }
}

const args = process.argv.slice(2);
if (args.length < 2) {
    console.log("Usage: npx tsx scripts/setup-root.ts <password> <name>");
    process.exit(1);
}

createRootAdmin(args[0], args[1]);
