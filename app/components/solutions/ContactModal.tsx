'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import MultiStepForm from '../MultiStepForm';

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    region: string;
    lang?: string;
}

export default function ContactModal({ isOpen, onClose, region, lang = 'es' }: ContactModalProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isMounted || !isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                onClick={onClose}
            ></div>

            {/* Modal Content - Adaptive for Mobile */}
            <div className="relative w-full max-w-4xl h-[95vh] md:h-auto md:max-h-[90vh] overflow-hidden bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 md:zoom-in-95 duration-300 border border-white/20 flex flex-col">
                
                {/* Header - Clean White */}
                <div className="sticky top-0 z-20 flex items-center justify-between p-5 md:p-10 bg-white border-b border-slate-100 shrink-0">
                    <div className="min-w-0">
                        <h2 className="text-xl md:text-3xl font-black text-slate-900 font-outfit leading-tight truncate">Consultoría Estratégica</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse"></span>
                            <p className="text-[9px] md:text-xs text-[#006633] font-bold uppercase tracking-widest">Kick-off inmediato</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-3 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all ml-4"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form Container - Corporate Blue Background */}
                <div className="flex-1 overflow-y-auto p-2 md:p-8 bg-gradient-to-br from-[#01031b] to-[#01122b] md:bg-transparent custom-scrollbar relative">
                    {/* Subtle Glow Accents */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[100px] pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[100px] pointer-events-none"></div>

                    <div className="relative z-10 md:bg-gradient-to-br md:from-[#01031b] md:to-[#01122b] md:rounded-[2rem] p-0 md:p-1 border md:border-white/5">
                        <MultiStepForm 
                            region={region} 
                            lang={lang} 
                            onComplete={() => {
                                setTimeout(() => onClose(), 3000);
                            }} 
                        />
                    </div>
                </div>

                {/* Mobile Bottom Padding */}
                <div className="h-6 md:hidden bg-[#01122b] shrink-0"></div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1e293b;
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
}
