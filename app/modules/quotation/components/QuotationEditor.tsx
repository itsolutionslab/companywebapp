"use client";

import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import styles from '../styles/QuotationEditor.module.css';
import { useTranslation } from '@/components/admin/LanguageContext';
import { useNotification } from '@/components/admin/NotificationContext';
import { db, auth } from '@/lib/firebase';
import { doc, setDoc, Timestamp, addDoc, collection } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import SignatureBox from '@/shared/ui/SignatureBox';
import { logQuotationEvent } from '../services/AuditService';
import { QuotationData, Currency, QuotationStatus, QuotationItem } from '../types/quotation';

interface Props {
    initialData?: Partial<QuotationData>;
    id?: string;
}

export default function QuotationEditor({ initialData, id }: Props) {
    const { t } = useTranslation();
    const { showNotification } = useNotification();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [savedId, setSavedId] = useState<string | null>(id || null);
    
    // Form State
    const [clientName, setClientName] = useState(initialData?.clientName || '');
    const [clientEmail, setClientEmail] = useState(initialData?.clientEmail || '');
    const [projectTitle, setProjectTitle] = useState(initialData?.projectTitle || '');
    const [currency, setCurrency] = useState<Currency>(initialData?.currency || 'USD');
    const [status, setStatus] = useState<QuotationStatus>(initialData?.status || 'draft');
    
    // Items State
    const [items, setItems] = useState<QuotationItem[]>(initialData?.items || [
        { id: crypto.randomUUID(), description: '', quantity: 1, unitPriceCents: 0, totalCents: 0 }
    ]);

    const [signature, setSignature] = useState<string | null>(initialData?.signature?.data || null);
    const [showSignaturePad, setShowSignaturePad] = useState(false);

    // Derived State
    const subtotal = items.reduce((sum, item) => sum + item.totalCents, 0);
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + tax;

    const editor = useEditor({
        extensions: [StarterKit],
        content: initialData?.context || `
            <p><strong>Contexto y Alcance del Proyecto:</strong></p>
            <p>Escribe aquí el contexto o copia/pega desde ChatGPT...</p>
        `,
    });

    const handleItemChange = (index: number, field: keyof QuotationItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        
        if (field === 'quantity' || field === 'unitPriceCents') {
            newItems[index].totalCents = newItems[index].quantity * newItems[index].unitPriceCents;
        }
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { id: crypto.randomUUID(), description: '', quantity: 1, unitPriceCents: 0, totalCents: 0 }]);
    };

    const removeItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleSave = async (isManualAction = true) => {
        if (!editor) {
            showNotification("El editor aún no está listo.", "warning");
            return;
        }
        if (!auth.currentUser) {
            showNotification("Debes iniciar sesión para guardar.", "error");
            return;
        }
        
        if (!clientName || !projectTitle || items.length === 0 || items.some(i => !i.description)) {
            showNotification("Completa todos los campos obligatorios (Cliente, Proyecto, y un Servicio válido)", "error");
            return;
        }
        
        setLoading(true);

        const version = (initialData?.audit?.version || 0) + 1;
        const quotationData: Omit<QuotationData, 'id'> = {
            quotationId: initialData?.quotationId || `Q-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
            clientName,
            clientEmail,
            projectTitle,
            date: initialData?.date || Timestamp.now(),
            validUntil: Timestamp.now(), // 15 days later usually
            currency,
            exchangeRate: 3.8, // Should fetch real rate
            items,
            subtotalCents: subtotal,
            taxCents: tax,
            totalCents: total,
            status,
            context: editor.getJSON(),
            ...(signature ? {
                signature: {
                    type: 'manual',
                    data: signature,
                    timestamp: Timestamp.now()
                }
            } : {}),
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

            setSavedId(finalId!);

            if (isManualAction) showNotification("Cotización guardada con éxito", "success");
            if (!id) router.push(`/admin/cotizaciones/${finalId}`);
            
        } catch (error) {
            console.error("Save error:", error);
            showNotification("Error al guardar en Firestore", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (format: 'pdf' | 'docx') => {
        const downloadId = savedId || id;
        if (!downloadId) {
            showNotification("Guarda la cotización antes de descargarla.", "warning");
            return;
        }
        await logQuotationEvent(format === 'pdf' ? 'DOWNLOAD_PDF' : 'DOWNLOAD_WORD', downloadId);
        
        if (format === 'pdf') {
            // Open a clean print view
            window.open(`/admin/cotizaciones/${downloadId}/print`, '_blank');
        } else {
            // Word export (mock for now)
            window.open(`/api/quotations/${downloadId}/export?format=${format}`, '_blank');
        }
    };

    const formatCurrency = (cents: number) => {
        return `${currency === 'USD' ? '$' : 'S/'} ${(cents / 100).toFixed(2)}`;
    };

    if (!editor) return null;

    return (
        <div className={styles.editorContainer}>
            <div className={styles.mainSection}>
                
                <div className={styles.formSection}>
                    <h2 className={styles.sectionTitle}>Información General</h2>
                    <div className={styles.grid2}>
                        <div className={styles.inputGroup}>
                            <label>Nombre del Cliente / Empresa *</label>
                            <input className={styles.input} value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ej. Corporación Andina" required />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Email de Contacto</label>
                            <input className={styles.input} type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="cliente@empresa.com" />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Título del Proyecto *</label>
                            <input className={styles.input} value={projectTitle} onChange={e => setProjectTitle(e.target.value)} placeholder="Ej. Desarrollo de Panel de Control" required />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Moneda</label>
                            <select className={styles.input} value={currency} onChange={e => setCurrency(e.target.value as Currency)}>
                                <option value="USD">Dólares (USD)</option>
                                <option value="PEN">Soles (PEN)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className={styles.formSection}>
                    <h2 className={styles.sectionTitle}>Contexto y Alcance</h2>
                    <div className={styles.toolbar}>
                        <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? styles.active : ''}>B</button>
                        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? styles.active : ''}>I</button>
                        <button onClick={() => editor.chain().focus().toggleBulletList().run()}>• Lista</button>
                    </div>
                    <div className={styles.tiptapFormWrapper}>
                        <EditorContent editor={editor} />
                    </div>
                </div>

                <div className={styles.formSection}>
                    <div className={styles.itemsHeader}>
                        <h2 className={styles.sectionTitle}>Tabla de Servicios</h2>
                        <button className={styles.secondaryBtn} onClick={addItem}>+ Añadir Servicio</button>
                    </div>
                    
                    <div className={styles.itemsTable}>
                        <div className={styles.tableHeader}>
                            <span>Descripción</span>
                            <span>Cant.</span>
                            <span>Precio Unitario</span>
                            <span>Total</span>
                            <span></span>
                        </div>
                        {items.map((item, index) => (
                            <div key={item.id} className={styles.tableRow}>
                                <input 
                                    className={styles.input} 
                                    placeholder="Consultoría TI..." 
                                    value={item.description} 
                                    onChange={e => handleItemChange(index, 'description', e.target.value)} 
                                />
                                <input 
                                    className={styles.input} 
                                    type="number" 
                                    min="1" 
                                    value={item.quantity} 
                                    onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)} 
                                />
                                <input 
                                    className={styles.input} 
                                    type="number" 
                                    placeholder="Precio base ej: 10000" 
                                    value={item.unitPriceCents} 
                                    onChange={e => handleItemChange(index, 'unitPriceCents', parseInt(e.target.value) || 0)} 
                                    title="Monto en céntimos enteros (ej. 10000 = 100.00)"
                                />
                                <div className={styles.rowTotal}>
                                    {formatCurrency(item.totalCents)}
                                </div>
                                <button className={styles.deleteBtn} onClick={() => removeItem(index)}>X</button>
                            </div>
                        ))}
                    </div>

                    <div className={styles.totalsSection}>
                        <div className={styles.totalRow}>
                            <span>Subtotal:</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        <div className={styles.totalRow}>
                            <span>IGV (18%):</span>
                            <span>{formatCurrency(tax)}</span>
                        </div>
                        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                            <span>Total General:</span>
                            <span>{formatCurrency(total)}</span>
                        </div>
                    </div>
                </div>

                {signature && (
                    <div className={styles.formSection}>
                        <h2 className={styles.sectionTitle}>Firma Validada</h2>
                        <div className={styles.signaturePreview}>
                            <img src={signature} alt="Firma" />
                            <div className={styles.signatureBadge}>Firma Manual / Auditada</div>
                        </div>
                    </div>
                )}
            </div>

            <aside className={styles.sidebar}>
                <div className={styles.actionsCard}>
                    <button 
                        className={styles.primaryBtn} 
                        onClick={() => handleSave()}
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : 'Sincronizar y Guardar'}
                    </button>
                    <div className={styles.downloadGroup}>
                        <button className={styles.downloadBtn} onClick={() => handleDownload('pdf')}>
                            📄 PDF
                        </button>
                        <button className={styles.wordBtn} onClick={() => handleDownload('docx')}>
                            W
                        </button>
                    </div>
                </div>

                <div className={styles.sidebarCard}>
                    <h3>Estado del Documento</h3>
                    <select className={styles.input} value={status} onChange={e => setStatus(e.target.value as QuotationStatus)}>
                        <option value="draft">Borrador</option>
                        <option value="sent">Enviado al Cliente</option>
                        <option value="signed">Firmado / Aprobado</option>
                        <option value="expired">Expirado / Perdido</option>
                    </select>
                </div>

                <div className={styles.sidebarCard}>
                    <h3>Firma de Aprobación</h3>
                    {!signature ? (
                        <button className={styles.secondaryBtn} onClick={() => setShowSignaturePad(true)}>Capturar Firma Manual</button>
                    ) : (
                        <button className={styles.dangerBtn} onClick={() => setSignature(null)}>Remover Firma</button>
                    )}
                </div>

                <div className={styles.sidebarCard}>
                    <h3>Auditoría y Trace</h3>
                    <div className={styles.auditList}>
                        <div className={styles.auditItem}>
                            <span className={styles.auditAction}>Versión</span>
                            <span className={styles.auditUser}>v{initialData?.audit?.version || 1}</span>
                        </div>
                    </div>
                </div>

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
                            <button className={styles.closeBtn} onClick={() => setShowSignaturePad(false)}>Cancelar</button>
                        </div>
                    </div>
                )}
            </aside>
        </div>
    );
}
