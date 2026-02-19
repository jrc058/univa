const canvas = document.getElementById("map");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const listEl = document.getElementById("universe-list");
const detailTitle = document.getElementById("detail-title");
const detailContent = document.getElementById("detail-content");

let currentUniverse = null;
let camera = { x: 0, y: 0, zoom: 1 };
let selectedNode = null;
let isDragging = false;
let dragStart = { x: 0, y: 0 };

// Resize canvas
function resize() {
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  if (currentUniverse) draw();
}
window.addEventListener("resize", resize);
resize();

// API helpers
async function api(path, opts) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  return res.json();
}

// Load universe list
async function loadUniverses() {
  const universes = await api("/universes");
  listEl.innerHTML = "";
  for (const u of universes) {
    const li = document.createElement("li");
    li.textContent = u.name;
    li.onclick = () => loadUniverse(u.id);
    listEl.appendChild(li);
  }
  statusEl.textContent = `${universes.length} universe(s)`;
}

// Load a specific universe
async function loadUniverse(id) {
  currentUniverse = await api(`/universes/${id}`);
  // Center camera on nodes
  const nodes = currentUniverse.nodes;
  if (nodes.length) {
    const avgX = nodes.reduce((s, n) => s + n.x, 0) / nodes.length;
    const avgY = nodes.reduce((s, n) => s + n.y, 0) / nodes.length;
    camera.x = avgX - canvas.width / 2;
    camera.y = avgY - canvas.height / 2;
  }
  // Highlight active in sidebar
  for (const li of listEl.children) {
    li.classList.toggle("active", li.textContent === currentUniverse.universe.name);
  }
  draw();
}

// Create universe
document.getElementById("create-btn").onclick = async () => {
  const name = prompt("Universe name:", "New Universe");
  if (!name) return;
  const result = await api("/universes", { method: "POST", body: { name, galaxyCount: 6 } });
  await loadUniverses();
  await loadUniverse(result.id);
};

// Drawing
function draw() {
  if (!currentUniverse) return;
  const { nodes, connections } = currentUniverse;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background gradient
  const bg = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width);
  bg.addColorStop(0, "#0f0f2a");
  bg.addColorStop(1, "#050510");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Stars
  for (let i = 0; i < 200; i++) {
    const sx = (i * 7919) % canvas.width;
    const sy = (i * 6271) % canvas.height;
    const brightness = 0.2 + (i % 5) * 0.15;
    ctx.fillStyle = `rgba(200, 210, 240, ${brightness})`;
    ctx.fillRect(sx, sy, 1, 1);
  }

  ctx.save();
  ctx.translate(-camera.x * camera.zoom, -camera.y * camera.zoom);
  ctx.scale(camera.zoom, camera.zoom);

  // Draw connections
  for (const conn of connections) {
    const from = nodes.find(n => n.id === conn.from_node_id || n.id === conn.fromNodeId);
    const to = nodes.find(n => n.id === conn.to_node_id || n.id === conn.toNodeId);
    if (!from || !to) continue;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = conn.type === "wormhole" ? "rgba(180, 120, 255, 0.3)" : "rgba(100, 140, 255, 0.15)";
    ctx.lineWidth = conn.type === "wormhole" ? 2 : 1;
    if (conn.type === "wormhole") ctx.setLineDash([5, 5]);
    else ctx.setLineDash([]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw nodes
  for (const node of nodes) {
    const isSelected = selectedNode?.id === node.id;
    const r = 8 + node.size * 6;

    // Glow
    const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 3);
    glow.addColorStop(0, isSelected ? "rgba(122, 162, 247, 0.3)" : "rgba(122, 162, 247, 0.1)");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(node.x - r * 3, node.y - r * 3, r * 6, r * 6);

    // Node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
    ctx.fillStyle = isSelected ? "#7aa2f7" : node.owner_id ? "#9ece6a" : "rgba(122, 162, 247, 0.6)";
    ctx.fill();
    ctx.strokeStyle = isSelected ? "#bb9af7" : "rgba(122, 162, 247, 0.3)";
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.stroke();

    // Label
    ctx.fillStyle = "#c8d0e0";
    ctx.font = "11px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(node.name, node.x, node.y + r + 14);
  }

  ctx.restore();
}

// Mouse interaction
canvas.addEventListener("mousedown", (e) => {
  isDragging = true;
  dragStart = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  camera.x -= (e.clientX - dragStart.x) / camera.zoom;
  camera.y -= (e.clientY - dragStart.y) / camera.zoom;
  dragStart = { x: e.clientX, y: e.clientY };
  draw();
});

canvas.addEventListener("mouseup", () => { isDragging = false; });

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const factor = e.deltaY > 0 ? 0.9 : 1.1;
  camera.zoom = Math.max(0.3, Math.min(3, camera.zoom * factor));
  draw();
});

canvas.addEventListener("click", (e) => {
  if (!currentUniverse) return;
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) / camera.zoom + camera.x;
  const my = (e.clientY - rect.top) / camera.zoom + camera.y;

  selectedNode = null;
  for (const node of currentUniverse.nodes) {
    const r = 8 + node.size * 6;
    if (Math.hypot(node.x - mx, node.y - my) < r * 1.5) {
      selectedNode = node;
      break;
    }
  }

  if (selectedNode) {
    const res = JSON.parse(selectedNode.resources || "{}");
    detailTitle.textContent = selectedNode.name;
    detailContent.innerHTML = `
      <div class="resource-bar"><span class="resource-label">Type</span><span class="resource-value">${selectedNode.type}</span></div>
      <div class="resource-bar"><span class="resource-label">Defense</span><span class="resource-value">${selectedNode.defense_value || selectedNode.defenseValue}</span></div>
      <div class="resource-bar"><span class="resource-label">Energy</span><span class="resource-value">${res.energy || 0}</span></div>
      <div class="resource-bar"><span class="resource-label">Matter</span><span class="resource-value">${res.matter || 0}</span></div>
      <div class="resource-bar"><span class="resource-label">Information</span><span class="resource-value">${res.information || 0}</span></div>
      <div class="resource-bar"><span class="resource-label">Life Force</span><span class="resource-value">${res.lifeForce || 0}</span></div>
      <div class="resource-bar"><span class="resource-label">Owner</span><span class="resource-value">${selectedNode.owner_id || "Unclaimed"}</span></div>
      <div class="resource-bar"><span class="resource-label">Powered</span><span class="resource-value">${selectedNode.powered ? "Yes" : "Isolated"}</span></div>
    `;
  } else {
    detailTitle.textContent = "Select a node";
    detailContent.innerHTML = "";
  }
  draw();
});

// Init
loadUniverses();
