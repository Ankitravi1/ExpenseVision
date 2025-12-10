import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { Accounts } from './pages/Accounts';
import { Budgets } from './pages/Budgets';
import { Categories } from './pages/Categories';
import { TransactionsPage } from './pages/TransactionsPage';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { VerifyEmail } from './pages/VerifyEmail';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { ProfileCompletion } from './components/ProfileCompletion';
import { Account, Budget, Category, Transaction, Page, User } from './types';
import { NewTransactionModal } from './components/NewTransactionModal';
import { authService } from './services/auth';
import { api } from './services/api';
import { Icon } from './components/Icon';
import { useToast } from './context/ToastContext';

export const AppContext = React.createContext<{
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  currency: string;
  setCurrency: (currency: string) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addAccount: (account: Omit<Account, 'id'>) => Promise<void>;
  updateAccount: (id: string, account: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  setBudget: (budget: Budget) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  clearAllTransactions: () => void;
  setActivePage: (page: Page) => void;
  refreshData: () => Promise<void>;
  user: User | null;
} | null>(null);

const App: React.FC = () => {
  const { showToast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  const [authView, setAuthView] = useState<'landing' | 'login' | 'signup' | 'verify-email' | 'forgot-password' | 'reset-password'>('landing');
  const [activePage, setActivePage] = useState<Page>('Dashboard');
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    // Check URL for verification token or reset token
    if (window.location.pathname === '/verify-email') {
      setAuthView('verify-email');
    } else if (window.location.pathname === '/reset-password') {
      setAuthView('reset-password');
    }
  }, []);

  // Initialize user data on mount if already authenticated
  useEffect(() => {
    if (isAuthenticated && !user) {
      const storedUser = authService.getUser();
      if (storedUser) {
        setUser(storedUser);
        const profileComplete = storedUser.profileComplete === true;
        setNeedsProfileCompletion(!profileComplete);
        if (storedUser.currency) setCurrencyState(storedUser.currency);
        if (storedUser.theme) setThemeState(storedUser.theme as 'light' | 'dark');
      }
    }
  }, [isAuthenticated, user]);

  // Fetch Initial Data
  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getInitialData();
      setTransactions(data.transactions);
      setAccounts(data.accounts);
      setCategories(data.categories);
      setBudgets(data.budgets);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data. Please try refreshing.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      const user = authService.getUser();
      if (user) {
        setUser(user);
        const profileComplete = user.profileComplete === true;
        setNeedsProfileCompletion(!profileComplete);
        if (user.currency) setCurrencyState(user.currency);
        if (user.theme) setThemeState(user.theme as 'light' | 'dark');
      }
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

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
      setTransactions(prev => [newTransaction, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      await fetchData(); // Refresh all data to ensure consistency (accounts, budgets)
    } catch (err) {
      console.error('Failed to add transaction:', err);
      showToast('Failed to add transaction', 'error');
    }
  }, [fetchData, showToast]);

  const updateTransaction = useCallback(async (id: string, updatedData: Partial<Transaction>) => {
    try {
      await api.updateTransaction(id, updatedData);
      await fetchData(); // Refresh all data
    } catch (err) {
      console.error('Failed to update transaction:', err);
      showToast('Failed to update transaction', 'error');
    }
  }, [fetchData, showToast]);

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      await api.deleteTransaction(id);
      await fetchData(); // Refresh all data
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      showToast('Failed to delete transaction', 'error');
    }
  }, [fetchData, showToast]);

  const clearAllTransactions = useCallback(async () => {
    try {
      await api.clearAllTransactions();
      await fetchData();
      showToast('All transactions cleared successfully', 'success');
    } catch (err) {
      console.error('Failed to clear transactions:', err);
      showToast('Failed to clear transactions', 'error');
    }
  }, [fetchData, showToast]);

  const addAccount = useCallback(async (account: Omit<Account, 'id'>) => {
    try {
      const newAccount = await api.createAccount(account);
      setAccounts(prev => [...prev, newAccount]);
      await fetchData();
    } catch (err) {
      console.error('Failed to add account:', err);
      showToast('Failed to add account', 'error');
    }
  }, [showToast, fetchData]);

  const updateAccount = useCallback(async (id: string, updatedData: Partial<Account>) => {
    try {
      const updatedAccount = await api.updateAccount(id, updatedData);
      setAccounts(prev => prev.map(acc => acc.id === id ? updatedAccount : acc));
      await fetchData();
    } catch (err) {
      console.error('Failed to update account:', err);
      showToast('Failed to update account', 'error');
    }
  }, [showToast, fetchData]);

  const deleteAccount = useCallback(async (id: string) => {
    try {
      await api.deleteAccount(id);
      setAccounts(prev => prev.filter(acc => acc.id !== id));
      await fetchData();
    } catch (err: any) {
      console.error('Failed to delete account:', err);
      const message = err.message?.includes('Foreign key constraint')
        ? 'This account is in use and cannot be deleted.'
        : (err.message || 'Failed to delete account');
      showToast(message, 'error');
    }
  }, [showToast, fetchData]);

  const addCategory = useCallback(async (category: Omit<Category, 'id'>) => {
    try {
      const newCategory = await api.createCategory(category);
      setCategories(prev => [...prev, newCategory]);
      await fetchData();
    } catch (err) {
      console.error('Failed to add category:', err);
      showToast('Failed to add category', 'error');
    }
  }, [showToast, fetchData]);

  const updateCategory = useCallback(async (id: string, updatedData: Partial<Category>) => {
    try {
      const updatedCategory = await api.updateCategory(id, updatedData);
      setCategories(prev => prev.map(cat => cat.id === id ? updatedCategory : cat));
      await fetchData();
    } catch (err) {
      console.error('Failed to update category:', err);
      showToast('Failed to update category', 'error');
    }
  }, [showToast, fetchData]);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      await api.deleteCategory(id);
      setCategories(prev => prev.filter(cat => cat.id !== id));
      await fetchData();
    } catch (err: any) {
      console.error('Failed to delete category:', err);
      const message = err.message?.includes('Foreign key constraint')
        ? 'This category is in use and cannot be deleted.'
        : (err.message || 'Failed to delete category');
      showToast(message, 'error');
    }
  }, [showToast, fetchData]);

  const setBudget = useCallback(async (budget: Budget) => {
    try {
      const newBudget = await api.createBudget(budget);
      setBudgets(prev => {
        const existing = prev.find(b => b.categoryId === budget.categoryId);
        if (existing) {
          return prev.map(b => b.categoryId === budget.categoryId ? newBudget : b);
        }
        return [...prev, newBudget];
      });
      await fetchData(); // Refresh to get correct spent amounts if backend calculates it
    } catch (err) {
      console.error('Failed to set budget:', err);
      showToast('Failed to set budget', 'error');
    }
  }, [fetchData, showToast]);

  const deleteBudget = useCallback(async (id: string) => {
    try {
      await api.deleteBudget(id);
      setBudgets(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('Failed to delete budget:', err);
      showToast('Failed to delete budget', 'error');
    }
  }, [showToast]);

  const pageComponent = useMemo(() => {
    if (isLoading && transactions.length === 0 && accounts.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-red-500">
          <Icon name="AlertTriangle" size={48} className="mb-4" />
          <p className="text-lg">{error}</p>
          <button onClick={fetchData} className="mt-4 btn btn-primary">Retry</button>
        </div>
      );
    }

    switch (activePage) {
      case 'Dashboard':
        return <Dashboard />;
      case 'Accounts':
        return <Accounts />;
      case 'Budgets':
        return <Budgets />;
      case 'Categories':
        return <Categories />;
      case 'Transactions':
        return <TransactionsPage />;
      case 'Profile':
        return <Profile />;
      case 'Settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  }, [activePage, isLoading, error, transactions.length, accounts.length, fetchData]);

  const appContextValue = useMemo(() => ({
    accounts,
    categories,
    transactions,
    budgets,
    currency,
    setCurrency,
    theme,
    setTheme,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addAccount,
    updateAccount,
    deleteAccount,
    addCategory,
    updateCategory,
    deleteCategory,
    setBudget,
    deleteBudget,
    clearAllTransactions,
    setActivePage,
    refreshData: fetchData,
    user,
  }), [accounts, categories, transactions, budgets, currency, setCurrency, theme, setTheme, addTransaction, updateTransaction, deleteTransaction, clearAllTransactions, addAccount, updateAccount, deleteAccount, addCategory, updateCategory, deleteCategory, setBudget, deleteBudget, fetchData, user]);

  // Auth handlers
  const handleLoginSuccess = () => {
    // Use flushSync to ensure all state updates happen synchronously
    flushSync(() => {
      // Get user data from authService and update state before setting isAuthenticated
      const user = authService.getUser();
      if (user) {
        setUser(user);
        const profileComplete = user.profileComplete === true;
        setNeedsProfileCompletion(!profileComplete);
        if (user.currency) setCurrencyState(user.currency);
        if (user.theme) setThemeState(user.theme as 'light' | 'dark');
      }
      setIsAuthenticated(true);
      setAuthView('landing');
    });
  };

  const handleSignupSuccess = () => {
    // Use flushSync to ensure all state updates happen synchronously
    flushSync(() => {
      // Get user data from authService and update state before setting isAuthenticated
      const user = authService.getUser();
      if (user) {
        setUser(user);
        const profileComplete = user.profileComplete === true;
        setNeedsProfileCompletion(!profileComplete);
        if (user.currency) setCurrencyState(user.currency);
        if (user.theme) setThemeState(user.theme as 'light' | 'dark');
      }
      setIsAuthenticated(true);
      setAuthView('landing');
    });
  };

  const handleLogout = () => {
    authService.logout();
    // Use flushSync to ensure all state updates happen synchronously
    flushSync(() => {
      setIsAuthenticated(false);
      setAuthView('landing');
      setActivePage('Dashboard');
      setUser(null);
      setNeedsProfileCompletion(false);
      setTransactions([]);
      setAccounts([]);
      setCategories([]);
      setBudgets([]);
    });
  };

  // Show auth views if not authenticated
  if (!isAuthenticated) {
    if (authView === 'login') {
      return (
        <Login
          onSuccess={handleLoginSuccess}
          onBackToLanding={() => setAuthView('landing')}
          onSwitchToSignup={() => setAuthView('signup')}
          onForgotPassword={() => setAuthView('forgot-password')}
        />
      );
    }

    if (authView === 'signup') {
      return (
        <Signup
          onSuccess={handleSignupSuccess}
          onBackToLanding={() => setAuthView('landing')}
          onSwitchToLogin={() => setAuthView('login')}
        />
      );
    }

    if (authView === 'verify-email') {
      return <VerifyEmail />;
    }

    if (authView === 'forgot-password') {
      return <ForgotPassword onBackToLogin={() => setAuthView('login')} />;
    }

    if (authView === 'reset-password') {
      return <ResetPassword onSuccess={() => setAuthView('login')} />;
    }

    return (
      <LandingPage
        onLoginClick={() => setAuthView('login')}
        onSignupClick={() => setAuthView('signup')}
      />
    );
  }

  // If authenticated but user data not loaded yet, show loading
  if (isAuthenticated && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If authenticated but needs profile completion, show profile completion screen
  if (needsProfileCompletion) {
    const user = authService.getUser();
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
                  setNeedsProfileCompletion(false);
                }
              }}
            />
          </div>
        </div>
      </div>
    );
  }

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
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                {pageComponent}
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
