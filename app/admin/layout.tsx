"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { LanguageProvider, useTranslation } from "@/components/admin/LanguageContext";
import { NotificationProvider } from "@/components/admin/NotificationContext";
import { ROLES_CONFIG } from "@/config/roles_config";
import { getRoleConfig } from "@/lib/firebase";
import "./admin.css";

const bName = "BRECOMPERU Solutions";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<string | null>(null);
    const [dynamicRoles, setDynamicRoles] = useState<any>(ROLES_CONFIG);
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
                
                // Fetch dynamic role configuration
                try {
                    const config = await getRoleConfig();
                    if (config) {
                        setDynamicRoles({ ...ROLES_CONFIG, ...config });
                    }
                } catch (error) {
                    console.error("Error fetching dynamic roles:", error);
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
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#EE05F2]"></div>
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
    const userRoleConfig = role ? ROLES_CONFIG[role.toUpperCase()] || ROLES_CONFIG[role.toLowerCase()] : null;
    
    if (userRoleConfig && !isLoginPage) {
        const isAllowed = userRoleConfig.allowedPaths.some(path => currentAdminPath.startsWith(path));
        if (!isAllowed && currentAdminPath !== '/admin/panel') { // Allow panel as fallback if not explicitly restricted
             // If the role doesn't have access to current path, redirect to their first allowed path or panel
             const firstAllowed = userRoleConfig.allowedPaths[0] || '/admin/panel';
             if (currentAdminPath !== firstAllowed) {
                 return (
                    <div className="min-h-screen flex items-center justify-center bg-white flex-col space-y-4">
                        <h1 className="text-2xl font-black text-[#0511F2] font-heading uppercase tracking-tight">Acceso Denegado</h1>
                        <p className="text-gray-600 font-medium">Tu rol ({userRoleConfig.label}) no tiene permiso para acceder a esta sección.</p>
                        <button
                            onClick={() => router.push(firstAllowed)}
                            className="px-8 py-3 bg-[#EE05F2] text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-pink-200"
                        >
                            Ir a Mi Sección
                        </button>
                    </div>
                );
             }
        }
    }

    return (
        <LanguageProvider>
            <NotificationProvider>
                <AdminLayoutContent 
                    handleLogout={handleLogout} 
                    role={role} 
                    currentAdminPath={currentAdminPath}
                    dynamicRoles={dynamicRoles}
                >
                    <div className="admin-body">
                        {children}
                    </div>
                </AdminLayoutContent>
            </NotificationProvider>
        </LanguageProvider>
    );
}

function AdminLayoutContent({ children, handleLogout, role, currentAdminPath, dynamicRoles }: { children: React.ReactNode, handleLogout: () => void, role: string | null, currentAdminPath: string, dynamicRoles: any }) {
    const router = useRouter();
    const { lang, setLang, t } = useTranslation();
    const [showSettings, setShowSettings] = useState(false);

    const userRoleConfig = role ? dynamicRoles[role.toUpperCase()] || dynamicRoles[role.toLowerCase()] : null;

    const allMenuItems = [
        { name: t('dashboard') || 'Panel', path: '/admin/panel', icon: '📊' },
        { name: t('prospectos') || 'Prospectos', path: '/admin/prospectos', icon: '🎯' },
        { name: t('chats') || 'Mensajes', path: '/admin/mensajes', icon: '💬' },
        { name: t('reservations') || 'Reservas', path: '/admin/reservas', icon: '🤝' },
        { name: t('schedules') || 'Horarios', path: '/admin/horarios', icon: '⏰' },
        { name: t('users') || 'Usuarios', path: '/admin/usuarios', icon: '👥' },
    ];

    const menuItems = allMenuItems.filter(item => {
        if (!userRoleConfig || !Array.isArray(userRoleConfig.allowedPaths)) return false;
        return userRoleConfig.allowedPaths.some((p: string) => item.path.startsWith(p));
    });

    const langOptions = ['en', 'es'];

    const getCleanPath = (path: string) => {
        const isSubdomain = typeof window !== 'undefined' && window.location.hostname.startsWith('admin.');
        return isSubdomain ? path.replace('/admin', '') : path;
    };

    return (
        <div className="h-screen bg-[#F8F9FA] flex flex-col md:flex-row overflow-hidden pb-20 md:pb-0 font-body">
            {/* Top Header - Mobile Only */}
            <header className="md:hidden bg-white/95 backdrop-blur-2xl border-b border-gray-100 sticky top-0 z-50 px-5 py-4 flex items-center justify-between flex-shrink-0 shadow-sm">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-[#0511F2] rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-200 relative overflow-hidden">
                        BP
                        <div className="absolute top-0 right-0 w-4 h-4 bg-[#EAF207] translate-x-2 -translate-y-2 rotate-45"></div>
                    </div>
                    <span className="text-lg font-black text-[#0511F2] tracking-tighter uppercase font-heading">BRECOMPERU</span>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="flex bg-gray-100 rounded-full p-1 border border-gray-200">
                        {langOptions.map((l) => (
                            <button
                                key={l}
                                onClick={() => setLang(l as any)}
                                className={`text-[10px] px-3 py-1 rounded-full transition-all uppercase font-black ${lang === l ? "bg-white shadow-sm text-[#EE05F2]" : "text-gray-400"}`}
                            >
                                {l}
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${showSettings ? "bg-[#0511F2] text-white shadow-xl shadow-blue-200" : "bg-white text-gray-400 border border-gray-200"}`}
                        >
                            <span className={`text-base transition-transform duration-500 ${showSettings ? 'rotate-90' : 'rotate-0'}`}>⚙️</span>
                        </button>

                        {showSettings && (
                            <div className="absolute top-full right-0 mt-4 w-56 bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-2 animate-in fade-in zoom-in-95 slide-in-from-top-3 duration-500 z-[60]">
                                {(role === 'admin' || role === 'owneradmin') && (
                                    <Link
                                        href={getCleanPath("/admin/usuarios")}
                                        onClick={() => setShowSettings(false)}
                                        className={`flex items-center justify-between p-4 rounded-[1.5rem] transition-all ${currentAdminPath === '/admin/usuarios' ? "bg-[#0511F2] text-white font-bold" : "text-gray-600 hover:bg-gray-50"}`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <span className="text-lg">👥</span>
                                            <span className="text-[11px] font-black uppercase tracking-widest">{t('users')}</span>
                                        </div>
                                    </Link>
                                )}
                                <Link
                                    href={getCleanPath("/admin/configuracion")}
                                    onClick={() => setShowSettings(false)}
                                    className={`flex items-center justify-between p-4 rounded-[1.5rem] transition-all ${currentAdminPath === '/admin/configuracion' ? "bg-[#0511F2] text-white font-bold" : "text-gray-600 hover:bg-gray-50"}`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <span className="text-lg">⚙️</span>
                                        <span className="text-[11px] font-black uppercase tracking-widest">{t('settings')}</span>
                                    </div>
                                </Link>
                                <div className="h-px bg-gray-100 my-2"></div>
                                <button
                                    onClick={() => { handleLogout(); setShowSettings(false); }}
                                    className="w-full flex items-center space-x-3 p-4 rounded-[1.5rem] transition-all text-red-500 hover:bg-red-50 font-black uppercase tracking-widest text-[11px]"
                                >
                                    <span className="text-lg">🚪</span>
                                    <span>{t('logout')}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Sidebar - Desktop Only */}
            <aside className="hidden md:flex w-80 bg-white shadow-2xl flex-shrink-0 z-50 border-r border-gray-100 h-screen overflow-y-auto relative">
                <div className="p-10 flex flex-col min-h-full w-full">
                    <div className="flex items-center space-x-4 mb-16">
                        <div className="w-12 h-12 bg-[#0511F2] rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xl shadow-blue-200 relative overflow-hidden group">
                            BP
                            <div className="absolute top-0 right-0 w-5 h-5 bg-[#EAF207] translate-x-2.5 -translate-y-2.5 rotate-45 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"></div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-2xl font-black text-[#0511F2] tracking-tighter leading-none font-heading uppercase">BRECOMPERU</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#26A3BF] mt-1">Consultora Global</span>
                        </div>
                    </div>

                    <nav className="flex-grow space-y-2">
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 ml-4">MENÚ ADMINISTRATIVO</p>
                        {menuItems.map((item) => (
                            <Link
                                key={item.path}
                                href={getCleanPath(item.path)}
                                className={`flex items-center space-x-4 p-4 rounded-[1.5rem] transition-all duration-500 group relative ${currentAdminPath === item.path
                                    ? "bg-[#0511F2] text-white shadow-2xl shadow-blue-200 scale-[1.05] -translate-x-2"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-[#0511F2]"
                                    }`}
                            >
                                <span className={`text-2xl transition-transform duration-700 ${currentAdminPath === item.path ? 'scale-110 rotate-3' : 'group-hover:scale-110 group-hover:-rotate-3'}`}>{item.icon}</span>
                                <span className="font-black text-[12px] uppercase tracking-widest">{item.name}</span>
                                {currentAdminPath === item.path && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#EAF207] rounded-r-full"></div>
                                )}
                            </Link>
                        ))}
                    </nav>

                    <div className="mt-auto pt-10 border-t border-gray-100 space-y-8">
                        <div className="flex bg-gray-50 rounded-[1.5rem] p-1.5 border border-gray-100 shadow-inner">
                            {langOptions.map((l) => (
                                <button
                                    key={l}
                                    onClick={() => setLang(l as any)}
                                    className={`flex-1 text-[11px] py-3 rounded-[1.25rem] transition-all uppercase font-black ${lang === l ? "bg-white shadow-lg text-[#EE05F2]" : "text-gray-400 hover:text-gray-600"
                                        }`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-3">
                            <Link
                                href={getCleanPath("/admin/configuracion")}
                                className={`w-full flex items-center space-x-4 p-4 rounded-[1.5rem] transition-all duration-500 group ${currentAdminPath === '/admin/configuracion' ? "bg-[#EE05F2]/5 text-[#EE05F2] font-black" : "text-gray-400 hover:text-[#0511F2] hover:bg-gray-50"}`}
                            >
                                <span className="text-2xl group-hover:rotate-90 transition-transform duration-700">⚙️</span>
                                <span className="font-black text-[11px] uppercase tracking-widest">{t('settings')}</span>
                            </Link>

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center space-x-4 p-4 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-[1.5rem] transition-all duration-500 group font-black uppercase tracking-widest text-[11px]"
                            >
                                <span className="text-2xl group-hover:-translate-x-1 transition-transform">🚪</span>
                                <span>{t('logout')}</span>
                            </button>
                        </div>
                    </div>
                </div>
                <div className="diagonal-accent"></div>
            </aside>

            {/* Main Content */}
            <main className="flex-grow p-6 md:p-16 overflow-y-auto h-screen bg-[#FFFFFF] relative">
                <div className="mx-auto w-full max-w-[1300px] animate-slide-up">
                    {children}
                </div>
            </main>

            {/* Bottom Navigation - Mobile Only */}
            <nav className="md:hidden fixed bottom-8 left-6 right-6 bg-white/95 backdrop-blur-3xl border border-white px-2 py-3 z-50 flex items-center justify-around shadow-2xl shadow-blue-900/10 rounded-[2.5rem]">
                {menuItems.slice(0, 5).map((item) => {
                    const isActive = currentAdminPath === item.path;
                    return (
                        <Link
                            key={item.path}
                            href={getCleanPath(item.path)}
                            onClick={() => setShowSettings(false)}
                            className={`flex flex-col items-center justify-center p-3 rounded-[1.5rem] transition-all relative active:scale-90 ${isActive ? "bg-[#0511F2] text-white shadow-xl shadow-blue-300 scale-110 -translate-y-2" : "text-gray-400"}`}
                        >
                            <span className={`text-xl transition-transform duration-500 ${isActive ? "scale-110" : "scale-100"}`}>{item.icon}</span>
                            {isActive && <span className="text-[8px] uppercase font-black tracking-widest mt-1.5 animate-in slide-in-from-bottom-2 duration-500">{item.name}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Backdrop */}
            {showSettings && (
                <div
                    className="md:hidden fixed inset-0 z-40 bg-[#0511F2]/5 backdrop-blur-md"
                    onClick={() => setShowSettings(false)}
                />
            )}
        </div>
    );
}
