"use client";

import React, { useState } from 'react';
import { BuilderProvider, useBuilder, Block, BlockType } from './BuilderContext';
import BlockRenderer from './BlockRenderer';
import DynamicForm from '@/app/c/components/DynamicForm';

const generateId = () => Math.random().toString(36).substring(2, 9);

function BuilderCanvas({ formConfig = [] }: { formConfig?: any[] }) {
    const { state, dispatch } = useBuilder();
    const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedBlockIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        // Hide the ghost image a bit by styling the drag target if needed
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, toIndex: number) => {
        e.preventDefault();
        if (draggedBlockIndex !== null && draggedBlockIndex !== toIndex) {
            dispatch({ type: 'MOVE_BLOCK', payload: { fromIndex: draggedBlockIndex, toIndex } });
        }
        setDraggedBlockIndex(null);
    };

    return (
        <div className="campaign-builder-canvas" style={{ flex: 1, backgroundColor: '#f3f4f6', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', backgroundColor: 'white', minHeight: '800px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', position: 'relative' }}>
                {state.blocks.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px', color: '#9ca3af', flexDirection: 'column' }}>
                        <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>🖱️</span>
                        <p>Arrastra bloques desde el panel izquierdo para empezar a diseñar</p>
                    </div>
                ) : (
                    state.blocks.map((block, index) => {
                        let formComponent = undefined;
                        if (block.type === 'form') {
                            formComponent = (
                                <DynamicForm 
                                    fieldsConfig={formConfig}
                                    onSubmit={async () => {}} // Disabled in preview
                                    buttonText={block.content.buttonText}
                                    buttonColor={block.content.buttonColor}
                                    textColor={block.content.textColor}
                                    isPreview={true}
                                />
                            );
                        }

                        return (
                            <div 
                                key={block.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDrop={(e) => handleDrop(e, index)}
                                style={{ opacity: draggedBlockIndex === index ? 0.5 : 1 }}
                            >
                                <BlockRenderer block={block} formComponent={formComponent} />
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function BuilderSidebar({ isMobileOpen, closeMobile }: { isMobileOpen: boolean, closeMobile: () => void }) {
    const { state, dispatch } = useBuilder();
    
    const selectedBlock = state.blocks.find(b => b.id === state.selectedBlockId);

    const handleAddBlock = (type: BlockType) => {
        const newBlock: Block = {
            id: generateId(),
            type,
            content: getDefaultContent(type)
        };
        dispatch({ type: 'ADD_BLOCK', payload: { block: newBlock } });
        closeMobile(); // Auto-close drawer on mobile when block added
    };

    const handleUpdateBlock = (key: string, value: any) => {
        if (selectedBlock) {
            dispatch({ 
                type: 'UPDATE_BLOCK', 
                payload: { id: selectedBlock.id, content: { [key]: value } } 
            });
        }
    };

    const handleDeleteBlock = () => {
        if (selectedBlock) {
            dispatch({ type: 'REMOVE_BLOCK', payload: selectedBlock.id });
            closeMobile(); // Auto-close drawer on mobile when block deleted
        }
    };

    return (
        <div className={`builder-sidebar ${isMobileOpen ? 'mobile-open' : ''}`} style={{ height: '100%', overflow: 'hidden' }}>
            <div className="builder-sidebar-handle" onClick={closeMobile} style={{ cursor: 'pointer' }}></div>
            
            {!selectedBlock ? (
                <div style={{ padding: '0 1.5rem 1.5rem', overflowY: 'auto' }}>
                    <h3 className="admin-h3" style={{ fontSize: '1rem', marginBottom: '1rem' }}>Añadir Bloques</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <button className="admin-btn" onClick={() => handleAddBlock('hero')} style={{ padding: '1rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🖼️</span>
                            <span style={{ fontSize: '0.75rem' }}>Hero</span>
                        </button>
                        <button className="admin-btn" onClick={() => handleAddBlock('text')} style={{ padding: '1rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📝</span>
                            <span style={{ fontSize: '0.75rem' }}>Texto</span>
                        </button>
                        <button className="admin-btn" onClick={() => handleAddBlock('image')} style={{ padding: '1rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📸</span>
                            <span style={{ fontSize: '0.75rem' }}>Imagen</span>
                        </button>
                        <button className="admin-btn" onClick={() => handleAddBlock('features')} style={{ padding: '1rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✨</span>
                            <span style={{ fontSize: '0.75rem' }}>Beneficios</span>
                        </button>
                        <button className="admin-btn" onClick={() => handleAddBlock('form')} style={{ padding: '1rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gridColumn: 'span 2' }}>
                            <span style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📋</span>
                            <span style={{ fontSize: '0.75rem' }}>Formulario</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '0 1.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--admin-border)', flexShrink: 0 }}>
                        <h3 className="admin-h3" style={{ fontSize: '1rem', margin: 0, color: '#0511f2' }}>EDITAR {selectedBlock.type.toUpperCase()}</h3>
                        <button onClick={() => dispatch({ type: 'SELECT_BLOCK', payload: null })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>🔙</button>
                    </div>

                    {/* Generador de controles basados en el contenido del bloque */}
                    <div className="admin-scrollable" style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, minHeight: 0 }}>
                        
                        {Object.keys(selectedBlock.content).map(key => {
                            // Ignorar objetos complejos por ahora en el editor genérico (como arrays de features)
                            if (typeof selectedBlock.content[key] === 'object') return null;
                            
                            // Detectar colores
                            const isColor = key.toLowerCase().includes('color');
                            const isUrl = key.toLowerCase().includes('url') || key.toLowerCase().includes('image');
                            
                            return (
                                <div key={key} className="admin-input-group">
                                    <label className="admin-label" style={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                                    {isColor ? (
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <input 
                                                type="color" 
                                                value={selectedBlock.content[key]} 
                                                onChange={(e) => handleUpdateBlock(key, e.target.value)}
                                                style={{ width: '40px', height: '40px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                            />
                                            <input 
                                                type="text" 
                                                value={selectedBlock.content[key]} 
                                                onChange={(e) => handleUpdateBlock(key, e.target.value)}
                                                className="admin-input"
                                            />
                                        </div>
                                    ) : (
                                        <input 
                                            type={isUrl ? 'url' : 'text'}
                                            value={selectedBlock.content[key]} 
                                            onChange={(e) => handleUpdateBlock(key, e.target.value)}
                                            className="admin-input"
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ padding: '1.5rem', borderTop: '1px solid var(--admin-border)', backgroundColor: 'var(--admin-surface)', flexShrink: 0 }}>
                        <button 
                            onClick={handleDeleteBlock}
                            className="admin-btn"
                            style={{ width: '100%', backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5' }}
                        >
                            🗑️ Eliminar Bloque
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function getDefaultContent(type: BlockType) {
    switch(type) {
        case 'hero': return { title: 'Tu Gran Promesa Aquí', subtitle: 'Agrega un subtítulo que explique el valor que aportas a tu cliente ideal.', buttonText: 'Llamado a la acción', buttonColor: '#0ea5e9', backgroundColor: '#f9fafb', textColor: '#111827', alignment: 'center', backgroundImage: '' };
        case 'text': return { html: '<p>Escribe tu contenido aquí. Puedes usar HTML para <strong>negritas</strong> o enlaces.</p>', backgroundColor: 'transparent', textColor: '#374151', alignment: 'left', fontSize: '1.125rem' };
        case 'image': return { url: '', alt: 'Descripción de imagen', alignment: 'center', backgroundColor: 'transparent', borderRadius: '8px' };
        case 'form': return { title: 'Déjanos tus datos', subtitle: 'Nos comunicaremos contigo lo antes posible.', buttonText: 'Enviar Solicitud', buttonColor: '#0ea5e9', backgroundColor: '#ffffff', textColor: '#111827' };
        case 'features': return { title: 'Por qué elegirnos', backgroundColor: 'transparent', textColor: '#111827', items: [{ title: 'Rapidez', description: 'Atención inmediata' }, { title: 'Seguridad', description: 'Tus datos protegidos' }] };
        default: return {};
    }
}

export default function LandingBuilder({ initialBlocks = [], onChange, formConfig = [] }: { initialBlocks?: Block[], onChange?: (blocks: Block[]) => void, formConfig?: any[] }) {
    return (
        <BuilderProvider initialBlocks={initialBlocks}>
            <LandingBuilderContent onChange={onChange} formConfig={formConfig} />
        </BuilderProvider>
    );
}

function LandingBuilderContent({ onChange, formConfig }: { onChange?: (blocks: Block[]) => void, formConfig?: any[] }) {
    const { state } = useBuilder();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const onChangeRef = React.useRef(onChange);

    // Update ref when onChange changes
    React.useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    // Call onChange whenever blocks change
    React.useEffect(() => {
        if (onChangeRef.current) {
            onChangeRef.current(state.blocks);
        }
    }, [state.blocks]);

    // Open drawer when a block is selected
    React.useEffect(() => {
        if (state.selectedBlockId) {
            setIsMobileOpen(true);
        }
    }, [state.selectedBlockId]);

    return (
        <div className="builder-layout">
            <BuilderCanvas formConfig={formConfig} />
            <BuilderSidebar isMobileOpen={isMobileOpen} closeMobile={() => setIsMobileOpen(false)} />
            
            <button 
                type="button"
                className="builder-mobile-toggle"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
                {isMobileOpen ? '👁️' : '✏️'}
            </button>
            <div 
                className={`builder-mobile-overlay ${isMobileOpen ? 'mobile-open' : ''}`}
                onClick={() => setIsMobileOpen(false)}
            ></div>
        </div>
    );
}
