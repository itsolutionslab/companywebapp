'use client';

import { useState } from 'react';
import { SOLUTIONS } from '@/app/data/solutions';
import Link from 'next/link';
import { ArrowRight, Code, Layers, Zap, Star, Layout, ArrowLeft, Globe } from 'lucide-react';
import ContactModal from './ContactModal';

interface SolutionsShowroomProps {
    region: string;
}

export default function SolutionsShowroom({ region }: SolutionsShowroomProps) {
    const featuredSolutions = SOLUTIONS.filter(s => s.featured);
    const regularSolutions = SOLUTIONS.filter(s => !s.featured);
    const [isContactOpen, setIsContactOpen] = useState(false);

    return (
        <section className="relative py-24 bg-[#f8fafc] min-h-screen text-slate-900 overflow-hidden">
            {/* Tech Sea Background Elements */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00ff88]/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#006633]/10 rounded-full blur-[120px] animate-pulse-slow"></div>
                
                {/* Subtle Grid */}
                <div className="absolute inset-0" style={{ 
                    backgroundImage: 'radial-gradient(#00663311 1px, transparent 1px)', 
                    backgroundSize: '40px 40px' 
                }}></div>
            </div>

            <div className="container mx-auto px-6 relative z-10">
                {/* Top Navigation / Back Button */}
                <div className="flex justify-between items-center mb-16">
                    <Link 
                        href={`/${region}`}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-md border border-slate-200 text-slate-600 hover:text-[#006633] hover:border-[#006633]/30 transition-all shadow-sm group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-bold uppercase tracking-wider">Volver al Inicio</span>
                    </Link>
                    
                    <div className="flex items-center gap-2 text-slate-400">
                        <Globe className="w-4 h-4" />
                        <span className="text-[10px] font-bold tracking-widest uppercase">{region.toUpperCase()} • GLOBAL SHOWCASE</span>
                    </div>
                </div>

                {/* Header Section */}
                <div className="max-w-4xl mb-20">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#006633]/5 border border-[#006633]/10 mb-6">
                        <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-ping"></span>
                        <span className="text-[10px] font-bold tracking-[0.2em] text-[#006633] uppercase">Soluciones Industriales</span>
                    </div>
                    <h1 className="text-6xl md:text-8xl font-black font-outfit leading-none mb-8 text-slate-900 tracking-tighter">
                        Propuestas de <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#006633] to-[#00ff88]">Valor 4.0</span>
                    </h1>
                    <p className="text-xl text-slate-500 max-w-2xl leading-relaxed font-light">
                        Demos interactivas de próxima generación. Visualice el impacto real de la tecnología en su modelo de negocio antes de la primera línea de código.
                    </p>
                </div>

                {/* Featured Section - The "Hero" Card */}
                {featuredSolutions.length > 0 && (
                    <div className="mb-24 animate-float-slow">
                        <div className="grid grid-cols-1 gap-8">
                            {featuredSolutions.map((solution) => (
                                <Link 
                                    key={solution.id}
                                    href={`/${region}/soluciones/${solution.id}`}
                                    className="group relative overflow-hidden rounded-[3rem] p-[3px] shadow-[0_20px_50px_rgba(0,102,51,0.08)] hover:shadow-[0_40px_80px_rgba(0,102,51,0.12)] transition-all duration-700"
                                >
                                    {/* Rotating Comet Border Effect */}
                                    <div className="absolute inset-0 bg-slate-200"></div>
                                    <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,#3b82f6_360deg)] animate-spin-slow group-hover:animate-spin-fast"></div>
                                    
                                    <div className="relative z-10 bg-white/95 backdrop-blur-xl rounded-[2.9rem] p-8 md:p-16 h-full flex items-center">
                                        {/* Decorative Tech Elements */}
                                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                                            <Layout className="w-64 h-64 text-[#006633]" />
                                        </div>
                                        
                                        <div className="relative z-10 grid lg:grid-cols-[1fr_auto] gap-12 items-center w-full">
                                            <div>
                                                <div className="flex items-center gap-3 mb-8">
                                                    <div className="p-2 rounded-lg bg-[#00ff88] text-black">
                                                        <Star className="w-4 h-4 fill-black" />
                                                    </div>
                                                    <span className="text-xs font-black tracking-widest text-[#006633] uppercase">Proyecto Destacado</span>
                                                </div>
                                                
                                                <h3 className="text-5xl md:text-7xl font-black font-outfit mb-8 text-slate-900 group-hover:translate-x-2 transition-transform duration-500">
                                                    {solution.title}
                                                </h3>
                                                <p className="text-2xl text-slate-500 leading-relaxed mb-10 max-w-3xl font-light">
                                                    {solution.description}
                                                </p>
                                                <div className="flex items-center gap-4 text-[#006633] font-black text-xl uppercase tracking-tighter group-hover:gap-8 transition-all">
                                                    Explorar Demo Interactivo
                                                    <ArrowRight className="w-8 h-8" />
                                                </div>
                                            </div>
                                            
                                            <div className="hidden lg:flex w-72 h-72 rounded-[2.5rem] bg-gradient-to-br from-[#006633] to-[#00ff88] items-center justify-center shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-700">
                                                <Layout className="w-32 h-32 text-white" />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Regular Grid - "The Tech Sea" */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {regularSolutions.map((solution, index) => (
                        <Link 
                            key={solution.id}
                            href={`/${region}/soluciones/${solution.id}`}
                            className={`group relative perspective-1000 p-[2px] rounded-[2.6rem] overflow-hidden ${index % 2 === 0 ? 'animate-float-medium' : 'animate-float-slow'}`}
                            style={{ animationDelay: `${index * 0.5}s` }}
                        >
                            {/* Rotating Comet Border Effect */}
                            <div className="absolute inset-0 bg-slate-100"></div>
                            <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_320deg,#60a5fa_360deg)] animate-spin-slow group-hover:animate-spin-fast"></div>

                            <div className="relative z-10 h-full p-10 rounded-[2.5rem] bg-white transition-all duration-500 flex flex-col overflow-hidden">
                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-10">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-[#006633] group-hover:bg-[#006633] group-hover:text-white transition-all duration-500 shadow-sm">
                                            {index % 3 === 0 ? <Code className="w-6 h-6" /> : index % 3 === 1 ? <Layers className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                                        </div>
                                        <span className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
                                            {solution.industry}
                                        </span>
                                    </div>
                                    
                                    <h3 className="text-2xl font-black font-outfit mb-4 text-slate-800 group-hover:text-[#006633] transition-colors leading-tight">
                                        {solution.title}
                                    </h3>
                                    
                                    <p className="text-slate-500 text-sm leading-relaxed mb-10 flex-1 font-light">
                                        {solution.description}
                                    </p>

                                    <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[#006633] font-bold text-[10px] uppercase tracking-widest group-hover:gap-3 transition-all">
                                            Ver Demo
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                        <div className="flex gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#60a5fa] animate-pulse"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Footer CTA */}
                <div className="mt-32 p-16 rounded-[4rem] bg-slate-900 text-white text-center relative overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#006633]/40 to-transparent opacity-50"></div>
                    <div className="relative z-10">
                        <h3 className="text-4xl md:text-5xl font-black mb-6 font-outfit tracking-tighter">¿Desafío a Medida?</h3>
                        <p className="text-slate-400 mb-12 max-w-2xl mx-auto text-lg font-light leading-relaxed">
                            No solo construimos software, diseñamos ecosistemas digitales. Conversemos sobre su visión y hagamos una demo exclusiva para su industria.
                        </p>
                        <button 
                            onClick={() => setIsContactOpen(true)}
                            className="inline-flex items-center gap-4 px-12 py-5 bg-[#00ff88] text-black font-black rounded-full hover:scale-105 transition-transform shadow-[0_10px_30px_rgba(0,255,136,0.3)] uppercase tracking-wider"
                        >
                            AGENDAR SESIÓN ESTRATÉGICA
                            <ArrowRight className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>

            <ContactModal 
                isOpen={isContactOpen} 
                onClose={() => setIsContactOpen(false)} 
                region={region} 
                lang={region === 'pe' ? 'es' : 'en'} 
            />

            <style jsx>{`
                @keyframes float {
                    0% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-15px) rotate(1deg); }
                    100% { transform: translateY(0px) rotate(0deg); }
                }
                @keyframes float-alt {
                    0% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(-1deg); }
                    100% { transform: translateY(0px) rotate(0deg); }
                }
                .animate-float-slow {
                    animation: float 8s ease-in-out infinite;
                }
                .animate-float-medium {
                    animation: float-alt 6s ease-in-out infinite;
                }
                .animate-spin-slow {
                    animation: spin 6s linear infinite;
                }
                .animate-spin-fast {
                    animation: spin 3s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-pulse-slow {
                    animation: pulse 10s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 0.1; transform: scale(1); }
                    50% { opacity: 0.2; transform: scale(1.1); }
                }
            `}</style>
        </section>
    );
}
