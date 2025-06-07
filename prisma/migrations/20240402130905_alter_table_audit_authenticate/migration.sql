-- AlterTable
ALTER TABLE "audit_authenticate" ALTER COLUMN "ip_address" DROP NOT NULL,
ALTER COLUMN "remote_port" DROP NOT NULL,
ALTER COLUMN "browser" DROP NOT NULL;
