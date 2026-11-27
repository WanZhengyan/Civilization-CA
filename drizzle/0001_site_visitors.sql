CREATE TABLE `site_visitors` (
	`browser_hash` text PRIMARY KEY NOT NULL,
	`last_day` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `site_visitors_last_day` ON `site_visitors` (`last_day`);