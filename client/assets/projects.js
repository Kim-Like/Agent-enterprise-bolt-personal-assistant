const DIRECTORY_ENDPOINT = "/api/projects";
const PROJECT_PREFIX = "/projects/";

const STATUS_LABELS = {
  active: "Active",
  remote: "Remote",
  planned: "Planned",
  hold: "Hold",
  stub: "Stub",
  "archive-context": "Archive",
};

const TYPE_LABELS = {
  agent: "Agent",
  "task-lane": "Task lane",
  program: "Program",
  application: "Application",
  site: "Site",
  repo: "Repo",
  endpoint: "Endpoint",
  doc: "Doc",
  integration: "Integration",
  "data-store": "Data store",
  "archive-context": "Archive",
  "featured-card": "Featured",
};

const TYPE_ICONS = {
  agent:
    '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v2H7a2 2 0 0 0-2 2v3h14V9a2 2 0 0 0-2-2h-2V5a3 3 0 0 0-3-3Z"/><path d="M5 12v5a2 2 0 0 0 2 2h3v-3h4v3h3a2 2 0 0 0 2-2v-5"/><circle cx="9" cy="11" r="1"/><circle cx="15" cy="11" r="1"/></svg>',
  "task-lane":
    '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  program:
    '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  application:
    '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18"/></svg>',
  site:
    '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  repo:
    '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M4 4h8a4 4 0 0 1 4 4v12H8a4 4 0 0 0-4 4Z"/><path d="M16 20h4V8a4 4 0 0 0-4-4h-4"/></svg>',
  endpoint:
    '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 1 7 0l1 1a5 5 0 0 1-7 7l-1-1"/><path d="M14 11a5 5 0 0 1-7 0l-1-1a5 5 0 0 1 7-7l1 1"/></svg>',
  doc:
    '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>',
  integration:
    '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M12 6V3m0 18v-3m6-6h3M3 12h3"/><path d="m16.24 7.76 2.12-2.12M5.64 18.36l2.12-2.12m0-8.48L5.64 5.64m12.72 12.72-2.12-2.12"/><circle cx="12" cy="12" r="4"/></svg>',
  "data-store":
    '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v8c0 1.7 3.6 3 8 3s8-1.3 8-3v-8"/></svg>',
  "archive-context":
    '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M3 7h18"/><path d="M5 7v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7"/><path d="M9 11h6"/></svg>',
};

const PREVIEWS = {
  workspace: `
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;width:100%;">
      <div style="height:78px;border-radius:18px;background:white;border:1px solid rgba(226,232,240,.92);padding:12px;display:flex;flex-direction:column;justify-content:space-between">
        <div style="width:36px;height:10px;border-radius:999px;background:#DBEAFE"></div>
        <div style="display:grid;gap:5px">
          <div style="height:6px;border-radius:999px;background:#CBD5E1"></div>
          <div style="height:6px;width:70%;border-radius:999px;background:#E2E8F0"></div>
        </div>
      </div>
      <div style="height:96px;border-radius:18px;background:white;border:1px solid rgba(226,232,240,.92);padding:12px;display:grid;gap:8px">
        <div style="height:8px;border-radius:999px;background:#BBF7D0;width:48%"></div>
        <div style="display:grid;gap:5px">
          <div style="height:6px;border-radius:999px;background:#CBD5E1"></div>
          <div style="height:6px;border-radius:999px;background:#E2E8F0"></div>
          <div style="height:6px;width:58%;border-radius:999px;background:#E2E8F0"></div>
        </div>
      </div>
      <div style="height:70px;border-radius:18px;background:white;border:1px solid rgba(226,232,240,.92);padding:12px;display:grid;gap:6px">
        <div style="height:7px;width:44%;border-radius:999px;background:#FDE68A"></div>
        <div style="height:6px;border-radius:999px;background:#E2E8F0"></div>
        <div style="height:6px;width:64%;border-radius:999px;background:#E2E8F0"></div>
      </div>
    </div>
  `,
  docs: `
    <div style="width:100%;display:flex;gap:12px;align-items:flex-end">
      <div style="width:116px;height:96px;border-radius:18px;background:white;border:1px solid rgba(226,232,240,.92);padding:14px;display:grid;gap:7px">
        <div style="height:8px;border-radius:999px;background:#CBD5E1;width:58%"></div>
        <div style="height:6px;border-radius:999px;background:#E2E8F0"></div>
        <div style="height:6px;border-radius:999px;background:#E2E8F0"></div>
        <div style="height:6px;width:66%;border-radius:999px;background:#E2E8F0"></div>
      </div>
      <div style="width:92px;height:74px;border-radius:18px;background:white;border:1px solid rgba(226,232,240,.92);padding:12px;display:grid;gap:6px">
        <div style="height:7px;width:50%;border-radius:999px;background:#DBEAFE"></div>
        <div style="height:6px;border-radius:999px;background:#E2E8F0"></div>
        <div style="height:6px;width:70%;border-radius:999px;background:#E2E8F0"></div>
      </div>
    </div>
  `,
  agents: `
    <div style="display:flex;gap:10px;align-items:flex-end;width:100%;">
      <div style="width:54px;height:54px;border-radius:18px;background:white;border:1px solid rgba(226,232,240,.92);display:flex;align-items:center;justify-content:center">
        <div style="width:24px;height:24px;border-radius:999px;background:#DBEAFE"></div>
      </div>
      <div style="flex:1;height:82px;border-radius:20px;background:white;border:1px solid rgba(226,232,240,.92);padding:12px;display:grid;gap:8px">
        <div style="display:flex;gap:6px">
          <div style="width:18px;height:18px;border-radius:999px;background:#FDE68A"></div>
          <div style="width:18px;height:18px;border-radius:999px;background:#BFDBFE"></div>
          <div style="width:18px;height:18px;border-radius:999px;background:#BBF7D0"></div>
        </div>
        <div style="height:6px;border-radius:999px;background:#CBD5E1"></div>
        <div style="height:6px;width:58%;border-radius:999px;background:#E2E8F0"></div>
      </div>
    </div>
  `,
  data: `
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;width:100%;">
      <div style="height:88px;border-radius:18px;background:white;border:1px solid rgba(226,232,240,.92);padding:12px;display:grid;gap:6px">
        <div style="height:20px;border-radius:12px;background:#F8FAFC;border:1px solid #E2E8F0"></div>
        <div style="height:7px;width:52%;border-radius:999px;background:#CBD5E1"></div>
        <div style="height:6px;border-radius:999px;background:#E2E8F0"></div>
      </div>
      <div style="height:72px;border-radius:18px;background:white;border:1px solid rgba(226,232,240,.92);padding:12px;display:grid;gap:6px">
        <div style="height:7px;width:44%;border-radius:999px;background:#DBEAFE"></div>
        <div style="height:6px;border-radius:999px;background:#E2E8F0"></div>
        <div style="height:6px;width:68%;border-radius:999px;background:#E2E8F0"></div>
      </div>
    </div>
  `,
};

const state = {
  directory: null,
  project: null,
  itemLookup: new Map(),
};

const elements = {
  pageEyebrow: document.querySelector("#pageEyebrow"),
  pageTitle: document.querySelector("#pageTitle"),
  pageSummary: document.querySelector("#pageSummary"),
  heroMeta: document.querySelector("#heroMeta"),
  statusStrip: document.querySelector("#statusStrip"),
  directoryView: document.querySelector("#directoryView"),
  detailView: document.querySelector("#detailView"),
  workspaceMode: document.querySelector("#workspaceMode"),
  workspaceSubline: document.querySelector("#workspaceSubline"),
  projectSwitcherWrap: document.querySelector("#projectSwitcherWrap"),
  projectSwitcher: document.querySelector("#projectSwitcher"),
  panel: document.querySelector("#detailPanel"),
  panelScrim: document.querySelector("#panelScrim"),
  panelClose: document.querySelector("#panelClose"),
  panelType: document.querySelector("#panelType"),
  panelTitle: document.querySelector("#panelTitle"),
  panelBadges: document.querySelector("#panelBadges"),
  panelSummary: document.querySelector("#panelSummary"),
  panelActions: document.querySelector("#panelActions"),
  panelMeta: document.querySelector("#panelMeta"),
  panelDocs: document.querySelector("#panelDocs"),
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toTitleCase(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getProjectIdFromPath(pathname) {
  if (!pathname.startsWith(PROJECT_PREFIX)) {
    return null;
  }

  const id = pathname.slice(PROJECT_PREFIX.length);
  return id && !id.includes("/") ? decodeURIComponent(id) : null;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`${url} failed with ${response.status}`);
  }
  return response.json();
}

function renderHeroStats(items) {
  elements.heroMeta.innerHTML = items
    .map(
      (item) => `
        <div class="hero-stat">
          <div class="hero-stat-value">${escapeHtml(item.value)}</div>
          <div class="hero-stat-label">${escapeHtml(item.label)}</div>
          <div class="hero-stat-sub">${escapeHtml(item.subline || "")}</div>
        </div>
      `,
    )
    .join("");
}

function renderStatusStrip(items) {
  elements.statusStrip.innerHTML = items
    .map(
      (item) => `
        <div class="status-item">
          <span class="status-tone" data-tone="${escapeHtml(item.tone || "muted")}"></span>
          <div class="status-copy">
            <strong>${escapeHtml(item.value)}</strong>
            <span>${escapeHtml(item.label)}</span>
          </div>
        </div>
      `,
    )
    .join("");
}

function renderBadge(label, kind, value) {
  return `
    <span class="badge" data-${kind}="${escapeHtml(value)}">
      <span class="badge-dot"></span>
      ${escapeHtml(label)}
    </span>
  `;
}

function renderStatusMix(statusMix) {
  const ordered = ["active", "remote", "planned", "hold", "stub", "archive-context"];
  return ordered
    .filter((status) => statusMix?.[status])
    .map((status) => renderBadge(`${statusMix[status]} ${STATUS_LABELS[status]}`, "status", status))
    .join("");
}

function renderActionLink(action, bodyClass, body, dataset = "") {
  const shared = `class="${bodyClass}" ${dataset}`;

  if (action.kind === "panel") {
    return `<button type="button" ${shared}>${body}</button>`;
  }

  if (action.kind === "external") {
    return `<a ${shared} href="${escapeHtml(action.href)}" target="_blank" rel="noreferrer">${body}</a>`;
  }

  return `<a ${shared} href="${escapeHtml(action.href)}">${body}</a>`;
}

function previewMarkup(kind) {
  return PREVIEWS[kind] || PREVIEWS.workspace;
}

function setTheme(theme = {}) {
  document.documentElement.style.setProperty("--theme-accent", theme.accent || "#3B82F6");
  document.documentElement.style.setProperty("--theme-shell", theme.shell || "#334155");
  document.documentElement.style.setProperty("--theme-surface", theme.surface || "#EFF6FF");
}

function openPanel(item) {
  const detail = item.detail || {};
  const relatedDocs = detail.relatedDocs || [];
  const actions = [];

  if (item.action?.kind && item.action.kind !== "panel") {
    actions.push(item.action);
  }
  actions.push(...(detail.actions || []));

  elements.panelType.textContent = TYPE_LABELS[item.type] || toTitleCase(item.type || "detail");
  elements.panelTitle.textContent = item.label;
  elements.panelSummary.textContent = detail.summary || item.description || "No extra detail has been recorded for this surface yet.";
  elements.panelBadges.innerHTML = [
    renderBadge(STATUS_LABELS[item.status] || toTitleCase(item.status || "planned"), "status", item.status || "planned"),
    renderBadge(TYPE_LABELS[item.type] || toTitleCase(item.type || "detail"), "type", item.type || "detail"),
  ].join("");
  elements.panelActions.innerHTML = actions.length
    ? actions
        .map((action) => {
          if (action.kind === "external") {
            return `<a class="panel-link" href="${escapeHtml(action.href)}" target="_blank" rel="noreferrer">${escapeHtml(action.label || "Open surface")}</a>`;
          }
          if (action.kind === "internal") {
            return `<a class="panel-link" href="${escapeHtml(action.href)}">${escapeHtml(action.label || "Open page")}</a>`;
          }
          return "";
        })
        .join("")
    : '<div class="panel-link">Detail only</div>';
  elements.panelMeta.innerHTML = (detail.meta || [])
    .map(
      (meta) => `
        <div class="panel-meta-item">
          <strong>${escapeHtml(meta.label)}</strong>
          <span>${escapeHtml(meta.value)}</span>
        </div>
      `,
    )
    .join("");
  elements.panelDocs.innerHTML = relatedDocs.length
    ? relatedDocs
        .map((doc) => `<div class="panel-doc">${escapeHtml(doc)}</div>`)
        .join("")
    : '<div class="panel-doc">No linked docs recorded for this surface.</div>';

  elements.panel.classList.add("is-open");
  elements.panel.setAttribute("aria-hidden", "false");
  elements.panelScrim.classList.add("is-visible");
}

function closePanel() {
  elements.panel.classList.remove("is-open");
  elements.panel.setAttribute("aria-hidden", "true");
  elements.panelScrim.classList.remove("is-visible");
}

function bindPanelOpeners(scope) {
  scope.querySelectorAll("[data-panel-key]").forEach((node) => {
    node.addEventListener("click", () => {
      const item = state.itemLookup.get(node.dataset.panelKey);
      if (item) {
        openPanel(item);
      }
    });
  });
}

function renderDirectory(directory) {
  const totalProjects = directory.entries.length;
  const totalAgents = directory.entries.reduce((sum, item) => sum + (item.counts.agents || 0), 0);
  const totalPrograms = directory.entries.reduce((sum, item) => sum + (item.counts.programs || 0), 0);
  const totalTiles = directory.entries.reduce((sum, item) => sum + (item.counts.totalTiles || 0), 0);

  elements.workspaceMode.textContent = "Project Overview";
  elements.workspaceSubline.textContent = "Portfolio directory for every governed project surface.";
  elements.pageEyebrow.textContent = "Portfolio directory";
  elements.pageTitle.textContent = "Project Overview";
  elements.pageSummary.textContent =
    "Use this directory as the portfolio jump point. Each project page keeps live, remote, planned, held, and archive surfaces equally visible so nothing disappears from navigation just because it is dormant.";
  document.title = "Project Overview - Agent Enterprise";
  renderHeroStats([
    { value: totalProjects, label: "Mapped projects", subline: "One detail page per major governed project." },
    { value: totalAgents, label: "Agent lanes", subline: "Master and task lanes surfaced from the current registry." },
    { value: totalPrograms, label: "Program roots", subline: "Registry programs and remote estates kept visible." },
    { value: totalTiles, label: "Navigation surfaces", subline: "Applications, endpoints, docs, sites, integrations, and holds." },
  ]);
  renderStatusStrip([
    { tone: "accent", value: "Equal visibility", label: "Stub, hold, and archive tiles stay first-class in the grid." },
    { tone: "info", value: "Real data", label: "Cards are fed from the current agent and program registries plus curated project surfaces." },
    { tone: "muted", value: "One-stop navigation", label: "Every tile resolves to an internal route, external surface, or an in-page detail panel." },
  ]);

  elements.projectSwitcherWrap.classList.remove("is-visible");
  elements.projectSwitcher.innerHTML = "";
  elements.directoryView.classList.add("is-visible");
  elements.detailView.classList.remove("is-visible");

  elements.directoryView.innerHTML = `
    <div class="directory-grid">
      ${directory.entries
        .map(
          (project) => `
            <a
              class="directory-card"
              href="${escapeHtml(project.href)}"
              style="--card-accent:${escapeHtml(project.theme.accent)};--card-surface:${escapeHtml(project.theme.surface)}"
            >
              <div class="directory-card-head">
                <div>
                  <div class="eyebrow">${escapeHtml(project.label)}</div>
                  <div class="directory-card-title">${escapeHtml(project.label)}</div>
                </div>
                <span class="badge" data-status="active">
                  <span class="badge-dot"></span>
                  ${escapeHtml(project.counts.totalTiles)} tiles
                </span>
              </div>
              <p class="directory-card-summary">${escapeHtml(project.summary)}</p>
              <div class="directory-card-kpis">
                <div class="directory-kpi">
                  <strong>${escapeHtml(project.counts.agents)}</strong>
                  <span>Agents</span>
                </div>
                <div class="directory-kpi">
                  <strong>${escapeHtml(project.counts.programs)}</strong>
                  <span>Programs</span>
                </div>
                <div class="directory-kpi">
                  <strong>${escapeHtml(project.counts.applications)}</strong>
                  <span>Apps</span>
                </div>
              </div>
              <div class="directory-card-status">${renderStatusMix(project.statusMix)}</div>
              <div class="card-link">Open project page <span aria-hidden="true">→</span></div>
            </a>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderFeaturedCards(project) {
  return project.featuredCards
    .map((card) => {
      const key = `featured:${card.id}`;
      state.itemLookup.set(key, card);
      const footer = `
        <div class="featured-footer">
          <span>${escapeHtml(card.title)}</span>
          <span class="featured-link">${escapeHtml(card.action.label || "Open")} <span aria-hidden="true">→</span></span>
        </div>
      `;

      return `
        <article class="featured-card">
          ${renderActionLink(
            card.action,
            "featured-action",
            `
              <div class="featured-content">
                <span class="featured-kicker">
                  <span class="featured-kicker-dot"></span>
                  ${escapeHtml(card.title)}
                </span>
                <h3>${escapeHtml(card.label)}</h3>
                <p>${escapeHtml(card.description)}</p>
              </div>
              <div class="featured-preview">${previewMarkup(card.previewKind)}</div>
              ${footer}
            `,
            card.action.kind === "panel" ? `data-panel-key="${escapeHtml(key)}"` : "",
          )}
        </article>
      `;
    })
    .join("");
}

function renderGridTiles(project) {
  return project.gridTiles
    .map((tile) => {
      const key = `tile:${tile.id}`;
      state.itemLookup.set(key, tile);
      const icon = TYPE_ICONS[tile.type] || TYPE_ICONS.application;

      return `
        <article class="grid-tile">
          ${renderActionLink(
            tile.action,
            "grid-action",
            `
              <div class="tile-top">
                <span class="tile-icon">${icon}</span>
                ${renderBadge(STATUS_LABELS[tile.status] || toTitleCase(tile.status), "status", tile.status)}
              </div>
              <div class="tile-copy">
                <div class="tile-label">${escapeHtml(tile.label)}</div>
                <div class="tile-description">${escapeHtml(tile.description)}</div>
              </div>
              <div class="tile-footer">
                <span class="tile-kind">${escapeHtml(TYPE_LABELS[tile.type] || tile.type)}</span>
                <span class="badge" data-type="action">
                  <span class="badge-dot"></span>
                  ${escapeHtml(tile.action.label || "Open")}
                </span>
              </div>
            `,
            tile.action.kind === "panel" ? `data-panel-key="${escapeHtml(key)}"` : "",
          )}
        </article>
      `;
    })
    .join("");
}

function renderProjectSwitcher(directory, currentId) {
  elements.projectSwitcherWrap.classList.add("is-visible");
  elements.projectSwitcher.innerHTML = directory.entries
    .map(
      (entry) => `
        <a href="${escapeHtml(entry.href)}" class="${entry.id === currentId ? "is-active" : ""}">
          ${escapeHtml(entry.label)}
        </a>
      `,
    )
    .join("");
}

function renderProject(project, directory) {
  state.itemLookup.clear();
  setTheme(project.theme);
  elements.workspaceMode.textContent = project.label;
  elements.workspaceSubline.textContent = `${project.counts.totalTiles} mapped surfaces across agents, programs, applications, endpoints, docs, and integrations.`;
  elements.pageEyebrow.textContent = project.hero.eyebrow;
  elements.pageTitle.textContent = project.hero.title;
  elements.pageSummary.textContent = project.hero.summary;
  document.title = `${project.label} - Project Overview - Agent Enterprise`;
  renderHeroStats([
    { value: project.counts.agents, label: "Agent lanes", subline: "Master and task lanes mapped from the registry." },
    { value: project.counts.programs, label: "Program roots", subline: "Program surfaces and remote estates tied to this project." },
    { value: project.counts.applications, label: "Apps + sites", subline: "Applications, sites, and repo surfaces kept navigable." },
    { value: project.counts.totalTiles, label: "Total tiles", subline: "Every grid tile resolves to a route, external surface, or detail panel." },
  ]);
  renderStatusStrip(project.statusStrip);
  renderProjectSwitcher(directory, project.id);
  elements.directoryView.classList.remove("is-visible");
  elements.detailView.classList.add("is-visible");
  elements.detailView.innerHTML = `
    <div class="feature-grid">
      ${renderFeaturedCards(project)}
      ${renderGridTiles(project)}
    </div>
  `;
  bindPanelOpeners(elements.detailView);
}

function renderError(message) {
  elements.directoryView.classList.add("is-visible");
  elements.detailView.classList.remove("is-visible");
  elements.projectSwitcherWrap.classList.remove("is-visible");
  elements.heroMeta.innerHTML = "";
  elements.statusStrip.innerHTML = "";
  elements.directoryView.innerHTML = `<div class="error-shell">${escapeHtml(message)}</div>`;
}

async function initProjectsPage() {
  try {
    const projectId = getProjectIdFromPath(window.location.pathname);
    const directory = await fetchJson(DIRECTORY_ENDPOINT);
    state.directory = directory;

    if (!projectId) {
      setTheme();
      renderDirectory(directory);
      return;
    }

    const project = await fetchJson(`${DIRECTORY_ENDPOINT}/${encodeURIComponent(projectId)}`);
    state.project = project;
    renderProject(project, directory);
  } catch (error) {
    setTheme();
    renderError(`Projects view failed to load: ${error.message}`);
  }
}

elements.panelClose?.addEventListener("click", closePanel);
elements.panelScrim?.addEventListener("click", closePanel);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePanel();
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initProjectsPage, { once: true });
} else {
  initProjectsPage();
}
