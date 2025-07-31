/*
  Warnings:

  - You are about to drop the column `care_pin` on the `care_settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "care_settings" DROP COLUMN "care_pin",
ADD COLUMN     "care_password" TEXT;
