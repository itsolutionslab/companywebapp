"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AdminPage() {
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                router.push("/admin/panel");
            } else {
                router.push("/admin/ingreso");
            }
        });

        return () => unsubscribe();
    }, [router]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-6">
            <div className="w-16 h-16 border-4 border-[#0081C8]/10 border-t-[#0081C8] rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Verificando Credenciales...</p>
        </div>
    );
}
