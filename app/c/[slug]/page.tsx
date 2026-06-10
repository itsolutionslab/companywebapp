"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { getCampaignBySlug, createFunnel, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Script from "next/script";
import styles from "./Campaign.module.css";
import BlockRenderer from "@/app/admin/funnels/components/builder/BlockRenderer";
import DynamicForm from "../components/DynamicForm";
import { toast } from 'react-hot-toast';

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
            toast.error("El archivo es demasiado grande. Máx. 5MB.");
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
            toast.error("Ocurrió un error al enviar tus datos. Por favor intenta de nuevo.");
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

    const renderDynamicForm = (block?: any) => (
        <DynamicForm 
            fieldsConfig={campaign.fields_config || []}
            onSubmit={async (data) => {
                await createFunnel({
                    ...data,
                    campaign_slug: slug,
                    campaign_id: campaign.id,
                    source: "public_landing"
                });
                
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
            }}
            buttonText={block?.content?.buttonText}
            buttonColor={block?.content?.buttonColor}
            textColor={block?.content?.textColor}
        />
    );

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
                <Script id="tt-pixel" strategy="afterInteractive">
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
                        function gtag(){window.dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', '${campaign.pixels.google}');
                        `}
                    </Script>
                </>
            )}

            <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', width: '100%' }}>
                {campaign.blocks && campaign.blocks.length > 0 ? (
                    /* Render Dynamic Visual Blocks */
                    campaign.blocks.map((block: any) => (
                        <BlockRenderer 
                            key={block.id} 
                            block={block} 
                            isPreview={true} 
                            formComponent={renderDynamicForm(block)}
                        />
                    ))
                ) : (
                    /* Fallback to legacy layout */
                    <div className="legacy-layout">
                        <div className={styles.publicCampaignHero} style={ campaign.hero_image_url ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(${campaign.hero_image_url})` } : {} }>
                            <div className={styles.publicCampaignHeroContent}>
                                <h1 className={styles.publicCampaignTitle}>{campaign.title}</h1>
                                <p className={styles.publicCampaignDesc}>{campaign.description}</p>
                            </div>
                        </div>
                        <div className={styles.publicCampaignContainer}>
                            <div style={{ maxWidth: '600px', margin: '3rem auto' }}>
                                {renderDynamicForm()}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
