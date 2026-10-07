CREATE TABLE `catalog_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `library` (
	`user_id` text NOT NULL,
	`game_id` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`rating` integer,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `game_id`)
);
--> statement-breakpoint
CREATE INDEX `library_user_idx` ON `library` (`user_id`);--> statement-breakpoint
CREATE TABLE `list_games` (
	`list_id` text NOT NULL,
	`game_id` text NOT NULL,
	PRIMARY KEY(`list_id`, `game_id`)
);
--> statement-breakpoint
CREATE TABLE `lists` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `lists_user_idx` ON `lists` (`user_id`);--> statement-breakpoint
CREATE TABLE `view_visits` (
	`game_id` text NOT NULL,
	`viewer` text NOT NULL,
	`day` text NOT NULL,
	PRIMARY KEY(`game_id`, `viewer`, `day`)
);
--> statement-breakpoint
CREATE TABLE `game_views` (
	`game_id` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
