"use client";

import React, { useContext } from 'react';
import { Block, BuilderContext } from './BuilderContext';

export default function BlockRenderer({ block, isPreview = false, formComponent }: { block: Block; isPreview?: boolean; formComponent?: React.ReactNode }) {
    // Safely use context so it doesn't crash if used outside provider when isPreview=true
    const context = useContext(BuilderContext);
    
    const isSelected = context ? context.state.selectedBlockId === block.id : false;

    const handleSelect = (e: React.MouseEvent) => {
        if (isPreview || !context) return;
        e.stopPropagation();
        context.dispatch({ type: 'SELECT_BLOCK', payload: block.id });
    };

    const blockStyle = isPreview 
        ? {} 
        : {
            border: isSelected ? '2px solid var(--admin-primary)' : '2px dashed transparent',
            position: 'relative' as const,
            cursor: 'pointer',
            transition: 'border 0.2s ease'
          };

    // Render the specific block based on its type
    const renderContent = () => {
        switch (block.type) {
            case 'hero':
                return (
                    <div style={{
                        padding: '4rem 2rem',
                        textAlign: block.content.alignment || 'center',
                        backgroundColor: block.content.backgroundColor || '#f9fafb',
                        backgroundImage: block.content.backgroundImage ? `url(${block.content.backgroundImage})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        color: block.content.textColor || '#111827',
                        minHeight: '300px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: block.content.alignment === 'left' ? 'flex-start' : (block.content.alignment === 'right' ? 'flex-end' : 'center')
                    }}>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>
                            {block.content.title || 'Título de Hero'}
                        </h1>
                        <p style={{ fontSize: '1.125rem', opacity: 0.9, maxWidth: '600px', marginBottom: block.content.buttonText ? '2rem' : '0' }}>
                            {block.content.subtitle || 'Subtítulo persuasivo para captar la atención del prospecto.'}
                        </p>
                        {block.content.buttonText && (
                            <button style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: block.content.buttonColor || '#0ea5e9',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '0.375rem',
                                fontSize: '1rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}>
                                {block.content.buttonText}
                            </button>
                        )}
                    </div>
                );
            case 'text':
                return (
                    <div style={{
                        padding: '2rem',
                        backgroundColor: block.content.backgroundColor || 'transparent',
                        color: block.content.textColor || 'inherit',
                        textAlign: block.content.alignment || 'left',
                        fontSize: block.content.fontSize || '1rem',
                    }}>
                        <div dangerouslySetInnerHTML={{ __html: block.content.html || '<p>Añade tu texto aquí...</p>' }} />
                    </div>
                );
            case 'image':
                return (
                    <div style={{
                        padding: '1rem',
                        textAlign: block.content.alignment || 'center',
                        backgroundColor: block.content.backgroundColor || 'transparent',
                    }}>
                        {block.content.url ? (
                            <img 
                                src={block.content.url} 
                                alt={block.content.alt || 'Image'} 
                                style={{ 
                                    maxWidth: '100%', 
                                    height: 'auto', 
                                    borderRadius: block.content.borderRadius || '0',
                                    display: 'inline-block'
                                }} 
                            />
                        ) : (
                            <div style={{ padding: '3rem', backgroundColor: '#e5e7eb', color: '#6b7280', borderRadius: '0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '200px' }}>
                                <span>[Bloque de Imagen - Sin fuente]</span>
                            </div>
                        )}
                    </div>
                );
            case 'form':
                return (
                    <div style={{
                        padding: '2rem',
                        backgroundColor: block.content.backgroundColor || '#ffffff',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        maxWidth: '500px',
                        margin: '0 auto',
                    }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', textAlign: 'center', color: block.content.textColor || '#111827' }}>
                            {block.content.title || 'Déjanos tus datos'}
                        </h3>
                        <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem', textAlign: 'center', color: '#6b7280' }}>
                            {block.content.subtitle || 'Un asesor se pondrá en contacto contigo.'}
                        </p>
                        
                        {formComponent ? (
                            <div style={{ pointerEvents: isPreview ? 'auto' : 'none' }}>
                                {formComponent}
                            </div>
                        ) : (
                            <div style={{ opacity: 0.6, pointerEvents: 'none' }}>
                                {/* Placeholder for the form inside the builder if formComponent is missing */}
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ height: '2.5rem', backgroundColor: '#f3f4f6', borderRadius: '0.25rem', width: '100%' }}></div>
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ height: '2.5rem', backgroundColor: '#f3f4f6', borderRadius: '0.25rem', width: '100%' }}></div>
                                </div>
                                <button style={{ width: '100%', padding: '0.75rem', backgroundColor: block.content.buttonColor || '#0ea5e9', color: '#ffffff', borderRadius: '0.25rem', border: 'none', fontWeight: 600 }}>
                                    {block.content.buttonText || 'Enviar Información'}
                                </button>
                            </div>
                        )}
                    </div>
                );
            case 'features':
                const featuresList = block.content.items || [
                    { title: 'Característica 1', description: 'Descripción de la característica 1' },
                    { title: 'Característica 2', description: 'Descripción de la característica 2' },
                    { title: 'Característica 3', description: 'Descripción de la característica 3' }
                ];
                return (
                    <div style={{ padding: '3rem 2rem', backgroundColor: block.content.backgroundColor || 'transparent' }}>
                        <h2 style={{ fontSize: '1.875rem', fontWeight: 800, textAlign: 'center', marginBottom: '2.5rem', color: block.content.textColor || '#111827' }}>
                            {block.content.title || 'Nuestros Beneficios'}
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${block.content.minWidth || '250px'}, 1fr))`, gap: '2rem' }}>
                            {featuresList.map((item: any, i: number) => (
                                <div key={i} style={{ textAlign: block.content.alignment || 'center' }}>
                                    {item.icon && <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{item.icon}</div>}
                                    <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem', color: block.content.textColor || '#111827' }}>{item.title}</h4>
                                    <p style={{ color: '#4b5563', fontSize: '0.95rem' }}>{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            default:
                return <div>Bloque Desconocido</div>;
        }
    };

    return (
        <div 
            className="campaign-builder-block"
            style={blockStyle} 
            onClick={handleSelect}
        >
            {renderContent()}
            
            {!isPreview && isSelected && (
                <div style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '10px',
                    backgroundColor: 'var(--admin-primary)',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    zIndex: 10
                }}>
                    {block.type.toUpperCase()}
                </div>
            )}
        </div>
    );
}
