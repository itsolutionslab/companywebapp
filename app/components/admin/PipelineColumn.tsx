import { useDroppable } from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Lead, LeadStatus } from "@/types/tracking";
import { SortableLeadCard } from "./SortableLeadCard";
import styles from "./Pipeline.module.css";

interface PipelineColumnProps {
    stage: {
        key: LeadStatus;
        label: string;
        color: string;
        textColor?: string;
    };
    leads: Lead[];
}

export function PipelineColumn({ stage, leads }: PipelineColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: stage.key,
    });

    return (
        <div className={styles.column}>
            {/* Column Header */}
            <div className={styles.columnHeader}>
                <div className={styles.titleBox}>
                    <div 
                        className={styles.dot} 
                        style={{ 
                            backgroundColor: stage.color,
                            boxShadow: `0 0 10px ${stage.color}44`
                        }}
                    ></div>
                    <h3 className={styles.columnTitle} style={{ color: stage.textColor }}>
                        {stage.label}
                    </h3>
                    <span className={styles.columnCount}>
                        {leads.length}
                    </span>
                </div>
                <div className={styles.headerActions}>
                    <span style={{ fontSize: '12px', opacity: 0.3 }}>⋮⋮</span>
                </div>
            </div>

            {/* Column Body */}
            <div
                ref={setNodeRef}
                className={`${styles.columnBody} ${isOver ? styles.isOver : ''}`}
            >
                <div className={styles.diagonal}></div>
                <SortableContext items={leads.map(l => l.lead_id)} strategy={verticalListSortingStrategy}>
                    <div className={styles.cardsStack}>
                        {leads.map((lead) => (
                            <SortableLeadCard key={lead.lead_id} lead={lead} />
                        ))}
                    </div>
                </SortableContext>

                {leads.length === 0 && !isOver && (
                    <div className={styles.emptyState}>
                        <span className={styles.emptyIcon}>📥</span>
                        <span className={styles.columnTitle} style={{ opacity: 0.5 }}>Vacío</span>
                    </div>
                )}

                {isOver && (
                    <div className={styles.dropIndicatorOverlay}>
                        <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                            <div className={styles.dropIndicatorIcon}>
                                <span>↓</span>
                            </div>
                            <span className={styles.dropIndicatorText}>Soltar para mover</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
