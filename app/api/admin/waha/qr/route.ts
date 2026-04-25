import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canAccessAdminWahaApi } from "@/lib/admin-auth-server";
import { wahaBaseUrl, wahaInternalApiKey, getWahaServerEnv } from "@/lib/waha-env";

export const dynamic = "force-dynamic";

async function requireAdminBearer(request: Request): Promise<{ ok: true } | { ok: false; status: number; body: string }> {
    const h = request.headers.get("authorization");
    if (!h?.startsWith("Bearer ")) {
        return { ok: false, status: 401, body: "Falta Authorization" };
    }
    const token = h.slice(7);
    try {
        const decoded = await adminAuth.verifyIdToken(token);
        const snap = await adminDb.collection("users").doc(decoded.uid).get();
        const role = String(snap.data()?.role || "").toLowerCase();
        if (!canAccessAdminWahaApi(role)) {
            return { ok: false, status: 403, body: "Solo administradores" };
        }
        return { ok: true };
    } catch {
        return { ok: false, status: 401, body: "Token inválido" };
    }
}

/** Nombre de sesión WAHA: [a-zA-Z0-9_-]+ */
function safeSession(name: string): string | null {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(name)) return null;
    return name;
}

export async function GET(request: Request) {
    const gate = await requireAdminBearer(request);
    if (!gate.ok) {
        return NextResponse.json({ error: gate.body }, { status: gate.status });
    }

    const session = safeSession(new URL(request.url).searchParams.get("session") || "");
    if (!session) {
        return NextResponse.json({ error: "Parámetro session inválido" }, { status: 400 });
    }

    try {
        getWahaServerEnv();
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : "WAHA no configurado" },
            { status: 500 }
        );
    }

    const base = wahaBaseUrl();
    const key = wahaInternalApiKey();
    const res = await fetch(`${base}/api/${encodeURIComponent(session)}/auth/qr`, {
        headers: {
            "X-Api-Key": key,
            Accept: "application/json",
        },
        cache: "no-store",
    });

    if (!res.ok) {
        const t = await res.text();
        return NextResponse.json({ error: t.slice(0, 400) }, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        const data = (await res.json()) as { mimetype?: string; data?: string };
        return NextResponse.json({
            mimetype: data.mimetype || "image/png",
            data: data.data || "",
        });
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const mime = contentType.split(";")[0].trim() || "image/png";
    return NextResponse.json({
        mimetype: mime,
        data: buf.toString("base64"),
    });
}
