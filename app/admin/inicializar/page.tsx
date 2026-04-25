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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                <h1 className="text-xl font-bold mb-4">Configuración Inicial Admin</h1>
                <p className="text-sm text-gray-500 mb-6">Esta página es solo para crear el primer usuario.</p>

                <form onSubmit={handleInit} className="space-y-4">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-4 bg-gray-50 border rounded-2xl"
                        placeholder="Email"
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-4 bg-gray-50 border rounded-2xl"
                        placeholder="Contraseña"
                    />

                    {message && (
                        <div className="p-4 text-sm rounded-xl bg-gray-50 border">
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-pink-500 text-white rounded-2xl font-bold"
                    >
                        {loading ? "Creando..." : "Crear Super Admin"}
                    </button>
                </form>
            </div>
        </div>
    );
}
