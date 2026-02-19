import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { db, schema } from "../../db/index.js";
import { eq } from "drizzle-orm";
import { generateUniverse } from "../../engine/universe.js";

export const gameRoutes = new Hono();

// Create a new universe
gameRoutes.post("/universes", async (c) => {
  const body = await c.req.json();
  const { name, galaxyCount = 6 } = body;

  const id = randomUUID();
  const { nodes, connections } = generateUniverse(galaxyCount);

  // Insert universe
  db.insert(schema.universes).values({
    id,
    name: name || "New Universe",
    config: JSON.stringify({ galaxyCount }),
    currentDay: 0,
    anchorTime: "00:00",
    turnDurationHours: 24,
    status: "active",
    createdAt: new Date().toISOString(),
  }).run();

  // Insert nodes
  for (const node of nodes) {
    db.insert(schema.nodes).values({
      id: node.id,
      universeId: id,
      name: node.name,
      type: node.type,
      x: node.x,
      y: node.y,
      size: node.size,
      resources: JSON.stringify(node.resources),
      defenseValue: node.defenseValue,
    }).run();
  }

  // Insert connections
  for (const conn of connections) {
    db.insert(schema.connections).values({
      id: conn.id,
      universeId: id,
      fromNodeId: conn.fromNodeId,
      toNodeId: conn.toNodeId,
      type: conn.type,
      distance: conn.distance,
    }).run();
  }

  return c.json({ id, name, nodeCount: nodes.length, connectionCount: connections.length });
});

// Get universe state
gameRoutes.get("/universes/:id", (c) => {
  const id = c.req.param("id");
  const universe = db.select().from(schema.universes).where(eq(schema.universes.id, id)).get();
  if (!universe) return c.json({ error: "Universe not found" }, 404);

  const nodes = db.select().from(schema.nodes).where(eq(schema.nodes.universeId, id)).all();
  const connections = db.select().from(schema.connections).where(eq(schema.connections.universeId, id)).all();
  const players = db.select().from(schema.players).where(eq(schema.players.universeId, id)).all();

  return c.json({ universe, nodes, connections, players });
});

// List all universes
gameRoutes.get("/universes", (c) => {
  const universes = db.select().from(schema.universes).all();
  return c.json(universes);
});

// Add a player to a universe
gameRoutes.post("/universes/:id/players", async (c) => {
  const universeId = c.req.param("id");
  const body = await c.req.json();
  const { name, civilizationType, color } = body;

  const id = randomUUID();
  const startingResources = { energy: 500, matter: 300, information: 100, lifeForce: 200, influence: 50 };

  db.insert(schema.players).values({
    id,
    universeId,
    name,
    civilizationType: civilizationType || "generic",
    color: color || "#FFFFFF",
    resources: JSON.stringify(startingResources),
    createdAt: new Date().toISOString(),
  }).run();

  return c.json({ id, name, resources: startingResources });
});
