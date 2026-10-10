const ready=new WeakSet<object>();
export async function ensureGameplaySchema(database:D1Database){
 if(ready.has(database))return;
 await database.batch([
  database.prepare('CREATE TABLE IF NOT EXISTS catalog_game_features(game_id TEXT NOT NULL REFERENCES catalog_games(id) ON DELETE CASCADE,feature TEXT NOT NULL,source TEXT,retrieved_at TEXT,PRIMARY KEY(game_id,feature))'),
  database.prepare('CREATE INDEX IF NOT EXISTS catalog_game_features_filter_idx ON catalog_game_features(feature,game_id)')
 ]);ready.add(database);
}
