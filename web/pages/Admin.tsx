import React, { useEffect, useState, useContext } from 'react';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { api } from '../services/api';
import { AppContext } from '../App';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { AiProviderConfig, AiProviderConfigValue } from '../components/AiProviderConfig';

interface UserItem {
    id: string;
    email: string;
    name: string;
    role: string;
    plan?: string;
    googleId?: string | null;
    createdAt: string;
}

const SUPERADMIN_EMAIL = 'ankitravione@gmail.com';

// ─── Password Reset Modal ─────────────────────────────────────────────────────
const ResetPasswordModal: React.FC<{
    user: UserItem;
    onClose: () => void;
    onSuccess: () => void;
}> = ({ user, onClose, onSuccess }) => {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isValid = password.length >= 8 && password === confirm;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.fetch(`/admin/users/${user.id}/password`, {
                method: 'PUT',
                body: JSON.stringify({ password })
            });
            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to update password');
            }
        } catch (e: any) {
            setError(e.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto border border-gray-200 dark:border-gray-700">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Icon name="KeyRound" size={20} className="text-primary" />
                                Reset Password
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user.name} · {user.email}</p>
                        </div>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                            <Icon name="X" size={18} />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
                            <div className="relative">
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Min. 8 characters"
                                    className="input w-full pr-10"
                                    autoComplete="new-password"
                                    required
                                />
                                <button type="button" onClick={() => setShowPass(p => !p)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                                    <Icon name={showPass ? 'EyeOff' : 'Eye'} size={16} />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm Password</label>
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                placeholder="Re-enter password"
                                className={`input w-full ${confirm && password !== confirm ? 'ring-2 ring-danger/50 border-danger' : ''}`}
                                autoComplete="new-password"
                                required
                            />
                            {confirm && password !== confirm && (
                                <p className="text-xs text-danger mt-1">Passwords do not match</p>
                            )}
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={onClose}
                                className="btn btn-secondary flex-1">
                                Cancel
                            </button>
                            <button type="submit" disabled={!isValid || loading}
                                className="btn btn-primary flex-1 flex items-center justify-center gap-2">
                                {loading && <Icon name="Loader2" size={15} className="animate-spin" />}
                                {loading ? 'Saving...' : 'Set Password'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

// ─── Platform AI Card ─────────────────────────────────────────────────────────
// Lets the superadmin configure the host-provided AI (same multi-provider UI as
// a user's own AI settings). Users rely on this by default; anyone who adds
// their own key uses that instead (and isn't billed to the host).
const emptyAiConfig: AiProviderConfigValue = { provider: 'deepseek', model: '', keys: {}, customModels: {}, baseUrl: {} };

const PlatformAiCard: React.FC = () => {
    const { showToast } = useToast();
    const [aiEnabled, setAiEnabled] = useState(false);
    const [cfg, setCfg] = useState<AiProviderConfigValue>(emptyAiConfig);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        api.fetch('/admin/platform-ai')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data) {
                    setAiEnabled(!!data.aiEnabled);
                    setCfg({
                        provider: data.provider || 'deepseek',
                        model: data.model || '',
                        keys: data.keys || {},
                        customModels: data.customModels || {},
                        baseUrl: data.baseUrl || {},
                    });
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const hasActiveKey = (cfg.keys[cfg.provider]?.length ?? 0) > 0;

    const save = async () => {
        setSaving(true);
        try {
            const res = await api.fetch('/admin/platform-ai', { method: 'PUT', body: JSON.stringify({ aiEnabled, ...cfg }) });
            const data = await res.json().catch(() => ({}));
            if (res.ok) showToast('Platform AI settings saved.', 'success');
            else showToast(data.error || 'Failed to save platform AI settings', 'error');
        } catch (e: any) {
            showToast(e.message || 'Failed to save', 'error');
        } finally {
            setSaving(false);
        }
    };

    const testConnection = async () => {
        const apiKey = cfg.keys[cfg.provider]?.[0] || '';
        if (!apiKey) { showToast('Add an API key for this provider first.', 'info'); return; }
        setTesting(true);
        try {
            const res = await api.fetch('/ai-settings/test', {
                method: 'POST',
                body: JSON.stringify({ provider: cfg.provider, model: cfg.model, apiKey, baseUrl: cfg.baseUrl[cfg.provider] || '' }),
            });
            const data = await res.json().catch(() => ({}));
            showToast(res.ok && data.success ? `Connection OK: ${data.message || ''}` : `Failed: ${data.error || 'Unknown error'}`, res.ok && data.success ? 'success' : 'error');
        } catch (e: any) {
            showToast(`Failed: ${e.message || 'Network error'}`, 'error');
        } finally {
            setTesting(false);
        }
    };

    return (
        <Card>
            <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="text-xl font-semibold text-gray-darkest dark:text-gray-50 flex items-center gap-2">
                    <Icon name="Sparkles" size={20} className="text-primary" />
                    Platform AI
                </h3>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${aiEnabled && hasActiveKey ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                    {aiEnabled && hasActiveKey ? 'Active' : 'Off'}
                </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                The AI all users rely on by default. Usage on this key is billed to the host — free users get 10/day and Pro users 40/day; anyone who adds their own key in Settings is unlimited and not billed to you.
            </p>

            {loading ? (
                <div className="py-6 flex justify-center"><Icon name="Loader2" size={24} className="animate-spin text-primary" /></div>
            ) : (
                <div className="space-y-5">
                    <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg cursor-pointer">
                        <div>
                            <p className="font-medium text-gray-darkest dark:text-gray-50">Enable platform AI for all users</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">When off, users must add their own key to use AI.</p>
                        </div>
                        <input type="checkbox" checked={aiEnabled} onChange={e => setAiEnabled(e.target.checked)} className="w-5 h-5 rounded text-primary focus:ring-primary" />
                    </label>

                    <AiProviderConfig value={cfg} onChange={setCfg} />

                    <div className="flex flex-wrap justify-end gap-3 pt-1">
                        <button type="button" onClick={testConnection} disabled={testing} className="btn btn-secondary text-sm min-w-[130px] flex items-center justify-center">
                            {testing ? <><Icon name="Loader2" size={15} className="animate-spin mr-2" />Testing...</> : <>🧪 Test Connection</>}
                        </button>
                        <button type="button" onClick={save} disabled={saving} className="btn btn-primary text-sm flex items-center justify-center">
                            {saving ? <Icon name="Loader2" size={15} className="animate-spin mr-2" /> : <Icon name="Save" size={15} className="mr-2" />}
                            Save
                        </button>
                    </div>
                </div>
            )}
        </Card>
    );
};

// ─── Main Admin Page ──────────────────────────────────────────────────────────
export const Admin: React.FC = () => {
    const context = useContext(AppContext);
    const { showToast } = useToast();
    const [users, setUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [resetUser, setResetUser] = useState<UserItem | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
    const [successMsg, setSuccessMsg] = useState('');

    const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.fetch('/admin/users');
            if (res.ok) {
                setUsers(await res.json());
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

    useEffect(() => { fetchUsers(); }, []);

    const handleDeleteUser = async (id: string) => {
        if (id === deletingId) return;
        setDeletingId(id);
        try {
            const res = await api.fetch(`/admin/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setUsers(prev => prev.filter(u => u.id !== id));
                showSuccess('User deleted successfully.');
            } else {
                const err = await res.json();
                showToast(err.error || 'Failed to delete user', 'error');
            }
        } catch (e: any) {
            showToast(e.message || 'Failed to delete user', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const handleSetPlan = async (user: UserItem, plan: 'free' | 'pro') => {
        try {
            const res = await api.fetch(`/admin/users/${user.id}/plan`, { method: 'PUT', body: JSON.stringify({ plan }) });
            if (res.ok) {
                const updated = await res.json();
                setUsers(prev => prev.map(u => u.id === user.id ? { ...u, plan: updated.plan } : u));
                showSuccess(`${user.name} is now on the ${plan} plan.`);
            } else {
                const err = await res.json();
                showToast(err.error || 'Failed to update plan', 'error');
            }
        } catch (e: any) {
            showToast(e.message || 'Failed to update plan', 'error');
        }
    };

    const showSuccess = (msg: string) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(''), 4000);
    };

    const filteredUsers = users.filter(
        user =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isSuperAdminRow = (user: UserItem) => user.role === 'superadmin' || user.email === SUPERADMIN_EMAIL;

    return (
        <div className="space-y-6">
            {resetUser && (
                <ResetPasswordModal
                    user={resetUser}
                    onClose={() => setResetUser(null)}
                    onSuccess={() => showSuccess(`Password for ${resetUser.name} updated successfully.`)}
                />
            )}

            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => { if (deleteTarget) handleDeleteUser(deleteTarget.id); }}
                title="Delete User"
                message={deleteTarget ? `Delete "${deleteTarget.name}" and ALL their data? This is permanent and cannot be undone.` : ''}
                confirmText="Delete User"
                cancelText="Cancel"
                variant="danger"
            />

            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Super Admin Panel</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage platform users — reset passwords, delete accounts.</p>
                </div>
                <button
                    onClick={fetchUsers}
                    disabled={loading}
                    className="btn btn-secondary flex items-center justify-center min-w-[120px] transition-all"
                >
                    {loading ? (
                        <><Icon name="Loader2" size={16} className="animate-spin mr-2" />Loading...</>
                    ) : (
                        <><Icon name="RefreshCw" size={16} className="mr-2" />Refresh</>
                    )}
                </button>
            </div>

            {successMsg && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3">
                    <Icon name="CheckCircle" className="text-emerald-500 flex-shrink-0" size={20} />
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">{successMsg}</p>
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                    <Icon name="AlertCircle" className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                        <h4 className="font-semibold text-red-950 dark:text-red-200 text-sm">Administrative Error</h4>
                        <p className="text-xs text-red-700 dark:text-red-400 mt-1">{error}</p>
                    </div>
                </div>
            )}

            <PlatformAiCard />

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
                                        {/* User Details */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-lg uppercase flex-shrink-0">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-gray-950 dark:text-white">{user.name}</span>
                                                        <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                                                            user.googleId
                                                                ? 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30'
                                                                : 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30'
                                                        }`}>
                                                            {user.googleId ? 'Google' : 'Manual'}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Role */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                                                user.role === 'superadmin'
                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
                                            }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        {/* Joined */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(user.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        {/* Actions */}
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            {isSuperAdminRow(user) ? (
                                                <span className="text-xs text-gray-400 italic">Protected</span>
                                            ) : (
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Plan toggle (free / pro) */}
                                                    <button
                                                        onClick={() => handleSetPlan(user, user.plan === 'pro' ? 'free' : 'pro')}
                                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                                                            user.plan === 'pro'
                                                                ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30'
                                                                : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/40 dark:hover:bg-gray-700/40 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                                                        }`}
                                                        title={user.plan === 'pro' ? 'Click to downgrade to Free' : 'Click to upgrade to Pro'}
                                                    >
                                                        <Icon name={user.plan === 'pro' ? 'Star' : 'User'} size={13} className={user.plan === 'pro' ? 'fill-current' : ''} />
                                                        {user.plan === 'pro' ? 'Pro' : 'Free'}
                                                    </button>
                                                    {/* Reset Password */}
                                                    <button
                                                        onClick={() => setResetUser(user)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-200 dark:border-emerald-900/30 transition"
                                                        title="Reset Password"
                                                    >
                                                        <Icon name="KeyRound" size={13} />
                                                        Reset Password
                                                    </button>
                                                    {/* Delete */}
                                                    <button
                                                        onClick={() => setDeleteTarget(user)}
                                                        disabled={deletingId === user.id}
                                                        className="p-1.5 rounded-lg btn btn-danger text-white shadow-sm hover:shadow transition"
                                                        title="Delete User & Data"
                                                    >
                                                        {deletingId === user.id
                                                            ? <Icon name="Loader2" size={14} className="animate-spin" />
                                                            : <Icon name="Trash2" size={14} />}
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 text-right">
                    {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} shown
                </p>
            </Card>
        </div>
    );
};
