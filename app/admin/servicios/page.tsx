"use client";

import { useEffect, useState } from "react";
import { getServices, updateService, addService, deleteService, uploadServiceImage } from "@/lib/firebase";
import { Service } from "@/types/booking";
import { useTranslation } from "@/components/admin/LanguageContext";
import { getServiceImage } from "@/lib/service-images";
import Image from "next/image";
import { useNotification } from "@/components/admin/NotificationContext";

export default function ServicesPage() {
    const { t } = useTranslation();
    const { showNotification } = useNotification();
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);

    useEffect(() => {
        fetchServices();
    }, []);

    async function fetchServices() {
        setLoading(true);
        try {
            const data = await getServices();
            setServices(data);
        } catch (error) {
        } finally {
            setLoading(false);
        }
    }

    const handleToggleActive = async (service: Service) => {
        try {
            const newStatus = !service.active;
            await updateService(service.id, { active: newStatus });
            setServices(prev => prev.map(s => s.id === service.id ? { ...s, active: newStatus } : s));
        } catch (error) {
            showNotification(t('error_updating'), 'error');
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingService || isUploading || isSaving) return;

        setIsSaving(true);
        try {
            // Convert duration to string before saving
            const serviceToSave = {
                ...editingService,
                duration: String(editingService.duration || '30'),
                // Default color if none selected
                service_category_color: editingService.service_category_color ||
                    (editingService.service_category === 'men' ? 'blue' :
                        editingService.service_category === 'additional' ? 'orange' : 'pink')
            };

            if (editingService.id) {
                await updateService(editingService.id, serviceToSave);
            } else {
                await addService(serviceToSave as Omit<Service, 'id'>);
            }
            setEditingService(null);
            await fetchServices();
            showNotification(t('service_saved_success'), 'success');
        } catch (error: any) {
            showNotification(`Error: ${error.message || "Unknown error"}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editingService) return;

        setIsUploading(true);
        try {
            const tempId = editingService.id || `new_${Date.now()}`;
            const url = await uploadServiceImage(file, tempId);
            setEditingService({ ...editingService, image_url: url });
            showNotification(t('image_upload_success'), 'success');
        } catch (error: any) {
            showNotification(`Error subiendo imagen: ${error.message || "Upload failed"}`, 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteClick = (service: Service) => {
        setServiceToDelete(service);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!serviceToDelete) return;

        try {
            await deleteService(serviceToDelete.id);
            await fetchServices();
            setShowDeleteModal(false);
            setServiceToDelete(null);
            showNotification(t('service_saved_success'), 'success');
        } catch (error: any) {
            showNotification(`Error: ${error.message}`, 'error');
        }
    };

    // UI Helpers matched with landing page logic
    const getPriceColorFromCategory = (color?: string) => {
        switch (color) {
            case 'pink': return '#ff2d95';
            case 'blue': return '#3b82f6';
            case 'orange': return '#fb923c';
            default: return '#ff2d95';
        }
    };

    const getGradientFromColor = (color?: string) => {
        switch (color) {
            case 'pink':
                return 'linear-gradient(135deg, rgba(255, 45, 149, 0.15), rgba(255, 105, 180, 0.1))';
            case 'blue':
                return 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(96, 165, 250, 0.1))';
            case 'orange':
                return 'linear-gradient(135deg, rgba(251, 146, 60, 0.15), rgba(253, 186, 116, 0.1))';
            default:
                return 'linear-gradient(135deg, rgba(255, 45, 149, 0.15), rgba(255, 105, 180, 0.1))';
        }
    };

    const getCategoryBadgeClass = (category?: 'woman' | 'men' | 'additional') => {
        switch (category) {
            case 'woman': return 'bg-pink-500';
            case 'men': return 'bg-blue-500';
            case 'additional': return 'bg-orange-500';
            default: return 'bg-gray-500';
        }
    };

    const getCategoryLabel = (category?: 'woman' | 'men' | 'additional') => {
        switch (category) {
            case 'woman': return t('woman');
            case 'men': return t('men');
            case 'additional': return t('additional');
            default: return '---';
        }
    };

    // Helper to safely parse duration
    const parseDuration = (duration: string | number | undefined): number => {
        if (typeof duration === 'number') return duration;
        return parseInt(String(duration || '30'), 10);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-pink-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-500 font-medium">{t('loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-container pb-24 space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
                <div>
                    <h1 className="admin-h1">💅 {t('services')}</h1>
                    <p className="admin-subtitle">{t('manage_services')}</p>
                </div>

                <button
                    onClick={() => setEditingService({
                        name: '',
                        description: '',
                        price: 0,
                        duration: '30',
                        active: true,
                        service_category: 'woman',
                        service_category_color: 'pink'
                    })}
                    className="admin-btn admin-btn-primary flex items-center justify-center gap-2 px-8 py-4 shadow-xl shadow-blue-100"
                >
                    <span className="text-xl">+</span>
                    {t('new_service').toUpperCase()}
                </button>
            </header>

            {/* Services Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {services.length === 0 ? (
                    <div className="col-span-full text-center py-32 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                        <div className="text-6xl mb-6 grayscale opacity-30">💅</div>
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">No hay servicios aún</h3>
                        <p className="text-[11px] text-slate-300 font-bold mt-2">Comienza creando tu primer servicio para tu catálogo</p>
                    </div>
                ) : (
                    services.map((service) => (
                        <div
                            key={service.id}
                            className="admin-card !p-0 group overflow-hidden flex flex-col hover:shadow-2xl hover:shadow-slate-200/50 transition-all border-slate-100/50"
                        >
                            {/* Service Image/Cover */}
                            <div className="relative h-48 overflow-hidden bg-slate-50">
                                {getServiceImage(service) ? (
                                    <Image
                                        src={getServiceImage(service) as string}
                                        alt={service.name}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-4xl opacity-10">💅</div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                
                                <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[8px] font-black text-white shadow-lg backdrop-blur-md uppercase tracking-widest ${getCategoryBadgeClass(service.service_category)}`}>
                                    {getCategoryLabel(service.service_category)}
                                </div>

                                <button
                                    onClick={() => handleToggleActive(service)}
                                    className={`absolute top-4 right-4 w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-xl backdrop-blur-md ${
                                        service.active ? 'bg-emerald-500/90 text-white' : 'bg-slate-400/90 text-white'
                                    }`}
                                >
                                    <span className="text-lg">{service.active ? '✓' : '○'}</span>
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex justify-between items-start gap-4 mb-2">
                                    <h3 className="font-black text-slate-900 text-lg leading-tight truncate flex-1 tracking-tight">{service.name}</h3>
                                    <span className="text-lg font-black text-[#0081C8] tracking-tighter">
                                        ${service.price}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-400 mb-6 line-clamp-2 leading-relaxed font-bold italic">
                                    {service.description || "Sin descripción disponible."}
                                </p>

                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50 mt-auto">
                                    <div className="flex items-center gap-2 text-slate-400 font-black">
                                        <span className="text-sm grayscale">⏱️</span>
                                        <span className="text-[10px] uppercase tracking-widest">{service.duration} MINUTOS</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setEditingService(service)}
                                        className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all"
                                    >
                                        ✏️ {t('edit')}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(service)}
                                        className="flex-1 py-3 bg-rose-50 text-rose-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all"
                                    >
                                        🗑️ {t('delete')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal de Edición/Creación */}
            {editingService && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
                    <div className="admin-modal w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-500 shadow-2xl">
                        <header className="p-8 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                    {editingService.id ? "EDITAR SERVICIO" : "NUEVO SERVICIO"}
                                </h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Completa los detalles del servicio</p>
                            </div>
                            <button onClick={() => setEditingService(null)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all">✕</button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                            {/* Upload Section */}
                            <div className="admin-input-group">
                                <label className="admin-label">Imagen del Servicio</label>
                                <div className="relative group overflow-hidden rounded-[2rem] border-2 border-dashed border-slate-200 aspect-video bg-slate-50 flex items-center justify-center">
                                    {getServiceImage(editingService as Service) ? (
                                        <>
                                            <Image src={getServiceImage(editingService as Service) as string} alt="Preview" fill className="object-cover" />
                                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <p className="text-white font-black text-[10px] uppercase tracking-widest">Cambiar Imagen</p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center">
                                            <span className="text-4xl block mb-2 opacity-20">📸</span>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isUploading ? "SUBIENDO..." : "CLICK PARA SUBIR"}</p>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        disabled={isUploading}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="admin-input-group">
                                    <label className="admin-label">Nombre del Servicio</label>
                                    <input
                                        type="text"
                                        value={editingService.name || ''}
                                        onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                                        className="admin-input"
                                        placeholder="Ej: Manicura Rusa"
                                        required
                                    />
                                </div>
                                <div className="admin-input-group">
                                    <label className="admin-label">Categoría</label>
                                    <select
                                        value={editingService.service_category || 'woman'}
                                        onChange={(e) => setEditingService({ ...editingService, service_category: e.target.value as any })}
                                        className="admin-input cursor-pointer"
                                    >
                                        <option value="woman">MUJER</option>
                                        <option value="men">HOMBRE</option>
                                        <option value="additional">ADICIONAL</option>
                                    </select>
                                </div>
                            </div>

                            <div className="admin-input-group">
                                <label className="admin-label">Descripción</label>
                                <textarea
                                    value={editingService.description || ''}
                                    onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                                    className="admin-input min-h-[100px] resize-none"
                                    placeholder="Describe brevemente el servicio y sus beneficios..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="admin-input-group">
                                    <label className="admin-label">Precio ($)</label>
                                    <input
                                        type="number"
                                        value={editingService.price || 0}
                                        onChange={(e) => setEditingService({ ...editingService, price: Number(e.target.value) })}
                                        className="admin-input"
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                </div>
                                <div className="admin-input-group">
                                    <label className="admin-label">Duración (minutos)</label>
                                    <input
                                        type="number"
                                        value={parseDuration(editingService.duration)}
                                        onChange={(e) => setEditingService({ ...editingService, duration: e.target.value })}
                                        className="admin-input"
                                        min="5"
                                        step="5"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <footer className="p-8 border-t border-slate-50 flex gap-4 bg-white sticky bottom-0 z-10">
                            <button
                                type="button"
                                onClick={() => setEditingService(null)}
                                className="flex-1 admin-btn admin-btn-secondary"
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || isUploading}
                                className="flex-1 admin-btn admin-btn-primary shadow-lg shadow-blue-100"
                            >
                                {isSaving ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            {/* Modal de Eliminación */}
            {showDeleteModal && serviceToDelete && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-500 border border-slate-100">
                        <div className="p-10 text-center">
                            <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner shadow-rose-100/50">
                                🗑️
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                                ¿ELIMINAR SERVICIO?
                            </h3>
                            <p className="text-xs text-slate-400 font-bold leading-relaxed px-4">
                                Estás a punto de eliminar <span className="text-slate-900 font-black">"{serviceToDelete.name}"</span>. Esta acción no se puede deshacer.
                            </p>
                        </div>
                        <div className="flex flex-col p-8 pt-0 gap-3">
                            <button
                                onClick={confirmDelete}
                                className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-rose-600 transition-all shadow-xl shadow-rose-100"
                            >
                                ELIMINAR AHORA
                            </button>
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setServiceToDelete(null);
                                }}
                                className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-200 transition-all"
                            >
                                CANCELAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
