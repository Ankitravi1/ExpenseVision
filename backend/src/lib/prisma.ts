import { PrismaClient } from '@prisma/client';

const prismaClient = new PrismaClient();

// Single shared Prisma client for the whole app
// We use a Prisma extension to automatically convert Decimal types from the DB
// into standard numbers for the frontend to consume, avoiding breaking changes
// while maintaining absolute precision in the database.
export const prisma = prismaClient.$extends({
  result: {
    account: {
      balance: {
        needs: { balance: true },
        compute(account) {
          return account.balance.toNumber();
        },
      },
      initialBalance: {
        needs: { initialBalance: true },
        compute(account) {
          return account.initialBalance.toNumber();
        },
      },
    },
    transaction: {
      amount: {
        needs: { amount: true },
        compute(transaction) {
          return transaction.amount.toNumber();
        },
      },
    },
    budget: {
      amount: {
        needs: { amount: true },
        compute(budget) {
          return budget.amount.toNumber();
        },
      },
      alertThreshold: {
        needs: { alertThreshold: true },
        compute(budget) {
          return budget.alertThreshold.toNumber();
        },
      },
    },
    recurringRule: {
      amount: {
        needs: { amount: true },
        compute(rule) {
          return rule.amount.toNumber();
        },
      },
    },
  },
});
