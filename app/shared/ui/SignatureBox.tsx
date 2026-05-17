"use client";

import { useEffect, useRef, useState } from 'react';
import SignaturePad from 'signature_pad';
import styles from './SignatureBox.module.css';

interface SignatureBoxProps {
    onSave: (base64: string) => void;
    onClear?: () => void;
}

export default function SignatureBox({ onSave, onClear }: SignatureBoxProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const signaturePadRef = useRef<SignaturePad | null>(null);
    const [isEmpty, setIsEmpty] = useState(true);

    useEffect(() => {
        if (canvasRef.current) {
            signaturePadRef.current = new SignaturePad(canvasRef.current, {
                backgroundColor: 'rgba(255, 255, 255, 0)',
                penColor: 'rgb(0, 0, 0)'
            });

            signaturePadRef.current.addEventListener("endStroke", () => {
                setIsEmpty(false);
            });

            // Responsive canvas
            const resizeCanvas = () => {
                if (canvasRef.current && signaturePadRef.current) {
                    const ratio = Math.max(window.devicePixelRatio || 1, 1);
                    canvasRef.current.width = canvasRef.current.offsetWidth * ratio;
                    canvasRef.current.height = canvasRef.current.offsetHeight * ratio;
                    canvasRef.current.getContext("2d")?.scale(ratio, ratio);
                    signaturePadRef.current.clear();
                }
            };

            window.addEventListener("resize", resizeCanvas);
            resizeCanvas();

            return () => window.removeEventListener("resize", resizeCanvas);
        }
    }, []);

    const handleClear = () => {
        signaturePadRef.current?.clear();
        setIsEmpty(true);
        if (onClear) onClear();
    };

    const handleConfirm = () => {
        if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
            onSave(signaturePadRef.current.toDataURL());
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.canvasWrapper}>
                <canvas ref={canvasRef} className={styles.canvas}></canvas>
                {isEmpty && <div className={styles.placeholder}>Firma aquí</div>}
            </div>
            <div className={styles.controls}>
                <button onClick={handleClear} className={styles.clearBtn}>Limpiar</button>
                <button onClick={handleConfirm} className={styles.saveBtn} disabled={isEmpty}>Confirmar Firma</button>
            </div>
        </div>
    );
}
