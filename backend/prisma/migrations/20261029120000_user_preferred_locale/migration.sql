-- CreateEnum
CREATE TYPE "AppLocale" AS ENUM ('en', 'fr', 'es');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "preferredLocale" "AppLocale";
