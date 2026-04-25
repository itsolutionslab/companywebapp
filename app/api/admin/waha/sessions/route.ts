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

export async function GET(request: Request) {
    const gate = await requireAdminBearer(request);
    if (!gate.ok) {
        return NextResponse.json({ error: gate.body }, { status: gate.status });
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
    const res = await fetch(`${base}/api/sessions`, {
        headers: { "X-Api-Key": key },
        cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) {
        return NextResponse.json({ error: text.slice(0, 400) }, { status: res.status });
    }
    try {
        const data = JSON.parse(text) as unknown;
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ raw: text });
    }
}
