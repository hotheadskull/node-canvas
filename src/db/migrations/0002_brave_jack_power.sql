CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
ALTER TABLE `edges` ADD `project_id` text REFERENCES projects(id);--> statement-breakpoint
ALTER TABLE `nodes` ADD `project_id` text REFERENCES projects(id);--> statement-breakpoint
ALTER TABLE `nodes` ADD `parent_id` text REFERENCES nodes(id);--> statement-breakpoint
ALTER TABLE `nodes` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `nodes` ADD `updated_at` integer;