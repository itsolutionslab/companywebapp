import { db, auth } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

export type AuditAction = 
    | 'CREATE' 
    | 'UPDATE' 
    | 'DELETE' 
    | 'DOWNLOAD_PDF' 
    | 'DOWNLOAD_WORD' 
    | 'VIEW' 
    | 'SIGN';

export interface AuditLog {
    action: AuditAction;
    quotationId: string;
    userId: string;
    userName: string;
    timestamp: Timestamp;
    details?: any;
    metadata: {
        ip?: string;
        userAgent: string;
        version: number;
    };
}

export const logQuotationEvent = async (
    action: AuditAction, 
    quotationId: string, 
    version: number = 1,
    details: any = {}
) => {
    const user = auth.currentUser;
    if (!user) return;

    const auditLog: Omit<AuditLog, 'id'> = {
        action,
        quotationId,
        userId: user.uid,
        userName: user.displayName || user.email || 'Unknown User',
        timestamp: Timestamp.now(),
        details,
        metadata: {
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
            version
        }
    };

    try {
        await addDoc(collection(db, "quotation_audit_logs"), auditLog);
    } catch (error) {
        console.error("Failed to log audit event:", error);
    }
};
