import sys

with open('app/components/modern/ModernLanding.tsx', 'r') as f:
    lines = f.readlines()

new_footer = """            {/* Footer - Enterprise Minimalist Tech Design */}
            <footer className="relative bg-[#030712] pt-32 pb-12 border-t border-cyan-900/20 overflow-hidden">
                
                {/* SVG Animated Binary Waves Background */}
                <div className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen overflow-hidden">
                    <svg className="w-full h-full absolute inset-0" preserveAspectRatio="none" viewBox="0 0 1000 300" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            {/* Wave paths */}
                            <path id="wave1" d="M -500 80 Q 250 200 1000 80 T 2500 80" fill="none" />
                            <path id="wave2" d="M -500 150 Q 250 -50 1000 150 T 2500 150" fill="none" />
                            <path id="wave3" d="M -500 220 Q 250 350 1000 220 T 2500 220" fill="none" />
                            
                            <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
                                <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.8" />
                                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                            </linearGradient>
                            <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                                <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.6" />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        
                        {/* The binary texts following the waves */}
                        <text className="font-mono text-[14px] md:text-[18px] tracking-[8px] font-bold" fill="url(#waveGradient)">
                            <textPath href="#wave1" startOffset="0%">
                                <animate attributeName="startOffset" from="-50%" to="0%" dur="15s" repeatCount="indefinite" />
                                {"01011001010110100101001010101101001010100101010100101101011010110100101010".repeat(5)}
                            </textPath>
                        </text>

                        <text className="font-mono text-[10px] md:text-[14px] tracking-[12px] font-bold" fill="url(#waveGradient2)">
                            <textPath href="#wave2" startOffset="0%">
                                <animate attributeName="startOffset" from="0%" to="-50%" dur="25s" repeatCount="indefinite" />
                                {"11001010111100101001010100111010100101011100101010010100101010101110010101".repeat(5)}
                            </textPath>
                        </text>

                        <text className="font-mono text-[12px] md:text-[16px] tracking-[6px] font-bold" fill="url(#waveGradient)">
                            <textPath href="#wave3" startOffset="0%">
                                <animate attributeName="startOffset" from="-30%" to="0%" dur="20s" repeatCount="indefinite" />
                                {"10101001010100101011001010101010111010101001010100101011001010101010101011".repeat(5)}
                            </textPath>
                        </text>
                    </svg>
                    {/* Fade out edges */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#030712] via-transparent to-[#030712]"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-[#030712]"></div>
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
                    
                    {/* Massive Call to Action Header */}
                    <div className="mb-20 md:mb-32">
                        <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter uppercase mb-6 leading-[1.1]">
                            Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Innovate</span>?
                        </h2>
                        <div className="h-px w-full bg-gradient-to-r from-cyan-500/50 via-cyan-900/20 to-transparent"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8">
                        {/* Column 1: Brand & Direct Contact */}
                        <div className="md:col-span-12 lg:col-span-5">
                            <div className="flex items-center gap-3 mb-8">
                                <Image src={logoImage} alt="BRECOMPERU" width={32} height={32} className="opacity-90" />
                                <span className="font-heading font-black text-2xl text-white tracking-tight">BRECOMPERU</span>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed mb-10 max-w-md">
                                {lang === 'en' 
                                    ? 'Enterprise-grade software architecture, AI integration, and digital transformation for global industry leaders.' 
                                    : 'Arquitectura de software empresarial, integración de IA y transformación digital para líderes de la industria.'}
                            </p>
                            
                            {/* Big Email CTA */}
                            <a 
                                href="mailto:solutions@brecomperu.com" 
                                className="group flex items-center justify-between p-5 md:p-6 border border-cyan-900/40 rounded-2xl bg-slate-900/30 hover:bg-cyan-950/40 hover:border-cyan-500/50 backdrop-blur-sm transition-all duration-300 w-full max-w-md"
                            >
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-cyan-500 uppercase font-bold tracking-[0.2em] mb-1.5 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                                        Direct Contact
                                    </span>
                                    <span className="text-white font-mono text-base md:text-lg group-hover:text-cyan-300 transition-colors tracking-tight break-all">
                                        solutions@brecomperu.com
                                    </span>
                                </div>
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-cyan-900/40 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-white transition-all duration-300 flex-shrink-0 ml-4">
                                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </div>
                            </a>
                        </div>

                        {/* Column 2: Global Phones */}
                        <div className="md:col-span-6 lg:col-span-4 lg:pl-10 flex flex-col justify-center">
                            <h4 className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black mb-8">Global Support</h4>
                            <div className="space-y-8 md:space-y-10">
                                <a href="tel:+14697564476" className="group block">
                                    <span className="text-[10px] text-cyan-500 uppercase font-bold tracking-[0.15em] mb-2 block group-hover:text-cyan-400 transition-colors">US Sales & Tech</span>
                                    <span className="text-2xl md:text-3xl text-slate-300 font-mono font-medium tracking-tight group-hover:text-white transition-colors">+1 (469) 756-4476</span>
                                </a>
                                <a href="tel:+51900828470" className="group block">
                                    <span className="text-[10px] text-cyan-500 uppercase font-bold tracking-[0.15em] mb-2 block group-hover:text-cyan-400 transition-colors">Soporte Local Perú</span>
                                    <span className="text-2xl md:text-3xl text-slate-300 font-mono font-medium tracking-tight group-hover:text-white transition-colors">+51 900 828 470</span>
                                </a>
                            </div>
                        </div>

                        {/* Column 3: Navigation */}
                        <div className="md:col-span-6 lg:col-span-3 lg:pl-10 flex flex-col justify-center">
                            <h4 className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black mb-8">{t('footer-links-title')}</h4>
                            <ul className="space-y-4 md:space-y-5">
                                <li>
                                    <Link href={`/${initialRegionCode}/${lang === 'en' ? 'services' : 'servicios'}`} className="text-slate-400 hover:text-cyan-400 transition-colors text-sm font-medium tracking-wide flex items-center gap-3 group">
                                        <span className="w-4 h-[1px] bg-cyan-900 group-hover:bg-cyan-400 group-hover:w-6 transition-all"></span>
                                        {t('footer-services')}
                                    </Link>
                                </li>
                                <li>
                                    <Link href={`/${initialRegionCode}/${lang === 'en' ? 'industries' : 'industrias'}`} className="text-slate-400 hover:text-cyan-400 transition-colors text-sm font-medium tracking-wide flex items-center gap-3 group">
                                        <span className="w-4 h-[1px] bg-cyan-900 group-hover:bg-cyan-400 group-hover:w-6 transition-all"></span>
                                        {t('nav-industries')}
                                    </Link>
                                </li>
                                <li>
                                    <Link href={`/${initialRegionCode}/${lang === 'en' ? 'about' : 'nosotros'}`} className="text-slate-400 hover:text-cyan-400 transition-colors text-sm font-medium tracking-wide flex items-center gap-3 group">
                                        <span className="w-4 h-[1px] bg-cyan-900 group-hover:bg-cyan-400 group-hover:w-6 transition-all"></span>
                                        {t('footer-about')}
                                    </Link>
                                </li>
                                <li>
                                    <Link href={`/${initialRegionCode}/casos`} className="text-slate-400 hover:text-cyan-400 transition-colors text-sm font-medium tracking-wide flex items-center gap-3 group">
                                        <span className="w-4 h-[1px] bg-cyan-900 group-hover:bg-cyan-400 group-hover:w-6 transition-all"></span>
                                        {lang === 'en' ? 'Case Studies' : 'Casos de Éxito'}
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                    
                    {/* Bottom Bar */}
                    <div className="mt-24 pt-8 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-slate-500 text-xs font-mono tracking-widest">© 2026 BRECOMPERU SOLUTIONS LLC.</div>
                        <div className="flex gap-6">
                            <span className="text-slate-600 text-xs font-mono">ENCRYPTED CONNECTION</span>
                            <span className="text-cyan-900 text-xs font-mono uppercase">{regionConfig.countryCode} NODE</span>
                        </div>
                    </div>
                </div>
            </footer>\n"""

# Find lines to replace
start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if '{/* Footer - Premium Tech Bento Design */}' in line:
        start_idx = i
    if '</footer>' in line and start_idx != -1:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    new_lines = lines[:start_idx] + [new_footer] + lines[end_idx+1:]
    with open('app/components/modern/ModernLanding.tsx', 'w') as f:
        f.writelines(new_lines)
    print("Replaced successfully")
else:
    print("Could not find footer boundaries")
