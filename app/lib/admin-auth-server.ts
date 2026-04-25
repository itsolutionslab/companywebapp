import { adminAuth, adminDb } from "@/lib/firebase-admin";

export type PortalRole = "owneradmin" | "admin" | "staff" | "employ" | string;

export async function verifyIdTokenAndRole(idToken: string): Promise<{ uid: string; role: PortalRole }> {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const snap = await adminDb.collection("users").doc(decoded.uid).get();
    const role = String(snap.data()?.role || "staff").toLowerCase();
    return { uid: decoded.uid, role };
}

export function isPortalAdminRole(role: string): boolean {
    const r = role.toLowerCase();
    return r === "admin" || r === "owneradmin";
}

export function isSalesAgentRole(role: string): boolean {
    const r = role.toLowerCase();
    return r === "staff" || r === "employ";
}

export function canAccessAdminWahaApi(role: string): boolean {
    return isPortalAdminRole(role);
}

export function canUseWhatsappInbox(role: string): boolean {
    return isPortalAdminRole(role) || isSalesAgentRole(role);
}
