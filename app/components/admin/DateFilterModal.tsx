"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/components/admin/LanguageContext";

interface DateFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (start: string, end: string) => void;
    mode: 'single' | 'range';
    initialStart?: string;
    initialEnd?: string;
}

export default function DateFilterModal({
    isOpen,
    onClose,
    onSelect,
    mode,
    initialStart,
    initialEnd
}: DateFilterModalProps) {
    const { t } = useTranslation();
    const [viewDate, setViewDate] = useState(new Date(initialStart || new Date()));
    const [startDate, setStartDate] = useState<string | null>(initialStart || null);
    const [endDate, setEndDate] = useState<string | null>(initialEnd || null);

    useEffect(() => {
        if (isOpen) {
            setStartDate(initialStart || null);
            setEndDate(initialEnd || null);
            if (initialStart) setViewDate(new Date(initialStart));
        }
    }, [isOpen, initialStart, initialEnd]);

    const getLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleDateClick = (dateStr: string) => {
        if (mode === 'single') {
            onSelect(dateStr, dateStr);
            onClose();
        } else {
            if (!startDate || (startDate && endDate)) {
                setStartDate(dateStr);
                setEndDate(null);
            } else {
                if (new Date(dateStr + 'T00:00:00') < new Date(startDate + 'T00:00:00')) {
                    setEndDate(startDate);
                    setStartDate(dateStr);
                } else {
                    setEndDate(dateStr);
                }
            }
        }
    };

    const handleApplyRange = () => {
        if (startDate && endDate) {
            onSelect(startDate, endDate);
            onClose();
        }
    };

    if (!isOpen) return null;

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="h-12 w-full"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const dateStr = getLocalDateString(date);

        const isStart = startDate === dateStr;
        const isEnd = endDate === dateStr;
        const isInRange = startDate && endDate && dateStr > startDate && dateStr < endDate;
        const isToday = dateStr === getLocalDateString(new Date());

        days.push(
            <button
                key={d}
                onClick={() => handleDateClick(dateStr)}
                className={`h-12 w-full rounded-xl flex flex-col items-center justify-center relative transition-all duration-200 
                    ${isStart || isEnd
                        ? 'bg-[#0511F2] text-white shadow-lg shadow-blue-100 scale-105'
                        : isInRange
                            ? 'bg-[#0511F2]/10 text-[#0511F2]'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-100 hover:border-[#0511F2]/20'
                    }`}
            >
                <span className={`text-sm font-bold`}>{d}</span>
                {isToday && !isStart && !isEnd && <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-[#EE05F2]"></div>}
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="admin-modal w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-500 shadow-2xl">
                <header className="p-8 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-black text-[#0511F2] tracking-tight leading-none uppercase">
                            {mode === 'single' ? "SELECCIONAR FECHA" : "SELECCIONAR RANGO"}
                        </h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Filtrar información por periodo</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all">✕</button>
                </header>

                <div className="p-8">
                    <div className="flex justify-between items-center mb-8">
                        <button onClick={() => {
                            const d = new Date(viewDate);
                            d.setMonth(d.getMonth() - 1);
                            setViewDate(d);
                        }} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all shadow-sm">◀</button>
                        <h3 className="text-[11px] font-black text-[#0511F2] uppercase tracking-[0.2em]">
                            {viewDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}
                        </h3>
                        <button onClick={() => {
                            const d = new Date(viewDate);
                            d.setMonth(d.getMonth() + 1);
                            setViewDate(d);
                        }} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all shadow-sm">▶</button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-4 text-center">
                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                            <span key={i} className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{d}</span>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                        {days}
                    </div>
                </div>

                <footer className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            {mode === 'single' ? 'PERIODO' : 'RANGO SELECCIONADO'}
                        </span>
                        <span className="text-[11px] font-black text-[#0511F2] uppercase tracking-wider">
                            {startDate ? (mode === 'single' ? startDate : `${startDate} - ${endDate || '...'}`) : 'SIN SELECCIÓN'}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        {mode === 'range' && (
                            <button
                                onClick={handleApplyRange}
                                disabled={!startDate || !endDate}
                                className="admin-btn admin-btn-primary px-8 !py-3 !text-[10px] shadow-lg shadow-pink-100"
                            >
                                APLICAR FILTRO
                            </button>
                        )}
                    </div>
                </footer>
            </div>
        </div>
    );
}
