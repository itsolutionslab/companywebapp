"use client";

import { useEffect, useState } from "react";
import { onBookingsUpdate, onAvailabilityUpdate, updateDisabledSlots, getBusinessSettings, updateBusinessSettings } from "@/lib/firebase";
import { BookingData, BusinessProfile } from "@/types/booking";
import { useTranslation } from "@/components/admin/LanguageContext";
import { useNotification } from "@/components/admin/NotificationContext";
import { getTimeSlotsForDate } from "@/lib/timeSlots";

type Mode = 'hours' | 'single' | 'range';

type WeeklySchedule = Record<string, { open: string; close: string; closed: boolean }>;

export default function SchedulesPage() {
    const { t } = useTranslation();
    const { showNotification } = useNotification();
    const [bookings, setBookings] = useState<BookingData[]>([]);
    const [loading, setLoading] = useState(true);

    // --- State ---
    const [mode, setMode] = useState<Mode>('hours');
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // Range Selection State
    const [rangeStart, setRangeStart] = useState<string | null>(null);
    const [rangeEnd, setRangeEnd] = useState<string | null>(null);

    const [timeSlots, setTimeSlots] = useState<string[]>([]);
    const [disabledSlots, setDisabledSlots] = useState<string[]>([]);

    // Weekly Schedule State
    const [showWeeklyModal, setShowWeeklyModal] = useState(false);
    const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({
        monday: { open: '09:00', close: '17:30', closed: false },
        tuesday: { open: '09:00', close: '17:30', closed: false },
        wednesday: { open: '09:00', close: '17:30', closed: false },
        thursday: { open: '09:00', close: '17:30', closed: false },
        friday: { open: '09:00', close: '17:30', closed: false },
        saturday: { open: '09:00', close: '17:30', closed: false },
        sunday: { open: '09:00', close: '17:30', closed: true },
    });
    const [savingSchedule, setSavingSchedule] = useState(false);
    const [timeInterval, setTimeInterval] = useState<number>(30); // 15, 30, or 60 minutes

    useEffect(() => {
        getBusinessSettings().then(settings => {
            if (settings?.schedules) {
                setWeeklySchedule(settings.schedules);
            }
            if (settings?.timeInterval) {
                setTimeInterval(settings.timeInterval);
            }
        });

        const unsubscribeBookings = onBookingsUpdate((data: BookingData[]) => {
            setBookings(data);
            setLoading(false);
        });

        const unsubscribeAvailability = onAvailabilityUpdate((disabled: string[]) => {
            setDisabledSlots(disabled);
        });

        return () => {
            unsubscribeBookings();
            unsubscribeAvailability();
        };
    }, []);

    // Generate time slots dynamically when selected date or schedule changes
    useEffect(() => {
        if (selectedDate && weeklySchedule) {
            const slots = getTimeSlotsForDate(selectedDate, weeklySchedule, timeInterval);
            setTimeSlots(slots);
        }
    }, [selectedDate, weeklySchedule, timeInterval]);

    // --- Helpers ---

    const getLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getDayOfWeek = (dateStr: string): string => {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const date = new Date(dateStr + 'T00:00:00');
        return days[date.getDay()];
    };

    const isDayClosedBySchedule = (dateStr: string): boolean => {
        const dayOfWeek = getDayOfWeek(dateStr);
        return weeklySchedule[dayOfWeek]?.closed || false;
    };

    const getSlotStatus = (dateStr: string, time: string) => {
        if (disabledSlots.includes(`${dateStr}_${time}`)) return "disabled";
        const booking = bookings.find(b => b.date === dateStr && b.time === time);
        if (booking) {
            if (booking.status === 'attended') return "attended";
            if (booking.status === 'cancelled') return "available";
            return "occupied";
        }
        return "available";
    };

    const isDayFullDisabled = (dateStr: string) => {
        return timeSlots.every(slot => disabledSlots.includes(`${dateStr}_${slot}`));
    };

    const isDayPartiallyDisabled = (dateStr: string) => {
        if (isDayFullDisabled(dateStr)) return false;
        return timeSlots.some(slot => disabledSlots.includes(`${dateStr}_${slot}`));
    };

    const hasBookings = (dateStr: string) => {
        return bookings.some(b => b.date === dateStr && b.status !== 'cancelled');
    };

    // --- Calendar Logic ---

    const changeMonth = (offset: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setViewDate(newDate);
    };

    const handleDateClick = (day: number) => {
        const clickedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        const dateStr = getLocalDateString(clickedDate);

        if (mode === 'hours' || mode === 'single') {
            setSelectedDate(dateStr);
        } else if (mode === 'range') {
            if (!rangeStart || (rangeStart && rangeEnd)) {
                setRangeStart(dateStr);
                setRangeEnd(null);
            } else {
                if (new Date(dateStr + 'T00:00:00') < new Date(rangeStart + 'T00:00:00')) {
                    setRangeEnd(rangeStart);
                    setRangeStart(dateStr);
                } else {
                    setRangeEnd(dateStr);
                }
            }
        }
    };

    const renderCalendar = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-12 md:h-14 w-full"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = getLocalDateString(date);

            const isSelected = selectedDate === dateStr && mode !== 'range';
            const isRangeStart = rangeStart === dateStr;
            const isRangeEnd = rangeEnd === dateStr;
            const isInRange = rangeStart && rangeEnd && dateStr > rangeStart && dateStr < rangeEnd;
            const isDisabled = isDayFullDisabled(dateStr);
            const isClosedBySchedule = isDayClosedBySchedule(dateStr);
            const isPartial = isDayPartiallyDisabled(dateStr);
            const isToday = dateStr === getLocalDateString(new Date());
            const booked = hasBookings(dateStr);

            let bgClass = "bg-white hover:bg-gray-50";
            let textClass = "text-gray-700";
            let borderClass = "border border-gray-100";

            if (mode === 'range') {
                if (isRangeStart || isRangeEnd) {
                    bgClass = "bg-pink-500 text-white shadow-lg shadow-pink-200";
                    textClass = "text-white";
                    borderClass = "border-pink-500";
                } else if (isInRange) {
                    bgClass = "bg-pink-50";
                    textClass = "text-pink-600";
                    borderClass = "border-pink-100";
                } else if (isDisabled || isClosedBySchedule) {
                    bgClass = isClosedBySchedule ? "bg-gray-50 opacity-50" : "bg-gray-100";
                    textClass = "text-gray-400";
                }
            } else {
                if (isSelected) {
                    bgClass = "bg-pink-500 text-white shadow-lg shadow-pink-200";
                    textClass = "text-white";
                    borderClass = "border-pink-500";
                } else if (isClosedBySchedule) {
                    bgClass = "bg-gray-50 opacity-50";
                    textClass = "text-gray-300";
                    borderClass = "border-gray-50";
                } else if (isDisabled) {
                    bgClass = "bg-gray-100";
                    textClass = "text-gray-400";
                } else if (booked) {
                    borderClass = "border-red-200 border-2";
                }
            }

            days.push(
                <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`h-12 md:h-14 w-full rounded-xl md:rounded-2xl flex flex-col items-center justify-center relative transition-all duration-200 ${bgClass} ${borderClass}`}
                >
                    <span className={`text-xs md:text-sm font-bold ${textClass}`}>{day}</span>
                    <div className="flex gap-0.5 mt-0.5">
                        {booked && <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-red-400"></div>}
                        {isPartial && <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-gray-400"></div>}
                        {isClosedBySchedule && <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-gray-300"></div>}
                    </div>
                    {isToday && <div className="absolute top-0.5 right-1 text-[7px] md:text-[8px] font-bold text-pink-500">{t('today_caps')}</div>}
                </button>
            );
        }
        return days;
    };

    // --- Actions ---

    const toggleSingleSlot = async (time: string) => {
        const key = `${selectedDate}_${time}`;
        const newDisabledSlots = disabledSlots.includes(key)
            ? disabledSlots.filter(k => k !== key)
            : [...disabledSlots, key];

        try {
            await updateDisabledSlots(newDisabledSlots);
        } catch (error) {
            showNotification(t('error_updating'), 'error');
        }
    };

    const toggleFullDay = async (dateStr: string, disable: boolean) => {
        let newSlots = [...disabledSlots];
        timeSlots.forEach(time => {
            const key = `${dateStr}_${time}`;
            if (disable) {
                if (!newSlots.includes(key)) newSlots.push(key);
            } else {
                newSlots = newSlots.filter(k => k !== key);
            }
        });
        try {
            await updateDisabledSlots(newSlots);
        } catch (error) {
            showNotification(t('error_updating'), 'error');
        }
    };

    const handleRangeAction = async (action: 'block' | 'unblock') => {
        if (!rangeStart || !rangeEnd) return;

        const start = new Date(rangeStart + 'T00:00:00');
        const end = new Date(rangeEnd + 'T00:00:00');
        let newSlots = [...disabledSlots];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = getLocalDateString(d);
            timeSlots.forEach(time => {
                const key = `${dateStr}_${time}`;
                if (action === 'block') {
                    if (!newSlots.includes(key)) newSlots.push(key);
                } else {
                    newSlots = newSlots.filter(k => k !== key);
                }
            });
        }

        try {
            await updateDisabledSlots(newSlots);
            setRangeStart(null);
            setRangeEnd(null);
            showNotification(action === 'block' ? t('range_blocked') : t('range_freed'), 'success');
        } catch (error) {
            showNotification(t('error_updating'), 'error');
        }
    };

    const handleSaveWeeklySchedule = async () => {
        setSavingSchedule(true);
        try {
            await updateBusinessSettings({
                schedules: weeklySchedule,
                timeInterval: timeInterval
            });
            setShowWeeklyModal(false);
            showNotification(t('slots_updated'), 'success');
        } catch (error) {
            showNotification(t('error_updating'), 'error');
        } finally {
            setSavingSchedule(false);
        }
    };

    const updateDaySchedule = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
        setWeeklySchedule(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                [field]: value
            }
        }));
    };

    if (loading) return <div className="flex justify-center p-20"><div className="animate-spin h-10 w-10 border-2 border-pink-500 rounded-full border-t-transparent"></div></div>;

    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Header */}
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 px-2 relative">
                <div>
                    <div className="admin-decorator-line mb-4"></div>
                    <h1 className="admin-h1 text-4xl mb-2">📅 {t('schedules')}</h1>
                    <p className="admin-subtitle text-gray-500 font-medium">{t('manage_schedules')}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={() => setShowWeeklyModal(true)}
                        className="admin-btn admin-btn-secondary flex items-center justify-center gap-2"
                    >
                        <span className="text-xl">⚙️</span>
                        HORARIOS SEMANALES
                    </button>
                    <div className="flex bg-gray-50 p-1.5 rounded-[2rem] border border-gray-100 shadow-inner overflow-x-auto no-scrollbar">
                        {(['hours', 'single', 'range'] as Mode[]).map((m) => (
                            <button
                                key={m}
                                onClick={() => { setMode(m); setRangeStart(null); setRangeEnd(null); }}
                                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 whitespace-nowrap ${mode === m
                                    ? 'bg-[#0511F2] text-white shadow-xl shadow-blue-200 scale-[1.05]'
                                    : 'text-gray-400 hover:text-[#0511F2]'
                                    }`}
                            >
                                {m === 'hours' ? "GESTIÓN HORAS" : m === 'single' ? "BLOQUEO DÍA" : "RANGO DÍAS"}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Calendar Column */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="admin-card !p-8 relative overflow-hidden">
                        <div className="diagonal-accent !opacity-[0.03]"></div>
                        {/* Month Nav */}
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <button onClick={() => changeMonth(-1)} className="w-12 h-12 rounded-[1rem] bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-[#0511F2] hover:text-white transition-all shadow-sm">◀</button>
                            <h2 className="text-2xl font-black text-[#0511F2] uppercase font-heading tracking-widest">
                                {viewDate.toLocaleDateString(t('locale' as any) === 'es' ? 'es-ES' : t('locale' as any) === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', year: 'numeric' })}
                            </h2>
                            <button onClick={() => changeMonth(1)} className="w-12 h-12 rounded-[1rem] bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-[#0511F2] hover:text-white transition-all shadow-sm">▶</button>
                        </div>

                        {/* Weekday Headers */}
                        <div className="grid grid-cols-7 mb-4 text-center relative z-10">
                            {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((d, i) => (
                                <span key={i} className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                                    {t(`day_${d}` as any).charAt(0)}
                                </span>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-2 relative z-10">
                            {renderCalendar()}
                        </div>

                        {/* Quick Actions Footer */}
                        {(mode === 'single' || (mode === 'range' && rangeStart && rangeEnd)) && (
                            <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col sm:flex-row gap-3 relative z-10">
                                {mode === 'single' && (
                                    <>
                                        <button onClick={() => toggleFullDay(selectedDate, true)} className="flex-1 admin-btn bg-gray-100 text-gray-500 hover:bg-gray-200 !text-[10px] uppercase tracking-widest font-black">BLOQUEAR DÍA</button>
                                        <button onClick={() => toggleFullDay(selectedDate, false)} className="flex-1 admin-btn bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 !text-[10px] uppercase tracking-widest font-black">HABILITAR DÍA</button>
                                    </>
                                )}
                                {mode === 'range' && rangeStart && rangeEnd && (
                                    <>
                                        <button onClick={() => handleRangeAction('block')} className="flex-1 admin-btn bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100 !text-[10px] uppercase tracking-widest font-black">BLOQUEAR RANGO</button>
                                        <button onClick={() => handleRangeAction('unblock')} className="flex-1 admin-btn bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 !text-[10px] uppercase tracking-widest font-black">HABILITAR RANGO</button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Legend */}
                    <div className="admin-card bg-gray-50/50 !p-6 border border-gray-100">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">LEYENDA DE DISPONIBILIDAD</h3>
                        <div className="flex flex-wrap gap-6">
                            {[
                                { color: 'bg-rose-400', label: 'RESERVADO' },
                                { color: 'bg-gray-400', label: 'BLOQUEADO' },
                                { color: 'bg-gray-200', label: 'CERRADO' },
                                { color: 'bg-[#6FD904]', label: 'ATENDIDO' }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Time Slots Column */}
                <div className="lg:col-span-5">
                    <div className="admin-card h-full flex flex-col min-h-[600px] !p-0 overflow-hidden relative">
                        <div className="diagonal-accent !opacity-[0.03]"></div>
                        <header className="p-8 bg-white/80 backdrop-blur-sm border-b border-gray-100 relative z-10">
                            <h3 className="text-2xl font-black text-[#0511F2] font-heading tracking-tight leading-none mb-4 uppercase">
                                {new Date(selectedDate + 'T00:00:00').toLocaleDateString(t('locale' as any) === 'es' ? 'es-ES' : t('locale' as any) === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {isDayClosedBySchedule(selectedDate) && (
                                    <span className="bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase border border-gray-200">CERRADO</span>
                                )}
                                {isDayFullDisabled(selectedDate)
                                    ? <span className="bg-rose-50 text-rose-500 border border-rose-100 px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase">BLOQUEADO</span>
                                    : <span className="bg-[#6FD904]/10 text-[#6FD904] border border-[#6FD904]/20 px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase">ACTIVO</span>
                                }
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto p-8 no-scrollbar relative z-10">
                            {mode === 'range' ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 grayscale p-10">
                                    <span className="text-6xl mb-6">🗓️</span>
                                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">MODO RANGO</h3>
                                    <p className="text-[11px] text-gray-400 font-bold mt-2 leading-relaxed">Selecciona el inicio y fin en el calendario para gestionar bloques masivos</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {timeSlots.map((time) => {
                                        const status = getSlotStatus(selectedDate, time);
                                        let btnStyle = "bg-white text-gray-600 border-gray-100 hover:border-[#0511F2] hover:text-[#0511F2] hover:shadow-lg hover:shadow-blue-50";

                                        if (status === 'occupied') { btnStyle = "bg-rose-50 text-rose-500 border-rose-100 cursor-not-allowed opacity-80"; }
                                        else if (status === 'attended') { btnStyle = "bg-[#6FD904]/10 text-[#6FD904] border-[#6FD904]/20 cursor-not-allowed opacity-80"; }
                                        else if (status === 'disabled') { btnStyle = "bg-gray-50 text-gray-400 border-gray-100"; }

                                        return (
                                            <button
                                                key={time}
                                                disabled={status === 'occupied' || status === 'attended'}
                                                onClick={() => toggleSingleSlot(time)}
                                                className={`p-4 rounded-[1.5rem] border-2 transition-all duration-300 flex flex-col items-center gap-2 group ${btnStyle} ${mode === 'single' ? 'opacity-30 pointer-events-none' : ''}`}
                                            >
                                                <span className="text-sm font-black tracking-tight">{time.replace(':00 ', ' ')}</span>
                                                <span className="text-[8px] font-black uppercase tracking-widest bg-white/50 px-2 py-0.5 rounded-full border border-gray-100/50">
                                                    {status === 'available' ? 'LIBRE' : status === 'occupied' ? 'OCUPADO' : status === 'attended' ? 'ATENDIDO' : 'BLOQUEO'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {mode === 'single' && (
                                <div className="mt-8 p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100 flex gap-4 items-start animate-in fade-in zoom-in-95">
                                    <span className="text-2xl">💡</span>
                                    <p className="text-blue-900 text-[11px] font-bold leading-relaxed uppercase tracking-wide">
                                        Modo bloqueo activado. Selecciona un día en el calendario para bloquearlo o habilitarlo por completo.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Weekly Schedule Modal */}
            {showWeeklyModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-[120] p-4 animate-in fade-in duration-300">
                    <div className="admin-modal w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-500 shadow-2xl relative">
                        <div className="diagonal-accent !opacity-[0.05]"></div>
                        <header className="p-8 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div>
                                <h3 className="text-2xl font-black text-[#0511F2] tracking-tighter uppercase font-heading">HORARIOS GENERALES</h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Configura tu horario base semanal</p>
                            </div>
                            <button onClick={() => setShowWeeklyModal(false)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-all border border-gray-200">✕</button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar relative z-10">
                            {/* Interval Selector */}
                            <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                                <div className="flex items-center gap-2 mb-6">
                                    <span className="text-xl">⏱️</span>
                                    <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">INTERVALO DE SESIONES</h3>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { value: 30, label: '30 MIN' },
                                        { value: 60, label: '1 HORA' },
                                        { value: 120, label: '2 HORAS' }
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setTimeInterval(option.value)}
                                            className={`py-3.5 rounded-xl font-black text-[10px] tracking-widest transition-all border-2 ${timeInterval === option.value
                                                ? 'bg-[#0511F2] border-[#0511F2] text-white shadow-lg shadow-blue-100'
                                                : 'bg-white border-gray-100 text-gray-400 hover:border-blue-200'
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                {dayKeys.map((day) => (
                                    <div key={day} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-[2rem] border border-gray-100 hover:border-[#0511F2]/30 transition-all shadow-sm hover:shadow-md">
                                        <div className="flex items-center gap-4">
                                            <div className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={!weeklySchedule[day].closed}
                                                    onChange={(e) => updateDaySchedule(day, 'closed', !e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0511F2]"></div>
                                            </div>
                                            <span className="font-black text-[10px] text-gray-900 uppercase tracking-widest min-w-[80px]">{t(`day_${day}` as any)}</span>
                                        </div>

                                        {!weeklySchedule[day].closed ? (
                                            <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                                                <input
                                                    type="time"
                                                    value={weeklySchedule[day].open}
                                                    onChange={(e) => updateDaySchedule(day, 'open', e.target.value)}
                                                    className="bg-transparent text-[11px] font-black text-gray-900 outline-none cursor-pointer"
                                                />
                                                <span className="text-gray-300 font-black text-[10px]">A</span>
                                                <input
                                                    type="time"
                                                    value={weeklySchedule[day].close}
                                                    onChange={(e) => updateDaySchedule(day, 'close', e.target.value)}
                                                    className="bg-transparent text-[11px] font-black text-gray-900 outline-none cursor-pointer"
                                                />
                                            </div>
                                        ) : (
                                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest px-4 py-2 bg-rose-50 rounded-xl border border-rose-100">CERRADO</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <footer className="p-8 border-t border-gray-100 flex gap-4 bg-white sticky bottom-0 z-10">
                            <button
                                type="button"
                                onClick={() => setShowWeeklyModal(false)}
                                className="flex-1 admin-btn admin-btn-secondary"
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handleSaveWeeklySchedule}
                                disabled={savingSchedule}
                                className="flex-1 admin-btn admin-btn-primary shadow-lg shadow-pink-200"
                            >
                                {savingSchedule ? "GUARDANDO..." : "GUARDAR HORARIOS"}
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
}
