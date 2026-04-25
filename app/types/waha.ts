import type { Timestamp } from "firebase/firestore";

export type WahaSessionStatus = "CONNECTED" | "DISCONNECTED";

export interface WahaSessionDoc {
    phone: string;
    status: WahaSessionStatus;
    createdAt: Timestamp;
}

export interface WahaChatDoc {
    sessionID: string;
    customerPhone: string;
    assignedTo: string | null;
    ticketValue: number;
    updatedAt: Timestamp;
    /** Vista previa del último mensaje entrante */
    lastPreview?: string;
    /** Nombre de perfil WhatsApp si WAHA lo envía */
    customerName?: string;
}

export type WahaMessageSender = "customer" | "admin";
export type WahaMessageType = "text" | "image" | "document";

export interface WahaMessageDoc {
    text: string;
    sender: WahaMessageSender;
    type: WahaMessageType;
    createdAt: Timestamp;
    /** ID del mensaje en WAHA (si existe) */
    wahaId?: string;
}
