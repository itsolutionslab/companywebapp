'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { translations } from '../../data/translations';
import logoImage from '../../assets/bpLogoNameW.png';
import WorldMap from '../WorldMap';
import { ContactActions, ContactList } from './ContactActions';
import { useContactRegion } from '../../context/RegionContext';
import { trackConversion } from '../../lib/analytics';
import MultiStepForm from '../MultiStepForm';
import { trackingService } from '../../services/TrackingService';

type Props = {
    region?: string;
    scrollTarget?: string;
    customHero?: {
        title: React.ReactNode;
        description: string;
    };
};

const ModernLanding = ({ region: initialRegionCode = 'us', scrollTarget, customHero }: Props) => {
    const { region: regionConfig } = useContactRegion();

    // Default language based on region
    const defaultLang = initialRegionCode === 'us' ? 'en' : 'es';
    const [lang, setLang] = useState<'en' | 'es'>(defaultLang);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrollDepth, setScrollDepth] = useState(0);
    const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success'>('idle');

    const heroImages = [
        '/images/hero/strategy.png',
        '/images/hero/office.png',
        '/images/hero/logistics.png',
        '/images/hero/tech_hub.png',
        '/images/hero/finance.png',
        '/images/hero/data_center.png'
    ];

    // Update lang when region changes
    useEffect(() => {
        const newLang = initialRegionCode === 'us' ? 'en' : 'es';
        setLang(newLang);
    }, [initialRegionCode]);

    // Analytics & Tracking Initialization
    useEffect(() => {
        trackingService.setRegion(initialRegionCode);
        trackingService.trackEvent('view_page', { section: 'hero', region: initialRegionCode });
    }, [initialRegionCode]);

    const scrollToContact = () => {
        const contactId = lang === 'en' ? 'contact' : 'contacto';
        trackingService.trackEvent('click_cta', { action: 'scroll_to_contact' });
        document.getElementById(contactId)?.scrollIntoView({ behavior: 'smooth' });
    };

    // Scroll-driven content transitions and tracking
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        const handleScroll = () => {
            const scrollY = window.scrollY;
            const windowHeight = window.innerHeight;
            const docHeight = document.documentElement.scrollHeight;
            const progress = Math.min(scrollY / (windowHeight * 2), 1);
            setScrollProgress(progress);

            // Change image based on scroll sections
            const imageIndex = Math.floor(progress * heroImages.length);
            setCurrentImageIndex(Math.min(imageIndex, heroImages.length - 1));

            // Scroll depth tracking
            const depth = Math.round((scrollY / (docHeight - windowHeight)) * 100);
            setScrollDepth(prev => {
                if (depth > prev + 25) { // Track every 25% depth
                    const newDepth = Math.floor(depth / 25) * 25;
                    clearTimeout(timeoutId);
                    timeoutId = setTimeout(() => {
                        trackConversion('scroll_depth', { depth: `${newDepth}%` });
                    }, 1000);
                    return newDepth;
                }
                return prev;
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(timeoutId);
        };
    }, [heroImages.length]);

    // Scroll to target section on mount if provided
    useEffect(() => {
        if (scrollTarget) {
            const element = document.getElementById(scrollTarget);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth' });
                }, 500); // Give some time for the page to render
            }
        }
    }, [scrollTarget]);

    // Scroll-reveal Intersection Observer
    useEffect(() => {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-reveal');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        const sections = document.querySelectorAll('section');
        sections.forEach(section => observer.observe(section));

        return () => {
            sections.forEach(section => observer.unobserve(section));
        };
    }, []);

    // Translation helper
    const t = (key: string) => {
        // @ts-ignore - Allow dynamic translation keys
        return translations[lang][key] || key;
    };

    const toggleLang = (newLang: 'en' | 'es') => {
        setLang(newLang);
        document.documentElement.lang = newLang;
    };

    return (
        <div className="font-body gradient-primary text-white overflow-x-hidden scroll-smooth">
            {/* Scroll-driven Background Images */}
            <div className="fixed inset-0 -z-10">
                {heroImages.map((img, idx) => (
                    <div
                        key={img}
                        className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
                        style={{
                            opacity: currentImageIndex === idx ? 0.3 : 0,
                        }}
                    >
                        <Image
                            src={img}
                            alt={t('all-rights')}
                            fill
                            sizes="100vw"
                            className="object-cover"
                            priority={idx === 0}
                            quality={90}
                        />
                    </div>
                ))}
                {/* Dark overlay for better text contrast */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/80 via-[#0f172a]/70 to-[#0f172a] backdrop-blur-sm"></div>
            </div>



            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 nav-blur border-b border-white/5" aria-label="Global">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 md:h-20">
                        {/* Logo */}
                        <div className="flex items-center gap-1 sm:gap-1.5">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center flex-shrink-0">
                                <Image
                                    src={logoImage}
                                    alt="BRECOMPERU"
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <span className="font-heading font-black text-base sm:text-lg md:text-xl lg:text-2xl tracking-tighter text-white whitespace-nowrap">BRECOMPERU</span>
                        </div>

                        {/* Desktop Navigation - Middle (hidden on mobile) */}
                        <div className="hidden md:flex items-center gap-4 lg:gap-6 xl:gap-8 overflow-hidden">
                            <ul className="flex items-center gap-3 lg:gap-6 xl:gap-8 list-none m-0 p-0">
                                <li>
                                    <Link
                                        href={`/${initialRegionCode}/${lang === 'en' ? 'industries' : 'industrias'}`}
                                        className="text-slate-400 hover:text-cyan-400 transition-colors text-[9px] lg:text-[10px] font-black tracking-[0.2em] xl:tracking-[0.3em] uppercase"
                                        title={t('nav-industries')}
                                    >
                                        {t('nav-industries')}
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href={`/${initialRegionCode}/${lang === 'en' ? 'services' : 'servicios'}`}
                                        className="text-slate-400 hover:text-cyan-400 transition-colors text-[9px] lg:text-[10px] font-black tracking-[0.2em] xl:tracking-[0.3em] uppercase"
                                        title={t('nav-services')}
                                    >
                                        {t('nav-services')}
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href={`/${initialRegionCode}/${lang === 'en' ? 'about' : 'nosotros'}`}
                                        className="text-slate-400 hover:text-cyan-400 transition-colors text-[9px] lg:text-[10px] font-black tracking-[0.2em] xl:tracking-[0.3em] uppercase"
                                        title={t('nav-about')}
                                    >
                                        {t('nav-about')}
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href={`/${initialRegionCode}/${lang === 'en' ? 'contact' : 'contacto'}`}
                                        className="text-slate-400 hover:text-cyan-400 transition-colors text-[9px] lg:text-[10px] font-black tracking-[0.2em] xl:tracking-[0.3em] uppercase"
                                        title={t('nav-contact')}
                                    >
                                        {t('nav-contact')}
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Actions Row (Right) */}
                        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                            {/* Call Button - Hidden on mobile/tablet, shown on desktop (md+) */}
                            <div className="hidden md:block">
                                <ContactActions className="px-3 md:px-4 lg:px-5 py-1.5 md:py-2 lg:py-2.5 text-[9px] md:text-[10px] lg:text-xs xl:text-sm" lang={lang} />
                            </div>

                            {/* Language Selector */}
                            <div className="flex gap-0.5 p-0.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-md">
                                <button
                                    onClick={() => toggleLang('en')}
                                    className={`px-1.5 py-0.5 md:px-2 md:py-1 rounded-md text-[9px] md:text-[10px] font-bold transition-all ${lang === 'en' ? 'bg-cyan-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    EN
                                </button>
                                <button
                                    onClick={() => toggleLang('es')}
                                    className={`px-1.5 py-0.5 md:px-2 md:py-1 rounded-md text-[9px] md:text-[10px] font-bold transition-all ${lang === 'es' ? 'bg-cyan-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    ES
                                </button>
                            </div>

                            {/* Mobile Menu Button - MD:HIDDEN */}
                            <button
                                className="md:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-white transition-colors hover:bg-white/10"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                aria-label="Menu"
                            >
                                ☰
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Popup */}
            {mobileMenuOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-[70] md:hidden" onClick={() => setMobileMenuOpen(false)}></div>

                    {/* Elegant Popup Menu */}
                    <div className="fixed top-16 bg-[#0a0c37]/55 right-4 z-[80] md:hidden animate-fade-in">
                        <div className="card-glass bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-64 overflow-hidden">
                            {/* Navigation Links */}
                            <nav className="p-4 space-y-1">
                                <Link
                                    href={`/${initialRegionCode}/${lang === 'en' ? 'industries' : 'industrias'}`}
                                    className="block px-4 py-3 text-white hover:bg-cyan-500/10 hover:text-cyan-400 rounded-xl transition-all font-medium text-sm border border-transparent hover:border-cyan-500/20"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {t('nav-industries')}
                                </Link>
                                <Link
                                    href={`/${initialRegionCode}/${lang === 'en' ? 'services' : 'servicios'}`}
                                    className="block px-4 py-3 text-white hover:bg-cyan-500/10 hover:text-cyan-400 rounded-xl transition-all font-medium text-sm border border-transparent hover:border-cyan-500/20"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {t('nav-services')}
                                </Link>
                                <Link
                                    href={`/${initialRegionCode}/${lang === 'en' ? 'about' : 'nosotros'}`}
                                    className="block px-4 py-3 text-white hover:bg-cyan-500/10 hover:text-cyan-400 rounded-xl transition-all font-medium text-sm border border-transparent hover:border-cyan-500/20"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {t('nav-about')}
                                </Link>
                                <Link
                                    href={`/${initialRegionCode}/${lang === 'en' ? 'contact' : 'contacto'}`}
                                    className="block px-4 py-3 text-white hover:bg-cyan-500/10 hover:text-cyan-400 rounded-xl transition-all font-medium text-sm border border-transparent hover:border-cyan-500/20"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {t('nav-contact')}
                                </Link>
                            </nav>
                        </div>
                    </div>
                </>
            )}



            {/* Hero Section - Industrial-Tech Noir */}
            <section className="relative min-h-screen flex items-center pt-24 md:pt-24 lg:pt-0 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
                    <div className="grid lg:grid-cols-[1.5fr_1fr] gap-12 items-center">
                        <div className="animate-fade-in">
                            {customHero ? (
                                <>
                                    <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-black leading-none mb-8 text-white tracking-tighter uppercase">
                                        {customHero.title}
                                    </h1>
                                    <p className="text-slate-400 text-xl md:text-2xl leading-relaxed mb-10 max-w-2xl font-light border-l-2 border-cyan-500/30 pl-6">
                                        {customHero.description}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/50 border border-slate-700 mb-8 backdrop-blur-sm">
                                        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                                        <span className="text-slate-300 text-xs font-bold tracking-[0.2em] uppercase">{t('badge-region')}</span>
                                    </div>
                                    <h1
                                        className="font-heading text-5xl md:text-7xl lg:text-8xl font-black leading-[0.9] mb-8 text-white tracking-tighter uppercase"
                                        dangerouslySetInnerHTML={{
                                            __html: initialRegionCode === 'us'
                                                ? t('hero_title_us')
                                                : initialRegionCode === 'pe'
                                                    ? t('hero_title_pe')
                                                    : t('hero_title_latam')
                                        }}
                                    ></h1>
                                    <p className="text-slate-400 text-lg md:text-xl leading-relaxed mb-12 max-w-xl font-light border-l-2 border-cyan-500/30 pl-8">
                                        {initialRegionCode === 'us'
                                            ? t('hero_subtitle_us')
                                            : initialRegionCode === 'pe'
                                                ? t('hero_subtitle_pe')
                                                : t('hero_subtitle_latam')}
                                    </p>
                                </>
                            )}

                            <div className="flex flex-col sm:flex-row gap-6 mt-12">
                                <ContactActions
                                    className="px-10 py-5 text-xl font-bold rounded-none uppercase tracking-widest min-w-[240px]"
                                    lang={lang}
                                    label={initialRegionCode === 'us' ? t('cta-primary-us') : initialRegionCode === 'pe' ? t('cta-primary-pe') : t('cta-primary-latam')}
                                />
                                <Link
                                    href={lang === 'en' ? `/${initialRegionCode}/services` : `/${initialRegionCode}/servicios`}
                                    className="px-10 py-5 rounded-none font-bold text-xl border-2 border-slate-800 hover:bg-white hover:text-black transition-all inline-flex items-center justify-center gap-3 text-white tracking-widest uppercase min-w-[240px]"
                                >
                                    {initialRegionCode === 'us' ? t('cta-secondary-us') : initialRegionCode === 'latam' ? t('cta-secondary-latam') : t('btn-secondary')}
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                </Link>
                            </div>
                        </div>

                        {/* Metrics Sidebar - Visual Authority */}
                        <div className="hidden lg:flex flex-col gap-6 animate-fade-in stagger-3">
                            <div className="card-glass border-l-4 border-l-cyan-500 p-8 transform hover:translate-x-4 transition-transform duration-500">
                                <div className="text-6xl font-black text-white mb-2 tracking-tighter">50+</div>
                                <div className="text-cyan-400 text-sm font-bold tracking-widest uppercase">{t('stat1-label')}</div>
                                <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-cyan-500 w-[85%] animate-pulse"></div>
                                </div>
                            </div>

                            <div className="card-glass border-l-4 border-l-lime-500 p-8 transform hover:translate-x-4 transition-transform duration-500 stagger-1">
                                <div className="text-6xl font-black text-white mb-2 tracking-tighter text-lime-400">100%</div>
                                <div className="text-slate-400 text-sm font-bold tracking-widest uppercase">{t('stat2-label')}</div>
                                <div className="mt-4 flex gap-1">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="w-2 h-6 bg-lime-500/50 rounded-sm"></div>
                                    ))}
                                    <div className="w-2 h-6 bg-lime-500 rounded-sm animate-bounce"></div>
                                </div>
                            </div>

                            <div className="card-glass border-l-4 border-l-white p-8 transform hover:translate-x-4 transition-transform duration-500 stagger-2">
                                <div className="text-6xl font-black text-white mb-2 tracking-tighter uppercase stroke-text">USA-PE</div>
                                <div className="text-slate-400 text-sm font-bold tracking-widest uppercase">{t('stat4-label')}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-1/3 h-full bg-grid opacity-10 pointer-events-none"></div>
                <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>
                <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-lime-500/5 rounded-full blur-[150px] pointer-events-none animate-pulse-slow stagger-2"></div>
            </section>

            {/* Services Section */}
            <section id={lang === 'en' ? "services" : "servicios"} className="py-10 md:py-20 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16 md:mb-20">
                        <span className="inline-block px-4 py-1 rounded-none bg-cyan-500/10 border-l-2 border-cyan-500 text-cyan-400 text-[10px] font-black tracking-[0.3em] uppercase mb-4">{t('services-label')}</span>
                        <h2 className="font-heading text-4xl md:text-6xl font-black mb-6 tracking-tighter uppercase italic">
                            {t('services-title').replace(t('services-title-accent'), '')}
                            <span className="stroke-text">[{t('services-title-accent')}]</span>
                        </h2>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto font-light">{t('services-desc')}</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                        {/* Services 1-6 */}
                        {[
                            { id: 1, img: 'web', ext: 'png' },
                            { id: 2, img: 'booking', ext: 'png' },
                            { id: 3, img: 'payments', ext: 'png' },
                            { id: 4, img: 'ecommerce', ext: 'png' },
                            { id: 5, img: 'ai', ext: 'jpg' },
                            { id: 6, img: 'api', ext: 'jpg' }
                        ].map((service) => (
                            <div key={service.id} className="card-glass card-hover rounded-2xl overflow-hidden group flex flex-col">
                                <div className="relative h-48 w-full overflow-hidden">
                                    <Image
                                        src={`/images/services/${service.img}.${service.ext}`}
                                        alt={t(`service${service.id}-title`)}
                                        fill
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/20 to-transparent group-hover:from-[#0f172a]/90 transition-all duration-500"></div>
                                    <div className={`absolute bottom-4 left-4 service-icon ${service.id % 2 === 0 ? 'text-cyan-400' : 'text-cyan-400'}`}>
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    </div>
                                </div>
                                <div className="p-6 lg:p-8 flex flex-col flex-grow">
                                    <h3 className="font-heading text-xl font-bold mb-3 group-hover:text-cyan-400 transition-colors">
                                        {t(`service${service.id}-title-${initialRegionCode}`)}
                                    </h3>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-6 flex-grow">{t(`service${service.id}-desc`)}</p>
                                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                        <span className="text-cyan-400 text-xs font-semibold uppercase tracking-wider">{t(`service${service.id}-result`)}</span>
                                        <svg className="w-5 h-5 text-gray-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Service 7 - Featured */}
                        <div className="card-glass card-hover rounded-2xl overflow-hidden md:col-span-2 lg:col-span-3 border-cyan-500/30 bg-cyan-900/5 group">
                            <div className="flex flex-col lg:flex-row items-stretch min-h-[300px]">
                                <div className="relative w-full lg:w-1/3 min-h-[250px] overflow-hidden">
                                    <Image
                                        src="/images/services/ai_models.jpg"
                                        alt={t('service7-title')}
                                        fill
                                        sizes="(max-width: 1024px) 100vw, 33vw"
                                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0f172a]/80 lg:to-[#0f172a] hidden lg:block"></div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent lg:hidden"></div>
                                </div>
                                <div className="p-8 lg:p-10 flex-grow flex flex-col justify-center relative z-10">
                                    <div className="flex flex-wrap items-center gap-3 mb-4">
                                        <h3 className="font-heading text-2xl md:text-3xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                                            {t(`service7-title-${initialRegionCode}`)}
                                        </h3>
                                        <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-medium border border-cyan-500/20 shadow-glow-cyan">{t('premium-label')}</span>
                                    </div>
                                    <p className="text-gray-300 text-lg leading-relaxed mb-8 max-w-2xl">{t('service7-desc')}</p>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <span className="text-cyan-400 font-semibold">{t('service7-result')}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <span className="text-cyan-400 font-semibold">{t('service7-result')}</span>
                                        </div>
                                        <Link href={`/${initialRegionCode}/${lang === 'en' ? 'contact' : 'contacto'}`} className="btn-primary px-10 py-4 rounded-full font-bold text-lg shadow-xl shadow-cyan-900/40 hover:scale-105 transition-all">
                                            {t('consult-btn')}
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Industries Section */}
            {/* Industries Section */}
            <section id={lang === 'en' ? "industries" : "industrias"} className="py-8 md:py-12 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16 md:mb-20">
                        <span className="inline-block px-4 py-1 rounded-none bg-lime-500/10 border-l-2 border-lime-500 text-lime-400 text-[10px] font-black tracking-[0.3em] uppercase mb-4">{t('industries-label')}</span>
                        <h2 className="font-heading text-4xl md:text-6xl font-black mb-6 tracking-tighter uppercase italic">
                            <span className="stroke-text">{t('industries-heading-1')}</span> {t('industries-heading-2')}
                        </h2>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto font-light">{t('industries-desc')}</p>
                    </div>
                    <div className="space-y-12 lg:space-y-20">
                        {[
                            { id: 1, img: 'retail' },
                            { id: 2, img: 'health' },
                            { id: 3, img: 'beauty' },
                            { id: 4, img: 'hospitality' },
                            { id: 5, img: 'education' },
                            { id: 6, img: 'b2b' },
                            { id: 7, img: 'logistics' },
                            { id: 8, img: 'finance' },
                            { id: 9, img: 'realestate' },
                            { id: 10, img: 'manufacturing' }
                        ].map((industry, index) => (
                            <div key={industry.id} className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-8 lg:gap-16 group`}>
                                <div className="relative w-full lg:w-1/2 h-64 md:h-80 rounded-3xl overflow-hidden shadow-2xl shadow-cyan-900/10 border border-white/5 bg-white/5">
                                    <Image
                                        src={`/images/industries/${industry.img}.jpg`}
                                        alt={t(`industry${industry.id}`)}
                                        fill
                                        sizes="(max-width: 1024px) 100vw, 50vw"
                                        className="object-cover transition-transform duration-700 group-hover:scale-105 filter saturate-[0.8] group-hover:saturate-100"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/60 to-transparent"></div>
                                </div>
                                <div className="w-full lg:w-1/2 flex flex-col justify-center">
                                    <div className="inline-flex items-center gap-3 mb-4">
                                        <div className="w-12 h-0.5 bg-gradient-to-r from-cyan-500 to-transparent"></div>
                                        <span className="text-cyan-400 text-sm font-bold tracking-widest uppercase">{t(`industry${industry.id}`)}</span>
                                    </div>
                                    <h3 className="font-heading text-2xl md:text-4xl font-bold text-white mb-6 group-hover:text-cyan-400 transition-colors tracking-tight">{t(`industry${industry.id}`)}</h3>
                                    <p className="text-gray-400 text-lg leading-relaxed group-hover:text-gray-300 transition-colors max-w-xl">{t(`industry${industry.id}-desc`)}</p>

                                    <div className="mt-8 flex flex-wrap gap-4">
                                        <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-gray-400 tracking-wider uppercase">
                                            {t('solution-ready')}
                                        </div>
                                        <div className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-400 tracking-wider uppercase">
                                            {t('scale-guaranteed')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Presence / Map Section */}
            <section className="py-10 md:py-20 relative bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12 md:mb-16">
                        <span className="inline-block px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-4">{t('location-label')}</span>
                        <h2 className="font-heading text-3xl md:text-5xl font-bold mb-6">{t('location-title').replace(t('location-title-accent'), '')} <span className="gradient-text">{t('location-title-accent')}</span></h2>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto">{t('location-desc')}</p>
                    </div>

                    {/* Full-width World Map */}
                    <div className="mb-12 md:mb-16">
                        <div className="relative">
                            <div className="absolute inset-0 bg-cyan-500/5 filter blur-[100px]"></div>
                            <div className="relative z-10 card-glass rounded-2xl overflow-hidden shadow-2xl shadow-cyan-900/20 p-4 md:p-8">
                                <WorldMap
                                    highlightedCountries={[
                                        { code: 'US', name: 'USA', color: '#10b981' },
                                        { code: 'PE', name: 'Peru', color: '#06b6d4' }
                                    ]}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Location Info Cards */}
                    <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
                        <div className="card-glass rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-colors group">
                            <div className="relative h-48 w-full">
                                <Image src="/images/usa_office.png" alt={t('office-usa')} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent opacity-60"></div>
                            </div>
                            <div className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0 text-cyan-400">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2m2 2a2 2 0 002-2m-2 2v-6a2 2 0 012-2h2a2 2 0 012 2v6a2 2 0 01-2 2m-6-11a2 2 0 11-4 0 2 2 0 014 0" /></svg>
                                    </div>
                                    <div>
                                        <h4 className="font-heading text-lg font-bold mb-2 text-white group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{t('usa-office')}</h4>
                                        <p className="text-gray-400 text-sm">{t('usa-office-desc')}</p>
                                        <p className="text-cyan-400 text-sm font-medium mt-2">{t('usa-support')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card-glass rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-colors group">
                            <div className="relative h-48 w-full">
                                <Image src="/images/data_center.png" alt={t('office-peru')} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent opacity-60"></div>
                            </div>
                            <div className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0 text-cyan-400">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2m2 2a2 2 0 002-2m-2 2v-6a2 2 0 012-2h2a2 2 0 012 2v6a2 2 0 01-2 2m-6-11a2 2 0 11-4 0 2 2 0 014 0" /></svg>
                                    </div>
                                    <div>
                                        <h4 className="font-heading text-lg font-bold mb-2 text-white group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{t('peru-office')}</h4>
                                        <p className="text-gray-400 text-sm">{t('peru-office-desc')}</p>
                                        <p className="text-cyan-400 text-sm font-medium mt-2">{t('peru-support')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="card-glass rounded-2xl p-4 text-center">
                                <div className="text-2xl font-bold gradient-text mb-1">2</div>
                                <div className="text-sm text-gray-400">{t('locations-count')}</div>
                            </div>
                            <div className="card-glass rounded-2xl p-4 text-center">
                                <div className="text-2xl font-bold gradient-text mb-1">24/7</div>
                                <div className="text-sm text-gray-400">{t('coverage-text')}</div>
                            </div>
                        </div>
                        <div className="card-glass rounded-2xl p-6 border-cyan-500/30">
                            <p className="text-gray-400 text-sm mb-4">{t('global-reach-text')}</p>
                            <Link href={`/${initialRegionCode}/${lang === 'en' ? 'contact' : 'contacto'}`} className="text-cyan-400 font-medium text-sm hover:text-cyan-300 transition-colors inline-flex items-center gap-2">
                                {t('contact-now')}
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Process Section */}
            <section className="py-8 md:py-12 relative bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-8 md:mb-10">
                        <span className="inline-block px-4 py-1 rounded-none bg-cyan-500/10 border-l-2 border-cyan-500 text-cyan-400 text-[10px] font-black tracking-[0.3em] uppercase mb-4">{t('process-label')}</span>
                        <h2 className="font-heading text-4xl md:text-6xl font-black mb-6 tracking-tighter uppercase italic">
                            {t('process-title').replace(t('process-title-accent'), '')}
                            <span className="stroke-text">[{t('process-title-accent')}]</span>
                        </h2>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto font-light">{t('process-desc')}</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                        {[1, 2, 3, 4].map((step) => (
                            <div key={step} className={step % 2 === 0 ? "hidden lg:contents" : "contents"}>
                                {step > 1 && (
                                    <div className="hidden lg:flex items-center justify-center">
                                        <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
                        {[1, 2, 3, 4].map((step) => (
                            <div key={step} className="card-glass rounded-2xl p-6 relative group hover:bg-white/5 transition-colors">
                                <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full gradient-accent flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-cyan-900/20">
                                    {step}
                                </div>
                                <h4 className="font-heading text-lg font-bold mb-3 pt-4 group-hover:text-cyan-400 transition-colors">
                                    {initialRegionCode === 'us' ? t(`process${step}-title-us`) : t(`process${step}-title-es`)}
                                </h4>
                                <p className="text-gray-400 text-sm">{t(`process${step}-desc`)}</p>
                            </div>
                        ))}
                    </div>
                    {/* Timeline */}
                    <div className="mt-16 bg-gradient-to-r from-cyan-500/10 via-cyan-500/10 to-cyan-500/10 rounded-2xl p-8 border border-cyan-500/20">
                        <h3 className="font-heading text-2xl font-bold mb-8 text-center">{t('timeline-title')}</h3>
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="text-center">
                                <div className="text-3xl font-bold gradient-text mb-2">2-5 {t('timeline-days')}</div>
                                <p className="text-gray-400 text-sm">{t('timeline1')}</p>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold gradient-text mb-2">4-6 {t('timeline-days')}</div>
                                <p className="text-gray-400 text-sm">{t('timeline2')}</p>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold gradient-text mb-2">30-60 {t('timeline-days')}</div>
                                <p className="text-gray-400 text-sm">{t('timeline3')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section >

            {/* Portfolio Section */}
            < section id="casos" className="py-10 md:py-20 relative" >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16 md:mb-20">
                        <span className="inline-block px-4 py-1 rounded-none bg-cyan-500/10 border-l-2 border-cyan-500 text-cyan-400 text-[10px] font-black tracking-[0.3em] uppercase mb-4">{t('portfolio-label')}</span>
                        <h2 className="font-heading text-4xl md:text-6xl font-black mb-6 tracking-tighter uppercase italic">
                            {t('portfolio-heading-1')} <span className="stroke-text">{t('portfolio-heading-2')}</span>
                        </h2>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto font-light">{t('portfolio-desc')}</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { id: 1, img: 'farmaciasenlinea', ext: 'png', url: 'https://farmaciasenlinea.pe' },
                            { id: 2, img: 'nailsbysana', ext: 'png', url: 'https://nailsbysana.com' },
                            { id: 3, img: 'chayay', ext: 'png', url: 'https://chayay.pe' }
                        ].map((project) => (
                            <div key={project.id} className="group relative">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                                <div className="relative card-glass rounded-2xl overflow-hidden hover:translate-y-[-8px] transition-all duration-500">
                                    <div className="relative h-48 w-full overflow-hidden">
                                        <Image
                                            src={`/images/projects/${project.img}.${project.ext}`}
                                            alt={t(`project${project.id}-title`)}
                                            fill
                                            sizes="(max-width: 768px) 100vw, 33vw"
                                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent opacity-80"></div>
                                        <div className="absolute top-4 right-4">
                                            <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-[10px] font-bold uppercase tracking-wider text-cyan-400 backdrop-blur-md">
                                                {t(`project${project.id}-cat`)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <h4 className="font-heading text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">{t(`project${project.id}-title`)}</h4>
                                        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{t(`project${project.id}-desc`)}</p>
                                        <div className="mb-6 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10 group-hover:border-cyan-500/30 transition-colors">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                                                <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Business Outcome</p>
                                            </div>
                                            <p className="text-sm text-white font-medium leading-tight">
                                                {initialRegionCode === 'us' ? t(`project${project.id}-result-us`) : t(`project${project.id}-result-es`)}
                                            </p>
                                        </div>
                                        <a
                                            href={project.url}
                                            onClick={() => {
                                                trackConversion('project_view_click', {
                                                    project: t(`project${project.id}-title`),
                                                    region: regionConfig.countryCode,
                                                    lang: lang
                                                });
                                            }}
                                            className="inline-flex items-center gap-2 text-cyan-400 font-semibold text-sm hover:text-cyan-300 transition-colors group/btn"
                                        >
                                            {t('view-project')}
                                            <svg className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section >

            {/* Is it for you? (Filter Section) */}
            <section className="py-6 md:py-10 relative overflow-hidden bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-20 animate-reveal">
                        <span className="inline-block px-4 py-1 rounded-none bg-cyan-500/10 border-l-2 border-cyan-500 text-cyan-400 text-[10px] font-black tracking-[0.3em] uppercase mb-4">
                            {initialRegionCode === 'us' ? t('filter-label') : initialRegionCode === 'pe' ? t('filter-label-pe') : t('filter-label-latam')}
                        </span>
                        <h2 className="font-heading text-4xl md:text-6xl font-black mb-6 tracking-tighter uppercase italic leading-none">
                            {t('filter-title').replace('?', '')}
                            <span className="stroke-text">?</span>
                        </h2>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto font-light border-l-2 border-white/10 pl-6">
                            {initialRegionCode === 'us' ? t('filter-subtitle') : initialRegionCode === 'pe' ? t('filter-subtitle-pe') : t('filter-subtitle-latam')}
                        </p>
                    </div>

                    <div className="relative max-w-5xl mx-auto group">
                        {/* Vertical Separator for Desktop */}
                        <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent z-10"></div>

                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Fit Section */}
                            <div className="p-8 md:p-12 card-glass card-hover rounded-[2rem] border-t-2 border-t-cyan-500/30">
                                <h3 className="text-2xl font-bold mb-8 flex items-center gap-4 text-white uppercase tracking-tight">
                                    <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center text-white">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    {t('filter-yes-title')}
                                </h3>
                                <ul className="space-y-5">
                                    {[1, 2, 3, 4, 5].map(i => {
                                        const key = initialRegionCode === 'us' ? `filter-yes-${i}` : initialRegionCode === 'pe' ? `filter-yes-${i}-pe` : `filter-yes-${i}-latam`;
                                        const text = t(key);
                                        if (text === key) return null;
                                        return (
                                            <li key={i} className="flex items-start gap-4 group">
                                                <div className="w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mt-1 flex-shrink-0 group-hover:bg-cyan-500 transition-colors">
                                                    <svg className="w-3 h-3 text-cyan-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                                <span className="text-base text-slate-300 font-light group-hover:text-white transition-colors">{text}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            {/* Not a Fit Section */}
                            <div className="p-8 md:p-12 card-glass card-hover rounded-[2rem] border-t-2 border-t-white/10 opacity-80 hover:opacity-100 transition-opacity">
                                <h3 className="text-2xl font-bold mb-8 flex items-center gap-4 text-slate-400 uppercase tracking-tight">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 border border-white/10">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </div>
                                    {t('filter-no-title')}
                                </h3>
                                <ul className="space-y-5">
                                    {[1, 2, 3, 4].map(i => {
                                        const key = initialRegionCode === 'us' ? `filter-no-${i}` : initialRegionCode === 'pe' ? `filter-no-${i}-pe` : `filter-no-${i}-latam`;
                                        const text = t(key);
                                        if (text === key) return null;
                                        return (
                                            <li key={i} className="flex items-start gap-4">
                                                <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mt-1 flex-shrink-0">
                                                    <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </div>
                                                <span className="text-base text-slate-500 font-light italic">{text}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            {/* Why Choose Us */}
            < section id={lang === 'en' ? "about" : "nosotros"} className="py-4 md:py-10 relative bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent" >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <span className="inline-block px-4 py-1 rounded-none bg-cyan-500/10 border-l-2 border-cyan-500 text-cyan-400 text-[10px] font-black tracking-[0.3em] uppercase mb-4">{t('why-label')}</span>
                            <h2 className="font-heading text-4xl md:text-6xl font-black mb-6 tracking-tighter uppercase italic leading-none">
                                {t('why-title').replace(t('why-title-accent'), '')}
                                <span className="stroke-text">[{t('why-title-accent')}]</span>
                            </h2>
                            <p className="text-slate-400 text-lg leading-relaxed mb-8 border-l-2 border-white/10 pl-6">{t('why-commitment')}</p>

                            <div className="space-y-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                                        <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center flex-shrink-0 text-white font-bold text-lg">
                                            {i === 1 && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                                            {i === 2 && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                            {i === 3 && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>}
                                            {i === 4 && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold mb-1 text-white">{t(`feature${i}-title`)}</h4>
                                            <p className="text-gray-400 text-sm">{t(`feature${i}-desc`)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-cyan-500 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative card-glass rounded-2xl overflow-hidden shadow-2xl">
                                <Image src="/images/team_working.png" alt={t('all-rights')} width={600} height={400} className="w-full h-auto object-cover scale-105 group-hover:scale-100 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent opacity-60"></div>
                                <div className="absolute bottom-6 left-6 right-6">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/20 mb-2 backdrop-blur-md">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">{t('collab-hub-label')}</span>
                                    </div>
                                    <h4 className="text-xl font-bold text-white leading-tight">{t('collab-title')}</h4>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-8">
                                <div className="card-glass rounded-2xl p-6 text-center hover:border-cyan-500/30 transition-colors">
                                    <div className="text-4xl lg:text-5xl font-heading font-bold gradient-text mb-2">50+</div>
                                    <div className="text-gray-400 text-sm">{t('stat1-label')}</div>
                                </div>
                                <div className="card-glass rounded-2xl p-6 text-center hover:border-cyan-500/30 transition-colors">
                                    <div className="text-4xl lg:text-5xl font-heading font-bold gradient-text mb-2">100%</div>
                                    <div className="text-gray-400 text-sm">{t('stat2-label')}</div>
                                </div>
                                <div className="card-glass rounded-2xl p-6 text-center hover:border-cyan-500/30 transition-colors">
                                    <div className="text-4xl lg:text-5xl font-heading font-bold gradient-text mb-2">5+</div>
                                    <div className="text-gray-400 text-sm">{t('stat3-label')}</div>
                                </div>
                                <div className="card-glass rounded-2xl p-6 text-center hover:border-cyan-500/30 transition-colors">
                                    <div className="text-4xl lg:text-5xl font-heading font-bold gradient-text mb-2">2</div>
                                    <div className="text-gray-400 text-sm">{t('stat4-label')}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-4 md:py-8 relative">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="card-glass rounded-3xl p-8 md:p-12 text-center relative overflow-hidden bg-[#0f172a]/80 backdrop-blur-xl border border-white/20">
                        {/* Background Decoration */}
                        <div className="absolute inset-0 opacity-20 pointer-events-none">
                            <div className="absolute top-0 left-0 w-64 h-64 bg-cyan-500 rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                            <div className="absolute bottom-0 right-0 w-64 h-64 bg-cyan-500 rounded-full filter blur-3xl translate-x-1/2 translate-y-1/2"></div>
                        </div>
                        <div className="relative z-10">
                            <h2 className="font-heading text-4xl md:text-6xl font-black mb-6 tracking-tighter uppercase italic">{t('cta-title')}</h2>
                            <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto font-light">{t('cta-desc')}</p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <ContactActions variant="outline" className="px-8 py-4 text-lg" lang={lang} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Strategic FAQ Section */}
            <section className="py-12 md:py-20 relative">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <span className="inline-block px-4 py-1 rounded-none bg-cyan-500/10 border-l-2 border-cyan-500 text-cyan-400 text-[10px] font-black tracking-[0.3em] uppercase mb-4">FAQ</span>
                        <h2 className="font-heading text-4xl font-black mb-6 tracking-tighter uppercase italic">{t('faq-title')}</h2>
                    </div>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <details key={i} className="card-glass rounded-2xl group border border-white/5 transition-all hover:border-cyan-500/30 overflow-hidden">
                                <summary className="p-6 cursor-pointer list-none flex items-center justify-between font-bold text-white group-hover:text-cyan-400 transition-colors">
                                    <span className="flex items-center gap-4">
                                        <span className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 text-sm font-black">0{i}</span>
                                        {t(`faq-q${i}`)}
                                    </span>
                                    <svg className="w-5 h-5 text-cyan-500 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </summary>
                                <div className="px-6 pb-6 text-slate-400 leading-relaxed border-t border-white/5 pt-4 bg-white/[0.02]">
                                    {t(`faq-a${i}`)}
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id={lang === 'en' ? "contact" : "contacto"} className="py-12 md:py-20 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col-reverse md:grid md:grid-cols-2 gap-12 lg:gap-20">
                        {/* Left Column: Contact Info */}
                        <div>
                            <span className="inline-block px-4 py-1 rounded-none bg-cyan-500/10 border-l-2 border-cyan-500 text-cyan-400 text-[10px] font-black tracking-[0.3em] uppercase mb-4">{t('contact-label')}</span>
                            <h2 className="font-heading text-4xl md:text-6xl font-black mb-8 tracking-tighter uppercase italic leading-none">
                                {t('contact-title').replace(t('contact-title-accent'), '')}
                                <span className="stroke-text">[{t('contact-title-accent')}]</span>
                            </h2>
                            <p className="text-slate-400 text-lg leading-relaxed mb-8 border-l-2 border-white/10 pl-6">{t('contact-desc')}</p>

                            <ContactList lang={lang} />

                            {/* Region Specific Info for PE */}
                            {initialRegionCode === 'pe' && (
                                <div className="mt-8 bg-lime-900/20 p-6 rounded-xl border border-lime-500/30">
                                    <h4 className="text-lime-400 font-bold mb-2">Soporte Local en Perú</h4>
                                    <p className="text-sm text-lime-100/80">Atención directa vía WhatsApp y reuniones presenciales en Lima.</p>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Multi-Step Form */}
                        <div className="relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-20"></div>
                            <MultiStepForm region={initialRegionCode} />
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer - Enterprise Minimalist Tech Design */}
            <footer className="relative bg-[#030712] pt-8 pb-4 border-t border-cyan-900/20 overflow-hidden">

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
                    <div className="mb-4 md:mb-8">
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
                    <div className="mt-8 pt-2 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-slate-500 text-xs font-mono tracking-widest">© 2026 BRECOMPERU SOLUTIONS LLC.</div>
                        <div className="flex gap-6">
                            <span className="text-slate-600 text-xs font-mono">ENCRYPTED CONNECTION</span>
                            <span className="text-cyan-900 text-xs font-mono uppercase">{regionConfig.countryCode} NODE</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div >
    );
};

export default ModernLanding;
