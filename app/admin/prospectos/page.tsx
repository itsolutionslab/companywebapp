
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
        start_kickoff: false,
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

        // Fetch user role for access control with auth listener
        const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        const roleId = userDoc.data().role;
                        // Try matching case-insensitively
                        const config = ROLES_CONFIG[roleId] || 
                                     ROLES_CONFIG[roleId?.toUpperCase()] || 
                                     ROLES_CONFIG[roleId?.toLowerCase()];
                        
                        if (config) {
                            setUserRole(roleId);
                            setUserPillar(config.pillar as any);
                            setUserLevel(config.level);
                            
                            // Auto-select domain based on pillar
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
        if (!userPillar) return true; // Loading or admin
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
        if (s.includes('LOST') || s.includes('CLOSED')) return 'bg-gray-100 text-gray-500 border-gray-200';
        if (s.includes('WIN') || s.includes('ACCEPTANCE')) return 'bg-[#6FD904]/10 text-[#6FD904] border-[#6FD904]/20';
        if (s.startsWith('LEAD_') || s === 'QUALIFICATION' || s === 'CONTACTED') return 'bg-[#0511F2]/10 text-[#0511F2] border-[#0511F2]/20';
        if (s.includes('DISCOVERY') || s.includes('PROPOSAL')) return 'bg-[#EE05F2]/10 text-[#EE05F2] border-[#EE05F2]/20';
        if (s.includes('PROJECT') || s.includes('EXECUTION')) return 'bg-[#26A3BF]/10 text-[#26A3BF] border-[#26A3BF]/20';
        if (s === 'KICK_OFF') return 'bg-[#EE05F2] text-white border-transparent shadow-md shadow-pink-200';
        return 'bg-gray-50 text-gray-400 border-gray-100';
    };

    const handleCreateLead = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);
        try {
            const newStatus: LeadStatus = formData.start_kickoff ? 'KICK_OFF' : 'LEAD_NEW';
            
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
                start_kickoff: false,
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
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0511F2]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 px-2 relative">
                <div>
                    <div className="admin-decorator-line mb-4"></div>
                    <h1 className="admin-h1 text-4xl mb-2">Sistema Operativo de Consultoría</h1>
                    <p className="admin-subtitle text-gray-500 font-medium">Gestión integral del ciclo de vida del cliente: Consigue, Construye y Sostiene</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <button
                        onClick={() => setIsCreating(true)}
                        className="admin-btn admin-btn-primary shadow-xl shadow-pink-200 uppercase"
                    >
                        <span>➕</span>
                        NUEVO LEAD
                    </button>

                    {/* View Toggle */}
                    <div className="bg-gray-50 p-1.5 rounded-[2rem] flex items-center border border-gray-100 shadow-inner">
                        <button
                            onClick={() => setViewMode('PIPELINE')}
                            className={`px-6 py-3 rounded-2xl text-[10px] font-black tracking-widest transition-all duration-500 uppercase ${viewMode === 'PIPELINE' ? 'bg-[#0511F2] text-white shadow-xl shadow-blue-200 scale-[1.05]' : 'text-gray-400 hover:text-[#0511F2]'}`}
                        >
                            PIPELINE
                        </button>
                        <button
                            onClick={() => setViewMode('TABLE')}
                            className={`px-6 py-3 rounded-2xl text-[10px] font-black tracking-widest transition-all duration-500 uppercase ${viewMode === 'TABLE' ? 'bg-[#0511F2] text-white shadow-xl shadow-blue-200 scale-[1.05]' : 'text-gray-400 hover:text-[#0511F2]'}`}
                        >
                            TABLA
                        </button>
                    </div>
                </div>
            </div>

            {/* Domain Navigation Tabs */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div className="flex bg-gray-50 p-1.5 rounded-[2rem] w-full md:w-auto">
                    {(['GROW', 'OPERATIONS', 'SUPPORT'] as Domain[]).map((domain) => {
                        const isLocked = !canSwitchDomain && userPillar !== domain;
                        return (
                            <button
                                key={domain}
                                disabled={isLocked}
                                onClick={() => setActiveDomain(domain)}
                                className={`flex-1 md:flex-none px-8 py-4 rounded-[1.5rem] text-[11px] font-black tracking-[0.2em] transition-all duration-500 uppercase flex items-center justify-center gap-2 ${activeDomain === domain 
                                    ? 'bg-white text-[#0511F2] shadow-lg shadow-blue-900/5 scale-[1.02]' 
                                    : isLocked 
                                        ? 'text-gray-300 cursor-not-allowed opacity-50'
                                        : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {domain === 'GROW' && '🚀 '}
                                {domain === 'OPERATIONS' && '🛠️ '}
                                {domain === 'SUPPORT' && '💎 '}
                                {domain}
                                {isLocked && <span className="text-[10px]">🔒</span>}
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative group flex-grow">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm transition-colors group-focus-within:text-[#EE05F2]">🔍</span>
                        <input
                            type="text"
                            placeholder={`Buscar en ${activeDomain}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="admin-input !pl-11 w-full md:w-72 !bg-gray-50 border-transparent focus:!bg-white focus:!border-gray-200"
                        />
                    </div>
                </div>
            </div>

            {/* Domain Info Header */}
            <div className="px-6 py-4 bg-[#0511F2]/5 rounded-[2rem] border border-[#0511F2]/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">
                        {activeDomain === 'GROW' ? '📈' : activeDomain === 'OPERATIONS' ? '⚙️' : '🤝'}
                    </div>
                    <div>
                        <h3 className="text-[12px] font-black text-[#0511F2] uppercase tracking-[0.2em]">
                            {activeDomain === 'GROW' ? 'Dominio de Crecimiento (Ventas)' : activeDomain === 'OPERATIONS' ? 'Dominio de Operaciones (Delivery)' : 'Dominio de Soporte (Continuidad)'}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                            {activeDomain === 'GROW' ? 'Convierte leads en contratos cerrados' : activeDomain === 'OPERATIONS' ? 'Garantiza la entrega de valor y calidad técnica' : 'Fomenta la retención y expansión de cuentas'}
                        </p>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{filteredLeads.length} Items Encontrados</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0511F2] animate-pulse"></div>
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
                <div className="admin-table-container shadow-sm animate-in fade-in duration-500">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Entidad / Contacto</th>
                                <th>Estado Actual</th>
                                <th>Origen & Región</th>
                                <th>Métricas</th>
                                <th className="text-right">Gestión</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLeads.map((lead) => (
                                <tr key={lead.lead_id} className="group">
                                    <td>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-gray-900 group-hover:text-[#0511F2] transition-colors uppercase text-[13px] tracking-tight">
                                                    {lead.data?.name || 'Sin Nombre'}
                                                </span>
                                                {lead.data?.company && (
                                                    <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md tracking-widest uppercase">{lead.data.company}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className="text-[11px] text-gray-400 font-bold tracking-tight truncate max-w-[200px]">
                                                    {lead.data?.email || lead.data?.phone || 'Sin contacto'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`admin-badge !py-1.5 !px-4 !text-[9px] !font-black !tracking-widest ${getStatusColor(lead.status_flow.current)}`}>
                                            {lead.status_flow.current.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-gray-600">{lead.source_attribution.landing_page?.split('_')[0] || 'Directo'}</span>
                                            <span className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">
                                                {lead.data?.region || 'Global'} / {lead.source_attribution.utm_source || 'Organic'}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-gray-600">
                                                {lead.kpis?.clicks_count || 0} clics • {Math.round((lead.kpis?.session_duration || 0) / 60)}m
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">
                                                Creado: {new Date(lead.audit_logs?.created_at?.toDate?.() ||
                                                    (lead.audit_logs?.created_at ? new Date(lead.audit_logs?.created_at) : new Date())).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="text-right">
                                        <Link
                                            href={`/admin/prospectos/${lead.lead_id}`}
                                            className="inline-flex items-center justify-center w-12 h-12 rounded-[1.25rem] bg-gray-50 text-gray-400 hover:bg-[#0511F2] hover:text-white transition-all border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-200"
                                        >
                                            👁️
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {filteredLeads.length === 0 && (
                        <div className="py-24 text-center relative overflow-hidden">
                            <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-gray-100">
                                <span className="text-4xl grayscale opacity-50">🏜️</span>
                            </div>
                            <h3 className="text-xl font-black text-[#0511F2] font-heading uppercase tracking-tight">No hay leads en este dominio</h3>
                            <p className="text-gray-400 text-sm font-medium mt-2">Prueba cambiando de dominio o ajustando tu búsqueda</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create Prospect Modal */}
            {isCreating && (
                <div className="admin-modal-overlay animate-in fade-in duration-300">
                    <div className="admin-modal animate-in zoom-in-95 duration-300 !p-10 relative overflow-hidden max-w-2xl">
                        <div className="diagonal-accent !opacity-10"></div>
                        <div className="flex justify-between items-start mb-10 relative z-10">
                            <div>
                                <div className="admin-decorator-line mb-4 w-16"></div>
                                <h2 className="text-3xl font-black text-[#0511F2] tracking-tighter uppercase font-heading">Capturar Nuevo Lead</h2>
                                <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.2em] mt-2">Inicia el flujo de preventa manualmente</p>
                            </div>
                            <button 
                                onClick={() => setIsCreating(false)} 
                                className="w-12 h-12 rounded-[1.25rem] flex items-center justify-center text-gray-400 hover:text-[#EE05F2] hover:bg-pink-50 transition-all border border-transparent hover:border-pink-100"
                            >
                                <span className="text-xl">✕</span>
                            </button>
                        </div>

                        <form onSubmit={handleCreateLead} className="space-y-8 relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="admin-input-group">
                                    <label className="admin-label">Nombre Completo</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Ej: Alessandro De Piero"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="admin-input"
                                    />
                                </div>
                                <div className="admin-input-group">
                                    <label className="admin-label">Empresa</label>
                                    <input
                                        type="text"
                                        placeholder="Compañía / Organización"
                                        value={formData.company}
                                        onChange={e => setFormData({ ...formData, company: e.target.value })}
                                        className="admin-input"
                                    />
                                </div>
                                <div className="admin-input-group">
                                    <label className="admin-label">Email Corporativo</label>
                                    <input
                                        required
                                        type="email"
                                        placeholder="nombre@dominio.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="admin-input"
                                    />
                                </div>
                                <div className="admin-input-group">
                                    <label className="admin-label">WhatsApp de Contacto</label>
                                    <input
                                        type="tel"
                                        placeholder="+51 9XX XXX XXX"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="admin-input"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="admin-input-group">
                                    <label className="admin-label">Modelo de Entrega (Delivery Model)</label>
                                    <select
                                        value={formData.delivery_model}
                                        onChange={e => setFormData({ ...formData, delivery_model: e.target.value as DeliveryModel })}
                                        className="admin-input"
                                    >
                                        <option value="ADVISORY">🧠 ADVISORY (Consultoría / Estrategia)</option>
                                        <option value="IMPLEMENTATION">⚙️ IMPLEMENTATION (Desarrollo / Ejecución)</option>
                                        <option value="MANAGED_SERVICES">🛠️ MANAGED SERVICES (Continuidad / Soporte)</option>
                                        <option value="STAFF_AUGMENTATION">👥 STAFF AUGMENTATION (Talento Dedicado)</option>
                                    </select>
                                </div>
                                <div className="admin-input-group">
                                    <label className="admin-label">Capacidad (Capability)</label>
                                    <select
                                        value={formData.capability}
                                        onChange={e => setFormData({ ...formData, capability: e.target.value as Capability })}
                                        className="admin-input"
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

                            <div className="admin-input-group">
                                <label className="admin-label">Necesidad / Dolor Detectado</label>
                                <textarea
                                    rows={3}
                                    placeholder="¿Qué problema estamos resolviendo? ¿Cuál es el interés principal?"
                                    value={formData.project_desc}
                                    onChange={e => setFormData({ ...formData, project_desc: e.target.value })}
                                    className="admin-input admin-textarea"
                                />
                            </div>

                            <div className="bg-[#0511F2]/5 p-6 rounded-[2rem] border border-[#0511F2]/10 flex items-center justify-between group cursor-pointer" onClick={() => setFormData({ ...formData, start_kickoff: !formData.start_kickoff })}>
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-6 border border-[#0511F2]/5">🚀</div>
                                    <div>
                                        <h4 className="text-sm font-black text-[#0511F2] uppercase tracking-widest">Salto Directo a Kick-off</h4>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">El proyecto ya ha sido vendido previamente</p>
                                    </div>
                                </div>
                                <div
                                    className={`w-16 h-9 rounded-full transition-all relative shadow-inner ${formData.start_kickoff ? 'bg-[#6FD904]' : 'bg-gray-200'}`}
                                >
                                    <div className={`absolute top-1 w-7 h-7 bg-white rounded-full transition-all shadow-md ${formData.start_kickoff ? 'left-8' : 'left-1'}`} />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 admin-btn admin-btn-secondary !rounded-[1.5rem]"
                                >
                                    DESCARTAR
                                </button>
                                <button
                                    type="submit"
                                    disabled={createLoading}
                                    className="flex-[2] admin-btn admin-btn-primary shadow-2xl shadow-blue-900/10 !rounded-[1.5rem]"
                                >
                                    {createLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        'GUARDAR EN PIPELINE'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
