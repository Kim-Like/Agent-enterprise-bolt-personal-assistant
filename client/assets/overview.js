const FAMILY_TONES = {
  engineer: "#3B82F6",
  "ian-master": "#EF4444",
  "artisan-master": "#22C55E",
  "baltzer-master": "#F59E0B",
  "lavprishjemmeside-master": "#8B5CF6",
  "personal-assistant-master": "#0F766E",
  "samlino-master": "#0F172A",
};

const HEALTH_COLORS = {
  healthy: "#22C55E",
  blocked: "#F59E0B",
  held: "#EF4444",
  disabled: "#94A3B8",
  degraded: "#3B82F6",
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function initialsFor(name) {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function roleLabel(agent) {
  if (agent.groupRole === "root") {
    return "Global orchestrator";
  }

  if (agent.groupRole === "master") {
    return "Project master";
  }

  return `${agent.kind} agent`;
}

function statusLabel(agent) {
  const enablement = agent.enablement.state;
  const health = agent.health.status;

  return `${enablement} · ${health}`;
}

function toneForFamily(familyId) {
  return FAMILY_TONES[familyId] || "#64748B";
}

function buildCardMarkup(agent, tone) {
  const statusColor = HEALTH_COLORS[agent.health.status] || "#64748B";

  return `
    <div
      class="agent-card${agent.groupRole === "root" ? " orchestrator" : ""}"
      data-node-id="${escapeHtml(agent.id)}"
      style="border-left: 3px solid ${tone};"
    >
      <div class="card-header">
        <div class="agent-avatar" style="color:${tone}">${escapeHtml(initialsFor(agent.name))}</div>
        <div>
          <div class="agent-name">${escapeHtml(agent.name)}</div>
          <div class="agent-role">${escapeHtml(roleLabel(agent))}</div>
        </div>
      </div>
      <div class="agent-desc">${escapeHtml(agent.purpose)}</div>
      <div class="agent-status" style="color:${statusColor}">
        <span class="status-dot" style="background:${statusColor}"></span>
        ${escapeHtml(statusLabel(agent))}
      </div>
    </div>
  `;
}

function buildFamilyCaptionMarkup(family, x) {
  return `
    <div class="family-caption" style="left:${x}px; top:140px; border-top-color:${toneForFamily(family.id)}">
      <strong>${escapeHtml(family.label)}</strong>
      <span>${family.counts.total} agents · ${family.programIds.length} programs</span>
    </div>
  `;
}

function getVisibleFamilies(payload, activeFamilyId) {
  if (activeFamilyId === "all") {
    return payload.families;
  }

  return payload.families.filter((family) => family.id === activeFamilyId);
}

function drawConnectors(canvas, edges) {
  const svg = canvas.querySelector("#connectors");
  if (!svg) {
    return;
  }

  svg.innerHTML = "";
  svg.style.width = `${canvas.scrollWidth}px`;
  svg.style.height = `${canvas.scrollHeight}px`;
  svg.setAttribute("viewBox", `0 0 ${canvas.scrollWidth} ${canvas.scrollHeight}`);

  edges.forEach(([fromId, toId]) => {
    const from = canvas.querySelector(`[data-node-id="${fromId}"]`);
    const to = canvas.querySelector(`[data-node-id="${toId}"]`);

    if (!from || !to) {
      return;
    }

    const fromX = from.offsetLeft + from.offsetWidth / 2;
    const fromY = from.offsetTop + from.offsetHeight;
    const toX = to.offsetLeft + to.offsetWidth / 2;
    const toY = to.offsetTop;
    const midY = (fromY + toY) / 2;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`,
    );
    svg.appendChild(path);
  });
}

function updateSummary(payload, activeFamilyId, programsMode) {
  const scope = document.getElementById("overviewScope");
  const meta = document.getElementById("overviewMeta");
  const resetButton = document.getElementById("resetOverview");

  if (activeFamilyId === "all") {
    scope.textContent = programsMode ? "Programs filter" : "All families";
    meta.textContent = `${payload.counts.totalAgents} agents · ${payload.counts.healthyAgents} healthy · ${payload.counts.totalFamilies} project families`;
    resetButton.hidden = true;
    return;
  }

  const family = payload.families.find((entry) => entry.id === activeFamilyId);
  if (!family) {
    return;
  }

  scope.textContent = family.label;
  meta.textContent = `${family.counts.total} agents · ${family.counts.healthy} healthy · ${family.programIds.length} programs`;
  resetButton.hidden = false;
}

function renderSidebar(payload, state) {
  const agentsMode = document.getElementById("modeAgents");
  const programsMode = document.getElementById("modePrograms");
  const familySection = document.getElementById("familySection");
  const familyList = document.getElementById("familyList");

  agentsMode.classList.toggle("active", !state.programsMode);
  programsMode.classList.toggle("active", state.programsMode);

  familySection.hidden = !state.programsMode;
  familyList.innerHTML = payload.families
    .map(
      (family) => `
        <button
          class="sidebar-item family-item${state.activeFamilyId === family.id ? " active" : ""}"
          data-family-id="${escapeHtml(family.id)}"
          type="button"
        >
          <span class="family-swatch" style="background:${toneForFamily(family.id)}"></span>
          <span>${escapeHtml(family.label)}</span>
          <span class="family-count">${family.counts.total}</span>
        </button>
      `,
    )
    .join("");
}

function renderCanvas(payload, state) {
  const wrap = document.getElementById("canvasWrap");
  const canvas = document.getElementById("canvas");
  const visibleFamilies = getVisibleFamilies(payload, state.activeFamilyId);

  const cardWidth = 240;
  const columnWidth = 260;
  const columnGap = 56;
  const startX = 80;
  const rootY = 48;
  const masterY = 220;
  const childStartY = 400;
  const childGap = 156;
  const maxChildren = Math.max(
    1,
    ...visibleFamilies.map((family) =>
      Math.max(1, family.agents.filter((agent) => agent.groupRole === "task").length),
    ),
  );
  const totalGraphWidth =
    visibleFamilies.length * columnWidth +
    Math.max(0, visibleFamilies.length - 1) * columnGap;
  const canvasWidth = Math.max(1600, startX * 2 + totalGraphWidth);
  const canvasHeight = Math.max(940, childStartY + (maxChildren - 1) * childGap + 220);
  const rootLeft = startX + Math.max(0, (totalGraphWidth - cardWidth) / 2);
  const edges = [];

  canvas.style.width = `${canvasWidth}px`;
  canvas.style.minHeight = `${canvasHeight}px`;

  const fragments = ['<svg class="connectors" id="connectors"></svg>'];

  if (payload.root) {
    fragments.push(
      `<div class="node-wrap" style="left:${rootLeft}px; top:${rootY}px;">${buildCardMarkup(payload.root, "#F59E0B")}</div>`,
    );
  }

  visibleFamilies.forEach((family, columnIndex) => {
    const left = startX + columnIndex * (columnWidth + columnGap);
    const master = family.agents.find((agent) => agent.groupRole === "master");
    const tasks = family.agents.filter((agent) => agent.groupRole === "task");
    const tone = toneForFamily(family.id);

    fragments.push(buildFamilyCaptionMarkup(family, left));

    if (master) {
      fragments.push(
        `<div class="node-wrap" style="left:${left}px; top:${masterY}px;">${buildCardMarkup(master, tone)}</div>`,
      );
      edges.push(["father", master.id]);
    }

    tasks.forEach((task, taskIndex) => {
      const top = childStartY + taskIndex * childGap;
      fragments.push(
        `<div class="node-wrap" style="left:${left}px; top:${top}px;">${buildCardMarkup(task, tone)}</div>`,
      );
      if (master) {
        edges.push([master.id, task.id]);
      }
    });
  });

  canvas.innerHTML = fragments.join("");
  canvas.style.transform = `scale(${state.scale})`;
  canvas.style.transformOrigin = "0 0";

  window.requestAnimationFrame(() => {
    drawConnectors(canvas, edges);
    if (state.activeFamilyId !== "all") {
      wrap.scrollTo({ left: 0, top: 0, behavior: "auto" });
    }
  });
}

function bindPanning() {
  const wrap = document.getElementById("canvasWrap");
  if (!wrap || wrap.dataset.panBound === "true") {
    return;
  }

  let isPanning = false;
  let startX = 0;
  let startY = 0;
  let scrollLeft = 0;
  let scrollTop = 0;

  wrap.addEventListener("mousedown", (event) => {
    if (event.target.closest(".agent-card")) {
      return;
    }

    isPanning = true;
    startX = event.pageX - wrap.offsetLeft;
    startY = event.pageY - wrap.offsetTop;
    scrollLeft = wrap.scrollLeft;
    scrollTop = wrap.scrollTop;
  });

  wrap.addEventListener("mousemove", (event) => {
    if (!isPanning) {
      return;
    }

    event.preventDefault();
    wrap.scrollLeft = scrollLeft - (event.pageX - wrap.offsetLeft - startX);
    wrap.scrollTop = scrollTop - (event.pageY - wrap.offsetTop - startY);
  });

  ["mouseup", "mouseleave"].forEach((eventName) => {
    wrap.addEventListener(eventName, () => {
      isPanning = false;
    });
  });

  wrap.dataset.panBound = "true";
}

async function initOverview() {
  const canvas = document.getElementById("canvas");
  if (!canvas) {
    return;
  }

  const state = {
    payload: null,
    activeFamilyId: "all",
    programsMode: false,
    scale: 1,
  };

  const refreshButton = document.getElementById("refreshOverview");
  const resetButton = document.getElementById("resetOverview");
  const agentsMode = document.getElementById("modeAgents");
  const programsMode = document.getElementById("modePrograms");
  const familyList = document.getElementById("familyList");

  bindPanning();

  function rerender() {
    if (!state.payload) {
      return;
    }

    renderSidebar(state.payload, state);
    renderCanvas(state.payload, state);
    updateSummary(state.payload, state.activeFamilyId, state.programsMode);
  }

  async function loadOverview() {
    document.getElementById("overviewMeta").textContent = "Loading agent registry...";

    const response = await fetch("/api/overview");
    if (!response.ok) {
      throw new Error("Failed to load /api/overview");
    }

    state.payload = await response.json();
    rerender();
  }

  agentsMode.addEventListener("click", () => {
    state.programsMode = false;
    state.activeFamilyId = "all";
    rerender();
  });

  programsMode.addEventListener("click", () => {
    state.programsMode = true;
    rerender();
  });

  familyList.addEventListener("click", (event) => {
    const item = event.target.closest("[data-family-id]");
    if (!item) {
      return;
    }

    state.programsMode = true;
    state.activeFamilyId = item.dataset.familyId;
    rerender();
  });

  refreshButton.addEventListener("click", async () => {
    await loadOverview();
  });

  resetButton.addEventListener("click", () => {
    state.programsMode = false;
    state.activeFamilyId = "all";
    rerender();
  });

  document.getElementById("zoomIn").addEventListener("click", () => {
    state.scale = Math.min(state.scale + 0.1, 2);
    rerender();
  });

  document.getElementById("zoomOut").addEventListener("click", () => {
    state.scale = Math.max(state.scale - 0.1, 0.4);
    rerender();
  });

  document.getElementById("zoomReset").addEventListener("click", () => {
    state.scale = 1;
    rerender();
  });

  try {
    await loadOverview();
  } catch (error) {
    document.getElementById("overviewScope").textContent = "Unavailable";
    document.getElementById("overviewMeta").textContent = error.message;
    canvas.innerHTML = `<div class="canvas-empty">${escapeHtml(error.message)}</div>`;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initOverview, { once: true });
} else {
  initOverview();
}
