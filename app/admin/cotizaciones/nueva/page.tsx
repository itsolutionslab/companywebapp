"use client";

import QuotationEditor from "@/modules/quotation/components/QuotationEditor";
import styles from "../Cotizaciones.module.css";
import { useTranslation } from "@/components/admin/LanguageContext";

export default function NuevaCotizacionPage() {
    const { t } = useTranslation();

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <h1>{t('new_quotation')}</h1>
                    <p>Crea un documento profesional con JSON Engine</p>
                </div>
            </header>

            <QuotationEditor />
        </div>
    );
}
