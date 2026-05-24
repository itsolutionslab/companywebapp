"use client";

import { useState, useEffect, Suspense } from "react";
import { confirmPasswordReset } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./Action.module.css";

function PasswordResetForm() {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [loading, setLoading] = useState(false);
    
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const mode = searchParams.get("mode");
    const oobCode = searchParams.get("oobCode");

    useEffect(() => {
        if (!mode || !oobCode) {
            setMessage({ type: "error", text: "Enlace inválido o incompleto. Verifica que has copiado la URL correcta de tu correo." });
        } else if (mode !== "resetPassword") {
            setMessage({ type: "error", text: "Acción no soportada por esta página." });
        }
    }, [mode, oobCode]);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setMessage({ type: "error", text: "Las contraseñas no coinciden." });
            return;
        }

        if (newPassword.length < 6) {
            setMessage({ type: "error", text: "La contraseña debe tener al menos 6 caracteres." });
            return;
        }

        if (!oobCode) return;

        setLoading(true);
        setMessage({ type: "", text: "" });

        try {
            await confirmPasswordReset(auth, oobCode, newPassword);
            setMessage({ type: "success", text: "¡Contraseña restablecida con éxito!" });
            setTimeout(() => {
                router.push("/admin/ingreso");
            }, 3000);
        } catch (err: any) {
            console.error(err);
            setMessage({ type: "error", text: "El enlace es inválido o ha expirado. Por favor solicita uno nuevo." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.modal}>
                <div className={styles.diagonalAccent}></div>
                <header className={styles.header}>
                    <div className={styles.logoContainer}>
                        <span className={styles.logoText}>BP</span>
                        <div className={styles.logoAccent}></div>
                    </div>
                    <div className={styles.decoratorLine}></div>
                    <h1 className={styles.title}>RECUPERACIÓN</h1>
                    <p className={styles.subtitle}>
                        RESTABLECER CONTRASEÑA
                    </p>
                </header>

                <form onSubmit={handleResetPassword} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Nueva Contraseña</label>
                        <div className={styles.inputWrapper}>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className={styles.input}
                                placeholder="••••••••"
                                disabled={!oobCode || mode !== "resetPassword" || message.type === "success"}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className={styles.togglePasswordBtn}
                                disabled={!oobCode || mode !== "resetPassword" || message.type === "success"}
                                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={styles.icon}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={styles.icon}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                    
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Confirmar Contraseña</label>
                        <div className={styles.inputWrapper}>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className={styles.input}
                                placeholder="••••••••"
                                disabled={!oobCode || mode !== "resetPassword" || message.type === "success"}
                            />
                        </div>
                    </div>

                    {message.text && (
                        <div className={`${styles.messageBox} ${
                            message.type === 'error' 
                                ? styles.messageError
                                : styles.messageSuccess
                        }`}>
                            {message.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !oobCode || mode !== "resetPassword" || message.type === "success"}
                        className={styles.submitBtn}
                    >
                        {loading ? "GUARDANDO..." : "CAMBIAR CONTRASEÑA"}
                    </button>
                    
                    <div className={styles.backLinkContainer}>
                        <button 
                            type="button" 
                            onClick={() => router.push("/admin/ingreso")}
                            className={styles.backLink}
                        >
                            Volver al login
                        </button>
                    </div>
                </form>

                <footer className={styles.footer}>
                    <p className={styles.footerText}>
                        &copy; 2026 BRECOMPERU SOLUTIONS IT.
                    </p>
                </footer>
            </div>
        </div>
    );
}

export default function ActionPage() {
    return (
        <Suspense fallback={
            <div className={styles.spinnerContainer}>
                <div className={styles.spinner}></div>
            </div>
        }>
            <PasswordResetForm />
        </Suspense>
    );
}
