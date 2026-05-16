"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Lead, LeadStatus } from "@/types/tracking";
import { SortableLeadCard } from "./SortableLeadCard";

interface PipelineColumnProps {
    stage: { key: LeadStatus; label: string; color: string };
    leads: Lead[];
}

export function PipelineColumn({ stage, leads }: PipelineColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: stage.key,
    });

    return (
        <div className="flex-shrink-0 w-80 flex flex-col gap-4">
            {/* Column Header */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${stage.color}`}></div>
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-900">{stage.label}</h3>
                    <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-2 py-0.5 rounded-full">
                        {leads.length}
                    </span>
                </div>
            </div>

            {/* Column Body */}
            <div
                ref={setNodeRef}
                className={`flex-1 rounded-[2.5rem] p-4 border transition-all duration-500 min-h-[calc(100vh-320px)] flex flex-col gap-4 relative overflow-hidden ${isOver ? 'bg-[#0511F2]/5 border-[#0511F2]/30 shadow-2xl' : 'bg-gray-50/50 border-gray-100/50'
                    }`}
            >
                <div className="diagonal-accent !opacity-[0.02]"></div>
                <SortableContext items={leads.map(l => l.lead_id)} strategy={verticalListSortingStrategy}>
                    {leads.map((lead) => (
                        <SortableLeadCard key={lead.lead_id} lead={lead} />
                    ))}
                </SortableContext>

                {leads.length === 0 && !isOver && (
                    <div className="flex-1 border-2 border-dashed border-gray-100 rounded-[2rem] flex flex-col items-center justify-center gap-3 opacity-30 grayscale group">
                        <span className="text-3xl transition-transform group-hover:scale-110">📥</span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Vacío</span>
                    </div>
                )}

                {isOver && (
                    <div className="absolute inset-0 bg-[#0511F2]/5 flex flex-col items-center justify-center gap-3 animate-in fade-in duration-300">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl animate-bounce">
                            <span className="text-2xl text-[#0511F2]">↓</span>
                        </div>
                        <span className="text-[10px] font-black text-[#0511F2] uppercase tracking-[0.2em] bg-white px-4 py-2 rounded-full shadow-md">Soltar para mover</span>
                    </div>
                )}
            </div>
        </div>
    );
}
