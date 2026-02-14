
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

// Since I don't have a service account JSON, I can't easily use firebase-admin 
// unless I'm in an environment that has it.
// However, I can try to use the client SDK with the env variables.

const { initializeApp: initializeClientApp } = require('firebase/app');
const { getFirestore: getClientFirestore, collection, getDocs, limit, query } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
};

async function testLeads() {
    console.log("Testing Firestore Connection...");
    try {
        const app = initializeClientApp(firebaseConfig);
        const dbId = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID;
        const db = dbId ? getClientFirestore(app, dbId) : getClientFirestore(app);

        console.log(`Connecting to Project: ${firebaseConfig.projectId}, Database: ${dbId || '(default)'}`);

        const q = query(collection(db, "leads"), limit(5));
        const snapshot = await getDocs(q);

        console.log(`Successfully fetched ${snapshot.size} leads.`);
        snapshot.forEach(doc => {
            console.log(` - Lead ID: ${doc.id}, Name: ${doc.data().data?.name || 'N/A'}`);
        });
    } catch (error) {
        console.error("Firestore Test Failed:", error);
    }
}

testLeads();
