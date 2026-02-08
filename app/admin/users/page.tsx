"use client";

import { useState, useEffect } from "react";
import { auth, db, deleteUser, firebaseConfig } from "@/lib/firebase";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, doc, setDoc, getDoc } from "firebase/firestore";
import { UserProfile } from "@/types/booking";
import { useTranslation } from "@/components/admin/LanguageContext";
import { useNotification } from "@/components/admin/NotificationContext";

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

    const currentUserUid = auth.currentUser?.uid;

    const roleHierarchy: Record<UserProfile['role'], number> = {
        client: 0,
        staff: 1,
        employ: 1,
        admin: 2,
        owneradmin: 3
    };

    const canModifyUser = (targetRole: UserProfile['role']) => {
        return roleHierarchy[currentUserRole] > roleHierarchy[targetRole];
    };

    const getRoleBadgeStyle = (role: UserProfile['role']) => {
        switch (role) {
            case 'owneradmin':
                return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
            case 'admin':
                return 'bg-blue-500 text-white';
            case 'staff':
                return 'bg-green-500 text-white';
            case 'employ':
                return 'bg-cyan-500 text-white';
            case 'client':
                return 'bg-gray-400 text-white';
            default:
                return 'bg-gray-200 text-gray-700';
        }
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
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            })) as UserProfile[];
            setUsers(usersData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUserUid]);

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
            console.error("Error creating user:", error);
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
            setMessage(`✅ ${t('user_deleted_success')}`);
            setShowDeleteModal(false);
            setUserToDelete(null);
        } catch (error: any) {
            console.error("Error deleting user:", error);
            setMessage(`❌ Error: ${error.message}`);
        } finally {
            setDeleteLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header - Mobile Optimized */}
            <div className="flex flex-col gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600 bg-clip-text text-transparent">
                        {t('manage_users')}
                    </h1>
                    <p className="text-sm md:text-base text-gray-500 font-medium mt-1">
                        Control de acceso al panel
                    </p>
                </div>

                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="w-full md:w-auto px-5 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t('create_user')}
                </button>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-2xl text-sm font-medium ${message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message}
                </div>
            )}

            {/* Create Form - Mobile Optimized */}
            {isCreating && (
                <div className="bg-white p-5 md:p-8 rounded-[2rem] border border-gray-100 shadow-lg">
                    <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-5">Crear Usuario</h2>

                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">
                                {t('full_name')}
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">
                                {t('email')}
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">
                                Contraseña
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none font-medium pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-2xl"
                                >
                                    {showPassword ? '👁️' : '🔒'}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">
                                {t('role')}
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as UserProfile['role'])}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none font-bold"
                            >
                                <option value="staff">{t('role_staff')}</option>
                                <option value="employ">{t('role_employ')}</option>
                                <option value="admin">{t('role_admin')}</option>
                                {currentUserRole === 'owneradmin' && (
                                    <option value="owneradmin">{t('role_owneradmin')}</option>
                                )}
                            </select>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold hover:shadow-xl transition-all"
                            >
                                {t('create_user')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Users List - Card Layout for Mobile, Table for Desktop */}
            <div className="space-y-3">
                {users.map((user) => {
                    const canModify = canModifyUser(user.role);
                    const isSelf = user.uid === currentUserUid;

                    return (
                        <div
                            key={user.uid}
                            className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
                        >
                            {/* Mobile & Desktop Layout */}
                            <div className="flex items-start gap-4">
                                {/* Avatar */}
                                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                    {user.full_name?.charAt(0).toUpperCase() || 'U'}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-bold text-gray-800 text-base md:text-lg truncate">
                                                    {user.full_name}
                                                </h3>
                                                {isSelf && (
                                                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                                                        Tú
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 truncate">{user.email}</p>
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            disabled={!canModify || isSelf}
                                            onClick={() => handleDeleteClick(user)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                                            title={!canModify ? t('insufficient_permissions') : isSelf ? t('cannot_delete_self') : t('delete_user')}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Role Badge */}
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getRoleBadgeStyle(user.role)}`}>
                                        {t(`role_${user.role}` as any)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>


            {/* Delete Confirmation Modal */}
            {showDeleteModal && userToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-8 mx-4">
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 md:w-16 md:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl md:text-4xl">🗑️</span>
                            </div>
                            <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-3">{t('delete_user_confirm')}</h3>
                            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                                <p className="font-bold text-gray-800">{userToDelete.full_name}</p>
                                <p className="text-sm text-gray-600">{userToDelete.email}</p>
                            </div>
                            <p className="text-sm text-red-600 font-bold">
                                ⚠️ {t('delete_user_warning')}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setUserToDelete(null);
                                }}
                                className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleteLoading}
                                className="flex-1 px-6 py-3 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all disabled:opacity-50"
                            >
                                {deleteLoading ? 'Eliminando...' : t('delete_user')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
