-- Scheduled plan change (end-of-period downgrade) on subscription.
ALTER TABLE `subscription` ADD `pending_product_id` varchar(191);
ALTER TABLE `subscription` ADD `pending_effective_at` timestamp NULL;
ALTER TABLE `subscription` ADD `pending_change_type` varchar(50);
ALTER TABLE `subscription` ADD `provider_schedule_id` varchar(191);
