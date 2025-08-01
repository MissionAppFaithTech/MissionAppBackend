/*
  Warnings:

  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `password_digest` on the `users` table. All the data in the column will be lost.
  - The `id` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `authentication_audit` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[public_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `password_hash` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone_number` to the `users` table without a default value. This is not possible if the table is not empty.
  - The required column `public_id` was added to the `users` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `user_role` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."AuthenticationStatus" AS ENUM ('SUCCESS', 'USER_NOT_EXISTS', 'INCORRECT_PASSWORD', 'BLOCKED');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'MISSIONARY', 'NORMAL_USER');

-- DropForeignKey
ALTER TABLE "public"."authentication_audit" DROP CONSTRAINT "authentication_audit_user_id_fkey";

-- AlterTable
ALTER TABLE "public"."users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "password_digest",
ADD COLUMN     "biography" TEXT,
ADD COLUMN     "faith_community_id" INTEGER,
ADD COLUMN     "password_hash" TEXT NOT NULL,
ADD COLUMN     "phone_number" TEXT NOT NULL,
ADD COLUMN     "profile_picture" TEXT,
ADD COLUMN     "public_id" TEXT NOT NULL,
ADD COLUMN     "user_role" "public"."UserRole" NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "public"."authentication_audit";

-- DropEnum
DROP TYPE "public"."AUTHENTICATION_STATUS";

-- CreateTable
CREATE TABLE "public"."authentication_audits" (
    "id" SERIAL NOT NULL,
    "ip_address" TEXT,
    "remote_port" TEXT,
    "browser" TEXT,
    "status" "public"."AuthenticationStatus" NOT NULL,
    "userId" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authentication_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."missionaries" (
    "id" SERIAL NOT NULL,
    "public_email" TEXT,
    "public_phone" TEXT,
    "missionaryAgencyId" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "missionaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."followers" (
    "follower_id" INTEGER NOT NULL,
    "following_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "followers_pkey" PRIMARY KEY ("follower_id","following_id")
);

-- CreateTable
CREATE TABLE "public"."faith_communities" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER,

    CONSTRAINT "faith_communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."missionary_agencies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "missionary_agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pastors" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "faithCommunityId" INTEGER NOT NULL,

    CONSTRAINT "pastors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."posts" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "highlight_link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "missionary_id" INTEGER NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."post_images" (
    "id" SERIAL NOT NULL,
    "imageURL" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "post_id" INTEGER NOT NULL,

    CONSTRAINT "post_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "missionaries_user_id_key" ON "public"."missionaries"("user_id");

-- CreateIndex
CREATE INDEX "followers_following_id_idx" ON "public"."followers"("following_id");

-- CreateIndex
CREATE INDEX "followers_follower_id_idx" ON "public"."followers"("follower_id");

-- CreateIndex
CREATE INDEX "posts_missionary_id_created_at_idx" ON "public"."posts"("missionary_id", "created_at");

-- CreateIndex
CREATE INDEX "post_images_post_id_idx" ON "public"."post_images"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_public_id_key" ON "public"."users"("public_id");

-- AddForeignKey
ALTER TABLE "public"."authentication_audits" ADD CONSTRAINT "authentication_audits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_faith_community_id_fkey" FOREIGN KEY ("faith_community_id") REFERENCES "public"."faith_communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."missionaries" ADD CONSTRAINT "missionaries_missionaryAgencyId_fkey" FOREIGN KEY ("missionaryAgencyId") REFERENCES "public"."missionary_agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."missionaries" ADD CONSTRAINT "missionaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."followers" ADD CONSTRAINT "followers_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."followers" ADD CONSTRAINT "followers_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."faith_communities" ADD CONSTRAINT "faith_communities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pastors" ADD CONSTRAINT "pastors_faithCommunityId_fkey" FOREIGN KEY ("faithCommunityId") REFERENCES "public"."faith_communities"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."posts" ADD CONSTRAINT "posts_missionary_id_fkey" FOREIGN KEY ("missionary_id") REFERENCES "public"."missionaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."post_images" ADD CONSTRAINT "post_images_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
