import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { wahaWebhookSecret } from "@/lib/waha-env";

export const dynamic = "force-dynamic";

type WahaWebhookEnvelope = {
    event?: string;
    session?: string;
    payload?: Record<string, unknown>;
};

function jidToE164Local(jid: string): string | null {
    if (!jid || jid.includes("@g.us")) return null;
    const m = jid.match(/^(\d+)@c\.us$/);
    return m ? m[1] : null;
}

function messageTypeFromPayload(p: Record<string, unknown>): "text" | "image" | "document" {
    if (p.hasMedia === true) {
        const mime = String((p.media as { mimetype?: string } | undefined)?.mimetype || "").toLowerCase();
        if (mime.startsWith("image/")) return "image";
        return "document";
    }
    return "text";
}

function messageTextFromPayload(p: Record<string, unknown>): string {
    if (p.hasMedia === true && (!p.body || String(p.body).trim() === "")) {
        return p.type === "image" || messageTypeFromPayload(p) === "image" ? "[Imagen]" : "[Archivo]";
    }
    return String(p.body ?? "").slice(0, 8000);
}

function payloadTimestampMs(p: Record<string, unknown>): Timestamp {
    const t = Number(p.timestamp);
    if (!Number.isFinite(t)) return Timestamp.now();
    return t > 1e12 ? Timestamp.fromMillis(t) : Timestamp.fromMillis(t * 1000);
}

/** IDs de WAHA pueden incluir `/`; Firestore no lo permite en documentId. */
function safeMessageDocId(wahaId: string): string {
    return wahaId.replace(/[/\\]/g, "_").slice(0, 700);
}

export async function POST(request: Request) {
    let secret: string;
    try {
        secret = wahaWebhookSecret();
    } catch {
        return NextResponse.json({ ok: false, error: "WAHA_WEBHOOK_SECRET no configurado" }, { status: 500 });
    }

    const headerSecret = request.headers.get("x-webhook-secret");
    if (!headerSecret || headerSecret !== secret) {
        return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    let body: WahaWebhookEnvelope;
    try {
        body = (await request.json()) as WahaWebhookEnvelope;
    } catch {
        return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
    }

    const event = body.event;
    if (event !== "message" && event !== "message.any") {
        return NextResponse.json({ ok: true, ignored: event });
    }

    const sessionID = body.session;
    const payload = body.payload;
    if (!sessionID || !payload || typeof payload !== "object") {
        return NextResponse.json({ ok: false, error: "Payload incompleto" }, { status: 400 });
    }

    if (payload.fromMe === true) {
        return NextResponse.json({ ok: true, skipped: "outbound" });
    }

    const fromJid = String(payload.from || "");
    const customerPhone = jidToE164Local(fromJid);
    if (!customerPhone) {
        return NextResponse.json({ ok: true, skipped: "non_direct_chat" });
    }

    const chatDocId = `${sessionID}_${customerPhone}`;
    const chatRef = adminDb.collection("waha_chats").doc(chatDocId);
    const text = messageTextFromPayload(payload);
    const type = messageTypeFromPayload(payload);
    const createdAt = payloadTimestampMs(payload);

    const lastPreview = text.slice(0, 140);
    const pushName = typeof payload._data === "object" && payload._data && "pushName" in (payload._data as object)
        ? String((payload._data as { pushName?: string }).pushName || "").slice(0, 120)
        : undefined;

    const snap = await chatRef.get();
    const batch = adminDb.batch();
    const base = {
        sessionID,
        customerPhone,
        updatedAt: FieldValue.serverTimestamp(),
        lastPreview,
    };
    if (!snap.exists) {
        batch.set(chatRef, {
            ...base,
            assignedTo: null,
            ticketValue: 0,
            createdAt: FieldValue.serverTimestamp(),
            ...(pushName ? { customerName: pushName } : {}),
        });
    } else {
        const patch: Record<string, unknown> = { ...base };
        if (pushName) patch.customerName = pushName;
        batch.set(chatRef, patch, { merge: true });
    }

    const wahaMsgId = typeof payload.id === "string" ? payload.id : "";
    const msgRef = wahaMsgId
        ? chatRef.collection("messages").doc(safeMessageDocId(wahaMsgId))
        : chatRef.collection("messages").doc();
    batch.set(
        msgRef,
        {
            text,
            sender: "customer",
            type,
            createdAt,
            wahaId: wahaMsgId || undefined,
        },
        { merge: true }
    );
    await batch.commit();

    return NextResponse.json({ ok: true, chatId: chatDocId });
}
