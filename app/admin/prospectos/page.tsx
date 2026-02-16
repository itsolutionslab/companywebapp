
"use client";

import { useEffect, useState, useMemo } from "react";
import { onLeadsUpdate, updateLead } from "@/lib/firebase";
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
            case 'NEW': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'QUALIFIED': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
            case 'CONTACTED': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'DISCOVERY_SCHEDULED': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'DISCOVERY_COMPLETED': return 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200';
            case 'PROPOSAL_PREPARING': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'PROPOSAL_SENT': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'NEGOTIATION': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'WON': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'LOST': return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'ON_HOLD': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-gray-50 text-gray-500 border-gray-100';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
                <div>
                    <h1 className="text-3xl font-bold text-black tracking-tight mb-1">{t('prospectos')}</h1>
                    <p className="text-[#8E8E93] text-sm font-medium leading-tight">Gestiona y haz seguimiento a tus leads comerciales</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    {/* View Toggle */}
                    <div className="bg-gray-100 p-1 rounded-xl flex self-start sm:self-auto">
                        <button
                            onClick={() => setViewMode('PIPELINE')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${viewMode === 'PIPELINE' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            PIPELINE
                        </button>
                        <button
                            onClick={() => setViewMode('TABLE')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${viewMode === 'TABLE' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            TABLA
                        </button>
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar por nombre, email o ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64 bg-white border border-gray-200 rounded-xl px-10 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    </div>

                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none shadow-sm cursor-pointer font-medium"
                    >
                        <option value="ALL">Etapa: Todas</option>
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
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Prospecto</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Estado</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Origen</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Actividad</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredLeads.map((lead) => (
                                    <tr key={lead.lead_id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                        {lead.data?.name || 'Sin Nombre'}
                                                    </span>
                                                    {lead.data?.decision_maker === 'yes' && (
                                                        <span className="text-[9px] font-black bg-lime-500 text-white px-1.5 py-0.5 rounded shadow-sm" title="Decision Maker">DM</span>
                                                    )}
                                                    {lead.data?.investment_level === 'ultra' && (
                                                        <span className="text-[9px] font-black bg-cyan-500 text-white px-1.5 py-0.5 rounded shadow-sm" title="High Investment">★</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-gray-500 font-medium truncate max-w-[150px]">
                                                        {lead.data?.email || lead.data?.phone || 'Sin contacto'}
                                                    </span>
                                                    {lead.data?.role && (
                                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">• {lead.data.role}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider ${getStatusColor(lead.status_flow.current)}`}>
                                                {lead.status_flow.current}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-gray-900">{lead.source_attribution.landing_page?.split('_')[0] || 'Desconocido'}</span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                                    {lead.data?.region || 'Global'} / {lead.source_attribution.utm_source || 'Directo'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-gray-600">
                                                    {lead.kpis?.clicks_count || 0} clics • {Math.round((lead.kpis?.session_duration || 0) / 60)}m
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-medium">
                                                    {new Date(lead.audit_logs?.created_at?.toDate?.() ||
                                                        (lead.audit_logs?.created_at ? new Date(lead.audit_logs?.created_at) : new Date())).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <Link
                                                href={`/admin/prospectos/${lead.lead_id}`}
                                                className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all border border-gray-100"
                                            >
                                                👁️
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredLeads.length === 0 && (
                        <div className="py-20 text-center">
                            <div className="text-4xl mb-4">🏜️</div>
                            <p className="text-gray-400 font-medium">No se encontraron prospectos con estos filtros</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
