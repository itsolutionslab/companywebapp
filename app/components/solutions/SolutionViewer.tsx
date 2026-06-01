'use client';

import { useState, useEffect, Suspense } from 'react';
import { SolutionDemo } from '@/app/data/solutions';
import { Monitor, Smartphone, Tablet, ExternalLink, ChevronLeft, Send, Layout, Maximize2, Minimize2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import ContactModal from './ContactModal';

interface SolutionViewerProps {
    solution: SolutionDemo;
    region: string;
}

function ViewerContent({ solution, region }: SolutionViewerProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    const [isContactOpen, setIsContactOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showExitButton, setShowExitButton] = useState(true);
    const [showContextCard, setShowContextCard] = useState(true);

    // Automatically hide the info card after 10 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowContextCard(false);
        }, 10000);

        return () => clearTimeout(timer);
    }, []);

    // Get demo from URL or fallback to entryFile
    const currentDemo = searchParams.get('demo') || solution.entryFile;

    const toggleFullscreen = async () => {
        const container = document.getElementById('viewer-container');
        if (!container) return;

        try {
            if (!document.fullscreenElement) {
                if (container.requestFullscreen) {
                    await container.requestFullscreen();
                } else if ((container as any).webkitRequestFullscreen) {
                    await (container as any).webkitRequestFullscreen();
                } else if ((container as any).msRequestFullscreen) {
                    await (container as any).msRequestFullscreen();
                }
                setIsFullscreen(true);
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if ((document as any).webkitExitFullscreen) {
                    await (document as any).webkitExitFullscreen();
                } else if ((document as any).msExitFullscreen) {
                    await (document as any).msExitFullscreen();
                }
                setIsFullscreen(false);
            }
        } catch (err) {
            console.error('Error toggling fullscreen:', err);
            // Fallback for browsers that block native fullscreen or lack support (e.g. iOS Safari)
            setIsFullscreen(!isFullscreen);
        }
    };

    // Listen to native fullscreen changes (e.g., ESC key press)
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(
                !!document.fullscreenElement ||
                !!(document as any).webkitFullscreenElement ||
                !!(document as any).mozFullScreenElement ||
                !!(document as any).msFullscreenElement
            );
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, []);

    // Auto-hide Exit Fullscreen button on inactivity
    useEffect(() => {
        if (!isFullscreen) return;

        let timeoutId: NodeJS.Timeout;

        const showButtonBriefly = () => {
            setShowExitButton(true);
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                setShowExitButton(false);
            }, 3000);
        };

        // Show it initially
        showButtonBriefly();

        window.addEventListener('mousemove', showButtonBriefly);
        window.addEventListener('touchstart', showButtonBriefly);

        return () => {
            window.removeEventListener('mousemove', showButtonBriefly);
            window.removeEventListener('touchstart', showButtonBriefly);
            clearTimeout(timeoutId);
        };
    }, [isFullscreen]);

    const iframeSrc = `/soluciones/${solution.path}/${currentDemo}`;

    const handleDemoChange = (demoFile: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('demo', demoFile);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const viewWidths = {
        desktop: '100%',
        tablet: '768px',
        mobile: '375px'
    };

    const viewHeights = {
        desktop: '100%',
        tablet: '1024px',
        mobile: '667px'
    };

    return (
        <div className="flex flex-col h-screen bg-[#f8fafc] text-slate-900 font-outfit overflow-hidden">
            {/* Header Control Bar - Fully Responsive */}
            <header className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4 bg-white/90 backdrop-blur-md border-b border-slate-200 z-50 shadow-sm">
                <div className="flex items-center gap-3 md:gap-6 min-w-0">
                    <Link
                        href={`/${region}/soluciones`}
                        className="flex items-center justify-center w-10 h-10 md:w-auto md:px-4 md:py-2 rounded-xl bg-slate-100 md:bg-transparent text-slate-500 hover:text-[#006633] transition-colors group"
                        title="Volver al Showroom"
                    >
                        <ChevronLeft className="w-6 h-6 md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="hidden md:inline text-sm font-bold uppercase tracking-wider ml-1">Showroom</span>
                    </Link>

                    <div className="hidden sm:block h-8 w-px bg-slate-200"></div>

                    <div className="min-w-0 truncate">
                        <h1 className="text-sm md:text-xl font-black text-slate-900 leading-tight truncate">{solution.title}</h1>
                        <p className="text-[9px] md:text-[10px] text-[#006633] font-bold uppercase tracking-[0.1em] md:tracking-[0.2em]">{solution.industry}</p>
                    </div>
                </div>

                {/* Device Switcher - Hidden on Mobile */}
                <div className="hidden lg:flex items-center bg-slate-100 rounded-2xl p-1 border border-slate-200">
                    {(['desktop', 'tablet', 'mobile'] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${viewMode === mode ? 'bg-white text-[#006633] shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {mode === 'desktop' && <Monitor className="w-4 h-4" />}
                            {mode === 'tablet' && <Tablet className="w-4 h-4" />}
                            {mode === 'mobile' && <Smartphone className="w-4 h-4" />}
                            <span className="text-xs font-bold uppercase">{mode}</span>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <button
                        onClick={toggleFullscreen}
                        className="p-2.5 rounded-xl bg-[#EAF207] text-[#006633] border border-[#006633]/20 hover:bg-[#006633] hover:text-white transition-all flex items-center gap-2 group animate-pulse-glow"
                        title="Ver en pantalla completa"
                    >
                        <Maximize2 className="w-5 h-5 text-[#006633] group-hover:text-white transition-colors" />
                        <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Pantalla Completa</span>
                    </button>

                    <a
                        href={iframeSrc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden sm:flex p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                        title="Abrir en pestaña nueva"
                    >
                        <ExternalLink className="w-5 h-5" />
                    </a>
                    <button
                        onClick={() => setIsContactOpen(true)}
                        className="flex items-center gap-2 px-4 md:px-8 py-2.5 md:py-3 rounded-xl bg-[#006633] text-white font-black text-[10px] md:text-xs uppercase tracking-widest hover:scale-105 hover:bg-[#00552b] transition-all shadow-lg shadow-[#006633]/20 whitespace-nowrap"
                    >
                        <span className="hidden md:inline text-white">INICIAR PROYECTO</span>
                        <span className="md:hidden text-white">KICK OFF</span>
                        <Send className="w-3.5 h-3.5 text-white" />
                    </button>
                </div>
            </header>

            {/* Sub-menu for multiple demos */}
            {solution.demos && solution.demos.length > 0 && (
                <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-2 overflow-x-auto no-scrollbar flex items-center gap-2">
                    <div className="flex items-center gap-1 min-w-max">
                        {solution.demos.map((demo) => (
                            <button
                                key={demo.file}
                                onClick={() => handleDemoChange(demo.file)}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${currentDemo === demo.file
                                    ? 'bg-[#00ff88]/10 text-[#006633] border border-[#006633]/20 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent'
                                    }`}
                            >
                                {demo.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Viewer Area - Adaptive Container */}
            <main className="flex-1 overflow-hidden relative flex items-center justify-center p-2 md:p-12 bg-slate-50">
                {/* Tech Background Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#006633 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

                <div
                    id="viewer-container"
                    className={`transition-all duration-700 ease-[cubic-bezier(0.23, 1, 0.32, 1)] bg-white overflow-hidden relative ${isFullscreen
                        ? 'fixed inset-0 w-screen h-screen z-[9999] border-none rounded-none'
                        : 'rounded-2xl md:rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.1)] border-4 md:border-[16px] border-slate-900'
                        }`}
                    style={isFullscreen ? {
                        width: '100vw',
                        height: '100vh',
                        maxWidth: '100vw',
                        maxHeight: '100vh',
                    } : {
                        width: viewWidths[viewMode],
                        height: viewMode === 'desktop' ? '100%' : viewHeights[viewMode],
                        maxWidth: '100%',
                        maxHeight: '100%'
                    }}
                >
                    {/* Premium Floating Exit Button - Dynamic Island Style */}
                    {isFullscreen && (
                        <button
                            onClick={toggleFullscreen}
                            className={`absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-950/90 border border-white/10 shadow-2xl transition-all duration-300 font-outfit backdrop-blur-md active:scale-95 group ${showExitButton
                                ? 'opacity-100 translate-y-0 scale-100'
                                : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'
                                }`}
                            title="Salir de pantalla completa"
                        >
                            <Minimize2 className="w-4 h-4 text-[#00ff88] group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Salir Pantalla Completa</span>
                        </button>
                    )}

                    {/* Device Camera / Speaker Detail - Hidden on small mobile frames or when in fullscreen */}
                    {!isFullscreen && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 md:w-32 h-4 md:h-6 bg-slate-900 rounded-b-xl md:rounded-b-2xl z-20 flex items-center justify-center gap-1 md:gap-2">
                            <div className="w-6 md:w-8 h-1 bg-white/10 rounded-full"></div>
                            <div className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-white/20"></div>
                        </div>
                    )}

                    <iframe
                        src={iframeSrc}
                        className="w-full h-full border-none"
                        title={solution.title}
                        key={currentDemo} // Key forces iframe reload when switching demos
                    />
                </div>

                {/* Information Floating Card - Desktop Only */}
                <div
                    className={`absolute bottom-12 right-12 max-w-xs hidden xl:block transition-all duration-1000 ease-in-out ${showContextCard && !isFullscreen
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 translate-y-12 pointer-events-none'
                        }`}
                >
                    <div className="p-8 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl animate-bounce-slow">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-2 h-2 rounded-full bg-[#00ff88]"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#006633]">Contexto de la Solución</span>
                        </div>
                        <h3 className="text-xl font-black mb-3">¿Qué estamos viendo?</h3>
                        <p className="text-sm text-slate-500 leading-relaxed font-light">
                            {solution.description}
                        </p>
                        <div className="mt-6 flex flex-wrap gap-2">
                            {solution.tags.map(tag => (
                                <span key={tag} className="px-3 py-1 rounded-full bg-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            <ContactModal
                isOpen={isContactOpen}
                onClose={() => setIsContactOpen(false)}
                region={region}
                lang={region === 'pe' ? 'es' : 'en'}
            />

            <style jsx>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 4s ease-in-out infinite;
                }
                @keyframes pulse-glow {
                    0%, 100% {
                        box-shadow: 0 0 0 0 rgba(0, 102, 51, 0.4);
                        transform: scale(1);
                    }
                    50% {
                        box-shadow: 0 0 15px 4px rgba(0, 102, 51, 0.2);
                        transform: scale(1.03);
                    }
                }
                .animate-pulse-glow {
                    animation: pulse-glow 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}

export default function SolutionViewer(props: SolutionViewerProps) {
    return (
        <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-[#f8fafc]"><div className="w-8 h-8 border-4 border-[#006633] border-t-transparent rounded-full animate-spin"></div></div>}>
            <ViewerContent {...props} />
        </Suspense>
    );
}
