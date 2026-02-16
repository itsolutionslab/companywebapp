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
    onStatusChange: (leadId: string, newStatus: LeadStatus) => Promise<void>;
}

export default function PipelineBoard({ leads, onStatusChange }: PipelineBoardProps) {
    const { t } = useTranslation();
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Avoid accidental drags when clicking
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

    const stages: { key: LeadStatus; label: string; color: string }[] = [
        { key: 'NEW', label: 'Nuevo', color: 'bg-blue-500' },
        { key: 'QUALIFIED', label: 'Calificado', color: 'bg-cyan-500' },
        { key: 'CONTACTED', label: 'Contactado', color: 'bg-indigo-500' },
        { key: 'DISCOVERY_SCHEDULED', label: 'Sesión Agendada', color: 'bg-purple-500' },
        { key: 'DISCOVERY_COMPLETED', label: 'Sesión Completada', color: 'bg-fuchsia-500' },
        { key: 'PROPOSAL_PREPARING', label: 'Propuesta en Prep.', color: 'bg-amber-500' },
        { key: 'PROPOSAL_SENT', label: 'Propuesta Enviada', color: 'bg-orange-500' },
        { key: 'NEGOTIATION', label: 'Negociación', color: 'bg-rose-500' },
        { key: 'WON', label: 'Ganado', color: 'bg-green-500' },
        { key: 'LOST', label: 'Perdido', color: 'bg-gray-500' },
        { key: 'ON_HOLD', label: 'En Espera', color: 'bg-slate-400' },
    ];

    const getLeadsInStage = (stage: LeadStatus) => {
        return leads.filter(l => l.status_flow.current === stage);
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

        // Find the stage from the over component
        // overId could be a stage key (from Droppable) or a leadId (from Sortable)
        let newStatus: LeadStatus | undefined;

        // If dropped over a column
        if (stages.some(s => s.key === overId)) {
            newStatus = overId as LeadStatus;
        } else {
            // Find which column the overId lead belongs to
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
            <div className="flex gap-4 overflow-x-auto pb-8 no-scrollbar min-h-[calc(100vh-250px)] pt-4 px-2">
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
