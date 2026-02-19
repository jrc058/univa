import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { gameRoutes } from "./routes/game.js";

const app = new Hono();

// API routes
app.route("/api", gameRoutes);

// Health check
app.get("/api/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// Serve static frontend files
app.use("/*", serveStatic({ root: "./public" }));

const port = Number(process.env.PORT) || 3000;

console.log(`Univa server starting on port ${port}`);
serve({ fetch: app.fetch, port });
console.log(`Univa server running at http://localhost:${port}`);
