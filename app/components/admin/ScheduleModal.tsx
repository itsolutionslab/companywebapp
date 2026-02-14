"use client";

import { useEffect, useState } from "react";
import { getBusinessSettings, onAvailabilityUpdate } from "@/lib/firebase";
import { getTimeSlotsForDate } from "@/lib/timeSlots";
import { useTranslation } from "@/components/admin/LanguageContext";

interface ScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (date: string, time: string) => Promise<void>;
    title: string;
    subtitle?: string;
    initialDate?: string;
    isSaving?: boolean;
}

export default function ScheduleModal({
    isOpen,
    onClose,
    onSave,
    title,
    subtitle,
    initialDate,
    isSaving = false
}: ScheduleModalProps) {
    const { t } = useTranslation();
    const [selectedDate, setSelectedDate] = useState<string>(initialDate || new Date().toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [timeSlots, setTimeSlots] = useState<string[]>([]);
    const [disabledSlots, setDisabledSlots] = useState<string[]>([]);
    const [weeklySchedule, setWeeklySchedule] = useState<any>(null);
    const [timeInterval, setTimeInterval] = useState<number>(60);
    const [viewDate, setViewDate] = useState(new Date(initialDate || new Date()));

    useEffect(() => {
        getBusinessSettings().then(settings => {
            if (settings?.schedules) {
                setWeeklySchedule(settings.schedules);
            }
            if (settings?.timeInterval) {
                setTimeInterval(settings.timeInterval);
            }
        });

        const unsubscribe = onAvailabilityUpdate((disabled: string[]) => {
            setDisabledSlots(disabled);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (selectedDate && weeklySchedule) {
            const slots = getTimeSlotsForDate(selectedDate, weeklySchedule, timeInterval);
            setTimeSlots(slots);
        }
    }, [selectedDate, weeklySchedule, timeInterval]);

    const getLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in duration-300 border border-white/20">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{title}</h2>
                        {subtitle && <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="w-12 h-12 bg-white rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm">✕</button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                    {/* Calendar Section */}
                    <div className="w-full lg:w-3/5 p-8 border-r border-gray-50 overflow-y-auto bg-white">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Seleccionar Fecha</h3>
                            <div className="flex gap-2">
                                <button onClick={() => {
                                    const d = new Date(viewDate);
                                    d.setMonth(d.getMonth() - 1);
                                    setViewDate(d);
                                }} className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-all">←</button>
                                <span className="text-xs font-black uppercase tracking-widest min-w-[120px] text-center flex items-center justify-center">
                                    {viewDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                                </span>
                                <button onClick={() => {
                                    const d = new Date(viewDate);
                                    d.setMonth(d.getMonth() + 1);
                                    setViewDate(d);
                                }} className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-all">→</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-2 text-center mb-2">
                            {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map(d => (
                                <span key={d} className="text-[10px] font-black text-gray-300 uppercase">{d}</span>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-2">
                            {(() => {
                                const year = viewDate.getFullYear();
                                const month = viewDate.getMonth();
                                const firstDay = new Date(year, month, 1).getDay();
                                const daysInMonth = new Date(year, month + 1, 0).getDate();
                                const days = [];

                                for (let i = 0; i < firstDay; i++) {
                                    days.push(<div key={`empty-${i}`} className="h-14"></div>);
                                }

                                for (let d = 1; d <= daysInMonth; d++) {
                                    const date = new Date(year, month, d);
                                    const dateStr = getLocalDateString(date);
                                    const isSelected = selectedDate === dateStr;
                                    const isToday = dateStr === getLocalDateString(new Date());

                                    days.push(
                                        <button
                                            key={d}
                                            onClick={() => {
                                                setSelectedDate(dateStr);
                                                setSelectedTime(null);
                                            }}
                                            className={`h-14 rounded-2xl border transition-all flex flex-col items-center justify-center group ${isSelected
                                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-100 scale-105'
                                                : 'bg-white border-gray-100 hover:border-blue-200 text-gray-700'
                                                }`}
                                        >
                                            <span className={`text-xs font-black ${isSelected ? 'text-blue-100' : 'text-gray-300 group-hover:text-blue-400'}`}>{d}</span>
                                            {isToday && <div className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-blue-500'}`}></div>}
                                        </button>
                                    );
                                }
                                return days;
                            })()}
                        </div>
                    </div>

                    {/* Slots Section */}
                    <div className="w-full lg:w-2/5 p-8 bg-gray-50/50 overflow-y-auto">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Horarios Disponibles</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {timeSlots.length > 0 ? (
                                timeSlots.map(time => {
                                    const isOccupied = disabledSlots.includes(`${selectedDate}_${time}`);
                                    const isSelected = selectedTime === time;
                                    return (
                                        <button
                                            key={time}
                                            disabled={isOccupied}
                                            onClick={() => setSelectedTime(time)}
                                            className={`py-3 px-4 rounded-xl border text-xs font-black transition-all ${isOccupied
                                                ? 'bg-gray-100 border-gray-100 text-gray-300 cursor-not-allowed opacity-50'
                                                : isSelected
                                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-100'
                                                    : 'bg-white border-gray-100 text-gray-600 hover:border-indigo-200 hover:text-indigo-600'
                                                }`}
                                        >
                                            {time}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="col-span-2 py-20 text-center">
                                    <span className="text-4xl block mb-4">💤</span>
                                    <p className="text-gray-400 font-bold italic text-sm">No hay horarios disponibles para este día.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-8 border-t border-gray-50 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-4">
                        {selectedDate && selectedTime && (
                            <div className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl border border-indigo-100 animate-in slide-in-from-left-4">
                                <span className="text-xs font-black uppercase tracking-widest">
                                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} @ {selectedTime}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all">Cancelar</button>
                        <button
                            onClick={() => selectedTime && onSave(selectedDate, selectedTime)}
                            disabled={!selectedTime || isSaving}
                            className="px-10 py-3 bg-blue-600 disabled:opacity-50 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-[1.05] active:scale-[0.95] transition-all flex items-center gap-2"
                        >
                            {isSaving && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                            {t('save') || 'Guardar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
