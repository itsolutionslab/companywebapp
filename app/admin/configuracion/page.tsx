"use client";

import { useState, useEffect } from "react";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useTranslation } from "@/components/admin/LanguageContext";
import { useNotification } from "@/components/admin/NotificationContext";
import { ROLES_CONFIG, RoleInfo, Pillar } from "@/config/roles_config";
import { collection, query, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";
import { UserProfile } from "@/types/booking";
import { getRoleConfig, updateRoleConfig } from "@/lib/firebase";

type Tab = 'seguridad' | 'roles' | 'acceso';

const PILLAR_META: Record<Pillar, { label: string; color: string; bg: string; icon: string }> = {
    ADMIN:      { label: 'Administración',    color: 'text-purple-700',  bg: 'bg-purple-50 border-purple-200',  icon: '👑' },
    GROW:       { label: 'Pilar Growth',      color: 'text-green-700',   bg: 'bg-green-50 border-green-200',    icon: '📈' },
    OPERATIONS: { label: 'Pilar Engineering', color: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-200',  icon: '⚙️' },
    SUPPORT:    { label: 'Customer Success',  color: 'text-teal-700',    bg: 'bg-teal-50 border-teal-200',      icon: '🤝' },
};

const ALL_PATHS = [
    { path: '/admin/panel',       label: 'Dashboard',   icon: '📊' },
    { path: '/admin/prospectos',  label: 'Prospectos',  icon: '🎯' },
    { path: '/admin/mensajes',    label: 'Chats',        icon: '💬' },
    { path: '/admin/reservas',    label: 'Reservas',     icon: '🤝' },
    { path: '/admin/horarios',    label: 'Horarios',     icon: '⏰' },
    { path: '/admin/usuarios',    label: 'Usuarios',     icon: '👥' },
    { path: '/admin/configuracion', label: 'Config',    icon: '⚙️' },
];

export default function SettingsPage() {
    const { t } = useTranslation();
    const { showNotification } = useNotification();
    const [activeTab, setActiveTab] = useState<Tab>('seguridad');
    const [currentUserRole, setCurrentUserRole] = useState<string>('staff');

    // Password state
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [pwLoading, setPwLoading] = useState(false);
    const [lastChangedDate, setLastChangedDate] = useState<string | null>(null);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Roles state
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [roleUpdateLoading, setRoleUpdateLoading] = useState(false);

    // Access config state  
    const [localRoles, setLocalRoles] = useState<Record<string, RoleInfo>>({ ...ROLES_CONFIG });
    const [editingRole, setEditingRole] = useState<string | null>(null);
    const [accessSaveLoading, setAccessSaveLoading] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            const user = auth.currentUser;
            if (user) {
                const { doc: d, getDoc } = await import("firebase/firestore");
                const userDoc = await getDoc(d(db, "users", user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setCurrentUserRole(data.role || 'staff');
                    if (data.last_password_change) {
                        const date = data.last_password_change.toDate ? data.last_password_change.toDate() : new Date(data.last_password_change);
                        setLastChangedDate(date.toLocaleString());
                    }
                }
            }
            
            // Fetch dynamic roles
            try {
                const config = await getRoleConfig();
                if (config) {
                    setLocalRoles(config);
                }
            } catch (error) {
                console.error("Error fetching dynamic roles:", error);
            }
        };
        fetchUserData();

        const q = query(collection(db, "users"));
        const unsub = onSnapshot(q, snap => {
            setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[]);
            setUsersLoading(false);
        });
        return () => unsub();
    }, []);

    const [checks, setChecks] = useState({ length: false, number: false, special: false, uppercase: false });
    useEffect(() => {
        setChecks({
            length: newPassword.length >= 8,
            number: /\d/.test(newPassword),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
            uppercase: /[A-Z]/.test(newPassword)
        });
    }, [newPassword]);

    const isMatch = newPassword.length > 0 && newPassword === confirmPassword;
    const isPasswordValid = Object.values(checks).every(Boolean);
    const isAdmin = currentUserRole === 'admin' || currentUserRole === 'owneradmin';

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isPasswordValid || !isMatch) return;
        setPwLoading(true);
        const user = auth.currentUser;
        if (!user || !user.email) return;
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            const { doc: d, updateDoc: upd, Timestamp } = await import("firebase/firestore");
            await upd(d(db, "users", user.uid), { last_password_change: Timestamp.now() });
            showNotification(t('password_updated'), 'success');
            setLastChangedDate(new Date().toLocaleString());
            setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
        } catch (error: any) {
            showNotification(`Error: ${error.message}`, 'error');
        } finally {
            setPwLoading(false);
        }
    };

    const handleRoleUpdate = async (uid: string) => {
        if (!selectedRole) return;
        setRoleUpdateLoading(true);
        try {
            await updateDoc(doc(db, "users", uid), { role: selectedRole });
            showNotification("Rol actualizado correctamente", "success");
            setEditingUser(null);
        } catch (e: any) {
            showNotification(`Error: ${e.message}`, "error");
        } finally {
            setRoleUpdateLoading(false);
        }
    };

    const togglePathAccess = (roleId: string, path: string) => {
        setLocalRoles(prev => {
            const role = prev[roleId];
            if (!role) return prev;
            const has = role.allowedPaths.includes(path);
            return {
                ...prev,
                [roleId]: {
                    ...role,
                    allowedPaths: has
                        ? role.allowedPaths.filter(p => p !== path)
                        : [...role.allowedPaths, path]
                }
            };
        });
    };

    const handleSaveAccessConfig = async () => {
        setAccessSaveLoading(true);
        try {
            await updateRoleConfig(localRoles);
            showNotification("Configuración de acceso guardada correctamente", "success");
            setEditingRole(null);
        } catch (e: any) {
            showNotification(`Error: ${e.message}`, "error");
        } finally {
            setAccessSaveLoading(false);
        }
    };

    const getRoleLabel = (role: string) => {
        const c = ROLES_CONFIG[role.toUpperCase()] || ROLES_CONFIG[role.toLowerCase()];
        return c ? c.label : role;
    };

    const getRoleBadgeColor = (role: string) => {
        const c = ROLES_CONFIG[role.toUpperCase()] || ROLES_CONFIG[role.toLowerCase()];
        switch (c?.pillar) {
            case 'ADMIN': return 'bg-purple-100 text-purple-700';
            case 'GROW': return 'bg-green-100 text-green-700';
            case 'OPERATIONS': return 'bg-indigo-100 text-indigo-700';
            case 'SUPPORT': return 'bg-teal-100 text-teal-700';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const groupedRoles = Object.values(localRoles).reduce((acc, role) => {
        const p = role.pillar;
        if (!acc[p]) acc[p] = [];
        acc[p].push(role);
        return acc;
    }, {} as Record<Pillar, RoleInfo[]>);

    const tabs: { id: Tab; label: string; icon: string }[] = [
        { id: 'seguridad', label: 'Seguridad', icon: '🔐' },
        { id: 'roles',     label: 'Roles',     icon: '👥' },
        { id: 'acceso',    label: 'Acceso',    icon: '🛡️' },
    ];

    const uniqueRoles = Array.from(new Map(Object.values(ROLES_CONFIG).map(r => [r.id, r])).values());

    return (
        <div className="admin-container max-w-4xl pb-20 px-4 md:px-0 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <header className="pt-8 pb-10 relative">
                <div className="admin-decorator-line mb-4"></div>
                <h1 className="admin-h1 text-4xl mb-2">Configuración</h1>
                <p className="admin-subtitle text-gray-500 font-medium">Panel de administración central del sistema</p>
            </header>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-50 p-1.5 rounded-[2rem] mb-10 w-fit border border-gray-100 shadow-inner">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black transition-all duration-500 ${activeTab === tab.id ? 'bg-[#0511F2] text-white shadow-xl shadow-blue-200 scale-[1.05]' : 'text-gray-400 hover:text-[#0511F2]'}`}
                    >
                        <span className="text-sm">{tab.icon}</span>
                        {tab.label.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* ── TAB: SEGURIDAD ── */}
            {activeTab === 'seguridad' && (
                <div className="max-w-xl animate-in fade-in duration-500">
                    <form onSubmit={handleChangePassword} className="space-y-8">
                        <div className="space-y-4 relative">
                            <h3 className="admin-label !text-gray-400">Actualizar Contraseña</h3>
                            <div className="admin-card !p-0 overflow-hidden divide-y divide-gray-50 relative z-10 border border-gray-100">
                                <div className="diagonal-accent !opacity-[0.03]"></div>
                                {[
                                    { label: t('current_password'), val: currentPassword, setVal: setCurrentPassword, show: showCurrent, setShow: setShowCurrent, auto: 'current-password' },
                                    { label: t('new_password'), val: newPassword, setVal: setNewPassword, show: showNew, setShow: setShowNew, auto: 'new-password' },
                                    { label: t('confirm_password'), val: confirmPassword, setVal: setConfirmPassword, show: showConfirm, setShow: setShowConfirm, auto: 'new-password' },
                                ].map(({ label, val, setVal, show, setShow, auto }) => (
                                    <div key={label} className="px-6 py-5 group transition-colors hover:bg-gray-50/50 relative z-10">
                                        <label className="admin-label mb-2 block">{label}</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type={show ? "text" : "password"}
                                                value={val}
                                                onChange={e => setVal(e.target.value)}
                                                required
                                                autoComplete={auto}
                                                className="flex-1 bg-transparent border-none outline-none text-base font-bold text-gray-900 placeholder:text-gray-200"
                                                placeholder="••••••••"
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => setShow(!show)} 
                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-300 hover:text-[#0511F2] hover:bg-white hover:shadow-sm transition-all"
                                            >
                                                {show ? '👁️' : '🔒'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3 bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-inner">
                            <p className="admin-label !text-gray-400 !ml-0 mb-2">Requisitos de Seguridad</p>
                            {[
                                { key: 'length', text: t('req_length') },
                                { key: 'number', text: t('req_number') },
                                { key: 'special', text: t('req_special') },
                                { key: 'uppercase', text: t('req_uppercase') }
                            ].map(item => (
                                <div key={item.key} className="flex items-center justify-between py-1 border-b border-gray-200/30 last:border-0">
                                    <span className={`text-[11px] font-bold tracking-tight transition-colors ${checks[item.key as keyof typeof checks] ? 'text-gray-900' : 'text-gray-300'}`}>{item.text}</span>
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${checks[item.key as keyof typeof checks] ? 'bg-[#6FD904] shadow-sm' : 'bg-gray-200'}`}>
                                        {checks[item.key as keyof typeof checks] && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={pwLoading || !isPasswordValid || !isMatch}
                                className="admin-btn admin-btn-primary shadow-xl shadow-pink-200 w-full py-4 text-sm"
                            >
                                {pwLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>GUARDAR NUEVA CONTRASEÑA 🔐</>}
                            </button>
                            {lastChangedDate && (
                                <p className="text-center text-[10px] text-gray-400 font-black uppercase tracking-widest mt-6">Última actualización: {lastChangedDate}</p>
                            )}
                        </div>
                    </form>
                </div>
            )}

            {/* ── TAB: ROLES ── */}
            {activeTab === 'roles' && (
                <div className="animate-in fade-in duration-500 space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <div>
                            <h2 className="text-2xl font-black text-[#0511F2] font-heading tracking-tight">Asignación de Roles</h2>
                            <p className="admin-subtitle">Gestiona los permisos y pilares de tu equipo</p>
                        </div>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-4 py-1.5 rounded-full font-black border border-gray-200/50 uppercase tracking-widest">{users.length} miembros</span>
                    </div>

                    {!isAdmin && (
                        <div className="bg-amber-50 border border-amber-200 rounded-[1.5rem] p-5 text-sm text-amber-700 font-bold flex items-center gap-3">
                            <span>⚠️</span> Solo los administradores pueden modificar jerarquías.
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                        {usersLoading ? (
                            <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-[#0511F2]/20 border-t-[#0511F2] rounded-full animate-spin" /></div>
                        ) : users.map(user => {
                            const isEditing = editingUser === user.uid;
                            const isSelf = user.uid === auth.currentUser?.uid;
                            return (
                                <div key={user.uid} className={`admin-card transition-all relative overflow-hidden ${isEditing ? 'border-[#0511F2] shadow-xl shadow-blue-200/50 bg-[#0511F2]/5' : ''}`}>
                                    <div className="diagonal-accent !opacity-[0.03]"></div>
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0511F2] to-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md">
                                            {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-gray-900 text-lg tracking-tight uppercase">{user.full_name}</span>
                                                {isSelf && <span className="text-[8px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-md font-black uppercase tracking-tighter">Tu Cuenta</span>}
                                            </div>
                                            <p className="text-xs text-gray-400 font-bold tracking-tight">{user.email}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`admin-badge ${getRoleBadgeColor(user.role)}`}>
                                                {getRoleLabel(user.role)}
                                            </span>
                                            {isAdmin && !isSelf && (
                                                <button
                                                    onClick={() => { setEditingUser(isEditing ? null : user.uid); setSelectedRole(user.role); }}
                                                    className={`admin-btn !p-2.5 !rounded-xl ${isEditing ? 'admin-btn-secondary' : 'bg-gray-100 text-gray-500 hover:bg-[#0511F2] hover:text-white'}`}
                                                >
                                                    <span className="text-xs font-black">{isEditing ? 'CERRAR' : 'EDITAR'}</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {isEditing && (
                                        <div className="mt-6 pt-6 border-t border-gray-100 space-y-4 animate-in slide-in-from-top-2 duration-300 relative z-10">
                                            <div className="admin-input-group">
                                                <label className="admin-label">Nuevo Rol de Pilar</label>
                                                <select
                                                    value={selectedRole}
                                                    onChange={e => setSelectedRole(e.target.value)}
                                                    className="admin-input cursor-pointer"
                                                >
                                                    <optgroup label="ADMINISTRACIÓN ESTRATÉGICA">
                                                        {uniqueRoles.filter(r => r.pillar === 'ADMIN').map(r => (
                                                            <option key={r.id} value={r.id}>{r.label}</option>
                                                        ))}
                                                        <option value="staff">Personal General (Staff)</option>
                                                    </optgroup>
                                                    {(['GROW','OPERATIONS','SUPPORT'] as Pillar[]).map(pillar => (
                                                        <optgroup key={pillar} label={PILLAR_META[pillar].label.toUpperCase()}>
                                                            {uniqueRoles.filter(r => r.pillar === pillar).map(r => (
                                                                <option key={r.id} value={r.id}>{r.label}</option>
                                                            ))}
                                                        </optgroup>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                onClick={() => handleRoleUpdate(user.uid)}
                                                disabled={roleUpdateLoading || selectedRole === user.role}
                                                className="admin-btn admin-btn-primary shadow-xl shadow-pink-200 w-full"
                                            >
                                                {roleUpdateLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'CONFIRMAR CAMBIO DE ROL'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── TAB: ACCESO ── */}
            {activeTab === 'acceso' && (
                <div className="animate-in fade-in duration-500 space-y-8">
                    <div className="px-1">
                        <h2 className="text-2xl font-black text-[#0511F2] tracking-tight font-heading">Permisos Globales</h2>
                        <p className="admin-subtitle">Asigna privilegios de navegación por jerarquía</p>
                    </div>

                    {!isAdmin && (
                        <div className="bg-amber-50 border border-amber-200 rounded-[1.5rem] p-5 text-sm text-amber-700 font-bold">
                            ⚠️ Solo administradores de nivel superior pueden modificar permisos.
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-6">
                        {(Object.entries(groupedRoles) as [Pillar, RoleInfo[]][]).map(([pillar, roles]) => {
                            const meta = PILLAR_META[pillar];
                            if (pillar === 'ADMIN') return null;
                            if (!meta) return null; // pillar desconocido — ignorar
                            return (
                                <div key={pillar} className="admin-card !p-6 border-l-8 relative overflow-hidden" style={{ borderLeftColor: meta.color.includes('purple') ? '#EE05F2' : meta.color.includes('green') ? '#6FD904' : meta.color.includes('indigo') ? '#0511F2' : meta.color.includes('sky') ? '#26A3BF' : '#EAF207' }}>
                                    <div className="diagonal-accent !opacity-[0.03]"></div>
                                    <h3 className={`text-sm font-black uppercase tracking-[0.15em] flex items-center gap-3 mb-6 relative z-10 ${meta.color}`}>
                                        <span className="text-2xl">{meta.icon}</span> {meta.label}
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4 relative z-10">
                                        {roles.map(role => (
                                            <div key={role.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-5 hover:bg-white hover:shadow-md transition-all group shadow-inner">
                                                <div className="flex items-center justify-between mb-5">
                                                    <div>
                                                        <span className="font-black text-gray-900 tracking-tight text-lg uppercase">{role.label}</span>
                                                        <span className="ml-3 text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-md font-black">LVL {role.level}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setEditingRole(editingRole === role.id ? null : role.id)}
                                                        disabled={!isAdmin}
                                                        className={`text-[10px] font-black px-4 py-2 rounded-xl transition-all ${editingRole === role.id ? 'bg-[#0511F2] text-white shadow-md' : 'bg-white text-gray-400 border border-gray-200 hover:text-[#0511F2] hover:border-[#0511F2] shadow-sm'}`}
                                                    >
                                                        {editingRole === role.id ? 'TERMINAR' : 'GESTIONAR RUTA'}
                                                    </button>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {ALL_PATHS.map(p => {
                                                        const has = localRoles[role.id]?.allowedPaths.includes(p.path);
                                                        const isEditing = editingRole === role.id && isAdmin;
                                                        return (
                                                            <button
                                                                key={p.path}
                                                                onClick={() => isEditing && togglePathAccess(role.id, p.path)}
                                                                disabled={!isEditing}
                                                                className={`flex items-center gap-2 text-[10px] font-bold px-4 py-2 rounded-xl transition-all border
                                                                    ${has ? 'bg-white border-[#0511F2] text-[#0511F2] shadow-sm' : 'bg-transparent border-gray-100 text-gray-300 opacity-60'}
                                                                    ${isEditing ? 'cursor-pointer hover:border-gray-400' : 'cursor-default'}`}
                                                            >
                                                                <span className="text-sm">{p.icon}</span>
                                                                {p.label.toUpperCase()}
                                                                {has && <span className="ml-1 text-[#6FD904]">●</span>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {isAdmin && (
                        <div className="sticky bottom-10 animate-in slide-in-from-bottom-4 duration-700 z-50">
                            <div className="bg-[#0511F2] rounded-[2.5rem] p-6 shadow-2xl shadow-blue-900/40 border border-blue-400/20">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-4 text-white">
                                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl">🛡️</div>
                                        <div>
                                            <h4 className="font-black tracking-tight text-xl uppercase">Sincronización de Privilegios</h4>
                                            <p className="text-[11px] text-blue-200 font-bold uppercase tracking-wider">Se aplicará a todos los miembros de los pilares seleccionados</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSaveAccessConfig}
                                        disabled={accessSaveLoading}
                                        className="w-full md:w-auto px-10 py-4 bg-[#EE05F2] text-white rounded-2xl font-black text-xs shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-3 hover:shadow-pink-500/50"
                                    >
                                        {accessSaveLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>ACTUALIZAR ACCESO GLOBAL ⚡</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
