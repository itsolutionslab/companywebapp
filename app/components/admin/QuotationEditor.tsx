"use client";

import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { Image } from '@tiptap/extension-image';
import styles from './QuotationEditor.module.css';
import { useTranslation } from './LanguageContext';
import { db, auth } from '@/lib/firebase';
import { doc, setDoc, Timestamp, addDoc, collection } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface QuotationEditorProps {
    initialData?: any;
    quotationId?: string;
}

export default function QuotationEditor({ initialData, quotationId }: QuotationEditorProps) {
    const { t } = useTranslation();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    
    // Metadata State
    const [clientName, setClientName] = useState(initialData?.clientName || '');
    const [clientEmail, setClientEmail] = useState(initialData?.clientEmail || '');
    const [total, setTotal] = useState(initialData?.total || 0);
    const [currency, setCurrency] = useState(initialData?.currency || 'USD');
    const [status, setStatus] = useState(initialData?.status || 'draft');

    const editor = useEditor({
        extensions: [
            StarterKit,
            Table.configure({ resizable: true }),
            TableRow,
            TableCell,
            Image,
        ],
        content: initialData?.richContent || `
            <h1>Cotización de Servicios TI</h1>
            <p>Estimado cliente, es un placer presentarle nuestra propuesta técnica y económica.</p>
            <table>
                <tbody>
                    <tr><th>Servicio</th><th>Descripción</th><th>Costo</th></tr>
                    <tr><td>Desarrollo Web</td><td>Implementación de plataforma Next.js</td><td>$0.00</td></tr>
                </tbody>
            </table>
        `,
    });

    const handleSave = async () => {
        if (!editor) return;
        setLoading(true);

        const quotationData = {
            clientName,
            clientEmail,
            total,
            currency,
            status,
            richContent: editor.getJSON(),
            updatedAt: Timestamp.now(),
            ownerId: auth.currentUser?.uid,
            // Audit Trail
            audit: {
                lastAction: quotationId ? 'UPDATE' : 'CREATE',
                timestamp: Timestamp.now(),
                userId: auth.currentUser?.uid
            }
        };

        try {
            if (quotationId) {
                const docRef = doc(db, "quotations", quotationId);
                await setDoc(docRef, quotationData, { merge: true });
                
                // Add to versions subcollection
                await addDoc(collection(docRef, "versions"), {
                    ...quotationData,
                    versionedAt: Timestamp.now()
                });
            } else {
                const docRef = await addDoc(collection(db, "quotations"), {
                    ...quotationData,
                    createdAt: Timestamp.now(),
                    quotationId: `Q-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
                });
                
                // Initial version
                await addDoc(collection(docRef, "versions"), {
                    ...quotationData,
                    versionedAt: Timestamp.now()
                });

                router.push(`/admin/cotizaciones/${docRef.id}`);
            }
            alert("Cotización guardada con éxito");
        } catch (error) {
            console.error("Error saving quotation:", error);
            alert("Error al guardar");
        } finally {
            setLoading(false);
        }
    };

    if (!editor) return null;

    return (
        <div className={styles.editorContainer}>
            <div className={styles.mainSection}>
                <div className={styles.toolbar}>
                    <button 
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={`${styles.toolbarButton} ${editor.isActive('bold') ? styles.toolbarButtonActive : ''}`}
                    >B</button>
                    <button 
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`${styles.toolbarButton} ${editor.isActive('italic') ? styles.toolbarButtonActive : ''}`}
                    >I</button>
                    <button 
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        className={`${styles.toolbarButton} ${editor.isActive('heading', { level: 1 }) ? styles.toolbarButtonActive : ''}`}
                    >H1</button>
                    <button 
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={`${styles.toolbarButton} ${editor.isActive('heading', { level: 2 }) ? styles.toolbarButtonActive : ''}`}
                    >H2</button>
                    <button 
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={`${styles.toolbarButton} ${editor.isActive('bulletList') ? styles.toolbarButtonActive : ''}`}
                    >•</button>
                    <button 
                        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                        className={styles.toolbarButton}
                    >田</button>
                </div>
                
                <div className={styles.tiptapWrapper}>
                    <EditorContent editor={editor} />
                </div>
            </div>

            <aside className={styles.sidebar}>
                <div className={styles.totalDisplay}>
                    <div className={styles.label}>{t('total')} Estímado</div>
                    <div className={styles.amount}>
                        {(total / 100).toLocaleString()} <span style={{fontSize: '1rem'}}>{currency}</span>
                    </div>
                </div>

                <div className={styles.sidebarCard}>
                    <h3>{t('client')}</h3>
                    <div className={styles.inputGroup}>
                        <label>{t('full_name')}</label>
                        <input 
                            className={styles.input} 
                            value={clientName} 
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="Nombre de la empresa o contacto"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>{t('email')}</label>
                        <input 
                            className={styles.input} 
                            value={clientEmail} 
                            onChange={(e) => setClientEmail(e.target.value)}
                            placeholder="correo@ejemplo.com"
                        />
                    </div>
                </div>

                <div className={styles.sidebarCard}>
                    <h3>Detalles Económicos</h3>
                    <div className={styles.inputGroup}>
                        <label>Monto Total (Céntimos)</label>
                        <input 
                            type="number"
                            className={styles.input} 
                            value={total} 
                            onChange={(e) => setTotal(parseInt(e.target.value) || 0)}
                        />
                        <p style={{fontSize: '0.6rem', color: '#999', marginTop: '0.5rem'}}>
                            Ingresa el monto en céntimos (ej: 10000 = $100.00) para evitar errores de coma flotante.
                        </p>
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Moneda</label>
                        <select 
                            className={styles.input} 
                            value={currency} 
                            onChange={(e) => setCurrency(e.target.value)}
                        >
                            <option value="USD">USD - Dólares</option>
                            <option value="PEN">PEN - Soles</option>
                            <option value="EUR">EUR - Euros</option>
                        </select>
                    </div>
                    <div className={styles.inputGroup}>
                        <label>{t('status')}</label>
                        <select 
                            className={styles.input} 
                            value={status} 
                            onChange={(e) => setStatus(e.target.value as any)}
                        >
                            <option value="draft">{t('status_draft')}</option>
                            <option value="sent">{t('status_sent')}</option>
                            <option value="signed">{t('status_signed')}</option>
                            <option value="expired">{t('status_expired')}</option>
                        </select>
                    </div>
                </div>

                <button 
                    className={styles.saveButton} 
                    onClick={handleSave}
                    disabled={loading}
                >
                    {loading ? 'Guardando...' : 'Guardar Cotización'}
                </button>
            </aside>
        </div>
    );
}
