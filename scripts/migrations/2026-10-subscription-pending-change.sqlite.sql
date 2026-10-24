-- Scheduled plan change (end-of-period downgrade) on subscription.
ALTER TABLE `subscription` ADD `pending_product_id` text;
ALTER TABLE `subscription` ADD `pending_effective_at` integer;
ALTER TABLE `subscription` ADD `pending_change_type` text;
ALTER TABLE `subscription` ADD `provider_schedule_id` text;
