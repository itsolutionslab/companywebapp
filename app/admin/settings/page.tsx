"use client";

import { useState, useEffect } from "react";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useTranslation } from "@/components/admin/LanguageContext";
import { useNotification } from "@/components/admin/NotificationContext";

export default function SettingsPage() {
    const { t } = useTranslation();
    const { showNotification } = useNotification();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Password Strength State
    const [checks, setChecks] = useState({
        length: false,
        number: false,
        special: false,
        uppercase: false
    });

    useEffect(() => {
        setChecks({
            length: newPassword.length >= 8, // iOS standard usually prefers 8
            number: /\d/.test(newPassword),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
            uppercase: /[A-Z]/.test(newPassword)
        });
    }, [newPassword]);

    const isMatch = newPassword.length > 0 && newPassword === confirmPassword;
    const isPasswordValid = Object.values(checks).every(Boolean);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isPasswordValid) {
            showNotification(t('password_requirements'), 'warning');
            return;
        }
        if (!isMatch) {
            showNotification(t('confirm_password') + ' mismatch', 'error');
            return;
        }

        setLoading(true);
        const user = auth.currentUser;
        if (!user || !user.email) return;

        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);

            showNotification(t('password_updated'), 'success');
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            console.error(error);
            showNotification(`Error: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Refined iOS Style Icons
    const EyeIcon = ({ show }: { show: boolean }) => (
        <div className={`transition-all duration-300 ${show ? 'scale-110' : 'scale-100'}`}>
            {show ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="12" r="3.5" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" stroke="#CED4DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" stroke="#CED4DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" stroke="#CED4DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="m2 2 20 20" stroke="#CED4DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
        </div>
    );

    return (
        <div className="max-w-xl mx-auto pb-20 px-4 md:px-0 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            {/* Header: Dynamic Typography */}
            <header className="pt-10 pb-6">
                <h1 className="text-3xl font-extrabold text-black tracking-tight mb-1.5 flex items-center gap-2">
                    {t('settings')}
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]"></span>
                </h1>
                <div className="flex items-center space-x-2">
                    <span className="text-[13px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                        {auth.currentUser?.email || "Account Security"}
                    </span>
                </div>
            </header>

            <form onSubmit={handleChangePassword} className="space-y-10">
                {/* Section: Credentials */}
                <div className="space-y-3">
                    <h3 className="px-1 text-[13px] font-bold uppercase tracking-widest text-gray-500/70">
                        {t('change_password')}
                    </h3>

                    <div className="bg-white/90 backdrop-blur-xl rounded-3xl overflow-hidden border border-gray-200/60 shadow-[0_12px_40px_rgba(0,0,0,0.04)] divide-y divide-gray-100">
                        {/* Current Password */}
                        <div className="relative group px-5 py-4 transition-all duration-300 hover:bg-gray-50/50">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 group-focus-within:text-blue-500 transition-colors">
                                {t('current_password')}
                            </label>
                            <div className="flex items-center gap-4">
                                <input
                                    type={showCurrent ? "text" : "password"}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    className="flex-1 bg-transparent outline-none text-[17px] font-medium text-black placeholder:text-gray-200"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    className="p-1.5 rounded-full transition-all active:scale-75"
                                >
                                    <EyeIcon show={showCurrent} />
                                </button>
                            </div>
                        </div>

                        {/* New Password */}
                        <div className="relative group px-5 py-4 transition-all duration-300 hover:bg-gray-50/50">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 group-focus-within:text-blue-500 transition-colors">
                                {t('new_password')}
                            </label>
                            <div className="flex items-center gap-4">
                                <input
                                    type={showNew ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                    className="flex-1 bg-transparent outline-none text-[17px] font-medium text-black placeholder:text-gray-200"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew(!showNew)}
                                    className="p-1.5 rounded-full transition-all active:scale-75"
                                >
                                    <EyeIcon show={showNew} />
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="relative group px-5 py-4 transition-all duration-300 hover:bg-gray-50/50">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 group-focus-within:text-blue-500 transition-colors">
                                {t('confirm_password')}
                            </label>
                            <div className="flex items-center gap-4">
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                    className="flex-1 bg-transparent outline-none text-[17px] font-medium text-black placeholder:text-gray-200"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="p-1.5 rounded-full transition-all active:scale-75"
                                >
                                    <EyeIcon show={showConfirm} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Health & Matching */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[13px] font-bold uppercase tracking-widest text-gray-500/70">
                            {t('password_requirements')}
                        </h3>
                        {newPassword && (
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-all duration-500 ${isPasswordValid ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-500'}`}>
                                {isPasswordValid ? 'EXCELLENT' : 'WEAK'}
                            </span>
                        )}
                    </div>

                    <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-gray-100 p-2 shadow-sm">
                        <div className="grid grid-cols-1 gap-1">
                            {[
                                { key: 'length', text: t('req_length') },
                                { key: 'number', text: t('req_number') },
                                { key: 'special', text: t('req_special') },
                                { key: 'uppercase', text: t('req_uppercase') }
                            ].map((item) => (
                                <div key={item.key} className="flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 hover:bg-white/80">
                                    <span className={`text-[14px] font-semibold tracking-tight transition-colors duration-500 ${checks[item.key as keyof typeof checks] ? 'text-black' : 'text-gray-400'}`}>
                                        {item.text}
                                    </span>
                                    <div className="relative">
                                        <div className={`w-5 h-5 rounded-full border-2 transition-all duration-500 flex items-center justify-center ${checks[item.key as keyof typeof checks] ? 'border-green-500 bg-green-500' : 'border-gray-100 bg-gray-50'}`}>
                                            <svg className={`w-3 h-3 text-white transition-opacity duration-500 ${checks[item.key as keyof typeof checks] ? 'opacity-100' : 'opacity-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Matching Feedback */}
                            <div className={`mt-2 mx-1 p-3 rounded-[1.25rem] border transition-all duration-500 flex items-center gap-3 ${isMatch ? 'bg-blue-50/50 border-blue-100/50 text-blue-600' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${isMatch ? 'bg-blue-500' : 'bg-gray-200'}`}>
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span className="text-[13px] font-bold tracking-tight">
                                    {isMatch ? "Contraseñas coinciden maravillosamente" : "Las contraseñas deben ser idénticas"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Final Action */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading || !isPasswordValid || !isMatch}
                        className="group w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-[1.5rem] font-bold text-[17px] shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all disabled:opacity-20 disabled:translate-y-0 disabled:shadow-none flex items-center justify-center gap-3"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                        ) : (
                            <>
                                <span>{t('save')}</span>
                                <span className="text-xl transition-transform group-hover:scale-110 group-hover:rotate-12">🔐</span>
                            </>
                        )}
                    </button>

                    <div className="mt-8 text-center space-y-1">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                            Secure Infrastructure
                        </p>
                        <p className="text-[12px] text-gray-300 font-medium">
                            {t('security_priority')}
                        </p>
                    </div>
                </div>
            </form>
        </div>
    );
}
