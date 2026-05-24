
"use client";

import { useEffect, useState, useMemo } from "react";
import { onLeadsUpdate, updateLead, createLead, auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Lead, LeadStatus, DeliveryModel, Capability } from "@/types/tracking";
import { ROLES_CONFIG } from "@/config/roles_config";
import { useTranslation } from "@/components/admin/LanguageContext";
import Link from "next/link";
import { useNotification } from "@/components/admin/NotificationContext";
import PipelineBoard from "@/components/admin/PipelineBoard";

export type ViewMode = 'PIPELINE' | 'TABLE';
export type Domain = 'GROW' | 'OPERATIONS' | 'SUPPORT';

import styles from "./Prospectos.module.css";

export default function ProspectosPage() {
    const { t } = useTranslation();
    const { showNotification } = useNotification();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeDomain, setActiveDomain] = useState<Domain>('GROW');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('PIPELINE');
    const [isCreating, setIsCreating] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        project_desc: '',
        targetDomain: 'GROW' as Domain,
        delivery_model: 'ADVISORY' as DeliveryModel,
        capability: 'SOFTWARE' as Capability
    });

    const [userRole, setUserRole] = useState<string | null>(null);
    const [userPillar, setUserPillar] = useState<Domain | 'ADMIN' | null>(null);
    const [userLevel, setUserLevel] = useState<number>(0);

    useEffect(() => {
        const unsubscribeLeads = onLeadsUpdate((data) => {
            setLeads(data);
            setLoading(false);
        });

        const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        const roleId = userDoc.data().role;
                        const config = ROLES_CONFIG[roleId] ||
                            ROLES_CONFIG[roleId?.toUpperCase()] ||
                            ROLES_CONFIG[roleId?.toLowerCase()];

                        if (config) {
                            setUserRole(roleId);
                            setUserPillar(config.pillar as any);
                            setUserLevel(config.level);

                            if (config.pillar === 'GROW' || config.pillar === 'OPERATIONS' || config.pillar === 'SUPPORT') {
                                setActiveDomain(config.pillar as Domain);
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error fetching user role:", error);
                }
            }
        });

        return () => {
            unsubscribeLeads();
            unsubscribeAuth();
        };
    }, []);

    const canSwitchDomain = useMemo(() => {
        if (!userPillar) return true;
        if (userPillar === 'ADMIN' || userLevel >= 6) return true;
        return false;
    }, [userPillar, userLevel]);

    const domainStatuses: Record<Domain, LeadStatus[]> = {
        GROW: ['LEAD_NEW', 'QUALIFICATION', 'CONTACTED', 'DISCOVERY_SCHEDULED', 'DISCOVERY_COMPLETED', 'PROPOSAL_PREPARING', 'PROPOSAL_SENT', 'NEGOTIATION', 'WIN_CLOSED', 'LOST', 'ON_HOLD'],
        OPERATIONS: ['HANDOFF', 'PROJECT_CREATED', 'KICK_OFF', 'INCEPTION_SPRINT_0', 'IN_EXECUTION', 'QA_UAT', 'DELIVERY', 'CLIENT_ACCEPTANCE', 'TECHNICAL_CLOSURE', 'ADMIN_CLOSURE', 'CLOSED'],
        SUPPORT: ['HYPERCARE', 'ACTIVE_SUPPORT', 'EVOLUTIVE', 'RENEWAL', 'ACCOUNT_EXPANDED', 'ACCOUNT_CLOSED']
    };

    const normalizeStatus = (status: any): LeadStatus => {
        const s = status as string;
        if (s === 'NEW') return 'LEAD_NEW';
        if (s === 'QUALIFIED') return 'QUALIFICATION';
        if (s === 'WON') return 'WIN_CLOSED';
        return status as LeadStatus;
    };

    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            if (!lead) return false;

            const currentStatus = normalizeStatus(lead.status_flow?.current);
            const matchesDomain = domainStatuses[activeDomain].includes(currentStatus);

            const searchTermLower = searchTerm.toLowerCase();
            const name = (lead.data?.name || "").toLowerCase();
            const email = (lead.data?.email || "").toLowerCase();
            const company = (lead.data?.company || "").toLowerCase();

            const matchesSearch =
                name.includes(searchTermLower) ||
                email.includes(searchTermLower) ||
                company.includes(searchTermLower);

            return matchesDomain && matchesSearch;
        });
    }, [leads, activeDomain, searchTerm]);

    const getStatusColor = (status: LeadStatus) => {
        const s = status as string;
        if (s.includes('LOST') || s.includes('CLOSED')) return 'admin-badge-gray';
        if (s.includes('WIN') || s.includes('ACCEPTANCE')) return 'admin-badge-success';
        if (s.startsWith('LEAD_') || s === 'QUALIFICATION' || s === 'CONTACTED') return 'admin-badge-primary';
        if (s.includes('DISCOVERY') || s.includes('PROPOSAL')) return 'admin-badge-accent';
        if (s.includes('PROJECT') || s.includes('EXECUTION')) return 'admin-badge-secondary';
        if (s === 'KICK_OFF') return 'admin-badge-accent';
        return 'admin-badge-gray';
    };

    const getInitialStatusForDomain = (domain: Domain): LeadStatus => {
        switch (domain) {
            case 'GROW': return 'LEAD_NEW';
            case 'OPERATIONS': return 'HANDOFF';
            case 'SUPPORT': return 'HYPERCARE';
            default: return 'LEAD_NEW';
        }
    };

    const targetDomainOptions = useMemo(() => {
        if (activeDomain === 'GROW') return ['GROW', 'OPERATIONS', 'SUPPORT'] as Domain[];
        if (activeDomain === 'OPERATIONS') return ['OPERATIONS', 'SUPPORT'] as Domain[];
        return ['SUPPORT'] as Domain[];
    }, [activeDomain]);

    const handleCreateLead = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);
        try {
            const newStatus = getInitialStatusForDomain(formData.targetDomain);

            const leadToCreate: Partial<Lead> = {
                data: {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    company: formData.company,
                    project_desc: formData.project_desc,
                    delivery_model: formData.delivery_model,
                    capability: formData.capability,
                    origin: 'admin_panel'
                },
                status_flow: {
                    current: newStatus,
                    history: [{
                        status: newStatus,
                        timestamp: new Date().toISOString(),
                        notes: 'Creado manualmente desde el panel administrativo'
                    }]
                },
                source_attribution: {
                    landing_page: 'admin_panel',
                    utm_source: 'admin_panel'
                }
            };

            await createLead(leadToCreate);
            showNotification("Prospecto creado exitosamente", "success");
            setIsCreating(false);
            setFormData({
                name: '',
                email: '',
                phone: '',
                company: '',
                project_desc: '',
                targetDomain: activeDomain,
                delivery_model: 'ADVISORY' as DeliveryModel,
                capability: 'SOFTWARE' as Capability
            });
        } catch (error: any) {
            showNotification(`Error: ${error.message}`, "error");
        } finally {
            setCreateLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.loadingBox}>
                <div className={styles.spinner}></div>
            </div>
        );
    }

    const statusLabels: Record<LeadStatus, string> = {
        LEAD_NEW: 'Nuevo Lead', QUALIFICATION: 'Calificación', CONTACTED: 'Contactado',
        DISCOVERY_SCHEDULED: 'D. Agendado', DISCOVERY_COMPLETED: 'D. Completado',
        PROPOSAL_PREPARING: 'Prep. Propuesta', PROPOSAL_SENT: 'Propuesta Enviada',
        NEGOTIATION: 'Negociación', WIN_CLOSED: 'Venta Ganada', LOST: 'Perdido', ON_HOLD: 'Espera',
        HANDOFF: 'Handoff', PROJECT_CREATED: 'Setup', KICK_OFF: 'Kick-off',
        INCEPTION_SPRINT_0: 'Inception', IN_EXECUTION: 'Ejecución', QA_UAT: 'QA / UAT',
        DELIVERY: 'Entrega', CLIENT_ACCEPTANCE: 'Aceptación', TECHNICAL_CLOSURE: 'Cierre Téc.',
        ADMIN_CLOSURE: 'Cierre Adm.', CLOSED: 'Cerrado', HYPERCARE: 'Hypercare',
        ACTIVE_SUPPORT: 'Soporte Activo', EVOLUTIVE: 'Evolutivo', RENEWAL: 'Renovación',
        ACCOUNT_EXPANDED: 'Expansión', ACCOUNT_CLOSED: 'Finalizado'
    };

    return (
        <div className={styles.pageContainer}>
            {/* Header */}
            <div className={styles.actionBar}>
                <div className={styles.controlsGroup}>
                    <button
                        onClick={() => {
                            setFormData(prev => ({ ...prev, targetDomain: activeDomain }));
                            setIsCreating(true);
                        }}
                        className="admin-btn admin-btn-primary"
                    >
                        <span>➕</span>
                        NUEVO LEAD
                    </button>

                    <div className={styles.toggleContainer}>
                        <button
                            onClick={() => setViewMode('PIPELINE')}
                            className={`${styles.toggleBtn} ${viewMode === 'PIPELINE' ? styles.toggleBtnActive : ''}`}
                        >
                            PIPELINE
                        </button>
                        <button
                            onClick={() => setViewMode('TABLE')}
                            className={`${styles.toggleBtn} ${viewMode === 'TABLE' ? styles.toggleBtnActive : ''}`}
                        >
                            TABLA
                        </button>
                    </div>
                </div>
            </div>

            {/* Domain Navigation Tabs */}
            <div className={styles.tabsPanel}>
                <div className={styles.domainTabsGroup}>
                    {(['GROW', 'OPERATIONS', 'SUPPORT'] as Domain[]).map((domain) => {
                        const isLocked = !canSwitchDomain && userPillar !== domain;
                        return (
                            <button
                                key={domain}
                                disabled={isLocked}
                                onClick={() => setActiveDomain(domain)}
                                className={`${styles.domainTab} ${activeDomain === domain ? styles.domainTabActive : ''} ${isLocked ? styles.domainTabLocked : ''}`}
                            >
                                <span>{domain === 'GROW' ? '📈' : domain === 'OPERATIONS' ? '⚙️' : '🤝'}</span>
                                {domain}
                            </button>
                        );
                    })}
                </div>

                <div className={styles.searchBox}>
                    <span className={styles.searchIcon}>🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar por cliente o empresa..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>
            </div>

            {/* Domain Info Header */}
            <div className={styles.domainBadgeHeader}>
                <div className={styles.domainInfo}>
                    <div className={styles.domainIcon}>
                        {activeDomain === 'GROW' ? '📈' : activeDomain === 'OPERATIONS' ? '⚙️' : '🤝'}
                    </div>
                    <div>
                        <h3 className={styles.domainTitle}>
                            {activeDomain === 'GROW' ? 'Dominio de Crecimiento (Ventas)' : activeDomain === 'OPERATIONS' ? 'Dominio de Operaciones (Delivery)' : 'Dominio de Soporte (Continuidad)'}
                        </h3>
                        <p className={styles.domainSubtitle}>
                            {activeDomain === 'GROW' ? 'Convierte leads en contratos cerrados' : activeDomain === 'OPERATIONS' ? 'Garantiza la entrega de valor y calidad técnica' : 'Fomenta la retención y expansión de cuentas'}
                        </p>
                    </div>
                </div>
                <div className={styles.countIndicator}>
                    <span className={styles.countText}>{filteredLeads.length} Items Encontrados</span>
                    <div className={styles.pulseDot}></div>
                </div>
            </div>

            {/* Leads List / Board Container */}
            {viewMode === 'PIPELINE' ? (
                <PipelineBoard
                    leads={filteredLeads}
                    statuses={domainStatuses[activeDomain]}
                    onStatusChange={async (leadId, newStatus) => {
                        await updateLead(leadId, { status_flow: { current: newStatus, history: [] } });
                        showNotification("Estado actualizado", "success");
                    }}
                />
            ) : (
                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Entidad / Contacto</th>
                                <th>Estado Actual</th>
                                <th>Origen & Región</th>
                                <th>Métricas</th>
                                <th style={{ textAlign: 'right' }}>Gestión</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLeads.map((lead) => (
                                <tr key={lead.lead_id}>
                                    <td>
                                        <div className="admin-table-entity">
                                            <div className="admin-table-row-title">
                                                <Link href={`/admin/prospectos/${lead.lead_id}`} className="admin-table-name">
                                                    {lead.data?.name || 'Sin Nombre'}
                                                </Link>
                                                {lead.data?.company && (
                                                    <span className="admin-table-company-badge">{lead.data.company}</span>
                                                )}
                                            </div>
                                            <div className="admin-table-contact-info">
                                                {lead.data?.email || lead.data?.phone || 'Sin contacto'}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`admin-badge ${getStatusColor(lead.status_flow.current)}`} style={{ padding: '0.4rem 1rem', fontSize: '9px' }}>
                                            {statusLabels[lead.status_flow.current] || lead.status_flow.current}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="admin-table-meta-box">
                                            <span className="admin-table-meta-primary">{lead.source_attribution.landing_page?.split('_')[0] || 'Directo'}</span>
                                            <span className="admin-table-meta-secondary">
                                                {lead.data?.region || 'Global'} / {lead.source_attribution.utm_source || 'Organic'}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="admin-table-meta-box">
                                            <span className="admin-table-meta-primary">
                                                {lead.kpis?.clicks_count || 0} clics • {Math.round((lead.kpis?.session_duration || 0) / 60)}m
                                            </span>
                                            <span className="admin-table-meta-secondary">
                                                Creado: {new Date(lead.audit_logs?.created_at?.toDate?.() ||
                                                    (lead.audit_logs?.created_at ? new Date(lead.audit_logs?.created_at) : new Date())).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <Link
                                            href={`/admin/prospectos/${lead.lead_id}`}
                                            className="admin-table-action-btn"
                                        >
                                            👁️
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredLeads.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '5rem 0' }}>
                            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1.5rem' }}>🏜️</span>
                            <h3 className="admin-h3" style={{ fontSize: '1.25rem', color: 'var(--admin-primary)' }}>No hay leads en este dominio</h3>
                            <p className="admin-subtitle" style={{ fontSize: '0.85rem' }}>Prueba cambiando de dominio o ajustando tu búsqueda</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create Prospect Modal */}
            {isCreating && (
                <div className={styles.modalOverlay} onClick={() => setIsCreating(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className="diagonal-accent" style={{ opacity: 0.1 }}></div>

                        <div className={styles.modalHeader}>
                            <div className={styles.modalHeaderAccent} />
                            <div>
                                <h2 className="admin-modal-title" style={{ fontSize: '1.05rem', marginBottom: '2px' }}>Capturar Nuevo Lead</h2>
                                <p className="admin-modal-subtitle" style={{ fontSize: '12px', margin: 0 }}>Inicia el flujo de preventa manualmente</p>
                            </div>
                            <button type="button" onClick={() => setIsCreating(false)} className={styles.modalClose}>✕</button>
                        </div>

                        <form onSubmit={handleCreateLead} className={styles.formContainer}>
                            <div className={styles.formGrid}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.inputLabel}>Nombre del Contacto</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ej. Juan Pérez"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className={styles.input}
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.inputLabel}>Nombre de Empresa</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. Brecomp"
                                        value={formData.company}
                                        onChange={e => setFormData({ ...formData, company: e.target.value })}
                                        className={styles.input}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGrid} style={{ marginTop: '1.5rem' }}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.inputLabel}>Email Corporativo</label>
                                    <input
                                        type="email"
                                        placeholder="juan@empresa.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className={styles.input}
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.inputLabel}>WhatsApp de Contacto</label>
                                    <input
                                        type="tel"
                                        placeholder="+51 9.. ... ..."
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className={styles.input}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGrid} style={{ marginTop: '1.5rem' }}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.inputLabel}>Modelo de Entrega</label>
                                    <select
                                        value={formData.delivery_model}
                                        onChange={e => setFormData({ ...formData, delivery_model: e.target.value as DeliveryModel })}
                                        className={styles.input}
                                    >
                                        <option value="ADVISORY">ADVISORY</option>
                                        <option value="IMPLEMENTATION">IMPLEMENTATION</option>
                                        <option value="MANAGED_SERVICES">MANAGED SERVICES</option>
                                        <option value="STAFF_AUGMENTATION">STAFF AUGMENTATION</option>
                                    </select>
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.inputLabel}>Capacidad</label>
                                    <select
                                        value={formData.capability}
                                        onChange={e => setFormData({ ...formData, capability: e.target.value as Capability })}
                                        className={styles.input}
                                    >
                                        <option value="SOFTWARE">💻 Software & Apps</option>
                                        <option value="AI">🤖 IA & Data Science</option>
                                        <option value="MARKETING">📣 Marketing & Growth</option>
                                        <option value="CLOUD">☁️ Cloud & Infra</option>
                                        <option value="ERP">🏢 ERP & Business</option>
                                        <option value="DATA">📊 Data Analytics</option>
                                        <option value="PMO">📋 PMO & Governance</option>
                                        <option value="AUTOMATION">⚡ Automation / RPA</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.inputGroup} style={{ marginTop: '1.5rem' }}>
                                <label className={styles.inputLabel}>Necesidad / Dolor Detectado</label>
                                <textarea
                                    rows={3}
                                    placeholder="¿Qué problema estamos resolviendo?"
                                    value={formData.project_desc}
                                    onChange={e => setFormData({ ...formData, project_desc: e.target.value })}
                                    className={styles.input}
                                    style={{ resize: 'vertical', minHeight: '80px' }}
                                />
                            </div>

                            <div className={styles.inputGroup} style={{ marginTop: '1.5rem' }}>
                                <label className={styles.inputLabel}>Asignar a (Pilar Destino)</label>
                                <select
                                    value={formData.targetDomain}
                                    onChange={e => setFormData({ ...formData, targetDomain: e.target.value as Domain })}
                                    className={styles.input}
                                >
                                    {targetDomainOptions.map(domain => (
                                        <option key={domain} value={domain}>
                                            {domain === 'GROW' ? '📈 GROW (Ventas / Comercial)' :
                                                domain === 'OPERATIONS' ? '⚙️ OPERATIONS (Delivery)' :
                                                    '🤝 SUPPORT (Postventa / Mant.)'}
                                        </option>
                                    ))}
                                </select>
                                <p className={styles.inputHint}>
                                    Al asignar, el Lead comenzará en el primer estado de ese dominio.
                                </p>
                            </div>

                            <div className={styles.formActions} style={{ marginTop: '1.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className={styles.btnSecondary}
                                >
                                    DESCARTAR
                                </button>
                                <button
                                    type="submit"
                                    disabled={createLoading}
                                    className={styles.btnPrimary}
                                >
                                    {createLoading ? '...' : 'GUARDAR EN PIPELINE'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
