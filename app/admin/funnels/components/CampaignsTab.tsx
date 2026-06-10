"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { onCampaignsUpdate, createCampaign, updateCampaign, storage, auth, db, getStaffUsers } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { ROLES_CONFIG } from "@/config/roles_config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import LandingBuilder from './builder/LandingBuilder';
import { Block } from './builder/BuilderContext';
import { toast } from 'react-hot-toast';

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

    // RBAC & Users State
    const [currentUserData, setCurrentUserData] = useState<{uid: string, team_id: string} | null>(null);
    const [staffUsers, setStaffUsers] = useState<any[]>([]);
    const [userLevel, setUserLevel] = useState<number>(0);

    // Builder State
    const [formData, setFormData] = useState<{
        slug: string;
        title: string;
        description: string;
        hero_image_url: string;
        pixels: { fb: string; linkedin: string; tiktok: string; google: string };
        status: string;
        blocks: Block[];
    }>({
        slug: '',
        title: '',
        description: '',
        hero_image_url: '',
        pixels: { fb: '', linkedin: '', tiktok: '', google: '' },
        status: 'draft',
        blocks: []
    });
    const [modalTab, setModalTab] = useState<'config' | 'builder'>('config');
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

        const loadUsers = async () => {
            const users = await getStaffUsers();
            setStaffUsers(users);
        };
        loadUsers();

        const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setCurrentUserData({ uid: user.uid, team_id: userData.team_id || '' });
                        
                        const roleId = userData.role;
                        const config = ROLES_CONFIG[roleId] || ROLES_CONFIG[roleId?.toUpperCase()] || ROLES_CONFIG[roleId?.toLowerCase()];
                        if (config) {
                            setUserLevel(config.level);
                        }
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                }
            }
        });

        return () => {
            unsub();
            unsubscribeAuth();
        };
    }, []);

    const filteredCampaigns = useMemo(() => {
        const userMap = new Map(staffUsers.map(u => [u.uid, u]));
        
        return campaigns.filter(c => {
            if (!c) return false;
            
            const isGlobalAdmin = userLevel >= 10;
            const isCreator = c.created_by === currentUserData?.uid;
            
            const creatorInfo = userMap.get(c.created_by) || {};
            const creatorRoleStr = creatorInfo.role || '';
            const creatorConfig = ROLES_CONFIG[creatorRoleStr.toUpperCase()] || ROLES_CONFIG[creatorRoleStr.toLowerCase()] || ROLES_CONFIG[creatorRoleStr];
            const creatorLevel = creatorConfig?.level || 0;
            const creatorTeam = creatorInfo.team_id || '';
            
            const isSuperiorInTeam = (currentUserData?.team_id === creatorTeam) && (creatorTeam !== '') && (userLevel > creatorLevel);
            
            return isGlobalAdmin || isCreator || isSuperiorInTeam || !c.created_by; // Show unassigned to everyone for now
        });
    }, [campaigns, staffUsers, currentUserData, userLevel]);

    const handleStateChange = (id: string, newState: FieldState) => {
        setFields(fields.map(f => f.id === id ? { ...f, state: newState } : f));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const storageRef = ref(storage, `campaigns/${Date.now()}_${file.name}`);
            const metadata = {
                contentType: file.type || 'image/png',
            };
            await uploadBytes(storageRef, file, metadata);
            const url = await getDownloadURL(storageRef);
            setFormData(prev => ({ ...prev, hero_image_url: url }));
        } catch (error) {
            console.error("Error subiendo imagen:", error);
            toast.error("Error al subir la imagen");
        } finally {
            setIsUploading(false);
            // Clear input so the same file can be selected again
            e.target.value = '';
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
                status: campaign.status || 'draft',
                blocks: campaign.blocks || []
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
                status: 'draft',
                blocks: []
            });
            setFields(defaultFields);
        }
        setModalTab('config');
        setIsBuilderOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.slug.match(/^[a-z0-9-]+$/)) {
            toast.error("El slug de la URL solo puede contener letras minúsculas, números y guiones.");
            return;
        }

        setIsSaving(true);
        try {
            if (editingId) {
                await updateCampaign(editingId, { ...formData, fields_config: fields });
                toast.success("Campaña actualizada");
            } else {
                await createCampaign({ ...formData, fields_config: fields, created_by: currentUserData?.uid || '' });
                toast.success("Campaña creada");
            }
            setIsBuilderOpen(false);
        } catch (error) {
            console.error("Error saving campaign:", error);
            toast.error("Error al guardar la campaña.");
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
                {filteredCampaigns.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--admin-surface)', borderRadius: 'var(--admin-radius-lg)', color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border)' }}>
                        <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>📄</span>
                        <p style={{ margin: 0, fontWeight: 600 }}>No hay campañas creadas aún.</p>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>Crea tu primera campaña para captar clientes.</p>
                    </div>
                ) : (
                    filteredCampaigns.map(camp => (
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

                        <div style={{ padding: '1rem 2rem 0', borderBottom: '1px solid var(--admin-border)', backgroundColor: 'var(--admin-surface)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div>
                                    <h3 className="admin-h3" style={{ marginBottom: '0.25rem' }}>Diseñador de Campaña</h3>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', margin: 0 }}>Configura SEO, Pixels y el diseño visual de tu Landing Page.</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '2rem' }}>
                                <button 
                                    type="button"
                                    onClick={() => setModalTab('config')} 
                                    style={{ padding: '0.75rem 0', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, color: modalTab === 'config' ? 'var(--admin-primary)' : 'var(--admin-text-muted)', borderBottom: modalTab === 'config' ? '2px solid var(--admin-primary)' : '2px solid transparent' }}
                                >
                                    ⚙️ Configuración y Formulario
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setModalTab('builder')} 
                                    style={{ padding: '0.75rem 0', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, color: modalTab === 'builder' ? 'var(--admin-primary)' : 'var(--admin-text-muted)', borderBottom: modalTab === 'builder' ? '2px solid var(--admin-primary)' : '2px solid transparent' }}
                                >
                                    🎨 Editor Visual de la Web
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSave} className="campaign-modal-body" style={{ flex: 1, minHeight: 0, overflowY: modalTab === 'config' ? 'auto' : 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>

                            {modalTab === 'config' && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', flex: 1, paddingBottom: '2rem', padding: '1rem' }}>
                                    {/* Columna 1: Diseño y SEO */}
                                    <div className="campaign-section" style={{ flex: '1 1 300px', minWidth: 'min(100%, 300px)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <h4 className="campaign-section-title pink">
                                        <span className="campaign-number-badge pink">1</span>
                                        Información Principal
                                    </h4>

                                    <div className="admin-input-group" style={{ marginBottom: 0 }}>
                                        <label className="admin-label">Nombre de la Campaña (Interno)</label>
                                        <input type="text" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="admin-input" placeholder="Ej: Campaña Publicitaria FB" />
                                    </div>

                                    <div className="admin-input-group" style={{ marginBottom: 0 }}>
                                        <label className="admin-label">URL Pública (Slug)</label>
                                        <div style={{ display: 'flex' }}>
                                            <span style={{ padding: '1.125rem 1rem', backgroundColor: 'var(--admin-surface)', border: '2px solid var(--admin-surface)', borderRadius: 'var(--admin-radius-md) 0 0 var(--admin-radius-md)', color: 'var(--admin-text-muted)', fontFamily: 'monospace', fontSize: '0.95rem' }}>brecomperu.com/c/</span>
                                            <input type="text" required value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} className="admin-input" style={{ borderRadius: '0 var(--admin-radius-md) var(--admin-radius-md) 0', flex: 1, fontFamily: 'monospace', color: 'var(--admin-primary)', fontWeight: 800 }} placeholder="nombre-campana" />
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
                            <div className="campaign-section" style={{ flex: '1 1 300px', minWidth: 'min(100%, 300px)' }}>
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
                                </div>
                            )}

                            {modalTab === 'builder' && (
                                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                    <LandingBuilder 
                                        initialBlocks={formData.blocks} 
                                        onChange={(blocks) => setFormData(prev => ({ ...prev, blocks }))} 
                                        formConfig={fields}
                                    />
                                </div>
                            )}

                            <div className="campaign-modal-footer" style={{ marginTop: 'auto' }}>
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
