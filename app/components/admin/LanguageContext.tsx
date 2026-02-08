
"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Lang, adminTranslations, TranslationKey } from '@/lib/admin-translations';

interface LanguageContextType {
    lang: Lang;
    setLang: (lang: Lang) => void;
    t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [lang, setLang] = useState<Lang>('es');

    useEffect(() => {
        const saved = localStorage.getItem('admin_lang') as Lang;
        if (saved && (saved === 'en' || saved === 'es' || saved === 'ru')) {
            setLang(saved);
        }
    }, []);

    const handleSetLang = (newLang: Lang) => {
        setLang(newLang);
        localStorage.setItem('admin_lang', newLang);
    };

    const t = (key: TranslationKey): string => {
        return adminTranslations[lang][key] || adminTranslations['en'][key] || String(key);
    };

    return (
        <LanguageContext.Provider value={{ lang, setLang: handleSetLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useTranslation() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useTranslation must be used within a LanguageProvider');
    }
    return context;
}
