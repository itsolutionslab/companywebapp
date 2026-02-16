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
                className={`flex-1 rounded-[2rem] p-3 border transition-all duration-300 min-h-[calc(100vh-320px)] flex flex-col gap-3 ${isOver ? 'bg-blue-50/50 border-blue-200 shadow-inner' : 'bg-gray-50/50 border-gray-100/50'
                    }`}
            >
                <SortableContext items={leads.map(l => l.lead_id)} strategy={verticalListSortingStrategy}>
                    {leads.map((lead) => (
                        <SortableLeadCard key={lead.lead_id} lead={lead} />
                    ))}
                </SortableContext>

                {leads.length === 0 && !isOver && (
                    <div className="h-32 border-2 border-dashed border-gray-100 rounded-[1.5rem] flex flex-col items-center justify-center gap-2 opacity-50">
                        <span className="text-xl">📥</span>
                        <span className="text-[10px] font-black text-gray-300 uppercase italic">Vacío</span>
                    </div>
                )}

                {isOver && leads.length === 0 && (
                    <div className="h-32 border-2 border-dashed border-blue-200 rounded-[1.5rem] bg-blue-50/50 flex flex-col items-center justify-center gap-2">
                        <span className="text-xl animate-bounce">↓</span>
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Soltar para mover</span>
                    </div>
                )}
            </div>
        </div>
    );
}
