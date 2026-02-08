
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getLeadById, updateLead, onAvailabilityUpdate, getBusinessSettings } from "@/lib/firebase";
import { Lead, LeadStatus } from "@/types/tracking";
import { useTranslation } from "@/components/admin/LanguageContext";
import { useNotification } from "@/components/admin/NotificationContext";
import { getTimeSlotsForDate } from "@/lib/timeSlots";

export default function LeadDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { t } = useTranslation();
    const { showNotification } = useNotification();
    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);

    // Scheduling State
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [timeSlots, setTimeSlots] = useState<string[]>([]);
    const [disabledSlots, setDisabledSlots] = useState<string[]>([]);
    const [weeklySchedule, setWeeklySchedule] = useState<any>(null);
    const [viewDate, setViewDate] = useState(new Date());
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);

    useEffect(() => {
        if (id) fetchLead();

        getBusinessSettings().then(settings => {
            if (settings?.schedules) {
                setWeeklySchedule(settings.schedules);
            }
        });

        const unsubscribe = onAvailabilityUpdate((disabled: string[]) => {
            setDisabledSlots(disabled);
        });

        return () => unsubscribe();
    }, [id]);

    useEffect(() => {
        if (selectedDate && weeklySchedule) {
            const slots = getTimeSlotsForDate(selectedDate, weeklySchedule, 60); // Default to 60 min intervals for consultancy
            setTimeSlots(slots);
        }
    }, [selectedDate, weeklySchedule]);

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
        { key: 'LEAD_NEW', label: t('status_new') || 'Nuevo', color: 'bg-blue-500' },
        { key: 'CONTACTED', label: t('status_contacted') || 'Contactado', color: 'bg-indigo-500' },
        { key: 'SCHEDULED', label: t('status_scheduled') || 'Agendado', color: 'bg-purple-500' },
        { key: 'IN_PROPOSAL', label: t('status_proposal') || 'En Propuesta', color: 'bg-amber-500' },
        { key: 'PROJ_APPROVED', label: t('status_approved') || 'Aprobado', color: 'bg-emerald-500' },
        { key: 'DOWN_PAYMENT', label: t('status_downpayment') || 'Pago Inicial', color: 'bg-teal-500' },
        { key: 'PROJ_STARTED', label: t('status_started') || 'Iniciado', color: 'bg-cyan-500' },
        { key: 'IN_TESTING', label: t('status_testing') || 'En Pruebas', color: 'bg-orange-500' },
        { key: 'PROJ_FINISHED', label: t('status_finished') || 'Terminado', color: 'bg-green-500' },
        { key: 'DELIVERED', label: t('status_delivered') || 'Entregado', color: 'bg-sky-500' },
        { key: 'CLOSED', label: t('status_closed') || 'Cerrado', color: 'bg-gray-700' },
    ];

    const currentIdx = statusSequence.findIndex(s => s.key === lead?.status_flow.current);

    const getLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleSaveSchedule = async () => {
        if (!lead || !selectedDate || !selectedTime) return;
        setIsSavingSchedule(true);
        try {
            await handleStatusUpdate('SCHEDULED');
            // Here we would also create a specific booking record if needed
            // But for now, we'll log it in the status update history
            setShowScheduleModal(false);
            showNotification("Cita agendada correctamente", "success");
        } catch (error) {
            showNotification("Error al agendar cita", "error");
        } finally {
            setIsSavingSchedule(false);
        }
    };

    const handleStatusUpdate = async (newStatus: LeadStatus) => {
        if (!lead || isUpdating) return;
        setIsUpdating(true);
        try {
            const newHistory = [
                ...lead.status_flow.history,
                { status: newStatus, timestamp: new Date().toISOString(), notes: `Estado actualizado a ${newStatus}` }
            ];
            await updateLead(lead.lead_id, {
                status_flow: {
                    current: newStatus,
                    history: newHistory
                }
            });
            setLead({
                ...lead,
                status_flow: {
                    current: newStatus,
                    history: newHistory
                }
            });
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
            {/* Header / Breadcrumb */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.push('/admin/prospectos')}
                    className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-all shadow-sm"
                >
                    ←
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-black tracking-tight">{lead.data.name || 'Sin Nombre'}</h1>
                    <p className="text-[#8E8E93] text-xs font-bold uppercase tracking-widest mt-0.5">ID: {lead.lead_id}</p>
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
                                    <p className="font-bold text-gray-900">{lead.data.email || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Teléfono</label>
                                    <p className="font-bold text-gray-900">{lead.data.phone || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Empresa</label>
                                    <p className="font-bold text-gray-900">{lead.data.company || 'N/A'}</p>
                                </div>
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
                                    <p className="font-bold text-gray-900">{lead.source_attribution.landing_page || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Fuente (UTM)</label>
                                    <p className="font-bold text-gray-900">{lead.source_attribution.utm_source || 'Directo'}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Fecha Registro</label>
                                    <p className="font-bold text-gray-900">
                                        {new Date(lead.audit_logs.created_at?.toDate?.() || lead.audit_logs.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Project Description */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                            <span className="w-1 h-3 bg-emerald-500 rounded-full"></span>
                            Descripción del Proyecto
                        </h3>
                        <p className="text-gray-700 font-medium leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-2xl p-6">
                            {lead.data.project_desc || 'No se proporcionó descripción.'}
                        </p>
                    </div>

                    {/* Documentos Adjuntos */}
                    {lead.data.file_url && (
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
                                <span className="block text-lg font-black text-orange-600">{lead.kpis.clicks_count}</span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-orange-400">Clics</span>
                            </div>
                            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                <span className="block text-xl mb-1">⏱️</span>
                                <span className="block text-lg font-black text-indigo-600">{Math.round(lead.kpis.session_duration / 60)}m</span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Duración</span>
                            </div>
                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <span className="block text-xl mb-1">🌍</span>
                                <span className="block text-md font-black text-emerald-600 truncate px-1">
                                    {lead.audit_logs.geo_location?.city || 'Local'}
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Ubicación</span>
                            </div>
                            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 opacity-50">
                                <span className="block text-xl mb-1">📄</span>
                                <span className="block text-lg font-black text-rose-600">
                                    {lead.data.file_url ? 'SÍ' : 'NO'}
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-rose-400">Archivo</span>
                            </div>
                        </div>
                    </div>

                    {/* Historial de Actividad / Traceability Log */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-8 flex items-center gap-2">
                            <span className="w-1 h-3 bg-indigo-500 rounded-full"></span>
                            Historial de Actividad
                        </h3>
                        <div className="space-y-6 relative ml-4">
                            {/* Vertical Line */}
                            <div className="absolute top-0 bottom-0 left-0 w-px bg-gray-100 -ml-4 z-0"></div>

                            {lead.status_flow.history.slice().reverse().map((item, idx) => (
                                <div key={idx} className="relative z-10 flex items-start gap-6 group">
                                    <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm text-gray-300 group-hover:text-blue-500 group-hover:border-blue-100 transition-all">
                                        <div className="w-2 h-2 rounded-full bg-current"></div>
                                    </div>
                                    <div className="flex-1 pb-6 border-b border-gray-50 last:border-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                {statusSequence.find(s => s.key === item.status)?.label || item.status}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-400">
                                                {new Date(item.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-gray-600">
                                            {item.notes || 'Sin observaciones adicionales.'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Status & Sidebar */}
                <div className="space-y-8">
                    {/* Status Update Card */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-gray-100 shadow-xl p-8 sticky top-8">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                            <span className="w-1 h-3 bg-rose-500 rounded-full"></span>
                            Estado Comercial
                        </h3>

                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center mb-6">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Estado Actual</span>
                                <span className="text-xl font-black text-gray-900 uppercase">{lead.status_flow.current.replace('LEAD_', '')}</span>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                <button
                                    onClick={() => setShowScheduleModal(true)}
                                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-4"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Agendar Cita
                                </button>

                                <div className="h-px bg-gray-50 my-2"></div>

                                {(['LEAD_NEW', 'CONTACTED', 'IN_PROPOSAL', 'PROJ_APPROVED', 'CLOSED', 'CLOSED_LOST'] as LeadStatus[]).map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => handleStatusUpdate(status)}
                                        disabled={lead.status_flow.current === status || isUpdating}
                                        className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border ${lead.status_flow.current === status
                                            ? 'bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-100'
                                            : 'bg-white text-gray-500 border-gray-100 hover:border-blue-200 hover:text-blue-600'
                                            }`}
                                    >
                                        {statusSequence.find(s => s.key === status)?.label || status.replace('LEAD_', '').replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Audit Info Mini */}
                        <div className="mt-8 pt-8 border-t border-gray-50 space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-gray-400">IP</span>
                                <span className="text-gray-900">{lead.audit_logs.ip}</span>
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
            {showScheduleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in duration-300">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Agendar Sesión</h2>
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1">Prospecto: {lead.data.name}</p>
                            </div>
                            <button onClick={() => setShowScheduleModal(false)} className="w-12 h-12 bg-white rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm">✕</button>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                            {/* Calendar Section */}
                            <div className="w-full lg:w-3/5 p-8 border-r border-gray-50 overflow-y-auto">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Seleccionar Fecha</h3>
                                    <div className="flex gap-2">
                                        <button onClick={() => {
                                            const d = new Date(viewDate);
                                            d.setMonth(d.getMonth() - 1);
                                            setViewDate(d);
                                        }} className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-all">←</button>
                                        <span className="text-xs font-black uppercase tracking-widest min-w-[120px] text-center flex items-center justify-center">
                                            {viewDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                                        </span>
                                        <button onClick={() => {
                                            const d = new Date(viewDate);
                                            d.setMonth(d.getMonth() + 1);
                                            setViewDate(d);
                                        }} className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-all">→</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-7 gap-2 text-center mb-2">
                                    {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map(d => (
                                        <span key={d} className="text-[10px] font-black text-gray-300 uppercase">{d}</span>
                                    ))}
                                </div>

                                <div className="grid grid-cols-7 gap-2">
                                    {(() => {
                                        const year = viewDate.getFullYear();
                                        const month = viewDate.getMonth();
                                        const firstDay = new Date(year, month, 1).getDay();
                                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                                        const days = [];

                                        for (let i = 0; i < firstDay; i++) {
                                            days.push(<div key={`empty-${i}`} className="h-14"></div>);
                                        }

                                        for (let d = 1; d <= daysInMonth; d++) {
                                            const date = new Date(year, month, d);
                                            const dateStr = getLocalDateString(date);
                                            const isSelected = selectedDate === dateStr;
                                            const isToday = dateStr === getLocalDateString(new Date());

                                            days.push(
                                                <button
                                                    key={d}
                                                    onClick={() => {
                                                        setSelectedDate(dateStr);
                                                        setSelectedTime(null);
                                                    }}
                                                    className={`h-14 rounded-2xl border transition-all flex flex-col items-center justify-center group ${isSelected
                                                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-100 scale-105'
                                                        : 'bg-white border-gray-100 hover:border-blue-200 text-gray-700'
                                                        }`}
                                                >
                                                    <span className={`text-xs font-black ${isSelected ? 'text-blue-100' : 'text-gray-300 group-hover:text-blue-400'}`}>{d}</span>
                                                    {isToday && <div className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-blue-500'}`}></div>}
                                                </button>
                                            );
                                        }
                                        return days;
                                    })()}
                                </div>
                            </div>

                            {/* Slots Section */}
                            <div className="w-full lg:w-2/5 p-8 bg-gray-50/30 overflow-y-auto">
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Horarios Disponibles</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {timeSlots.length > 0 ? (
                                        timeSlots.map(time => {
                                            const isOccupied = disabledSlots.includes(`${selectedDate}_${time}`);
                                            const isSelected = selectedTime === time;
                                            return (
                                                <button
                                                    key={time}
                                                    disabled={isOccupied}
                                                    onClick={() => setSelectedTime(time)}
                                                    className={`py-3 px-4 rounded-xl border text-xs font-black transition-all ${isOccupied
                                                        ? 'bg-gray-100 border-gray-100 text-gray-300 cursor-not-allowed opacity-50'
                                                        : isSelected
                                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-100'
                                                            : 'bg-white border-gray-100 text-gray-600 hover:border-indigo-200 hover:text-indigo-600'
                                                        }`}
                                                >
                                                    {time}
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-2 py-20 text-center">
                                            <span className="text-4xl block mb-4">💤</span>
                                            <p className="text-gray-400 font-bold italic text-sm">No hay horarios disponibles para este día.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 border-t border-gray-50 flex items-center justify-between bg-white">
                            <div className="flex items-center gap-4">
                                {selectedDate && selectedTime && (
                                    <div className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl border border-indigo-100 animate-in slide-in-from-left-4">
                                        <span className="text-xs font-black uppercase tracking-widest">
                                            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} @ {selectedTime}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setShowScheduleModal(false)} className="px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all">Cancelar</button>
                                <button
                                    onClick={handleSaveSchedule}
                                    disabled={!selectedTime || isSavingSchedule}
                                    className="px-10 py-3 bg-blue-600 disabled:opacity-50 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-[1.05] active:scale-[0.95] transition-all flex items-center gap-2"
                                >
                                    {isSavingSchedule && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                    Guardar Cita
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
