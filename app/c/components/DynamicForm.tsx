"use client";

import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';

type FieldState = 'required' | 'optional' | 'hidden';

export interface FieldConfig {
    id: string;
    label: string;
    state: FieldState;
}

interface DynamicFormProps {
    fieldsConfig: FieldConfig[];
    onSubmit: (data: any) => Promise<void>;
    buttonText?: string;
    buttonColor?: string;
    textColor?: string;
    isPreview?: boolean;
}

export default function DynamicForm({ fieldsConfig, onSubmit, buttonText = "Enviar", buttonColor = "#0ea5e9", textColor = "#111827", isPreview = false }: DynamicFormProps) {
    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm();
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Filter out hidden fields
    const visibleFields = fieldsConfig.filter(f => f.state !== 'hidden');

    const processSubmit: SubmitHandler<any> = async (data) => {
        setSubmitError(null);
        try {
            await onSubmit(data);
            setSubmitSuccess(true);
            reset(); // Clear form on success
            
            // Hide success message after 5 seconds
            setTimeout(() => {
                setSubmitSuccess(false);
            }, 5000);
        } catch (error: any) {
            setSubmitError(error.message || "Ocurrió un error al enviar el formulario.");
        }
    };

    if (submitSuccess) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: '0.5rem', border: '1px solid #a7f3d0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>¡Gracias por tu interés!</h3>
                <p>Hemos recibido tus datos correctamente. Un asesor se pondrá en contacto contigo a la brevedad.</p>
            </div>
        );
    }

    const Wrapper = isPreview ? 'div' as any : 'form';
    const wrapperProps = isPreview ? {} : { onSubmit: handleSubmit(processSubmit) };

    return (
        <Wrapper {...wrapperProps} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {submitError && (
                <div style={{ padding: '1rem', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '0.375rem', fontSize: '0.875rem' }}>
                    {submitError}
                </div>
            )}

            {visibleFields.map(field => {
                const isRequired = field.state === 'required';
                
                // Determine input type
                let inputType = 'text';
                if (field.id === 'email') inputType = 'email';
                if (field.id === 'phone') inputType = 'tel';
                if (field.id === 'website') inputType = 'url';
                if (field.id === 'file_url') inputType = 'file';

                return (
                    <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <label 
                            htmlFor={field.id} 
                            style={{ 
                                fontSize: '0.875rem', 
                                fontWeight: 600, 
                                color: textColor
                            }}
                        >
                            {field.label} {isRequired && <span style={{ color: '#ef4444' }}>*</span>}
                        </label>
                        
                        {field.id === 'objectives' || field.id === 'impact' ? (
                            <textarea
                                id={field.id}
                                {...register(field.id, { required: isRequired ? 'Este campo es obligatorio' : false })}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '0.375rem',
                                    border: `1px solid ${errors[field.id] ? '#ef4444' : '#d1d5db'}`,
                                    fontSize: '1rem',
                                    minHeight: '80px',
                                    resize: 'vertical',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                }}
                                placeholder={`Ingresa tu ${field.label.toLowerCase()}`}
                            />
                        ) : (
                            <input
                                id={field.id}
                                type={inputType}
                                {...register(field.id, { required: isRequired ? 'Este campo es obligatorio' : false })}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '0.375rem',
                                    border: `1px solid ${errors[field.id] ? '#ef4444' : '#d1d5db'}`,
                                    fontSize: '1rem',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                }}
                                placeholder={`Ingresa tu ${field.label.toLowerCase()}`}
                            />
                        )}
                        
                        {errors[field.id] && (
                            <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                {errors[field.id]?.message as string}
                            </span>
                        )}
                    </div>
                );
            })}

            <button 
                type={isPreview ? "button" : "submit"} 
                disabled={isSubmitting}
                style={{
                    marginTop: '1rem',
                    padding: '0.875rem 1.5rem',
                    backgroundColor: buttonColor,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.7 : 1,
                    transition: 'opacity 0.2s, transform 0.1s',
                    width: '100%'
                }}
                onMouseOver={(e) => {
                    if (!isSubmitting) e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                    if (!isSubmitting) e.currentTarget.style.transform = 'none';
                }}
            >
                {isSubmitting ? 'Enviando...' : buttonText}
            </button>
        </Wrapper>
    );
}
