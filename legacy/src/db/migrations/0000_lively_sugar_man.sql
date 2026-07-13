CREATE TABLE `edges` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`target_id` text NOT NULL,
	`label` text
);
--> statement-breakpoint
CREATE TABLE `nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`x_position` real NOT NULL,
	`y_position` real NOT NULL,
	`node_type` text NOT NULL
);
