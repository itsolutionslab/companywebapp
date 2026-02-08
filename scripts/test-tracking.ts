
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, Timestamp } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
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
const db = getFirestore(app, dbId || "(default)");

async function simulateLead() {
    console.log("Simulating lead submission...");
    const leadId = uuidv4();

    const leadData = {
        lead_id: leadId,
        status_flow: {
            current: 'LEAD_NEW',
            history: [{ status: 'LEAD_NEW', timestamp: new Date().toISOString(), notes: 'Simulated Lead' }]
        },
        audit_logs: {
            created_at: Timestamp.now(),
            updated_at: Timestamp.now(),
            ip: '127.0.0.1',
            user_agent: 'Mock Browser',
            geo_location: { city: 'Lima', country: 'Peru' }
        },
        source_attribution: {
            landing_page: 'PE_LANDING',
            utm_source: 'test_script',
            utm_medium: 'cli'
        },
        data: {
            name: 'Test Prospecto ' + Math.floor(Math.random() * 1000),
            email: 'test@example.com',
            phone: '+51 999 888 777',
            project_desc: 'Este es un lead de prueba generado por el script de simulación.'
        },
        kpis: {
            session_duration: 120,
            clicks_count: 5,
            pages_visited: 2
        },
        priority: 'MEDIUM'
    };

    try {
        await addDoc(collection(db, "leads"), leadData);
        console.log("✅ Simulated lead saved successfully!");
    } catch (error: any) {
        console.error("❌ Error saving lead:", error.message);
    }
}

simulateLead();
