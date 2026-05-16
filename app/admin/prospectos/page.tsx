
"use client";

import { useEffect, useState, useMemo } from "react";
import { onLeadsUpdate, updateLead, createLead } from "@/lib/firebase";
import { Lead, LeadStatus } from "@/types/tracking";
import { useTranslation } from "@/components/admin/LanguageContext";
import Link from "next/link";
import { useNotification } from "@/components/admin/NotificationContext";
import PipelineBoard from "@/components/admin/PipelineBoard";

type ViewMode = 'PIPELINE' | 'TABLE';

export default function ProspectosPage() {
    const { t } = useTranslation();
    const { showNotification } = useNotification();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('ALL');
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
        start_kickoff: false
    });

    useEffect(() => {
        const unsubscribe = onLeadsUpdate((data) => {
            setLeads(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            // 1. Verificación de seguridad inicial
            if (!lead) return false;

            // 2. Filtro de estado (Protegemos status_flow)
            const matchesFilter = filter === 'ALL' || lead.status_flow?.current === filter;

            // 3. Búsqueda de texto (Protegemos data y lead_id)
            const searchTermLower = searchTerm.toLowerCase();

            const name = (lead.data?.name || "").toLowerCase();
            const email = (lead.data?.email || "").toLowerCase();
            const phone = (lead.data?.phone || "").toLowerCase();
            const company = (lead.data?.company || "").toLowerCase();
            const id = (lead.lead_id || "").toLowerCase();

            const matchesSearch =
                name.includes(searchTermLower) ||
                email.includes(searchTermLower) ||
                phone.includes(searchTermLower) ||
                company.includes(searchTermLower) ||
                id.includes(searchTermLower);

            return matchesFilter && matchesSearch;
        });
    }, [leads, filter, searchTerm]);

    const getStatusColor = (status: LeadStatus) => {
        switch (status) {
            case 'NEW': return 'bg-[#0511F2]/10 text-[#0511F2] border-[#0511F2]/20';
            case 'QUALIFIED': return 'bg-[#26A3BF]/10 text-[#26A3BF] border-[#26A3BF]/20';
            case 'CONTACTED': return 'bg-[#0511F2]/5 text-[#0511F2]/70 border-[#0511F2]/10';
            case 'DISCOVERY_SCHEDULED': return 'bg-[#EE05F2]/10 text-[#EE05F2] border-[#EE05F2]/20';
            case 'DISCOVERY_COMPLETED': return 'bg-[#EE05F2]/5 text-[#EE05F2]/80 border-[#EE05F2]/10';
            case 'PROPOSAL_PREPARING': return 'bg-[#EAF207]/10 text-[#121212] border-[#EAF207]/30';
            case 'PROPOSAL_SENT': return 'bg-[#26A3BF]/5 text-[#26A3BF]/80 border-[#26A3BF]/10';
            case 'NEGOTIATION': return 'bg-[#EE05F2]/20 text-[#EE05F2] border-[#EE05F2]/30';
            case 'WON': return 'bg-[#6FD904]/10 text-[#6FD904] border-[#6FD904]/20';
            case 'LOST': return 'bg-gray-100 text-gray-500 border-gray-200';
            case 'ON_HOLD': return 'bg-gray-50 text-gray-400 border-gray-100';
            case 'KICK_OFF': return 'bg-[#EE05F2] text-white border-transparent shadow-md shadow-pink-200';
            default: return 'bg-gray-50 text-gray-400 border-gray-100';
        }
    };

    const handleCreateLead = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);
        try {
            const newStatus: LeadStatus = formData.start_kickoff ? 'KICK_OFF' : 'NEW';
            
            const leadToCreate: Partial<Lead> = {
                data: {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    company: formData.company,
                    project_desc: formData.project_desc,
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
            setFormData({ name: '', email: '', phone: '', company: '', project_desc: '', start_kickoff: false });
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
        <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 px-2 relative">
                <div>
                    <div className="admin-decorator-line mb-4"></div>
                    <h1 className="admin-h1 text-4xl mb-2">{t('prospectos')}</h1>
                    <p className="admin-subtitle text-gray-500 font-medium">Gestiona y haz seguimiento a tus leads comerciales</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <button
                        onClick={() => setIsCreating(true)}
                        className="admin-btn admin-btn-primary shadow-xl shadow-pink-200 uppercase"
                    >
                        <span>➕</span>
                        NUEVO PROSPECTO
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

                    <div className="relative group flex-grow lg:flex-grow-0">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm transition-colors group-focus-within:text-[#EE05F2]">🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar prospectos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="admin-input !pl-11 w-full lg:w-72"
                        />
                    </div>

                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="admin-input w-full lg:w-48 cursor-pointer"
                    >
                        <option value="ALL">Todas las etapas</option>
                        <option value="NEW">Nuevos</option>
                        <option value="CONTACTED">Contactados</option>
                        <option value="DISCOVERY_SCHEDULED">Agendado</option>
                        <option value="PROPOSAL_SENT">Propuesta Enviada</option>
                        <option value="WON">Ganados</option>
                        <option value="LOST">Perdidos</option>
                    </select>
                </div>
            </div>

            {/* Leads List / Board Container */}
            {viewMode === 'PIPELINE' ? (
                <PipelineBoard
                    leads={filteredLeads}
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
                                <th>Prospecto</th>
                                <th>Estado</th>
                                <th>Origen & Región</th>
                                <th>Actividad</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLeads.map((lead) => (
                                <tr key={lead.lead_id} className="group">
                                    <td>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-gray-900 group-hover:text-[#0511F2] transition-colors">
                                                    {lead.data?.name || 'Sin Nombre'}
                                                </span>
                                                {lead.data?.decision_maker === 'yes' && (
                                                    <span className="text-[8px] font-black bg-[#6FD904] text-white px-1.5 py-0.5 rounded-md shadow-sm tracking-widest" title="Decision Maker">DM</span>
                                                )}
                                                {lead.data?.investment_level === 'ultra' && (
                                                    <span className="text-[8px] font-black bg-[#EE05F2] text-white px-1.5 py-0.5 rounded-md shadow-sm tracking-widest" title="High Investment">VIP</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[11px] text-gray-500 font-bold tracking-tight truncate max-w-[200px]">
                                                    {lead.data?.email || lead.data?.phone || 'Sin contacto'}
                                                </span>
                                                {lead.data?.role && (
                                                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em]">• {lead.data.role}</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`admin-badge ${getStatusColor(lead.status_flow.current)}`}>
                                            {lead.status_flow.current.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-gray-50 text-gray-500 self-start mb-1 tracking-widest border border-gray-100">
                                                {lead.data?.origin === 'admin_panel' ? '🛠️ ADMIN' : '🌐 WEB'}
                                            </span>
                                            <span className="text-[11px] font-bold text-gray-600">{lead.source_attribution.landing_page?.split('_')[0] || 'Directo'}</span>
                                            <span className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] mt-0.5">
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
                                                {new Date(lead.audit_logs?.created_at?.toDate?.() ||
                                                    (lead.audit_logs?.created_at ? new Date(lead.audit_logs?.created_at) : new Date())).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="text-right">
                                        <Link
                                            href={`/admin/prospectos/${lead.lead_id}`}
                                            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gray-50 text-gray-400 hover:bg-[#0511F2] hover:text-white transition-all border border-gray-100 shadow-sm hover:shadow-lg hover:shadow-blue-200"
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
                            <h3 className="text-xl font-black text-[#0511F2] font-heading uppercase tracking-tight">No se encontraron prospectos</h3>
                            <p className="text-gray-400 text-sm font-medium mt-2">Intenta con otros filtros o términos de búsqueda</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create Prospect Modal */}
            {isCreating && (
                <div className="admin-modal-overlay animate-in fade-in duration-300">
                    <div className="admin-modal animate-in zoom-in-95 duration-300 !p-8 relative overflow-hidden">
                        <div className="diagonal-accent !opacity-10"></div>
                        <div className="flex justify-between items-start mb-8 relative z-10">
                            <div>
                                <div className="admin-decorator-line mb-3 w-12"></div>
                                <h2 className="text-2xl font-black text-[#0511F2] tracking-tighter uppercase font-heading">Crear Nuevo Prospecto</h2>
                                <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.2em] mt-2">Ingresa los datos del lead manualmente</p>
                            </div>
                            <button 
                                onClick={() => setIsCreating(false)} 
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-[#EE05F2] hover:bg-pink-50 transition-all border border-transparent hover:border-pink-100"
                            >
                                <span className="text-xl">✕</span>
                            </button>
                        </div>

                        <form onSubmit={handleCreateLead} className="space-y-6 relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                                        placeholder="Nombre de la compañía"
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
                                        placeholder="nombre@empresa.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="admin-input"
                                    />
                                </div>
                                <div className="admin-input-group">
                                    <label className="admin-label">Teléfono / WhatsApp</label>
                                    <input
                                        type="tel"
                                        placeholder="+51 999 000 000"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="admin-input"
                                    />
                                </div>
                            </div>

                            <div className="admin-input-group">
                                <label className="admin-label">Detalles del Proyecto</label>
                                <textarea
                                    rows={4}
                                    placeholder="Describe brevemente el interés o necesidad del cliente..."
                                    value={formData.project_desc}
                                    onChange={e => setFormData({ ...formData, project_desc: e.target.value })}
                                    className="admin-input admin-textarea"
                                />
                            </div>

                            <div className="bg-[#0511F2]/5 p-5 rounded-[1.5rem] border border-[#0511F2]/10 flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-12 border border-[#0511F2]/5">🚀</div>
                                    <div>
                                        <h4 className="text-sm font-black text-[#0511F2] uppercase tracking-widest">Iniciar en Kick-off</h4>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">Saltar etapas de prospección</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, start_kickoff: !formData.start_kickoff })}
                                    className={`w-14 h-8 rounded-full transition-all relative shadow-inner ${formData.start_kickoff ? 'bg-[#6FD904]' : 'bg-gray-200'}`}
                                >
                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${formData.start_kickoff ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 admin-btn admin-btn-secondary"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="submit"
                                    disabled={createLoading}
                                    className="flex-[2] admin-btn admin-btn-primary shadow-xl shadow-pink-200"
                                >
                                    {createLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        'CREAR PROSPECTO'
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
