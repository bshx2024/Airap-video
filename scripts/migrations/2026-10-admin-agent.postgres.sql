-- Agent API: attribution columns + account type on user, refund columns on
-- order, admin key type/expiry on apikey, and the admin_execution journal.
ALTER TABLE "user" ADD COLUMN "utm_campaign" text DEFAULT '' NOT NULL;
ALTER TABLE "user" ADD COLUMN "utm_term" text DEFAULT '' NOT NULL;
ALTER TABLE "user" ADD COLUMN "utm_medium" text DEFAULT '' NOT NULL;
ALTER TABLE "user" ADD COLUMN "utm_content" text DEFAULT '' NOT NULL;
ALTER TABLE "user" ADD COLUMN "referrer" text DEFAULT '' NOT NULL;
ALTER TABLE "user" ADD COLUMN "country" text DEFAULT '' NOT NULL;
ALTER TABLE "user" ADD COLUMN "type" text DEFAULT 'user' NOT NULL;
ALTER TABLE "order" ADD COLUMN "refund_amount" integer;
ALTER TABLE "order" ADD COLUMN "refunded_at" timestamp;
ALTER TABLE "order" ADD COLUMN "refund_result" text;
ALTER TABLE "apikey" ADD COLUMN "type" text DEFAULT 'user' NOT NULL;
ALTER TABLE "apikey" ADD COLUMN "expires_at" timestamp;
CREATE TABLE IF NOT EXISTS "admin_execution" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "token_id" text,
  "operation" text NOT NULL,
  "input_hash" text NOT NULL,
  "target_id" text,
  "status" text NOT NULL,
  "response" text,
  "created_at" timestamp NOT NULL,
  "completed_at" timestamp
);
CREATE INDEX IF NOT EXISTS "idx_admin_execution_created" ON "admin_execution" ("created_at");
