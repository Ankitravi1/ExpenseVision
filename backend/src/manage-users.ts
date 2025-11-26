import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (command === 'list') {
        const users = await prisma.user.findMany();
        console.log('--- User List ---');
        if (users.length === 0) {
            console.log('No users found.');
        } else {
            users.forEach(user => {
                console.log(`ID: ${user.id}`);
                console.log(`Name: ${user.name}`);
                console.log(`Email: ${user.email}`);
                console.log(`Google ID: ${user.googleId || 'N/A'}`);
                console.log('-----------------');
            });
        }
    } else if (command === 'delete') {
        const email = args[1];
        if (!email) {
            console.error('Please provide an email to delete.');
            process.exit(1);
        }

        try {
            const user = await prisma.user.delete({
                where: { email },
            });
            console.log(`User deleted: ${user.email} (${user.name})`);
        } catch (error) {
            console.error(`Failed to delete user with email ${email}. User may not exist.`);
        }
    } else {
        console.log('Usage:');
        console.log('  npx tsx src/manage-users.ts list');
        console.log('  npx tsx src/manage-users.ts delete <email>');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
