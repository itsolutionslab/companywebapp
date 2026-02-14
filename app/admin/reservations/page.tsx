"use client";

import { useEffect, useState, useMemo } from "react";
import { onBookingsUpdate, updateBookingStatus, auth, isSlotAvailable } from "@/lib/firebase";
import { BookingData } from "@/types/booking";
import { useTranslation } from "@/components/admin/LanguageContext";
import { useNotification } from "@/components/admin/NotificationContext";
import ScheduleModal from "@/components/admin/ScheduleModal";

export default function ReservationsPage() {
    const { lang, t } = useTranslation();
    const { showNotification } = useNotification();
    const [bookings, setBookings] = useState<BookingData[]>([]);
    const [loading, setLoading] = useState(true);
    const [reschedulingBooking, setReschedulingBooking] = useState<BookingData | null>(null);
    const [isSavingReschedule, setIsSavingReschedule] = useState(false);

    function getTodayStr() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function getTomorrowStr() {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    const [filterDate, setFilterDate] = useState(""); // Default to show all groups (Today, Tomorrow, Upcoming)
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        const unsubscribe = onBookingsUpdate((data: BookingData[]) => {
            setBookings(data.sort((a, b) => {
                const dateA = `${a.date}T${a.time}`;
                const dateB = `${b.date}T${b.time}`;
                return dateA.localeCompare(dateB);
            }));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleStatusChange = async (id: string, newStatus: BookingData['status']) => {
        try {
            const currentUser = auth.currentUser;
            const historyEntry = {
                action: `status_change_to_${newStatus}`,
                changed_by: currentUser ? (currentUser.email || currentUser.uid) : 'unknown',
                timestamp: new Date().toISOString(),
                details: `Status updated to ${newStatus}`
            };

            await updateBookingStatus(id, newStatus, historyEntry);
            showNotification(`Estado actualizado a ${newStatus}`, 'success');
        } catch (error) {
            showNotification(t('error_updating'), 'error');
        }
    };

    const handleReactivate = async (booking: BookingData) => {
        try {
            const available = await isSlotAvailable(booking.date, booking.time);
            if (available) {
                await handleStatusChange(booking.id, 'confirmed');
            } else {
                showNotification(t('slot_unavailable') || "Horario no disponible", 'error');
                // Return false or handle UI state if needed
                return false;
            }
        } catch (error) {
            showNotification(t('error_updating'), 'error');
        }
        return true;
    };

    const handleReschedule = async (date: string, time: string) => {
        if (!reschedulingBooking) return;
        setIsSavingReschedule(true);
        try {
            const currentUser = auth.currentUser;
            const historyEntry = {
                action: 'rescheduled',
                changed_by: currentUser ? (currentUser.email || currentUser.uid) : 'unknown',
                timestamp: new Date().toISOString(),
                details: `Meeting rescheduled from ${reschedulingBooking.date} ${reschedulingBooking.time} to ${date} ${time}`
            };

            // We update both status and time/date
            const { db } = await import("@/lib/firebase");
            const { doc, updateDoc, arrayUnion } = await import("firebase/firestore");
            const bookingRef = doc(db, "bookings", reschedulingBooking.id);
            await updateDoc(bookingRef, {
                date,
                time,
                status: 'confirmed',
                history: arrayUnion(historyEntry)
            });

            showNotification("Reunión reagendada con éxito", "success");
            setReschedulingBooking(null);
        } catch (error) {
            showNotification("Error al reagendar", "error");
        } finally {
            setIsSavingReschedule(false);
        }
    };

    const filteredAndGrouped = useMemo(() => {
        let list = [...bookings];

        if (filterDate) {
            list = list.filter(b => b.date === filterDate);
        }

        if (statusFilter !== "all") {
            list = list.filter(b => b.status === statusFilter);
        }

        const today = getTodayStr();
        const tomorrow = getTomorrowStr();

        const groups: Record<string, BookingData[]> = {
            today: [],
            tomorrow: [],
            upcoming: [],
            past: []
        };

        list.forEach(booking => {
            if (booking.date === today) groups.today.push(booking);
            else if (booking.date === tomorrow) groups.tomorrow.push(booking);
            else if (booking.date > today) groups.upcoming.push(booking);
            else groups.past.push(booking);
        });

        return groups;
    }, [bookings, filterDate, statusFilter]);

    const stats = useMemo(() => {
        const today = getTodayStr();
        const todaysBookings = bookings.filter(b => b.date === today);
        return {
            totalToday: todaysBookings.length,
            pending: bookings.filter(b => b.status === 'pending').length,
            confirmed: bookings.filter(b => b.status === 'confirmed').length
        };
    }, [bookings]);

    const formatDate = (dateStr: string) => {
        try {
            const [year, month, day] = dateStr.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            const locale = lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'es-ES';
            return date.toLocaleDateString(locale, {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-100 border-t-pink-500"></div>
                    <p className="text-gray-400 font-bold animate-pulse">{t('loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-24 max-w-5xl mx-auto px-1">
            {/* Header & Stats Bar */}
            <div className="sticky top-0 z-40 bg-gray-50/80 backdrop-blur-md pt-2 pb-4 mb-6">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight">🤝 {t('reservations')}</h1>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t('manage_reservations')}</p>
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter mb-1">{t('today')}</p>
                            <p className="text-xl font-black text-pink-500">{stats.totalToday}</p>
                        </div>
                        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-yellow-400">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter mb-1">{t('pending')}</p>
                            <p className="text-xl font-black text-yellow-600">{stats.pending}</p>
                        </div>
                        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-blue-400">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter mb-1">{t('confirmed')}</p>
                            <p className="text-xl font-black text-blue-600">{stats.confirmed}</p>
                        </div>
                    </div>

                    {/* Filters Strip */}
                    <div className="flex flex-col gap-3">
                        {/* Quick Select Chips */}
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            <button
                                onClick={() => setFilterDate(getTodayStr())}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterDate === getTodayStr() ? 'bg-pink-500 text-white shadow-lg shadow-pink-200' : 'bg-white border-2 border-gray-100 text-gray-400'}`}
                            >
                                📍 {t('today')}
                            </button>
                            <button
                                onClick={() => setFilterDate(getTomorrowStr())}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterDate === getTomorrowStr() ? 'bg-pink-500 text-white shadow-lg shadow-pink-200' : 'bg-white border-2 border-gray-100 text-gray-400'}`}
                            >
                                🌅 {t('tomorrow')}
                            </button>
                            <button
                                onClick={() => setFilterDate("")}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!filterDate ? 'bg-pink-500 text-white shadow-lg shadow-pink-200' : 'bg-white border-2 border-gray-100 text-gray-400'}`}
                            >
                                🌐 {t('all_status')}
                            </button>
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                            <div className="relative group shrink-0">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pink-500 transition-colors">🗓️</span>
                                <input
                                    type="date"
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value)}
                                    className="pl-9 pr-3 py-2 bg-white border-2 border-gray-100 rounded-xl outline-none focus:border-pink-300 transition-all text-xs font-bold w-40"
                                />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-2 bg-white border-2 border-gray-100 rounded-xl outline-none focus:border-pink-300 transition-all text-xs font-bold shrink-0"
                            >
                                <option value="all">{t('all_status')}</option>
                                <option value="pending">⏳ {t('pending')}</option>
                                <option value="confirmed">✅ {t('confirmed')}</option>
                                <option value="attended">✨ {t('attended')}</option>
                                <option value="cancelled">❌ {t('cancelled')}</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bookings List by Groups */}
            <div className="space-y-8">
                {Object.entries(filteredAndGrouped).map(([key, group]) => {
                    if (group.length === 0) return null;
                    return (
                        <div key={key} className="space-y-4">
                            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                                {t(key as any)}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {group.map(booking => (
                                    <BookingCard
                                        key={booking.id}
                                        booking={booking}
                                        t={t}
                                        onStatusChange={handleStatusChange}
                                        formatDate={formatDate}
                                        onReactivate={handleReactivate}
                                        onRescheduleAttempt={(b) => setReschedulingBooking(b)}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}

                {bookings.length > 0 && Object.values(filteredAndGrouped).every(g => g.length === 0) && (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100 mx-2">
                        <div className="text-4xl mb-3">🔍</div>
                        <p className="text-gray-400 font-bold">{t('clear')}</p>
                    </div>
                )}
            </div>

            {/* Rescheduling Modal */}
            <ScheduleModal
                isOpen={!!reschedulingBooking}
                onClose={() => setReschedulingBooking(null)}
                onSave={handleReschedule}
                title={t('reschedule') || 'Reagendar Sesión'}
                subtitle={`${reschedulingBooking?.customerName}`}
                initialDate={reschedulingBooking?.date}
                isSaving={isSavingReschedule}
            />
        </div>
    );
}

function BookingCard({ booking, t, onStatusChange, formatDate, onReactivate, onRescheduleAttempt }: {
    booking: BookingData;
    t: any;
    onStatusChange: any;
    formatDate: any;
    onReactivate: (b: BookingData) => Promise<boolean>;
    onRescheduleAttempt: (b: BookingData) => void;
}) {
    const statusConfig = {
        pending: { color: 'bg-amber-400', bg: 'bg-amber-50', icon: '⏳', text: 'text-amber-700' },
        confirmed: { color: 'bg-cyan-500', bg: 'bg-cyan-50', icon: '✅', text: 'text-cyan-700' },
        attended: { color: 'bg-emerald-500', bg: 'bg-emerald-50', icon: '✨', text: 'text-emerald-700' },
        cancelled: { color: 'bg-rose-500', bg: 'bg-rose-50', icon: '❌', text: 'text-rose-700' }
    };

    const config = statusConfig[booking.status as keyof typeof statusConfig] || statusConfig.pending;
    const cleanPhone = booking.customerPhone?.replace(/\D/g, '');
    const [reactivationFailed, setReactivationFailed] = useState(false);
    const [isReactivating, setIsReactivating] = useState(false);

    const handleReactivateClick = async () => {
        setIsReactivating(true);
        const success = await onReactivate(booking);
        if (!success) {
            setReactivationFailed(true);
        }
        setIsReactivating(false);
    };

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="p-4">
                {/* Status & Time Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className={`${config.bg} ${config.text} px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5`}>
                        <span>{config.icon}</span>
                        {t(booking.status as any)}
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-black text-gray-900">{booking.time}</p>
                        <p className="text-[10px] text-gray-400 font-bold capitalize">{formatDate(booking.date)}</p>
                    </div>
                </div>

                {/* Client Info */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center text-xl shadow-inner">
                        👤
                    </div>
                    <div>
                        <h3 className="font-black text-gray-900 text-lg leading-tight">{booking.customerName}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-400 font-bold">{cleanPhone}</span>
                            {cleanPhone && (
                                <div className="flex gap-2">
                                    <a href={`tel:${cleanPhone}`} className="text-xs text-blue-500 hover:scale-110 active:scale-95 transition-all">📞</a>
                                    <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noopener noreferrer" className="text-xs text-green-500 hover:scale-110 active:scale-95 transition-all">💬</a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Services List */}
                <div className="bg-gray-50 rounded-2xl p-3 mb-4 flex flex-wrap gap-1.5">
                    {booking.services?.map((s, idx) => (
                        <span key={idx} className="text-[10px] font-black uppercase tracking-tighter bg-white text-gray-600 px-2 py-1 rounded-lg border border-gray-100 shadow-sm">
                            🚀 {s.name}
                        </span>
                    ))}
                    {(!booking.services || booking.services.length === 0) && (
                        <span className="text-[10px] text-gray-400 italic">No services listed</span>
                    )}
                </div>

                {/* Quick Actions Footer */}
                <div className="flex flex-col gap-2 pt-2 border-t border-gray-50">
                    {reactivationFailed && (
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 mb-2">
                            <p className="text-[9px] font-black text-amber-700 uppercase leading-tight">
                                ⚠️ {t('slot_unavailable') || "Horario no disponible, reagende su reunion"}
                            </p>
                        </div>
                    )}

                    <div className="flex gap-2">
                        {booking.status === 'pending' && (
                            <button
                                onClick={() => onStatusChange(booking.id, 'confirmed')}
                                className="flex-1 py-3 bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 active:scale-95 transition-all"
                            >
                                {t('confirmed')}
                            </button>
                        )}
                        {booking.status === 'cancelled' && (
                            <div className="flex flex-1 gap-2">
                                <button
                                    onClick={handleReactivateClick}
                                    disabled={isReactivating}
                                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                >
                                    {isReactivating && <div className="w-2 h-2 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin"></div>}
                                    {t('reactivate') || 'Reactivar'}
                                </button>
                                {reactivationFailed && (
                                    <button
                                        onClick={() => onRescheduleAttempt(booking)}
                                        className="flex-1 py-3 bg-cyan-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-cyan-100 transition-all font-black"
                                    >
                                        {t('reschedule') || 'Reagendar'}
                                    </button>
                                )}
                            </div>
                        )}
                        {booking.status !== 'attended' && booking.status !== 'cancelled' && (
                            <button
                                onClick={() => onStatusChange(booking.id, 'attended')}
                                className="flex-1 py-3 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-100 active:scale-95 transition-all"
                            >
                                {t('attended')}
                            </button>
                        )}
                        {booking.status !== 'cancelled' && (
                            <button
                                onClick={() => onStatusChange(booking.id, 'cancelled')}
                                className="px-4 py-3 bg-red-50 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
