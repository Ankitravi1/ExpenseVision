import { prisma } from './lib/prisma';

async function main() {
    const email = process.argv[2];
    if (!email) {
        console.error('Please specify the user email to promote, e.g. npm run promote-admin user@example.com');
        process.exit(1);
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() }
        });

        if (!user) {
            console.error(`User with email "${email}" not found.`);
            process.exit(1);
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { role: 'superadmin' }
        });

        console.log(`Successfully promoted "${email}" to superadmin.`);
    } catch (e: any) {
        console.error('Failed to promote user:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
