import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Missing Firebase Admin credentials in environment variables');
}

const firebaseAdminConfig = {
    projectId,
    clientEmail,
    // Extremely robust key parsing for different production environments (Vercel, Netlify, etc.)
    privateKey: privateKey
        ? privateKey
            .replace(/\\n/g, '\n')        // Convert literal \n to actual newlines
            .replace(/\\\\n/g, '\n')      // Handle double-escaped backslashes
            .replace(/^"(.*)"$/, '$1')    // Remove wrapping double quotes
            .replace(/^'(.*)'$/, '$1')    // Remove wrapping single quotes
            .trim()
        : undefined,
};

const app = !admin.apps.length
    ? admin.initializeApp({
        credential: admin.credential.cert(firebaseAdminConfig as any),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    })
    : admin.app();

// Use the specific database ID if provided, otherwise defaults to '(default)'
const databaseId = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID || '(default)';
export const adminDb = getFirestore(app, databaseId);
export const adminAuth = getAuth(app);
export const adminStorage = getStorage(app);
