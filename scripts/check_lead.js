const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const dbId = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID;
const db = dbId ? getFirestore(app, dbId) : getFirestore(app);

async function checkLead(id) {
    try {
        const d = await getDoc(doc(db, 'leads', id));
        if (d.exists()) {
            console.log('Lead Found:', JSON.stringify(d.data(), null, 2));
        } else {
            console.log('Lead Not Found');
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

checkLead('5FBF7649-FE60-4A28-9F22-635132127689');
