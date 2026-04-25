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
        <div className="w-full min-w-0">
            {isAdmin && <WahaLinesPanel />}

            <header className="mb-6">
                <h1 className="text-3xl font-black text-gray-900">{t("chats")}</h1>
                <p className="text-gray-500">{t("chats_subtitle")}</p>
            </header>

            <div className="mb-6 rounded-2xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-950">
                <p className="font-bold">{t("chats_help_title")}</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-amber-900/90">
                    <li>{t("chats_help_1")}</li>
                    <li>{t("chats_help_2")}</li>
                    <li>{t("chats_help_3")}</li>
                </ul>
            </div>

            {firestoreListenError && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    <strong>Firestore:</strong> {firestoreListenError}
                    {firestoreListenError.includes("index") ? " — Crea el índice compuesto en la consola de Firebase o ejecuta deploy de firestore.indexes.json." : ""}
                </div>
            )}

            <div className="grid min-h-[520px] gap-4 lg:grid-cols-12">
                {/* Lista */}
                <aside className="lg:col-span-3 flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="border-b border-gray-50 p-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {isAdmin ? "Todos" : `${t("pool_chat")} / ${t("mine_chat")}`}
                    </div>
                    <div className="max-h-[520px] flex-1 overflow-y-auto">
                        {chats.length === 0 ? (
                            <p className="p-4 text-sm text-gray-400">{t("no_chats")}</p>
                        ) : (
                            chats.map((c) => {
                                const active = c.id === selectedId;
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setSelectedId(c.id)}
                                        className={`w-full border-b border-gray-50 px-4 py-3 text-left transition ${active ? "bg-[#E6007E]/8" : "hover:bg-gray-50"}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="truncate font-bold text-gray-900">
                                                    {c.customerName || `+${c.customerPhone}`}
                                                </p>
                                                <p className="truncate text-xs text-gray-400">{c.lastPreview || "—"}</p>
                                                <p className="mt-1 text-[10px] font-semibold text-[#0081C8]">
                                                    {c.sessionID} ·{" "}
                                                    {c.assignedTo ? (c.assignedTo === uid ? t("mine_chat") : "Asignado") : t("pool_chat")}
                                                </p>
                                            </div>
                                            <span className="flex-shrink-0 rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                                {formatMoney(Number(c.ticketValue || 0))}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </aside>

                {/* Mensajes */}
                <section className="lg:col-span-6 flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm">
                    {!selected ? (
                        <div className="flex flex-1 items-center justify-center p-8 text-gray-400">{t("select_chat")}</div>
                    ) : (
                        <>
                            <div className="border-b border-gray-50 px-4 py-3">
                                <p className="font-bold text-gray-900">{selected.customerName || `+${selected.customerPhone}`}</p>
                                <p className="text-xs text-gray-500">
                                    {t("session_line")}: {selected.sessionID}
                                </p>
                            </div>
                            <div className="flex max-h-[380px] flex-1 flex-col gap-2 overflow-y-auto p-4">
                                {messages.map((m) => {
                                    const mine = m.sender === "admin";
                                    return (
                                        <div
                                            key={m.id}
                                            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? "ml-auto bg-[#0081C8] text-white" : "mr-auto bg-gray-100 text-gray-900"}`}
                                        >
                                            {m.text}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="border-t border-gray-50 p-3">
                                <div className="flex gap-2">
                                    <input
                                        value={draft}
                                        onChange={(e) => setDraft(e.target.value)}
                                        placeholder={t("type_message")}
                                        className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#E6007E]"
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
                                        className="rounded-xl bg-[#E6007E] px-4 py-2 text-xs font-bold text-white shadow-md disabled:opacity-40"
                                    >
                                        {sending ? t("sending") : t("send")}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </section>

                {/* Perfil */}
                <aside className="lg:col-span-3 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">{t("customer_profile")}</h3>
                    {!selected ? (
                        <p className="text-sm text-gray-400">{t("select_chat")}</p>
                    ) : (
                        <>
                            <div className="rounded-xl bg-gray-50 p-4">
                                <p className="text-[10px] font-bold uppercase text-gray-400">{t("ticket_value")}</p>
                                <p className="text-2xl font-black text-gray-900">{formatMoney(Number(selected.ticketValue || 0))}</p>
                                <div className="mt-3 flex gap-2">
                                    <input
                                        type="number"
                                        min={0}
                                        value={ticketEdit}
                                        onChange={(e) => setTicketEdit(e.target.value)}
                                        className="w-full rounded-lg border border-gray-200 px-2 py-1 text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => void handleSaveTicket()}
                                        className="rounded-lg bg-[#00A651] px-3 py-1 text-xs font-bold text-white"
                                    >
                                        OK
                                    </button>
                                </div>
                            </div>

                            {selected.assignedTo == null && (
                                <button
                                    type="button"
                                    onClick={() => void handleClaim()}
                                    className="w-full rounded-xl bg-[#0081C8] py-3 text-xs font-bold text-white shadow-md"
                                >
                                    {t("mark_captured")}
                                </button>
                            )}

                            {isAdmin && (
                                <div>
                                    <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                                        {t("assign_to")}
                                    </label>
                                    <select
                                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                                        defaultValue=""
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            if (v) void handleAssign(v);
                                            e.target.value = "";
                                        }}
                                    >
                                        <option value="">{t("assign_to")}</option>
                                        {agents.map((a) => (
                                            <option key={a.uid} value={a.uid}>
                                                {a.full_name || a.email} ({a.role})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </>
                    )}
                </aside>
            </div>
        </div>
    );
}
