"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { LanguageProvider, useTranslation } from "@/components/admin/LanguageContext";
import { NotificationProvider } from "@/components/admin/NotificationContext";

const bName = "BRECOMPERU Solutions";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
    const currentAdminPath = pathname.startsWith('/admin') ? pathname : `/admin${pathname}`;
    const isLoginPage = currentAdminPath === "/admin/ingreso";

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (authUser) {
                // Fetch user role
                try {
                    const { doc, getDoc } = await import("firebase/firestore");
                    const { db } = await import("@/lib/firebase");
                    const userDoc = await getDoc(doc(db, "users", authUser.uid));

                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const validatedRole = (userData.role || 'staff').toLowerCase();
                        setRole(validatedRole);
                    } else {
                        setRole('staff');
                    }
                    setUser(authUser);
                } catch (error) {
                    console.error("Error fetching user role:", error);
                    setRole('staff');
                    setUser(authUser);
                }
            } else {
                setUser(null);
                setRole(null);
                if (!isLoginPage) {
                    router.push("/admin/ingreso");
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isLoginPage]); // Stable observer: only re-runs if login page status flips

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/admin/ingreso");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E6007E]"></div>
            </div>
        );
    }

    if (!user && !isLoginPage) {
        return null; // Don't render anything while redirecting
    }

    if (isLoginPage) {
        return <>{children}</>;
    }

    // Role-based protection for specific routes
    const restrictedRoutes = ['/admin/usuarios', '/admin/servicios'];
    if ((role === 'staff' || role === 'employ') && restrictedRoutes.some(route => currentAdminPath.startsWith(route))) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col space-y-4">
                <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
                <p>Staff members cannot access this area.</p>
                <button
                    onClick={() => router.push('/admin/panel')}
                    className="px-4 py-2 bg-[#E6007E] text-white rounded-xl"
                >
                    Ir al Panel
                </button>
            </div>
        );
    }

    return (
        <LanguageProvider>
            <NotificationProvider>
                <AdminLayoutContent handleLogout={handleLogout} role={role} currentAdminPath={currentAdminPath}>
                    {children}
                </AdminLayoutContent>
            </NotificationProvider>
        </LanguageProvider>
    );
}

function AdminLayoutContent({ children, handleLogout, role, currentAdminPath }: { children: React.ReactNode, handleLogout: () => void, role: string | null, currentAdminPath: string }) {
    const router = useRouter();
    const { lang, setLang, t } = useTranslation();
    const [showSettings, setShowSettings] = useState(false);

    // Temporarily permissive for debugging: show all items to anyone logged in
    const menuItems = [
        { name: t('dashboard') || 'Panel', path: '/admin/panel', icon: '📊', roles: ['admin', 'staff', 'employ'] },
        { name: t('prospectos') || 'Prospectos', path: '/admin/prospectos', icon: '🎯', roles: ['admin', 'staff', 'employ'] },
        { name: t('chats') || 'Mensajes', path: '/admin/mensajes', icon: '💬', roles: ['admin', 'staff', 'employ'] },
        { name: t('reservations') || 'Reservas', path: '/admin/reservas', icon: '🤝', roles: ['admin', 'staff', 'employ'] },
        //{ name: t('services') || 'Servicios', path: '/admin/servicios', icon: '🛠️', roles: ['admin'] },
        { name: t('schedules') || 'Horarios', path: '/admin/horarios', icon: '⏰', roles: ['admin', 'staff', 'employ'] },
        { name: t('users') || 'Usuarios', path: '/admin/usuarios', icon: '👥', roles: ['admin'] },
    ];

    const langOptions = ['en', 'ru', 'es'];

    // Helper to generate clean URLs for the subdomain
    const getCleanPath = (path: string) => {
        const isSubdomain = typeof window !== 'undefined' && window.location.hostname.startsWith('admin.');
        return isSubdomain ? path.replace('/admin', '') : path;
    };

    return (
        <div className="h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden pb-20 md:pb-0">
            {/* Top Header - Mobile Only - Added z-50 to stay on top of backdrop */}
            <header className="md:hidden bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center space-x-2">
                    <span className="text-xl font-bold bg-gradient-to-r from-[#0081C8] via-[#00A651] to-[#C5D900] bg-clip-text text-transparent">
                        BRECOMPERU Solutions
                    </span>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex bg-gray-100/50 rounded-lg p-0.5">
                        {langOptions.map((l) => (
                            <button
                                key={l}
                                onClick={() => setLang(l as any)}
                                className={`text-[9px] px-2 py-1 rounded-md transition-all uppercase ${lang === l ? "bg-white shadow-sm text-[#E6007E] font-bold" : "text-gray-400"}`}
                            >
                                {l}
                            </button>
                        ))}
                    </div>

                    {/* Settings Gear with Menu (Inside Header) */}
                    <div className="relative">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500 active:scale-90 ${showSettings ? "bg-[#E6007E] text-white shadow-md shadow-[#E6007E]/10" : "bg-gray-50 text-gray-400 border border-gray-100"}`}
                        >
                            <span className={`text-lg transition-transform duration-700 ${showSettings ? 'rotate-180 scale-110' : 'rotate-0'}`}>⚙️</span>
                        </button>

                        {showSettings && (
                            <div className="absolute top-full right-0 mt-3 w-44 bg-white/75 backdrop-blur-3xl rounded-[1.5rem] shadow-2xl border border-white/40 p-1.5 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300 overflow-hidden z-[60]">
                                {(role === 'admin' || role === 'owneradmin') && (
                                    <>
                                        <Link
                                            href={getCleanPath("/admin/usuarios")}
                                            onClick={() => setShowSettings(false)}
                                            className={`flex items-center justify-between p-3 rounded-[1rem] transition-all active:bg-gray-100/50 ${currentAdminPath === '/admin/usuarios' ? "bg-[#E6007E] text-white shadow-md shadow-[#E6007E]/10 font-bold" : "text-gray-700 hover:bg-gray-50/50"}`}
                                        >
                                            <div className="flex items-center space-x-2.5">
                                                <span className="text-sm">👥</span>
                                                <span className="text-[11px] font-bold tracking-tight">{t('users')}</span>
                                            </div>
                                            {currentAdminPath === '/admin/usuarios' && <span className="text-[8px]">●</span>}
                                        </Link>
                                        <div className="h-[0.5px] bg-gray-200/20 mx-3 my-0.5"></div>
                                    </>
                                )}
                                <Link
                                    href={getCleanPath("/admin/configuracion")}
                                    onClick={() => setShowSettings(false)}
                                    className={`flex items-center justify-between p-3 rounded-[1rem] transition-all active:bg-gray-100/50 ${currentAdminPath === '/admin/configuracion' ? "bg-[#E6007E] text-white shadow-md shadow-[#E6007E]/10 font-bold" : "text-gray-700 hover:bg-gray-50/50"}`}
                                >
                                    <div className="flex items-center space-x-2.5">
                                        <span className="text-sm">⚙️</span>
                                        <span className="text-[11px] font-bold tracking-tight">{t('settings')}</span>
                                    </div>
                                    {currentAdminPath === '/admin/configuracion' && <span className="text-[8px]">●</span>}
                                </Link>
                                <div className="h-[0.5px] bg-gray-200/20 mx-3 my-0.5"></div>
                                <button
                                    onClick={() => { handleLogout(); setShowSettings(false); }}
                                    className="w-full flex items-center space-x-2.5 p-3 rounded-[1rem] transition-all text-red-500 hover:bg-red-50/50 active:bg-red-100/50"
                                >
                                    <span className="text-sm">🚪</span>
                                    <span className="text-[11px] font-bold tracking-tight">{t('logout')}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Sidebar - Desktop Only */}
            <aside className="hidden md:flex w-64 bg-white shadow-sm flex-shrink-0 z-50 border-r border-gray-100 h-screen overflow-y-auto">
                <div className="p-8 flex flex-col min-h-full">
                    <div className="flex items-center space-x-2 mb-12 flex-shrink-0">
                        <span className="text-2xl font-bold bg-gradient-to-r from-[#0081C8] via-[#00A651] to-[#C5D900] bg-clip-text text-transparent">
                            BRECOMPERU
                        </span>
                        <span className="text-[10px] bg-[#0081C8]/10 text-[#0081C8] px-2 py-1 rounded-lg uppercase tracking-wider font-bold">Solutions</span>
                    </div>

                    <nav className="flex-grow space-y-2">
                        {menuItems.map((item) => (
                            <Link
                                key={item.path}
                                href={getCleanPath(item.path)}
                                className={`flex items-center space-x-3 p-4 rounded-2xl transition-all duration-300 ${currentAdminPath === item.path
                                    ? "bg-[#E6007E] text-white shadow-lg shadow-[#E6007E]/20 translate-x-1"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                            >
                                <span className="text-xl">{item.icon}</span>
                                <span className="font-semibold">{item.name}</span>
                            </Link>
                        ))}
                    </nav>

                    <div className="mt-auto pt-8 border-t border-gray-50 space-y-6 flex-shrink-0">
                        <div className="flex bg-gray-50 rounded-xl p-1">
                            {langOptions.map((l) => (
                                <button
                                    key={l}
                                    onClick={() => setLang(l as any)}
                                    className={`flex-1 text-[10px] py-2 rounded-lg transition-all uppercase ${lang === l ? "bg-white shadow-sm text-[#E6007E] font-bold" : "text-gray-400 hover:text-gray-600"
                                        }`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>

                        <Link
                            href={getCleanPath("/admin/configuracion")}
                            className={`w-full flex items-center space-x-3 p-4 rounded-2xl transition-all duration-300 group ${currentAdminPath === '/admin/configuracion' ? "bg-[#E6007E]/10 text-[#E6007E] font-bold" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
                        >
                            <span className="text-xl group-hover:rotate-90 transition-transform duration-500">⚙️</span>
                            <span className="font-semibold">{t('settings')}</span>
                        </Link>

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center space-x-3 p-4 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all duration-300 group"
                        >
                            <span className="text-xl group-hover:scale-110 transition-transform">🚪</span>
                            <span className="font-semibold">{t('logout')}</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-grow p-6 md:p-10 overflow-y-auto h-screen">
                <div className="mx-auto w-full max-w-[1440px]">
                    {children}
                </div>
            </main>

            {/* Bottom Navigation - Mobile Only */}
            <nav className="md:hidden fixed bottom-6 left-6 right-6 bg-white/70 backdrop-blur-[40px] border border-white/40 px-2 py-1.5 z-50 flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-[1.75rem]">
                {/* Regular Nav Items - More Compact */}
                <div className="flex items-center justify-around w-full max-w-sm px-1">
                    {menuItems.slice(0, 4).map((item) => {
                        const isActive = currentAdminPath === item.path;
                        return (
                            <Link
                                key={item.path}
                                href={getCleanPath(item.path)}
                                onClick={() => setShowSettings(false)}
                                className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-[1.25rem] transition-all relative active:scale-95 ${isActive ? "text-[#E6007E]" : "text-gray-400 hover:text-gray-600"}`}
                            >
                                <span className={`text-lg mb-0.5 transition-all duration-500 ${isActive ? "scale-105 drop-shadow-[0_0_8px_rgba(230,0,126,0.3)]" : "scale-100"}`}>{item.icon}</span>
                                <span className={`text-[8px] uppercase tracking-tighter font-bold transition-all ${isActive ? "opacity-100" : "opacity-50"}`}>{item.name}</span>
                                {isActive && (
                                    <div className="absolute -bottom-0.5 w-0.5 h-0.5 bg-[#E6007E] rounded-full shadow-[0_0_8px_rgba(230,0,126,0.6)]"></div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Backdrop for closing settings */}
            {showSettings && (
                <div
                    className="md:hidden fixed inset-0 z-40 bg-black/5"
                    onClick={() => setShowSettings(false)}
                />
            )}
        </div>
    );
}
