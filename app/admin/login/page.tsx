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
            router.push("/admin/dashboard");
        } catch (err: any) {
            setError("Incorrect credentials or connection error.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-gray-100">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0081C8] to-[#00A651] bg-clip-text text-transparent inline-block">
                        BRECOMPERU Solutions
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium tracking-wide flex items-center justify-center gap-2">
                        <span className="w-2 h-2 bg-[#C5D900] rounded-full animate-pulse"></span>
                        Admin Panel Authorization
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#E6007E] focus:border-transparent outline-none transition-all"
                            placeholder="admin@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#E6007E] focus:border-transparent outline-none transition-all pr-12"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Turnstile Widget */}
                    <div className="flex justify-center py-2">
                        <Turnstile
                            sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                            onVerify={(token) => setTurnstileToken(token)}
                            onExpire={() => setTurnstileToken(null)}
                            onError={() => setError("Error in security verification.")}
                        />
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-[#E6007E] to-[#00A651] text-white rounded-2xl font-bold shadow-lg shadow-[#E6007E]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>

                <p className="mt-8 text-center text-xs text-gray-400">
                    &copy; 2026 BRECOMPERU IT Solutions. All rights reserved.
                </p>
            </div>
        </div>
    );
}
