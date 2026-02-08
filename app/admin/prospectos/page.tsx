
"use client";

import { useEffect, useState, useMemo } from "react";
import { getLeads, updateLead } from "@/lib/firebase";
import { Lead, LeadStatus } from "@/types/tracking";
import { useTranslation } from "@/components/admin/LanguageContext";
import Link from "next/link";
import { useNotification } from "@/components/admin/NotificationContext";

export default function ProspectosPage() {
    const { t } = useTranslation();
    const { showNotification } = useNotification();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchLeads();
    }, []);

    async function fetchLeads() {
        setLoading(true);
        try {
            const data = await getLeads();
            setLeads(data);
        } catch (error) {
            console.error("Error fetching leads:", error);
            showNotification("Error loading leads", "error");
        } finally {
            setLoading(false);
        }
    }

    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            const matchesFilter = filter === 'ALL' || lead.status_flow.current === filter;
            const searchTermLower = searchTerm.toLowerCase();
            const matchesSearch =
                lead.data.name?.toLowerCase().includes(searchTermLower) ||
                lead.data.email?.toLowerCase().includes(searchTermLower) ||
                lead.data.phone?.toLowerCase().includes(searchTermLower) ||
                lead.lead_id.toLowerCase().includes(searchTermLower);
            return matchesFilter && matchesSearch;
        });
    }, [leads, filter, searchTerm]);

    const getStatusColor = (status: LeadStatus) => {
        switch (status) {
            case 'LEAD_NEW': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'CONTACTED': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'PROJ_FINISHED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'CLOSED_LOST': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
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
                        <option value="ALL">Todos los Estados</option>
                        <option value="LEAD_NEW">Nuevos</option>
                        <option value="CONTACTED">Contactados</option>
                        <option value="PROJ_FINISHED">Completados</option>
                        <option value="CLOSED_LOST">Perdidos</option>
                    </select>
                </div>
            </div>

            {/* Leads List */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
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
                                            <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                {lead.data.name || 'Sin Nombre'}
                                            </span>
                                            <span className="text-xs text-gray-500 font-medium">{lead.data.email || lead.data.phone || 'Sin contacto'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider ${getStatusColor(lead.status_flow.current)}`}>
                                            {lead.status_flow.current.replace('LEAD_', '')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-700">{lead.source_attribution.landing_page?.split('_')[0] || 'Desconocido'}</span>
                                            <span className="text-[10px] text-gray-400 font-medium">
                                                {lead.source_attribution.utm_source || 'Directo'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-600">
                                                {lead.kpis.clicks_count} clics • {Math.round(lead.kpis.session_duration / 60)}m
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-medium">
                                                {new Date(lead.audit_logs.created_at?.toDate?.() || lead.audit_logs.created_at).toLocaleDateString()}
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
        </div>
    );
}
