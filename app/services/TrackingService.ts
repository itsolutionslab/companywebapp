import { db, storage, auth } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc, setDoc, query, where, getDocs, Timestamp, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signInAnonymously } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';
import { Lead, LeadData, InteractionEvent, LeadStatus } from '../types/tracking';

const SESSION_KEY = 'user_session_id';
const LEAD_ID_KEY = 'current_lead_id';

class TrackingService {
    sessionId: string;
    startTime: number;
    clicksCount: number = 0;
    sourceRegion: 'US_LANDING' | 'LATAM_LANDING' | 'PE_LANDING' = 'US_LANDING';

    constructor() {
        if (typeof window !== 'undefined') {
            this.sessionId = localStorage.getItem(SESSION_KEY) || uuidv4();
            localStorage.setItem(SESSION_KEY, this.sessionId);
            this.startTime = Date.now();
        } else {
            this.sessionId = 'server-side';
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

    private async ensureAuth() {
        if (!auth.currentUser) {
            try {
                await signInAnonymously(auth);
            } catch (error) {
                console.error("Error signing in anonymously", error);
            }
        }
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
        if (!db) return null; // Guard against SSR/no-firebase
        await this.ensureAuth();

        let leadId = typeof window !== 'undefined' ? localStorage.getItem(LEAD_ID_KEY) : null;
        const timestamp = new Date().toISOString();
        const existingData = leadId ? { updated_at: serverTimestamp() } : {};

        const ipData = await this.getIPData();

        const leadPayload: Partial<Lead> = {
            data: { ...data }, // Merge new data
            kpis: {
                session_duration: (Date.now() - this.startTime) / 1000,
                clicks_count: this.clicksCount
            },
            audit_logs: {
                updated_at: serverTimestamp(),
                ip: ipData.ip || 'unknown',
                user_agent: typeof window !== 'undefined' ? navigator.userAgent : '',
                geo_location: {
                    city: ipData.city,
                    country: ipData.country,
                    region: ipData.region
                },
                created_at: null // Placeholder, will set if new
            }
        };

        try {
            if (leadId) {
                // Update existing lead using dot notation to avoid overwriting entire map
                const leadRef = doc(db, 'leads', leadId);
                const updateObject: any = {};

                // Update data fields
                Object.keys(data).forEach(k => {
                    updateObject[`data.${k}`] = data[k as keyof LeadData];
                });

                // Update KPIs
                updateObject['kpis'] = leadPayload.kpis;

                // Update Audit Logs (only what changed)
                updateObject['audit_logs.updated_at'] = serverTimestamp();
                if (ipData.ip) updateObject['audit_logs.ip'] = ipData.ip;

                await updateDoc(leadRef, updateObject);
                return leadId;

            } else {
                // Create New Lead
                leadId = uuidv4();
                if (typeof window !== 'undefined') localStorage.setItem(LEAD_ID_KEY, leadId);

                const newLead: Lead = {
                    lead_id: leadId,
                    status_flow: {
                        current: 'LEAD_NEW',
                        history: [{ status: 'LEAD_NEW', timestamp }]
                    },
                    audit_logs: {
                        ...leadPayload.audit_logs,
                        created_at: serverTimestamp(),
                    } as any,
                    source_attribution: {
                        ...this.getUTMParams(),
                        landing_page: this.sourceRegion
                    },
                    data: data,
                    kpis: leadPayload.kpis!,
                    priority: 'MEDIUM'
                };

                await setDoc(doc(db, 'leads', leadId), newLead);
                return leadId;
            }
        } catch (error) {
            console.error("Error saving lead draft:", error);
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

        } catch (e) {
            console.error("Error tracking event", e);
        }
    }

    async uploadFile(file: File): Promise<string | null> {
        if (!storage) return null;
        await this.ensureAuth();

        // Validation (Client side - secure rules should also be on server)
        const validTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (!validTypes.includes(file.type)) {
            console.error("Invalid file type");
            return null;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            console.error("File too large");
            return null;
        }

        try {
            const fileRef = ref(storage, `leads/${this.sessionId}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(fileRef, file);
            const url = await getDownloadURL(snapshot.ref);

            this.trackEvent('file_uploaded', { fileName: file.name, url });
            return url;
        } catch (e) {
            console.error("Error uploading file", e);
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
