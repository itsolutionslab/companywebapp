"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function AdminInitPage() {
    const [email, setEmail] = useState("admin@nailsbysana.com");
    const [password, setPassword] = useState("SanaAdmin2026!");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const router = useRouter();

    const handleInit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: "Super Admin" });

            await setDoc(doc(db, "users", userCredential.user.uid), {
                full_name: "Super Admin",
                email: email,
                role: "admin",
                created_at: new Date()
            });

            setMessage("✅ Usuario inicial creado con éxito!");
            setTimeout(() => router.push("/admin/ingreso"), 2000);
        } catch (error: any) {
            setMessage(`❌ Error: ${error.message}. Asegúrate de que 'Email/Password' esté habilitado en Firebase Console.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4 animate-in fade-in duration-700">
            <div className="admin-modal w-full max-w-md !p-10 shadow-2xl shadow-blue-900/10 border border-gray-100 relative overflow-hidden group">
                <div className="diagonal-accent !opacity-10"></div>
                <header className="text-center mb-10 relative z-10">
                    <div className="w-20 h-20 bg-[#0511F2] rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-4xl shadow-xl shadow-blue-200 text-white relative overflow-hidden group-hover:scale-105 transition-transform duration-500">
                        <span className="text-white font-black text-2xl">BP</span>
                        <div className="absolute top-0 right-0 w-6 h-6 bg-[#EAF207] translate-x-3 -translate-y-3 rotate-45"></div>
                    </div>
                    <div className="admin-decorator-line mx-auto mb-4"></div>
                    <h1 className="text-2xl font-black text-[#0511F2] tracking-tighter mb-2 uppercase font-heading">Configuración Inicial</h1>
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Crea el primer usuario administrativo del sistema</p>
                </header>

                <form onSubmit={handleInit} className="space-y-8 relative z-10">
                    <div className="admin-input-group">
                        <label className="admin-label">Correo Electrónico</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="admin-input"
                            placeholder="admin@brecomperu.com"
                            required
                        />
                    </div>

                    <div className="admin-input-group">
                        <label className="admin-label">Contraseña de Acceso</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="admin-input"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {message && (
                        <div className={`p-6 rounded-[1.5rem] border font-black text-[11px] leading-relaxed uppercase tracking-wider ${
                            message.includes('✅') 
                                ? 'bg-[#6FD904]/10 border-[#6FD904]/20 text-[#6FD904]' 
                                : 'bg-rose-50 border-rose-100 text-rose-600'
                        }`}>
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full admin-btn admin-btn-primary shadow-xl shadow-pink-200 py-5"
                    >
                        {loading ? "PROCESANDO..." : "CREAR SUPER ADMIN"}
                    </button>
                </form>

                <footer className="mt-10 pt-8 border-t border-gray-100 text-center relative z-10">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Sistema de Control Administrativo v2.0</p>
                </footer>
            </div>
        </div>
    );
}
