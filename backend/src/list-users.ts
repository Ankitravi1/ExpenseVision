import { prisma } from './lib/prisma';

async function main() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true
            }
        });
        console.log('--- USER LIST ---');
        console.log(JSON.stringify(users, null, 2));
        console.log('-----------------');
    } catch (e: any) {
        console.error('Failed to list users:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
