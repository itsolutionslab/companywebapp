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
        <section className="mb-8 rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-black text-[#0511F2] uppercase tracking-tight">{t("line_settings")}</h2>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{t("line_settings_hint")}</p>
                </div>
                <button
                    type="button"
                    onClick={() => void loadSessions()}
                    className="admin-btn admin-btn-secondary px-6 py-2.5 text-[10px]"
                >
                    {t("refresh_qr")}
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-[#EE05F2]/5 border border-[#EE05F2]/20 rounded-2xl">
                    <p className="text-xs font-bold text-[#EE05F2]">{error}</p>
                </div>
            )}
            
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-[#0511F2]/10 border-t-[#0511F2] rounded-full animate-spin"></div>
                </div>
            ) : sessions.length === 0 ? (
                <div className="py-12 text-center bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                    <p className="text-sm font-bold text-gray-400">WAHA no devolvió sesiones activa.</p>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {sessions.map((s, i) => {
                        const name = String(s.name || `session_${i}`);
                        const status = String(s.status || "—");
                        const src = qrBySession[name];
                        const stUp = status.toUpperCase();
                        const isLinked = stUp === "WORKING" || stUp === "CONNECTED";
                        return (
                            <div
                                key={name}
                                className="rounded-[1.5rem] border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="mb-4 flex items-center justify-between">
                                    <span className="font-black text-[#0511F2] uppercase text-xs tracking-wider">{name}</span>
                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                        isLinked ? 'bg-[#6FD904]/10 text-[#6FD904]' : 'bg-gray-100 text-gray-400'
                                    }`}>
                                        {status}
                                    </span>
                                </div>
                                <div className="mb-4 flex min-h-[180px] items-center justify-center rounded-2xl bg-gray-50 p-4 border border-gray-100 overflow-hidden">
                                    {src ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={src} alt={`QR ${name}`} className="max-h-40 w-auto rounded-lg mix-blend-multiply" />
                                    ) : (
                                        <div className="text-center px-4">
                                            <span className="text-3xl block mb-2">{isLinked ? "✅" : "⚠️"}</span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isLinked ? "text-[#6FD904]" : "text-gray-400"}`}>
                                                {isLinked
                                                    ? t("session_connected_hint")
                                                    : "QR no cargado"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    disabled={qrLoading === name}
                                    onClick={() => void fetchQr(name)}
                                    className="w-full admin-btn admin-btn-primary py-3 text-[10px] shadow-lg shadow-pink-100"
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
