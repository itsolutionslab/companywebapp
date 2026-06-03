"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lead } from "@/types/tracking";
import Link from "next/link";
import styles from "./SortableLeadCard.module.css";

interface SortableLeadCardProps {
    lead: Lead;
    onAssignClick?: (lead: Lead) => void;
}

export function SortableLeadCard({ lead, onAssignClick }: SortableLeadCardProps) {
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
            className={styles.wrapper}
        >
            <Link
                href={`/admin/prospectos/${lead.lead_id}`}
                onClick={(e) => {
                    if (transform) e.preventDefault();
                }}
                className={`${styles.leadCard} ${
                    lead.reminders?.some(r => r.status === 'pending' && (!r.scheduled_for || (r.scheduled_for?.seconds * 1000) <= Date.now())) 
                    ? styles.reminderAlertActive 
                    : ''
                }`}
            >
                <div className={styles.cardBg}>
                    <div className={styles.diagonal}></div>
                </div>
                <div className="relative z-10">
                    <div className={styles.cardHeader}>
                        <div className={styles.badges}>
                            <span className={`${styles.badge} ${styles.badgeInternal}`}>
                                {lead.data?.origin === 'admin_panel' ? '🛠️ INTERNAL' : '🌐 WEB'}
                            </span>
                            {lead.data?.delivery_model && (
                                <span className={`${styles.badge} ${styles.badgeLego}`}>
                                    🏗️ {lead.data.delivery_model}
                                </span>
                            )}
                        </div>
                        {lead.priority === 'HIGH' && (
                            <div className={styles.star}>⭐</div>
                        )}
                    </div>

                    <div>
                        <h4 className={styles.title}>
                            {lead.data.name || 'Sin Nombre'}
                        </h4>
                        <p className={styles.subtitle}>
                            {lead.data.company || 'Sin Empresa'}
                        </p>
                    </div>

                    <div className={styles.cardFooter} style={{ flexDirection: 'column', gap: '0.5rem', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className={styles.meta}>
                                <div className={styles.iconBox}>
                                    {lead.data?.capability === 'SOFTWARE' && '💻'}
                                    {lead.data?.capability === 'AI' && '🤖'}
                                    {lead.data?.capability === 'MARKETING' && '📣'}
                                    {lead.data?.capability === 'CLOUD' && '☁️'}
                                    {lead.data?.capability === 'ERP' && '🏢'}
                                    {lead.data?.capability === 'DATA' && '📊'}
                                    {lead.data?.capability === 'PMO' && '📋'}
                                    {lead.data?.capability === 'AUTOMATION' && '⚡'}
                                </div>
                                <span className={styles.region}>
                                    {lead.data?.region || 'GLOBAL'}
                                </span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span className={styles.dateBadge}>
                                    {new Date(lead.audit_logs.created_at?.toDate?.() || lead.audit_logs.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '10px' }}>
                            <span style={{ color: 'var(--admin-secondary)', fontStyle: 'italic' }}>
                                {lead.created_by_name ? `Creado por: ${lead.created_by_name}` : 'Sin creador'}
                            </span>
                            {onAssignClick && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onAssignClick(lead);
                                    }}
                                    style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '4px',
                                        padding: '2px 6px',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontSize: '9px'
                                    }}
                                >
                                    👤 Asignar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
}
