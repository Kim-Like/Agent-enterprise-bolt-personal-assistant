const STAGE_THEME = {
  accepted: {
    accent: "#F97316",
    background: "#FFF7ED",
    border: "#FED7AA",
  },
  planned: {
    accent: "#3B82F6",
    background: "#EFF6FF",
    border: "#BFDBFE",
  },
  in_development: {
    accent: "#8B5CF6",
    background: "#F5F3FF",
    border: "#DDD6FE",
  },
  testing: {
    accent: "#F59E0B",
    background: "#FFFBEB",
    border: "#FDE68A",
  },
  completed: {
    accent: "#16A34A",
    background: "#F0FDF4",
    border: "#BBF7D0",
  },
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatTimestamp(value) {
  if (!value) {
    return "No activity";
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function renderSkillBadges(task) {
  const skillDetails = task.requestedSkillDetails || [];
  const missingSkills = task.missingRequestedSkills || [];
  const resolved = skillDetails.slice(0, 3).map(
    (skill) =>
      `<span class="task-badge">${escapeHtml(skill.name)}</span>`,
  );
  const overflowCount = Math.max(0, skillDetails.length - 3);

  if (overflowCount > 0) {
    resolved.push(`<span class="task-badge">+${overflowCount} more</span>`);
  }

  for (const skill of missingSkills) {
    resolved.push(`<span class="task-badge task-badge-warning">${escapeHtml(skill)} missing</span>`);
  }

  return resolved.length
    ? `<div class="task-badges">${resolved.join("")}</div>`
    : "";
}

function renderCard(task) {
  return `
    <a class="task-card" href="${escapeHtml(task.chatHref)}">
      <div class="task-title">${escapeHtml(task.title)}</div>
      <div class="task-summary">${escapeHtml(task.summary)}</div>
      ${renderSkillBadges(task)}
      <dl class="task-meta">
        <div class="task-meta-row">
          <dt>Source</dt>
          <dd>${escapeHtml(task.sourceAgentName)}</dd>
        </div>
        <div class="task-meta-row">
          <dt>Status</dt>
          <dd>${escapeHtml(task.approvalLabel)}</dd>
        </div>
        <div class="task-meta-row">
          <dt>Owner</dt>
          <dd>${escapeHtml(task.assignedAgentName || "Awaiting engineer")}</dd>
        </div>
      </dl>
      <div class="task-footer">
        <span class="task-stamp">${escapeHtml(formatTimestamp(task.updatedAt))}</span>
        <span class="task-link">Open chat</span>
      </div>
    </a>
  `;
}

function renderColumn(column) {
  const theme = STAGE_THEME[column.id] || STAGE_THEME.accepted;
  const cards = column.tasks.length
    ? column.tasks.map(renderCard).join("")
    : `<div class="column-empty">No tasks in ${escapeHtml(column.label.toLowerCase())}.</div>`;

  return `
    <section
      class="column"
      style="--column-accent:${theme.accent};--column-bg:${theme.background};--column-border:${theme.border};"
    >
      <header class="column-header">
        <div class="column-heading">
          <span class="column-dot"></span>
          <span class="column-title">${escapeHtml(column.label)}</span>
        </div>
        <span class="column-count">${column.count}</span>
      </header>
      <div class="column-stack">${cards}</div>
    </section>
  `;
}

function updateSummary(payload) {
  const total = document.getElementById("kanbanTotal");
  const pending = document.getElementById("kanbanPending");
  const queued = document.getElementById("kanbanQueued");
  const completed = document.getElementById("kanbanCompleted");
  const meta = document.getElementById("kanbanMeta");

  total.textContent = `${payload.counts.totalActive}`;
  pending.textContent = `${payload.counts.pendingApproval}`;
  queued.textContent = `${payload.counts.queuedForEngineer}`;
  completed.textContent = `${payload.counts.completed}`;
  meta.textContent = `${payload.columns.length} columns wired to the live task registry.`;
}

async function loadKanban() {
  const board = document.getElementById("kanbanBoard");
  const error = document.getElementById("kanbanError");

  try {
    const response = await fetch("/api/kanban");
    if (!response.ok) {
      throw new Error(`Kanban request failed with ${response.status}`);
    }

    const payload = await response.json();
    updateSummary(payload);
    board.innerHTML = payload.columns.map(renderColumn).join("");
    error.hidden = true;
  } catch (loadError) {
    board.innerHTML = "";
    error.hidden = false;
    error.textContent = loadError.message;
  }
}

function initLiveRefresh() {
  const source = new EventSource("/api/work/events");
  let refreshTimer = null;

  const scheduleRefresh = () => {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      loadKanban();
    }, 120);
  };

  source.addEventListener("work", scheduleRefresh);
  source.onmessage = scheduleRefresh;
}

function initKanban() {
  loadKanban();
  initLiveRefresh();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initKanban, { once: true });
} else {
  initKanban();
}
