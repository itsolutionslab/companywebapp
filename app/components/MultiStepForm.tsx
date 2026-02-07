'use client';

import React, { useState, useEffect } from 'react';
import { trackingService } from '../services/TrackingService';
import { LeadData } from '../types/tracking';

interface MultiStepFormProps {
    region?: string;
    onComplete?: () => void;
}

const MultiStepForm: React.FC<MultiStepFormProps> = ({ region = 'us', onComplete }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<LeadData>({
        name: '',
        email: '',
        company: '',
        phone: '',
        project_desc: '',
        service_interest: 'web-development',
        budget_range: '5k-10k',
        file_url: ''
    });
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const url = await trackingService.uploadFile(file);
            if (url) {
                setFormData(prev => ({ ...prev, file_url: url }));
                await trackingService.saveLeadDraft({ file_url: url });
                setUploadProgress(100);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    const nextStep = () => {
        trackingService.trackEvent('click_cta', { action: 'next_step', step });
        setStep(prev => prev + 1);
    };

    const submitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        trackingService.trackEvent('submit_form', { region });

        // Final save
        await trackingService.saveLeadDraft(formData);
        // Could update status to 'CONTACTED' or 'NEW_LEAD' implicitly via backend trigger or explicit here

        if (onComplete) onComplete();
    };

    return (
        <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
            {/* Progress Bar */}
            <div className="flex gap-2 mb-8">
                {[1, 2, 3].map(s => (
                    <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-cyan-500' : 'bg-slate-700'}`} />
                ))}
            </div>

            <form onSubmit={submitForm} className="space-y-6">

                {/* Step 1: Contact Info */}
                {step === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-8">
                        <h3 className="text-xl font-bold text-white mb-4">Let's start with the basics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                name="name"
                                value={formData.name}
                                onChange={handleInput}
                                onBlur={handleBlur}
                                placeholder="Full Name"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                            />
                            <input
                                name="company"
                                value={formData.company}
                                onChange={handleInput}
                                onBlur={handleBlur}
                                placeholder="Company Name"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                            />
                        </div>
                        <input
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInput}
                            onBlur={handleBlur}
                            placeholder="Work Email"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                        <input
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleInput}
                            onBlur={handleBlur}
                            placeholder="Phone Number"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                        <button type="button" onClick={nextStep} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition-all mt-4">
                            Next: Project Details →
                        </button>
                    </div>
                )}

                {/* Step 2: Project Details */}
                {step === 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-8">
                        <h3 className="text-xl font-bold text-white mb-4">Tell us about your project</h3>
                        <select
                            name="service_interest"
                            value={formData.service_interest}
                            onChange={handleInput}
                            onBlur={handleBlur}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                        >
                            <option value="web-development">Web Development</option>
                            <option value="mobile-app">Mobile App</option>
                            <option value="ai-solutions">AI Solutions</option>
                            <option value="consulting">IT Consulting</option>
                        </select>
                        <textarea
                            name="project_desc"
                            value={formData.project_desc}
                            onChange={handleInput}
                            onBlur={handleBlur}
                            placeholder="Describe your project goals, challenges, and timeline..."
                            rows={4}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none resize-none"
                        />
                        <div className="flex gap-4">
                            <button type="button" onClick={() => setStep(1)} className="w-1/3 bg-transparent border border-slate-600 text-slate-300 font-bold py-3 rounded-lg hover:bg-slate-800 transition-all">
                                Back
                            </button>
                            <button type="button" onClick={nextStep} className="w-2/3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition-all">
                                Next: Files & Review →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: File Upload & Submit */}
                {step === 3 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-8">
                        <h3 className="text-xl font-bold text-white mb-4">Any documents to share?</h3>

                        {/* File Upload Area */}
                        <div className="border-2 border-dashed border-slate-600 hover:border-cyan-500 rounded-xl p-8 text-center transition-colors relative group">
                            <input
                                type="file"
                                onChange={handleFileUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                accept=".pdf,.doc,.docx,.png,.jpg"
                            />
                            {isUploading ? (
                                <div className="text-cyan-400 font-medium">Uploading... {uploadProgress}%</div>
                            ) : formData.file_url ? (
                                <div className="flex items-center justify-center gap-2 text-green-400">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                    <span>File uploaded successfully!</span>
                                </div>
                            ) : (
                                <>
                                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400 group-hover:text-cyan-400 transition-colors">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                    </div>
                                    <p className="text-slate-300 text-sm font-medium">Click to upload or drag and drop</p>
                                    <p className="text-slate-500 text-xs mt-1">PDF, DOC, PNG, JPG up to 5MB</p>
                                </>
                            )}
                        </div>

                        <div className="flex gap-4 mt-6">
                            <button type="button" onClick={() => setStep(2)} className="w-1/3 bg-transparent border border-slate-600 text-slate-300 font-bold py-3 rounded-lg hover:bg-slate-800 transition-all">
                                Back
                            </button>
                            <button type="submit" className="w-2/3 bg-gradient-to-r from-cyan-600 to-lime-600 hover:from-cyan-500 hover:to-lime-500 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-cyan-500/25 transition-all">
                                {region === 'es' || region === 'latam' || region === 'pe' ? 'Solicitar Cotización' : 'Get Free Quote'}
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
};

export default MultiStepForm;
