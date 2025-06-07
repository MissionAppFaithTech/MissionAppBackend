-- CreateEnum
CREATE TYPE "AUTHENTICATION_STATUS" AS ENUM ('SUCCESS', 'USER_NOT_EXISTS', 'INCORRECT_PASSWORD', 'BLOCKED');

-- CreateTable
CREATE TABLE "audit_authenticate" (
    "id" SERIAL NOT NULL,
    "ip_address" TEXT NOT NULL,
    "remote_port" TEXT NOT NULL,
    "browser" TEXT NOT NULL,
    "status" "AUTHENTICATION_STATUS" NOT NULL,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_authenticate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "audit_authenticate" ADD CONSTRAINT "audit_authenticate_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
