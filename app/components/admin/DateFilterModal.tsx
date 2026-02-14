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
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                        : isInRange
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-100 hover:border-blue-200'
                    }`}
            >
                <span className={`text-sm font-bold`}>{d}</span>
                {isToday && !isStart && !isEnd && <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-blue-500"></div>}
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300 border border-white/20">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                            {mode === 'single' ? t('select_date') : t('select_range')}
                        </h2>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 bg-white rounded-xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm">✕</button>
                </div>

                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={() => {
                            const d = new Date(viewDate);
                            d.setMonth(d.getMonth() - 1);
                            setViewDate(d);
                        }} className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-all">←</button>
                        <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">
                            {viewDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                        </h3>
                        <button onClick={() => {
                            const d = new Date(viewDate);
                            d.setMonth(d.getMonth() + 1);
                            setViewDate(d);
                        }} className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-all">→</button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                            <span key={i} className="text-[10px] font-black text-gray-300 uppercase">{d}</span>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {days}
                    </div>
                </div>

                <div className="p-6 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex flex-col">
                        {startDate && (
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                {mode === 'single' ? 'Fecha' : 'Rango'}
                            </span>
                        )}
                        <span className="text-xs font-bold text-gray-900">
                            {startDate ? (mode === 'single' ? startDate : `${startDate} - ${endDate || '...'}`) : 'Sin selección'}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        {mode === 'range' && (
                            <button
                                onClick={handleApplyRange}
                                disabled={!startDate || !endDate}
                                className="px-6 py-2.5 bg-blue-600 disabled:opacity-50 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-blue-100 hover:scale-[1.05] transition-all"
                            >
                                Aplicar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
