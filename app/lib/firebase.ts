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
if (!firebaseConfig.storageBucket) {
    console.warn("Firebase Storage Bucket is missing! Check your .env.local file.");
}
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();



const dbId = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID;
const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
const storage = getStorage(app);
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
    console.log("[Firestore] Starting onServicesUpdate listener...");
    return onSnapshot(collection(db, "services"), (snapshot) => {
        console.log(`[Firestore] snapshot received for 'services'. size: ${snapshot.size}`);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
        callback(data);
    }, (error) => {
        console.error("[Firestore] Error in onServicesUpdate listener:", error);
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
        console.error("[Firestore] Error in onBookingsUpdate listener:", error);
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
        console.error("[Firestore] Error in onAvailabilityUpdate listener:", error);
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

const statusMapping: Record<string, LeadStatus> = {
    'LEAD_NEW': 'NEW',
    'SCHEDULED': 'DISCOVERY_SCHEDULED',
    'IN_PROPOSAL': 'PROPOSAL_PREPARING',
    'PROJ_APPROVED': 'QUALIFIED',
    'DOWN_PAYMENT': 'PROPOSAL_PREPARING',
    'PROJ_STARTED': 'QUALIFIED',
    'IN_TESTING': 'QUALIFIED',
    'PROJ_FINISHED': 'WON',
    'DELIVERED': 'WON',
    'CLOSED': 'WON',
    'CLOSED_LOST': 'LOST'
};

// Leads (Prospectos)
const normalizeLeadData = (raw: any): Lead => {
    const lead: any = { ...raw };

    // Initialize core objects if they don't exist
    if (!lead.data) lead.data = {};
    if (!lead.audit_logs) lead.audit_logs = {};
    if (!lead.kpis) lead.kpis = {};
    if (!lead.status_flow) lead.status_flow = { current: 'NEW', history: [] };
    if (!lead.events) lead.events = [];
    if (!lead.source_attribution) lead.source_attribution = {};
    if (!lead.owner_id) lead.owner_id = null;
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
    const querySnapshot = await getDocs(query(collection(db, "leads"), orderBy("audit_logs.created_at", "desc")));
    return querySnapshot.docs.map(doc => normalizeLeadData({
        ...doc.data(),
        lead_id: doc.id
    }));
};

export const onLeadsUpdate = (callback: (data: Lead[]) => void) => {
    console.log("[Firestore] Starting onLeadsUpdate listener...");
    const q = query(collection(db, "leads"));
    return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
        console.log(`[Firestore] snapshot received for 'leads'. empty: ${snapshot.empty}, size: ${snapshot.size}`);
        const data = snapshot.docs.map(doc => normalizeLeadData({
            ...doc.data(),
            lead_id: doc.id
        }));
        callback(data);
    }, (error) => {
        console.error("[Firestore] Error in onLeadsUpdate listener:", error);
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

export { app, db, storage, auth };
