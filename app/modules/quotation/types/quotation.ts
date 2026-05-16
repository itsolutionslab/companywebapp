import { Timestamp } from "firebase/firestore";

export type QuotationStatus = 'draft' | 'sent' | 'signed' | 'expired';
export type Currency = 'USD' | 'PEN';

export interface QuotationData {
    id?: string;
    quotationId: string;
    clientName: string;
    clientEmail: string;
    date: Timestamp;
    validUntil: Timestamp;
    currency: Currency;
    exchangeRate: number;
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
    status: QuotationStatus;
    richContent: any; // Tiptap JSON
    signature?: {
        type: 'manual' | 'crypto';
        data: string; // Base64 for manual, Hash for crypto
        timestamp: Timestamp;
    };
    audit: {
        createdBy: string;
        createdAt: Timestamp;
        lastModifiedBy: string;
        lastModifiedAt: Timestamp;
        version: number;
    };
}
