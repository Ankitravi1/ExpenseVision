
import { Account, Category, Transaction, Budget } from '../types';

export const mockAccounts: Account[] = [
  { id: 'acc1', name: 'Primary Checking', type: 'Checking', balance: 4850.75 },
  { id: 'acc2', name: 'Venture Rewards Card', type: 'Credit Card', balance: -1245.30, logo: 'visa' },
  { id: 'acc3', name: 'High-Yield Savings', type: 'Savings', balance: 15200.00 },
  { id: 'acc4', name: 'Money I\'ve Lent', type: 'Asset', balance: 300.00 },
  { id: 'acc5', name: 'Personal Loans', type: 'Liability', balance: -5000.00 },
  { id: 'acc6', name: 'Cash', type: 'Cash', balance: 250.00 },
];

export const mockCategories: Category[] = [
  // Expense
  { id: 'cat1', name: 'Groceries', type: 'expense', icon: 'ShoppingCart' },
  { id: 'cat2', name: 'Dining Out', type: 'expense', icon: 'Utensils' },
  { id: 'cat3', name: 'Transportation', type: 'expense', icon: 'Bus' },
  { id: 'cat4', name: 'Utilities', type: 'expense', icon: 'Lightbulb' },
  { id: 'cat5', name: 'Rent', type: 'expense', icon: 'Home' },
  { id: 'cat6', name: 'Entertainment', type: 'expense', icon: 'Ticket' },
  { id: 'cat7', name: 'Shopping', type: 'expense', icon: 'ShoppingBag' },
  { id: 'cat8', name: 'Health', type: 'expense', icon: 'HeartPulse' },
  // Income
  { id: 'cat9', name: 'Salary', type: 'income', icon: 'Landmark' },
  { id: 'cat10', name: 'Freelance', type: 'income', icon: 'Briefcase' },
  { id: 'cat11', name: 'Investment', type: 'income', icon: 'TrendingUp' },
];

const today = new Date();
const getDate = (daysAgo: number) => {
    const date = new Date(today);
    date.setDate(today.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
};

export const mockTransactions: Transaction[] = [
  { id: 't1', date: getDate(0), description: 'Trader Joe\'s', amount: 75.50, type: 'expense', categoryId: 'cat1', accountId: 'acc1' },
  { id: 't2', date: getDate(0), description: 'Monthly Paycheck', amount: 2500.00, type: 'income', categoryId: 'cat9', accountId: 'acc1' },
  { id: 't3', date: getDate(1), description: 'Dinner with friends', amount: 112.30, type: 'expense', categoryId: 'cat2', accountId: 'acc2' },
  { id: 't4', date: getDate(3), description: 'Monthly Transit Pass', amount: 55.00, type: 'expense', categoryId: 'cat3', accountId: 'acc1' },
  { id: 't5', date: getDate(3), description: 'Movie Tickets', amount: 32.00, type: 'expense', categoryId: 'cat6', accountId: 'acc2' },
  { id: 't6', date: getDate(5), description: 'Electric Bill', amount: 89.90, type: 'expense', categoryId: 'cat4', accountId: 'acc1' },
  { id: 't7', date: getDate(10), description: 'Amazon Purchase', amount: 145.00, type: 'expense', categoryId: 'cat7', accountId: 'acc2' },
  { id: 't8', date: getDate(12), description: 'Freelance Project', amount: 750.00, type: 'income', categoryId: 'cat10', accountId: 'acc1' },
  { id: 't9', date: getDate(15), description: 'Monthly Rent', amount: 1500.00, type: 'expense', categoryId: 'cat5', accountId: 'acc1' },
  { id: 't10', date: getDate(20), description: 'Pharmacy', amount: 25.60, type: 'expense', categoryId: 'cat8', accountId: 'acc1' },
  { id: 't11', date: getDate(25), description: 'Investment Dividend', amount: 120.00, type: 'income', categoryId: 'cat11', accountId: 'acc3' },
];

export const mockBudgets: Budget[] = [
    { id: 'b1', categoryId: 'cat1', amount: 400, spent: 280.45 },
    { id: 'b2', categoryId: 'cat2', amount: 250, spent: 195.60 },
    { id: 'b3', categoryId: 'cat3', amount: 100, spent: 55.00 },
    { id: 'b4', categoryId: 'cat6', amount: 150, spent: 165.20 }, // Overspent
    { id: 'b5', categoryId: 'cat7', amount: 200, spent: 145.00 },
];
