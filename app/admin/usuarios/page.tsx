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
import styles from "./UsersPage.module.css";

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

    const getRoleAvatarClass = (role: string) => {
        const config = ROLES_CONFIG[role.toUpperCase()] || ROLES_CONFIG[role.toLowerCase()];
        const pillar = config?.pillar;

        switch (pillar) {
            case 'ADMIN':
                return styles.avatarAdmin;
            case 'GROW':
                return styles.avatarGrow;
            case 'OPERATIONS':
                return styles.avatarOperations;
            case 'SUPPORT':
                return styles.avatarSupport;
            default:
                return styles.avatarDefault;
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
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p className={styles.loadingText}>Sincronizando Usuarios...</p>
            </div>
        );
    }

    const isAuthorized = currentUserRole === 'owneradmin' || currentUserRole === 'admin' || getRoleLevel(currentUserRole) >= 5;
    
    if (!isAuthorized) {
        return (
            <div className={styles.unauthorizedContainer}>
                <div className={styles.unauthorizedIconBox}>🚫</div>
                <div>
                    <h2 className={styles.unauthorizedTitle}>Protocolo de Seguridad</h2>
                    <div className={styles.unauthorizedCard}>
                        <p className={styles.unauthorizedText}>
                            Tu nivel de acceso actual ({getRoleLabel(currentUserRole)}) no cumple con los requisitos del protocolo para gestionar la estructura de usuarios de la organización.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.usersContainer}>
            {/* Header - Mobile Optimized */}
            <div className={styles.headerSection}>
                <div className={styles.headerTitleWrapper}>
                    <div className={styles.decoratorLine}></div>
                    <h1 className={styles.title}>Gestión de Usuarios</h1>
                    <p className={styles.subtitle}>Control de acceso y jerarquías del panel administrativo</p>
                </div>

                <div className={styles.headerActions}>
                    <button
                        onClick={() => window.location.href = '/admin/usuarios/permisos'}
                        className={`${styles.btn} ${styles.btnSecondary}`}
                    >
                        <span>🛡️</span>
                        GESTIONAR PERMISOS
                    </button>
                    <button
                        onClick={() => setIsCreating(true)}
                        className={`${styles.btn} ${styles.btnPrimary}`}
                    >
                        <span>➕</span>
                        NUEVO USUARIO
                    </button>
                </div>
            </div>

            {/* Search and Bulk Actions */}
            <div className={styles.searchFilterBar}>
                <div className={styles.searchWrapper}>
                    <span className={styles.searchIcon}>🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar usuarios por nombre o correo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>

                <div className={styles.bulkActions}>
                    {selectedUsers.size > 0 && (
                        <button
                            onClick={() => {
                                setEditingUser(null);
                                setIsEditingRole(true);
                            }}
                            className={`${styles.btn} ${styles.btnPrimary}`}
                        >
                            EDITAR ROL ({selectedUsers.size})
                        </button>
                    )}
                    <button
                        onClick={() => selectAllUsers(filteredUsers)}
                        className={`${styles.btn} ${styles.btnSecondary}`}
                    >
                        {selectedUsers.size === filteredUsers.length ? 'DESELECCIONAR TODO' : 'SELECCIONAR TODO'}
                    </button>
                </div>
            </div>

            {/* Notification Bar */}
            {message && (
                <div className={`${styles.notificationBar} ${message.includes('✅') ? styles.notificationSuccess : styles.notificationError}`}>
                    <span>{message.includes('✅') ? '✨' : '⚠️'}</span>
                    {message}
                </div>
            )}

            {/* Users List - Premium Card Layout */}
            <div className={styles.usersGrid}>
                {filteredUsers.map((user) => {
                    const canModify = canModifyUser(user.role);
                    const isSelf = user.uid === currentUserUid;
                    const isSelected = selectedUsers.has(user.uid);

                    return (
                        <div
                            key={user.uid}
                            className={`${styles.userCard} ${isSelected ? styles.userCardSelected : ''}`}
                        >
                            <div className={styles.diagonalAccent}></div>
                            
                            {/* Selection Checkbox */}
                            {canModify && !isSelf && (
                                <div className={styles.checkboxWrapper}>
                                    <button
                                        onClick={() => toggleUserSelection(user.uid)}
                                        className={`${styles.checkboxBtn} ${isSelected ? styles.checkboxBtnSelected : ''}`}
                                    >
                                        ✓
                                    </button>
                                </div>
                            )}

                            <div className={styles.cardContent}>
                                {/* Avatar with dynamic gradient based on role */}
                                <div className={`${styles.avatar} ${getRoleAvatarClass(user.role)}`}>
                                    {user.full_name?.charAt(0).toUpperCase() || 'U'}
                                </div>

                                <div className={styles.userDetails}>
                                    <div className={styles.nameRow}>
                                        <h3 className={styles.userName}>
                                            {user.full_name}
                                        </h3>
                                        {isSelf && (
                                            <span className={styles.selfBadge}>Tú</span>
                                        )}
                                    </div>
                                    <p className={styles.userEmail}>{user.email}</p>

                                    {/* Role Badge */}
                                    <div className={styles.roleFooter}>
                                        <span className={`${styles.roleBadge} ${getRoleAvatarClass(user.role) === styles.avatarAdmin ? styles.roleBadgeAdmin : ''}`}>
                                            {getRoleLabel(user.role)}
                                        </span>
                                        <span className={styles.levelLabel}>
                                            Lvl {getRoleLevel(user.role)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions overlay buttons inside iOS style card top right */}
                            <div className={styles.cardActions}>
                                <button
                                    disabled={!canModify || isSelf}
                                    onClick={() => {
                                        setEditingUser(user);
                                        setNewRole(user.role);
                                        setIsEditingRole(true);
                                    }}
                                    className={styles.actionIconBtn}
                                    title="Editar Rol"
                                >
                                    ✏️
                                </button>
                                <button
                                    disabled={!canModify || isSelf}
                                    onClick={() => handleDeleteClick(user)}
                                    className={`${styles.actionIconBtn} ${styles.actionIconBtnDelete}`}
                                    title="Eliminar Usuario"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Create User Modal */}
            {isCreating && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.diagonalAccent} style={{ opacity: 0.1 }}></div>
                        <div className={styles.modalHeader}>
                            <div className={styles.modalTitleWrapper}>
                                <h2 className={styles.modalTitle}>Crear Nuevo Miembro</h2>
                                <p className={styles.modalSubtitle}>Acceso al ecosistema administrativo</p>
                            </div>
                            <button 
                                onClick={() => setIsCreating(false)} 
                                className={styles.modalCloseBtn}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className={styles.form}>
                            <div className={styles.formGrid}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Nombre Completo</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        placeholder="Ej: Alessandro Rossi"
                                        className={styles.input}
                                    />
                                </div>

                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Email de Acceso</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        placeholder="usuario@empresa.com"
                                        className={styles.input}
                                    />
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Contraseña Temporal</label>
                                <div className={styles.passwordInputWrapper}>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        placeholder="Mínimo 8 caracteres"
                                        className={styles.input}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className={styles.passwordToggle}
                                    >
                                        {showPassword ? '👁️' : '🔒'}
                                    </button>
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Rol y Pilar Asignado</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as UserProfile['role'])}
                                    className={styles.input}
                                    style={{ cursor: 'pointer' }}
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

                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className={`${styles.btn} ${styles.btnSecondary}`}
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="submit"
                                    disabled={createLoading}
                                    className={`${styles.btn} ${styles.btnPrimary}`}
                                >
                                    {createLoading ? '...' : 'CREAR USUARIO'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Role Modal */}
            {isEditingRole && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.diagonalAccent} style={{ opacity: 0.1 }}></div>
                        <div className={styles.modalHeader}>
                            <div className={styles.modalTitleWrapper}>
                                <h2 className={styles.modalTitle}>
                                    {editingUser ? 'Editar Rol' : `Editar Roles (${selectedUsers.size})`}
                                </h2>
                                <p className={styles.modalSubtitle}>
                                    {editingUser ? `Usuario: ${editingUser.full_name}` : 'Asigna un nuevo rol a la selección'}
                                </p>
                            </div>
                            <button 
                                onClick={() => {
                                    setIsEditingRole(false);
                                    setEditingUser(null);
                                }} 
                                className={styles.modalCloseBtn}
                            >
                                ✕
                            </button>
                        </div>

                        <div className={styles.form}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Seleccionar Nuevo Rol</label>
                                <select
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value as UserProfile['role'])}
                                    className={styles.input}
                                    style={{ cursor: 'pointer' }}
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
                                <p className={styles.helpText}>
                                    * Solo puedes asignar roles con nivel inferior al tuyo.
                                </p>
                            </div>

                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditingRole(false);
                                        setEditingUser(null);
                                    }}
                                    className={`${styles.btn} ${styles.btnSecondary}`}
                                >
                                    CANCELAR
                                </button>
                                <button
                                    onClick={handleUpdateRoles}
                                    disabled={editLoading}
                                    className={`${styles.btn} ${styles.btnPrimary}`}
                                >
                                    {editLoading ? '...' : 'GUARDAR CAMBIOS'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && userToDelete && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modal} ${styles.modalDelete}`}>
                        <div className={styles.deleteIconBox}>
                            🗑️
                        </div>
                        <h3 className={styles.modalTitle} style={{ marginBottom: '1rem' }}>¿Eliminar Usuario?</h3>
                        <div className={styles.deleteTargetBox}>
                            <p className={styles.deleteTargetName}>{userToDelete.full_name}</p>
                            <p className={styles.deleteTargetEmail}>{userToDelete.email}</p>
                        </div>
                        <p className={styles.deleteWarning}>
                            ⚠️ Esta acción no se puede deshacer
                        </p>

                        <div className={styles.modalActions}>
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setUserToDelete(null);
                                }}
                                className={`${styles.btn} ${styles.btnSecondary}`}
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleteLoading}
                                className={`${styles.btn} ${styles.btnDanger}`}
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
