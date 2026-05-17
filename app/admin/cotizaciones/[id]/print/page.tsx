"use client";

import { useEffect, useState, use } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import styles from "./PrintView.module.css";
import { generateHTML } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { QuotationData } from "@/modules/quotation/types/quotation";

export default function PrintQuotationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [data, setData] = useState<QuotationData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchQuotation() {
            try {
                const docRef = doc(db, "quotations", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setData(docSnap.data() as QuotationData);
                }
            } catch (error) {
                console.error("Error fetching quotation for print", error);
            } finally {
                setLoading(false);
            }
        }
        fetchQuotation();
    }, [id]);

    useEffect(() => {
        if (data && !loading) {
            // Wait for images and fonts to load
            setTimeout(() => {
                window.print();
            }, 1000);
        }
    }, [data, loading]);

    if (loading) {
        return <div className={styles.loading}>Preparando documento...</div>;
    }

    if (!data) {
        return <div className={styles.error}>Documento no encontrado</div>;
    }

    const formatCurrency = (cents: number) => {
        return `${data.currency === 'USD' ? '$' : 'S/'} ${(cents / 100).toFixed(2)}`;
    };

    const parsedContext = data.context ? generateHTML(data.context, [StarterKit]) : '';

    return (
        <div className={styles.printContainer}>
            <div className={styles.header}>
                <div className={styles.logoInfo}>
                    <h1 className={styles.logo}>BRECOM<span>PERU</span></h1>
                    <p>Consultoría TI & Software Engineering</p>
                </div>
                <div className={styles.docInfo}>
                    <h2>COTIZACIÓN</h2>
                    <p><strong>N°:</strong> {data.quotationId}</p>
                    <p><strong>Fecha:</strong> {data.date.toDate().toLocaleDateString()}</p>
                </div>
            </div>

            <div className={styles.clientSection}>
                <div className={styles.clientInfo}>
                    <h3>Preparado para:</h3>
                    <p><strong>Cliente:</strong> {data.clientName}</p>
                    {data.clientEmail && <p><strong>Email:</strong> {data.clientEmail}</p>}
                </div>
                <div className={styles.projectInfo}>
                    <h3>Proyecto:</h3>
                    <p>{data.projectTitle}</p>
                </div>
            </div>

            {parsedContext && (
                <div className={styles.contextSection}>
                    <div dangerouslySetInnerHTML={{ __html: parsedContext }} />
                </div>
            )}

            <div className={styles.itemsSection}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Descripción del Servicio</th>
                            <th className={styles.textCenter}>Cant.</th>
                            <th className={styles.textRight}>P. Unitario</th>
                            <th className={styles.textRight}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items.map((item) => (
                            <tr key={item.id}>
                                <td>{item.description}</td>
                                <td className={styles.textCenter}>{item.quantity}</td>
                                <td className={styles.textRight}>{formatCurrency(item.unitPriceCents)}</td>
                                <td className={styles.textRight}>{formatCurrency(item.totalCents)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className={styles.totalsSection}>
                <div className={styles.totalsBox}>
                    <div className={styles.totalRow}>
                        <span>Subtotal:</span>
                        <span>{formatCurrency(data.subtotalCents)}</span>
                    </div>
                    <div className={styles.totalRow}>
                        <span>IGV (18%):</span>
                        <span>{formatCurrency(data.taxCents)}</span>
                    </div>
                    <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                        <span>Total General:</span>
                        <span>{formatCurrency(data.totalCents)}</span>
                    </div>
                </div>
            </div>

            <div className={styles.footerSection}>
                <div className={styles.signatures}>
                    {data.signature ? (
                        <div className={styles.signatureBox}>
                            <img src={data.signature.data} alt="Firma del Cliente" />
                            <p>Firma del Cliente (Auditada)</p>
                        </div>
                    ) : (
                        <div className={styles.signaturePlaceholder}>
                            <p>Firma del Cliente</p>
                        </div>
                    )}
                    <div className={styles.signaturePlaceholder}>
                        <p>Firma Representante Brecomperu</p>
                    </div>
                </div>
                <div className={styles.companyFooter}>
                    <p>brecomperu.com | Av. Javier Prado Este, Lima, Perú | +51 900 000 000</p>
                    <p className={styles.validity}>Documento válido hasta: {data.validUntil.toDate().toLocaleDateString()}</p>
                </div>
            </div>
        </div>
    );
}
