import { Timestamp } from "firebase/firestore";

export type QuotationStatus = 'draft' | 'sent' | 'signed' | 'expired';
export type Currency = 'USD' | 'PEN';

export interface QuotationItem {
    id: string;
    description: string;
    quantity: number;
    unitPriceCents: number;
    totalCents: number;
}

export interface QuotationData {
    id?: string;
    quotationId: string;
    clientName: string;
    clientEmail: string;
    projectTitle: string;
    date: Timestamp;
    validUntil: Timestamp;
    currency: Currency;
    exchangeRate: number;
    items: QuotationItem[];
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
    status: QuotationStatus;
    context: any; // Tiptap JSON for scope/notes
    leadId?: string; // Linked prospecto ID
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
