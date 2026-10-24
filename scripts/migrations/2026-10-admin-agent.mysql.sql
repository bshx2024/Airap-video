-- Agent API: attribution columns + account type on user, refund columns on
-- order, admin key type/expiry on apikey, and the admin_execution journal.
ALTER TABLE `user` ADD `utm_campaign` varchar(100) NOT NULL DEFAULT '';
ALTER TABLE `user` ADD `utm_term` varchar(100) NOT NULL DEFAULT '';
ALTER TABLE `user` ADD `utm_medium` varchar(100) NOT NULL DEFAULT '';
ALTER TABLE `user` ADD `utm_content` varchar(100) NOT NULL DEFAULT '';
ALTER TABLE `user` ADD `referrer` varchar(500) NOT NULL DEFAULT '';
ALTER TABLE `user` ADD `country` varchar(10) NOT NULL DEFAULT '';
ALTER TABLE `user` ADD `type` varchar(20) NOT NULL DEFAULT 'user';
ALTER TABLE `order` ADD `refund_amount` int;
ALTER TABLE `order` ADD `refunded_at` timestamp NULL;
ALTER TABLE `order` ADD `refund_result` text;
ALTER TABLE `apikey` ADD `type` varchar(20) NOT NULL DEFAULT 'user';
ALTER TABLE `apikey` ADD `expires_at` timestamp NULL;
CREATE TABLE IF NOT EXISTS `admin_execution` (
  `id` varchar(191) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `token_id` varchar(191),
  `operation` varchar(191) NOT NULL,
  `input_hash` varchar(191) NOT NULL,
  `target_id` varchar(191),
  `status` varchar(191) NOT NULL,
  `response` longtext,
  `created_at` timestamp NOT NULL,
  `completed_at` timestamp NULL,
  PRIMARY KEY (`id`),
  KEY `idx_admin_execution_created` (`created_at`)
);
