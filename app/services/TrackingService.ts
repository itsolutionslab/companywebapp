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

    private getUTMParams() {
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
                    current: 'LEAD_NEW',
                    history: [{ status: 'LEAD_NEW', timestamp, notes: 'Initial capture' }]
                };
                updateObject.audit_logs.created_at = serverTimestamp();
                updateObject.source_attribution = {
                    ...this.getUTMParams(),
                    landing_page: this.sourceRegion
                };
                updateObject.priority = 'MEDIUM';
            }

            console.log("::156---------__TrackingService__saveLeadDraft__==>: updateObject: ", updateObject);
            // setDoc with { merge: true } works perfectly with nested objects to merge sub-fields
            await setDoc(leadRef, updateObject, { merge: true });

            console.log("::162---------__TrackingService__saveLeadDraft__==>: Successfully saved lead: ", leadId);
            return leadId;
        } catch (error) {
            console.error("::165---------__TrackingService__saveLeadDraft__==>: ERROR saving lead:", error);
            return null;
        }
    }

    async trackEvent(eventType: InteractionEvent['event_type'], metadata: object = {}) {
        this.clicksCount++;

        const leadId = typeof window !== 'undefined' ? localStorage.getItem(LEAD_ID_KEY) : undefined;

        const event: InteractionEvent = {
            event_type: eventType,
            timestamp: serverTimestamp(),
            session_id: this.sessionId,
            lead_id: leadId || null,
            metadata,
            url: typeof window !== 'undefined' ? window.location.href : ''
        };

        try {
            await addDoc(collection(db, 'interactions'), event);

            // If it's a significant event, update the lead's KPI
            if (leadId) {
                const leadRef = doc(db, 'leads', leadId);
                await updateDoc(leadRef, {
                    'kpis.clicks_count': this.clicksCount,
                    'kpis.session_duration': (Date.now() - this.startTime) / 1000
                });
            }

        } catch (e: any) {
            if (e.message?.includes('Missing or insufficient permissions')) {
                console.error("Firebase PERMISSION ERROR: Ensure you have applied the Rules from firebase_rules.md in your Firebase Console.");
            } else if (e.message?.includes('blocked-by-client')) {
                console.error("Firebase CONNECTION ERROR: Your ad-blocker is preventing data from being sent to Firebase.");
            } else {
                console.error("Error tracking event", e);
            }
        }
    }

    async uploadFile(file: File): Promise<string | null> {
        if (!storage) return null;

        // Validation (Client side - secure rules also enforced on server)
        const validTypes = [
            // Documents
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            // Images
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            // Compressed files
            'application/zip',
            'application/x-rar-compressed',
            'application/x-7z-compressed'
        ];

        if (!validTypes.includes(file.type)) {
            console.error("Invalid file type. Allowed: PDF, Word, Images (JPEG, PNG, GIF, WebP), ZIP, RAR, 7z");
            return null;
        }

        // Updated size limit to match Storage rules (10MB)
        if (file.size > 10 * 1024 * 1024) {
            console.error("File too large. Maximum size: 10MB");
            return null;
        }

        try {
            const fileRef = ref(storage, `leads/${this.sessionId}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(fileRef, file);
            const url = await getDownloadURL(snapshot.ref);

            this.trackEvent('file_uploaded', { fileName: file.name, fileSize: file.size, fileType: file.type, url });
            return url;
        } catch (e: any) {
            // Enhanced error messaging
            if (e.code === 'storage/unauthorized') {
                console.error("Storage PERMISSION ERROR: File upload denied. Check Firebase Storage Rules.");
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
