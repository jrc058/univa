import { randomUUID } from "node:crypto";

export interface NodeData {
  id: string;
  name: string;
  type: "galaxy" | "sector" | "planet";
  x: number;
  y: number;
  size: number;
  resources: { energy: number; matter: number; information: number; lifeForce: number };
  defenseValue: number;
}

export interface ConnectionData {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: "route" | "wormhole";
  distance: number;
}

const GALAXY_NAMES = [
  "Keth Nebula", "Vorn Cluster", "Ashara Expanse", "Drel Void",
  "Myr Reach", "Solace Deep", "Thorn Spiral", "Ixen Drift",
  "Pale Dominion", "Crucible", "Ember Veil", "Shardfall",
];

/** Generate a procedural universe with connected galaxy nodes */
export function generateUniverse(galaxyCount = 6, seed?: string): {
  nodes: NodeData[];
  connections: ConnectionData[];
} {
  const nodes: NodeData[] = [];
  const connections: ConnectionData[] = [];
  const usedNames = new Set<string>();

  // Place galaxies in a rough distribution
  for (let i = 0; i < galaxyCount; i++) {
    let name: string;
    do {
      name = GALAXY_NAMES[Math.floor(Math.random() * GALAXY_NAMES.length)];
    } while (usedNames.has(name));
    usedNames.add(name);

    const angle = (i / galaxyCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const radius = 200 + Math.random() * 300;

    nodes.push({
      id: randomUUID(),
      name,
      type: "galaxy",
      x: 500 + Math.cos(angle) * radius,
      y: 500 + Math.sin(angle) * radius,
      size: 0.5 + Math.random() * 1.5,
      resources: {
        energy: Math.floor(50 + Math.random() * 200),
        matter: Math.floor(50 + Math.random() * 200),
        information: Math.floor(20 + Math.random() * 100),
        lifeForce: Math.floor(10 + Math.random() * 80),
      },
      defenseValue: 5 + Math.floor(Math.random() * 8),
    });
  }

  // Connect nearby galaxies (minimum spanning tree + some extra connections)
  const connected = new Set<string>([nodes[0].id]);
  const unconnected = new Set(nodes.slice(1).map((n) => n.id));

  // MST via Prim's algorithm
  while (unconnected.size > 0) {
    let bestDist = Infinity;
    let bestFrom = "";
    let bestTo = "";

    for (const fromId of connected) {
      const from = nodes.find((n) => n.id === fromId)!;
      for (const toId of unconnected) {
        const to = nodes.find((n) => n.id === toId)!;
        const dist = Math.hypot(from.x - to.x, from.y - to.y);
        if (dist < bestDist) {
          bestDist = dist;
          bestFrom = fromId;
          bestTo = toId;
        }
      }
    }

    connected.add(bestTo);
    unconnected.delete(bestTo);
    connections.push({
      id: randomUUID(),
      fromNodeId: bestFrom,
      toNodeId: bestTo,
      type: "route",
      distance: Math.round(bestDist),
    });
  }

  // Add 1-2 extra connections for redundancy
  const extraCount = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < extraCount; i++) {
    const a = nodes[Math.floor(Math.random() * nodes.length)];
    const b = nodes[Math.floor(Math.random() * nodes.length)];
    if (a.id === b.id) continue;
    const exists = connections.some(
      (c) =>
        (c.fromNodeId === a.id && c.toNodeId === b.id) ||
        (c.fromNodeId === b.id && c.toNodeId === a.id)
    );
    if (!exists) {
      connections.push({
        id: randomUUID(),
        fromNodeId: a.id,
        toNodeId: b.id,
        type: Math.random() > 0.7 ? "wormhole" : "route",
        distance: Math.round(Math.hypot(a.x - b.x, a.y - b.y)),
      });
    }
  }

  return { nodes, connections };
}
