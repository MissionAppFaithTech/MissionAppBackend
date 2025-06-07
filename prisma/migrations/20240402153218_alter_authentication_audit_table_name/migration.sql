/*
  Warnings:

  - You are about to drop the `audit_authenticate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "audit_authenticate" DROP CONSTRAINT "audit_authenticate_user_id_fkey";

-- DropTable
DROP TABLE "audit_authenticate";

-- CreateTable
CREATE TABLE "authentication_audit" (
    "id" SERIAL NOT NULL,
    "ip_address" TEXT,
    "remote_port" TEXT,
    "browser" TEXT,
    "status" "AUTHENTICATION_STATUS" NOT NULL,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authentication_audit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "authentication_audit" ADD CONSTRAINT "authentication_audit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
