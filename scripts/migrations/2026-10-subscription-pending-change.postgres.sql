-- Scheduled plan change (end-of-period downgrade) on subscription.
ALTER TABLE "subscription" ADD COLUMN "pending_product_id" text;
ALTER TABLE "subscription" ADD COLUMN "pending_effective_at" timestamp;
ALTER TABLE "subscription" ADD COLUMN "pending_change_type" text;
ALTER TABLE "subscription" ADD COLUMN "provider_schedule_id" text;
