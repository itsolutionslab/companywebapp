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
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="admin-modal w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-500 shadow-2xl">
                <header className="p-8 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase">{title}</h2>
                        {subtitle && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all">✕</button>
                </header>

                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                    {/* Calendar Section */}
                    <div className="w-full lg:w-[60%] p-8 border-r border-slate-50 overflow-y-auto bg-white no-scrollbar">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">SELECCIONAR FECHA</h3>
                            <div className="flex gap-2">
                                <button onClick={() => {
                                    const d = new Date(viewDate);
                                    d.setMonth(d.getMonth() - 1);
                                    setViewDate(d);
                                }} className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all shadow-sm">◀</button>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] min-w-[140px] text-center flex items-center justify-center text-slate-900">
                                    {viewDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}
                                </span>
                                <button onClick={() => {
                                    const d = new Date(viewDate);
                                    d.setMonth(d.getMonth() + 1);
                                    setViewDate(d);
                                }} className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all shadow-sm">▶</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-2 text-center mb-4">
                            {['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'].map(d => (
                                <span key={d} className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{d}</span>
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
                                                ? 'bg-[#0511F2] border-[#0511F2] text-white shadow-xl shadow-blue-100 scale-105'
                                                : 'bg-white border-slate-50 hover:border-[#0511F2]/20 text-slate-700'
                                                }`}
                                        >
                                            <span className={`text-sm font-black ${isSelected ? 'text-white' : 'text-slate-900 group-hover:text-[#0511F2]'}`}>{d}</span>
                                            {isToday && <div className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-[#0511F2]'}`}></div>}
                                        </button>
                                    );
                                }
                                return days;
                            })()}
                        </div>
                    </div>

                    {/* Slots Section */}
                    <div className="w-full lg:w-[40%] p-8 bg-slate-50/50 overflow-y-auto no-scrollbar border-t lg:border-t-0 border-slate-100">
                        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-8">HORARIOS DISPONIBLES</h3>
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
                                            className={`py-4 px-4 rounded-[1.5rem] border-2 text-[11px] font-black transition-all ${isOccupied
                                                ? 'bg-white border-slate-100 text-slate-200 cursor-not-allowed opacity-50'
                                                : isSelected
                                                    ? 'bg-[#0511F2]/5 border-[#0511F2] text-[#0511F2] shadow-md shadow-blue-50'
                                                    : 'bg-white border-slate-50 text-slate-600 hover:border-[#0511F2]/20 hover:text-[#0511F2]'
                                                }`}
                                        >
                                            {time}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="col-span-2 py-20 text-center opacity-30 grayscale">
                                    <span className="text-5xl block mb-6">🗓️</span>
                                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Sin horarios disponibles</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <footer className="p-8 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between bg-white gap-6">
                    <div className="flex items-center gap-4">
                        {selectedDate && selectedTime ? (
                            <div className="flex items-center gap-3 bg-[#0511F2]/5 text-[#0511F2] px-6 py-3 rounded-[1.5rem] border border-[#0511F2]/10 animate-in slide-in-from-left-4">
                                <span className="text-xl">📅</span>
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} @ {selectedTime}
                                </span>
                            </div>
                        ) : (
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Selecciona una fecha y hora</span>
                        )}
                    </div>
                    <div className="flex gap-4 w-full sm:w-auto">
                        <button onClick={onClose} className="flex-1 admin-btn admin-btn-secondary !py-4">CANCELAR</button>
                        <button
                            onClick={() => selectedTime && onSave(selectedDate, selectedTime)}
                            disabled={!selectedTime || isSaving}
                            className="flex-1 admin-btn admin-btn-primary !py-4 shadow-xl shadow-pink-100 flex items-center justify-center gap-3 min-w-[180px]"
                        >
                            {isSaving && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                            {isSaving ? 'GUARDANDO...' : 'CONFIRMAR'}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
}
