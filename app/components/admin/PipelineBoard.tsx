import { Lead, LeadStatus } from "@/types/tracking";
import { useTranslation } from "@/components/admin/LanguageContext";
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    defaultDropAnimationSideEffects
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { useState } from "react";
import { PipelineColumn } from "./PipelineColumn";
import { SortableLeadCard } from "./SortableLeadCard";

interface PipelineBoardProps {
    leads: Lead[];
    statuses: LeadStatus[];
    onStatusChange: (leadId: string, newStatus: LeadStatus) => Promise<void>;
}

export default function PipelineBoard({ leads, statuses, onStatusChange }: PipelineBoardProps) {
    const { t } = useTranslation();
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
        // GROW
        'LEAD_NEW': { label: '🚀 Nuevo Lead', color: 'bg-[#0511F2]' },
        'QUALIFICATION': { label: '⚖️ Calificación', color: 'bg-[#26A3BF]' },
        'CONTACTED': { label: '📞 Contactado', color: 'bg-[#0511F2]/80' },
        'DISCOVERY_SCHEDULED': { label: '📅 Discovery Agendado', color: 'bg-[#EE05F2]/70' },
        'DISCOVERY_COMPLETED': { label: '✅ Discovery Completado', color: 'bg-[#EE05F2]/90' },
        'PROPOSAL_PREPARING': { label: '📝 Propuesta en Prep.', color: 'bg-[#EAF207] !text-black' },
        'PROPOSAL_SENT': { label: '📧 Propuesta Enviada', color: 'bg-[#26A3BF]/80' },
        'NEGOTIATION': { label: '🤝 Negociación', color: 'bg-[#EE05F2]/50' },
        'WIN_CLOSED': { label: '🏆 Venta Cerrada', color: 'bg-[#6FD904]' },
        'LOST': { label: '❌ Perdido', color: 'bg-gray-400' },
        'ON_HOLD': { label: '⏳ En Espera', color: 'bg-gray-200' },
        // OPERATIONS
        'HANDOFF': { label: '🤝 Handoff', color: 'bg-[#0511F2]/60' },
        'PROJECT_CREATED': { label: '🏗️ Proyecto Creado', color: 'bg-[#26A3BF]/60' },
        'KICK_OFF': { label: '🚀 Kick-off', color: 'bg-[#EE05F2]' },
        'INCEPTION_SPRINT_0': { label: '🏁 Inception / S0', color: 'bg-[#0511F2]/40' },
        'IN_EXECUTION': { label: '⚡ En Ejecución', color: 'bg-[#0511F2]' },
        'QA_UAT': { label: '🧪 QA / UAT', color: 'bg-[#EE05F2]/60' },
        'DELIVERY': { label: '📦 Entrega', color: 'bg-[#26A3BF]' },
        'CLIENT_ACCEPTANCE': { label: '✅ Aceptación Cliente', color: 'bg-[#6FD904]' },
        'TECHNICAL_CLOSURE': { label: '🔧 Cierre Técnico', color: 'bg-gray-400' },
        'ADMIN_CLOSURE': { label: '📑 Cierre Admin.', color: 'bg-gray-300' },
        'CLOSED': { label: '🔒 Cerrado', color: 'bg-gray-500' },
        // SUPPORT
        'HYPERCARE': { label: '🏥 Hypercare', color: 'bg-[#EE05F2]/80' },
        'ACTIVE_SUPPORT': { label: '🛠️ Soporte Activo', color: 'bg-[#0511F2]' },
        'EVOLUTIVE': { label: '📈 Evolutivos', color: 'bg-[#26A3BF]' },
        'RENEWAL': { label: '🔄 Renovación', color: 'bg-[#EAF207] !text-black' },
        'ACCOUNT_EXPANDED': { label: '💰 Cuenta Expandida', color: 'bg-[#6FD904]' },
        'ACCOUNT_CLOSED': { label: '🚫 Cuenta Cerrada', color: 'bg-gray-500' },
    };

    const stages = statuses.map(s => ({
        key: s,
        label: STATUS_CONFIG[s]?.label || s.replace(/_/g, ' '),
        color: STATUS_CONFIG[s]?.color || 'bg-gray-200'
    }));

    const normalizeStatus = (status: any): LeadStatus => {
        const s = status as string;
        if (s === 'NEW') return 'LEAD_NEW';
        if (s === 'QUALIFIED') return 'QUALIFICATION';
        if (s === 'WON') return 'WIN_CLOSED';
        return status as LeadStatus;
    };

    const getLeadsInStage = (stage: LeadStatus) => {
        return leads.filter(l => normalizeStatus(l.status_flow.current) === stage);
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const leadId = active.id as string;
        const overId = over.id as string;

        let newStatus: LeadStatus | undefined;

        if (stages.some(s => s.key === overId)) {
            newStatus = overId as LeadStatus;
        } else {
            const overLead = leads.find(l => l.lead_id === overId);
            if (overLead) {
                newStatus = overLead.status_flow.current;
            }
        }

        const lead = leads.find(l => l.lead_id === leadId);
        if (lead && newStatus && lead.status_flow.current !== newStatus) {
            await onStatusChange(leadId, newStatus);
        }
    };

    const activeLead = activeId ? leads.find(l => l.lead_id === activeId) : null;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-6 overflow-x-auto pb-12 no-scrollbar min-h-[calc(100vh-350px)] pt-2 px-2">
                {stages.map((stage) => (
                    <PipelineColumn
                        key={stage.key}
                        stage={stage}
                        leads={getLeadsInStage(stage.key)}
                    />
                ))}
            </div>

            <DragOverlay dropAnimation={{
                sideEffects: defaultDropAnimationSideEffects({
                    styles: {
                        active: {
                            opacity: "0.5",
                        },
                    },
                }),
            }}>
                {activeLead ? (
                    <div className="w-80 rotate-2 scale-105 opacity-90 shadow-2xl">
                        <SortableLeadCard lead={activeLead} />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
