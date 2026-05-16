
const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const databaseId = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
    console.error("Missing environment variables");
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
    })
});

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore(admin.apps[0], databaseId);

async function runCheck() {
    console.log(`Diagnostic for database: ${databaseId} in project: ${projectId}`);
    
    try {
        const usersSnapshot = await db.collection('users').get();
        console.log(`Total users found: ${usersSnapshot.size}`);
        
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`- User: ${data.full_name || 'N/A'} (${doc.id})`);
            console.log(`  Email: ${data.email}`);
            console.log(`  Role: ${data.role}`);
        });

        // Also check one lead to see if they exist
        const leadsSnapshot = await db.collection('leads').limit(1).get();
        console.log(`\nLeads check: ${leadsSnapshot.size > 0 ? 'Found' : 'Empty'}`);
        
    } catch (e) {
        console.error("Error during diagnostic:", e);
    }
}

runCheck();
