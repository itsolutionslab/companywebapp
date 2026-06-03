"use client";

import { useState, useEffect, useRef } from "react";
import { onCampaignsUpdate, createCampaign, updateCampaign, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

type FieldState = 'required' | 'optional' | 'hidden';

interface FieldConfig {
    id: string;
    label: string;
    state: FieldState;
}

const defaultFields: FieldConfig[] = [
    { id: 'name', label: 'Nombre Completo', state: 'required' },
    { id: 'email', label: 'Correo Electrónico', state: 'required' },
    { id: 'company', label: 'Empresa', state: 'required' },
    { id: 'phone', label: 'Teléfono', state: 'required' },
    { id: 'website', label: 'Sitio Web', state: 'optional' },
    { id: 'role', label: 'Cargo / Rol', state: 'required' },
    { id: 'objectives', label: 'Objetivos Estratégicos', state: 'optional' },
    { id: 'stage', label: 'Etapa del Proyecto', state: 'optional' },
    { id: 'timeline', label: 'Tiempo Estimado', state: 'optional' },
    { id: 'investment_level', label: 'Nivel de Inversión', state: 'optional' },
    { id: 'decision_maker', label: 'Tomador de Decisiones', state: 'optional' },
    { id: 'impact', label: 'Mensaje / Impacto', state: 'optional' },
    { id: 'file_url', label: 'Adjuntar Archivo (Imagen/PDF)', state: 'optional' },
];

export default function CampaignsTab() {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);

    // Builder State
    const [formData, setFormData] = useState({
        slug: '',
        title: '',
        description: '',
        hero_image_url: '',
        pixels: { fb: '', linkedin: '', tiktok: '', google: '' },
        status: 'draft'
    });
    const [fields, setFields] = useState<FieldConfig[]>(defaultFields);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsub = onCampaignsUpdate((data) => {
            setCampaigns(data);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleStateChange = (id: string, newState: FieldState) => {
        setFields(fields.map(f => f.id === id ? { ...f, state: newState } : f));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const storageRef = ref(storage, `campaigns/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            setFormData(prev => ({ ...prev, hero_image_url: url }));
        } catch (error) {
            console.error("Error subiendo imagen:", error);
            alert("Error al subir la imagen");
        } finally {
            setIsUploading(false);
        }
    };

    const openBuilder = (campaign?: any) => {
        if (campaign) {
            setEditingId(campaign.id);
            setFormData({
                slug: campaign.slug || '',
                title: campaign.title || '',
                description: campaign.description || '',
                hero_image_url: campaign.hero_image_url || '',
                pixels: campaign.pixels || { fb: '', linkedin: '', tiktok: '', google: '' },
                status: campaign.status || 'draft'
            });
            setFields(campaign.fields_config || defaultFields);
        } else {
            setEditingId(null);
            setFormData({
                slug: '',
                title: '',
                description: '',
                hero_image_url: '',
                pixels: { fb: '', linkedin: '', tiktok: '', google: '' },
                status: 'draft'
            });
            setFields(defaultFields);
        }
        setIsBuilderOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.slug.match(/^[a-z0-9-]+$/)) {
            alert("El slug de la URL solo puede contener letras minúsculas, números y guiones.");
            return;
        }

        setIsSaving(true);
        try {
            const current_user_id = "current_user_id"; // Replace with actual auth context

            const payload = {
                ...formData,
                fields_config: fields,
                created_by: current_user_id
            };

            if (editingId) {
                await updateCampaign(editingId, payload);
            } else {
                // Check if slug exists? (Optimally we should check, but firestore rules or unique constraints might not exist easily client-side without a query, we'll assume it's unique for now or add a quick check later)
                await createCampaign(payload);
            }
            setIsBuilderOpen(false);
            alert("Campaña guardada exitosamente.");
        } catch (error) {
            console.error("Error saving campaign:", error);
            alert("Error al guardar la campaña.");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: '2.5rem' }}>Cargando...</div>;
    }

    return (
        <div className="admin-container animate-slide-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="admin-h2">Campañas de Captación</h2>
                <button
                    onClick={() => openBuilder()}
                    className="admin-btn admin-btn-primary"
                >
                    <span>➕</span> Nueva Campaña
                </button>
            </div>

            {/* List of Campaigns */}
            <div className="campaign-grid">
                {campaigns.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', padding: '2.5rem', textAlign: 'center', color: 'var(--admin-text-muted)', backgroundColor: 'var(--admin-surface)', borderRadius: 'var(--admin-radius-lg)', border: '1px solid var(--admin-border)' }}>
                        No hay campañas creadas. Haz clic en "Nueva Campaña" para empezar.
                    </div>
                ) : (
                    campaigns.map(camp => (
                        <div key={camp.id} className="campaign-card">
                            {camp.hero_image_url ? (
                                <div className="campaign-hero-preview" style={{ backgroundImage: `url(${camp.hero_image_url})` }}></div>
                            ) : (
                                <div className="campaign-hero-preview" style={{ background: 'linear-gradient(to top right, rgba(238, 5, 242, 0.05), rgba(5, 17, 242, 0.05))', fontSize: '2rem' }}>
                                    🎯
                                </div>
                            )}
                            <div style={{ flex: 1 }}>
                                <div className="campaign-card-header">
                                    <h3 className="campaign-card-title">{camp.title || 'Campaña sin título'}</h3>
                                    <span className={`admin-badge ${camp.status === 'published' ? 'admin-badge-success' : 'admin-badge-primary'}`}>
                                        {camp.status === 'published' ? 'Pública' : 'Borrador'}
                                    </span>
                                </div>
                                <div className="campaign-card-slug">/c/{camp.slug}</div>
                            </div>
                            <div className="campaign-card-actions">
                                <button onClick={() => openBuilder(camp)} className="admin-btn" style={{ flex: 1, padding: '0.5rem', background: 'var(--admin-surface)', color: 'var(--admin-text-main)', fontSize: '0.65rem' }}>
                                    Editar
                                </button>
                                {camp.status === 'published' && (
                                    <a href={`/c/${camp.slug}`} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-secondary" style={{ flex: 1, padding: '0.5rem', textDecoration: 'none', fontSize: '0.65rem' }}>
                                        Ver Web
                                    </a>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Campaign Builder Modal */}
            {isBuilderOpen && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal campaign-builder-modal" style={{ maxWidth: '1152px', margin: 'auto', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
                        <button onClick={() => setIsBuilderOpen(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', width: '2.5rem', height: '2.5rem', borderRadius: '50%', border: 'none', background: 'var(--admin-surface)', cursor: 'pointer', zIndex: 10 }}>✕</button>

                        <div style={{ padding: '2rem 2rem 1rem', borderBottom: '1px solid var(--admin-border)', backgroundColor: 'var(--admin-surface)' }}>
                            <h3 className="admin-h3" style={{ marginBottom: '0.5rem' }}>Diseñador de Campaña</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', margin: 0 }}>Configura el diseño, los campos y el rastreo (Pixels) de tu Landing Page.</p>
                        </div>

                        <form onSubmit={handleSave} className="campaign-modal-body">

                            {/* Columna 1: Diseño y SEO */}
                            <div className="campaign-section">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <h4 className="campaign-section-title pink">
                                        <span className="campaign-number-badge pink">1</span>
                                        Información Principal
                                    </h4>

                                    <div className="admin-input-group" style={{ marginBottom: 0 }}>
                                        <label className="admin-label">Título de la Campaña (H1)</label>
                                        <input type="text" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="admin-input" placeholder="Ej: Transformación Digital para Retail" />
                                    </div>

                                    <div className="admin-input-group" style={{ marginBottom: 0 }}>
                                        <label className="admin-label">Descripción / Texto persuasivo</label>
                                        <textarea required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="admin-input" style={{ minHeight: '100px', resize: 'vertical' }} placeholder="Ej: Descubre cómo escalar tu negocio con nuestras soluciones..." />
                                    </div>

                                    <div className="admin-input-group" style={{ marginBottom: 0 }}>
                                        <label className="admin-label">URL Pública (Slug)</label>
                                        <div style={{ display: 'flex' }}>
                                            <span style={{ padding: '1.125rem 1rem', backgroundColor: 'var(--admin-surface)', border: '2px solid var(--admin-surface)', borderRadius: 'var(--admin-radius-md) 0 0 var(--admin-radius-md)', color: 'var(--admin-text-muted)', fontFamily: 'monospace', fontSize: '0.95rem' }}>brecomperu.com/c/</span>
                                            <input type="text" required value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} className="admin-input" style={{ borderRadius: '0 var(--admin-radius-md) var(--admin-radius-md) 0', flex: 1, fontFamily: 'monospace', color: 'var(--admin-primary)', fontWeight: 800 }} placeholder="nombre-campana" />
                                        </div>
                                    </div>

                                    <div className="admin-input-group" style={{ marginBottom: 0 }}>
                                        <label className="admin-label">Imagen Principal (Hero Image)</label>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                            {formData.hero_image_url && (
                                                <div style={{ width: '10rem', height: '8rem', borderRadius: 'var(--admin-radius-md)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundImage: `url(${formData.hero_image_url})`, border: '2px dashed var(--admin-primary)' }}></div>
                                            )}
                                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="campaign-upload-box">
                                                {isUploading ? <span style={{ fontSize: '2rem' }}>⏳</span> : <span style={{ fontSize: '2rem' }}>📸</span>}
                                                {isUploading ? "Subiendo archivo..." : "Subir Imagen (Recomendado 1200x800)"}
                                            </button>
                                            <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept="image/*" onChange={handleImageUpload} />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '1rem' }}>
                                    <h4 className="campaign-section-title cyan">
                                        <span className="campaign-number-badge cyan">2</span>
                                        Tracking & Pixels
                                    </h4>
                                    <div className="campaign-pixel-grid">
                                        <div className="admin-input-group" style={{ marginBottom: 0 }}>
                                            <label className="admin-label">Meta Pixel ID</label>
                                            <input type="text" value={formData.pixels.fb} onChange={e => setFormData({ ...formData, pixels: { ...formData.pixels, fb: e.target.value } })} className="admin-input" style={{ padding: '0.75rem', fontFamily: 'monospace' }} placeholder="Ej: 1234567890" />
                                        </div>
                                        <div className="admin-input-group" style={{ marginBottom: 0 }}>
                                            <label className="admin-label">LinkedIn Insight Tag</label>
                                            <input type="text" value={formData.pixels.linkedin} onChange={e => setFormData({ ...formData, pixels: { ...formData.pixels, linkedin: e.target.value } })} className="admin-input" style={{ padding: '0.75rem', fontFamily: 'monospace' }} placeholder="Ej: 123456" />
                                        </div>
                                        <div className="admin-input-group" style={{ marginBottom: 0 }}>
                                            <label className="admin-label">Google Tag Manager</label>
                                            <input type="text" value={formData.pixels.google} onChange={e => setFormData({ ...formData, pixels: { ...formData.pixels, google: e.target.value } })} className="admin-input" style={{ padding: '0.75rem', fontFamily: 'monospace' }} placeholder="Ej: GTM-XXXX" />
                                        </div>
                                        <div className="admin-input-group" style={{ marginBottom: 0 }}>
                                            <label className="admin-label">TikTok Pixel ID</label>
                                            <input type="text" value={formData.pixels.tiktok} onChange={e => setFormData({ ...formData, pixels: { ...formData.pixels, tiktok: e.target.value } })} className="admin-input" style={{ padding: '0.75rem', fontFamily: 'monospace' }} placeholder="Ej: CD1234" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Columna 2: Configuración del Formulario */}
                            <div className="campaign-section">
                                <div style={{ position: 'sticky', top: '-2rem', backgroundColor: 'var(--admin-bg)', paddingTop: '1.5rem', paddingBottom: '1rem', zIndex: 10 }}>
                                    <h4 className="campaign-section-title blue" style={{ marginBottom: '0.5rem', borderBottom: 'none' }}>
                                        <span className="campaign-number-badge blue">3</span>
                                        Configuración del Formulario
                                    </h4>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>Define qué datos pedirás al cliente. Los campos ocultos no aparecerán en la web.</p>
                                </div>

                                <div className="campaign-fields-list">
                                    {fields.map(field => (
                                        <div key={field.id} className="campaign-field-item">
                                            <span className="campaign-field-name">{field.label}</span>
                                            <div className="campaign-field-controls">
                                                <button type="button" onClick={() => handleStateChange(field.id, 'required')} className={`campaign-control-btn ${field.state === 'required' ? 'active-required' : ''}`}>
                                                    Exigible
                                                </button>
                                                <button type="button" onClick={() => handleStateChange(field.id, 'optional')} className={`campaign-control-btn ${field.state === 'optional' ? 'active-optional' : ''}`}>
                                                    Opcional
                                                </button>
                                                <button type="button" onClick={() => handleStateChange(field.id, 'hidden')} className={`campaign-control-btn ${field.state === 'hidden' ? 'active-hidden' : ''}`}>
                                                    Oculto
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="campaign-modal-footer" style={{ gridColumn: '1 / -1' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <label className="admin-label" style={{ margin: 0 }}>Estado:</label>
                                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="admin-input" style={{ padding: '0.75rem', width: 'auto' }}>
                                        <option value="draft">Borrador (Oculto)</option>
                                        <option value="published">Publicado (Activo)</option>
                                    </select>
                                </div>
                                <div className="campaign-footer-actions">
                                    <button type="button" onClick={() => setIsBuilderOpen(false)} className="campaign-cancel-btn">
                                        Cancelar
                                    </button>
                                    <button type="submit" disabled={isSaving || isUploading} className="admin-btn admin-btn-primary" style={{ padding: '0.85rem 2rem' }}>
                                        {isSaving ? 'Guardando...' : 'Guardar Campaña'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
