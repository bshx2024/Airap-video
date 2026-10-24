-- Agent API: attribution columns + account type on user, refund columns on
-- order, admin key type/expiry on apikey, and the admin_execution journal.
ALTER TABLE `user` ADD `utm_campaign` text DEFAULT '' NOT NULL;
ALTER TABLE `user` ADD `utm_term` text DEFAULT '' NOT NULL;
ALTER TABLE `user` ADD `utm_medium` text DEFAULT '' NOT NULL;
ALTER TABLE `user` ADD `utm_content` text DEFAULT '' NOT NULL;
ALTER TABLE `user` ADD `referrer` text DEFAULT '' NOT NULL;
ALTER TABLE `user` ADD `country` text DEFAULT '' NOT NULL;
ALTER TABLE `user` ADD `type` text DEFAULT 'user' NOT NULL;
ALTER TABLE `order` ADD `refund_amount` integer;
ALTER TABLE `order` ADD `refunded_at` integer;
ALTER TABLE `order` ADD `refund_result` text;
ALTER TABLE `apikey` ADD `type` text DEFAULT 'user' NOT NULL;
ALTER TABLE `apikey` ADD `expires_at` integer;
CREATE TABLE IF NOT EXISTS `admin_execution` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `token_id` text,
  `operation` text NOT NULL,
  `input_hash` text NOT NULL,
  `target_id` text,
  `status` text NOT NULL,
  `response` text,
  `created_at` integer NOT NULL,
  `completed_at` integer
);
CREATE INDEX IF NOT EXISTS `idx_admin_execution_created` ON `admin_execution` (`created_at`);
