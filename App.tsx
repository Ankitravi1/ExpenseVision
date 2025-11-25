
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
import { mockAccounts, mockCategories, mockTransactions, mockBudgets } from './data/mockData';
import { Account, Budget, Category, Transaction, Page, TransactionType } from './types';
import { NewTransactionModal } from './components/NewTransactionModal';

export const AppContext = React.createContext<{
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
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
  setActivePage: (page: Page) => void;
} | null>(null);

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('Dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

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
    setActivePage
  }), [accounts, categories, transactions, budgets, addTransaction, updateTransaction, deleteTransaction,
    addAccount, updateAccount, deleteAccount, addCategory, updateCategory, deleteCategory,
    setBudget, deleteBudget]);

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
