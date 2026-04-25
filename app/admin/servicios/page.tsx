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
        <div className="min-h-screen pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 md:space-y-8">
                {/* Header - Mobile First */}
                <div className="bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 rounded-3xl p-6 md:p-8 shadow-sm border border-pink-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600 bg-clip-text text-transparent mb-2">
                                {t('services')}
                            </h1>
                            <p className="text-sm md:text-base text-gray-600 font-medium">
                                {t('manage_services')}
                            </p>
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
                            className="w-full sm:w-auto px-6 py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold hover:shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-200"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="text-base">{t('new_service')}</span>
                        </button>
                    </div>
                </div>

                {/* Empty State */}
                {services.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                        <div className="text-6xl mb-4">💅</div>
                        <h3 className="text-xl font-bold text-gray-700 mb-2">No hay servicios aún</h3>
                        <p className="text-gray-500 mb-6 font-medium">Comienza creando tu primer servicio</p>
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
                            className="px-8 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-bold hover:shadow-xl transition-all"
                        >
                            {t('new_service')}
                        </button>
                    </div>
                )}

                {/* Services Grid - Fully Responsive */}
                {services.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
                        {services.map((service) => (
                            <div
                                key={service.id}
                                className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group flex flex-col"
                            >
                                {/* Image with Overlay */}
                                <div className="relative h-44 sm:h-48 overflow-hidden" style={{ background: getGradientFromColor(service.service_category_color) }}>
                                    {getServiceImage(service) ? (
                                        <Image
                                            src={getServiceImage(service) as string}
                                            alt={service.name}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-500 z-10 opacity-90 group-hover:opacity-100"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-5xl opacity-20">
                                            💅
                                        </div>
                                    )}

                                    {/* Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent z-20"></div>

                                    {/* Category Badge */}
                                    <div className={`absolute top-3 left-3 px-3 py-1 rounded-lg text-[9px] font-black text-white ${getCategoryBadgeClass(service.service_category)} shadow-md backdrop-blur-sm z-30 tracking-widest uppercase`}>
                                        {getCategoryLabel(service.service_category)}
                                    </div>

                                    {/* Active Toggle */}
                                    <button
                                        onClick={() => handleToggleActive(service)}
                                        className={`absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-md z-30 ${service.active
                                            ? 'bg-green-500 text-white shadow-green-200'
                                            : 'bg-gray-400 text-white shadow-gray-200'
                                            }`}
                                        title={service.active ? t('deactivate') : t('activate')}
                                    >
                                        <span className="text-sm">{service.active ? '✓' : '○'}</span>
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="p-4 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-1.5 gap-2">
                                        <h3 className="font-black text-gray-900 text-base line-clamp-2 leading-tight flex-1">{service.name}</h3>
                                        <span className="text-base font-black bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
                                            ${service.price}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 mb-3 line-clamp-2 leading-relaxed font-medium italic">
                                        {service.description || "Indulge in our premium care treatment."}
                                    </p>

                                    {/* Duration Info */}
                                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-50 mt-auto">
                                        <div className="flex items-center gap-1.5 text-gray-400 font-bold">
                                            <span className="text-sm">⏱️</span>
                                            <span className="text-[10px] uppercase tracking-wider">{service.duration} min</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setEditingService(service)}
                                            className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs hover:bg-blue-100 active:scale-95 transition-all border border-blue-100"
                                        >
                                            ✏️ {t('edit')}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(service)}
                                            className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-xs hover:bg-red-100 active:scale-95 transition-all border border-red-100"
                                        >
                                            🗑️ {t('delete')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Apple-Style Edit/Create Modal (iOS Sheet Architecture) */}
                {editingService && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] animate-in fade-in duration-300">
                        {/* Backdrop click to close */}
                        <div className="absolute inset-0" onClick={() => !isSaving && !isUploading && setEditingService(null)}></div>

                        <div className="bg-[#F2F2F7] w-full max-w-2xl rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl relative z-10 max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-500 ease-out">
                            {/* iOS Drag Handle - Decorative */}
                            <div className="w-12 h-1.5 bg-gray-300/50 rounded-full mx-auto mt-3 mb-1 flex-shrink-0 sm:hidden"></div>

                            <form onSubmit={handleSave} className="flex flex-col h-full overflow-hidden">
                                {/* Navigation Bar Style Header */}
                                <div className="px-6 py-4 mt-6 flex items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-20">
                                    <button
                                        type="button"
                                        onClick={() => setEditingService(null)}
                                        className="text-[#007AFF] font-medium text-base hover:opacity-70 transition-opacity"
                                    >
                                        {t('cancel')}
                                    </button>
                                    <h3 className="text-lg font-bold text-black tracking-tight">
                                        {editingService.id ? t('edit') : t('new_service')}
                                    </h3>
                                    <button
                                        type="submit"
                                        disabled={isSaving || isUploading}
                                        className="text-[#007AFF] font-bold text-base hover:opacity-70 transition-opacity disabled:opacity-30"
                                    >
                                        {isSaving ? '...' : t('save')}
                                    </button>
                                </div>

                                {/* Scrollable Inset Grouped Content */}
                                <div className="flex-1 overflow-y-auto pt-2 pb-10 px-4 space-y-8">

                                    {/* Section: Visual Identity */}
                                    <div className="space-y-2">
                                        <div className="px-4 text-[13px] uppercase text-gray-500 font-medium tracking-wide">
                                            {t('image_upload')}
                                        </div>
                                        <div className="bg-white rounded-2xl overflow-hidden border border-gray-200">
                                            {/* Preview Image */}
                                            {getServiceImage(editingService as Service) && (
                                                <div className="relative h-48 border-b border-gray-100 group">
                                                    <Image
                                                        src={getServiceImage(editingService as Service) as string}
                                                        alt="Preview"
                                                        fill
                                                        className="object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors"></div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingService({ ...editingService, image_url: '' });
                                                        }}
                                                        className="absolute top-2 right-2 w-8 h-8 bg-white/90 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-full flex items-center justify-center shadow-sm backdrop-blur-sm transition-all z-20"
                                                        title="Remove Image"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            )}

                                            {/* File Input */}
                                            <div className="p-4 relative active:bg-gray-50 transition-colors">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                    disabled={isUploading}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xl">
                                                        {isUploading ? '⌛' : '📸'}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-gray-900 leading-tight">
                                                            {isUploading ? t('loading') : t('image_upload')}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-0.5">JPG, PNG o WEBP</p>
                                                    </div>
                                                    <span className="text-gray-300 text-xl">›</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section: General Info */}
                                    <div className="space-y-2">
                                        <div className="px-4 text-[13px] uppercase text-gray-500 font-medium tracking-wide">
                                            {t('service_identity')}
                                        </div>
                                        <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 divide-y divide-gray-100">
                                            {/* Name Input */}
                                            <div className="px-4 py-3.5 flex flex-col group">
                                                <label className="text-[11px] font-bold text-[#8E8E93] uppercase mb-0.5 transition-colors group-focus-within:text-[#007AFF]">
                                                    {t('service_name')}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editingService.name || ''}
                                                    onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                                                    required
                                                    className="w-full bg-transparent outline-none text-[17px] font-medium text-black placeholder:text-gray-300"
                                                    placeholder="Ej: Manicura Spa"
                                                />
                                            </div>

                                            {/* Description Textarea */}
                                            <div className="px-4 py-3.5 flex flex-col group">
                                                <label className="text-[11px] font-bold text-[#8E8E93] uppercase mb-0.5 transition-colors group-focus-within:text-[#007AFF]">
                                                    {t('service_description')}
                                                </label>
                                                <textarea
                                                    value={editingService.description || ''}
                                                    onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                                                    rows={3}
                                                    className="w-full bg-transparent outline-none text-[16px] font-medium text-black resize-none placeholder:text-gray-300"
                                                    placeholder="Escribe brevemente los beneficios..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section: Customization & Category */}
                                    <div className="space-y-2">
                                        <div className="px-4 text-[13px] uppercase text-gray-500 font-medium tracking-wide">
                                            {t('category_style')}
                                        </div>
                                        <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 divide-y divide-gray-100">
                                            {/* Category Selector */}
                                            <div className="px-4 py-3.5 flex items-center justify-between group">
                                                <div className="flex flex-col">
                                                    <label className="text-[11px] font-bold text-[#8E8E93] uppercase mb-0.5 group-focus-within:text-[#007AFF]">
                                                        {t('service_category_label')}
                                                    </label>
                                                    <select
                                                        value={editingService.service_category || 'woman'}
                                                        onChange={(e) => setEditingService({ ...editingService, service_category: e.target.value as any })}
                                                        className="bg-transparent outline-none text-[17px] font-semibold text-black appearance-none cursor-pointer"
                                                    >
                                                        <option value="woman">{t('woman')}</option>
                                                        <option value="men">{t('men')}</option>
                                                        <option value="additional">{t('additional')}</option>
                                                    </select>
                                                </div>
                                                <span className="text-gray-300 text-xl pointer-events-none self-end pb-1">↕</span>
                                            </div>

                                            {/* Aesthetic Color Picker */}
                                            <div className="px-4 py-4 flex flex-col">
                                                <label className="text-[11px] font-bold text-[#8E8E93] uppercase mb-4">
                                                    🎨 {t('service_color')}
                                                </label>
                                                <div className="flex gap-6">
                                                    {['pink', 'blue', 'orange'].map((color) => (
                                                        <button
                                                            key={color}
                                                            type="button"
                                                            onClick={() => setEditingService({ ...editingService, service_category_color: color as any })}
                                                            className={`
                                                                w-10 h-10 rounded-full border-4 transition-all duration-300 flex items-center justify-center
                                                                ${editingService.service_category_color === color
                                                                    ? 'border-[#007AFF] scale-110 shadow-lg'
                                                                    : 'border-transparent shadow-sm hover:scale-105'}
                                                            `}
                                                            style={{ backgroundColor: getPriceColorFromCategory(color) }}
                                                        >
                                                            {editingService.service_category_color === color && (
                                                                <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section: Economic & Time Details */}
                                    <div className="space-y-2">
                                        <div className="px-4 text-[13px] uppercase text-gray-500 font-medium tracking-wide">
                                            {t('value_time')}
                                        </div>
                                        <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 divide-y divide-gray-100">
                                            {/* Price Input */}
                                            <div className="px-4 py-3.5 flex items-center justify-between group">
                                                <label className="text-[17px] font-medium text-black">
                                                    {t('service_price')}
                                                </label>
                                                <div className="flex items-center gap-1.5 bg-[#F2F2F7] px-3 py-1.5 rounded-lg border border-gray-100 focus-within:ring-2 focus-within:ring-[#007AFF]/20 transition-all">
                                                    <span className="text-[#8E8E93] font-bold">$</span>
                                                    <input
                                                        type="number"
                                                        value={editingService.price || 0}
                                                        onChange={(e) => setEditingService({ ...editingService, price: Number(e.target.value) })}
                                                        required
                                                        min="0"
                                                        step="0.01"
                                                        className="w-20 bg-transparent outline-none text-[17px] font-bold text-right text-[#007AFF]"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>

                                            {/* Duration Input */}
                                            <div className="px-4 py-3.5 flex items-center justify-between group">
                                                <label className="text-[17px] font-medium text-black">
                                                    {t('service_duration')}
                                                </label>
                                                <div className="flex items-center gap-1.5 bg-[#F2F2F7] px-3 py-1.5 rounded-lg border border-gray-100 focus-within:ring-2 focus-within:ring-[#007AFF]/20 transition-all">
                                                    <input
                                                        type="number"
                                                        value={parseDuration(editingService.duration)}
                                                        onChange={(e) => setEditingService({ ...editingService, duration: e.target.value })}
                                                        required
                                                        min="5"
                                                        step="5"
                                                        className="w-16 bg-transparent outline-none text-[17px] font-bold text-right text-[#007AFF]"
                                                        placeholder="30"
                                                    />
                                                    <span className="text-[#8E8E93] font-medium text-xs uppercase">min</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="px-4 text-[11px] text-[#8E8E93] leading-relaxed">
                                            {t('availability_hint')}
                                        </p>
                                    </div>

                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Apple-Style Delete Confirmation Modal */}
                {showDeleteModal && serviceToDelete && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[70] p-6 animate-in fade-in duration-200">
                        <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-300 ease-out border border-white/20">
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl shadow-inner">
                                    🗑️
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                    {t('delete_service')}
                                </h3>
                                <p className="text-sm text-gray-500 font-medium px-4 leading-relaxed">
                                    {t('delete_service_confirm')} <span className="text-black font-bold">"{serviceToDelete.name}"</span>. {t('delete_user_warning')}.
                                </p>
                            </div>

                            <div className="flex flex-col divide-y divide-gray-100 border-t border-gray-100">
                                <button
                                    onClick={confirmDelete}
                                    className="w-full py-4 text-rose-500 font-bold text-[17px] active:bg-rose-50 transition-colors uppercase tracking-tight"
                                >
                                    {t('delete')}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setServiceToDelete(null);
                                    }}
                                    className="w-full py-4 text-[#007AFF] font-medium text-[17px] active:bg-gray-50 transition-colors"
                                >
                                    {t('cancel')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
