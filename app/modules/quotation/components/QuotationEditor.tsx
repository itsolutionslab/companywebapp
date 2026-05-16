"use client";

import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import Image from '@tiptap/extension-image';
import styles from '../styles/QuotationEditor.module.css';
import { useTranslation } from '@/components/admin/LanguageContext';
import { db, auth } from '@/lib/firebase';
import { doc, setDoc, Timestamp, addDoc, collection } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import SignatureBox from '@/shared/ui/SignatureBox';
import { logQuotationEvent } from '../services/AuditService';
import { QuotationData, Currency, QuotationStatus } from '../types/quotation';

interface Props {
    initialData?: Partial<QuotationData>;
    id?: string;
}

export default function QuotationEditor({ initialData, id }: Props) {
    const { t } = useTranslation();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    
    // Metadata State
    const [clientName, setClientName] = useState(initialData?.clientName || '');
    const [clientEmail, setClientEmail] = useState(initialData?.clientEmail || '');
    const [subtotal, setSubtotal] = useState(initialData?.subtotalCents || 0);
    const [currency, setCurrency] = useState<Currency>(initialData?.currency || 'USD');
    const [status, setStatus] = useState<QuotationStatus>(initialData?.status || 'draft');
    const [signature, setSignature] = useState<string | null>(initialData?.signature?.data || null);
    const [showSignaturePad, setShowSignaturePad] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Table.configure({ resizable: true }),
            TableRow,
            TableCell,
            Image,
        ],
        content: initialData?.richContent || `
            <h1>Propuesta Técnica y Económica</h1>
            <p>Preparado por <strong>Brecomperu Solutions</strong> para su prestigiosa organización.</p>
            <table>
                <tbody>
                    <tr><th>Ítem</th><th>Descripción del Servicio</th><th>Total</th></tr>
                    <tr><td>01</td><td>Consultoría TI Especializada</td><td>$0.00</td></tr>
                </tbody>
            </table>
        `,
    });

    const handleSave = async (isManualAction = true) => {
        if (!editor || !auth.currentUser) return;
        setLoading(true);

        const version = (initialData?.audit?.version || 0) + 1;
        const quotationData: Omit<QuotationData, 'id'> = {
            quotationId: initialData?.quotationId || `Q-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
            clientName,
            clientEmail,
            date: initialData?.date || Timestamp.now(),
            validUntil: Timestamp.now(), // 15 days later usually
            currency,
            exchangeRate: 3.8, // Should fetch real rate
            subtotalCents: subtotal,
            taxCents: Math.round(subtotal * 0.18),
            totalCents: Math.round(subtotal * 1.18),
            status,
            richContent: editor.getJSON(),
            signature: signature ? {
                type: 'manual',
                data: signature,
                timestamp: Timestamp.now()
            } : undefined,
            audit: {
                createdBy: initialData?.audit?.createdBy || auth.currentUser.uid,
                createdAt: initialData?.audit?.createdAt || Timestamp.now(),
                lastModifiedBy: auth.currentUser.uid,
                lastModifiedAt: Timestamp.now(),
                version
            }
        };

        try {
            let finalId = id;
            if (id) {
                await setDoc(doc(db, "quotations", id), quotationData, { merge: true });
                await logQuotationEvent('UPDATE', id, version);
            } else {
                const docRef = await addDoc(collection(db, "quotations"), quotationData);
                finalId = docRef.id;
                await logQuotationEvent('CREATE', finalId, 1);
            }

            // Save Snapshot for Versioning
            await addDoc(collection(doc(db, "quotations", finalId!), "versions"), {
                ...quotationData,
                snapshotAt: Timestamp.now()
            });

            if (isManualAction) alert("Cotización sincronizada con éxito");
            if (!id) router.push(`/admin/cotizaciones/${finalId}`);
            
        } catch (error) {
            console.error("Save error:", error);
            alert("Error al guardar en Firestore");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (format: 'pdf' | 'docx') => {
        if (!id) {
            alert("Guarda la cotización antes de descargarla.");
            return;
        }
        
        await logQuotationEvent(format === 'pdf' ? 'DOWNLOAD_PDF' : 'DOWNLOAD_WORD', id);
        
        // Mock download - In real app, redirect to /api/quotations/[id]/export?format=pdf
        window.open(`/api/quotations/${id}/export?format=${format}`, '_blank');
    };

    if (!editor) return null;

    return (
        <div className={styles.editorContainer}>
            <div className={styles.mainSection}>
                <div className={styles.toolbar}>
                    <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? styles.active : ''}>B</button>
                    <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? styles.active : ''}>I</button>
                    <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? styles.active : ''}>H1</button>
                    <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? styles.active : ''}>H2</button>
                    <button onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</button>
                    <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>Table</button>
                </div>
                
                <div className={styles.paper}>
                    <div className={styles.paperHeader}>
                        <div className={styles.logo}>BRECOM<span>PERU</span></div>
                        <div className={styles.headerInfo}>
                            <p>Consultoría TI & Software Engineering</p>
                            <p>RUC: 20600000000</p>
                        </div>
                    </div>
                    
                    <div className={styles.tiptapWrapper}>
                        <EditorContent editor={editor} />
                    </div>

                    {signature && (
                        <div className={styles.signaturePreview}>
                            <p>Firmado Digitalmente:</p>
                            <img src={signature} alt="Firma" />
                            <div className={styles.signatureBadge}>VALIDADO VIA AUDIT TRAIL</div>
                        </div>
                    )}

                    <div className={styles.paperFooter}>
                        <p>brecomperu.com | Av. Javier Prado Este, Lima, Perú</p>
                        <p>Página 1 de 1</p>
                    </div>
                </div>
            </div>

            <aside className={styles.sidebar}>
                <div className={styles.actionsCard}>
                    <button className={styles.primaryBtn} onClick={() => handleSave()}>Guardar Cambios</button>
                    <div className={styles.downloadGroup}>
                        <button className={styles.downloadBtn} onClick={() => handleDownload('pdf')}>
                            📄 Descargar PDF
                        </button>
                        <button className={styles.wordBtn} onClick={() => handleDownload('docx')}>
                            W
                        </button>
                    </div>
                </div>

                <div className={styles.sidebarCard}>
                    <h3>Datos del Cliente</h3>
                    <input className={styles.input} placeholder="Cliente / Empresa" value={clientName} onChange={e => setClientName(e.target.value)} />
                    <input className={styles.input} placeholder="Email de contacto" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
                </div>

                <div className={styles.sidebarCard}>
                    <h3>Económico (Integer Base)</h3>
                    <div className={styles.currencyToggle}>
                        <button className={currency === 'USD' ? styles.activeCurrency : ''} onClick={() => setCurrency('USD')}>USD</button>
                        <button className={currency === 'PEN' ? styles.activeCurrency : ''} onClick={() => setCurrency('PEN')}>PEN</button>
                    </div>
                    <div className={styles.amountInput}>
                        <span>{currency === 'USD' ? '$' : 'S/'}</span>
                        <input type="number" value={subtotal} onChange={e => setSubtotal(parseInt(e.target.value) || 0)} />
                    </div>
                    <p className={styles.hint}>Monto en céntimos para evitar errores. Total: {(subtotal / 100).toFixed(2)}</p>
                </div>

                <div className={styles.sidebarCard}>
                    <h3>Firma y Validación</h3>
                    {!signature ? (
                        <button className={styles.secondaryBtn} onClick={() => setShowSignaturePad(true)}>Agregar Firma Manual</button>
                    ) : (
                        <button className={styles.dangerBtn} onClick={() => setSignature(null)}>Eliminar Firma</button>
                    )}
                    <button className={styles.disabledBtn} disabled>Firma Criptográfica (Coming Soon)</button>
                </div>

                <div className={styles.sidebarCard}>
                    <h3>Trazabilidad y Auditoría</h3>
                    <div className={styles.auditList}>
                        <div className={styles.auditItem}>
                            <span className={styles.auditAction}>Versión Actual</span>
                            <span className={styles.auditUser}>v{initialData?.audit?.version || 1}</span>
                        </div>
                        {id && (
                            <div className={styles.auditHint}>
                                Cada descarga y edición queda registrada en el Audit Trail Engine.
                            </div>
                        )}
                    </div>
                </div>

                <button 
                    className={styles.primaryBtn} 
                    onClick={() => handleSave()}
                    disabled={loading}
                >
                    {loading ? 'Guardando...' : 'Sincronizar Cotización'}
                </button>

                {showSignaturePad && (
                    <div className={styles.modal}>
                        <div className={styles.modalContent}>
                            <SignatureBox 
                                onSave={(data) => {
                                    setSignature(data);
                                    setShowSignaturePad(false);
                                }} 
                                onClear={() => setSignature(null)} 
                            />
                            <button className={styles.closeBtn} onClick={() => setShowSignaturePad(false)}>Cerrar</button>
                        </div>
                    </div>
                )}
            </aside>
        </div>
    );
}
