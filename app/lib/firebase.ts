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
import { Lead } from "@/types/tracking";

// --- Admin & Support Functions ---

// Services
export const getServices = async (): Promise<Service[]> => {
    const querySnapshot = await getDocs(collection(db, "services"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
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
    });
};

export const updateBookingStatus = async (id: string, status: BookingData['status'], historyEntry: any) => {
    const bookingRef = doc(db, "bookings", id);
    await updateDoc(bookingRef, {
        status,
        history: arrayUnion(historyEntry)
    });
};

// Availability & Settings
export const onAvailabilityUpdate = (callback: (disabled: string[]) => void) => {
    return onSnapshot(doc(db, "settings", "availability"), (doc) => {
        if (doc.exists()) {
            callback(doc.data().disabledSlots || []);
        } else {
            callback([]);
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

// Leads (Prospectos)
export const getLeads = async (): Promise<Lead[]> => {
    const querySnapshot = await getDocs(query(collection(db, "leads"), orderBy("audit_logs.created_at", "desc")));
    return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        lead_id: doc.id
    } as Lead));
};

export const getLeadById = async (id: string): Promise<Lead | null> => {
    const docRef = doc(db, "leads", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { ...docSnap.data(), lead_id: docSnap.id } as Lead;
    }
    return null;
};

export const updateLead = async (id: string, data: Partial<Lead>) => {
    const leadRef = doc(db, "leads", id);
    const updateData = {
        ...data,
        "audit_logs.updated_at": Timestamp.now()
    };
    await updateDoc(leadRef, updateData as any);
};

export { app, db, storage, auth };
