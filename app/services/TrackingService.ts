import { db, storage } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc, setDoc, query, where, getDocs, Timestamp, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { Lead, LeadData, InteractionEvent, LeadStatus } from '../types/tracking';

const SESSION_KEY = 'user_session_id';
const LEAD_ID_KEY = 'current_lead_id';

class TrackingService {
    sessionId: string;
    startTime: number;
    clicksCount: number = 0;
    sourceRegion: 'US_LANDING' | 'LATAM_LANDING' | 'PE_LANDING' = 'US_LANDING';
    private _leadId: string | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.sessionId = localStorage.getItem(SESSION_KEY) || uuidv4();
            localStorage.setItem(SESSION_KEY, this.sessionId);
            this.startTime = Date.now();
            this._leadId = localStorage.getItem(LEAD_ID_KEY);
        } else {
            this.sessionId = 'server-side';
            this.startTime = Date.now();
        }
    }

    resetLead() {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(LEAD_ID_KEY);
            this._leadId = null;
            this.clicksCount = 0;
            this.startTime = Date.now();
        }
    }

    setRegion(region: string) {
        if (region === 'us') this.sourceRegion = 'US_LANDING';
        else if (region === 'pe') this.sourceRegion = 'PE_LANDING';
        else this.sourceRegion = 'LATAM_LANDING';
    }

    public getUTMParams() {
        if (typeof window === 'undefined') return {};
        const urlParams = new URLSearchParams(window.location.search);
        return {
            utm_source: urlParams.get('utm_source') || null,
            utm_medium: urlParams.get('utm_medium') || null,
            utm_campaign: urlParams.get('utm_campaign') || null,
            utm_term: urlParams.get('utm_term') || null,
            utm_content: urlParams.get('utm_content') || null,
            referrer: document.referrer || null
        };
    }


    private async getIPData() {
        try {
            // Try fetching from primary source
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

            const res = await fetch('https://ipapi.co/json/', {
                signal: controller.signal,
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            }).catch(() => null);

            clearTimeout(timeoutId);

            if (!res || !res.ok) {
                // Silently fail or try backup if needed, but for now just return empty
                return {};
            }

            const data = await res.json();
            return {
                ip: data.ip,
                city: data.city,
                region: data.region,
                country: data.country_name
            };
        } catch (e) {
            // Suppress error to avoid console noise
            return {};
        }
    }

    /**
     * Creates or updates a lead. 
     * If 'LEAD_ID_KEY' exists in local storage, updates that lead.
     * Otherwise creates a new one.
     */
    async saveLeadDraft(data: Partial<LeadData>) {
        console.log("::100---------__TrackingService__saveLeadDraft__==>: saveLeadDraft data: ", data);
        if (!db) return null; // Guard against SSR/no-firebase

        // Use cached ID or fetch from storage
        let leadId = this._leadId;
        if (!leadId && typeof window !== 'undefined') {
            leadId = localStorage.getItem(LEAD_ID_KEY);
        }

        // Ensure we have a valid session ID for the storage path
        if (!this.sessionId || this.sessionId === 'server-side') {
            if (typeof window !== 'undefined') {
                this.sessionId = localStorage.getItem(SESSION_KEY) || uuidv4();
                localStorage.setItem(SESSION_KEY, this.sessionId);
            }
        }

        console.log("::105---------__TrackingService__saveLeadDraft__==>: leadId: ", leadId);
        const isNew = !leadId;

        if (isNew) {
            leadId = uuidv4();
            this._leadId = leadId;
            if (typeof window !== 'undefined') localStorage.setItem(LEAD_ID_KEY, leadId);
        }

        const timestamp = new Date().toISOString();
        const ipData = await this.getIPData();
        const kpis = {
            session_duration: (Date.now() - this.startTime) / 1000,
            clicks_count: this.clicksCount
        };

        try {
            const leadRef = doc(db, 'leads', leadId!);

            // Build a clean, nested update object
            const updateObject: any = {
                kpis: kpis,
                audit_logs: {
                    updated_at: serverTimestamp(),
                    ip: ipData.ip || 'unknown',
                    user_agent: typeof window !== 'undefined' ? navigator.userAgent : '',
                    geo_location: {
                        city: ipData.city || null,
                        country: ipData.country || null,
                        region: ipData.region || null
                    }
                }
            };

            // Handle data nested fields properly for setDoc with merge
            if (data && Object.keys(data).length > 0) {
                updateObject.data = data;
            }

            // If new, add the base fields that don't change
            if (isNew) {
                updateObject.lead_id = leadId;
                updateObject.status_flow = {
                    current: 'LEAD_DRAFT',
                    history: [{ status: 'LEAD_DRAFT', timestamp, notes: 'Initial draft capture' }]
                };
                updateObject.audit_logs.created_at = serverTimestamp();
                updateObject.source_attribution = {
                    ...this.getUTMParams(),
                    landing_page: this.sourceRegion
                };
                updateObject.priority = 'MEDIUM';
            }

            console.log("::156---------__TrackingService__saveLeadDraft__==>: updateObject: ", updateObject);
            /* 
               SECURE CHANGE: We no longer save directly to Firestore from the client.
               All lead data is now sent via the /api/leads secure endpoint.
               This prevents unauthorized writes and bot spam.
            */
            console.log("::162---------__TrackingService__saveLeadDraft__==>: Client-side direct save skipped for security. LeadId: ", leadId);
            return leadId;
        } catch (error: any) {
            console.error("::165---------__TrackingService__saveLeadDraft__==>: ERROR in saveLeadDraft:", error);
            return null;
        }
    }

    async trackEvent(eventType: InteractionEvent['event_type'], metadata: object = {}) {
        this.clicksCount++;

        const leadId = typeof window !== 'undefined' ? localStorage.getItem(LEAD_ID_KEY) : undefined;

        /*
           SECURE CHANGE: Interactions are also restricted. 
           In a high-security environment, we avoid direct writes for any collection.
           If we need analytics, we can move this to a secure tracking API.
        */
        console.log(`[Tracking] Event skipped (Secure rules): ${eventType}`);
    }

    async uploadFile(file: File): Promise<string | null> {
        if (!storage) return null;

        // Validation (Client side - secure rules also enforced on server)
        const validTypes = [
            // Documents
            'application/pdf',
            // Images
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp'
        ];

        if (!validTypes.includes(file.type)) {
            console.error("Invalid file type. Allowed: PDF, Images (JPEG, PNG, GIF, WebP)");
            return null;
        }

        // Updated size limit to match Storage rules (5MB)
        if (file.size > 5 * 1024 * 1024) {
            console.error("File too large. Maximum size: 5MB");
            return null;
        }

        try {
            const fileRef = ref(storage, `leads/${this.sessionId}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(fileRef, file);

            // We return fullPath instead of getDownloadURL because the public user 
            // does NOT have 'read' permissions in Storage rules (only staff does).
            const path = fileRef.fullPath;

            this.trackEvent('file_uploaded', { fileName: file.name, fileSize: file.size, fileType: file.type, path });
            return path;
        } catch (e: any) {
            // Enhanced error messaging
            if (e.code === 'storage/unauthorized') {
                console.error("Storage PERMISSION ERROR: File upload denied. Path: " + `leads/${this.sessionId}/...` + ". Check if Storage Rules allow creation in this path.");
            } else if (e.code === 'storage/retry-limit-exceeded') {
                console.error("Storage CONNECTION ERROR: Ad-blocker or network issue preventing upload.");
            } else {
                console.error("Error uploading file:", e.message);
            }
            return null;
        }
    }

    async updateStatus(status: LeadStatus, notes?: string) {
        const leadId = typeof window !== 'undefined' ? localStorage.getItem(LEAD_ID_KEY) : null;
        if (!leadId) return;

        try {
            // We need to fetch current history first to append, or use arrayUnion if we structured it that way. 
            // Ideally we just update the 'current' field and add to history array.
            // For simplicity in this demo, strict array append might need a transaction or fetching.
            // Let's assume we can just push.
            // Actually, arrayUnion is best for 'history'.

            // BUT, we defined history as an array of objects. 
            // Simple update:
            const leadRef = doc(db, 'leads', leadId);

            /* 
               In a real app, I'd use arrayUnion from firestore. 
               await updateDoc(leadRef, {
                   'status_flow.current': status,
                   'status_flow.history': arrayUnion({ status, timestamp: new Date().toISOString(), notes })
               });
            */
            // Since I didn't import arrayUnion, let's just update 'current' for now to keep it simple and assume backend/admin handles deep history or we do it properly later.
            // Implementing properly:
            await updateDoc(leadRef, {
                'status_flow.current': status,
                'status_flow.history': arrayUnion({ status, timestamp: new Date().toISOString(), notes })
            });

        } catch (e) {
            console.error("Error updating status", e);
        }
    }
}

export const trackingService = new TrackingService();
