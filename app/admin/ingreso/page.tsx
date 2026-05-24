"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Turnstile from "react-turnstile";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!turnstileToken) {
            setError("Please complete the security verification.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // Verify token server-side before proceeding
            // We use the same general verification endpoint or the Turnstile check
            const verifyRes = await fetch('/api/verify-turnstile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: turnstileToken }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyData.success) {
                setError("Security verification failed. Please try again.");
                setLoading(false);
                return;
            }

            await signInWithEmailAndPassword(auth, email, password);
            const isSubdomain = typeof window !== 'undefined' && (window.location.hostname.startsWith('admin.') || window.location.hostname.startsWith('management.') || window.location.hostname.startsWith('landing.'));
            router.push(isSubdomain ? "/panel" : "/admin/panel");
        } catch (err: any) {
            setError("Incorrect credentials or connection error.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] px-4 animate-in fade-in duration-700">
            <div className="admin-modal w-full max-w-md !p-10 shadow-2xl shadow-blue-900/10 border border-gray-100 relative overflow-hidden group">
                <div className="diagonal-accent !opacity-10"></div>
                <header className="text-center mb-12 relative z-10">
                    <div className="w-24 h-24 bg-[#0511F2] rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-4xl shadow-xl shadow-blue-200 relative overflow-hidden group-hover:scale-105 transition-transform duration-500">
                        <span className="text-white font-black">BP</span>
                        <div className="absolute top-0 right-0 w-8 h-8 bg-[#EAF207] translate-x-4 -translate-y-4 rotate-45"></div>
                    </div>
                    <div className="admin-decorator-line mx-auto mb-4"></div>
                    <h1 className="text-2xl font-black text-[#0511F2] tracking-tighter mb-2 uppercase font-heading">BRECOMPERU</h1>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                        <span className="w-1.5 h-1.5 bg-[#6FD904] rounded-full animate-pulse shadow-[0_0_8px_#6FD904]"></span>
                        SISTEMA ADMINISTRATIVO
                    </p>
                </header>

                <form onSubmit={handleLogin} className="space-y-8 relative z-10">
                    <div className="admin-input-group">
                        <label className="admin-label">Correo Electrónico</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="admin-input"
                            placeholder="admin@brecomperu.com"
                        />
                    </div>

                    <div className="admin-input-group">
                        <label className="admin-label">Contraseña de Seguridad</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="admin-input pr-14"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0511F2] transition-colors"
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Turnstile Widget */}
                    <div className="flex justify-center py-2 overflow-hidden rounded-2xl bg-gray-50 border border-gray-100 p-2">
                        <Turnstile
                            sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                            onVerify={(token) => setTurnstileToken(token)}
                            onExpire={() => setTurnstileToken(null)}
                            onError={() => setError("Error en verificación de seguridad.")}
                        />
                    </div>

                    {error && (
                        <div className="p-6 bg-rose-50 border border-rose-100 rounded-[1.5rem] text-rose-600 text-[11px] font-black uppercase tracking-widest leading-relaxed">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full admin-btn admin-btn-primary py-5 shadow-xl shadow-pink-200"
                    >
                        {loading ? "INICIANDO SESIÓN..." : "ACCEDER AL PANEL"}
                    </button>
                </form>

                <footer className="mt-12 pt-8 border-t border-gray-100 text-center relative z-10">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                        &copy; 2026 BRECOMPERU SOLUTIONS IT.
                    </p>
                </footer>
            </div>
        </div>
    );
}
