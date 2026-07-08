import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { api } from '../services/api';

interface UserItem {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: string;
}

export const Admin: React.FC = () => {
    const [users, setUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.fetch('/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to load users');
            }
        } catch (e: any) {
            setError(e.message || 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDeleteUser = async (id: string, name: string) => {
        if (id === deletingId) return;
        const confirmDelete = window.confirm(
            `Are you sure you want to delete the user "${name}" and all of their transaction history, accounts, budgets, and settings?\n\nThis action is permanent and cannot be undone.`
        );
        if (!confirmDelete) return;

        setDeletingId(id);
        try {
            const res = await api.fetch(`/admin/users/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                alert('User and all associated data deleted successfully.');
                setUsers(prev => prev.filter(u => u.id !== id));
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to delete user');
            }
        } catch (e: any) {
            alert(e.message || 'Failed to delete user');
        } finally {
            setDeletingId(null);
        }
    };

    const filteredUsers = users.filter(
        user =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Super Admin Panel</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage platform users and perform secure administrative actions.</p>
                </div>
                <button
                    onClick={fetchUsers}
                    disabled={loading}
                    className="btn btn-secondary flex items-center justify-center min-w-[120px] transition-all"
                >
                    {loading ? (
                        <>
                            <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                            Loading...
                        </>
                    ) : (
                        <>
                            <Icon name="RefreshCw" size={16} className="mr-2" />
                            Refresh
                        </>
                    )}
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                    <Icon name="AlertCircle" className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                        <h4 className="font-semibold text-red-950 dark:text-red-200 text-sm">Administrative Error</h4>
                        <p className="text-xs text-red-700 dark:text-red-400 mt-1">{error}</p>
                    </div>
                </div>
            )}

            <Card>
                <div className="mb-4 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon name="Search" size={18} className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="block w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-xl pl-10 pr-3 py-2.5 focus:ring-2 focus:ring-primary focus:bg-white text-sm dark:text-gray-100 outline-none transition"
                    />
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700/50">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/30">
                            <tr>
                                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">User Details</th>
                                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Joined Date</th>
                                <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                            {loading && users.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <Icon name="Loader2" size={32} className="animate-spin text-primary" />
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Fetching platform user directory...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        <Icon name="UserCheck" size={32} className="mx-auto mb-3 opacity-30" />
                                        <p className="text-sm font-medium">No users match your filter criteria</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-lg uppercase flex-shrink-0">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-950 dark:text-white">{user.name}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                                                user.role === 'superadmin'
                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
                                            }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(user.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {user.role !== 'superadmin' ? (
                                                <button
                                                    onClick={() => handleDeleteUser(user.id, user.name)}
                                                    disabled={deletingId === user.id}
                                                    className="btn btn-danger p-2 text-white shadow-sm hover:shadow transition"
                                                    title="Delete User & Data"
                                                >
                                                    {deletingId === user.id ? (
                                                        <Icon name="Loader2" size={15} className="animate-spin" />
                                                    ) : (
                                                        <Icon name="Trash2" size={15} />
                                                    )}
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">Protected</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
