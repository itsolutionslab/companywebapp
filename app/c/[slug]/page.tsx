"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { getCampaignBySlug, createFunnel, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Script from "next/script";
import styles from "./Campaign.module.css";

export default function CampaignLandingPage() {
    const params = useParams();
    const slug = params.slug as string;
    
    const [campaign, setCampaign] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    
    const [formData, setFormData] = useState<any>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [fileName, setFileName] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchCampaign = async () => {
            if (!slug) return;
            const data: any = await getCampaignBySlug(slug);
            if (data && data.status === 'published') {
                setCampaign(data);
            } else {
                setNotFound(true);
            }
            setLoading(false);
        };
        fetchCampaign();
    }, [slug]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert("El archivo es demasiado grande. Máx. 5MB.");
            return;
        }

        setFileName(file.name);
        setIsUploading(true);
        try {
            const storageRef = ref(storage, `funnels/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            if (url) {
                setFormData((prev: any) => ({ ...prev, file_url: url }));
            }
        } catch (error) {
            console.error("Error al subir archivo:", error);
            setFileName('');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await createFunnel({
                ...formData,
                campaign_slug: slug,
                campaign_id: campaign.id,
                source: "public_landing"
            });
            setSubmitted(true);
            
            // Trigger Events if pixels exist
            if (typeof window !== 'undefined') {
                if (campaign.pixels?.fb && (window as any).fbq) {
                    (window as any).fbq('track', 'Lead');
                }
                if (campaign.pixels?.tiktok && (window as any).ttq) {
                    (window as any).ttq.track('SubmitForm');
                }
                if (campaign.pixels?.google && (window as any).gtag) {
                    (window as any).gtag('event', 'conversion', {
                        'send_to': `${campaign.pixels.google}/lead_conversion_label_if_any`
                    });
                }
            }
            
        } catch (error) {
            console.error("Error submitting form:", error);
            alert("Ocurrió un error al enviar tus datos. Por favor intenta de nuevo.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.errorState}>
                <div className={styles.spinner}></div>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className={styles.errorState}>
                <h1 className={styles.errorTitle}>404</h1>
                <p className={styles.errorMessage}>Esta campaña ya no está disponible o no existe.</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Tracking Scripts */}
            {campaign.pixels?.fb && (
                <Script id="fb-pixel" strategy="afterInteractive">
                    {`
                        !function(f,b,e,v,n,t,s)
                        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                        n.queue=[];t=b.createElement(e);t.async=!0;
                        t.src=v;s=b.getElementsByTagName(e)[0];
                        s.parentNode.insertBefore(t,s)}(window, document,'script',
                        'https://connect.facebook.net/en_US/fbevents.js');
                        fbq('init', '${campaign.pixels.fb}');
                        fbq('track', 'PageView');
                    `}
                </Script>
            )}
            
            {campaign.pixels?.linkedin && (
                <Script id="linkedin-pixel" strategy="afterInteractive">
                    {`
                        _linkedin_partner_id = "${campaign.pixels.linkedin}";
                        window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
                        window._linkedin_data_partner_ids.push(_linkedin_partner_id);
                        (function(l) {
                        if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
                        window.lintrk.q=[]}
                        var s = document.getElementsByTagName("script")[0];
                        var b = document.createElement("script");
                        b.type = "text/javascript";b.async = true;
                        b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
                        s.parentNode.insertBefore(b, s);})(window.lintrk);
                    `}
                </Script>
            )}

            {campaign.pixels?.tiktok && (
                <Script id="tiktok-pixel" strategy="afterInteractive">
                    {`
                        !function (w, d, t) {
                        w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
                        ttq.load('${campaign.pixels.tiktok}');
                        ttq.page();
                        }(window, document, 'ttq');
                    `}
                </Script>
            )}

            {campaign.pixels?.google && (
                <>
                    <Script src={`https://www.googletagmanager.com/gtag/js?id=${campaign.pixels.google}`} strategy="afterInteractive" />
                    <Script id="google-analytics" strategy="afterInteractive">
                        {`
                            window.dataLayer = window.dataLayer || [];
                            function gtag(){dataLayer.push(arguments);}
                            gtag('js', new Date());
                            gtag('config', '${campaign.pixels.google}');
                        `}
                    </Script>
                </>
            )}

            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <a href="/" className={styles.logo}>
                        Brecom<span>IT</span> Solutions
                    </a>
                </div>
            </header>

            {/* Hero Section */}
            <section className={styles.hero}>
                {campaign.hero_image_url && (
                    <div 
                        className={styles.heroBg} 
                        style={{ backgroundImage: `url(${campaign.hero_image_url})` }}
                    />
                )}
                <div className={styles.heroContent}>
                    <h1 className={styles.heroTitle}>{campaign.title}</h1>
                    {campaign.description && (
                        <p className={styles.heroDescription}>{campaign.description}</p>
                    )}
                </div>
            </section>

            {/* Main Content & Form */}
            <main className={styles.main}>
                <div className={styles.formCard}>
                    {submitted ? (
                        <div className={styles.successState}>
                            <div className={styles.successIcon}>✓</div>
                            <h2 className={styles.successTitle}>¡Gracias por tu interés!</h2>
                            <p className={styles.successMessage}>
                                Hemos recibido tus datos correctamente. Un especialista de nuestro equipo se pondrá en contacto contigo muy pronto.
                            </p>
                        </div>
                    ) : (
                        <>
                            <h2 className={styles.formTitle}>Completa el formulario</h2>
                            <p className={styles.formSubtitle}>Déjanos tus datos y nos comunicaremos contigo.</p>
                            
                            <form onSubmit={handleSubmit}>
                                {campaign.fields_config?.filter((f: any) => f.state !== 'hidden').map((field: any) => {
                                    if (field.id === 'file_url') {
                                        return (
                                            <div key={field.id} className={styles.formGroup}>
                                                <label className={styles.label}>
                                                    {field.label} {field.state === 'required' && <span className={styles.requiredAsterisk}>*</span>}
                                                </label>
                                                <div 
                                                    className={styles.uploadBox}
                                                    onClick={() => fileInputRef.current?.click()}
                                                >
                                                    {isUploading ? (
                                                        <div className={styles.spinner} style={{ borderColor: 'rgba(5, 17, 242, 0.3)', borderTopColor: '#0511f2' }}></div>
                                                    ) : (
                                                        <div className={styles.uploadIcon}>📎</div>
                                                    )}
                                                    <div className={styles.uploadText}>
                                                        {isUploading ? "Subiendo archivo..." : "Haz clic para seleccionar archivo"}
                                                    </div>
                                                    {fileName && <div className={styles.uploadFileName}>{fileName}</div>}
                                                </div>
                                                <input 
                                                    ref={fileInputRef} 
                                                    type="file" 
                                                    style={{ display: 'none' }}
                                                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                                                    onChange={handleFileUpload} 
                                                    required={field.state === 'required' && !formData.file_url}
                                                />
                                            </div>
                                        );
                                    }
                                    
                                    if (field.id === 'impact') {
                                        return (
                                            <div key={field.id} className={styles.formGroup}>
                                                <label className={styles.label}>
                                                    {field.label} {field.state === 'required' && <span className={styles.requiredAsterisk}>*</span>}
                                                </label>
                                                <textarea 
                                                    required={field.state === 'required'}
                                                    value={formData[field.id] || ''}
                                                    onChange={(e) => setFormData({...formData, [field.id]: e.target.value})}
                                                    className={`${styles.input} ${styles.textarea}`}
                                                    placeholder="Escribe aquí..."
                                                />
                                            </div>
                                        );
                                    }

                                    if (['role', 'stage', 'timeline', 'investment_level', 'decision_maker'].includes(field.id)) {
                                        return (
                                            <div key={field.id} className={styles.formGroup}>
                                                <label className={styles.label}>
                                                    {field.label} {field.state === 'required' && <span className={styles.requiredAsterisk}>*</span>}
                                                </label>
                                                <select
                                                    required={field.state === 'required'}
                                                    value={formData[field.id] || ''}
                                                    onChange={(e) => setFormData({...formData, [field.id]: e.target.value})}
                                                    className={styles.input}
                                                >
                                                    <option value="">Seleccione una opción</option>
                                                    {field.id === 'role' && (
                                                        <>
                                                            <option value="ceo">CEO / Director / Dueño</option>
                                                            <option value="cto">CTO / Gerente de TI</option>
                                                            <option value="lead">Líder de Proyecto / Operaciones</option>
                                                            <option value="po">Product Owner / Gerente de Producto</option>
                                                            <option value="advisor">Asesor / Consultor</option>
                                                            <option value="other">Otro Rol</option>
                                                        </>
                                                    )}
                                                    {field.id === 'stage' && (
                                                        <>
                                                            <option value="idea">Fase de Idea / Exploración</option>
                                                            <option value="reqs">Levantamiento de Requisitos</option>
                                                            <option value="mvp">Construcción de MVP</option>
                                                            <option value="scaling">Escalamiento / Crecimiento</option>
                                                            <option value="legacy">Migración / Sistema Legacy</option>
                                                        </>
                                                    )}
                                                    {field.id === 'timeline' && (
                                                        <>
                                                            <option value="now">Inmediato (0-1 mes)</option>
                                                            <option value="1-3">Próximo Trimestre (1-3 meses)</option>
                                                            <option value="3-6">Mediano Plazo (3-6 meses)</option>
                                                            <option value="explore">Solo Explorando / Sin fecha</option>
                                                        </>
                                                    )}
                                                    {field.id === 'investment_level' && (
                                                        <>
                                                            <option value="low">Starter (&lt; $5k)</option>
                                                            <option value="mid">Growth ($5k - $15k)</option>
                                                            <option value="high">Enterprise ($15k - $50k)</option>
                                                            <option value="ultra">Corporate ($50k+)</option>
                                                            <option value="guidance">Necesito Orientación</option>
                                                        </>
                                                    )}
                                                    {field.id === 'decision_maker' && (
                                                        <>
                                                            <option value="yes">Sí, soy el tomador de decisiones final</option>
                                                            <option value="part">Soy parte del comité de evaluación</option>
                                                            <option value="info">Solo estoy recopilando información</option>
                                                        </>
                                                    )}
                                                </select>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={field.id} className={styles.formGroup}>
                                            <label className={styles.label}>
                                                {field.label} {field.state === 'required' && <span className={styles.requiredAsterisk}>*</span>}
                                            </label>
                                            <input 
                                                type={field.id === 'email' ? 'email' : 'text'}
                                                required={field.state === 'required'}
                                                value={formData[field.id] || ''}
                                                onChange={(e) => setFormData({...formData, [field.id]: e.target.value})}
                                                className={styles.input}
                                                placeholder={`Ingresa tu ${field.label.toLowerCase()}`}
                                            />
                                        </div>
                                    );
                                })}

                                <button 
                                    type="submit" 
                                    disabled={isSubmitting || isUploading}
                                    className={styles.submitBtn}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className={styles.spinner}></div>
                                            <span>Enviando...</span>
                                        </>
                                    ) : (
                                        <span>Enviar Solicitud →</span>
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
