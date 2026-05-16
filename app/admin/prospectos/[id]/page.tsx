
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getLeadById, updateLead, onAvailabilityUpdate, getBusinessSettings } from "@/lib/firebase";
import { Lead, LeadStatus } from "@/types/tracking";
import { useTranslation } from "@/components/admin/LanguageContext";
import { useNotification } from "@/components/admin/NotificationContext";
import { getTimeSlotsForDate } from "@/lib/timeSlots";
import ScheduleModal from "@/components/admin/ScheduleModal";

import styles from "./ProspectoDetail.module.css";

export default function LeadDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { t } = useTranslation();
    const { showNotification } = useNotification();
    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [isUpdatingValue, setIsUpdatingValue] = useState(false);
    const [newValue, setNewValue] = useState('');
    const [resolvedFileUrl, setResolvedFileUrl] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('Documento de Proyecto');

    useEffect(() => {
        if (id) fetchLead();
    }, [id]);

    useEffect(() => {
        if (lead?.data?.file_url) {
            resolveFileUrl(lead.data.file_url);
        } else {
            setResolvedFileUrl(null);
        }
    }, [lead?.data?.file_url]);

    async function resolveFileUrl(urlOrPath: string) {
        if (!urlOrPath) return;
        if (urlOrPath.startsWith('http')) {
            setResolvedFileUrl(urlOrPath);
            return;
        }

        try {
            const parts = urlOrPath.split('/');
            const rawName = parts.pop() || 'Documento';
            const cleanName = rawName.includes('_') ? rawName.split('_').slice(1).join('_') : rawName;
            setFileName(cleanName);

            const { ref, getDownloadURL } = await import('firebase/storage');
            const { storage } = await import('@/lib/firebase');
            const fileRef = ref(storage, urlOrPath);
            const resolved = await getDownloadURL(fileRef);
            setResolvedFileUrl(resolved);
        } catch (error: any) {
            console.error("Error resolving file URL:", error);
            setResolvedFileUrl(null);
        }
    }

    async function fetchLead() {
        setLoading(true);
        try {
            const data = await getLeadById(id as string);
            setLead(data);
        } catch (error) {
            console.error("Error fetching lead:", error);
            showNotification("Error loading lead details", "error");
        } finally {
            setLoading(false);
        }
    }

    const statusSequence: { key: LeadStatus; label: string; color: string; domain: 'GROW' | 'OPERATIONS' | 'SUPPORT' }[] = [
        // GROW
        { key: 'LEAD_NEW', label: 'Nuevo', color: '#0511F2', domain: 'GROW' },
        { key: 'QUALIFICATION', label: 'Calificación', color: '#26A3BF', domain: 'GROW' },
        { key: 'CONTACTED', label: 'Contactado', color: 'rgba(5, 17, 242, 0.8)', domain: 'GROW' },
        { key: 'DISCOVERY_SCHEDULED', label: 'D. Agendado', color: 'rgba(238, 5, 242, 0.7)', domain: 'GROW' },
        { key: 'DISCOVERY_COMPLETED', label: 'D. Completado', color: 'rgba(238, 5, 242, 0.9)', domain: 'GROW' },
        { key: 'PROPOSAL_PREPARING', label: 'Prep. Propuesta', color: '#EAF207', domain: 'GROW' },
        { key: 'PROPOSAL_SENT', label: 'Enviada', color: 'rgba(38, 163, 191, 0.8)', domain: 'GROW' },
        { key: 'NEGOTIATION', label: 'Negociación', color: 'rgba(238, 5, 242, 0.5)', domain: 'GROW' },
        { key: 'WIN_CLOSED', label: 'Ganado', color: '#6FD904', domain: 'GROW' },
        { key: 'LOST', label: 'Perdido', color: '#9CA3AF', domain: 'GROW' },
        { key: 'ON_HOLD', label: 'Espera', color: '#E5E7EB', domain: 'GROW' },
        // OPERATIONS
        { key: 'HANDOFF', label: 'Handoff', color: 'rgba(5, 17, 242, 0.6)', domain: 'OPERATIONS' },
        { key: 'PROJECT_CREATED', label: 'Setup', color: 'rgba(38, 163, 191, 0.6)', domain: 'OPERATIONS' },
        { key: 'KICK_OFF', label: 'Kick-off', color: '#EE05F2', domain: 'OPERATIONS' },
        { key: 'INCEPTION_SPRINT_0', label: 'Inception', color: 'rgba(5, 17, 242, 0.4)', domain: 'OPERATIONS' },
        { key: 'IN_EXECUTION', label: 'Ejecución', color: '#0511F2', domain: 'OPERATIONS' },
        { key: 'QA_UAT', label: 'QA / UAT', color: 'rgba(238, 5, 242, 0.6)', domain: 'OPERATIONS' },
        { key: 'DELIVERY', label: 'Entrega', color: '#26A3BF', domain: 'OPERATIONS' },
        { key: 'CLIENT_ACCEPTANCE', label: 'Aceptación', color: '#6FD904', domain: 'OPERATIONS' },
        { key: 'TECHNICAL_CLOSURE', label: 'Cierre Téc.', color: '#9CA3AF', domain: 'OPERATIONS' },
        { key: 'ADMIN_CLOSURE', label: 'Cierre Adm.', color: '#D1D5DB', domain: 'OPERATIONS' },
        { key: 'CLOSED', label: 'Cerrado', color: '#6B7280', domain: 'OPERATIONS' },
        // SUPPORT
        { key: 'HYPERCARE', label: 'Hypercare', color: 'rgba(238, 5, 242, 0.8)', domain: 'SUPPORT' },
        { key: 'ACTIVE_SUPPORT', label: 'Soporte', color: '#0511F2', domain: 'SUPPORT' },
        { key: 'EVOLUTIVE', label: 'Evolutivo', color: '#26A3BF', domain: 'SUPPORT' },
        { key: 'RENEWAL', label: 'Renovación', color: '#EAF207', domain: 'SUPPORT' },
        { key: 'ACCOUNT_EXPANDED', label: 'Expansión', color: '#6FD904', domain: 'SUPPORT' },
        { key: 'ACCOUNT_CLOSED', label: 'Finalizado', color: '#6B7280', domain: 'SUPPORT' },
    ];

    const currentIdx = statusSequence.findIndex(s => s.key === lead?.status_flow.current);

    const handleSaveSchedule = async (date: string, time: string) => {
        if (!lead) return;
        setIsSavingSchedule(true);
        try {
            const { addBooking } = await import("@/lib/firebase");
            const newBooking = {
                customerName: lead.data?.name || "Lead Sin Nombre",
                customerEmail: lead.data?.email || "",
                customerPhone: lead.data?.phone || "",
                date: date,
                time: time,
                services: [{
                    id: 'discovery-meet',
                    name: 'Discovery Strategic Session',
                    description: 'Sesión de descubrimiento estratégico para nuevo prospecto.',
                    price: 0,
                    duration: 60,
                    active: true
                }],
                totalPrice: 0,
                status: 'confirmed' as const,
                history: [
                    {
                        action: 'booking_created_from_lead',
                        timestamp: new Date().toISOString(),
                        details: `Cita agendada automáticamente desde el lead ${lead.lead_id}`
                    }
                ]
            };

            await addBooking(newBooking);
            const { addLeadEvent } = await import("@/lib/firebase");
            await addLeadEvent(lead.lead_id, {
                type: 'MEETING_SCHEDULED',
                description: `Cita de descubrimiento agendada para el ${date} a las ${time}`,
                timestamp: new Date(),
                metadata: { date, time }
            });

            await handleStatusUpdate('DISCOVERY_SCHEDULED');
            setShowScheduleModal(false);
            showNotification("Sesión de descubrimiento agendada correctamente", "success");
        } catch (error) {
            console.error("Error scheduling discovery meeting:", error);
            showNotification("Error al agendar la sesión", "error");
        } finally {
            setIsSavingSchedule(false);
        }
    };

    const handleAddNote = async () => {
        if (!lead || !noteText.trim() || isUpdating) return;
        setIsAddingNote(true);
        try {
            const { addLeadEvent } = await import("@/lib/firebase");
            await addLeadEvent(lead.lead_id, {
                type: 'NOTE_ADDED',
                description: noteText,
                timestamp: new Date()
            });
            setNoteText('');
            setIsAddingNote(false);
            await fetchLead();
            showNotification("Nota agregada correctamente", "success");
        } catch (error) {
            showNotification("Error al agregar nota", "error");
        } finally {
            setIsAddingNote(false);
        }
    };

    const handleUpdateValue = async () => {
        if (!lead || isUpdating) return;
        const val = parseFloat(newValue);
        if (isNaN(val)) return;

        setIsUpdating(true);
        try {
            await updateLead(lead.lead_id, { value_estimate: val });
            await fetchLead();
            setIsUpdatingValue(false);
            showNotification("Valor actualizado", "success");
        } catch (error) {
            showNotification("Error al actualizar valor", "error");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleStatusUpdate = async (newStatus: LeadStatus) => {
        if (!lead || isUpdating) return;
        setIsUpdating(true);
        try {
            await updateLead(lead.lead_id, {
                status_flow: {
                    ...lead.status_flow,
                    current: newStatus
                }
            });
            await fetchLead();
            showNotification(t('service_saved_success') || "Estado actualizado con éxito", "success");
        } catch (error) {
            showNotification(t('error_updating') || "Error actualizando estado", "error");
        } finally {
            setIsUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.loadingBox}>
                <div className={styles.spinner}></div>
            </div>
        );
    }

    if (!lead) {
        return (
            <div style={{ textAlign: 'center', padding: '5rem 0' }}>
                <p style={{ color: 'var(--admin-text-light)' }}>No se encontró el prospecto.</p>
                <button onClick={() => router.push('/admin/prospectos')} style={{ marginTop: '1rem', color: 'var(--admin-primary)', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer' }}>Volver</button>
            </div>
        );
    }

    return (
        <div className={styles.detailContainer}>
            {/* Header & Progress Tracker */}
            <div className={styles.headerSection}>
                <div className={styles.headerTop}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button onClick={() => router.push('/admin/prospectos')} className={styles.backBtn}>
                            ←
                        </button>
                        <div>
                            <div className="admin-decorator-line" style={{ marginBottom: '0.5rem' }}></div>
                            <h1 className="admin-h1">{lead.data?.name || 'Prospecto Sin Nombre'}</h1>
                            <p className="admin-subtitle">ID: {lead.lead_id}</p>
                        </div>
                    </div>

                    <div className={styles.valueEstimateBox}>
                        <div style={{ textAlign: 'right' }}>
                            <span className={styles.valueLabel}>Valor Estimado</span>
                            <span className={styles.valueAmount}>${lead.value_estimate?.toLocaleString() || '0'}</span>
                        </div>
                        <div className={styles.valueIcon}>
                            💰
                        </div>
                    </div>
                </div>

                {/* Segmented Smart Stepper */}
                <div className={styles.stepperContainer}>
                    <div className={styles.stepperDomains}>
                        {(['GROW', 'OPERATIONS', 'SUPPORT'] as const).map((domain) => {
                            const isCurrentDomain = statusSequence[currentIdx]?.domain === domain;
                            const isPastDomain = (domain === 'GROW' && statusSequence[currentIdx]?.domain !== 'GROW') ||
                                (domain === 'OPERATIONS' && statusSequence[currentIdx]?.domain === 'SUPPORT');

                            return (
                                <div key={domain} className={styles.domainBox}>
                                    <span className={`${styles.domainLabel} ${isCurrentDomain ? styles.active : isPastDomain ? styles.past : ''}`}>
                                        {domain === 'GROW' ? '📈 Grow' : domain === 'OPERATIONS' ? '⚙️ Operations' : '🤝 Support'}
                                    </span>
                                    <div className={`${styles.domainBar} ${isCurrentDomain ? styles.active : isPastDomain ? styles.past : ''}`}></div>
                                </div>
                            );
                        })}
                    </div>

                    <div className={styles.stepperTrack}>
                        <div className={styles.lineBg}></div>
                        <div
                            className={styles.lineFill}
                            style={{ width: `${(currentIdx / (statusSequence.length - 1)) * 100}%` }}
                        ></div>

                        {statusSequence.map((stage, idx) => {
                            const isCompleted = idx <= currentIdx;
                            const isCurrent = idx === currentIdx;
                            const activeDomain = statusSequence[currentIdx]?.domain;
                            const shouldShowLabel = stage.domain === activeDomain || isCurrent;

                            return (
                                <div key={stage.key} className={styles.step}>
                                    <div className={`${styles.node} ${isCurrent ? styles.active : isCompleted ? styles.completed : ''}`}>
                                        {isCompleted && !isCurrent ? (
                                            <svg style={{ width: '12px', height: '12px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: isCurrent ? 'white' : '#E5E7EB' }}></div>
                                        )}
                                    </div>

                                    {shouldShowLabel && (
                                        <span className={`${styles.label} ${isCurrent ? styles.active : ''}`}
                                            style={{
                                                transform: `translateY(${idx % 2 === 0 ? '0' : '6px'})`
                                            }}>
                                            {stage.label}
                                        </span>
                                    )}

                                    <div className={styles.tooltip}>
                                        <div className={styles.tooltipContent}>{stage.label}</div>
                                        <div className={styles.tooltipArrow}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className={styles.mainGrid}>
                {/* Main Info Card */}
                <div className={styles.infoSection}>
                    <div className={styles.sectionCard} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                        <section>
                            <h3 className="admin-h3" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className={styles.titleDecorator} style={{ backgroundColor: 'var(--admin-primary)' }}></span>
                                Datos de Contacto
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div>
                                    <label className="admin-label">Email</label>
                                    <p style={{ fontWeight: 'bold', color: 'var(--admin-text-main)' }}>{lead.data?.email || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="admin-label">Teléfono</label>
                                    <p style={{ fontWeight: 'bold', color: 'var(--admin-text-main)' }}>{lead.data?.phone || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="admin-label">Empresa</label>
                                    <p style={{ fontWeight: 'bold', color: 'var(--admin-text-main)' }}>{lead.data?.company || 'N/A'}</p>
                                </div>
                                {lead.data?.website && (
                                    <div>
                                        <label className="admin-label">Website</label>
                                        <p style={{ fontWeight: 'bold', color: 'var(--admin-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            <a href={lead.data.website.startsWith('http') ? lead.data.website : `https://${lead.data.website}`} target="_blank" rel="noopener noreferrer">
                                                {lead.data.website}
                                            </a>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section>
                            <h3 className="admin-h3" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className={styles.titleDecorator} style={{ backgroundColor: 'var(--admin-warning)' }}></span>
                                Modelo Operativo
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label className={styles.valueLabel} style={{ textAlign: 'left' }}>Delivery Model</label>
                                    <div style={{ marginTop: '0.25rem' }}>
                                        <span className="admin-badge admin-badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {lead.data?.delivery_model || 'ADVISORY'}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className={styles.valueLabel} style={{ textAlign: 'left' }}>Capability</label>
                                    <div style={{ marginTop: '0.25rem' }}>
                                        <span className="admin-badge admin-badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {lead.data?.capability || 'SOFTWARE'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Insights */}
                    <div className={styles.kpiGrid}>
                        <div className={styles.kpiCard}>
                            <span className={styles.kpiLabel}>Etapa Actual</span>
                            <span className={styles.kpiValue} style={{ color: 'var(--admin-success)' }}>{lead.data?.stage || 'No definida'}</span>
                        </div>
                        <div className={styles.kpiCard}>
                            <span className={styles.kpiLabel}>Urgencia</span>
                            <span className={styles.kpiValue} style={{ color: 'var(--admin-secondary)' }}>{lead.data?.timeline || 'N/A'}</span>
                        </div>
                        <div className={styles.kpiCard}>
                            <span className={styles.kpiLabel}>Inversión</span>
                            <span className={styles.kpiValue} style={{ color: 'var(--admin-primary)' }}>{lead.data?.investment_level || 'N/A'}</span>
                        </div>
                        <div className={styles.kpiCard}>
                            <span className={styles.kpiLabel}>Clics</span>
                            <span className={styles.kpiValue}>{lead.kpis?.clicks_count || 0}</span>
                        </div>
                    </div>

                    {/* Impact & Project Description */}
                    <div className={styles.sectionCard}>
                        <section style={{ marginBottom: '2rem' }}>
                            <h3 className="admin-h3" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className={styles.titleDecorator} style={{ backgroundColor: 'var(--admin-success)' }}></span>
                                Impacto de Negocio
                            </h3>
                            <p style={{ padding: '1.5rem', background: 'var(--admin-surface)', borderRadius: '1.25rem', fontWeight: 'bold', lineHeight: '1.6' }}>
                                {lead.data?.impact || 'No se especificó el impacto esperado.'}
                            </p>
                        </section>

                        <section>
                            <h3 className="admin-h3" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className={styles.titleDecorator} style={{ backgroundColor: 'var(--admin-primary)' }}></span>
                                Descripción del Proyecto
                            </h3>
                            <p style={{ color: 'var(--admin-text-muted)', fontWeight: '500', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                                {lead.data?.project_desc || 'No se proporcionó descripción detallada.'}
                            </p>
                        </section>
                    </div>

                    {/* Timeline Feed */}
                    <div className={styles.sectionCard}>
                        <h3 className="admin-h3" style={{ marginBottom: '2rem' }}>Línea de Tiempo</h3>
                        
                        <div style={{ marginBottom: '2.5rem', background: 'var(--admin-surface)', padding: '1rem', borderRadius: '1.25rem' }}>
                            <textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="Escribe una actualización..."
                                className="admin-input"
                                style={{ minHeight: '100px', resize: 'none', marginBottom: '1rem' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={handleAddNote}
                                    disabled={!noteText.trim() || isAddingNote}
                                    className="admin-btn admin-btn-primary"
                                    style={{ padding: '0.75rem 1.5rem' }}
                                >
                                    {isAddingNote ? '...' : 'Postear Nota'}
                                </button>
                            </div>
                        </div>

                        <div className={styles.timelineContainer}>
                            <div className={styles.timelineLine}></div>
                            {(lead.events || []).slice().reverse().map((event: any, idx: number) => (
                                <div key={idx} className={styles.timelineEvent}>
                                    <div className={styles.eventIcon}>
                                        {event.type === 'STATUS_CHANGED' ? '🚀' : '📝'}
                                    </div>
                                    <div className={styles.eventContent}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--admin-text-light)', textTransform: 'uppercase' }}>
                                                {event.type.replace(/_/g, ' ')}
                                            </span>
                                            <span style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--admin-text-light)' }}>
                                                {new Date(event.timestamp?.toDate?.() || event.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--admin-text-main)' }}>
                                            {event.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className={styles.sidebar}>
                    <div className={`${styles.sectionCard} ${styles.stickySidebar}`}>
                        <h3 className="admin-h3" style={{ marginBottom: '1.5rem' }}>Estado Actual</h3>
                        <div style={{ padding: '1.5rem', background: 'var(--admin-surface)', borderRadius: '1.5rem', textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <div className="admin-status-dot admin-status-dot-active"></div>
                                <span style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--admin-text-main)' }}>
                                    {lead.status_flow.current.replace(/_/g, ' ')}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button onClick={() => setShowScheduleModal(true)} className={styles.actionBtn} style={{ background: 'rgba(5, 17, 242, 0.05)', color: 'var(--admin-primary)' }}>
                                🗓️ Agendar Discovery
                            </button>
                            <button className={styles.actionBtn} style={{ background: 'rgba(238, 5, 242, 0.05)', color: 'var(--admin-accent)' }}>
                                📧 Enviar Propuesta
                            </button>
                            <button 
                                onClick={() => {
                                    setNewValue(lead.value_estimate?.toString() || '0');
                                    setIsUpdatingValue(!isUpdatingValue);
                                }}
                                className={styles.actionBtn} 
                                style={{ background: 'rgba(111, 217, 4, 0.05)', color: 'var(--admin-success)' }}
                            >
                                💰 {isUpdatingValue ? 'Cerrar' : 'Actualizar Valor'}
                            </button>

                            {isUpdatingValue && (
                                <div className="animate-slide-up" style={{ marginTop: '0.5rem' }}>
                                    <input
                                        type="number"
                                        value={newValue}
                                        onChange={(e) => setNewValue(e.target.value)}
                                        className="admin-input"
                                        style={{ marginBottom: '0.5rem' }}
                                    />
                                    <button onClick={handleUpdateValue} className="admin-btn admin-btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
                                        Guardar
                                    </button>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label className={styles.kpiLabel}>Actualizar Pipeline</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.25rem' }} className="admin-scrollbar">
                                {/* GROW Domain */}
                                <div>
                                    <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Dominio GROW</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {(['LEAD_NEW', 'QUALIFICATION', 'CONTACTED', 'DISCOVERY_SCHEDULED', 'DISCOVERY_COMPLETED', 'PROPOSAL_PREPARING', 'PROPOSAL_SENT', 'NEGOTIATION', 'WIN_CLOSED', 'LOST', 'ON_HOLD'] as LeadStatus[]).map((status) => (
                                            <button
                                                key={status}
                                                onClick={() => handleStatusUpdate(status)}
                                                disabled={lead.status_flow.current === status || isUpdating}
                                                className={`w-full py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border ${lead.status_flow.current === status
                                                    ? 'bg-[#0511F2] text-white border-[#0511F2] shadow-lg shadow-blue-100'
                                                    : 'bg-white text-gray-400 border-gray-100 hover:border-[#0511F2]/20 hover:text-[#0511F2]'
                                                }`}
                                            >
                                                {statusSequence.find(s => s.key === status)?.label || status.replace(/_/g, ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* OPERATIONS Domain */}
                                <div>
                                    <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Dominio OPERATIONS</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {(['HANDOFF', 'PROJECT_CREATED', 'KICK_OFF', 'INCEPTION_SPRINT_0', 'IN_EXECUTION', 'QA_UAT', 'DELIVERY', 'CLIENT_ACCEPTANCE', 'TECHNICAL_CLOSURE', 'ADMIN_CLOSURE', 'CLOSED'] as LeadStatus[]).map((status) => (
                                            <button
                                                key={status}
                                                onClick={() => handleStatusUpdate(status)}
                                                disabled={lead.status_flow.current === status || isUpdating}
                                                className={`w-full py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border ${lead.status_flow.current === status
                                                    ? 'bg-[#26A3BF] text-white border-[#26A3BF] shadow-lg shadow-cyan-100'
                                                    : 'bg-white text-gray-400 border-gray-100 hover:border-[#26A3BF]/20 hover:text-[#26A3BF]'
                                                }`}
                                            >
                                                {statusSequence.find(s => s.key === status)?.label || status.replace(/_/g, ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* SUPPORT Domain */}
                                <div>
                                    <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Dominio SUPPORT</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {(['HYPERCARE', 'ACTIVE_SUPPORT', 'EVOLUTIVE', 'RENEWAL', 'ACCOUNT_EXPANDED', 'ACCOUNT_CLOSED'] as LeadStatus[]).map((status) => (
                                            <button
                                                key={status}
                                                onClick={() => handleStatusUpdate(status)}
                                                disabled={lead.status_flow.current === status || isUpdating}
                                                className={`w-full py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border ${lead.status_flow.current === status
                                                    ? 'bg-[#EE05F2] text-white border-[#EE05F2] shadow-lg shadow-pink-100'
                                                    : 'bg-white text-gray-400 border-gray-100 hover:border-[#EE05F2]/20 hover:text-[#EE05F2]'
                                                }`}
                                            >
                                                {statusSequence.find(s => s.key === status)?.label || status.replace(/_/g, ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Audit Info Mini */}
                        <div className="mt-8 pt-8 border-t border-gray-50 space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-gray-400">IP</span>
                                <span className="text-gray-900">{lead.audit_logs?.ip}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-gray-400">Canal</span>
                                <span className="text-gray-900 uppercase">Web Landing</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scheduling Modal */}
            <ScheduleModal
                isOpen={showScheduleModal}
                onClose={() => setShowScheduleModal(false)}
                onSave={handleSaveSchedule}
                title="Agendar Sesión"
                subtitle={`Prospecto: ${lead.data.name}`}
                isSaving={isSavingSchedule}
            />
        </div>
    );
}
