ALTER TABLE `crawler_log` ADD `is_verified` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `crawler_log` ADD `is_content` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_crawler_log_is_verified` ON `crawler_log` (`is_verified`);--> statement-breakpoint
CREATE INDEX `idx_crawler_log_is_content` ON `crawler_log` (`is_content`);
