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
        <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 px-2">
                <div>
                    <div className="admin-decorator-line mb-4"></div>
                    <h1 className="admin-h1 text-4xl mb-2">Matriz de Accesos</h1>
                    <p className="admin-subtitle text-gray-500 font-medium">Configura qué secciones puede ver cada rol del sistema</p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => window.history.back()}
                        className="admin-btn admin-btn-secondary"
                    >
                        VOLVER
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="admin-btn admin-btn-primary shadow-xl shadow-pink-200 uppercase"
                    >
                        {saving ? 'Guardando...' : 'GUARDAR CAMBIOS'}
                    </button>
                </div>
            </div>

            {/* Matrix View */}
            <div className="space-y-10">
                {Object.entries(rolesByPillar).map(([pillar, pillarRoles]) => (
                    <div key={pillar} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-700">
                        <div className="bg-[#0511F2] p-6 text-white flex items-center justify-between">
                            <h2 className="font-black uppercase tracking-widest text-sm flex items-center gap-3">
                                <span className="w-2 h-2 bg-[#EAF207] rounded-full"></span>
                                {pillar}
                            </h2>
                            <span className="text-[10px] font-bold opacity-60 uppercase">{pillarRoles.length} Roles Definidos</span>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-50">
                                        <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest w-1/4">Cargo / Rol</th>
                                        {availablePaths.map(ap => (
                                            <th key={ap.path} className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="text-xl">{ap.icon}</span>
                                                    <span className="whitespace-nowrap">{ap.label.split(' / ')[0]}</span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pillarRoles.sort((a, b) => b.level - a.level).map(role => (
                                        <tr key={role.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="p-6">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-[#0511F2] text-sm uppercase">{role.label}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Nivel {role.level}</span>
                                                </div>
                                            </td>
                                            {availablePaths.map(ap => {
                                                const isActive = role.allowedPaths.includes(ap.path);
                                                // Prevent disabling own access or admin critical access if possible, 
                                                // but for simplicity we allow full control to Owner.
                                                return (
                                                    <td key={ap.path} className="p-4 text-center">
                                                        <button
                                                            onClick={() => togglePath(role.id, ap.path)}
                                                            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                                                                isActive 
                                                                ? "bg-[#EE05F2] text-white shadow-lg shadow-pink-100 scale-105" 
                                                                : "bg-gray-100 text-gray-300 hover:bg-gray-200"
                                                            }`}
                                                        >
                                                            {isActive ? '✅' : '✕'}
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

            {/* Alert Box */}
            <div className="bg-blue-50 border border-blue-100 p-8 rounded-[2rem] flex items-start gap-6">
                <div className="text-3xl">ℹ️</div>
                <div>
                    <h3 className="font-black text-[#0511F2] uppercase text-sm mb-2">Nota sobre la sincronización</h3>
                    <p className="text-xs text-gray-600 font-medium leading-relaxed">
                        Los cambios realizados en esta matriz se guardan en tiempo real en la nube, pero debido al almacenamiento en caché de la sesión, los usuarios que estén logueados podrían necesitar cerrar sesión y volver a entrar o refrescar la página para ver reflejados sus nuevos accesos en el menú lateral.
                    </p>
                </div>
            </div>
        </div>
    );
}
