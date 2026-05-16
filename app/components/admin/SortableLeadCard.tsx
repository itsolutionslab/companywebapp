"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lead } from "@/types/tracking";
import Link from "next/link";

interface SortableLeadCardProps {
    lead: Lead;
}

export function SortableLeadCard({ lead }: SortableLeadCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: lead.lead_id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 100 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="group outline-none"
        >
            <Link
                href={`/admin/prospectos/${lead.lead_id}`}
                onClick={(e) => {
                    // Prevent navigation if we are dragging
                    if (transform) e.preventDefault();
                }}
                className="block bg-white p-5 rounded-[2rem] shadow-[0_10px_30px_rgba(5,17,242,0.03)] border border-gray-100 hover:shadow-2xl hover:shadow-blue-500/10 hover:border-[#0511F2]/20 transition-all duration-500 active:scale-[0.98] cursor-grab active:cursor-grabbing relative overflow-hidden group"
            >
                <div className="diagonal-accent !opacity-[0.02]"></div>
                <div className="flex flex-col gap-3 relative z-10">
                    <div className="flex justify-between items-start">
                        <span className="text-[9px] font-black text-[#0511F2] uppercase tracking-[0.1em] bg-[#0511F2]/5 px-3 py-1.5 rounded-xl border border-[#0511F2]/10">
                            {lead.data?.origin === 'admin_panel' ? '🛠️ ADMIN' : '🌐 WEB'}
                        </span>
                        {lead.priority === 'HIGH' && (
                            <span className="text-[#EE05F2] drop-shadow-sm shadow-pink-200">★</span>
                        )}
                    </div>

                    <h4 className="text-sm font-black text-gray-900 group-hover:text-[#0511F2] transition-colors uppercase truncate tracking-tight font-heading">
                        {lead.data.name || 'Sin Nombre'}
                    </h4>

                    <p className="text-[10px] font-bold text-gray-400 uppercase truncate tracking-widest">
                        {lead.data.company || 'Sin Empresa'}
                    </p>

                    <div className="mt-2 pt-4 border-t border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#0511F2] to-blue-600 border-2 border-white shadow-md flex items-center justify-center text-[10px] font-black text-white uppercase">
                                {lead.owner_id ? 'A' : '?'}
                            </div>
                            <span className="text-[9px] font-black text-[#0511F2]/40 uppercase tracking-tighter flex items-center gap-1.5">
                                {lead.data?.region || 'GLOBAL'}
                                <span className="text-[12px]">
                                    {lead.data?.capability === 'SOFTWARE' && '💻'}
                                    {lead.data?.capability === 'AI' && '🤖'}
                                    {lead.data?.capability === 'MARKETING' && '📣'}
                                    {lead.data?.capability === 'CLOUD' && '☁️'}
                                    {lead.data?.capability === 'ERP' && '🏢'}
                                    {lead.data?.capability === 'DATA' && '📊'}
                                    {lead.data?.capability === 'PMO' && '📋'}
                                    {lead.data?.capability === 'AUTOMATION' && '⚡'}
                                </span>
                            </span>
                        </div>
                        <span className="text-[9px] font-black text-gray-300 uppercase bg-gray-50 px-2 py-1 rounded-md">
                            {new Date(lead.audit_logs.created_at?.toDate?.() || lead.audit_logs.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </span>
                    </div>
                </div>
            </Link>
        </div>
    );
}
