"use server";

import { FieldValue, Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import {
    verifyIdTokenAndRole,
    canUseWhatsappInbox,
    isPortalAdminRole,
} from "@/lib/admin-auth-server";
import { wahaBaseUrl, wahaInternalApiKey, getWahaServerEnv } from "@/lib/waha-env";

export type SendWhatsappMessageResult =
    | { ok: true }
    | { ok: false; error: string };

function assertCanSendToChat(uid: string, role: string, chatSnap: DocumentSnapshot): string | null {
    if (!chatSnap.exists) return "Chat no encontrado";
    const data = chatSnap.data() as { assignedTo?: string | null };
    if (isPortalAdminRole(role)) return null;
    if (data.assignedTo === uid) return null;
    if (data.assignedTo == null) return "Captura el chat antes de responder";
    return "No tienes acceso a este chat";
}

export async function sendWhatsappMessage(
    idToken: string,
    input: { chatId: string; text: string }
): Promise<SendWhatsappMessageResult> {
    try {
        getWahaServerEnv();
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "WAHA no configurado" };
    }

    const text = input.text?.trim();
    if (!text || text.length > 8000) {
        return { ok: false, error: "Mensaje inválido" };
    }

    let uid: string;
    let role: string;
    try {
        const v = await verifyIdTokenAndRole(idToken);
        uid = v.uid;
        role = v.role;
    } catch {
        return { ok: false, error: "Sesión inválida" };
    }

    if (!canUseWhatsappInbox(role)) {
        return { ok: false, error: "Sin permiso" };
    }

    const chatRef = adminDb.collection("waha_chats").doc(input.chatId);
    const chatSnap = await chatRef.get();
    const denied = assertCanSendToChat(uid, role, chatSnap);
    if (denied) return { ok: false, error: denied };

    const chat = chatSnap.data() as { sessionID: string; customerPhone: string };
    const chatIdWaha = `${chat.customerPhone}@c.us`;
    const base = wahaBaseUrl();
    const key = wahaInternalApiKey();

    const res = await fetch(`${base}/api/sendText`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Api-Key": key,
        },
        body: JSON.stringify({
            session: chat.sessionID,
            chatId: chatIdWaha,
            text,
        }),
    });

    if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return { ok: false, error: `WAHA: ${res.status} ${errText.slice(0, 200)}` };
    }

    await chatRef.collection("messages").add({
        text,
        sender: "admin",
        type: "text",
        createdAt: Timestamp.now(),
    });

    await chatRef.set(
        {
            updatedAt: FieldValue.serverTimestamp(),
            lastPreview: text.slice(0, 140),
        },
        { merge: true }
    );

    return { ok: true };
}

export type AssignChatResult = SendWhatsappMessageResult;

export async function assignWahaChat(
    idToken: string,
    input: { chatId: string; assignedTo: string | null }
): Promise<AssignChatResult> {
    let uid: string;
    let role: string;
    try {
        const v = await verifyIdTokenAndRole(idToken);
        uid = v.uid;
        role = v.role;
    } catch {
        return { ok: false, error: "Sesión inválida" };
    }

    const ref = adminDb.collection("waha_chats").doc(input.chatId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "Chat no encontrado" };

    const data = snap.data() as { assignedTo?: string | null };

    if (isPortalAdminRole(role)) {
        await ref.set(
            { assignedTo: input.assignedTo, updatedAt: FieldValue.serverTimestamp() },
            { merge: true }
        );
        return { ok: true };
    }

    if (!canUseWhatsappInbox(role)) return { ok: false, error: "Sin permiso" };

    if (data.assignedTo == null && input.assignedTo === uid) {
        await ref.set(
            { assignedTo: uid, updatedAt: FieldValue.serverTimestamp() },
            { merge: true }
        );
        return { ok: true };
    }

    return { ok: false, error: "No puedes reasignar este chat" };
}

export async function updateWahaTicketValue(
    idToken: string,
    input: { chatId: string; ticketValue: number }
): Promise<AssignChatResult> {
    let uid: string;
    let role: string;
    try {
        const v = await verifyIdTokenAndRole(idToken);
        uid = v.uid;
        role = v.role;
    } catch {
        return { ok: false, error: "Sesión inválida" };
    }

    if (!canUseWhatsappInbox(role)) return { ok: false, error: "Sin permiso" };

    const v = Number(input.ticketValue);
    if (!Number.isFinite(v) || v < 0 || v > 1e9) {
        return { ok: false, error: "Valor inválido" };
    }

    const ref = adminDb.collection("waha_chats").doc(input.chatId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "Chat no encontrado" };

    const data = snap.data() as { assignedTo?: string | null };

    if (isPortalAdminRole(role) || data.assignedTo === uid) {
        await ref.set({ ticketValue: v, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        return { ok: true };
    }

    return { ok: false, error: "Sin acceso" };
}
