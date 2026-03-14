const RAIL_LINKS = [
  {
    key: "overview",
    href: "/overview",
    label: "Overview",
    icon: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  },
  {
    key: "kanban",
    href: "/kanban",
    label: "Kanban",
    icon: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6h5v12H4zM15 6h5v7h-5zM15 17h5v1h-5z"/></svg>',
  },
  {
    key: "programs",
    href: "/programs",
    label: "Programs",
    icon: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  },
  {
    key: "projects",
    href: "/projects",
    label: "Projects",
    icon: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 7h18M3 12h18M3 17h18"/></svg>',
  },
  {
    key: "chat",
    href: "/chat",
    label: "Chat",
    icon: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  },
];

const PATH_ALIASES = new Map([
  ["/overview", "overview"],
  ["/01-agent-overview.html", "overview"],
  ["/kanban", "kanban"],
  ["/02-kanban.html", "kanban"],
  ["/programs", "programs"],
  ["/03-program-visualisation.html", "programs"],
  ["/projects", "projects"],
  ["/04-project-overview.html", "projects"],
  ["/chat", "chat"],
  ["/05-agent-chat.html", "chat"],
]);

function renderRail(activeKey) {
  const links = RAIL_LINKS.map(
    (link) => `
      <a
        href="${link.href}"
        class="rail-btn${activeKey === link.key ? " active" : ""}"
        data-rail-link="${link.key}"
        aria-label="${link.label}"
        title="${link.label}"
        style="text-decoration:none"
      >
        ${link.icon}
      </a>
    `,
  ).join("");

  return `
    <a href="/" class="nav-logo" aria-label="Control Plane Home" title="Control Plane Home" style="text-decoration:none">
      <svg viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
    </a>
    ${links}
  `;
}

function replaceBrandText(selector) {
  document.querySelectorAll(selector).forEach((element) => {
    const updated = element.textContent.replace(/AI Enterprise/g, "Agent Enterprise");
    if (updated !== element.textContent) {
      element.textContent = updated;
    }
  });
}

function initDashboardRail() {
  const rail = document.querySelector(".nav-rail");
  if (!rail) {
    return;
  }

  const path = window.location.pathname;
  const activeKey =
    PATH_ALIASES.get(path) ||
    (path.startsWith("/chat/")
      ? "chat"
      : path.startsWith("/projects/")
        ? "projects"
        : "overview");
  rail.innerHTML = renderRail(activeKey);
  rail.setAttribute("data-dashboard-rail", "true");

  replaceBrandText(".nav-brand");
  replaceBrandText(".workspace-pill");

  if (document.title.includes("AI Enterprise")) {
    document.title = document.title.replace("AI Enterprise", "Agent Enterprise");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDashboardRail, { once: true });
} else {
  initDashboardRail();
}

export { initDashboardRail };
