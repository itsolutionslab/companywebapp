"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import QuotationEditor from "@/modules/quotation/components/QuotationEditor";
import styles from "../Cotizaciones.module.css";
import { useTranslation } from "@/components/admin/LanguageContext";

export default function NuevaCotizacionPage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
                <div style={{ border: '4px solid rgba(0,0,0,0.1)', borderTop: '4px solid var(--admin-primary, #0511F2)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
                <style jsx global>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        }>
            <NuevaCotizacionContent />
        </Suspense>
    );
}

function NuevaCotizacionContent() {
    const { t } = useTranslation();
    const searchParams = useSearchParams();
    const leadId = searchParams.get("leadId") || undefined;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <h1>{t('new_quotation')}</h1>
                    <p>Crea un documento profesional con JSON Engine</p>
                </div>
            </header>

            <QuotationEditor initialLeadId={leadId} />
        </div>
    );
}
