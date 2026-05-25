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
import { Lead } from '@/types/tracking';
import { onLeadsUpdate, addLeadEvent } from '@/lib/firebase';

interface Props {
    initialData?: Partial<QuotationData>;
    id?: string;
    initialLeadId?: string;
    onSaveSuccess?: (quotationId: string) => void;
    onClose?: () => void;
}

export default function QuotationEditor({ initialData, id, initialLeadId, onSaveSuccess, onClose }: Props) {
    const { t } = useTranslation();
    const { showNotification } = useNotification();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [savedId, setSavedId] = useState<string | null>(id || null);
    
    // Lead Link State
    const [leads, setLeads] = useState<Lead[]>([]);
    const [leadId, setLeadId] = useState(initialData?.leadId || initialLeadId || '');
    const [leadSearch, setLeadSearch] = useState('');
    const [showLeadResults, setShowLeadResults] = useState(false);

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

    // Fetch leads for linking
    useEffect(() => {
        const unsubscribe = onLeadsUpdate((data) => {
            setLeads(data);
        });
        return () => unsubscribe();
    }, []);

    // Auto-prefill if initialLeadId is provided and leads are loaded
    useEffect(() => {
        if (initialLeadId && leads.length > 0) {
            const found = leads.find(l => l.lead_id === initialLeadId);
            if (found) {
                setLeadId(found.lead_id);
                setClientName(found.data?.name || '');
                setClientEmail(found.data?.email || '');
                if (found.data?.project_desc) {
                    setProjectTitle(found.data.project_desc.substring(0, 50));
                }
            }
        }
    }, [initialLeadId, leads]);

    const matchedLeads = leadSearch.trim()
        ? leads.filter(l => 
            l.data?.name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
            l.data?.email?.toLowerCase().includes(leadSearch.toLowerCase()) ||
            l.data?.company?.toLowerCase().includes(leadSearch.toLowerCase()) ||
            l.lead_id.toLowerCase().includes(leadSearch.toLowerCase())
          )
        : [];

    const selectedLead = leads.find(l => l.lead_id === leadId);

    const handleSelectLead = (l: Lead) => {
        setLeadId(l.lead_id);
        setClientName(l.data?.name || '');
        setClientEmail(l.data?.email || '');
        if (l.data?.project_desc) {
            setProjectTitle(l.data.project_desc.substring(0, 50));
        }
        setLeadSearch('');
        setShowLeadResults(false);
    };

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
            leadId: leadId || undefined,
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

            if (leadId) {
                try {
                    await addLeadEvent(leadId, {
                        event_type: 'custom',
                        description: `Cotización ${quotationData.quotationId} guardada. Estado: ${status}`,
                        timestamp: Timestamp.now(),
                        metadata: {
                            quotationId: quotationData.quotationId,
                            totalCents: total,
                            currency
                        }
                    } as any);
                } catch (eventError) {
                    console.error("Failed to add event to lead:", eventError);
                }
            }

            setSavedId(finalId!);

            if (isManualAction) showNotification("Cotización guardada con éxito", "success");
            
            if (onSaveSuccess) {
                onSaveSuccess(finalId!);
            } else if (leadId) {
                router.push(`/admin/prospectos/${leadId}`);
            } else if (!id) {
                router.push(`/admin/cotizaciones/${finalId}`);
            }
            
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

                    {/* Link to Lead / Prospecto */}
                    <div className={styles.inputGroup} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '0.5rem' }}>
                        <label>Vincular a Prospecto (Lead)</label>
                        {selectedLead ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(5, 17, 242, 0.05)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(5, 17, 242, 0.1)' }}>
                                <div>
                                    <strong style={{ color: 'var(--color-primary)', fontSize: '0.9rem' }}>{selectedLead.data?.name}</strong>
                                    {selectedLead.data?.company && ` - ${selectedLead.data.company}`}
                                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                        ID: {selectedLead.lead_id} | Email: {selectedLead.data?.email || 'No especificado'}
                                    </span>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setLeadId('')}
                                    style={{ background: 'transparent', border: 'none', color: '#e53e3e', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    Desvincular
                                </button>
                            </div>
                        ) : (
                            <div style={{ position: 'relative' }}>
                                <input 
                                    className={styles.input} 
                                    value={leadSearch} 
                                    onChange={e => {
                                        setLeadSearch(e.target.value);
                                        setShowLeadResults(true);
                                    }} 
                                    onFocus={() => setShowLeadResults(true)}
                                    placeholder="Buscar prospecto por nombre, email, empresa o ID..." 
                                />
                                {showLeadResults && matchedLeads.length > 0 && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
                                        {matchedLeads.map(l => (
                                            <div 
                                                key={l.lead_id}
                                                onClick={() => handleSelectLead(l)}
                                                style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-bg-alt)', cursor: 'pointer', transition: 'background 0.2s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-alt)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                            >
                                                <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--color-text-main)' }}>{l.data?.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                    {l.data?.company ? `${l.data.company} | ` : ''}{l.data?.email} | ID: {l.lead_id}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {showLeadResults && leadSearch.trim() && matchedLeads.length === 0 && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, padding: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                        No se encontraron prospectos coincidentes
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

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
                            <span style={{ textAlign: 'right' }}>Total</span>
                            <span></span>
                        </div>
                        {items.map((item, index) => (
                            <div key={item.id} className={styles.tableRow}>
                                <div className={styles.rowField} data-label="Descripción del Servicio">
                                    <input 
                                        className={styles.rowInput} 
                                        placeholder="Consultoría TI o producto..." 
                                        value={item.description} 
                                        onChange={e => handleItemChange(index, 'description', e.target.value)} 
                                        required
                                    />
                                </div>
                                <div className={styles.rowField} data-label="Cant.">
                                    <input 
                                        className={styles.rowInput} 
                                        type="number" 
                                        min="1" 
                                        value={item.quantity} 
                                        onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)} 
                                    />
                                </div>
                                <div className={styles.rowField} data-label="Precio Unitario">
                                    <input 
                                        className={styles.rowInput} 
                                        type="number" 
                                        placeholder="0.00" 
                                        value={item.unitPriceCents ? (item.unitPriceCents / 100) : ''} 
                                        onChange={e => {
                                            const val = parseFloat(e.target.value) || 0;
                                            handleItemChange(index, 'unitPriceCents', Math.round(val * 100));
                                        }} 
                                    />
                                </div>
                                <div className={styles.rowField} data-label="Total">
                                    <div className={styles.rowTotalValue}>
                                        {formatCurrency(item.totalCents)}
                                    </div>
                                </div>
                                <div className={styles.rowAction}>
                                    <button 
                                        type="button"
                                        className={styles.rowDeleteBtn} 
                                        onClick={() => removeItem(index)}
                                    >
                                        🗑️
                                    </button>
                                </div>
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
