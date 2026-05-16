"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    auth,
    db,
} from "@/lib/firebase";
import {
    collection,
    doc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    where,
    type Timestamp,
} from "firebase/firestore";
import { useTranslation } from "@/components/admin/LanguageContext";
import { useNotification } from "@/components/admin/NotificationContext";
import { WahaLinesPanel } from "@/components/admin/WahaLinesPanel";
import type { UserProfile } from "@/types/booking";
import { assignWahaChat, sendWhatsappMessage, updateWahaTicketValue } from "@/actions/whatsapp";

type ChatRow = {
    id: string;
    sessionID: string;
    customerPhone: string;
    assignedTo: string | null;
    ticketValue: number;
    updatedAt: Timestamp | null;
    lastPreview?: string;
    customerName?: string;
};

type MsgRow = {
    id: string;
    text: string;
    sender: "customer" | "admin";
    type: string;
    createdAt: Timestamp | null;
};

function tsMillis(t: Timestamp | null | undefined): number {
    if (!t || typeof t.toMillis !== "function") return 0;
    return t.toMillis();
}

function sortChats(a: ChatRow, b: ChatRow): number {
    return tsMillis(b.updatedAt) - tsMillis(a.updatedAt);
}

export default function ChatBandeja() {
    const { t } = useTranslation();
    const { showNotification } = useNotification();
    const [role, setRole] = useState<string | null>(null);
    const [chatsAdmin, setChatsAdmin] = useState<ChatRow[]>([]);
    const [chatsMine, setChatsMine] = useState<ChatRow[]>([]);
    const [chatsPool, setChatsPool] = useState<ChatRow[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messages, setMessages] = useState<MsgRow[]>([]);
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const [agents, setAgents] = useState<UserProfile[]>([]);
    const [ticketEdit, setTicketEdit] = useState("");
    const [firestoreListenError, setFirestoreListenError] = useState<string | null>(null);
    const uid = auth.currentUser?.uid;

    const isAdmin = role === "admin" || role === "owneradmin";

    useEffect(() => {
        if (!uid) return;
        const ref = doc(db, "users", uid);
        return onSnapshot(ref, (snap) => {
            const r = snap.exists() ? String((snap.data() as { role?: string }).role || "staff").toLowerCase() : "staff";
            setRole(r);
        });
    }, [uid]);

    const loadAgents = useCallback(async () => {
        if (!isAdmin) return;
        const snap = await getDocs(query(collection(db, "users"), orderBy("created_at", "desc"), limit(80)));
        const rows = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile));
        setAgents(rows.filter((u) => u.role === "staff" || u.role === "employ"));
    }, [isAdmin]);

    useEffect(() => {
        void loadAgents();
    }, [loadAgents]);

    useEffect(() => {
        if (!uid || !role) return;

        if (isAdmin) {
            setFirestoreListenError(null);
            const q = query(collection(db, "waha_chats"), orderBy("updatedAt", "desc"), limit(120));
            return onSnapshot(
                q,
                (snap) => {
                    setFirestoreListenError(null);
                    const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatRow, "id">) }));
                    setChatsAdmin(rows.sort(sortChats));
                },
                (err) => {
                    console.error(err);
                    setFirestoreListenError(err.message || "Firestore");
                }
            );
        }

        setFirestoreListenError(null);
        const qMine = query(
            collection(db, "waha_chats"),
            where("assignedTo", "==", uid),
            orderBy("updatedAt", "desc"),
            limit(80)
        );
        const qPool = query(
            collection(db, "waha_chats"),
            where("assignedTo", "==", null),
            orderBy("updatedAt", "desc"),
            limit(80)
        );

        const u1 = onSnapshot(
            qMine,
            (snap) => {
                setFirestoreListenError(null);
                setChatsMine(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatRow, "id">) })));
            },
            (err) => {
                console.error(err);
                setFirestoreListenError(err.message || "Firestore");
            }
        );
        const u2 = onSnapshot(
            qPool,
            (snap) => {
                setFirestoreListenError(null);
                setChatsPool(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatRow, "id">) })));
            },
            (err) => {
                console.error(err);
                setFirestoreListenError(err.message || "Firestore");
            }
        );

        return () => {
            u1();
            u2();
        };
    }, [uid, role, isAdmin]);

    const chats = useMemo(() => {
        if (isAdmin) return chatsAdmin;
        const m = new Map<string, ChatRow>();
        chatsPool.forEach((c) => m.set(c.id, c));
        chatsMine.forEach((c) => m.set(c.id, c));
        return [...m.values()].sort(sortChats);
    }, [isAdmin, chatsAdmin, chatsMine, chatsPool]);

    const selected = useMemo(() => chats.find((c) => c.id === selectedId) || null, [chats, selectedId]);

    useEffect(() => {
        if (!selectedId) {
            setMessages([]);
            return;
        }
        const q = query(collection(db, "waha_chats", selectedId, "messages"), orderBy("createdAt", "asc"), limit(200));
        return onSnapshot(q, (snap) => {
            setMessages(
                snap.docs.map((d) => ({
                    id: d.id,
                    ...(d.data() as Omit<MsgRow, "id">),
                }))
            );
        });
    }, [selectedId]);

    useEffect(() => {
        if (selected) {
            setTicketEdit(String(selected.ticketValue ?? 0));
        }
    }, [selected]);

    const formatMoney = (n: number) =>
        new Intl.NumberFormat("es-PE", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

    const handleSend = async () => {
        if (!selectedId || !draft.trim() || !auth.currentUser) return;
        setSending(true);
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await sendWhatsappMessage(token, { chatId: selectedId, text: draft.trim() });
            if (!res.ok) {
                showNotification(res.error, "error");
                return;
            }
            setDraft("");
            showNotification(t("send") + " ✓", "success");
        } finally {
            setSending(false);
        }
    };

    const handleClaim = async () => {
        if (!selectedId || !auth.currentUser) return;
        const token = await auth.currentUser.getIdToken();
        const res = await assignWahaChat(token, { chatId: selectedId, assignedTo: auth.currentUser.uid });
        if (!res.ok) showNotification(res.error, "error");
        else showNotification(t("mark_captured"), "success");
    };

    const handleAssign = async (targetUid: string) => {
        if (!selectedId || !auth.currentUser) return;
        const token = await auth.currentUser.getIdToken();
        const res = await assignWahaChat(token, { chatId: selectedId, assignedTo: targetUid });
        if (!res.ok) showNotification(res.error, "error");
        else showNotification(t("assign_to"), "success");
    };

    const handleSaveTicket = async () => {
        if (!selectedId || !auth.currentUser) return;
        const v = Number(ticketEdit);
        const token = await auth.currentUser.getIdToken();
        const res = await updateWahaTicketValue(token, { chatId: selectedId, ticketValue: v });
        if (!res.ok) showNotification(res.error, "error");
        else showNotification(t("ticket_value"), "success");
    };

    return (
        <div className="admin-container space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {isAdmin && <WahaLinesPanel />}

            <header className="px-2 relative">
                <div className="admin-decorator-line mb-4"></div>
                <h1 className="admin-h1 text-4xl mb-2">{t("chats")}</h1>
                <p className="admin-subtitle text-gray-500 font-medium">{t("chats_subtitle")}</p>
            </header>

            <div className="bg-[#0511F2]/5 p-8 rounded-[2.5rem] border border-[#0511F2]/10 flex items-start gap-6 relative overflow-hidden">
                <div className="diagonal-accent !opacity-[0.03]"></div>
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm relative z-10">💡</div>
                <div className="relative z-10">
                    <p className="text-lg font-black text-[#0511F2] tracking-tight mb-2 uppercase font-heading">{t("chats_help_title")}</p>
                    <ul className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[t("chats_help_1"), t("chats_help_2"), t("chats_help_3")].map((help, i) => (
                            <li key={i} className="text-[11px] text-[#0511F2]/70 font-bold leading-relaxed flex items-center gap-3">
                                <span className="w-2 h-2 bg-[#EE05F2] rounded-full flex-shrink-0 shadow-sm shadow-pink-500/50" />
                                {help}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {firestoreListenError && (
                <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 text-[11px] font-black text-rose-800 uppercase tracking-widest flex items-center gap-3">
                    <span className="text-lg">⚠️</span>
                    <strong>Firestore Error:</strong> {firestoreListenError}
                    {firestoreListenError.includes("index") && " — Requiere despliegue de índices."}
                </div>
            )}

            <div className="grid min-h-[700px] gap-8 lg:grid-cols-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                {/* Chat List Sidebar */}
                <aside className="lg:col-span-3 flex flex-col admin-card !p-0 overflow-hidden h-[600px] lg:h-auto border border-gray-100 relative">
                    <div className="diagonal-accent !opacity-[0.02]"></div>
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 relative z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                            {isAdmin ? "TODAS LAS LÍNEAS" : "MIS CONVERSACIONES"}
                        </span>
                        <span className="text-[10px] bg-[#0511F2] text-white px-3 py-1 rounded-full font-black shadow-md shadow-blue-200">{chats.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-gray-50 relative z-10">
                        {chats.length === 0 ? (
                            <div className="p-10 text-center opacity-40">
                                <span className="text-4xl block mb-4">🏜️</span>
                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{t("no_chats")}</p>
                            </div>
                        ) : (
                            chats.map((c) => {
                                const active = c.id === selectedId;
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setSelectedId(c.id)}
                                        className={`w-full p-6 text-left transition-all relative group ${active ? "bg-[#0511F2]/5" : "hover:bg-gray-50/80"}`}
                                    >
                                        {active && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#EE05F2] shadow-[2px_0_10px_rgba(238,5,242,0.3)]" />}
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <p className={`truncate font-black text-sm tracking-tight transition-colors uppercase ${active ? "text-[#0511F2]" : "text-gray-900"}`}>
                                                    {c.customerName || `+${c.customerPhone}`}
                                                </p>
                                                <p className="truncate text-[11px] font-bold text-gray-400 mt-1 line-clamp-1">{c.lastPreview || "Sin mensajes previos"}</p>
                                                <div className="flex items-center gap-2 mt-3">
                                                    <span className="text-[8px] font-black bg-white text-gray-500 px-2 py-1 rounded-lg uppercase tracking-tighter border border-gray-100 shadow-sm">
                                                        {c.sessionID}
                                                    </span>
                                                    <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter border ${c.assignedTo ? (c.assignedTo === uid ? "bg-[#6FD904]/10 text-[#6FD904] border-[#6FD904]/20" : "bg-gray-100 text-gray-400 border-gray-200") : "bg-amber-100 text-amber-600 border-amber-200"}`}>
                                                        {c.assignedTo ? (c.assignedTo === uid ? "MÍO" : "ASIGNADO") : "EN POOL"}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="flex-shrink-0 text-[10px] font-black text-[#0511F2] bg-white shadow-md shadow-gray-100 border border-gray-100 px-3 py-1.5 rounded-xl">
                                                {formatMoney(Number(c.ticketValue || 0))}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </aside>

                {/* Main Chat Interface */}
                <section className="lg:col-span-6 flex flex-col admin-card !p-0 overflow-hidden h-[600px] lg:h-auto bg-gray-50/30 border border-gray-100 relative">
                    <div className="diagonal-accent !opacity-[0.02]"></div>
                    {!selected ? (
                        <div className="flex flex-1 flex-col items-center justify-center p-10 text-center relative z-10">
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-4xl mb-6 shadow-xl shadow-gray-200/50 grayscale opacity-40">💬</div>
                            <h3 className="text-lg font-black text-gray-300 uppercase tracking-[0.2em] font-heading">{t("select_chat")}</h3>
                            <p className="text-[11px] text-gray-400 font-bold mt-3 max-w-[200px]">Selecciona una conversación para empezar a chatear</p>
                        </div>
                    ) : (
                        <>
                            <div className="p-6 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0511F2] to-blue-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-200">
                                        {(selected.customerName || selected.customerPhone).charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-black text-gray-900 text-lg tracking-tight leading-tight uppercase">{selected.customerName || `+${selected.customerPhone}`}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t("session_line")}:</span>
                                            <span className="text-[9px] font-black text-[#0511F2] uppercase tracking-widest bg-[#0511F2]/5 px-2 py-0.5 rounded-md">{selected.sessionID}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar relative z-10 bg-gray-50/20">
                                {messages.map((m, i) => {
                                    const mine = m.sender === "admin";
                                    const showDate = i === 0 || (m.createdAt && messages[i-1].createdAt && tsMillis(m.createdAt) - tsMillis(messages[i-1].createdAt) > 3600000);
                                    
                                    return (
                                        <div key={m.id} className="space-y-4">
                                            {showDate && (
                                                <div className="flex justify-center my-8">
                                                    <span className="text-[9px] font-black bg-gray-100 text-gray-400 px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-inner border border-gray-100">
                                                        {m.createdAt ? new Date(tsMillis(m.createdAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                                                    </span>
                                                </div>
                                            )}
                                            <div className={`flex ${mine ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-${mine ? 'right' : 'left'}-4 duration-500`}>
                                                <div className={`max-w-[85%] px-6 py-4 text-sm font-bold tracking-tight shadow-md transition-all hover:shadow-lg relative group
                                                    ${mine 
                                                        ? "bg-[#0511F2] text-white rounded-[2rem] rounded-tr-none shadow-blue-200" 
                                                        : "bg-white text-gray-900 rounded-[2rem] rounded-tl-none border border-gray-100 shadow-gray-100"}`}
                                                >
                                                    {mine && <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#EE05F2] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />}
                                                    {m.text}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="p-6 bg-white border-t border-gray-100 relative z-10">
                                <div className="flex items-center gap-4 bg-gray-50 p-2.5 rounded-[2rem] border border-gray-200 focus-within:border-[#0511F2]/30 focus-within:bg-white transition-all shadow-inner">
                                    <textarea
                                        value={draft}
                                        onChange={(e) => setDraft(e.target.value)}
                                        placeholder={t("type_message")}
                                        rows={1}
                                        className="flex-1 bg-transparent px-5 py-3 text-sm font-black outline-none no-scrollbar resize-none placeholder:text-gray-300 text-gray-900 uppercase tracking-tight"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                void handleSend();
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        disabled={sending || !draft.trim()}
                                        onClick={() => void handleSend()}
                                        className="w-14 h-14 rounded-full bg-[#EE05F2] text-white shadow-xl shadow-pink-200 flex items-center justify-center disabled:opacity-30 disabled:shadow-none hover:scale-110 active:scale-95 transition-all group"
                                    >
                                        {sending ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <span className="text-2xl rotate-[-20deg] group-hover:rotate-0 transition-transform">🚀</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </section>

                {/* Profile & Controls Sidebar */}
                <aside className="lg:col-span-3 space-y-8">
                    <div className="admin-card relative overflow-hidden border border-gray-100 shadow-xl shadow-gray-100">
                        <div className="diagonal-accent !opacity-[0.03]"></div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-8 relative z-10">{t("customer_profile")}</h3>
                        {!selected ? (
                            <div className="text-center py-16 opacity-30 relative z-10">
                                <span className="text-5xl block mb-4">👤</span>
                                <p className="text-[10px] font-black uppercase tracking-widest">{t("select_chat")}</p>
                            </div>
                        ) : (
                            <div className="space-y-10 relative z-10">
                                <div className="bg-[#6FD904]/5 p-8 rounded-[2.5rem] border border-[#6FD904]/10 shadow-inner">
                                    <p className="text-[9px] font-black uppercase text-[#6FD904] tracking-[0.2em] mb-2">{t("ticket_value")}</p>
                                    <p className="text-4xl font-black text-gray-900 tracking-tighter font-heading">{formatMoney(Number(selected.ticketValue || 0))}</p>
                                    <div className="mt-6 flex flex-col gap-3">
                                        <input
                                            type="number"
                                            min={0}
                                            value={ticketEdit}
                                            onChange={(e) => setTicketEdit(e.target.value)}
                                            className="w-full bg-white rounded-2xl border border-gray-100 px-5 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-[#6FD904]/10 transition-all text-center"
                                            placeholder="0"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => void handleSaveTicket()}
                                            className="w-full py-4 rounded-2xl bg-[#6FD904] text-white font-black text-xs hover:bg-[#5db603] transition-all shadow-lg shadow-[#6FD904]/30 uppercase tracking-widest"
                                        >
                                            {t("save").toUpperCase() || "ACTUALIZAR"}
                                        </button>
                                    </div>
                                </div>

                                {selected.assignedTo == null && (
                                    <button
                                        type="button"
                                        onClick={() => void handleClaim()}
                                        className="admin-btn admin-btn-primary w-full py-5 !rounded-2xl shadow-xl shadow-pink-200"
                                    >
                                        {t("mark_captured").toUpperCase()}
                                    </button>
                                )}

                                {isAdmin && (
                                    <div className="admin-input-group !mt-12 bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                                        <label className="admin-label !text-gray-400 !mb-4">Reasignar Responsable</label>
                                        <select
                                            className="admin-input !bg-white cursor-pointer !py-3"
                                            defaultValue=""
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                if (v) void handleAssign(v);
                                                e.target.value = "";
                                            }}
                                        >
                                            <option value="" disabled>{t("assign_to")}</option>
                                            {agents.map((a) => (
                                                <option key={a.uid} value={a.uid}>
                                                    {a.full_name || a.email}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[8px] text-gray-300 font-black uppercase tracking-widest mt-4 text-center">Control Administrativo</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {selected && (
                        <div className="admin-card border-gray-100 bg-gray-50/50 shadow-sm">
                            <h4 className="text-[9px] font-black uppercase text-gray-400 tracking-[0.2em] mb-6">Información Técnica</h4>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                    <span className="text-[10px] font-black text-gray-400 uppercase">ID CHAT</span>
                                    <span className="text-[10px] font-black text-[#0511F2] bg-white px-2 py-1 rounded border border-gray-100 shadow-sm">{selected.id.slice(-12).toUpperCase()}</span>
                                </div>
                                <div className="flex justify-between items-center py-3">
                                    <span className="text-[10px] font-black text-gray-400 uppercase">STATUS</span>
                                    <span className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-[#6FD904] rounded-full animate-pulse shadow-sm shadow-green-400"></span>
                                        <span className="text-[10px] font-black text-[#6FD904] uppercase tracking-tighter">ONLINE</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
