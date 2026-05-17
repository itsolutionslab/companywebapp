"use client";

import { useEffect, useState, use } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import QuotationEditor from "@/modules/quotation/components/QuotationEditor";
import styles from "../Cotizaciones.module.css";
import { useTranslation } from "@/components/admin/LanguageContext";

export default function CotizacionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { t } = useTranslation();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchQuotation() {
            const docRef = doc(db, "quotations", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setData(docSnap.data());
            }
            setLoading(false);
        }
        fetchQuotation();
    }, [id]);

    if (loading) {
        return (
            <div className="flex justify-center p-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0511F2]"></div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className={styles.container}>
                <h1>Cotización no encontrada</h1>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <h1>{data.quotationId || "Detalle"}</h1>
                    <p>Editando documento persistente</p>
                </div>
            </header>

            <QuotationEditor initialData={data} id={id} />
        </div>
    );
}
