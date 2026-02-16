
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getLeadById, updateLead, onAvailabilityUpdate, getBusinessSettings } from "@/lib/firebase";
import { Lead, LeadStatus } from "@/types/tracking";
import { useTranslation } from "@/components/admin/LanguageContext";
import { useNotification } from "@/components/admin/NotificationContext";
import { getTimeSlotsForDate } from "@/lib/timeSlots";
import ScheduleModal from "@/components/admin/ScheduleModal";

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

    useEffect(() => {
        if (id) fetchLead();
    }, [id]);

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

    const statusSequence: { key: LeadStatus; label: string; color: string }[] = [
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

    const currentIdx = statusSequence.findIndex(s => s.key === lead?.status_flow.current);

    const getLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleSaveSchedule = async (date: string, time: string) => {
        if (!lead) return;
        setIsSavingSchedule(true);
        try {
            // 1. Create the booking document in Discovery Meets (bookings)
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

            // 1.5 Add meeting event
            const { addLeadEvent } = await import("@/lib/firebase");
            await addLeadEvent(lead.lead_id, {
                type: 'MEETING_SCHEDULED',
                description: `Cita de descubrimiento agendada para el ${date} a las ${time}`,
                timestamp: new Date(),
                metadata: { date, time }
            });

            // 2. Update Lead status to DISCOVERY_SCHEDULED
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
            // Refresh local state (auto-re-fetch would be cleaner but this is faster for UX)
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
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!lead) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-500">No se encontró el prospecto.</p>
                <button onClick={() => router.push('/admin/prospectos')} className="mt-4 text-blue-500 font-bold">Volver</button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700 pb-12">
            {/* Header & Progress Tracker */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/admin/prospectos')}
                            className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-all shadow-sm"
                        >
                            ←
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">{lead.data?.name || 'Prospecto Sin Nombre'}</h1>
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-0.5">ID: {lead.lead_id}</p>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-3">
                        <div className="text-right">
                            <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor Estimado</span>
                            <span className="block text-lg font-black text-emerald-600">${lead.value_estimate?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 text-xl">
                            💰
                        </div>
                    </div>
                </div>

                {/* Horizontal Progress Bar */}
                <div className="bg-white rounded-3xl border border-gray-100 p-4 shadow-sm overflow-x-auto no-scrollbar">
                    <div className="flex items-center justify-between min-w-[800px] px-4 h-12 relative">
                        {/* Connecting Line */}
                        <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-0.5 bg-gray-100 z-0"></div>
                        <div
                            className="absolute left-10 top-1/2 -translate-y-1/2 h-0.5 bg-blue-500 transition-all duration-1000 z-0"
                            style={{ width: `${(currentIdx / (statusSequence.length - 1)) * 100}%` }}
                        ></div>

                        {statusSequence.map((stage, idx) => {
                            const isCompleted = idx <= currentIdx;
                            const isCurrent = idx === currentIdx;
                            return (
                                <div key={stage.key} className="relative z-10 flex flex-col items-center gap-2 group">
                                    <div className={`
                                        w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all duration-500
                                        ${isCurrent
                                            ? 'bg-blue-600 border-blue-100 scale-125 shadow-xl shadow-blue-200'
                                            : isCompleted
                                                ? 'bg-blue-500 border-white'
                                                : 'bg-white border-gray-100 group-hover:border-blue-200'
                                        }
                                    `}>
                                        {isCompleted && !isCurrent ? (
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <div className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-white' : 'bg-gray-200'}`}></div>
                                        )}
                                    </div>
                                    <span className={`
                                        absolute top-10 whitespace-nowrap text-[9px] font-black uppercase tracking-tighter transition-all duration-300
                                        ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-gray-900' : 'text-gray-300'}
                                    `}>
                                        {stage.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Info Card */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Contact Stats */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <section className="space-y-4">
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                <span className="w-1 h-3 bg-blue-500 rounded-full"></span>
                                Datos de Contacto
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Email</label>
                                    <p className="font-bold text-gray-900">{lead.data?.email || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Teléfono</label>
                                    <p className="font-bold text-gray-900">{lead.data?.phone || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Empresa</label>
                                    <p className="font-bold text-gray-900">{lead.data?.company || 'N/A'}</p>
                                </div>
                                {lead.data?.website && (
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Website</label>
                                        <p className="font-bold text-blue-600 truncate">
                                            <a href={lead.data.website.startsWith('http') ? lead.data.website : `https://${lead.data.website}`} target="_blank" rel="noopener noreferrer">
                                                {lead.data.website}
                                            </a>
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Rol / Cargo</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[9px] font-black uppercase border border-gray-200">
                                            {lead.data?.role || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                                {lead.data?.objectives && lead.data.objectives.length > 0 && (
                                    <div className="pt-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Objetivos Estratégicos</label>
                                        <div className="flex flex-wrap gap-1">
                                            {lead.data.objectives.map((obj: string, idx: number) => (
                                                <span key={idx} className="px-2 py-0.5 bg-cyan-50 text-cyan-600 rounded-md text-[9px] font-black border border-cyan-100 uppercase">
                                                    {obj.replace(/-/g, ' ')}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {lead.data?.service_interests && lead.data.service_interests.length > 0 && (
                                    <div className="pt-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Servicios (Legacy)</label>
                                        <div className="flex flex-wrap gap-1">
                                            {lead.data.service_interests.map((s: string, idx: number) => (
                                                <span key={idx} className="px-2 py-0.5 bg-gray-50 text-gray-400 rounded-md text-[9px] font-black border border-gray-100 uppercase italic">
                                                    {s.replace(/-/g, ' ')}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                <span className="w-1 h-3 bg-indigo-500 rounded-full"></span>
                                Fuente / Origen
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Landing Page</label>
                                    {/* Protegemos source_attribution */}
                                    <p className="font-bold text-gray-900">{lead?.source_attribution?.landing_page || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Fuente (UTM)</label>
                                    {/* Protegemos source_attribution */}
                                    <p className="font-bold text-gray-900">{lead?.source_attribution?.utm_source || 'Directo'}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Fecha Registro</label>
                                    <p className="font-bold text-gray-900">
                                        {lead?.audit_logs?.created_at
                                            ? new Date(lead.audit_logs.created_at?.toDate?.() || lead.audit_logs.created_at).toLocaleString()
                                            : 'Fecha no disponible'
                                        }
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Strategic Insights */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Etapa Actual</label>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-lime-50 text-lime-700 rounded-xl border border-lime-100 text-xs font-black uppercase">
                                <span className="w-2 h-2 rounded-full bg-lime-500 animate-pulse"></span>
                                {lead.data?.stage || 'No definida'}
                            </div>
                        </div>
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Urgencia / Timeline</label>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-50 text-cyan-700 rounded-xl border border-cyan-100 text-xs font-black uppercase">
                                📅 {lead.data?.timeline || 'No definida'}
                            </div>
                        </div>
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Inversión Estimada</label>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-xs font-black uppercase">
                                💰 {lead.data?.investment_level || 'No definida'}
                            </div>
                        </div>
                    </div>

                    {/* Impact & Project Description */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 space-y-8">
                        <section>
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                <span className="w-1 h-3 bg-emerald-500 rounded-full"></span>
                                Resultados de Negocio Esperados (Impacto)
                            </h3>
                            <p className="text-gray-900 font-bold leading-relaxed bg-emerald-50/30 rounded-2xl p-6 border border-emerald-50">
                                {lead.data?.impact || 'No se especificó el impacto esperado.'}
                            </p>
                        </section>

                        <section>
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                <span className="w-1 h-3 bg-blue-500 rounded-full"></span>
                                Toma de Decisión
                            </h3>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-xs font-bold text-gray-700 uppercase tracking-tight">
                                    ¿Es el tomador de decisión final?: <span className="text-blue-600 ml-2">{lead.data?.decision_maker || 'N/A'}</span>
                                </p>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                <span className="w-1 h-3 bg-gray-300 rounded-full"></span>
                                Notas del Proyecto / Descripción Original
                            </h3>
                            <p className="text-gray-600 font-medium leading-relaxed whitespace-pre-wrap">
                                {lead.data?.project_desc || 'No se proporcionó descripción detallada.'}
                            </p>
                        </section>
                    </div>

                    {/* Documentos Adjuntos */}
                    {lead.data?.file_url && (
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                                <span className="w-1 h-3 bg-rose-500 rounded-full"></span>
                                Documentos Adjuntos
                            </h3>
                            <a
                                href={lead.data.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/10 transition-all group"
                            >
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-rose-500 shadow-sm transition-all group-hover:scale-110">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Documento de Proyecto</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Haga clic para ver o descargar</p>
                                </div>
                                <div className="ml-auto text-gray-300 group-hover:text-blue-500 transition-all">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </div>
                            </a>
                        </div>
                    )}

                    {/* Technical KPIs / Activity */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                            <span className="w-1 h-3 bg-amber-500 rounded-full"></span>
                            Actividad de Usuario
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
                            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                                <span className="block text-xl mb-1">🖱️</span>
                                <span className="block text-lg font-black text-orange-600">{lead.kpis?.clicks_count || 0}</span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-orange-400">Clics</span>
                            </div>
                            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                <span className="block text-xl mb-1">⏱️</span>
                                <span className="block text-lg font-black text-indigo-600">{Math.round((lead.kpis?.session_duration || 0) / 60)}m</span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Duración</span>
                            </div>
                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <span className="block text-xl mb-1">🌍</span>
                                <span className="block text-md font-black text-emerald-600 truncate px-1">
                                    {lead.audit_logs?.geo_location?.city || 'Local'}
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Ubicación</span>
                            </div>
                            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 opacity-50">
                                <span className="block text-xl mb-1">📄</span>
                                <span className="block text-lg font-black text-rose-600">
                                    {lead.data?.file_url ? 'SÍ' : 'NO'}
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-rose-400">Archivo</span>
                            </div>
                        </div>
                    </div>

                    {/* Timeline Feed (Top Priority) */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                <span className="w-1 h-3 bg-blue-500 rounded-full"></span>
                                Línea de Tiempo
                            </h3>
                        </div>

                        {/* Add Note Input Area */}
                        <div className="mb-10 bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                            <textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="Escribe una actualización o nota interna..."
                                className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/10 outline-none transition-all resize-none min-h-[80px]"
                            />
                            <div className="flex justify-end mt-2">
                                <button
                                    onClick={handleAddNote}
                                    disabled={!noteText.trim() || isAddingNote}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all"
                                >
                                    {isAddingNote ? 'Guardando...' : 'Postear Nota'}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-8 relative ml-4">
                            {/* Vertical Line */}
                            <div className="absolute top-0 bottom-0 left-0 w-px bg-gray-100 -ml-4 z-0"></div>

                            {/* Merge old history and new events if both exist for safety */}
                            {(lead?.events && (lead.events as any[]).length > 0) ? (
                                (lead.events as any[]).slice().reverse().map((event: any, idx) => (
                                    <div key={event.id || idx} className="relative z-10 flex items-start gap-6 group">
                                        <div className={`
                                            w-10 h-10 rounded-2xl bg-white border flex items-center justify-center shadow-sm transition-all duration-300
                                            ${event.type === 'STATUS_CHANGED' ? 'border-blue-100 text-blue-500 bg-blue-50/20' :
                                                event.type === 'MEETING_SCHEDULED' ? 'border-purple-100 text-purple-500 bg-purple-50/20' :
                                                    event.type === 'NOTE_ADDED' ? 'border-amber-100 text-amber-500 bg-amber-50/20' :
                                                        'border-gray-100 text-gray-300'}
                                        `}>
                                            <span className="text-xl">
                                                {event.type === 'STATUS_CHANGED' ? '🚀' :
                                                    event.type === 'MEETING_SCHEDULED' ? '🗓️' :
                                                        event.type === 'MEETING_COMPLETED' ? '✅' :
                                                            event.type === 'PROPOSAL_SENT' ? '📧' :
                                                                event.type === 'NOTE_ADDED' ? '📝' : '●'}
                                            </span>
                                        </div>
                                        <div className="flex-1 pb-8 border-b border-gray-50 last:border-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                                                    {event.type.replace(/_/g, ' ')}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-300">
                                                    {new Date(event.timestamp?.toDate?.() || event.timestamp).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-sm font-bold text-gray-700 leading-relaxed">
                                                {event.description}
                                            </p>
                                            {event.metadata?.new_status && (
                                                <div className="mt-2 flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${statusSequence.find(s => s.key === event.metadata?.new_status)?.color || 'bg-gray-400'}`}></div>
                                                    <span className="text-[11px] font-black text-gray-500 uppercase">{statusSequence.find(s => s.key === event.metadata?.new_status)?.label}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                // Fallback to old history for legacy data not yet migrated
                                (lead.status_flow?.history || []).slice().reverse().map((item, idx) => (
                                    <div key={idx} className="relative z-10 flex items-start gap-6 group">
                                        <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm text-gray-300">
                                            <div className="w-2 h-2 rounded-full bg-current"></div>
                                        </div>
                                        <div className="flex-1 pb-6 border-b border-gray-50 last:border-0">
                                            <p className="text-sm font-bold text-gray-700">{item.notes}</p>
                                            <span className="text-[10px] font-bold text-gray-300 uppercase mt-1 block">{new Date(item.timestamp).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Status & Sidebar */}
                <div className="space-y-8">
                    {/* Quick Actions Card */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                            <span className="w-1 h-3 bg-amber-500 rounded-full"></span>
                            Acciones Rápidas
                        </h3>
                        <div className="space-y-3">
                            <button
                                onClick={() => setShowScheduleModal(true)}
                                className="w-full py-3.5 bg-blue-50 text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                            >
                                🗓️ Agendar Discovery
                            </button>
                            <button
                                className="w-full py-3.5 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                                onClick={() => {/* Future logic */ }}
                            >
                                📧 Enviar Propuesta
                            </button>
                            <button
                                onClick={() => {
                                    setNewValue(lead.value_estimate?.toString() || '0');
                                    setIsUpdatingValue(!isUpdatingValue);
                                }}
                                className="w-full py-3.5 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
                            >
                                💰 {isUpdatingValue ? 'Cerrar' : 'Actualizar Valor'}
                            </button>

                            {isUpdatingValue && (
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 animate-in fade-in duration-300">
                                    <input
                                        type="number"
                                        value={newValue}
                                        onChange={(e) => setNewValue(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/10 outline-none"
                                        placeholder="Valor USD"
                                    />
                                    <button
                                        onClick={handleUpdateValue}
                                        className="w-full mt-2 bg-emerald-500 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                                    >
                                        Guardar Valor
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status Update Card */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-gray-100 shadow-xl p-8 sticky top-8">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                            <span className="w-1 h-3 bg-rose-500 rounded-full"></span>
                            Pipeline Stage
                        </h3>

                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center mb-6">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Estado Actual</span>
                                <div className="flex items-center justify-center gap-2">
                                    <div className={`w-2.4 h-2.4 rounded-full ${statusSequence[currentIdx]?.color || 'bg-gray-400'}`}></div>
                                    <span className="text-xl font-black text-gray-900 uppercase">{lead.status_flow.current.replace(/_/g, ' ')}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                                {(['NEW', 'QUALIFIED', 'CONTACTED', 'DISCOVERY_SCHEDULED', 'DISCOVERY_COMPLETED', 'PROPOSAL_PREPARING', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST', 'ON_HOLD'] as LeadStatus[]).map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => handleStatusUpdate(status)}
                                        disabled={lead.status_flow.current === status || isUpdating}
                                        className={`w-full py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border ${lead.status_flow.current === status
                                            ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-100'
                                            : 'bg-white text-gray-400 border-gray-100 hover:border-blue-200 hover:text-blue-600'
                                            }`}
                                    >
                                        {statusSequence.find(s => s.key === status)?.label || status.replace(/_/g, ' ')}
                                    </button>
                                ))}
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
