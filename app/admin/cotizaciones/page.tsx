"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/admin/LanguageContext";
import styles from "./Cotizaciones.module.css";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";

interface Quotation {
    id: string;
    quotationId: string;
    clientName: string;
    date: any;
    total: number;
    currency: string;
    status: 'draft' | 'sent' | 'signed' | 'expired';
}

export default function CotizacionesPage() {
    const { t, lang } = useTranslation();
    const router = useRouter();
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "quotations"), orderBy("date", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Quotation));
            setQuotations(docs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching quotations:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleCreateNew = () => {
        router.push("/admin/cotizaciones/nueva");
    };

    const formatDate = (date: any) => {
        if (!date) return "";
        const d = date.toDate ? date.toDate() : new Date(date);
        return format(d, "PPP", { locale: lang === 'es' ? es : enUS });
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'draft': return styles.statusDraft;
            case 'sent': return styles.statusSent;
            case 'signed': return styles.statusSigned;
            case 'expired': return styles.statusExpired;
            default: return "";
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <h1>{t('cotizaciones')}</h1>
                    <p>Document Engine & Audit Trail</p>
                </div>
                <button className={styles.newButton} onClick={handleCreateNew}>
                    <span>+</span> {t('new_quotation')}
                </button>
            </header>

            {loading ? (
                <div className="flex justify-center p-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0511F2]"></div>
                </div>
            ) : quotations.length === 0 ? (
                <div className={styles.emptyState}>
                    <span>📄</span>
                    <h2>No hay cotizaciones aún</h2>
                    <p>Comienza creando tu primera cotización profesional para tus clientes.</p>
                    <button className={styles.newButton} onClick={handleCreateNew}>
                        {t('new_quotation')}
                    </button>
                </div>
            ) : (
                <div className={styles.grid}>
                    {quotations.map((q) => (
                        <div 
                            key={q.id} 
                            className={styles.card}
                            onClick={() => router.push(`/admin/cotizaciones/${q.id}`)}
                        >
                            <div className={styles.cardHeader}>
                                <span className={styles.id}>{q.quotationId || q.id.substring(0, 8)}</span>
                                <span className={`${styles.status} ${getStatusClass(q.status)}`}>
                                    {t(`status_${q.status}` as any)}
                                </span>
                            </div>
                            <h3 className={styles.clientName}>{q.clientName || "Cliente sin nombre"}</h3>
                            <div className={styles.date}>
                                📅 {formatDate(q.date)}
                            </div>
                            <div className={styles.footer}>
                                <div>
                                    <div className={styles.totalLabel}>{t('total')}</div>
                                    <div className={styles.totalValue}>
                                        {(q.total / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        <span className={styles.currency}>{q.currency}</span>
                                    </div>
                                </div>
                                <div className={styles.arrow}>→</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
