'use client';

import React, { useMemo } from 'react';
import { useContactRegion } from '../../context/RegionContext';
import { trackConversion } from '../../lib/analytics';
import { translations } from '../../data/translations';

interface ContactActionsProps {
    className?: string;
    variant?: 'primary' | 'secondary' | 'outline';
    lang?: 'en' | 'es';
}

export const ContactActions: React.FC<ContactActionsProps> = ({ className = '', variant = 'primary', lang = 'en' }) => {
    const { region, isLoading } = useContactRegion();

    const t = (key: string) => {
        // @ts-ignore
        return translations[lang]?.[key] || key;
    };

    const primaryAction = useMemo(() => {
        const { primaryContact, whatsapp, phone, email } = region;

        if (primaryContact === 'WHATSAPP') {
            return {
                label: 'WhatsApp',
                href: `https://wa.me/${whatsapp}`,
                icon: (
                    <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center shadow-lg">
                        <svg className="w-5 h-5 transition-transform hover:scale-110" fill="white" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                    </div>
                ),
                colorClass: 'gradient-accent text-white hover:scale-105 border-white/20'
            };
        }

        return {
            label: t('btn-call-us'),
            href: `tel:${phone}`,
            icon: (
                <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
                        <path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                </div>
            ),
            colorClass: 'gradient-accent text-white hover:scale-105 border-white/20'
        };
    }, [region, lang]);

    if (isLoading) {
        return <div className={`h-12 w-40 bg-white/5 animate-pulse rounded-full ${className}`} />;
    }

    const baseClasses = "inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold transition-all border";

    const variantClasses = variant === 'primary'
        ? "btn-primary shadow-xl shadow-cyan-900/40 hover:scale-105"
        : "card-glass hover:bg-white/5";

    return (
        <a
            href={primaryAction.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
                const eventName = region.primaryContact === 'WHATSAPP' ? 'click_contact_whatsapp_pe' : 'click_contact_call_us';
                trackConversion(eventName, { variant, location: 'modern_landing' });
            }}
            className={`${baseClasses} ${variantClasses} ${className}`}
        >
            {primaryAction.icon}
            <span>{primaryAction.label}</span>
        </a>
    );
};

interface ContactListProps {
    lang?: 'en' | 'es';
}

export const ContactList: React.FC<ContactListProps> = ({ lang = 'en' }) => {
    const { region, isLoading } = useContactRegion();

    const t = (key: string) => {
        // @ts-ignore
        return translations[lang]?.[key] || key;
    };

    if (isLoading) {
        return <div className="space-y-4 h-48 bg-white/5 animate-pulse rounded-xl" />;
    }

    return (
        <div className="space-y-6">
            {/* Primary Contact */}
            <a
                href={region.primaryContact === 'WHATSAPP' ? `https://wa.me/${region.whatsapp}` : `tel:${region.phone}`}
                onClick={() => {
                    const eventName = region.primaryContact === 'WHATSAPP' ? 'click_contact_whatsapp_pe' : 'click_contact_call_us';
                    trackConversion(eventName, { type: 'primary', location: 'contact_list' });
                }}
                className="flex items-center gap-4 p-4 rounded-xl card-glass hover:border-cyan-500/30 transition-all group"
            >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 gradient-accent text-white shadow-lg`}>
                    {region.primaryContact === 'WHATSAPP' ? (
                        <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    ) : (
                        <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24">
                            <path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                        </svg>
                    )}
                </div>
                <div>
                    <div className="text-sm text-slate-300 font-medium uppercase tracking-wider">{region.primaryContact === 'WHATSAPP' ? 'WhatsApp' : t('phone-label')}</div>
                    <div className="font-semibold group-hover:text-cyan-400 transition-colors">{region.phoneFormatted}</div>
                </div>
            </a>

            {/* Email - Constant for both */}
            <a href={`mailto:${region.email}`} className="flex items-center gap-4 p-4 rounded-xl card-glass hover:border-cyan-500 transition-all group">
                <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center flex-shrink-0 text-white shadow-lg">
                    <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24">
                        <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                        <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
                    </svg>
                </div>
                <div>
                    <div className="text-sm text-slate-300 font-medium uppercase tracking-wider">{t('email-label')}</div>
                    <div className="font-semibold group-hover:text-cyan-400 transition-colors">{region.email}</div>
                </div>
            </a>

            {/* Secondary - SMS/WhatsApp for US */}
            {region.secondaryContact.includes('WHATSAPP') && region.primaryContact !== 'WHATSAPP' && (
                <a
                    href={`https://wa.me/${region.whatsapp}`}
                    onClick={() => trackConversion('click_contact_whatsapp_pe', { type: 'secondary', location: 'contact_list' })}
                    className="flex items-center gap-4 p-4 rounded-xl card-glass hover:border-cyan-500 transition-all group"
                >
                    <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center flex-shrink-0 text-white shadow-lg">
                        <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    </div>
                    <div>
                        <div className="text-sm text-slate-300 font-medium uppercase tracking-wider">WhatsApp</div>
                        <div className="font-semibold group-hover:text-lime-400 transition-colors">{region.whatsappFormatted}</div>
                    </div>
                </a>
            )
            }
        </div >
    );
};
