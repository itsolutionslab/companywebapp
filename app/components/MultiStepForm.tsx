'use client';

import React, { useState, useEffect, useRef } from 'react';
import { trackingService } from '../services/TrackingService';
import { LeadData } from '../types/tracking';
import { translations } from '../data/translations';
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
    const t = (key: string) => {
        const regionalKey = region === 'pe' ? `${key}-peru` : key;
        return (translations as any)[region === 'us' ? 'en' : 'es'][regionalKey] || (translations as any)[region === 'us' ? 'en' : 'es'][key] || key;
    };

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<LeadData>({
        name: '',
        email: '',
        company: '',
        website: '',
        role: '',
        objectives: [],
        stage: '',
        timeline: '',
        investment_level: '',
        impact: '',
        decision_maker: '',
        file_url: ''
    });
    const [isUploading, setIsUploading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fileName, setFileName] = useState<string>('');
    const [submitted, setSubmitted] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLDivElement>(null);

    // Initial setup
    useEffect(() => {
        trackingService.setRegion(region);
        trackingService.trackEvent('view_page', { step: `strategic_form_step_${step}` });

        // Auto-scroll to top of form on step change (Mobile Optimization)
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [region, step]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleBlur = async () => {
        if (formData.email || formData.name) {
            await trackingService.saveLeadDraft(formData);
        }
    };

    const toggleObjective = (id: string) => {
        setFormData(prev => {
            const current = prev.objectives || [];
            if (current.includes(id)) {
                return { ...prev, objectives: current.filter(o => o !== id) };
            } else {
                return { ...prev, objectives: [...current, id] };
            }
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert("File is too large. Max 5MB.");
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
            setFileName('');
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
            const finalData = {
                ...formData,
                turnstile_token: turnstileToken,
                lead_id: localStorage.getItem('current_lead_id'), // Send the draft ID if it exists
                // Include telemetry/audit data
                kpis: {
                    session_duration: (Date.now() - (window as any).startTime || Date.now()) / 1000,
                    clicks_count: (window as any).clicksCount || 0
                }
            };

            const response = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to submit lead');
            }

            setSubmitted(true);
            trackingService.resetLead();
            if (onComplete) {
                setTimeout(() => onComplete(), 5000);
            }
        } catch (error) {
            console.error("Error submitting form:", error);
            alert("Hubo un error al enviar el formulario. Por favor, inténtalo de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    const isStep1Valid = formData.name && formData.email && formData.company && formData.role;
    const isStep2Valid = (formData.objectives?.length || 0) > 0 && formData.stage && formData.timeline;
    const isStep3Valid = formData.investment_level && formData.impact && formData.decision_maker && turnstileToken;

    if (submitted) {
        return (
            <div className="card-glass border border-white/10 rounded-[2rem] p-8 md:p-12 shadow-2xl text-center animate-in fade-in zoom-in duration-700">
                <div className="w-24 h-24 bg-gradient-to-tr from-cyan-500/20 to-lime-500/20 rounded-full flex items-center justify-center mx-auto mb-8 relative border border-cyan-500/30">
                    <div className="absolute inset-0 bg-cyan-500/10 blur-xl rounded-full animate-pulse"></div>
                    <svg className="w-12 h-12 text-cyan-400 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-3xl font-heading font-black text-white mb-4 leading-tight">
                    {t('form-success-title')}
                </h3>
                <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-lg mx-auto">
                    {t('form-success-desc')}
                </p>
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8"></div>
                <p className="text-slate-500 text-sm italic max-w-md mx-auto">
                    {t('form-success-footer')}
                </p>
            </div>
        );
    }

    return (
        <div ref={formRef} className="card-glass border border-white/10 rounded-[2.5rem] p-1 shadow-2xl overflow-hidden scroll-mt-24">
            <div className="p-6 md:p-10 space-y-8">
                {/* Progress Bar */}
                <div className="space-y-3">
                    <div className="flex justify-between items-end px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500">
                            Assessment Progress
                        </span>
                        <span className="text-[10px] font-black text-slate-500">
                            STEP {step} OF 3
                        </span>
                    </div>
                    <div className="flex gap-2 h-1.5">
                        {[1, 2, 3].map(s => (
                            <div key={s} className="flex-1 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-700 ease-out ${s === step ? 'bg-gradient-to-r from-cyan-500 to-lime-500' : s < step ? 'bg-cyan-500/40' : 'bg-transparent'}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <form onSubmit={submitForm} className="space-y-8">
                    {/* Step 1: Identity & Role */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-heading font-black text-white leading-tight">
                                    {t('form-step1-title')}
                                </h3>
                                <p className="text-slate-400 text-sm max-w-md">
                                    {t('form-step1-subtitle')}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('form-name-label')}</label>
                                    <input
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInput}
                                        onBlur={handleBlur}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('form-email-label')}</label>
                                    <input
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleInput}
                                        onBlur={handleBlur}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('form-company-label')}</label>
                                    <input
                                        name="company"
                                        value={formData.company}
                                        onChange={handleInput}
                                        onBlur={handleBlur}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('form-website-label')}</label>
                                    <input
                                        name="website"
                                        value={formData.website}
                                        onChange={handleInput}
                                        onBlur={handleBlur}
                                        placeholder="https://..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('form-role-label')}</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {['ceo', 'cto', 'lead', 'po', 'advisor', 'other'].map(roleId => (
                                        <button
                                            key={roleId}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, role: roleId }))}
                                            className={`p-4 rounded-xl border text-[11px] font-bold transition-all ${formData.role === roleId ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10'}`}
                                        >
                                            {t(`form-role-${roleId}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={nextStep}
                                disabled={!isStep1Valid}
                                className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl transition-all mt-4 flex items-center justify-center gap-3 shadow-xl shadow-cyan-900/20 group"
                            >
                                {t('form-next-step')}
                            </button>
                        </div>
                    )}

                    {/* Step 2: Strategic Goals */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-heading font-black text-white leading-tight">
                                    {t('form-step2-title')}
                                </h3>
                                <p className="text-slate-400 text-sm max-w-md">
                                    {t('form-step2-subtitle')}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('form-objective-label')}</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {['new', 'modernize', 'scale', 'automate', 'cloud', 'ai', 'audit', 'other'].map(objId => (
                                        <button
                                            key={objId}
                                            type="button"
                                            onClick={() => toggleObjective(objId)}
                                            className={`flex items-center gap-3 px-5 py-4 rounded-xl border text-xs font-bold transition-all text-left ${formData.objectives?.includes(objId) ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${formData.objectives?.includes(objId) ? 'bg-cyan-500 border-cyan-500' : 'border-white/20'}`}>
                                                {formData.objectives?.includes(objId) && <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                                            </div>
                                            {t(`form-obj-${objId}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('form-stage-label')}</label>
                                    <div className="space-y-2">
                                        {['idea', 'reqs', 'mvp', 'scaling', 'legacy'].map(stageId => (
                                            <button
                                                key={stageId}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, stage: stageId }))}
                                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-bold transition-all text-left ${formData.stage === stageId ? 'bg-lime-500/10 border-lime-500 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${formData.stage === stageId ? 'bg-lime-500 border-lime-500' : 'border-white/20'}`}>
                                                    {formData.stage === stageId && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                                </div>
                                                {t(`form-stage-${stageId}`)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('form-timeline-label')}</label>
                                    <div className="space-y-2">
                                        {['now', '1-3', '3-6', 'explore'].map(timeId => (
                                            <button
                                                key={timeId}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, timeline: timeId }))}
                                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-bold transition-all text-left ${formData.timeline === timeId ? 'bg-cyan-500/10 border-cyan-500 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${formData.timeline === timeId ? 'bg-cyan-500 border-cyan-500' : 'border-white/20'}`}>
                                                    {formData.timeline === timeId && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                                </div>
                                                {t(`form-time-${timeId}`)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setStep(1)} className="flex-1 bg-white/5 border border-white/10 text-slate-300 font-black py-5 rounded-2xl hover:bg-white/10 transition-all uppercase text-[11px] tracking-widest">
                                    Atrás
                                </button>
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    disabled={!isStep2Valid}
                                    className="flex-[2] bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-cyan-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase text-[11px] tracking-widest"
                                >
                                    Siguiente paso
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Investment & Impact */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-heading font-black text-white leading-tight">
                                    {t('form-step3-title')}
                                </h3>
                                <p className="text-slate-400 text-sm max-w-md">
                                    {t('form-step3-subtitle')}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('form-investment-label')}</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                    {['low', 'mid', 'high', 'ultra', 'guidance'].map(invId => (
                                        <button
                                            key={invId}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, investment_level: invId }))}
                                            className={`p-4 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all ${formData.investment_level === invId ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                                        >
                                            {t(`form-inv-${invId}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('form-impact-label')}</label>
                                <div className="relative group">
                                    <textarea
                                        name="impact"
                                        value={formData.impact}
                                        onChange={handleInput}
                                        onBlur={handleBlur}
                                        placeholder={t('form-impact-placeholder')}
                                        rows={4}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 pb-12 text-white focus:ring-2 focus:ring-cyan-500/50 outline-none resize-none transition-all placeholder:text-slate-600 leading-relaxed"
                                        required
                                    />
                                    <div className="absolute right-4 bottom-4 flex items-center gap-3">
                                        {fileName && (
                                            <div className="flex items-center gap-2 text-[10px] font-black bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-3 py-1.5 rounded-full animate-in fade-in slide-in-from-bottom-2">
                                                <span className="truncate max-w-[120px]">{fileName}</span>
                                                <button type="button" onClick={handleRemoveFile} className="hover:text-white transition-colors">✕</button>
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                            className="w-10 h-10 bg-white/20 hover:bg-cyan-500/50 border border-cyan-500/50 rounded-full flex items-center justify-center group shadow-lg z-50"
                                            title="Attach Contextual File"
                                        >
                                            {isUploading ? (
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            ) : (
                                                "📎"
                                            )}
                                        </button>
                                    </div>
                                    <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('form-decision-label')}</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {['yes', 'part', 'info'].map(decId => (
                                        <button
                                            key={decId}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, decision_maker: decId }))}
                                            className={`p-4 rounded-xl border text-[11px] font-bold transition-all text-center ${formData.decision_maker === decId ? 'bg-lime-500/10 border-lime-500 text-lime-400' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                                        >
                                            {t(`form-dec-${decId}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 space-y-6">
                                <div className="flex justify-center scale-90 origin-center">
                                    <Turnstile
                                        key="stable-turnstile"
                                        sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                                        onVerify={(token) => setTurnstileToken(token)}
                                        theme="dark"
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <button type="button" onClick={() => setStep(2)} className="flex-1 bg-white/5 border border-white/10 text-slate-300 font-black py-5 rounded-2xl hover:bg-white/10 transition-all uppercase text-[11px] tracking-widest">
                                        {region === 'es' || region === 'latam' || region === 'pe' ? 'Atrás' : 'Back'}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading || isUploading || !isStep3Valid}
                                        className="flex-[2] bg-gradient-to-r from-cyan-600 to-lime-600 hover:from-cyan-500 hover:to-lime-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-cyan-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase text-[11px] tracking-widest"
                                    >
                                        {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                        {t('form-submit')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default MultiStepForm;
