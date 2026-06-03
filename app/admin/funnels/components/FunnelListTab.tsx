"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { onFunnelsUpdate, updateFunnel, createLead, createFunnel, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import DateFilterModal from "@/components/admin/DateFilterModal";

type TimeFilter = 'day' | 'week' | 'month' | 'bimester' | 'trimester' | 'semester' | 'year' | 'single' | 'range' | 'custom';

const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function FunnelListTab() {
    const [funnels, setFunnels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<TimeFilter>('month');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [dateModalMode, setDateModalMode] = useState<'single' | 'range'>('single');

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [fieldsConfig, setFieldsConfig] = useState<any[]>([]);
    const [formData, setFormData] = useState<any>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [fileName, setFileName] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsub = onFunnelsUpdate((data) => {
            setFunnels(data);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const filteredFunnels = useMemo(() => {
        const now = new Date();
        return funnels.filter(f => {
            if (!f.created_at) return false;
            const ca = f.created_at;
            const lDate = (ca && typeof ca === 'object' && 'toDate' in ca) ? ca.toDate() : (ca ? new Date(ca) : new Date(0));
            if (isNaN(lDate.getTime()) || lDate.getTime() === 0) return false;
            
            const lDateStr = getLocalDateString(lDate);

            if (filter === 'day') return lDate.toDateString() === now.toDateString();
            if (filter === 'week') {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(now.getDate() - 7);
                return lDate >= oneWeekAgo && lDate <= now;
            }
            if (filter === 'month') return lDate.getMonth() === now.getMonth() && lDate.getFullYear() === now.getFullYear();
            if (filter === 'bimester') return lDate >= new Date(now.getFullYear(), now.getMonth() - 2, now.getDate()) && lDate <= now;
            if (filter === 'trimester') return lDate >= new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()) && lDate <= now;
            if (filter === 'semester') return lDate >= new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()) && lDate <= now;
            if (filter === 'year') return lDate.getFullYear() === now.getFullYear();
            if (filter === 'single') return lDateStr === startDate;
            if (filter === 'range' || filter === 'custom') {
                if (!startDate || !endDate) return true;
                return lDateStr >= startDate && lDateStr <= endDate;
            }
            return true;
        });
    }, [funnels, filter, startDate, endDate]);

    const handleConvert = async (funnel: any) => {
        if (!confirm("¿Estás seguro de convertir este registro en un Prospecto en el Pipeline Maestro?")) return;

        try {
            // Create in Leads collection
            await createLead({
                data: {
                    name: funnel.name,
                    email: funnel.email,
                    phone: funnel.phone,
                    company: funnel.company,
                    budget_range: funnel.budget,
                    service_interests: funnel.service ? [funnel.service] : []
                },
                source_attribution: {
                    utm_source: 'internal',
                    landing_page: 'admin_panel'
                },
                owner_id: funnel.created_by,
                created_by: funnel.created_by,
                status_flow: { current: 'LEAD_NEW', history: [] }
            });

            // Update Funnel status
            await updateFunnel(funnel.id, { status: 'CONVERTIDO_PROSPECTO' });
            
            alert("¡Convertido a Prospecto exitosamente!");
        } catch (error) {
            console.error("Error convirtiendo funnel:", error);
            alert("Error al convertir a prospecto.");
        }
    };

    const filterOptions: { id: TimeFilter; label: string; icon: string }[] = [
        { id: 'day', label: 'Hoy', icon: '☀️' },
        { id: 'week', label: 'Semana', icon: '📅' },
        { id: 'month', label: 'Mes', icon: '🗓️' },
        { id: 'bimester', label: 'Bimestre', icon: '2️⃣' },
        { id: 'trimester', label: 'Trimestre', icon: '3️⃣' },
        { id: 'semester', label: 'Semestre', icon: '6️⃣' },
        { id: 'year', label: 'Anual', icon: '📊' },
        { id: 'single', label: 'Fecha', icon: '📍' },
        { id: 'range', label: 'Rango', icon: '↔️' },
    ];

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: '2.5rem' }}>Cargando...</div>;
    }

    return (
        <div className="admin-container animate-slide-up">
            {/* Filters and Actions */}
            <div className="admin-filters-bar" style={{ marginBottom: '1.5rem' }}>
                <div className="admin-filters-scroll">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        {filterOptions.map((opt) => {
                            const isActive = filter === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    onClick={() => {
                                        if (opt.id === 'single' || opt.id === 'range') {
                                            setDateModalMode(opt.id);
                                            setIsDateModalOpen(true);
                                        } else {
                                            setFilter(opt.id);
                                        }
                                    }}
                                    className={`admin-filter-btn ${isActive ? 'active' : ''}`}
                                >
                                    <span>{opt.icon}</span>
                                    <span>{opt.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="admin-btn" style={{ background: '#10b981', color: 'white', padding: '0.75rem 1.5rem', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)', fontSize: '0.65rem' }}>
                        <span>📊</span> Exportar Google Sheet
                    </button>
                </div>
            </div>

            <DateFilterModal
                isOpen={isDateModalOpen}
                onClose={() => setIsDateModalOpen(false)}
                mode={dateModalMode}
                initialStart={startDate}
                initialEnd={endDate}
                onSelect={(start, end) => {
                    setStartDate(start);
                    setEndDate(end);
                    setFilter(dateModalMode);
                }}
            />

            {/* List */}
            <div className="admin-table-container">
                <div style={{ overflowX: 'auto' }}>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Nombre</th>
                                <th>Campaña</th>
                                <th>Empresa</th>
                                <th>Estado</th>
                                <th style={{ textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFunnels.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--admin-text-light)', fontWeight: 500 }}>
                                        No se encontraron registros en este periodo.
                                    </td>
                                </tr>
                            ) : (
                                filteredFunnels.map(funnel => (
                                    <tr key={funnel.id}>
                                        <td style={{ fontWeight: 700, color: 'var(--admin-text-muted)' }}>
                                            {funnel.created_at?.toDate ? funnel.created_at.toDate().toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td>
                                            <div className="admin-table-entity">
                                                <div className="admin-table-name" style={{ color: 'var(--admin-primary)', fontSize: '0.9rem' }}>{funnel.name || 'Sin nombre'}</div>
                                                <div className="admin-table-contact-info">{funnel.email}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ background: 'var(--admin-surface)', color: 'var(--admin-primary)', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace', border: '1px solid var(--admin-border)' }}>
                                                {funnel.campaign_slug || 'manual'}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 700, color: 'var(--admin-text-muted)' }}>{funnel.company || '-'}</td>
                                        <td>
                                            <span className={`admin-status-badge ${funnel.status === 'CONVERTIDO_PROSPECTO' ? 'converted' : 'draft'}`}>
                                                {funnel.status === 'CONVERTIDO_PROSPECTO' ? 'Convertido' : 'Borrador / Draft'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            {funnel.status !== 'CONVERTIDO_PROSPECTO' && (
                                                <button 
                                                    onClick={() => handleConvert(funnel)}
                                                    className="admin-btn admin-btn-primary"
                                                    style={{ padding: '0.5rem 1rem', fontSize: '0.65rem' }}
                                                >
                                                    Convertir a Prospecto
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
