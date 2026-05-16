"use client";

import { useState, useEffect } from "react";
import { auth, db, deleteUser, firebaseConfig } from "@/lib/firebase";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, doc, setDoc, getDoc } from "firebase/firestore";
import { UserProfile } from "@/types/booking";
import { useTranslation } from "@/components/admin/LanguageContext";
import { useNotification } from "@/components/admin/NotificationContext";
import { ROLES_CONFIG, Pillar } from "@/config/roles_config";

export default function UsersPage() {
    const { t } = useTranslation();
    const { showNotification } = useNotification();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState<UserProfile['role']>('staff');

    // Form State
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState<UserProfile['role']>('staff');
    const [createLoading, setCreateLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [showLogoutWarning, setShowLogoutWarning] = useState(false);

    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Search & Multi-select State
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [isEditingRole, setIsEditingRole] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [newRole, setNewRole] = useState<UserProfile['role']>('staff');
    const [editLoading, setEditLoading] = useState(false);

    const currentUserUid = auth.currentUser?.uid;

    const roleHierarchy: Record<string, number> = {
        client: 0,
        staff: 1,
        employ: 1,
        admin: 2,
        owneradmin: 3
    };

    const getRoleLevel = (role: string) => {
        const config = ROLES_CONFIG[role.toUpperCase()] || ROLES_CONFIG[role.toLowerCase()];
        return config ? config.level : (roleHierarchy[role] || 0);
    };

    const canModifyUser = (targetRole: UserProfile['role']) => {
        const currentLevel = getRoleLevel(currentUserRole);
        const targetLevel = getRoleLevel(targetRole);
        return currentLevel > targetLevel || currentUserRole === 'owneradmin';
    };

    const getRoleBadgeStyle = (role: string) => {
        const config = ROLES_CONFIG[role.toUpperCase()] || ROLES_CONFIG[role.toLowerCase()];
        const pillar = config?.pillar;

        switch (pillar) {
            case 'ADMIN':
                return role === 'owneradmin' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'bg-blue-600 text-white';
            case 'GROW':
                return 'bg-[#0511F2] text-white';
            case 'OPERATIONS':
                return 'bg-[#26A3BF] text-white';
            case 'SUPPORT':
                return 'bg-[#EE05F2] text-white';
            default:
                return 'bg-gray-400 text-white';
        }
    };
    
    const getRoleLabel = (role: string) => {
        const config = ROLES_CONFIG[role.toUpperCase()] || ROLES_CONFIG[role.toLowerCase()];
        return config ? config.label : role;
    };

    useEffect(() => {
        if (currentUserUid) {
            getDoc(doc(db, "users", currentUserUid)).then(docSnap => {
                if (docSnap.exists()) {
                    setCurrentUserRole((docSnap.data() as UserProfile).role);
                }
            });
        }

        const q = query(collection(db, "users"), orderBy("created_at", "desc"));
        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                const usersData = snapshot.docs.map(doc => ({
                    uid: doc.id,
                    ...doc.data()
                })) as UserProfile[];
                setUsers(usersData);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching users:", error);
                showNotification(t('insufficient_permissions'), 'error');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [currentUserUid, t, showNotification]);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);
        setMessage("");

        try {
            // Create a secondary Firebase app instance to avoid logging out the current admin
            const tempApp = initializeApp(firebaseConfig, "TempApp" + Date.now());
            const tempAuth = getAuth(tempApp);

            const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
            const user = userCredential.user;

            await updateProfile(user, { displayName: name });

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: email,
                full_name: name,
                role: role,
                created_at: new Date()
            });

            showNotification(t('user_created'), 'success');
            setName("");
            setEmail("");
            setPassword("");
            setIsCreating(false);

            // Close the temp app
            // Note: tempApp.delete() is not strictly necessary but good practice
        } catch (error: any) {
            showNotification(`Error: ${error.message}`, 'error');
        } finally {
            setCreateLoading(false);
        }
    };

    const handleDeleteClick = (user: UserProfile) => {
        if (user.uid === currentUserUid) {
            showNotification(t('cannot_delete_self'), 'warning');
            return;
        }
        if (!canModifyUser(user.role)) {
            showNotification(t('insufficient_permissions'), 'error');
            return;
        }
        setUserToDelete(user);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;

        setDeleteLoading(true);
        try {
            await deleteUser(userToDelete.uid);
            showNotification(t('user_deleted_success'), 'success');
            setShowDeleteModal(false);
            setUserToDelete(null);
        } catch (error: any) {
            showNotification(`Error: ${error.message}`, 'error');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleUpdateRoles = async () => {
        setEditLoading(true);
        try {
            const uidsToUpdate = editingUser ? [editingUser.uid] : Array.from(selectedUsers);
            
            await Promise.all(uidsToUpdate.map(async (uid) => {
                await setDoc(doc(db, "users", uid), {
                    role: newRole
                }, { merge: true });
            }));

            showNotification('Roles actualizados correctamente', 'success');
            setIsEditingRole(false);
            setEditingUser(null);
            setSelectedUsers(new Set());
        } catch (error: any) {
            showNotification(`Error: ${error.message}`, 'error');
        } finally {
            setEditLoading(false);
        }
    };

    const toggleUserSelection = (uid: string) => {
        const newSelection = new Set(selectedUsers);
        if (newSelection.has(uid)) {
            newSelection.delete(uid);
        } else {
            newSelection.add(uid);
        }
        setSelectedUsers(newSelection);
    };

    const selectAllUsers = (usersToSelect: UserProfile[]) => {
        if (selectedUsers.size === usersToSelect.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(usersToSelect.map(u => u.uid)));
        }
    };

    const filteredUsers = users.filter(user => 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0511F2]"></div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Sincronizando Usuarios...</p>
            </div>
        );
    }

    // Check if user is allowed to be on this page at all (client-side)
    const isAuthorized = currentUserRole === 'owneradmin' || currentUserRole === 'admin' || getRoleLevel(currentUserRole) >= 5;
    
    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in zoom-in duration-700">
                <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-xl shadow-rose-900/5 border border-rose-100 mb-8 relative">
                    🚫
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white text-[10px] font-black">!</div>
                </div>
                <div>
                    <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-4 font-heading">Protocolo de Seguridad</h2>
                    <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100 max-w-sm mx-auto mb-8">
                        <p className="text-gray-500 text-[11px] font-bold uppercase tracking-[0.1em] leading-relaxed">
                            Tu nivel de acceso actual (<span className="text-[#0511F2]">{getRoleLabel(currentUserRole)}</span>) no cumple con los requisitos del protocolo para gestionar la estructura de usuarios de la organización.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Header - Mobile Optimized */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 px-2 relative">
                <div>
                    <div className="admin-decorator-line mb-4"></div>
                    <h1 className="admin-h1 text-4xl mb-2">Gestión de Usuarios</h1>
                    <p className="admin-subtitle text-gray-500 font-medium">Control de acceso y jerarquías del panel administrativo</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={() => window.location.href = '/admin/usuarios/permisos'}
                        className="admin-btn admin-btn-secondary uppercase"
                    >
                        <span>🛡️</span>
                        GESTIONAR PERMISOS
                    </button>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="admin-btn admin-btn-primary shadow-xl shadow-pink-200 uppercase"
                    >
                        <span>➕</span>
                        NUEVO USUARIO
                    </button>
                </div>
            </div>

            {/* Search and Bulk Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <div className="relative w-full md:max-w-md">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar usuarios por nombre o correo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="admin-input pl-12"
                    />
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    {selectedUsers.size > 0 && (
                        <button
                            onClick={() => {
                                setEditingUser(null);
                                setIsEditingRole(true);
                            }}
                            className="flex-1 md:flex-none admin-btn bg-[#0511F2] text-white shadow-lg shadow-blue-100"
                        >
                            EDITAR ROL ({selectedUsers.size})
                        </button>
                    )}
                    <button
                        onClick={() => selectAllUsers(filteredUsers)}
                        className="flex-1 md:flex-none admin-btn admin-btn-secondary"
                    >
                        {selectedUsers.size === filteredUsers.length ? 'DESELECCIONAR TODO' : 'SELECCIONAR TODO'}
                    </button>
                </div>
            </div>

            {/* Notification Bar */}
            {message && (
                <div className={`p-5 rounded-[1.5rem] text-xs font-black uppercase tracking-widest border animate-in slide-in-from-top-2 ${message.includes('✅') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                    <div className="flex items-center gap-3">
                        <span className="text-lg">{message.includes('✅') ? '✨' : '⚠️'}</span>
                        {message}
                    </div>
                </div>
            )}

            {/* Users List - Premium Card Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers.map((user) => {
                    const canModify = canModifyUser(user.role);
                    const isSelf = user.uid === currentUserUid;
                    const isSelected = selectedUsers.has(user.uid);

                    return (
                        <div
                            key={user.uid}
                            className={`admin-card group hover:shadow-xl hover:shadow-[#0511F2]/5 transition-all relative overflow-hidden ${isSelected ? 'ring-2 ring-[#0511F2] bg-blue-50/30' : ''}`}
                        >
                            <div className="diagonal-accent !opacity-[0.03]"></div>
                            
                            {/* Selection Checkbox */}
                            {canModify && !isSelf && (
                                <div className="absolute top-4 right-14 z-20">
                                    <button
                                        onClick={() => toggleUserSelection(user.uid)}
                                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#0511F2] border-[#0511F2] text-white' : 'bg-white border-gray-200 text-transparent hover:border-[#0511F2]'}`}
                                    >
                                        <span className="text-[10px]">✓</span>
                                    </button>
                                </div>
                            )}

                            <div className="flex items-start gap-4 relative z-10">
                                {/* Avatar with dynamic gradient based on role */}
                                <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center text-white font-black text-xl shadow-md transition-transform group-hover:scale-110 group-hover:rotate-3 ${getRoleBadgeStyle(user.role)}`}>
                                    {user.full_name?.charAt(0).toUpperCase() || 'U'}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-black text-[#0511F2] text-lg truncate tracking-tight uppercase font-heading">
                                                    {user.full_name}
                                                </h3>
                                                {isSelf && (
                                                    <span className="text-[9px] bg-[#EAF207] text-gray-900 px-2 py-0.5 rounded-md font-black uppercase tracking-tighter shadow-sm">Tú</span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-400 font-bold tracking-tight truncate">{user.email}</p>
                                        </div>

                                        <div className="flex gap-1">
                                            <button
                                                disabled={!canModify || isSelf}
                                                onClick={() => {
                                                    setEditingUser(user);
                                                    setNewRole(user.role);
                                                    setIsEditingRole(true);
                                                }}
                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#0511F2] hover:shadow-lg transition-all disabled:opacity-20 disabled:cursor-not-allowed flex-shrink-0"
                                            >
                                                <span className="text-xl">✏️</span>
                                            </button>
                                            <button
                                                disabled={!canModify || isSelf}
                                                onClick={() => handleDeleteClick(user)}
                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#EE05F2] hover:shadow-lg hover:shadow-pink-200 transition-all disabled:opacity-20 disabled:cursor-not-allowed flex-shrink-0"
                                            >
                                                <span className="text-xl">🗑️</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Role Badge */}
                                    <div className="mt-4 flex items-center justify-between">
                                        <span className={`admin-badge ${getRoleBadgeStyle(user.role).includes('text-white') ? '!bg-gray-900 !text-white' : ''}`}>
                                            {getRoleLabel(user.role)}
                                        </span>
                                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                                            Lvl {getRoleLevel(user.role)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Create User Modal */}
            {isCreating && (
                <div className="admin-modal-overlay animate-in fade-in duration-300">
                    <div className="admin-modal animate-in zoom-in-95 duration-300 max-w-xl !p-8 relative overflow-hidden">
                        <div className="diagonal-accent !opacity-10"></div>
                        <div className="flex justify-between items-start mb-8 relative z-10">
                            <div>
                                <div className="admin-decorator-line mb-3 w-12"></div>
                                <h2 className="text-2xl font-black text-[#0511F2] tracking-tighter uppercase font-heading">Crear Nuevo Miembro</h2>
                                <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.2em] mt-2">Otorga acceso al ecosistema administrativo</p>
                            </div>
                            <button 
                                onClick={() => setIsCreating(false)} 
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-[#EE05F2] hover:bg-pink-50 transition-all border border-transparent hover:border-pink-100"
                            >
                                <span className="text-xl">✕</span>
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="admin-input-group">
                                    <label className="admin-label">Nombre Completo</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        placeholder="Ej: Alessandro Rossi"
                                        className="admin-input"
                                    />
                                </div>

                                <div className="admin-input-group">
                                    <label className="admin-label">Email de Acceso</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        placeholder="usuario@empresa.com"
                                        className="admin-input"
                                    />
                                </div>
                            </div>

                            <div className="admin-input-group">
                                <label className="admin-label">Contraseña Temporal</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        placeholder="Mínimo 8 caracteres"
                                        className="admin-input pr-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-[#0511F2] transition-colors"
                                    >
                                        {showPassword ? '👁️' : '🔒'}
                                    </button>
                                </div>
                            </div>

                            <div className="admin-input-group">
                                <label className="admin-label">Rol y Pilar Asignado</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as UserProfile['role'])}
                                    className="admin-input cursor-pointer"
                                >
                                    <optgroup label="ADMINISTRACIÓN ESTRATÉGICA">
                                        <option value="admin">Administrador (Full Access)</option>
                                        {currentUserRole === 'owneradmin' && (
                                            <option value="owneradmin">Propietario (Owner)</option>
                                        )}
                                        <option value="staff">Personal General (Staff)</option>
                                    </optgroup>
                                    
                                    <optgroup label="DOMINIO GROW">
                                        {Object.values(ROLES_CONFIG).filter(r => r.pillar === 'GROW').map(r => (
                                            <option key={r.id} value={r.id}>{r.label}</option>
                                        ))}
                                    </optgroup>

                                    <optgroup label="DOMINIO OPERATIONS">
                                        {Object.values(ROLES_CONFIG).filter(r => r.pillar === 'OPERATIONS').map(r => (
                                            <option key={r.id} value={r.id}>{r.label}</option>
                                        ))}
                                    </optgroup>

                                    <optgroup label="DOMINIO SUPPORT">
                                        {Object.values(ROLES_CONFIG).filter(r => r.pillar === 'SUPPORT').map(r => (
                                            <option key={r.id} value={r.id}>{r.label}</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 admin-btn admin-btn-secondary"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="submit"
                                    disabled={createLoading}
                                    className="flex-[2] admin-btn admin-btn-primary shadow-xl shadow-pink-200"
                                >
                                    {createLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        'CREAR USUARIO'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Role Modal */}
            {isEditingRole && (
                <div className="admin-modal-overlay animate-in fade-in duration-300">
                    <div className="admin-modal max-w-xl !p-8 relative overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="diagonal-accent !opacity-10"></div>
                        <div className="flex justify-between items-start mb-8 relative z-10">
                            <div>
                                <div className="admin-decorator-line mb-3 w-12"></div>
                                <h2 className="text-2xl font-black text-[#0511F2] tracking-tighter uppercase font-heading">
                                    {editingUser ? 'Editar Rol de Usuario' : `Editar Roles en Masa (${selectedUsers.size})`}
                                </h2>
                                <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.2em] mt-2">
                                    {editingUser ? `Usuario: ${editingUser.full_name}` : 'Asigna un nuevo rol a todos los usuarios seleccionados'}
                                </p>
                            </div>
                            <button 
                                onClick={() => {
                                    setIsEditingRole(false);
                                    setEditingUser(null);
                                }} 
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-[#EE05F2] hover:bg-pink-50 transition-all border border-transparent hover:border-pink-100"
                            >
                                <span className="text-xl">✕</span>
                            </button>
                        </div>

                        <div className="space-y-6 relative z-10">
                            <div className="admin-input-group">
                                <label className="admin-label">Seleccionar Nuevo Rol</label>
                                <select
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value as UserProfile['role'])}
                                    className="admin-input cursor-pointer"
                                >
                                    <optgroup label="ADMINISTRACIÓN ESTRATÉGICA">
                                        {getRoleLevel(currentUserRole) > 10 || currentUserRole === 'owneradmin' ? (
                                            <option value="admin">Administrador (Full Access)</option>
                                        ) : null}
                                        {currentUserRole === 'owneradmin' && (
                                            <option value="owneradmin">Propietario (Owner)</option>
                                        )}
                                        <option value="staff">Personal General (Staff)</option>
                                    </optgroup>
                                    
                                    <optgroup label="DOMINIO GROW">
                                        {Object.values(ROLES_CONFIG)
                                            .filter(r => r.pillar === 'GROW' && (getRoleLevel(currentUserRole) > r.level || currentUserRole === 'owneradmin'))
                                            .map(r => (
                                                <option key={r.id} value={r.id}>{r.label}</option>
                                            ))}
                                    </optgroup>

                                    <optgroup label="DOMINIO OPERATIONS">
                                        {Object.values(ROLES_CONFIG)
                                            .filter(r => r.pillar === 'OPERATIONS' && (getRoleLevel(currentUserRole) > r.level || currentUserRole === 'owneradmin'))
                                            .map(r => (
                                                <option key={r.id} value={r.id}>{r.label}</option>
                                            ))}
                                    </optgroup>

                                    <optgroup label="DOMINIO SUPPORT">
                                        {Object.values(ROLES_CONFIG)
                                            .filter(r => r.pillar === 'SUPPORT' && (getRoleLevel(currentUserRole) > r.level || currentUserRole === 'owneradmin'))
                                            .map(r => (
                                                <option key={r.id} value={r.id}>{r.label}</option>
                                            ))}
                                    </optgroup>
                                </select>
                                <p className="mt-2 text-[9px] font-bold text-gray-400 uppercase tracking-widest italic">
                                    * Solo puedes asignar roles con nivel inferior al tuyo.
                                </p>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditingRole(false);
                                        setEditingUser(null);
                                    }}
                                    className="flex-1 admin-btn admin-btn-secondary"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    onClick={handleUpdateRoles}
                                    disabled={editLoading}
                                    className="flex-[2] admin-btn admin-btn-primary shadow-xl shadow-pink-200"
                                >
                                    {editLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        'GUARDAR CAMBIOS'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && userToDelete && (
                <div className="admin-modal-overlay animate-in fade-in duration-300">
                    <div className="admin-modal max-w-md text-center !p-10 animate-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-rose-50 border border-rose-100 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">
                            🗑️
                        </div>
                        <h3 className="text-2xl font-black text-[#0511F2] tracking-tighter uppercase font-heading mb-4">¿Eliminar Usuario?</h3>
                        <div className="bg-gray-50 rounded-[1.5rem] p-5 mb-6 border border-gray-100">
                            <p className="font-black text-gray-900 text-lg uppercase font-heading">{userToDelete.full_name}</p>
                            <p className="text-xs text-gray-400 font-bold tracking-tight mt-1">{userToDelete.email}</p>
                        </div>
                        <p className="text-[10px] text-rose-500 font-black uppercase tracking-[0.2em] mb-8 bg-rose-50 inline-block px-3 py-1.5 rounded-md border border-rose-100">
                            ⚠️ Esta acción no se puede deshacer
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setUserToDelete(null);
                                }}
                                className="flex-1 admin-btn admin-btn-secondary"
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleteLoading}
                                className="flex-1 admin-btn bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-200"
                            >
                                {deleteLoading ? '...' : 'ELIMINAR'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
