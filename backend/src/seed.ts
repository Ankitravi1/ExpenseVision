import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || 'default-user-123';

async function main() {
    console.log('🌱 Seeding database...');

    // Create default user
    const user = await prisma.user.upsert({
        where: { id: DEFAULT_USER_ID },
        update: {},
        create: {
            id: DEFAULT_USER_ID,
            email: 'user@expensevision.local',
            name: 'Personal User'
        }
    });

    console.log('✅ User created:', user.email);

    // Create accounts
    const accounts = await Promise.all([
        prisma.account.create({
            data: {
                userId: user.id,
                name: 'Primary Checking',
                type: 'Checking',
                balance: 4850.75
            }
        }),
        prisma.account.create({
            data: {
                userId: user.id,
                name: 'Venture Rewards Card',
                type: 'Credit Card',
                balance: -1245.30,
                logo: 'visa'
            }
        }),
        prisma.account.create({
            data: {
                userId: user.id,
                name: 'High-Yield Savings',
                type: 'Savings',
                balance: 15200.00
            }
        }),
        prisma.account.create({
            data: {
                userId: user.id,
                name: 'Money I\'ve Lent',
                type: 'Asset',
                balance: 300.00
            }
        }),
        prisma.account.create({
            data: {
                userId: user.id,
                name: 'Personal Loans',
                type: 'Liability',
                balance: -5000.00
            }
        }),
        prisma.account.create({
            data: {
                userId: user.id,
                name: 'Cash',
                type: 'Cash',
                balance: 250.00
            }
        })
    ]);

    console.log(`✅ Created ${accounts.length} accounts`);

    // Create categories
    const categories = await Promise.all([
        // Expense categories
        prisma.category.create({ data: { userId: user.id, name: 'Groceries', type: 'expense', icon: 'ShoppingCart' } }),
        prisma.category.create({ data: { userId: user.id, name: 'Dining Out', type: 'expense', icon: 'Utensils' } }),
        prisma.category.create({ data: { userId: user.id, name: 'Transportation', type: 'expense', icon: 'Bus' } }),
        prisma.category.create({ data: { userId: user.id, name: 'Utilities', type: 'expense', icon: 'Lightbulb' } }),
        prisma.category.create({ data: { userId: user.id, name: 'Rent', type: 'expense', icon: 'Home' } }),
        prisma.category.create({ data: { userId: user.id, name: 'Entertainment', type: 'expense', icon: 'Ticket' } }),
        prisma.category.create({ data: { userId: user.id, name: 'Shopping', type: 'expense', icon: 'ShoppingBag' } }),
        prisma.category.create({ data: { userId: user.id, name: 'Health', type: 'expense', icon: 'HeartPulse' } }),
        // Income categories
        prisma.category.create({ data: { userId: user.id, name: 'Salary', type: 'income', icon: 'Landmark' } }),
        prisma.category.create({ data: { userId: user.id, name: 'Freelance', type: 'income', icon: 'Briefcase' } }),
        prisma.category.create({ data: { userId: user.id, name: 'Investment', type: 'income', icon: 'TrendingUp' } })
    ]);

    console.log(`✅ Created ${categories.length} categories`);

    // Helper function to get date
    const getDate = (daysAgo: number) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString().split('T')[0];
    };

    // Create transactions (Note: In real app, these would update account balances via API)
    const transactions = await Promise.all([
        prisma.transaction.create({
            data: {
                userId: user.id,
                accountId: accounts[0].id,
                categoryId: categories[0].id,
                amount: 75.50,
                type: 'expense',
                date: getDate(0),
                note: 'Trader Joe\'s'
            }
        }),
        prisma.transaction.create({
            data: {
                userId: user.id,
                accountId: accounts[0].id,
                categoryId: categories[8].id,
                amount: 2500.00,
                type: 'income',
                date: getDate(0),
                note: 'Monthly Paycheck'
            }
        }),
        prisma.transaction.create({
            data: {
                userId: user.id,
                accountId: accounts[1].id,
                categoryId: categories[1].id,
                amount: 112.30,
                type: 'expense',
                date: getDate(1),
                note: 'Dinner with friends'
            }
        }),
        prisma.transaction.create({
            data: {
                userId: user.id,
                accountId: accounts[0].id,
                categoryId: categories[2].id,
                amount: 55.00,
                type: 'expense',
                date: getDate(3),
                note: 'Monthly Transit Pass'
            }
        }),
        prisma.transaction.create({
            data: {
                userId: user.id,
                accountId: accounts[1].id,
                categoryId: categories[5].id,
                amount: 32.00,
                type: 'expense',
                date: getDate(3),
                note: 'Movie Tickets'
            }
        }),
        prisma.transaction.create({
            data: {
                userId: user.id,
                accountId: accounts[0].id,
                categoryId: categories[3].id,
                amount: 89.90,
                type: 'expense',
                date: getDate(5),
                note: 'Electric Bill'
            }
        }),
        prisma.transaction.create({
            data: {
                userId: user.id,
                accountId: accounts[1].id,
                categoryId: categories[6].id,
                amount: 145.00,
                type: 'expense',
                date: getDate(10),
                note: 'Amazon Purchase'
            }
        }),
        prisma.transaction.create({
            data: {
                userId: user.id,
                accountId: accounts[0].id,
                categoryId: categories[9].id,
                amount: 750.00,
                type: 'income',
                date: getDate(12),
                note: 'Freelance Project'
            }
        }),
        prisma.transaction.create({
            data: {
                userId: user.id,
                accountId: accounts[0].id,
                categoryId: categories[4].id,
                amount: 1500.00,
                type: 'expense',
                date: getDate(15),
                note: 'Monthly Rent'
            }
        }),
        prisma.transaction.create({
            data: {
                userId: user.id,
                accountId: accounts[0].id,
                categoryId: categories[7].id,
                amount: 25.60,
                type: 'expense',
                date: getDate(20),
                note: 'Pharmacy'
            }
        }),
        prisma.transaction.create({
            data: {
                userId: user.id,
                accountId: accounts[2].id,
                categoryId: categories[10].id,
                amount: 120.00,
                type: 'income',
                date: getDate(25),
                note: 'Investment Dividend'
            }
        })
    ]);

    console.log(`✅ Created ${transactions.length} transactions`);

    // Create budgets
    const budgets = await Promise.all([
        prisma.budget.create({
            data: {
                userId: user.id,
                categoryId: categories[0].id,
                amount: 400
            }
        }),
        prisma.budget.create({
            data: {
                userId: user.id,
                categoryId: categories[1].id,
                amount: 250
            }
        }),
        prisma.budget.create({
            data: {
                userId: user.id,
                categoryId: categories[2].id,
                amount: 100
            }
        }),
        prisma.budget.create({
            data: {
                userId: user.id,
                categoryId: categories[5].id,
                amount: 150
            }
        }),
        prisma.budget.create({
            data: {
                userId: user.id,
                categoryId: categories[6].id,
                amount: 200
            }
        })
    ]);

    console.log(`✅ Created ${budgets.length} budgets`);
    console.log('🎉 Database seeded successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
