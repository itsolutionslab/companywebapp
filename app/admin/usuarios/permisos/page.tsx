"use client";

import { useState, useEffect } from "react";
import { db, getRoleConfig, updateRoleConfig } from "@/app/lib/firebase";
import { ROLES_CONFIG, RoleInfo } from "@/config/roles_config";
import { useTranslation } from "@/components/admin/LanguageContext";
import { useNotification } from "@/components/admin/NotificationContext";
import { doc, getDoc } from "firebase/firestore";
import { auth } from "@/lib/firebase";

export default function PermissionsPage() {
    const { t } = useTranslation();
    const { showNotification } = useNotification();
    const [roles, setRoles] = useState<Record<string, RoleInfo>>(ROLES_CONFIG);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

    const availablePaths = [
        { path: '/admin/panel', label: 'Dashboard / Panel', icon: '📊' },
        { path: '/admin/prospectos', label: 'Prospectos / Leads', icon: '🎯' },
        { path: '/admin/funnels', label: 'Funnels / Captación', icon: '🚀' },
        { path: '/admin/mensajes', label: 'Mensajes / WhatsApp', icon: '💬' },
        { path: '/admin/reservas', label: 'Reservas / Bookings', icon: '🤝' },
        { path: '/admin/horarios', label: 'Horarios / Calendario', icon: '⏰' },
        { path: '/admin/usuarios', label: 'Usuarios y Permisos', icon: '👥' },
        { path: '/admin/configuracion', label: 'Configuración General', icon: '⚙️' },
    ];

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const config = await getRoleConfig();
                if (config) {
                    setRoles(config as Record<string, RoleInfo>);
                }
                
                if (auth.currentUser) {
                    const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
                    if (userDoc.exists()) {
                        setCurrentUserRole(userDoc.data().role);
                    }
                }
            } catch (error) {
                console.error("Error loading permissions:", error);
                showNotification("Error al cargar la configuración", "error");
            } finally {
                setLoading(false);
            }
        };
        loadConfig();
    }, []);

    const togglePath = (roleId: string, path: string) => {
        setRoles(prev => {
            const role = prev[roleId];
            const hasPath = role.allowedPaths.includes(path);
            const newPaths = hasPath 
                ? role.allowedPaths.filter(p => p !== path)
                : [...role.allowedPaths, path];
            
            return {
                ...prev,
                [roleId]: {
                    ...role,
                    allowedPaths: newPaths
                }
            };
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateRoleConfig(roles);
            showNotification("Permisos actualizados correctamente. Los cambios se aplicarán en el próximo inicio de sesión o recarga.", "success");
        } catch (error: any) {
            showNotification(`Error: ${error.message}`, "error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0511F2]"></div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Cargando Estructura de Permisos...</p>
            </div>
        );
    }

    if (currentUserRole !== 'owneradmin' && currentUserRole !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-6 text-center">
                <div className="text-6xl">🚫</div>
                <h1 className="text-2xl font-black text-[#0511F2] uppercase">Acceso Restringido</h1>
                <p className="text-gray-400 font-bold max-w-md">Solo los propietarios pueden modificar la matriz de permisos del sistema.</p>
            </div>
        );
    }

    const rolesByPillar = Object.values(roles).reduce((acc, role) => {
        if (!acc[role.pillar]) acc[role.pillar] = [];
        acc[role.pillar].push(role);
        return acc;
    }, {} as Record<string, RoleInfo[]>);

    return (
        <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 px-2 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                    <h1 className="text-2xl font-black text-[#0511F2] tracking-tight uppercase mb-1">Matriz de Accesos</h1>
                    <p className="text-sm text-gray-500 font-medium">Configura qué secciones puede ver cada rol del sistema</p>
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => window.history.back()}
                        className="flex-1 sm:flex-none px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition"
                    >
                        Volver
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 sm:flex-none px-4 py-2 text-sm rounded-lg bg-[#0511F2] text-white font-bold hover:bg-blue-700 transition shadow-md flex items-center justify-center min-w-[150px]"
                    >
                        {saving ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                Guardando...
                            </span>
                        ) : 'Guardar Cambios'}
                    </button>
                </div>
            </div>

            {/* Alert Box - Moved to top for better visibility */}
            <div className="bg-green-50/50 border border-green-100/50 p-4 rounded-xl flex items-start gap-3">
                <span className="text-green-500 mt-0.5 text-lg">🛡️</span>
                <div>
                    <h3 className="font-bold text-green-800 text-xs uppercase mb-1">Seguridad en Tiempo Real</h3>
                    <p className="text-xs text-green-700 font-medium leading-relaxed">
                        Cualquier modificación en esta matriz se aplica instantáneamente. Los usuarios afectados que tengan una sesión activa experimentarán una recarga automática para ajustar sus accesos de inmediato, previniendo cualquier vulnerabilidad.
                    </p>
                </div>
            </div>

            {/* Matrix View */}
            <div className="space-y-6">
                {Object.entries(rolesByPillar).map(([pillar, pillarRoles]) => (
                    <div key={pillar} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
                            <h2 className="font-black text-gray-800 uppercase text-sm flex items-center gap-2">
                                <span className={`w-2 h-4 rounded-full ${
                                    pillar === 'GROW' ? 'bg-[#EE05F2]' : 
                                    pillar === 'OPERATIONS' ? 'bg-[#0511F2]' : 
                                    pillar === 'SUPPORT' ? 'bg-[#26A3BF]' : 'bg-[#EAF207]'
                                }`}></span>
                                Área {pillar}
                            </h2>
                            <span className="text-xs font-bold text-gray-400 bg-white px-2 py-1 rounded-md border border-gray-100">
                                {pillarRoles.length} Roles
                            </span>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-white">
                                        <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-[280px] sticky left-0 bg-white z-10 border-r border-gray-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                            Cargo / Rol
                                        </th>
                                        {availablePaths.map(ap => (
                                            <th key={ap.path} className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <span className="text-base opacity-80">{ap.icon}</span>
                                                    <span className="whitespace-nowrap text-[10px]">{ap.label.split(' / ')[0]}</span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {pillarRoles.sort((a, b) => b.level - a.level).map(role => (
                                        <tr key={role.id} className="hover:bg-gray-50/50 transition-colors bg-white group">
                                            <td className="p-4 sticky left-0 bg-white z-10 border-r border-gray-50 group-hover:bg-gray-50/50 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-800 text-xs uppercase">{role.label}</span>
                                                    <span className="text-[10px] text-gray-400 font-semibold mt-0.5 uppercase">Nivel {role.level}</span>
                                                </div>
                                            </td>
                                            {availablePaths.map(ap => {
                                                const isActive = role.allowedPaths.includes(ap.path);
                                                
                                                // Dynamic active color based on pillar
                                                let activeBgColor = "bg-[#0511F2]";
                                                let activeRingColor = "ring-[#0511F2]";
                                                let activeShadowColor = "shadow-blue-200";

                                                if (pillar === 'GROW') {
                                                    activeBgColor = "bg-[#EE05F2]";
                                                    activeRingColor = "ring-[#EE05F2]";
                                                    activeShadowColor = "shadow-pink-200";
                                                } else if (pillar === 'SUPPORT') {
                                                    activeBgColor = "bg-[#26A3BF]";
                                                    activeRingColor = "ring-[#26A3BF]";
                                                    activeShadowColor = "shadow-cyan-200";
                                                }

                                                return (
                                                    <td key={ap.path} className="p-3 text-center">
                                                        <button
                                                            onClick={() => togglePath(role.id, ap.path)}
                                                            className={`w-6 h-6 mx-auto rounded-md flex items-center justify-center transition-all duration-200 ${
                                                                isActive 
                                                                ? `${activeBgColor} text-white shadow-sm ${activeShadowColor} ring-1 ${activeRingColor} ring-offset-1` 
                                                                : "bg-gray-50 border border-gray-200 text-transparent hover:bg-gray-100 hover:border-gray-300"
                                                            }`}
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
