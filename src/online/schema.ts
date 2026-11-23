export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS sf_rooms (id TEXT PRIMARY KEY, visibility TEXT NOT NULL, status TEXT NOT NULL, revision INTEGER NOT NULL, updated_at INTEGER NOT NULL, mutation_id TEXT NOT NULL, data TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS sf_public_rooms ON sf_rooms(visibility,status,updated_at)`,
  `CREATE TABLE IF NOT EXISTS sf_credentials (token_hash TEXT PRIMARY KEY, room_id TEXT NOT NULL, member_id TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS sf_room_members ON sf_credentials(room_id,member_id)`,
  `CREATE TABLE IF NOT EXISTS sf_receipts (room_id TEXT NOT NULL, member_id TEXT NOT NULL, command_id TEXT NOT NULL, digest TEXT NOT NULL, game_revision INTEGER NOT NULL, PRIMARY KEY(room_id,member_id,command_id))`,
  `CREATE TABLE IF NOT EXISTS sf_presence (room_id TEXT NOT NULL, member_id TEXT NOT NULL, seen_at INTEGER NOT NULL, responded_at INTEGER NOT NULL, pause_baseline INTEGER NOT NULL, response_pause INTEGER NOT NULL, PRIMARY KEY(room_id,member_id))`,
  `CREATE TABLE IF NOT EXISTS sf_limits (bucket TEXT PRIMARY KEY, reset_at INTEGER NOT NULL, count INTEGER NOT NULL)`,
];
