"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, getTeams, createTeam, updateTeam, deleteTeam, getStaffUsers, updateUserTeam } from '@/lib/firebase';
import { UserProfile, Team } from '@/types/booking';
import { useNotification } from '@/components/admin/NotificationContext';

export default function TeamsPage() {
    const [userRole, setUserRole] = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [teams, setTeams] = useState<Team[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const { showNotification } = useNotification();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [teamToDelete, setTeamToDelete] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        pillar: 'GROW' as 'GROW' | 'OPERATIONS' | 'SUPPORT',
        manager_id: '',
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (authUser) {
                const userDoc = await getDoc(doc(db, 'users', authUser.uid));
                if (userDoc.exists()) {
                    const role = userDoc.data().role || 'staff';
                    setUserRole(role);
                    if (role === 'admin' || role === 'owneradmin') {
                        loadData();
                    } else {
                        window.location.href = '/admin/panel';
                    }
                }
            } else {
                window.location.href = '/admin/ingreso';
            }
            setAuthLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [teamsData, usersData] = await Promise.all([
            getTeams(),
            getStaffUsers()
        ]);
        setTeams(teamsData as Team[]);
        setUsers(usersData as UserProfile[]);
        setLoading(false);
    };

    const handleSaveTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingTeam) {
                await updateTeam(editingTeam.id, {
                    name: formData.name,
                    pillar: formData.pillar,
                    manager_id: formData.manager_id
                });
                if (formData.manager_id && formData.manager_id !== editingTeam.manager_id) {
                    await updateUserTeam(formData.manager_id, editingTeam.id);
                }
                showNotification("Equipo actualizado correctamente", "success");
            } else {
                const docRef = await createTeam({
                    ...formData,
                    member_ids: []
                });
                if (formData.manager_id) {
                    await updateUserTeam(formData.manager_id, docRef.id);
                }
                showNotification("Equipo creado exitosamente", "success");
            }
            setIsModalOpen(false);
            loadData();
        } catch (error) {
            console.error("Error saving team", error);
            showNotification("Error al guardar el equipo", "error");
        }
    };

    const handleDeleteTeam = async (id: string) => {
        try {
            await deleteTeam(id);
            showNotification("Equipo eliminado", "info");
            setTeamToDelete(null);
            loadData();
        } catch (e) {
            showNotification("Error al eliminar el equipo", "error");
        }
    };

    const handleAddMember = async (teamId: string, userId: string) => {
        if (!userId) return;
        const team = teams.find(t => t.id === teamId);
        if (!team) return;

        const newMembers = [...(team.member_ids || []), userId];
        await updateTeam(teamId, { member_ids: newMembers });
        await updateUserTeam(userId, teamId);
        showNotification("Miembro agregado exitosamente", "success");
        loadData();
    };

    const handleRemoveMember = async (teamId: string, userId: string) => {
        const team = teams.find(t => t.id === teamId);
        if (!team) return;

        const newMembers = (team.member_ids || []).filter(id => id !== userId);
        await updateTeam(teamId, { member_ids: newMembers });
        await updateUserTeam(userId, null);
        showNotification("Miembro retirado del equipo", "info");
        loadData();
    };

    if (loading || authLoading) {
        return <div className="p-8 text-center">Cargando...</div>;
    }

    const groupedTeams = {
        GROW: teams.filter(t => t.pillar === 'GROW'),
        OPERATIONS: teams.filter(t => t.pillar === 'OPERATIONS'),
        SUPPORT: teams.filter(t => t.pillar === 'SUPPORT'),
    };

    const renderTeamCard = (team: Team) => {
        const manager = users.find(u => u.uid === team.manager_id);
        const members = (team.member_ids || []).map(id => users.find(u => u.uid === id)).filter(Boolean) as UserProfile[];
        const availableUsers = users.filter(u => u.role !== 'client' && u.uid !== team.manager_id && !(team.member_ids || []).includes(u.uid));

        return (
            <div key={team.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-black text-lg text-[#0511F2]">{team.name}</h4>
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">
                            Manager: {manager ? manager.full_name : 'No asignado'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                setEditingTeam(team);
                                setFormData({ name: team.name, pillar: team.pillar, manager_id: team.manager_id });
                                setIsModalOpen(true);
                            }}
                            className="text-xs text-blue-600 hover:underline"
                        >
                            Editar
                        </button>
                        <button 
                            onClick={() => setTeamToDelete(team.id)}
                            className="text-xs text-red-600 hover:underline"
                        >
                            Eliminar
                        </button>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-4 mt-2">
                    <h5 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Miembros ({members.length})</h5>
                    <div className="flex flex-col gap-2 mb-4">
                        {members.map(m => (
                            <div key={m.uid} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg">
                                <span className="text-sm font-medium">{m.full_name}</span>
                                <button onClick={() => handleRemoveMember(team.id, m.uid)} className="text-red-500 text-xs hover:text-red-700">Quitar</button>
                            </div>
                        ))}
                        {members.length === 0 && <p className="text-xs text-gray-400 italic">No hay miembros en este equipo.</p>}
                    </div>

                    <div className="flex gap-2">
                        <select 
                            className="text-sm border border-gray-200 rounded-lg px-2 py-1 flex-1 bg-gray-50"
                            onChange={(e) => {
                                handleAddMember(team.id, e.target.value);
                                e.target.value = "";
                            }}
                            defaultValue=""
                        >
                            <option value="" disabled>+ Añadir miembro...</option>
                            {availableUsers.map(u => (
                                <option key={u.uid} value={u.uid}>{u.full_name} ({u.role})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 px-2 max-w-7xl mx-auto">
            <div className="flex justify-between items-end border-b border-gray-100 pb-4">
                <div>
                    <h1 className="text-2xl font-black text-[#0511F2] tracking-tight uppercase mb-1">Gestión de Equipos</h1>
                    <p className="text-sm text-gray-500 font-medium">Asignación de roles y estructura organizacional</p>
                </div>
                <button 
                    onClick={() => {
                        setEditingTeam(null);
                        setFormData({ name: '', pillar: 'GROW', manager_id: '' });
                        setIsModalOpen(true);
                    }}
                    className="bg-[#0511F2] text-white px-4 py-2 text-sm rounded-lg font-bold hover:bg-blue-700 transition shadow-md shadow-blue-200"
                >
                    + Crear Equipo
                </button>
            </div>

            {/* GROW Teams */}
            <div>
                <h2 className="text-base font-black mb-3 flex items-center gap-2 text-gray-800">
                    <span className="w-2 h-5 bg-[#EE05F2] rounded-full inline-block"></span>
                    Área GROW
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {groupedTeams.GROW.length > 0 ? groupedTeams.GROW.map(renderTeamCard) : <p className="text-xs text-gray-400">No hay equipos en GROW.</p>}
                </div>
            </div>

            {/* OPERATIONS Teams */}
            <div className="pt-4">
                <h2 className="text-base font-black mb-3 flex items-center gap-2 text-gray-800">
                    <span className="w-2 h-5 bg-[#0511F2] rounded-full inline-block"></span>
                    Área OPERATIONS
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {groupedTeams.OPERATIONS.length > 0 ? groupedTeams.OPERATIONS.map(renderTeamCard) : <p className="text-xs text-gray-400">No hay equipos en OPERATIONS.</p>}
                </div>
            </div>

            {/* SUPPORT Teams */}
            <div className="pt-4">
                <h2 className="text-base font-black mb-3 flex items-center gap-2 text-gray-800">
                    <span className="w-2 h-5 bg-[#26A3BF] rounded-full inline-block"></span>
                    Área SUPPORT
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {groupedTeams.SUPPORT.length > 0 ? groupedTeams.SUPPORT.map(renderTeamCard) : <p className="text-xs text-gray-400">No hay equipos en SUPPORT.</p>}
                </div>
            </div>

            {/* Modal Crear/Editar */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl">
                        <h3 className="text-lg font-black text-[#0511F2] mb-4">{editingTeam ? 'Editar Equipo' : 'Nuevo Equipo'}</h3>
                        <form onSubmit={handleSaveTeam} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nombre del Equipo</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 outline-none focus:border-[#0511F2] focus:ring-1 focus:ring-blue-100 transition"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Pilar</label>
                                <select 
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 outline-none focus:border-[#0511F2] transition"
                                    value={formData.pillar}
                                    onChange={e => setFormData({...formData, pillar: e.target.value as any})}
                                >
                                    <option value="GROW">GROW</option>
                                    <option value="OPERATIONS">OPERATIONS</option>
                                    <option value="SUPPORT">SUPPORT</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Manager / Líder</label>
                                <select 
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 outline-none focus:border-[#0511F2] transition"
                                    value={formData.manager_id}
                                    onChange={e => setFormData({...formData, manager_id: e.target.value})}
                                    required
                                >
                                    <option value="" disabled>Seleccione un manager...</option>
                                    {users.filter(u => u.role !== 'client').map(u => (
                                        <option key={u.uid} value={u.uid}>{u.full_name} ({u.role})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 px-3 py-2 text-sm rounded-lg bg-[#0511F2] text-white font-bold hover:bg-blue-700 shadow transition">
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirmación de Eliminación */}
            {teamToDelete && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-4 text-2xl">
                            ⚠️
                        </div>
                        <h3 className="text-lg font-black text-gray-800 mb-2">¿Eliminar Equipo?</h3>
                        <p className="text-xs text-gray-500 mb-6">Esta acción no se puede deshacer y los miembros quedarán sin equipo asignado.</p>
                        
                        <div className="flex gap-2 w-full">
                            <button 
                                onClick={() => setTeamToDelete(null)} 
                                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={() => handleDeleteTeam(teamToDelete)} 
                                className="flex-1 px-3 py-2 text-sm rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 shadow transition"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
