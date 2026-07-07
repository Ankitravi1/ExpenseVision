import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Renaming Transaction.description to note...");
    await prisma.$executeRawUnsafe(`ALTER TABLE "Transaction" RENAME COLUMN "description" TO "note"`);
    
    console.log("Renaming RecurringRule.description to note...");
    await prisma.$executeRawUnsafe(`ALTER TABLE "RecurringRule" RENAME COLUMN "description" TO "note"`);
    
    console.log("Dropping Transaction.notes...");
    await prisma.$executeRawUnsafe(`ALTER TABLE "Transaction" DROP COLUMN "notes"`);
    
    console.log("Migration complete!");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
