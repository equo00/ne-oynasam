export const adminSchema=[
 'CREATE TABLE IF NOT EXISTS catalog_admins(id TEXT PRIMARY KEY,user_id TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS catalog_admin_versions(game_id TEXT PRIMARY KEY,revision INTEGER NOT NULL DEFAULT 0)',
 'CREATE TABLE IF NOT EXISTS catalog_admin_guard(id TEXT PRIMARY KEY,valid INTEGER NOT NULL CHECK(valid=1))',
 'CREATE TABLE IF NOT EXISTS catalog_admin_reviews(game_id TEXT NOT NULL,source TEXT NOT NULL,verdict TEXT NOT NULL,note TEXT NOT NULL,updated_by TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(game_id,source))',
 'CREATE TABLE IF NOT EXISTS catalog_admin_audit(id TEXT PRIMARY KEY,game_id TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,reason TEXT NOT NULL,before_state TEXT NOT NULL,after_state TEXT NOT NULL,after_hash TEXT,after_revision INTEGER NOT NULL,created_at TEXT NOT NULL)',
 'CREATE INDEX IF NOT EXISTS catalog_admin_audit_game_idx ON catalog_admin_audit(game_id,created_at DESC,id)',
 'CREATE TABLE IF NOT EXISTS catalog_admin_jobs(id TEXT PRIMARY KEY,kind TEXT NOT NULL,actor TEXT NOT NULL,status TEXT NOT NULL,requested TEXT NOT NULL,processed INTEGER NOT NULL DEFAULT 0,result TEXT,error TEXT,started_at TEXT NOT NULL,finished_at TEXT)',
 'CREATE INDEX IF NOT EXISTS catalog_admin_jobs_time_idx ON catalog_admin_jobs(started_at DESC,id)'
];
const ready=new WeakSet<object>();
export async function ensureAdminSchema(database:D1Database){if(ready.has(database))return;await database.batch(adminSchema.map(sql=>database.prepare(sql)));ready.add(database);}
