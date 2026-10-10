CREATE TABLE IF NOT EXISTS `catalog_game_features` (
 `game_id` text NOT NULL REFERENCES `catalog_games`(`id`) ON DELETE CASCADE,
 `feature` text NOT NULL,
 `source` text,
 `retrieved_at` text,
 PRIMARY KEY(`game_id`,`feature`)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `catalog_game_features_filter_idx` ON `catalog_game_features` (`feature`,`game_id`);
