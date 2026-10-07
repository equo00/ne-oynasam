CREATE TABLE `source_games` (
	`id` text PRIMARY KEY NOT NULL,
	`qid` text NOT NULL,
	`payload` text NOT NULL,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_games_qid_unique` ON `source_games` (`qid`);