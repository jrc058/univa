import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Universe - the top-level game instance
export const universes = sqliteTable("universes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  config: text("config").notNull(), // JSON string of universe configuration
  currentDay: integer("current_day").notNull().default(0),
  anchorTime: text("anchor_time").notNull(), // HH:MM
  turnDurationHours: integer("turn_duration_hours").notNull().default(24),
  status: text("status").notNull().default("active"), // active, paused, completed
  createdAt: text("created_at").notNull(),
});

// Players in a universe
export const players = sqliteTable("players", {
  id: text("id").primaryKey(),
  universeId: text("universe_id").notNull().references(() => universes.id),
  name: text("name").notNull(),
  civilizationType: text("civilization_type").notNull(),
  color: text("color").notNull(),
  capitalNodeId: text("capital_node_id"),
  resources: text("resources").notNull().default("{}"), // JSON: { energy, matter, information, lifeForce, influence }
  turnCommitted: integer("turn_committed").notNull().default(0), // 0 = not committed, 1 = committed
  createdAt: text("created_at").notNull(),
});

// Nodes - galaxies, sectors, celestial bodies on the map
export const nodes = sqliteTable("nodes", {
  id: text("id").primaryKey(),
  universeId: text("universe_id").notNull().references(() => universes.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // galaxy, sector, planet
  x: real("x").notNull(),
  y: real("y").notNull(),
  size: real("size").notNull().default(1),
  resources: text("resources").notNull().default("{}"), // JSON: available resources
  ownerId: text("owner_id").references(() => players.id),
  powered: integer("powered").notNull().default(1), // 1 = connected to network, 0 = isolated
  isolatedSince: integer("isolated_since"), // solar day when isolation started
  defenseValue: integer("defense_value").notNull().default(5),
});

// Connections between nodes (supply lines, trade routes, wormholes)
export const connections = sqliteTable("connections", {
  id: text("id").primaryKey(),
  universeId: text("universe_id").notNull().references(() => universes.id),
  fromNodeId: text("from_node_id").notNull().references(() => nodes.id),
  toNodeId: text("to_node_id").notNull().references(() => nodes.id),
  type: text("type").notNull().default("route"), // route, wormhole, trade_route
  distance: real("distance").notNull().default(1),
});

// Fleets - collections of ships belonging to a player
export const fleets = sqliteTable("fleets", {
  id: text("id").primaryKey(),
  universeId: text("universe_id").notNull().references(() => universes.id),
  ownerId: text("owner_id").notNull().references(() => players.id),
  name: text("name").notNull(),
  nodeId: text("node_id").notNull().references(() => nodes.id),
  ships: text("ships").notNull().default("[]"), // JSON array of ship cards
  heroId: text("hero_id"), // optional hero leading this fleet
});

// Turn actions queued by players
export const turnActions = sqliteTable("turn_actions", {
  id: text("id").primaryKey(),
  universeId: text("universe_id").notNull().references(() => universes.id),
  playerId: text("player_id").notNull().references(() => players.id),
  solarDay: integer("solar_day").notNull(),
  actionType: text("action_type").notNull(), // move, build, research, trade, scout, attack
  actionData: text("action_data").notNull(), // JSON with action-specific data
  priority: integer("priority").notNull().default(0),
  status: text("status").notNull().default("pending"), // pending, resolved, failed
});

// Game log - history of everything that happened
export const gameLog = sqliteTable("game_log", {
  id: text("id").primaryKey(),
  universeId: text("universe_id").notNull().references(() => universes.id),
  solarDay: integer("solar_day").notNull(),
  eventType: text("event_type").notNull(),
  eventData: text("event_data").notNull(), // JSON
  createdAt: text("created_at").notNull(),
});
