CREATE TABLE `announcement` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`locale` text DEFAULT '' NOT NULL,
	`kind` text DEFAULT 'notice' NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`start_at` integer,
	`end_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);--> statement-breakpoint
CREATE INDEX `idx_announcement_status_sort` ON `announcement` (`status`,`sort`);--> statement-breakpoint
CREATE INDEX `idx_announcement_created_at` ON `announcement` (`created_at`);
--> statement-breakpoint
INSERT INTO `announcement` (`id`,`title`,`content`,`locale`,`kind`,`status`,`sort`)
SELECT lower(hex(randomblob(16))), '', j.value, l.locale, 'banner', 'published', j.key
FROM `config` c, (SELECT 'zh' AS locale UNION ALL SELECT 'en') l, json_each(json_extract(c.value, '$.' || l.locale)) j
WHERE c.name = 'top_banner_items' AND json_valid(c.value)
  AND EXISTS (SELECT 1 FROM `config` e WHERE e.name = 'top_banner_enabled' AND e.value = 'true');
--> statement-breakpoint
DELETE FROM `config` WHERE `name` IN ('top_banner_enabled','top_banner_items','top_banner_stay_duration','top_banner_scroll_duration');
