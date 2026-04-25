"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { useTranslation } from "@/components/admin/LanguageContext";

type WahaSessionRow = {
    name?: string;
    status?: string;
};

export function WahaLinesPanel() {
    const { t } = useTranslation();
    const [sessions, setSessions] = useState<WahaSessionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [qrBySession, setQrBySession] = useState<Record<string, string>>({});
    const [qrLoading, setQrLoading] = useState<string | null>(null);

    const loadSessions = useCallback(async () => {
        const user = auth.currentUser;
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const token = await user.getIdToken();
            const res = await fetch("/api/admin/waha/sessions", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(typeof body.error === "string" ? body.error : t("waha_error"));
                setSessions([]);
                return;
            }
            const list = Array.isArray(body) ? body : body.sessions || body.data || [];
            setSessions(Array.isArray(list) ? list : []);
        } catch {
            setError(t("waha_error"));
            setSessions([]);
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void loadSessions();
    }, [loadSessions]);

    const fetchQr = useCallback(async (sessionName: string) => {
        const user = auth.currentUser;
        if (!user) return;
        setQrLoading(sessionName);
        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/admin/waha/qr?session=${encodeURIComponent(sessionName)}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                setQrBySession((prev) => ({ ...prev, [sessionName]: "" }));
                return;
            }
            const dataUrl =
                body.data && body.mimetype ? `data:${body.mimetype};base64,${body.data}` : "";
            setQrBySession((prev) => ({ ...prev, [sessionName]: dataUrl }));
        } finally {
            setQrLoading(null);
        }
    }, []);

    /** Si la sesión ya está WORKING, el QR suele no mostrarse; si hace falta escanear, WAHA devuelve QR al pedirlo. */
    useEffect(() => {
        if (!sessions.length) return;
        for (const s of sessions) {
            const name = String(s.name || "");
            if (!name) continue;
            const st = String(s.status || "").toUpperCase();
            if (st === "WORKING" || st === "CONNECTED") continue;
            void fetchQr(name);
        }
    }, [sessions, fetchQr]);

    return (
        <section className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">{t("line_settings")}</h2>
                    <p className="text-sm text-gray-500">{t("line_settings_hint")}</p>
                </div>
                <button
                    type="button"
                    onClick={() => void loadSessions()}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-600 transition hover:bg-gray-50"
                >
                    {t("refresh_qr")}
                </button>
            </div>

            {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}
            {loading ? (
                <p className="text-sm text-gray-400">{t("loading")}</p>
            ) : sessions.length === 0 ? (
                <p className="text-sm text-gray-500">WAHA no devolvió sesiones. Crea `sede_peru`, `sede_usa`, etc. en WAHA.</p>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {sessions.map((s, i) => {
                        const name = String(s.name || `session_${i}`);
                        const status = String(s.status || "—");
                        const src = qrBySession[name];
                        const stUp = status.toUpperCase();
                        const isLinked = stUp === "WORKING" || stUp === "CONNECTED";
                        return (
                            <div
                                key={name}
                                className="rounded-xl border border-gray-100 bg-gray-50/50 p-4"
                            >
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="font-bold text-gray-800">{name}</span>
                                    <span className="rounded-lg bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-[#0081C8]">
                                        {status}
                                    </span>
                                </div>
                                <div className="mb-3 flex min-h-[160px] items-center justify-center rounded-lg bg-white p-2">
                                    {src ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={src} alt={`QR ${name}`} className="max-h-44 w-auto" />
                                    ) : (
                                        <span
                                            className={`px-2 text-center text-xs ${isLinked ? "text-emerald-700" : "text-gray-400"}`}
                                        >
                                            {isLinked
                                                ? t("session_connected_hint")
                                                : "QR no cargado — pulsa el botón o revisa WAHA"}
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    disabled={qrLoading === name}
                                    onClick={() => void fetchQr(name)}
                                    className="w-full rounded-xl bg-[#E6007E] py-2 text-xs font-bold text-white shadow-md shadow-[#E6007E]/20 transition hover:opacity-90 disabled:opacity-50"
                                >
                                    {qrLoading === name ? t("sending") : t("refresh_qr")}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
