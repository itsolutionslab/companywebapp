'use client';

import React, { useState, useEffect, useRef } from 'react';
import { trackingService } from '../services/TrackingService';
import { LeadData } from '../types/tracking';
import Turnstile from 'react-turnstile';

interface MultiStepFormProps {
    region?: string;
    onComplete?: () => void;
}

const SERVICES = [
    { id: 'web-development', label: 'Web Development', icon: '💻' },
    { id: 'mobile-app', label: 'Mobile App', icon: '📱' },
    { id: 'ai-solutions', label: 'AI Solutions', icon: '🤖' },
    { id: 'cloud-infra', label: 'Cloud Infra', icon: '☁️' },
    { id: 'custom-software', label: 'Custom Software', icon: '⚙️' },
    { id: 'other', label: 'Otros', icon: '✨' }
];

const MultiStepForm: React.FC<MultiStepFormProps> = ({ region = 'us', onComplete }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<LeadData>({
        name: '',
        email: '',
        company: '',
        phone: '',
        project_desc: '',
        service_interests: [],
        budget_range: '5k-10k',
        file_url: ''
    });
    const [isUploading, setIsUploading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fileName, setFileName] = useState<string>('');
    const [submitted, setSubmitted] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial setup
    useEffect(() => {
        trackingService.setRegion(region);
        trackingService.trackEvent('view_page', { step: 'form_start' });
    }, [region]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleBlur = async () => {
        // Zero Friction: Auto-save draft on blur
        if (formData.email || formData.phone) {
            await trackingService.saveLeadDraft(formData);
        }
    };

    const toggleService = (serviceId: string) => {
        setFormData(prev => {
            const current = prev.service_interests || [];
            if (current.includes(serviceId)) {
                return { ...prev, service_interests: current.filter(id => id !== serviceId) };
            } else {
                return { ...prev, service_interests: [...current, serviceId] };
            }
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation for file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert("File is too large. Max 10MB.");
            return;
        }

        setFileName(file.name);
        setIsUploading(true);
        try {
            const url = await trackingService.uploadFile(file);
            if (url) {
                setFormData(prev => ({ ...prev, file_url: url }));
                await trackingService.saveLeadDraft({ file_url: url });
            }
        } catch (error) {
            console.error(error);
            setFileName(''); // Reset on error
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveFile = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setFormData(prev => ({ ...prev, file_url: '' }));
        setFileName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const nextStep = () => {
        if (!formData.name || !formData.email || !formData.phone) {
            // Simple validation feedback could be added here
            return;
        }
        trackingService.trackEvent('click_cta', { action: 'next_step', step });
        setStep(prev => prev + 1);
    };

    const submitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!turnstileToken) {
            alert("Please complete the security check.");
            return;
        }

        setLoading(true);
        trackingService.trackEvent('submit_form', { region });

        try {
            // Final save with current status
            const finalData = { ...formData, turnstile_token: turnstileToken };
            await trackingService.saveLeadDraft(finalData);

            setSubmitted(true);
            if (onComplete) {
                setTimeout(() => onComplete(), 3000);
            }
        } catch (error) {
            console.error("Error submitting form:", error);
        } finally {
            setLoading(false);
        }
    };

    const isStep1Valid = formData.name && formData.email && formData.phone;
    const isStep2Valid = (formData.service_interests?.length || 0) > 0 && formData.project_desc && turnstileToken;

    if (submitted) {
        return (
            <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-12 shadow-2xl text-center animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                    {region === 'es' || region === 'latam' || region === 'pe' ? '¡Gracias por tu interés!' : 'Thank you for your interest!'}
                </h3>
                <p className="text-slate-400">
                    {region === 'es' || region === 'latam' || region === 'pe'
                        ? 'Hemos recibido tu información. Un consultor se pondrá en contacto contigo pronto.'
                        : "We've received your information. A consultant will get in touch with you shortly."}
                </p>
                <div className="mt-8 flex justify-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
            {/* Progress Bar */}
            <div className="flex gap-2 mb-6">
                {[1, 2].map(s => (
                    <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-cyan-500' : 'bg-slate-700'}`} />
                ))}
            </div>

            <form onSubmit={submitForm} className="space-y-6">

                {/* Step 1: Contact Info */}
                {step === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-8">
                        <h3 className="text-xl font-bold text-white mb-1">
                            {region === 'es' || region === 'latam' || region === 'pe' ? 'Empecemos con lo básico' : "Let's start with the basics"}
                        </h3>
                        <p className="text-slate-400 text-sm mb-4">
                            {region === 'es' || region === 'latam' || region === 'pe' ? 'Cuéntanos quién eres para poder contactarte.' : "Tell us who you are so we can contact you."}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                name="name"
                                value={formData.name}
                                onChange={handleInput}
                                onBlur={handleBlur}
                                placeholder={region === 'es' || region === 'latam' || region === 'pe' ? "Nombre Completo" : "Full Name"}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none placeholder:text-slate-500"
                                required
                            />
                            <input
                                name="company"
                                value={formData.company}
                                onChange={handleInput}
                                onBlur={handleBlur}
                                placeholder={region === 'es' || region === 'latam' || region === 'pe' ? "Empresa (Opcional)" : "Company Name (Optional)"}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none placeholder:text-slate-500"
                            />
                        </div>
                        <input
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInput}
                            onBlur={handleBlur}
                            placeholder={region === 'es' || region === 'latam' || region === 'pe' ? "Correo Corporativo" : "Work Email"}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none placeholder:text-slate-500"
                            required
                        />
                        <input
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleInput}
                            onBlur={handleBlur}
                            placeholder={region === 'es' || region === 'latam' || region === 'pe' ? "Teléfono / WhatsApp" : "Phone Number"}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none placeholder:text-slate-500"
                            required
                        />
                        <button
                            type="button"
                            onClick={nextStep}
                            disabled={!isStep1Valid}
                            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all mt-4 flex items-center justify-center gap-2"
                        >
                            {region === 'es' || region === 'latam' || region === 'pe' ? 'Siguiente: Detalles del Proyecto' : 'Next: Project Details'} →
                        </button>
                    </div>
                )}

                {/* Step 2: Project Details */}
                {step === 2 && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-right-8">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-3">
                                {region === 'es' || region === 'latam' || region === 'pe' ? '¿Qué servicios necesitas?' : "What services do you need?"}
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {SERVICES.map(service => (
                                    <button
                                        key={service.id}
                                        type="button"
                                        onClick={() => toggleService(service.id)}
                                        className={`
                                            p-3 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 min-h-[80px]
                                            ${(formData.service_interests || []).includes(service.id)
                                                ? 'border-cyan-400 bg-cyan-400/10 text-white shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                                                : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:bg-slate-800'
                                            }
                                        `}
                                    >
                                        <div className="text-2xl">{service.icon}</div>
                                        <div className="text-[10px] sm:text-xs font-bold text-center leading-tight">{service.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-white mb-3">
                                {region === 'es' || region === 'latam' || region === 'pe' ? 'Cuéntanos sobre tu proyecto' : "Tell us about your project"}
                            </h3>
                            <div className="relative group">
                                <textarea
                                    name="project_desc"
                                    value={formData.project_desc}
                                    onChange={handleInput}
                                    onBlur={handleBlur}
                                    placeholder={region === 'es' || region === 'latam' || region === 'pe' ? "Describe tus objetivos, desafíos y tiempos estimados..." : "Describe your project goals, challenges, and timeline..."}
                                    rows={5}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 pb-10 text-white focus:ring-2 focus:ring-cyan-500 outline-none resize-none placeholder:text-slate-500"
                                    required
                                />
                                {/* Inline File Upload Button */}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="absolute right-3 bottom-3 p-2 bg-slate-700/50 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 rounded-full transition-all"
                                    title="Attach File"
                                >
                                    {isUploading ? (
                                        <span className="block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                        </svg>
                                    )}
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip"
                                />
                            </div>

                            {/* File Status Display */}
                            {fileName && (
                                <div className="mt-2 flex items-center gap-2 text-xs bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700 inline-flex animate-in fade-in slide-in-from-top-1">
                                    <span className="text-cyan-400">📄</span>
                                    <span className="text-slate-300 truncate max-w-[200px]">{fileName}</span>
                                    <button
                                        type="button"
                                        onClick={handleRemoveFile}
                                        className="ml-1 text-slate-500 hover:text-red-400 transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Turnstile & Submit */}
                        <div className="pt-2">
                            <div className="mb-4 flex justify-center">
                                <Turnstile
                                    sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                                    onVerify={(token) => setTurnstileToken(token)}
                                    theme="dark"
                                />
                            </div>

                            <div className="flex gap-4">
                                <button type="button" onClick={() => setStep(1)} className="w-1/3 bg-transparent border border-slate-600 text-slate-300 font-bold py-3 rounded-lg hover:bg-slate-800 transition-all">
                                    ← {region === 'es' || region === 'latam' || region === 'pe' ? 'Atrás' : 'Back'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || isUploading || !isStep2Valid}
                                    className="w-2/3 bg-gradient-to-r from-cyan-600 to-lime-600 hover:from-cyan-500 hover:to-lime-500 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                                    {region === 'es' || region === 'latam' || region === 'pe' ? 'Solicitar Cotización' : 'Get Free Quote'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
};

export default MultiStepForm;
