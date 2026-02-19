import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = process.env.DB_PATH || "./data/univa.db";

// Ensure data directory exists
const dir = dirname(DB_PATH);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Auto-create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS universes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    config TEXT NOT NULL,
    current_day INTEGER NOT NULL DEFAULT 0,
    anchor_time TEXT NOT NULL,
    turn_duration_hours INTEGER NOT NULL DEFAULT 24,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    universe_id TEXT NOT NULL REFERENCES universes(id),
    name TEXT NOT NULL,
    civilization_type TEXT NOT NULL,
    color TEXT NOT NULL,
    capital_node_id TEXT,
    resources TEXT NOT NULL DEFAULT '{}',
    turn_committed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    universe_id TEXT NOT NULL REFERENCES universes(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    size REAL NOT NULL DEFAULT 1,
    resources TEXT NOT NULL DEFAULT '{}',
    owner_id TEXT REFERENCES players(id),
    powered INTEGER NOT NULL DEFAULT 1,
    isolated_since INTEGER,
    defense_value INTEGER NOT NULL DEFAULT 5
  );
  CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    universe_id TEXT NOT NULL REFERENCES universes(id),
    from_node_id TEXT NOT NULL REFERENCES nodes(id),
    to_node_id TEXT NOT NULL REFERENCES nodes(id),
    type TEXT NOT NULL DEFAULT 'route',
    distance REAL NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS fleets (
    id TEXT PRIMARY KEY,
    universe_id TEXT NOT NULL REFERENCES universes(id),
    owner_id TEXT NOT NULL REFERENCES players(id),
    name TEXT NOT NULL,
    node_id TEXT NOT NULL REFERENCES nodes(id),
    ships TEXT NOT NULL DEFAULT '[]',
    hero_id TEXT
  );
  CREATE TABLE IF NOT EXISTS turn_actions (
    id TEXT PRIMARY KEY,
    universe_id TEXT NOT NULL REFERENCES universes(id),
    player_id TEXT NOT NULL REFERENCES players(id),
    solar_day INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    action_data TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending'
  );
  CREATE TABLE IF NOT EXISTS game_log (
    id TEXT PRIMARY KEY,
    universe_id TEXT NOT NULL REFERENCES universes(id),
    solar_day INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    event_data TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

export const db = drizzle(sqlite, { schema });
export { schema };