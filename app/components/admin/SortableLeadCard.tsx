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
                className="block bg-white p-4 rounded-[1.5rem] shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-gray-100 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-100 transition-all duration-300 active:scale-[0.98] cursor-grab active:cursor-grabbing"
            >
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter bg-blue-50 px-2 py-1 rounded-lg">
                            {lead.source_attribution?.landing_page?.split('_')[0] || 'WEB'}
                        </span>
                        {lead.priority === 'HIGH' && (
                            <span className="text-amber-500">★</span>
                        )}
                    </div>

                    <h4 className="text-sm font-black text-gray-900 group-hover:text-blue-600 transition-colors uppercase truncate">
                        {lead.data.name || 'Sin Nombre'}
                    </h4>

                    <p className="text-[10px] font-bold text-gray-400 uppercase truncate">
                        {lead.data.company || 'Sin Empresa'}
                    </p>

                    <div className="mt-2 pt-3 border-t border-gray-50 flex items-center justify-between">
                        <div className="flex -space-x-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-black text-gray-400 uppercase">
                                {lead.owner_id ? 'A' : '?'}
                            </div>
                        </div>
                        <span className="text-[9px] font-black text-gray-300 uppercase">
                            {new Date(lead.audit_logs.created_at?.toDate?.() || lead.audit_logs.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </span>
                    </div>
                </div>
            </Link>
        </div>
    );
}
