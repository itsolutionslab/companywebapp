import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";


export const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();



const dbId = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID;
const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
const storage = getStorage(app, firebaseConfig.storageBucket);
const auth = getAuth(app);

// --- Admin & Support Functions ---

import {
    collection,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    addDoc,
    deleteDoc,
    query,
    orderBy,
    where,
    onSnapshot,
    arrayUnion,
    setDoc,
    Timestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Service, BookingData, BusinessProfile } from "@/types/booking";
import { Lead, LeadStatus, LeadEvent } from "@/types/tracking";

// --- Admin & Support Functions ---

// Services
export const getServices = async (): Promise<Service[]> => {
    const querySnapshot = await getDocs(collection(db, "services"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
};

export const onServicesUpdate = (callback: (data: Service[]) => void) => {
    return onSnapshot(collection(db, "services"), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
        callback(data);
    }, (error) => {
        if (!error.message.includes('permission')) {
            console.error("[Firestore] Error in onServicesUpdate listener:", error);
        }
    });
};

export const updateService = async (id: string, data: Partial<Service>) => {
    const serviceRef = doc(db, "services", id);
    await updateDoc(serviceRef, data);
};

export const addService = async (data: Omit<Service, 'id'>) => {
    await addDoc(collection(db, "services"), data);
};

export const deleteService = async (id: string) => {
    await deleteDoc(doc(db, "services", id));
};

export const uploadServiceImage = async (file: File, serviceId: string): Promise<string> => {
    const storageRef = ref(storage, `services/${serviceId}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
};

// Bookings
export const getAllBookings = async (): Promise<BookingData[]> => {
    const querySnapshot = await getDocs(query(collection(db, "bookings"), orderBy("date", "desc")));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingData));
};

export const onBookingsUpdate = (callback: (data: BookingData[]) => void) => {
    const q = query(collection(db, "bookings"), orderBy("date", "desc"));
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingData));
        callback(data);
    }, (error) => {
        if (!error.message.includes('permission')) {
            console.error("[Firestore] Error in onBookingsUpdate listener:", error);
        }
    });
};

export const updateBookingStatus = async (id: string, status: BookingData['status'], historyEntry: any) => {
    const bookingRef = doc(db, "bookings", id);
    await updateDoc(bookingRef, {
        status,
        history: arrayUnion(historyEntry)
    });
};

export const addBooking = async (data: Omit<BookingData, 'id'>) => {
    return await addDoc(collection(db, "bookings"), data);
};

export const isSlotAvailable = async (date: string, time: string): Promise<boolean> => {
    // 1. Check if blocked in settings
    const availDoc = await getDoc(doc(db, "settings", "availability"));
    if (availDoc.exists()) {
        const disabledSlots = availDoc.data().disabledSlots || [];
        if (disabledSlots.includes(`${date}_${time}`)) return false;
    }

    // 2. Check if already booked locally or in other status
    const q = query(
        collection(db, "bookings"),
        where("date", "==", date),
        where("time", "==", time),
        where("status", "in", ["pending", "confirmed", "attended"])
    );
    const snapshot = await getDocs(q);
    return snapshot.empty;
};

// Availability & Settings
export const onAvailabilityUpdate = (callback: (disabled: string[]) => void) => {
    return onSnapshot(doc(db, "settings", "availability"), (doc) => {
        if (doc.exists()) {
            callback(doc.data().disabledSlots || []);
        } else {
            callback([]);
        }
    }, (error) => {
        if (!error.message.includes('permission')) {
            console.error("[Firestore] Error in onAvailabilityUpdate listener:", error);
        }
    });
};

export const updateDisabledSlots = async (disabledSlots: string[]) => {
    const ref = doc(db, "settings", "availability");
    await setDoc(ref, { disabledSlots }, { merge: true });
};

export const getBusinessSettings = async (): Promise<BusinessProfile | null> => {
    const docSnap = await getDoc(doc(db, "settings", "business"));
    if (docSnap.exists()) {
        return docSnap.data() as BusinessProfile;
    }
    return null;
};

export const updateBusinessSettings = async (data: Partial<BusinessProfile>) => {
    const ref = doc(db, "settings", "business");
    await setDoc(ref, data, { merge: true });
};

// Users
export const deleteUser = async (uid: string) => {
    await deleteDoc(doc(db, "users", uid));
};

export const getStaffUsers = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    } catch (e) {
        console.warn("[Firestore] Could not load users list");
        return [];
    }
};

// Role Config
export const updateUserTeam = async (uid: string, team_id: string | null) => {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, { team_id });
};

// Teams
export const getTeams = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "teams"));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.warn("[Firestore] Could not load teams list");
        return [];
    }
};

export const createTeam = async (teamData: any) => {
    const newTeam = {
        ...teamData,
        created_at: Timestamp.now()
    };
    return await addDoc(collection(db, "teams"), newTeam);
};

export const updateTeam = async (id: string, data: any) => {
    const teamRef = doc(db, "teams", id);
    await updateDoc(teamRef, data);
};

export const deleteTeam = async (id: string) => {
    await deleteDoc(doc(db, "teams", id));
};

// Role Config
export const getRoleConfig = async () => {
    const docSnap = await getDoc(doc(db, "settings", "roles"));
    if (docSnap.exists()) {
        return docSnap.data();
    }
    return null;
};

export const updateRoleConfig = async (config: any) => {
    await setDoc(doc(db, "settings", "roles"), config, { merge: true });
};

const statusMapping: Record<string, LeadStatus> = {
    'NEW': 'LEAD_NEW',
    'QUALIFIED': 'QUALIFICATION',
    'WON': 'WIN_CLOSED',
    'SCHEDULED': 'DISCOVERY_SCHEDULED',
    'IN_PROPOSAL': 'PROPOSAL_PREPARING',
    'PROJ_APPROVED': 'QUALIFICATION',
    'DOWN_PAYMENT': 'PROPOSAL_PREPARING',
    'PROJ_STARTED': 'QUALIFICATION',
    'IN_TESTING': 'QUALIFICATION',
    'PROJ_FINISHED': 'WIN_CLOSED',
    'DELIVERED': 'WIN_CLOSED',
    'CLOSED': 'WIN_CLOSED',
    'CLOSED_LOST': 'LOST'
};

// Leads (Prospectos)
const normalizeLeadData = (raw: any): Lead => {
    const lead: any = { ...raw };

    // Initialize core objects if they don't exist
    if (!lead.data) lead.data = {};
    if (!lead.audit_logs) lead.audit_logs = {};
    if (!lead.kpis) lead.kpis = {};
    if (!lead.status_flow) lead.status_flow = { current: 'LEAD_NEW', history: [] };
    if (!lead.events) lead.events = [];
    if (!lead.source_attribution) lead.source_attribution = {};
    if (!lead.owner_id) lead.owner_id = null;
    if (!lead.created_by) lead.created_by = null;
    if (!lead.created_by_name) lead.created_by_name = null;
    if (!lead.dev_team) lead.dev_team = null;
    if (!lead.solutions_architect_id) lead.solutions_architect_id = null;
    if (!lead.value_estimate) lead.value_estimate = 0;

    // Map old status to new if necessary
    if (statusMapping[lead.status_flow.current]) {
        lead.status_flow.current = statusMapping[lead.status_flow.current];
    }

    // Process all keys to find literal dotted keys (e.g., "data.name")
    Object.keys(lead).forEach(key => {
        if (key.includes('.')) {
            const parts = key.split('.');
            let current = lead;

            // Traverse/Create nested structure
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!current[part]) current[part] = {};
                current = current[part];
            }

            // Set the value at the leaf
            const lastPart = parts[parts.length - 1];
            current[lastPart] = lead[key];

            // Remove the flat dotted key
            delete lead[key];
        }
    });

    return lead as Lead;
};

export const getLeads = async (): Promise<Lead[]> => {
    try {
        const querySnapshot = await getDocs(query(collection(db, "leads"), orderBy("audit_logs.created_at", "desc")));
        return querySnapshot.docs.map(doc => normalizeLeadData({
            ...doc.data(),
            lead_id: doc.id
        }));
    } catch (e) {
        console.warn("[Firestore] Could not load leads list (Expected for non-staff users)");
        return [];
    }
};

export const onLeadsUpdate = (callback: (data: Lead[]) => void) => {
    const q = query(collection(db, "leads"));
    return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
        const data = snapshot.docs.map(doc => normalizeLeadData({
            ...doc.data(),
            lead_id: doc.id
        }));
        callback(data);
    }, (error) => {
        if (!error.message.includes('permission')) {
            console.error("[Firestore] Error in onLeadsUpdate listener:", error);
        }
    });
};

export const getLeadById = async (id: string): Promise<Lead | null> => {
    const docRef = doc(db, "leads", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return normalizeLeadData({ ...docSnap.data(), lead_id: docSnap.id });
    }
    return null;
};

export const addLeadEvent = async (leadId: string, event: Omit<LeadEvent, 'id'>) => {
    const leadRef = doc(db, "leads", leadId);
    const eventId = Math.random().toString(36).substr(2, 9);
    const newEvent = { ...event, id: eventId, timestamp: event.timestamp || Timestamp.now() };

    await updateDoc(leadRef, {
        events: arrayUnion(newEvent),
        "audit_logs.updated_at": Timestamp.now()
    });
    return newEvent;
};

export const createLead = async (leadData: Partial<Lead>) => {
    const leadsRef = collection(db, "leads");
    const newLead = {
        ...leadData,
        lead_id: Math.random().toString(36).substr(2, 9), // Temporary, will be overwritten by doc id if using addDoc, but here we might want to specify it
        status_flow: leadData.status_flow || { current: 'LEAD_NEW', history: [] },
        audit_logs: {
            created_at: Timestamp.now(),
            updated_at: Timestamp.now(),
            ip: 'admin_action',
            user_agent: 'admin_panel'
        },
        kpis: {
            session_duration: 0,
            clicks_count: 0
        },
        source_attribution: leadData.source_attribution || {
            landing_page: 'admin_panel'
        }
    };
    
    return await addDoc(leadsRef, newLead);
};

export const updateLead = async (id: string, data: Partial<Lead>) => {
    const leadRef = doc(db, "leads", id);
    const updateData: any = {
        ...data,
        "audit_logs.updated_at": Timestamp.now()
    };

    // If status is being updated, log it as an event too
    if (data.status_flow?.current) {
        const eventId = Math.random().toString(36).substr(2, 9);
        const statusEvent: LeadEvent = {
            id: eventId,
            type: 'STATUS_CHANGED',
            description: `Estado cambiado a ${data.status_flow.current}`,
            timestamp: Timestamp.now(),
            metadata: { new_status: data.status_flow.current }
        };
        updateData.events = arrayUnion(statusEvent);
    }

    await updateDoc(leadRef, updateData);
};

export const onFunnelsUpdate = (callback: (data: any[]) => void) => {
    const q = query(collection(db, "funnels"), orderBy("created_at", "desc"));
    return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(data);
    }, (error) => {
        if (!error.message.includes('permission')) {
            console.error("[Firestore] Error in onFunnelsUpdate listener:", error);
        } else {
            console.warn("[Firestore] Permission denied or rules not propagated yet for funnels.");
        }
        callback([]);
    });
};

export const createFunnel = async (data: any) => {
    const funnelsRef = collection(db, "funnels");
    const newFunnel = {
        ...data,
        status: 'NUEVO_INGRESO',
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        source: 'internal'
    };
    return await addDoc(funnelsRef, newFunnel);
};

export const updateFunnel = async (id: string, data: any) => {
    const funnelRef = doc(db, "funnels", id);
    const updateData = {
        ...data,
        updated_at: Timestamp.now()
    };
    await updateDoc(funnelRef, updateData);
};

export const onCampaignsUpdate = (callback: (data: any[]) => void) => {
    const q = query(collection(db, "campaigns"), orderBy("created_at", "desc"));
    return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(data);
    }, (error) => {
        if (!error.message.includes('permission')) {
            console.error("[Firestore] Error in onCampaignsUpdate listener:", error);
        } else {
            console.warn("[Firestore] Permission denied for campaigns.");
        }
        callback([]);
    });
};

export const getCampaignBySlug = async (slug: string) => {
    const q = query(collection(db, "campaigns"), where("slug", "==", slug));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }
    return null;
};

export const createCampaign = async (data: any) => {
    const campaignsRef = collection(db, "campaigns");
    const newCampaign = {
        ...data,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
    };
    return await addDoc(campaignsRef, newCampaign);
};

export const updateCampaign = async (id: string, data: any) => {
    const campaignRef = doc(db, "campaigns", id);
    const updateData = {
        ...data,
        updated_at: Timestamp.now()
    };
    await updateDoc(campaignRef, updateData);
};

export { app, db, storage, auth };
