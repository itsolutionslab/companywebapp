"use client";

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
    SortableContext,
    sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useState } from "react";
import { PipelineColumn } from "./PipelineColumn";
import { SortableLeadCard } from "./SortableLeadCard";
import styles from "./Pipeline.module.css";

interface PipelineBoardProps {
    leads: Lead[];
    statuses: LeadStatus[];
    onStatusChange: (leadId: string, newStatus: LeadStatus) => Promise<void>;
    onAssignClick?: (lead: Lead) => void;
}

export default function PipelineBoard({ leads, statuses, onStatusChange, onAssignClick }: PipelineBoardProps) {
    const { t } = useTranslation();
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 150,
                tolerance: 10,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const STATUS_CONFIG: Record<string, { label: string; color: string; textColor?: string }> = {
        // GROW
        'LEAD_NEW': { label: 'Nuevo Lead', color: '#0511F2' },
        'QUALIFICATION': { label: 'Calificación', color: '#26A3BF' },
        'CONTACTED': { label: 'Contactado', color: 'rgba(5, 17, 242, 0.8)' },
        'DISCOVERY_SCHEDULED': { label: 'D. Agendado', color: 'rgba(238, 5, 242, 0.7)' },
        'DISCOVERY_COMPLETED': { label: 'D. Completado', color: 'rgba(238, 5, 242, 0.9)' },
        'PROPOSAL_PREPARING': { label: 'Prep. Propuesta', color: '#EAF207', textColor: '#000000' },
        'PROPOSAL_SENT': { label: 'Enviada', color: 'rgba(38, 163, 191, 0.8)' },
        'NEGOTIATION': { label: 'Negociación', color: 'rgba(238, 5, 242, 0.5)' },
        'WIN_CLOSED': { label: 'Ganado', color: '#6FD904' },
        'LOST': { label: 'Perdido', color: '#9CA3AF' },
        'ON_HOLD': { label: 'Espera', color: '#E5E7EB' },
        // OPERATIONS
        'HANDOFF': { label: 'Handoff', color: 'rgba(5, 17, 242, 0.6)' },
        'PROJECT_CREATED': { label: 'Setup', color: 'rgba(38, 163, 191, 0.6)' },
        'KICK_OFF': { label: 'Kick-off', color: '#EE05F2' },
        'INCEPTION_SPRINT_0': { label: 'Inception', color: 'rgba(5, 17, 242, 0.4)' },
        'IN_EXECUTION': { label: 'Ejecución', color: '#0511F2' },
        'QA_UAT': { label: 'QA / UAT', color: 'rgba(238, 5, 242, 0.6)' },
        'DELIVERY': { label: 'Entrega', color: '#26A3BF' },
        'CLIENT_ACCEPTANCE': { label: 'Aceptación', color: '#6FD904' },
        'TECHNICAL_CLOSURE': { label: 'Cierre Téc.', color: '#9CA3AF' },
        'ADMIN_CLOSURE': { label: 'Cierre Adm.', color: '#D1D5DB' },
        'CLOSED': { label: 'Cerrado', color: '#6B7280' },
        // SUPPORT
        'HYPERCARE': { label: 'Hypercare', color: 'rgba(238, 5, 242, 0.8)' },
        'ACTIVE_SUPPORT': { label: 'Soporte Activo', color: '#0511F2' },
        'EVOLUTIVE': { label: 'Evolutivo', color: '#26A3BF' },
        'RENEWAL': { label: 'Renovación', color: '#EAF207', textColor: '#000000' },
        'ACCOUNT_EXPANDED': { label: 'Expansión', color: '#6FD904' },
        'ACCOUNT_CLOSED': { label: 'Finalizado', color: '#6B7280' },
    };

    const stages = statuses.map(s => ({
        key: s,
        label: STATUS_CONFIG[s]?.label || s.replace(/_/g, ' '),
        color: STATUS_CONFIG[s]?.color || '#E5E7EB',
        textColor: STATUS_CONFIG[s]?.textColor
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
            autoScroll={{
                threshold: { x: 0.15, y: 0.15 },
                acceleration: 3,
            }}
        >
            <div className={styles.container}>
                {stages.map((stage) => (
                    <PipelineColumn
                        key={stage.key}
                        stage={stage}
                        leads={getLeadsInStage(stage.key)}
                        onAssignClick={onAssignClick}
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
                    <div style={{ 
                        width: typeof window !== 'undefined' && window.innerWidth < 768 ? '280px' : '320px', 
                        transform: 'rotate(2deg) scale(1.02)', 
                        opacity: 0.95, 
                        zIndex: 1000,
                        cursor: 'grabbing'
                    }}>
                        <SortableLeadCard lead={activeLead} onAssignClick={onAssignClick} />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
