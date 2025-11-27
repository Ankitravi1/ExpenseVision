import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
import { mockAccounts, mockCategories, mockTransactions, mockBudgets } from './data/mockData';
import { Account, Budget, Category, Transaction, Page, TransactionType } from './types';
import { NewTransactionModal } from './components/NewTransactionModal';
import { authService } from './services/auth';

export const AppContext = React.createContext<{
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  currency: string;
  setCurrency: (currency: string) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addAccount: (account: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, account: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  setBudget: (budget: Budget) => void;
  deleteBudget: (id: string) => void;
  clearAllTransactions: () => void;
  setActivePage: (page: Page) => void;
} | null>(null);

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  const [authView, setAuthView] = useState<'landing' | 'login' | 'signup' | 'verify-email' | 'forgot-password' | 'reset-password'>('landing');
  const [activePage, setActivePage] = useState<Page>('Dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currency, setCurrencyState] = useState('INR');
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme as 'light' | 'dark') || 'light';
  });

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

  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [accounts, setAccounts] = useState<Account[]>(mockAccounts);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [budgets, setBudgets] = useState<Budget[]>(mockBudgets);

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

  // Check profile completion status on mount
  useEffect(() => {
    if (isAuthenticated) {
      const user = authService.getUser();
      if (user) {
        // Check profileComplete field from database
        const profileComplete = user.profileComplete === true;
        setNeedsProfileCompletion(!profileComplete);

        // Load user preferences
        if (user.currency) setCurrencyState(user.currency);
        if (user.theme) setThemeState(user.theme as 'light' | 'dark');
      }
    }
  }, [isAuthenticated]);

  const addTransaction = useCallback((transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: `t${Date.now()}`
    };

    setTransactions(prev => [newTransaction, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

    setAccounts(prevAccounts => {
      return prevAccounts.map(acc => {
        // Handle Source Account
        if (acc.id === newTransaction.accountId) {
          let newBalance = acc.balance;
          if (newTransaction.type === 'expense' || newTransaction.type === 'transfer') {
            newBalance -= newTransaction.amount;
          } else if (newTransaction.type === 'income') {
            newBalance += newTransaction.amount;
          }
          return { ...acc, balance: newBalance };
        }
        // Handle Destination Account for Transfers
        if (newTransaction.type === 'transfer' && acc.id === newTransaction.transferToAccountId) {
          return { ...acc, balance: acc.balance + newTransaction.amount };
        }
        return acc;
      });
    });

    // Update budgets if expense
    if (newTransaction.type === 'expense') {
      setBudgets(prevBudgets => prevBudgets.map(b => {
        if (b.categoryId === newTransaction.categoryId) {
          return { ...b, spent: b.spent + newTransaction.amount };
        }
        return b;
      }));
    }

  }, []);

  const updateTransaction = useCallback((id: string, updatedData: Partial<Transaction>) => {
    setTransactions(prev => {
      const oldTransaction = prev.find(t => t.id === id);
      if (!oldTransaction) return prev;

      const newTransaction = { ...oldTransaction, ...updatedData };

      // Reverse old transaction effects
      setAccounts(prevAccounts => {
        return prevAccounts.map(acc => {
          let newBalance = acc.balance;

          // Reverse old source account
          if (acc.id === oldTransaction.accountId) {
            if (oldTransaction.type === 'expense' || oldTransaction.type === 'transfer') {
              newBalance += oldTransaction.amount;
            } else if (oldTransaction.type === 'income') {
              newBalance -= oldTransaction.amount;
            }
          }

          // Reverse old destination account for transfers
          if (oldTransaction.type === 'transfer' && acc.id === oldTransaction.transferToAccountId) {
            newBalance -= oldTransaction.amount;
          }

          // Apply new source account
          if (acc.id === newTransaction.accountId) {
            if (newTransaction.type === 'expense' || newTransaction.type === 'transfer') {
              newBalance -= newTransaction.amount;
            } else if (newTransaction.type === 'income') {
              newBalance += newTransaction.amount;
            }
          }

          // Apply new destination account for transfers
          if (newTransaction.type === 'transfer' && acc.id === newTransaction.transferToAccountId) {
            newBalance += newTransaction.amount;
          }

          return { ...acc, balance: newBalance };
        });
      });

      // Update budgets
      if (oldTransaction.type === 'expense') {
        setBudgets(prevBudgets => prevBudgets.map(b => {
          if (b.categoryId === oldTransaction.categoryId) {
            return { ...b, spent: b.spent - oldTransaction.amount };
          }
          return b;
        }));
      }

      if (newTransaction.type === 'expense') {
        setBudgets(prevBudgets => prevBudgets.map(b => {
          if (b.categoryId === newTransaction.categoryId) {
            return { ...b, spent: b.spent + newTransaction.amount };
          }
          return b;
        }));
      }

      return prev.map(t => t.id === id ? newTransaction : t)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => {
      const transaction = prev.find(t => t.id === id);
      if (!transaction) return prev;

      // Reverse transaction effects on accounts
      setAccounts(prevAccounts => {
        return prevAccounts.map(acc => {
          let newBalance = acc.balance;

          // Reverse source account
          if (acc.id === transaction.accountId) {
            if (transaction.type === 'expense' || transaction.type === 'transfer') {
              newBalance += transaction.amount;
            } else if (transaction.type === 'income') {
              newBalance -= transaction.amount;
            }
          }

          // Reverse destination account for transfers
          if (transaction.type === 'transfer' && acc.id === transaction.transferToAccountId) {
            newBalance -= transaction.amount;
          }

          return { ...acc, balance: newBalance };
        });
      });

      // Reverse budget effects
      if (transaction.type === 'expense') {
        setBudgets(prevBudgets => prevBudgets.map(b => {
          if (b.categoryId === transaction.categoryId) {
            return { ...b, spent: b.spent - transaction.amount };
          }
          return b;
        }));
      }

      return prev.filter(t => t.id !== id);
    });
  }, []);

  const clearAllTransactions = useCallback(() => {
    setTransactions([]);
    // Reset all budget spent amounts to 0
    setBudgets(prev => prev.map(b => ({ ...b, spent: 0 })));
  }, []);

  const addAccount = useCallback((account: Omit<Account, 'id'>) => {
    const newAccount = { ...account, id: `acc${Date.now()}` };
    setAccounts(prev => [...prev, newAccount]);
  }, []);

  const updateAccount = useCallback((id: string, updatedData: Partial<Account>) => {
    setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, ...updatedData } : acc));
  }, []);

  const deleteAccount = useCallback((id: string) => {
    // Check if account has transactions
    const hasTransactions = transactions.some(t =>
      t.accountId === id || t.transferToAccountId === id
    );

    if (hasTransactions) {
      alert('Cannot delete account with existing transactions. Please delete or reassign transactions first.');
      return;
    }

    setAccounts(prev => prev.filter(acc => acc.id !== id));
  }, [transactions]);

  const addCategory = useCallback((category: Omit<Category, 'id'>) => {
    const newCategory = { ...category, id: `cat${Date.now()}` };
    setCategories(prev => [...prev, newCategory]);
  }, []);

  const updateCategory = useCallback((id: string, updatedData: Partial<Category>) => {
    setCategories(prev => prev.map(cat => cat.id === id ? { ...cat, ...updatedData } : cat));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    // Check if category has transactions or budgets
    const hasTransactions = transactions.some(t => t.categoryId === id);
    const hasBudgets = budgets.some(b => b.categoryId === id);

    if (hasTransactions || hasBudgets) {
      alert('Cannot delete category with existing transactions or budgets. Please delete or reassign them first.');
      return;
    }

    setCategories(prev => prev.filter(cat => cat.id !== id));
  }, [transactions, budgets]);

  const setBudget = useCallback((budget: Budget) => {
    setBudgets(prev => {
      const existing = prev.find(b => b.categoryId === budget.categoryId);
      if (existing) {
        return prev.map(b => b.categoryId === budget.categoryId ? { ...b, amount: budget.amount } : b);
      }
      return [...prev, { ...budget, id: `b${Date.now()}`, spent: 0 }]; // Logic to calculate spent for existing transactions could be added here
    });
  }, []);

  const deleteBudget = useCallback((id: string) => {
    setBudgets(prev => prev.filter(b => b.id !== id));
  }, []);

  const pageComponent = useMemo(() => {
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
  }, [activePage]);

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
  }), [accounts, categories, transactions, budgets, currency, setCurrency, theme, setTheme, addTransaction, updateTransaction, deleteTransaction, clearAllTransactions, addAccount, updateAccount, deleteAccount, addCategory, updateCategory, deleteCategory, setBudget, deleteBudget]);

  // Auth handlers
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setAuthView('landing');
  };

  const handleSignupSuccess = () => {
    setIsAuthenticated(true);
    setAuthView('landing');
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setAuthView('landing');
    setActivePage('Dashboard');
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
