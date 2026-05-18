DROP INDEX IF EXISTS "users_firebase_uid_key";

ALTER TABLE "users" DROP COLUMN IF EXISTS "firebase_uid";
