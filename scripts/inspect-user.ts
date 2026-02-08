
import { initializeApp } from "firebase/app";
import { getFirestore, doc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
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

async function inspectUser(email: string) {
    console.log(`🔍 Inspecting user profile for: ${email}...`);
    try {
        const q = query(collection(db, "users"), where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log("❌ No user found with that email.");
            return;
        }

        for (const document of querySnapshot.docs) {
            const data = document.data();
            console.log("✅ User found:");
            console.log(JSON.stringify(data, null, 2));

            if (data.role !== 'owneradmin') {
                console.log("⚠️ Role is not owneradmin. Updating...");
                await updateDoc(doc(db, "users", document.id), { role: 'owneradmin' });
                console.log("✅ Role updated to owneradmin!");
            } else {
                console.log("✅ User already has owneradmin role.");
            }
        }

    } catch (error: any) {
        console.error("❌ Error:", error.message);
    }
}

const args = process.argv.slice(2);
if (args.length < 1) {
    console.log("Usage: npx tsx scripts/inspect-user.ts <email>");
    process.exit(1);
}

inspectUser(args[0]);
