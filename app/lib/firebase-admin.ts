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

/**
 * Robustly repairs a Firebase Private Key from environment variables.
 * Handles \n escaping, double escaping, quoting, and Base64 encoding.
 */
function repairPrivateKey(key: string | undefined): string | undefined {
    if (!key) return undefined;

    let repaired = key.trim();

    // Check if it looks like Base64 (no PEM headers, potentially long single block)
    if (!repaired.includes('-----BEGIN PRIVATE KEY-----') && !repaired.includes('\n') && repaired.length > 500) {
        try {
            const decoded = Buffer.from(repaired, 'base64').toString('utf8');
            if (decoded.includes('-----BEGIN PRIVATE KEY-----')) {
                repaired = decoded;
            }
        } catch (e) {
            // Not base64, continue with standard parsing
        }
    }

    repaired = repaired
        .replace(/\\n/g, '\n')         // Convert literal \n to actual newlines
        .replace(/\\\\n/g, '\n')       // Handle double-escaped \n
        .replace(/^"(.*)"$/, '$1')     // Remove wrapping double quotes
        .replace(/^'(.*)'$/, '$1')     // Remove wrapping single quotes
        .trim();

    // Ensure PEM headers/footers are present
    if (!repaired.includes('-----BEGIN PRIVATE KEY-----')) {
        repaired = `-----BEGIN PRIVATE KEY-----\n${repaired}`;
    }
    if (!repaired.includes('-----END PRIVATE KEY-----')) {
        repaired = `${repaired}\n-----END PRIVATE KEY-----`;
    }

    // Standardize newlines for OpenSSL/gRPC
    if (!repaired.endsWith('\n')) repaired += '\n';

    return repaired;
}

const firebaseAdminConfig = {
    projectId,
    clientEmail,
    privateKey: repairPrivateKey(privateKey),
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
