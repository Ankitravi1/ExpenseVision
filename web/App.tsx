import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { Accounts } from './pages/Accounts';
import { Budgets } from './pages/Budgets';
import { Categories } from './pages/Categories';
import { TransactionsPage } from './pages/TransactionsPage';
import { Reports } from './pages/Reports';
import { Recurring } from './pages/Recurring';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { Admin } from './pages/Admin';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { VerifyEmail } from './pages/VerifyEmail';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { ProfileCompletion } from './components/ProfileCompletion';
import { Account, Budget, Category, Transaction, Page, User, RecurringRule } from './types';
import { NewTransactionModal } from './components/NewTransactionModal';
import { authService } from './services/auth';
import { api } from './services/api';
import { Icon } from './components/Icon';
import { useToast } from './context/ToastContext';
import { AppContext } from './context/AppContext';
import { transactionDateToIso } from './utils/date';

// Re-export so existing `import { AppContext } from '../App'` keeps working
export { AppContext };

const PAGE_PATHS: Record<Page, string> = {
  Dashboard: '/',
  Transactions: '/transactions',
  Recurring: '/recurring',
  Budgets: '/budgets',
  Accounts: '/accounts',
  Categories: '/categories',
  Reports: '/reports',
  Profile: '/profile',
  Settings: '/settings',
  Admin: '/admin',
};

const pageForPath = (pathname: string): Page => {
  const entry = (Object.entries(PAGE_PATHS) as [Page, string][]).find(([, path]) => path === pathname);
  return entry ? entry[0] : 'Dashboard';
};

const App: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currency, setCurrencyState] = useState('INR');
  const [user, setUser] = useState<User | null>(null);
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme as 'light' | 'dark') || 'light';
  });

  // Data States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurring, setRecurring] = useState<RecurringRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePage = pageForPath(location.pathname);
  const setActivePage = useCallback((page: Page) => {
    navigate(PAGE_PATHS[page]);
  }, [navigate]);

  const setTheme = useCallback((newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Persist to DB if authenticated
    if (isAuthenticated) {
      authService.updateProfile({ theme: newTheme }).catch(console.error);
    }
  }, [isAuthenticated]);

  const setCurrency = useCallback((newCurrency: string) => {
    setCurrencyState(newCurrency);
    // Persist to DB if authenticated
    if (isAuthenticated) {
      authService.updateProfile({ currency: newCurrency }).catch(console.error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Load user preferences from stored session
  const applyStoredUser = useCallback(() => {
    const storedUser = authService.getUser();
    if (storedUser) {
      setUser(storedUser);
      setNeedsProfileCompletion(storedUser.profileComplete !== true);
      if (storedUser.currency) setCurrencyState(storedUser.currency);
      if (storedUser.theme) setThemeState(storedUser.theme as 'light' | 'dark');
    }
  }, []);

  // Fetch Initial Data
  const fetchData = useCallback(async () => {
    if (!authService.isAuthenticated()) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getInitialData();
      setTransactions(data.transactions);
      setAccounts(data.accounts);
      setCategories(data.categories);
      setBudgets(data.budgets);
      setRecurring(data.recurring || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data. Please try refreshing.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh only balances and budget progress after a transaction changes.
  // Much lighter than re-fetching everything.
  const refreshFinancials = useCallback(async () => {
    try {
      const [freshAccounts, freshBudgets] = await Promise.all([
        api.getAccounts(),
        api.getBudgets(),
      ]);
      setAccounts(freshAccounts);
      setBudgets(freshBudgets);
    } catch (err) {
      console.error('Failed to refresh balances:', err);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      applyStoredUser();
      fetchData();
    }
  }, [isAuthenticated, applyStoredUser, fetchData]);

  // Listen for Service Worker messages (Push Notifications)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleServiceWorkerMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
          window.dispatchEvent(new CustomEvent('expensevision-notification', {
            detail: event.data.payload
          }));
        }
      };

      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      };
    }
  }, []);

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id'>) => {
    try {
      const newTransaction = await api.createTransaction(transaction);
      setTransactions(prev => [newTransaction, ...prev].sort((a, b) => transactionDateToIso(b.date).localeCompare(transactionDateToIso(a.date))));
      await refreshFinancials();
      showToast('Transaction added', 'success');
    } catch (err) {
      console.error('Failed to add transaction:', err);
      showToast('Failed to add transaction', 'error');
    }
  }, [refreshFinancials, showToast]);

  const updateTransaction = useCallback(async (id: string, updatedData: Partial<Transaction>) => {
    try {
      const updated = await api.updateTransaction(id, updatedData);
      setTransactions(prev => prev.map(t => t.id === id ? updated : t)
        .sort((a, b) => transactionDateToIso(b.date).localeCompare(transactionDateToIso(a.date))));
      await refreshFinancials();
      showToast('Transaction updated', 'success');
    } catch (err) {
      console.error('Failed to update transaction:', err);
      showToast('Failed to update transaction', 'error');
    }
  }, [refreshFinancials, showToast]);

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      await api.deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      await refreshFinancials();
      showToast('Transaction deleted', 'success');
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      showToast('Failed to delete transaction', 'error');
    }
  }, [refreshFinancials, showToast]);

  const bulkDeleteTransactions = useCallback(async (ids: string[]) => {
    try {
      await api.bulkDeleteTransactions(ids);
      setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
      await refreshFinancials();
      showToast(`${ids.length} transactions deleted`, 'success');
    } catch (err) {
      console.error('Failed to bulk delete transactions:', err);
      showToast('Failed to bulk delete transactions', 'error');
    }
  }, [refreshFinancials, showToast]);

  const clearAllTransactions = useCallback(async (confirmationPhrase: string) => {
    try {
      await api.clearAllTransactions(confirmationPhrase);
      setTransactions([]);
      await refreshFinancials();
      showToast('All transactions cleared successfully', 'success');
    } catch (err) {
      console.error('Failed to clear transactions:', err);
      showToast('Failed to clear transactions', 'error');
    }
  }, [refreshFinancials, showToast]);

  const addAccount = useCallback(async (account: Omit<Account, 'id'>) => {
    try {
      const newAccount = await api.createAccount(account);
      setAccounts(prev => [...prev, newAccount]);
      showToast('Account added', 'success');
    } catch (err) {
      console.error('Failed to add account:', err);
      showToast('Failed to add account', 'error');
    }
  }, [showToast]);

  const updateAccount = useCallback(async (id: string, updatedData: Partial<Account>) => {
    try {
      const updatedAccount = await api.updateAccount(id, updatedData);
      setAccounts(prev => prev.map(acc => acc.id === id ? updatedAccount : acc));
      showToast('Account updated', 'success');
    } catch (err) {
      console.error('Failed to update account:', err);
      showToast('Failed to update account', 'error');
    }
  }, [showToast]);

  const deleteAccount = useCallback(async (id: string) => {
    try {
      await api.deleteAccount(id);
      setAccounts(prev => prev.filter(acc => acc.id !== id));
      showToast('Account deleted', 'success');
    } catch (err: any) {
      console.error('Failed to delete account:', err);
      const message = err.message?.includes('Foreign key constraint')
        ? 'This account is in use and cannot be deleted.'
        : (err.message || 'Failed to delete account');
      showToast(message, 'error');
    }
  }, [showToast]);

  const addCategory = useCallback(async (category: Omit<Category, 'id'>) => {
    try {
      const newCategory = await api.createCategory(category);
      setCategories(prev => [...prev, newCategory]);
      showToast('Category added', 'success');
    } catch (err) {
      console.error('Failed to add category:', err);
      showToast('Failed to add category', 'error');
    }
  }, [showToast]);

  const updateCategory = useCallback(async (id: string, updatedData: Partial<Category>) => {
    try {
      const updatedCategory = await api.updateCategory(id, updatedData);
      setCategories(prev => prev.map(cat => cat.id === id ? updatedCategory : cat));
      showToast('Category updated', 'success');
    } catch (err) {
      console.error('Failed to update category:', err);
      showToast('Failed to update category', 'error');
    }
  }, [showToast]);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      await api.deleteCategory(id);
      setCategories(prev => prev.filter(cat => cat.id !== id));
      showToast('Category deleted', 'success');
    } catch (err: any) {
      console.error('Failed to delete category:', err);
      const message = err.message?.includes('Foreign key constraint')
        ? 'This category is in use and cannot be deleted.'
        : (err.message || 'Failed to delete category');
      showToast(message, 'error');
    }
  }, [showToast]);

  const setBudget = useCallback(async (budget: Budget) => {
    try {
      const newBudget = await api.createBudget(budget);
      setBudgets(prev => {
        const existing = prev.find(b => b.id === newBudget.id || b.categoryId === newBudget.categoryId);
        if (existing) {
          return prev.map(b => (b.id === existing.id ? newBudget : b));
        }
        return [...prev, newBudget];
      });
      showToast('Budget saved', 'success');
    } catch (err) {
      console.error('Failed to set budget:', err);
      showToast('Failed to set budget', 'error');
    }
  }, [showToast]);

  const deleteBudget = useCallback(async (id: string) => {
    try {
      await api.deleteBudget(id);
      setBudgets(prev => prev.filter(b => b.id !== id));
      showToast('Budget deleted', 'success');
    } catch (err) {
      console.error('Failed to delete budget:', err);
      showToast('Failed to delete budget', 'error');
    }
  }, [showToast]);

  const addRecurring = useCallback(async (rule: Partial<RecurringRule>) => {
    try {
      await api.createRecurring(rule);
      // Due occurrences are materialized server-side on the next initial-data
      // fetch, so refresh everything to pick up any generated transactions.
      await fetchData();
      showToast('Recurring rule added', 'success');
    } catch (err: any) {
      console.error('Failed to add recurring rule:', err);
      showToast(err.message || 'Failed to add recurring rule', 'error');
    }
  }, [fetchData, showToast]);

  const updateRecurring = useCallback(async (id: string, updatedData: Partial<RecurringRule>) => {
    try {
      await api.updateRecurring(id, updatedData);
      await fetchData();
      showToast('Recurring rule updated', 'success');
    } catch (err: any) {
      console.error('Failed to update recurring rule:', err);
      showToast(err.message || 'Failed to update recurring rule', 'error');
    }
  }, [fetchData, showToast]);

  const deleteRecurring = useCallback(async (id: string) => {
    try {
      await api.deleteRecurring(id);
      setRecurring(prev => prev.filter(r => r.id !== id));
      showToast('Recurring rule deleted', 'success');
    } catch (err: any) {
      console.error('Failed to delete recurring rule:', err);
      showToast(err.message || 'Failed to delete recurring rule', 'error');
    }
  }, [showToast]);

  const runRecurring = useCallback(async (id: string) => {
    try {
      await api.runRecurring(id);
      await fetchData();
      showToast('Recurring rule executed manually', 'success');
    } catch (err: any) {
      console.error('Failed to manually execute recurring rule:', err);
      showToast(err.message || 'Failed to execute recurring rule', 'error');
    }
  }, [fetchData, showToast]);

  const appContextValue = useMemo(() => ({
    accounts,
    categories,
    transactions,
    budgets,
    recurring,
    currency,
    setCurrency,
    theme,
    setTheme,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    bulkDeleteTransactions,
    addAccount,
    updateAccount,
    deleteAccount,
    addCategory,
    updateCategory,
    deleteCategory,
    setBudget,
    deleteBudget,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    runRecurring,
    clearAllTransactions,
    setActivePage,
    refreshData: fetchData,
    user,
  }), [accounts, categories, transactions, budgets, recurring, currency, setCurrency, theme, setTheme, addTransaction, updateTransaction, deleteTransaction, bulkDeleteTransactions, clearAllTransactions, addAccount, updateAccount, deleteAccount, addCategory, updateCategory, deleteCategory, setBudget, deleteBudget, addRecurring, updateRecurring, deleteRecurring, runRecurring, setActivePage, fetchData, user]);

  // Auth handlers
  const handleAuthSuccess = () => {
    // Use flushSync to ensure all state updates happen synchronously
    flushSync(() => {
      applyStoredUser();
      setIsAuthenticated(true);
    });
    navigate('/');
  };

  const handleLogout = () => {
    authService.logout();
    // Use flushSync to ensure all state updates happen synchronously
    flushSync(() => {
      setIsAuthenticated(false);
      setUser(null);
      setNeedsProfileCompletion(false);
      setTransactions([]);
      setAccounts([]);
      setCategories([]);
      setBudgets([]);
      setRecurring([]);
    });
    navigate('/');
  };

  // Show auth views if not authenticated
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={
          <Login
            onSuccess={handleAuthSuccess}
            onBackToLanding={() => navigate('/')}
            onSwitchToSignup={() => navigate('/signup')}
            onForgotPassword={() => navigate('/forgot-password')}
          />
        } />
        <Route path="/signup" element={
          <Signup
            onSuccess={handleAuthSuccess}
            onBackToLanding={() => navigate('/')}
            onSwitchToLogin={() => navigate('/login')}
          />
        } />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword onBackToLogin={() => navigate('/login')} />} />
        <Route path="/reset-password" element={<ResetPassword onSuccess={() => navigate('/login')} />} />
        <Route path="/" element={
          <LandingPage
            onLoginClick={() => navigate('/login')}
            onSignupClick={() => navigate('/signup')}
          />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // If authenticated but user data not loaded yet, show loading
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If authenticated but needs profile completion, show profile completion screen
  if (needsProfileCompletion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Back to Home Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors"
          >
            <span className="text-xl">←</span>
            Back to Home
          </button>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-100 dark:border-gray-700">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Complete Your Profile
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Please provide a few more details to continue
              </p>
            </div>
            <ProfileCompletion
              onComplete={() => {
                // Refresh user data and clear profile completion flag
                const updatedUser = authService.getUser();
                if (updatedUser?.profileComplete) {
                  setUser(updatedUser);
                  setNeedsProfileCompletion(false);
                }
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  const pageContent = (isLoading && transactions.length === 0 && accounts.length === 0) ? (
    <div className="space-y-6 animate-pulse" aria-label="Loading">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-700"></div>
        <div className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-700"></div>
        <div className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-700"></div>
      </div>
      <div className="h-72 rounded-2xl bg-gray-200 dark:bg-gray-700"></div>
      <div className="h-48 rounded-2xl bg-gray-200 dark:bg-gray-700"></div>
    </div>
  ) : error ? (
    <div className="flex flex-col items-center justify-center h-full text-red-500">
      <Icon name="AlertTriangle" size={48} className="mb-4" />
      <p className="text-lg">{error}</p>
      <button onClick={fetchData} className="mt-4 btn btn-primary">Retry</button>
    </div>
  ) : (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/transactions" element={<TransactionsPage />} />
      <Route path="/recurring" element={<Recurring />} />
      <Route path="/budgets" element={<Budgets />} />
      <Route path="/accounts" element={<Accounts />} />
      <Route path="/categories" element={<Categories />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

  return (
    <AppContext.Provider value={appContextValue}>
      <div className="bg-gray-light font-sans text-gray-darkest min-h-screen dark:bg-gray-900 dark:text-gray-100">
        <div className="flex">
          <Sidebar
            activePage={activePage}
            setActivePage={setActivePage}
            isCollapsed={isSidebarCollapsed}
            setCollapsed={setIsSidebarCollapsed}
            theme={theme}
            setTheme={setTheme}
            onLogout={handleLogout}
          />
          <main className={`flex-1 min-w-0 relative z-0 transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
            <div className="min-h-screen flex flex-col">
              <Header pageTitle={activePage} onNewTransaction={() => setIsModalOpen(true)} />
              <div key={activePage} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 page-enter">
                {pageContent}
              </div>
            </div>
          </main>
        </div>
        <NewTransactionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    </AppContext.Provider>
  );
};

export default App;
