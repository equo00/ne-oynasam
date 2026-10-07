CREATE TABLE `catalog_bootstrap` (
	`id` text PRIMARY KEY NOT NULL,
	`stage` text NOT NULL,
	`cursor` text DEFAULT '0' NOT NULL,
	`processed` integer DEFAULT 0 NOT NULL,
	`lease_token` text,
	`lease_until` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `catalog_editions` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`edition_key` text NOT NULL,
	`platform` text,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_editions_identity_idx` ON `catalog_editions` (`game_id`,`edition_key`);--> statement-breakpoint
CREATE INDEX `catalog_editions_game_idx` ON `catalog_editions` (`game_id`);--> statement-breakpoint
CREATE TABLE `catalog_game_genres` (
	`game_id` text NOT NULL,
	`genre_id` text NOT NULL,
	PRIMARY KEY(`game_id`, `genre_id`)
);
--> statement-breakpoint
CREATE INDEX `catalog_game_genres_filter_idx` ON `catalog_game_genres` (`genre_id`,`game_id`);--> statement-breakpoint
CREATE TABLE `catalog_game_platforms` (
	`game_id` text NOT NULL,
	`platform` text NOT NULL,
	PRIMARY KEY(`game_id`, `platform`)
);
--> statement-breakpoint
CREATE INDEX `catalog_game_platforms_filter_idx` ON `catalog_game_platforms` (`platform`,`game_id`);--> statement-breakpoint
CREATE TABLE `catalog_game_systems` (
	`game_id` text NOT NULL,
	`system` text NOT NULL,
	PRIMARY KEY(`game_id`, `system`)
);
--> statement-breakpoint
CREATE INDEX `catalog_game_systems_filter_idx` ON `catalog_game_systems` (`system`,`game_id`);--> statement-breakpoint
CREATE TABLE `catalog_game_tags` (
	`game_id` text NOT NULL,
	`tag_id` integer NOT NULL,
	`weight` real,
	`rank` integer NOT NULL,
	PRIMARY KEY(`game_id`, `tag_id`)
);
--> statement-breakpoint
CREATE INDEX `catalog_game_tags_filter_idx` ON `catalog_game_tags` (`tag_id`,`game_id`);--> statement-breakpoint
CREATE TABLE `catalog_games` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`name` text NOT NULL,
	`name_search` text NOT NULL,
	`year` integer,
	`steam_app_id` integer,
	`studio` text DEFAULT '' NOT NULL,
	`payload` text NOT NULL,
	`content_hash` text NOT NULL,
	`score_value` real,
	`score_count` integer,
	`score_date` text,
	`score_platform` text,
	`catalog_added_at` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`source_priority` integer DEFAULT 10 NOT NULL,
	`updated_at` text NOT NULL,
	`mood` text,
	`steam_positive_percent` real,
	`has_turkish` integer,
	`has_coop` integer,
	`cover_present` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_games_steam_idx` ON `catalog_games` (`steam_app_id`);--> statement-breakpoint
CREATE INDEX `catalog_games_status_order_idx` ON `catalog_games` (`status`,`sort_order`,`id`);--> statement-breakpoint
CREATE INDEX `catalog_games_name_idx` ON `catalog_games` (`status`,`name_search`,`id`);--> statement-breakpoint
CREATE INDEX `catalog_games_year_idx` ON `catalog_games` (`status`,`year`,`id`);--> statement-breakpoint
CREATE INDEX `catalog_games_score_idx` ON `catalog_games` (`status`,`score_value`,`id`);--> statement-breakpoint
CREATE INDEX `catalog_games_added_idx` ON `catalog_games` (`status`,`catalog_added_at`,`id`);--> statement-breakpoint
CREATE INDEX `catalog_games_mood_idx` ON `catalog_games` (`status`,`mood`,`id`);--> statement-breakpoint
CREATE INDEX `catalog_games_steam_review_idx` ON `catalog_games` (`status`,`steam_positive_percent`,`id`);--> statement-breakpoint
CREATE INDEX `catalog_games_turkish_idx` ON `catalog_games` (`status`,`has_turkish`,`id`);--> statement-breakpoint
CREATE INDEX `catalog_games_coop_idx` ON `catalog_games` (`status`,`has_coop`,`id`);--> statement-breakpoint
CREATE TABLE `catalog_genres` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `catalog_media` (
	`game_id` text NOT NULL,
	`media_id` text NOT NULL,
	`kind` text NOT NULL,
	`url` text NOT NULL,
	`position` integer NOT NULL,
	`source` text,
	`retrieved_at` text,
	`payload` text NOT NULL,
	PRIMARY KEY(`game_id`, `media_id`)
);
--> statement-breakpoint
CREATE INDEX `catalog_media_game_idx` ON `catalog_media` (`game_id`,`position`);--> statement-breakpoint
CREATE TABLE `catalog_meta` (
	`id` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `catalog_overrides` (
	`game_id` text NOT NULL,
	`field` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text,
	PRIMARY KEY(`game_id`, `field`)
);
--> statement-breakpoint
CREATE TABLE `catalog_scores` (
	`record_id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`edition_id` text,
	`metric` text NOT NULL,
	`value` real,
	`platform` text,
	`rating_count` integer,
	`score_date` text,
	`retrieved_at` text,
	`source_url` text,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `catalog_scores_game_idx` ON `catalog_scores` (`game_id`,`metric`);--> statement-breakpoint
CREATE INDEX `catalog_scores_identity_idx` ON `catalog_scores` (`edition_id`,`platform`,`metric`);--> statement-breakpoint
CREATE TABLE `catalog_search_terms` (
	`token` text NOT NULL,
	`game_id` text NOT NULL,
	PRIMARY KEY(`token`, `game_id`)
);
--> statement-breakpoint
CREATE INDEX `catalog_search_terms_game_idx` ON `catalog_search_terms` (`game_id`);--> statement-breakpoint
CREATE TABLE `catalog_source_ids` (
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`game_id` text NOT NULL,
	`edition_id` text,
	`source_url` text,
	`retrieved_at` text,
	PRIMARY KEY(`source`, `external_id`)
);
--> statement-breakpoint
CREATE INDEX `catalog_source_ids_game_idx` ON `catalog_source_ids` (`game_id`);--> statement-breakpoint
CREATE TABLE `catalog_tags` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`label` text NOT NULL
);
