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
        <div className="space-y-5 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header - Mobile Optimized */}
            <div className="flex flex-col gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600 bg-clip-text text-transparent">
                        {t('schedules')}
                    </h1>
                    <p className="text-sm md:text-base text-gray-500 font-medium mt-1">{t('manage_schedules')}</p>
                </div>

                {/* Controls - Stack on mobile */}
                <div className="flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={() => setShowWeeklyModal(true)}
                        className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {t('weekly_hours')}
                    </button>

                    <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100 flex gap-1">
                        {(['hours', 'single', 'range'] as Mode[]).map((m) => (
                            <button
                                key={m}
                                onClick={() => { setMode(m); setRangeStart(null); setRangeEnd(null); }}
                                className={`flex-1 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${mode === m
                                    ? 'bg-gray-900 text-white shadow-lg'
                                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                                    }`}
                            >
                                {m === 'hours' ? t('mode_hours_short') : m === 'single' ? t('mode_single_short') : t('mode_range_short')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content - Stack vertically on mobile */}
            <div className="flex flex-col lg:flex-row gap-5 md:gap-8">
                {/* Calendar Section */}
                <div className="w-full lg:w-1/2 flex flex-col gap-4">
                    <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-lg">
                        {/* Month Nav */}
                        <div className="flex justify-between items-center mb-4 md:mb-6">
                            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-lg">◀</button>
                            <h2 className="text-base md:text-xl font-black text-gray-800 uppercase tracking-wide">
                                {viewDate.toLocaleDateString(t('locale' as any) === 'es' ? 'es-ES' : t('locale' as any) === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', year: 'numeric' })}
                            </h2>
                            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-lg">▶</button>
                        </div>

                        {/* Weekday Headers */}
                        <div className="grid grid-cols-7 mb-2 text-center">
                            {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((d, i) => (
                                <span key={i} className="text-[10px] md:text-xs font-bold text-gray-300 uppercase">
                                    {t(`day_${d}` as any).charAt(0)}
                                </span>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1 md:gap-2">
                            {renderCalendar()}
                        </div>

                        {/* Action Buttons - Mobile Optimized */}
                        <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-gray-100">
                            {mode === 'single' && (
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <button onClick={() => toggleFullDay(selectedDate, true)} className="flex-1 py-2.5 md:py-3 bg-gray-100 text-gray-500 rounded-xl font-bold text-xs md:text-sm hover:bg-gray-200 transition-colors">{t('disable_day')}</button>
                                    <button onClick={() => toggleFullDay(selectedDate, false)} className="flex-1 py-2.5 md:py-3 bg-pink-50 text-pink-600 rounded-xl font-bold text-xs md:text-sm hover:bg-pink-100 transition-colors">{t('enable_day')}</button>
                                </div>
                            )}
                            {mode === 'range' && rangeStart && rangeEnd && (
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <button onClick={() => handleRangeAction('block')} className="flex-1 py-2.5 md:py-3 bg-red-50 text-red-600 rounded-xl font-bold text-xs md:text-sm hover:bg-red-100 transition-colors">{t('disable_range')}</button>
                                    <button onClick={() => handleRangeAction('unblock')} className="flex-1 py-2.5 md:py-3 bg-green-50 text-green-600 rounded-xl font-bold text-xs md:text-sm hover:bg-green-100 transition-colors">{t('enable_range')}</button>
                                </div>
                            )}
                            {mode === 'hours' && (
                                <div className="text-center text-gray-400 text-xs md:text-sm font-medium">
                                    {t('select_date_to_manage')}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Legend - Mobile Optimized */}
                    <div className="bg-white/50 backdrop-blur-sm p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-gray-100">
                        <h3 className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 md:mb-4">{t('legend_legend')}</h3>
                        <div className="grid grid-cols-2 md:flex md:flex-wrap gap-3 md:gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-400"></div>
                                <span className="text-[10px] md:text-xs font-medium text-gray-500">{t('legend_reserved')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-gray-400"></div>
                                <span className="text-[10px] md:text-xs font-medium text-gray-500">{t('legend_blocked')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-gray-300"></div>
                                <span className="text-[10px] md:text-xs font-medium text-gray-500">{t('legend_closed')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-400"></div>
                                <span className="text-[10px] md:text-xs font-medium text-gray-500">{t('legend_attended')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Time Slots Section */}
                <div className="w-full lg:w-1/2">
                    <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-sm max-h-[600px] md:max-h-[800px] overflow-y-auto">
                        <div className="sticky top-0 bg-white/95 backdrop-blur-xl pb-4 mb-4 border-b border-gray-50 z-10">
                            <h3 className="text-lg md:text-2xl font-bold text-gray-800">
                                {new Date(selectedDate + 'T00:00:00').toLocaleDateString(t('locale' as any) === 'es' ? 'es-ES' : t('locale' as any) === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {isDayClosedBySchedule(selectedDate) && (
                                    <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded-full text-[10px] md:text-xs font-bold">📅 {t('closed_caps')}</span>
                                )}
                                {isDayFullDisabled(selectedDate)
                                    ? <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded-full text-[10px] md:text-xs font-bold">⚠️ {t('blocked_caps')}</span>
                                    : <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-[10px] md:text-xs font-bold">✓ {t('active_caps')}</span>
                                }
                            </div>
                        </div>

                        {mode === 'range' ? (
                            <div className="flex flex-col items-center justify-center h-48 md:h-64 text-center">
                                <span className="text-4xl md:text-6xl mb-3 md:mb-4">🗓️</span>
                                <h3 className="text-lg md:text-xl font-bold text-gray-800">{t('mode_range_title')}</h3>
                                <p className="text-sm md:text-base text-gray-400 max-w-xs mt-2">{t('use_calendar_to_select')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2 md:gap-4">
                                {timeSlots.map((time) => {
                                    const status = getSlotStatus(selectedDate, time);
                                    let btnClass = "";

                                    if (status === 'occupied') { btnClass = "bg-red-50 text-red-500 border-red-100 cursor-not-allowed"; }
                                    else if (status === 'attended') { btnClass = "bg-green-50 text-green-600 border-green-100 cursor-not-allowed"; }
                                    else if (status === 'disabled') { btnClass = "bg-gray-50 text-gray-400 border-gray-100"; }
                                    else { btnClass = "bg-white text-gray-600 border-gray-100 hover:border-pink-300 hover:text-pink-500 hover:shadow-md"; }

                                    return (
                                        <button
                                            key={time}
                                            disabled={status === 'occupied' || status === 'attended'}
                                            onClick={() => toggleSingleSlot(time)}
                                            className={`p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-1 md:gap-2 ${btnClass} ${mode === 'single' ? 'opacity-40 pointer-events-none' : ''}`}
                                        >
                                            <span className="text-sm md:text-lg font-bold">{time.replace(':00 ', ' ')}</span>
                                            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest bg-white/50 px-1.5 md:px-2 py-0.5 rounded-full">
                                                {status === 'available' ? t('free_caps') : status === 'occupied' ? t('occupied_caps') : status === 'attended' ? t('attended_caps') : t('blocked_caps')}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {mode === 'single' && (
                            <div className="mt-6 md:mt-8 p-4 md:p-6 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3 md:gap-4 items-start">
                                <span className="text-xl md:text-2xl">👆</span>
                                <p className="text-blue-800 text-xs md:text-sm font-medium">{t('full_day_mode_helper')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Weekly Schedule Modal - Mobile Optimized */}
            {showWeeklyModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
                        <div className="p-5 md:p-8">
                            <div className="flex justify-between items-center mb-3 md:mb-4">
                                <h2 className="text-lg md:text-2xl font-black text-gray-800">{t('general_schedule')}</h2>
                                <button onClick={() => setShowWeeklyModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <p className="text-sm md:text-base text-gray-500 mb-4 md:mb-6">{t('manage_schedules')}</p>

                            {/* Time Interval Selector - Mobile First */}
                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-2 md:p-2 rounded-2xl border border-purple-100 mb-4 md:mb-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-xl">⚙️</span>
                                    <h3 className="text-sm md:text-base font-bold text-gray-700">{t('time_interval')}</h3>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                                    {[
                                        { value: 30, label: t('interval_30min') },
                                        { value: 60, label: t('interval_1hour') },
                                        { value: 120, label: t('interval_2hours') }
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setTimeInterval(option.value)}
                                            className={`flex-1 py-3 md:py-3.5 px-4 rounded-xl font-bold text-sm md:text-base transition-all ${timeInterval === option.value
                                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-200'
                                                : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300 hover:shadow-md'
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3 md:space-y-4">
                                {dayKeys.map((day) => (
                                    <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 md:p-4 bg-gray-50 rounded-2xl">
                                        <div className="flex-shrink-0">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={!weeklySchedule[day].closed}
                                                    onChange={(e) => updateDaySchedule(day, 'closed', !e.target.checked)}
                                                    className="w-5 h-5 rounded-lg accent-pink-500"
                                                />
                                                <span className="font-bold text-sm md:text-base text-gray-700 capitalize min-w-[80px]">{t(`day_${day}` as any)}</span>
                                            </label>
                                        </div>

                                        {!weeklySchedule[day].closed ? (
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <div className="flex items-center gap-1.5">
                                                    <label className="text-[10px] md:text-xs text-gray-400 font-bold uppercase">{t('opens_at')}</label>
                                                    <input
                                                        type="time"
                                                        value={weeklySchedule[day].open}
                                                        onChange={(e) => updateDaySchedule(day, 'open', e.target.value)}
                                                        className="px-2 md:px-3 py-1.5 md:py-2 border border-gray-200 rounded-xl text-xs md:text-sm font-bold text-gray-700 focus:ring-2 focus:ring-pink-500 outline-none"
                                                    />
                                                </div>
                                                <span className="text-gray-300">-</span>
                                                <div className="flex items-center gap-1.5">
                                                    <label className="text-[10px] md:text-xs text-gray-400 font-bold uppercase">{t('closes_at')}</label>
                                                    <input
                                                        type="time"
                                                        value={weeklySchedule[day].close}
                                                        onChange={(e) => updateDaySchedule(day, 'close', e.target.value)}
                                                        className="px-2 md:px-3 py-1.5 md:py-2 border border-gray-200 rounded-xl text-xs md:text-sm font-bold text-gray-700 focus:ring-2 focus:ring-pink-500 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400 italic">{t('closed')}</span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-2 mb-18 md:mt-3 flex flex-col sm:flex-row gap-2">
                                <button
                                    onClick={() => setShowWeeklyModal(false)}
                                    className="flex-1 px-6 py-2 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    onClick={handleSaveWeeklySchedule}
                                    disabled={savingSchedule}
                                    className="flex-1 px-6 py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
                                >
                                    {savingSchedule ? t('saving') : t('save_schedule')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
