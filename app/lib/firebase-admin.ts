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

    // 1. Detect and decode Base64 if applicable
    if (!repaired.includes('-----BEGIN PRIVATE KEY-----') && !repaired.includes('\n') && repaired.length > 500) {
        try {
            const decoded = Buffer.from(repaired, 'base64').toString('utf8');
            if (decoded.includes('-----BEGIN PRIVATE KEY-----')) {
                repaired = decoded;
            }
        } catch (e) {
            // Not valid Base64 or doesn't contain the header after decoding
        }
    }

    // 2. Initial cleanup of common formatting issues
    repaired = repaired
        .replace(/\\n/g, '\n')         // Convert literal \n to actual newlines
        .replace(/\\\\n/g, '\n')       // Handle double-escaped \n
        .trim();

    // Remove wrapping quotes (very robustly for multiline)
    while ((repaired.startsWith('"') && repaired.endsWith('"')) ||
        (repaired.startsWith("'") && repaired.endsWith("'"))) {
        repaired = repaired.slice(1, -1).trim();
    }

    // 3. Handle cases where newlines were converted to spaces (common in some dashboards)
    // We only do this if the key doesn't have enough newlines
    if (repaired.includes('-----BEGIN PRIVATE KEY-----') && (repaired.match(/\n/g) || []).length < 20) {
        // PEM keys have many newlines. If a long key has few, it's likely space-joined.
        const body = repaired
            .replace('-----BEGIN PRIVATE KEY-----', '')
            .replace('-----END PRIVATE KEY-----', '')
            .trim();

        if (!body.includes('\n')) {
            // Reconstruct with 64-char chunks
            const chunks = body.replace(/\s/g, '').match(/.{1,64}/g) || [];
            repaired = `-----BEGIN PRIVATE KEY-----\n${chunks.join('\n')}\n-----END PRIVATE KEY-----\n`;
        }
    }

    // 4. Final safety check on headers/footers
    if (!repaired.includes('-----BEGIN PRIVATE KEY-----')) {
        repaired = `-----BEGIN PRIVATE KEY-----\n${repaired}`;
    }
    if (!repaired.includes('-----END PRIVATE KEY-----')) {
        repaired = `${repaired}\n-----END PRIVATE KEY-----`;
    }

    // 5. Ensure exactly one trailing newline
    repaired = repaired.replace(/\n+$/, '') + '\n';

    return repaired;
}

function cleanEnvVar(val: string | undefined): string | undefined {
    if (!val) return val;
    let cleaned = val.trim();
    while ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.slice(1, -1).trim();
    }
    return cleaned;
}

const cleanedProjectId = cleanEnvVar(projectId);
const cleanedClientEmail = cleanEnvVar(clientEmail);

const firebaseAdminConfig = {
    projectId: cleanedProjectId,
    clientEmail: cleanedClientEmail,
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

/**
 * Returns a safe diagnostic string about the current private key state.
 * NEVER returns the actual key.
 */
export function getFirebaseKeyState() {
    const key = firebaseAdminConfig.privateKey;
    if (!key) return "MISSING";
    return {
        project_id: cleanedProjectId,
        client_email: cleanedClientEmail,
        length: key.length,
        lines: key.split('\n').length,
        starts_with: key.substring(0, 20),
        ends_with: key.substring(key.length - 20),
        has_new_lines: key.includes('\n'),
        has_header: key.includes('-----BEGIN PRIVATE KEY-----'),
        has_footer: key.includes('-----END PRIVATE KEY-----')
    };
}
