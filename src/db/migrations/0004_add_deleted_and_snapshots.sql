ALTER TABLE `projects` ADD `deleted_at` integer;
--> statement-breakpoint
ALTER TABLE `projects` ADD `snapshot_of` text;
--> statement-breakpoint
ALTER TABLE `nodes` ADD `deleted_at` integer;
