/*
  Warnings:

  - You are about to drop the column `care_password` on the `care_settings` table. All the data in the column will be lost.
  - You are about to drop the `message_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `walk_missions` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `date` on table `care_logs` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "message_logs" DROP CONSTRAINT "message_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "walk_missions" DROP CONSTRAINT "walk_missions_care_log_id_fkey";

-- AlterTable
ALTER TABLE "care_logs" ADD COLUMN     "walk_result" BOOLEAN,
ADD COLUMN     "walk_total_distance_m" INTEGER,
ALTER COLUMN "date" SET NOT NULL,
ALTER COLUMN "date" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "care_settings" DROP COLUMN "care_password",
ADD COLUMN     "care_pin" TEXT;

-- DropTable
DROP TABLE "message_logs";

-- DropTable
DROP TABLE "walk_missions";
