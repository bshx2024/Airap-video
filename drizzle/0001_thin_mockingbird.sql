CREATE TABLE `crawler_log` (
	`id` text PRIMARY KEY NOT NULL,
	`ip` text DEFAULT '' NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`method` text DEFAULT 'GET' NOT NULL,
	`path` text DEFAULT '' NOT NULL,
	`status_code` integer DEFAULT 200 NOT NULL,
	`bot_type` text DEFAULT 'other' NOT NULL,
	`user_agent` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_crawler_log_created_at` ON `crawler_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_crawler_log_bot_type` ON `crawler_log` (`bot_type`);--> statement-breakpoint
ALTER TABLE `user` ADD `first_landing` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `first_touch_at` integer;--> statement-breakpoint
ALTER TABLE `user` ADD `last_source` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `last_medium` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `last_campaign` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `device` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `os` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `browser` text DEFAULT '' NOT NULL;