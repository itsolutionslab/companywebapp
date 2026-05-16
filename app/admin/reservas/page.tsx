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
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0511F2]/20 border-t-[#0511F2]"></div>
                    <p className="text-gray-400 font-bold animate-pulse">{t('loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Header & Stats Bar */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 px-2 relative">
                <div>
                    <div className="admin-decorator-line mb-4"></div>
                    <h1 className="admin-h1 text-4xl mb-2">🤝 {t('reservations')}</h1>
                    <p className="admin-subtitle text-gray-500 font-medium">{t('manage_reservations')}</p>
                </div>

                <div className="flex bg-gray-50 p-1.5 rounded-[2rem] border border-gray-100 shadow-inner overflow-x-auto no-scrollbar max-w-full">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setFilterDate(getTodayStr())}
                            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${filterDate === getTodayStr() ? 'bg-[#0511F2] text-white shadow-xl shadow-blue-200 scale-[1.05]' : 'text-gray-400 hover:text-[#0511F2]'}`}
                        >
                            📍 {t('today')}
                        </button>
                        <button
                            onClick={() => setFilterDate(getTomorrowStr())}
                            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${filterDate === getTomorrowStr() ? 'bg-[#0511F2] text-white shadow-xl shadow-blue-200 scale-[1.05]' : 'text-gray-400 hover:text-[#0511F2]'}`}
                        >
                            🌅 {t('tomorrow')}
                        </button>
                        <button
                            onClick={() => setFilterDate("")}
                            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${!filterDate ? 'bg-[#0511F2] text-white shadow-xl shadow-blue-200 scale-[1.05]' : 'text-gray-400 hover:text-[#0511F2]'}`}
                        >
                            🌐 TODOS
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="admin-card group">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('today')}</p>
                    <p className="text-3xl font-black text-[#0511F2] font-heading uppercase">{stats.totalToday}</p>
                    <div className="mt-3 w-8 h-1 bg-[#0511F2]/20 rounded-full group-hover:w-full group-hover:bg-[#0511F2] transition-all duration-500" />
                </div>
                <div className="admin-card group">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('pending')}</p>
                    <p className="text-3xl font-black text-amber-500 font-heading uppercase">{stats.pending}</p>
                    <div className="mt-3 w-8 h-1 bg-amber-100 rounded-full group-hover:w-full group-hover:bg-amber-500 transition-all duration-500" />
                </div>
                <div className="admin-card group">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('confirmed')}</p>
                    <p className="text-3xl font-black text-[#6FD904] font-heading uppercase">{stats.confirmed}</p>
                    <div className="mt-3 w-8 h-1 bg-[#6FD904]/20 rounded-full group-hover:w-full group-hover:bg-[#6FD904] transition-all duration-500" />
                </div>
            </div>

            {/* Advanced Filters */}
            <div className="flex flex-wrap items-center gap-4 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="diagonal-accent !opacity-[0.03]"></div>
                <div className="flex-1 min-w-[200px] admin-input-group !mb-0 relative z-10">
                    <label className="admin-label">Filtrar por Fecha</label>
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="admin-input !py-3"
                    />
                </div>
                <div className="flex-1 min-w-[200px] admin-input-group !mb-0 relative z-10">
                    <label className="admin-label">Estado de Reserva</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="admin-input !py-3 cursor-pointer"
                    >
                        <option value="all">{t('all_status')}</option>
                        <option value="pending">⏳ {t('pending')}</option>
                        <option value="confirmed">✅ {t('confirmed')}</option>
                        <option value="attended">✨ {t('attended')}</option>
                        <option value="cancelled">❌ {t('cancelled')}</option>
                    </select>
                </div>
            </div>

            {/* Bookings List by Groups */}
            <div className="space-y-12">
                {Object.entries(filteredAndGrouped).map(([key, group]) => {
                    if (group.length === 0) return null;
                    return (
                        <div key={key} className="space-y-6">
                            <div className="flex items-center gap-4">
                                <h2 className="text-[11px] font-black text-[#0511F2] uppercase tracking-[0.3em] whitespace-nowrap">
                                    {t(key as any)}
                                </h2>
                                <div className="h-px w-full bg-[#0511F2]/10" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <div className="text-center py-32 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                        <div className="text-5xl mb-6 grayscale opacity-30">🔍</div>
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">{t('clear')}</h3>
                        <p className="text-[11px] text-gray-300 font-bold mt-2">Prueba ajustando los filtros de búsqueda</p>
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
        pending: { color: 'bg-amber-400', bg: 'bg-amber-50', icon: '⏳', text: 'text-amber-700', border: 'border-amber-100' },
        confirmed: { color: 'bg-[#0511F2]', bg: 'bg-[#0511F2]/5', icon: '✅', text: 'text-[#0511F2]', border: 'border-[#0511F2]/20' },
        attended: { color: 'bg-[#6FD904]', bg: 'bg-[#6FD904]/10', icon: '✨', text: 'text-green-700', border: 'border-[#6FD904]/20' },
        cancelled: { color: 'bg-rose-500', bg: 'bg-rose-50', icon: '❌', text: 'text-rose-700', border: 'border-rose-100' }
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
        <div className="admin-card group transition-all flex flex-col h-full relative overflow-hidden">
            <div className="diagonal-accent !opacity-[0.03]"></div>
            <div className="relative z-10 flex flex-col flex-1">
                {/* Status & Time Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className={`${config.bg} ${config.text} ${config.border} border px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5`}>
                        <span className="text-sm">{config.icon}</span>
                        {t(booking.status as any)}
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-black text-gray-900 tracking-tight">{booking.time}</p>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">{formatDate(booking.date)}</p>
                    </div>
                </div>

                {/* Client Info */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200/50 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform group-hover:-rotate-3">
                        👤
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-black text-[#0511F2] text-xl font-heading leading-none mb-2 truncate uppercase tracking-tight">{booking.customerName}</h3>
                        <div className="flex items-center gap-3">
                            <span className="text-[11px] text-gray-500 font-bold tracking-tight">{cleanPhone}</span>
                            {cleanPhone && (
                                <div className="flex gap-2">
                                    <a href={`tel:${cleanPhone}`} className="w-7 h-7 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center text-xs hover:bg-blue-100 transition-colors">📞</a>
                                    <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center text-xs hover:bg-emerald-100 transition-colors">💬</a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Services List */}
                <div className="bg-gray-50 rounded-2xl p-4 mb-6 flex flex-wrap gap-2 flex-1 shadow-inner border border-gray-100">
                    {booking.services?.map((s, idx) => (
                        <span key={idx} className="text-[9px] font-black uppercase tracking-widest bg-white text-[#0511F2] px-3 py-1.5 rounded-xl border border-[#0511F2]/10 shadow-sm">
                            🚀 {s.name}
                        </span>
                    ))}
                    {(!booking.services || booking.services.length === 0) && (
                        <span className="text-[10px] text-gray-400 font-bold italic">No hay servicios listados</span>
                    )}
                </div>

                {/* Quick Actions Footer */}
                <div className="space-y-3 mt-auto">
                    {reactivationFailed && (
                        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                            <p className="text-[9px] font-black text-rose-700 uppercase tracking-widest leading-relaxed">
                                ⚠️ {t('slot_unavailable') || "Horario no disponible, reagende su reunion"}
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        {booking.status === 'pending' && (
                            <button
                                onClick={() => onStatusChange(booking.id, 'confirmed')}
                                className="flex-1 admin-btn admin-btn-primary shadow-xl shadow-pink-200 !text-[9px]"
                            >
                                {t('confirmed').toUpperCase()}
                            </button>
                        )}
                        {booking.status === 'cancelled' && (
                            <div className="flex flex-1 gap-2">
                                <button
                                    onClick={handleReactivateClick}
                                    disabled={isReactivating}
                                    className="flex-1 admin-btn admin-btn-secondary !text-[9px] flex items-center justify-center gap-2"
                                >
                                    {isReactivating && <div className="w-3 h-3 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />}
                                    {t('reactivate').toUpperCase()}
                                </button>
                                {reactivationFailed && (
                                    <button
                                        onClick={() => onRescheduleAttempt(booking)}
                                        className="flex-1 admin-btn admin-btn-primary !text-[9px]"
                                    >
                                        REAGENDAR
                                    </button>
                                )}
                            </div>
                        )}
                        {booking.status !== 'attended' && booking.status !== 'cancelled' && (
                            <button
                                onClick={() => onStatusChange(booking.id, 'attended')}
                                className="flex-1 admin-btn bg-[#6FD904] text-white hover:bg-green-600 shadow-lg shadow-green-100 !text-[9px]"
                            >
                                ASISTIDO
                            </button>
                        )}
                        {booking.status !== 'cancelled' && (
                            <button
                                onClick={() => onStatusChange(booking.id, 'cancelled')}
                                className="w-12 admin-btn admin-btn-secondary !bg-rose-50 !text-rose-500 !border-rose-100 hover:!bg-rose-100"
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
