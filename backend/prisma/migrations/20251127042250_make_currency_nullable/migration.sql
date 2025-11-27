-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "currency" TEXT,
    "googleId" TEXT,
    "profilePicture" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "resetPasswordToken" TEXT,
    "resetPasswordExpires" DATETIME,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "onboardingStage" INTEGER NOT NULL DEFAULT 1,
    "profileComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("country", "createdAt", "currency", "email", "emailVerified", "googleId", "id", "name", "onboardingStage", "password", "profileComplete", "profilePicture", "resetPasswordExpires", "resetPasswordToken", "twoFactorEnabled", "twoFactorSecret", "updatedAt", "verificationToken") SELECT "country", "createdAt", "currency", "email", "emailVerified", "googleId", "id", "name", "onboardingStage", "password", "profileComplete", "profilePicture", "resetPasswordExpires", "resetPasswordToken", "twoFactorEnabled", "twoFactorSecret", "updatedAt", "verificationToken" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
