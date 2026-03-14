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

function currentAgentId() {
  const match = window.location.pathname.match(/^\/chat\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function currentSessionId() {
  return new URLSearchParams(window.location.search).get("session");
}

function currentTaskId() {
  return new URLSearchParams(window.location.search).get("task");
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed with ${response.status}`);
  }

  return response.json();
}

function renderAvatar(agent, size = "52px", className = "") {
  return `<span class="avatar ${className}" style="width:${size};height:${size};background-image:url('${escapeHtml(agent.avatarUrl)}')"></span>`;
}

function skillPills(skillDetails = [], missingSkills = [], limit = 4) {
  const resolved = skillDetails.slice(0, limit).map((skill) => {
    const scopeLabel = skill.scope === "project" ? "project" : "user";
    return `<span class="badge" data-tone="accent">${escapeHtml(skill.name)} · ${escapeHtml(scopeLabel)}</span>`;
  });
  const overflowCount = Math.max(0, skillDetails.length - limit);
  const missing = missingSkills.map(
    (skill) => `<span class="badge" data-tone="warning">${escapeHtml(skill)} missing</span>`,
  );

  if (overflowCount > 0) {
    resolved.push(`<span class="badge">+${overflowCount} more</span>`);
  }

  return [...resolved, ...missing].join("");
}

function renderSkillBadges(skillDetails = [], missingSkills = [], limit = 4) {
  const pills = skillPills(skillDetails, missingSkills, limit);
  return pills ? `<div class="badges skill-badges">${pills}</div>` : "";
}

function launcherMetrics(agents) {
  const totalSessions = agents.reduce((sum, agent) => sum + agent.sessionCount, 0);
  const activeSessions = agents.reduce(
    (sum, agent) => sum + agent.activeSessionCount,
    0,
  );
  const healthyAgents = agents.filter(
    (agent) => agent.health?.status === "healthy",
  ).length;

  return `
    <div class="hero-metrics">
      <div class="metric-pill">
        <strong>${agents.length}</strong>
        <span>Agent workspaces</span>
      </div>
      <div class="metric-pill">
        <strong>${totalSessions}</strong>
        <span>Total sessions</span>
      </div>
      <div class="metric-pill">
        <strong>${activeSessions}</strong>
        <span>Active sessions</span>
      </div>
      <div class="metric-pill">
        <strong>${healthyAgents}</strong>
        <span>Healthy agents</span>
      </div>
    </div>
  `;
}

function renderLauncherCard(agent) {
  return `
    <a class="agent-card" href="${escapeHtml(agent.chatHref)}" data-agent-card data-search="${escapeHtml(`${agent.name} ${agent.purpose} ${agent.kind}`.toLowerCase())}">
      <div class="card-head">
        ${renderAvatar(agent)}
        <div>
          <h2>${escapeHtml(agent.name)}</h2>
          <div class="task-meta">${escapeHtml(agent.kind)} · ${escapeHtml(agent.health?.status || "unknown")}</div>
        </div>
      </div>
      <p class="role-copy">${escapeHtml(agent.purpose || "No role summary available.")}</p>
      <div class="badges">
        <span class="badge" data-tone="accent">${agent.sessionCount} sessions</span>
        <span class="badge">${agent.activeSessionCount} active</span>
      </div>
      <div class="session-preview">
        ${escapeHtml(agent.latestSession?.preview || "No sessions yet. Start a new isolated workspace for this agent.")}
      </div>
      <div class="task-meta">
        ${agent.latestSession ? `Latest: ${escapeHtml(formatTimestamp(agent.latestSession.lastActivityAt))}` : "Open isolated workspace"}
      </div>
    </a>
  `;
}

function renderLauncher(agents) {
  return `
    <section class="launcher-view">
      <div class="hero-card">
        <div>
          <div class="eyebrow">Agent-scoped chat</div>
          <h1 class="hero-title">Choose an agent workspace</h1>
          <p class="hero-copy">
            Every agent owns its own sessions, model history, and context window. Task-linked work routes into the owning agent instead of opening a shared cross-agent chat shell.
          </p>
        </div>
        ${launcherMetrics(agents)}
      </div>

      <div class="launcher-toolbar">
        <label class="search-shell" aria-label="Search agents">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.35-4.35"></path></svg>
          <input id="agentSearchInput" type="search" placeholder="Search agents, roles, or families">
        </label>
        <div class="toolbar-note">Cards open isolated sessions under <code>/chat/:agentId</code>.</div>
      </div>

      <div id="agentGrid" class="agent-grid">
        ${agents.map(renderLauncherCard).join("")}
      </div>
    </section>
  `;
}

function taskNotice(task) {
  if (!task) {
    return "";
  }

  if (task.stage === "accepted" && task.approvalState === "pending_approval") {
    return `
      <div class="notice">
        This engineering request is still in review. Approve it here to hand it to engineer, or reject it to remove it from the active board.
      </div>
    `;
  }

  if (
    task.stage === "accepted" &&
    task.approvalState === "approved_waiting_for_engineer"
  ) {
    return `
      <div class="notice" data-tone="warning">
        Planning has been queued for engineer. The task remains in Accepted until engineer posts the first planning reply.
      </div>
    `;
  }

  return "";
}

function taskCard(task) {
  if (!task) {
    return "";
  }

  const skillBadges = renderSkillBadges(
    task.requestedSkillDetails || [],
    task.missingRequestedSkills || [],
    5,
  );

  return `
    <section class="task-card">
      <div class="eyebrow">Linked task</div>
      <div class="task-chip">
        <span class="badge" data-tone="accent">${escapeHtml(task.stageLabel)}</span>
        <span class="badge">${escapeHtml(task.approvalLabel)}</span>
      </div>
      <h2>${escapeHtml(task.title)}</h2>
      <p class="task-summary">${escapeHtml(task.summary)}</p>
      ${skillBadges ? `<div><div class="field-label">Specialty skills</div>${skillBadges}</div>` : ""}
      <div class="task-meta">
        Source: ${escapeHtml(task.sourceAgentName)} · Owner: ${escapeHtml(task.assignedAgentName || "Awaiting engineer")}
      </div>
    </section>
  `;
}

function workspaceActions(sessionPayload) {
  const task = sessionPayload?.linkedTask || null;
  if (!task?.availableActions) {
    return "";
  }

  const buttons = [];
  if (task.availableActions.approve) {
    buttons.push(
      `<button class="action-btn action-btn-primary" data-task-action="approve">Approve</button>`,
    );
  }
  if (task.availableActions.reject) {
    buttons.push(
      `<button class="action-btn action-btn-danger" data-task-action="reject">Reject</button>`,
    );
  }

  return buttons.join("");
}

function renderSessionOption(session, activeSessionId) {
  const labelParts = [session.title, session.modelLabel];
  if (session.taskTitle) {
    labelParts.push(session.taskTitle);
  }

  return `
    <option value="${escapeHtml(session.id)}"${session.id === activeSessionId ? " selected" : ""}>
      ${escapeHtml(labelParts.join(" · "))}
    </option>
  `;
}

function renderSessionLink(agentId, session, activeSessionId) {
  const skillBadges = renderSkillBadges(
    session.requestedSkillDetails || [],
    session.missingRequestedSkills || [],
    2,
  );

  return `
    <a
      class="session-link${session.id === activeSessionId ? " active" : ""}"
      href="/chat/${encodeURIComponent(agentId)}?session=${encodeURIComponent(session.id)}"
      data-session-link
      data-search="${escapeHtml(`${session.title} ${session.taskTitle || ""} ${(session.requestedSkills || []).join(" ")}`.toLowerCase())}"
    >
      <div class="session-title">${escapeHtml(session.title)}</div>
      <div class="session-meta">
        ${escapeHtml(session.sessionTypeLabel)} · ${escapeHtml(session.modelLabel)} · ${escapeHtml(formatTimestamp(session.lastActivityAt))}
      </div>
      <p class="session-preview">${escapeHtml(session.preview || "No messages yet.")}</p>
      <div class="badges">
        <span class="badge">${escapeHtml(session.status)}</span>
        ${session.taskTitle ? `<span class="badge" data-tone="accent">${escapeHtml(session.taskTitle)}</span>` : ""}
      </div>
      ${skillBadges}
    </a>
  `;
}

function renderMessage(message) {
  return `
    <article class="message-card" data-author="${escapeHtml(message.authorType)}">
      <div class="message-head">
        <div class="session-row">
          ${message.authorAvatarUrl ? renderAvatar({ avatarUrl: message.authorAvatarUrl }, "38px", "avatar-sm") : `<span class="avatar avatar-sm"></span>`}
          <div>
            <div class="message-author">${escapeHtml(message.authorLabel)}</div>
            <div class="message-meta">${escapeHtml(formatTimestamp(message.createdAt))}</div>
          </div>
        </div>
        <div class="message-kind">${escapeHtml(message.kind)}</div>
      </div>
      <p class="message-body">${escapeHtml(message.body)}</p>
      <div class="message-meta">
        ${message.usage?.source ? `Usage: ${escapeHtml(message.usage.source)} · ` : ""}${message.usage?.totalTokens ? `${message.usage.totalTokens} tokens` : "No usage telemetry"}
        ${message.isCompacted ? " · Compacted from live window" : ""}
      </div>
    </article>
  `;
}

function renderContext(context) {
  if (!context) {
    return `
      <div class="context-block">
        <div class="context-title">Context window</div>
        <p class="context-copy">Start a new session to begin tracking model context and compaction state.</p>
      </div>
    `;
  }

  const percent = Math.min(
    100,
    Math.round((context.estimatedUsedTokens / context.maxContextTokens) * 100),
  );
  const selectedSkills = context.selectedSkills || {
    items: [],
    missingRequestedSkills: [],
  };
  const skillBadges = renderSkillBadges(
    selectedSkills.items || [],
    selectedSkills.missingRequestedSkills || [],
    5,
  );

  return `
    <div class="context-block">
      <div class="eyebrow">Workspace status</div>
      <div class="context-title">${escapeHtml(context.provider.label)}</div>
      <p class="context-copy">${escapeHtml(context.provider.detail)}</p>
      <div class="context-grid">
        <div class="context-row"><span>Response mode</span><strong>${escapeHtml(context.provider.mode)}</strong></div>
        <div class="context-row"><span>Model id</span><strong>${escapeHtml(context.provider.modelId || "none")}</strong></div>
        <div class="context-row"><span>Packet root</span><strong>${escapeHtml(context.role.sourcePath || "none")}</strong></div>
        <div class="context-row"><span>Learned notes</span><strong>${context.learning?.recentNotes?.length || 0}</strong></div>
        <div class="context-row"><span>Selected skills</span><strong>${selectedSkills.items?.length || 0}</strong></div>
      </div>
      <p class="context-copy">${escapeHtml(context.role.purpose || "No role summary available.")}</p>
      ${skillBadges}
      ${
        context.learning?.recentNotes?.[0]
          ? `<p class="context-note">Latest learned note: ${escapeHtml(context.learning.recentNotes[0].note)}</p>`
          : ""
      }
    </div>
    <div class="context-block">
      <div class="eyebrow">Context window</div>
      <div class="context-title">${escapeHtml(context.modelLabel)}</div>
      <div class="context-meter"><span style="width:${percent}%"></span></div>
      <div class="context-grid">
        <div class="context-row"><span>Used</span><strong>${context.estimatedUsedTokens}</strong></div>
        <div class="context-row"><span>Remaining</span><strong>${context.estimatedRemainingTokens}</strong></div>
        <div class="context-row"><span>Reserved reply</span><strong>${context.reservedReplyTokens}</strong></div>
        <div class="context-row"><span>Accuracy</span><strong>${escapeHtml(context.accuracySource)}</strong></div>
      </div>
      <p class="context-note">
        ${context.compaction.lastCompactedAt ? `Last compacted ${escapeHtml(formatTimestamp(context.compaction.lastCompactedAt))}.` : "No compaction snapshot yet."}
      </p>
    </div>
    <div class="context-block">
      <div class="eyebrow">Compaction</div>
      <div class="context-title">Carryover summary</div>
      <p class="context-copy">
        ${escapeHtml(context.carryoverSummary?.text || "Compact the session to replace older live turns with a structured carryover packet while preserving full visible history.")}
      </p>
      <div class="context-grid">
        <div class="context-row"><span>Snapshots</span><strong>${context.compaction.snapshotCount}</strong></div>
        <div class="context-row"><span>Compacted messages</span><strong>${context.compaction.compactedMessageCount}</strong></div>
        <div class="context-row"><span>Live messages</span><strong>${context.compaction.liveMessageCount}</strong></div>
      </div>
      <button id="compactSessionButton" class="action-btn"${context.compaction.available ? "" : " disabled"}>Compact session</button>
    </div>
  `;
}

function renderSkillPanel(workspace, activeSessionPayload) {
  const linkedTask = activeSessionPayload?.linkedTask || workspace.selectedTask || null;
  const activeSession = activeSessionPayload?.session || null;
  const availableSkills = workspace.availableSkills || [];
  const selectedNames = new Set(
    linkedTask
      ? linkedTask.requestedSkills || []
      : activeSession?.requestedSkills || [],
  );
  const currentSkillBadges = renderSkillBadges(
    linkedTask
      ? linkedTask.requestedSkillDetails || []
      : activeSession?.requestedSkillDetails || [],
    linkedTask
      ? linkedTask.missingRequestedSkills || []
      : activeSession?.missingRequestedSkills || [],
    5,
  );
  const heading = linkedTask ? "Task skill loadout" : "Specialty skills";
  const note = linkedTask
    ? linkedTask.stage === "accepted"
      ? "Attach specialty skills now so engineer planning starts with the right context when you approve the task."
      : "These skills remain attached to the task across sessions and later delivery stages."
    : activeSession
      ? "Selected skills are added to future turns in this session."
      : "Pick skills before you create a new session, and the first prompt will start with that loadout.";
  const saveLabel = linkedTask ? "Save task skills" : "Save session skills";

  return `
    <section class="skill-picker">
      <div class="session-row skill-picker-head">
        <div>
          <label class="field-label" for="skillSearchInput">${escapeHtml(heading)}</label>
          <p class="skill-caption">${escapeHtml(note)}</p>
        </div>
        <span class="badge">${availableSkills.length} available</span>
      </div>
      <input
        id="skillSearchInput"
        class="text-input skill-search"
        type="search"
        placeholder="Search the skill library"
      >
      ${
        currentSkillBadges
          ? `<div><div class="field-label">Current selection</div>${currentSkillBadges}</div>`
          : '<p class="skill-caption">No specialty skills selected yet.</p>'
      }
      <div id="skillOptionList" class="skill-option-list">
        ${
          availableSkills.length
            ? availableSkills
              .map(
                (skill) => `
                  <label
                    class="skill-option"
                    data-skill-option
                    data-search="${escapeHtml(`${skill.name} ${skill.description || ""} ${skill.scope}`.toLowerCase())}"
                  >
                    <input type="checkbox" value="${escapeHtml(skill.name)}"${selectedNames.has(skill.name) ? " checked" : ""}>
                    <span class="skill-option-copy">
                      <span class="skill-option-title">${escapeHtml(skill.name)}</span>
                      <span class="skill-option-description">${escapeHtml(skill.scope)} · ${escapeHtml(skill.description || "No description available.")}</span>
                    </span>
                  </label>
                `,
              )
              .join("")
            : '<div class="empty-state skill-empty">No skills discovered yet in the current library.</div>'
        }
      </div>
      <div class="workspace-controls">
        ${
          linkedTask || activeSession
            ? `<button id="saveSkillSelectionButton" class="action-btn">${escapeHtml(saveLabel)}</button>`
            : '<div class="context-note">The current selection is applied when you create the next session.</div>'
        }
      </div>
    </section>
  `;
}

function renderWorkspace(workspace) {
  const agent = workspace.agent;
  const activeSessionPayload = workspace.activeSession;
  const activeSession = activeSessionPayload?.session || null;
  const linkedTask = activeSessionPayload?.linkedTask || workspace.selectedTask || null;
  const sessionSearchValue = "";
  const modelOptions = workspace.modelCatalog
    .map(
      (model) => `
        <option value="${escapeHtml(model.family)}"${activeSession?.modelFamily === model.family ? " selected" : ""}>
          ${escapeHtml(model.label)}
        </option>
      `,
    )
    .join("");

  return `
    <section class="workspace-view">
      <aside class="workspace-card workspace-sidebar">
        <section class="workspace-agent">
          <div class="session-row">
            ${renderAvatar(agent)}
            <div>
              <div class="eyebrow">${escapeHtml(agent.kind)} workspace</div>
              <h1>${escapeHtml(agent.name)}</h1>
            </div>
          </div>
          <p class="workspace-copy">${escapeHtml(agent.purpose || "No role summary available.")}</p>
          <div class="badges">
            <span class="badge" data-tone="accent">${agent.sessionCount} sessions</span>
            <span class="badge">${escapeHtml(agent.health?.status || "unknown")}</span>
          </div>
        </section>

        <section class="session-picker">
          <label class="field-label" for="sessionSearchInput">Browse sessions</label>
          <input id="sessionSearchInput" class="text-input" type="search" value="${sessionSearchValue}" placeholder="Search by title or task">
          <select id="sessionSelect" class="select-input">
            ${workspace.sessions.length ? workspace.sessions.map((session) => renderSessionOption(session, activeSession?.id || "")).join("") : '<option value="">No sessions yet</option>'}
          </select>
          <div class="workspace-controls">
            <button id="newSessionButton" class="action-btn action-btn-primary">New session</button>
            <a class="subtle-link" href="/chat">All agents</a>
          </div>
        </section>

        ${renderSkillPanel(workspace, activeSessionPayload)}

        <div id="sessionList" class="session-list">
          ${workspace.sessions.length ? workspace.sessions.map((session) => renderSessionLink(agent.id, session, activeSession?.id || "")).join("") : '<div class="empty-state">No sessions yet for this agent.</div>'}
        </div>
      </aside>

      <section class="workspace-card workspace-main">
        <div class="workspace-main-inner">
          <header class="workspace-topbar">
            <div>
              <div class="eyebrow">${activeSession ? escapeHtml(activeSession.sessionTypeLabel) : "No active session"}</div>
              <h2 class="workspace-title">${escapeHtml(activeSession?.title || `${agent.name} workspace`)}</h2>
              <p class="topbar-copy">
                ${activeSession ? `${escapeHtml(activeSession.modelLabel)} · ${escapeHtml(activeSession.status)} · ${escapeHtml(formatTimestamp(activeSession.updatedAt))}` : "Create a new session or select an existing one to start chatting."}
              </p>
            </div>
            <div class="toolbar-actions">
              <select id="modelSelect" class="select-input"${activeSession ? "" : " disabled"}>
                ${modelOptions}
              </select>
              <button id="forkModelButton" class="action-btn"${activeSession ? "" : " disabled"}>Continue on selected model</button>
              ${workspaceActions(activeSessionPayload)}
            </div>
          </header>

          ${taskNotice(linkedTask)}
          ${taskCard(linkedTask)}

          <section class="messages-panel">
            <div id="messagesStream" class="messages-stream">
              ${
                activeSessionPayload?.messages?.length
                  ? activeSessionPayload.messages.map(renderMessage).join("")
                  : '<div class="empty-state">No messages yet. Start the session below.</div>'
              }
            </div>

            <form id="composerForm" class="composer">
              <label class="field-label" for="composerInput">Message ${escapeHtml(agent.name)}</label>
              <textarea id="composerInput" placeholder="Write a message for ${escapeHtml(agent.name)}"${activeSession ? "" : " disabled"}></textarea>
              <div class="composer-footer">
                <div class="composer-meta">
                  ${workspace.context ? `${workspace.context.estimatedRemainingTokens} estimated tokens left before reserved reply budget.` : "Choose or create a session to start chatting."}
                </div>
                <button id="sendMessageButton" class="action-btn action-btn-primary"${activeSession ? "" : " disabled"}>Send</button>
              </div>
              <p id="workspaceError" class="inline-error" hidden></p>
            </form>
          </section>
        </div>
      </section>

      <aside class="workspace-card workspace-context">
        ${renderContext(workspace.context)}
      </aside>
    </section>
  `;
}

function bindLauncherInteractions() {
  const input = document.getElementById("agentSearchInput");
  const cards = [...document.querySelectorAll("[data-agent-card]")];

  if (!input) {
    return;
  }

  input.addEventListener("input", () => {
    const term = input.value.trim().toLowerCase();

    cards.forEach((card) => {
      const haystack = card.getAttribute("data-search") || "";
      card.hidden = term.length > 0 && !haystack.includes(term);
    });
  });
}

function workspaceHref(agentId, { sessionId = null, taskId = null } = {}) {
  const params = new URLSearchParams();
  if (sessionId) {
    params.set("session", sessionId);
  }
  if (taskId) {
    params.set("task", taskId);
  }
  const query = params.toString();
  return query ? `/chat/${encodeURIComponent(agentId)}?${query}` : `/chat/${encodeURIComponent(agentId)}`;
}

function updateDocumentTitle(title) {
  document.title = title ? `${title} - Agent Enterprise` : "Agent Chat - Agent Enterprise";
}

async function mountLauncher() {
  const root = document.getElementById("chatRoot");

  try {
    const payload = await fetchJson("/api/chat/agents");
    root.innerHTML = renderLauncher(payload.agents);
    bindLauncherInteractions();
    updateDocumentTitle("Agent Chat");
  } catch (error) {
    root.innerHTML = `<div class="error-state">${escapeHtml(error.message)}</div>`;
  }
}

async function performTaskAction(agentId, taskId, action) {
  const response = await fetchJson(`/api/tasks/${encodeURIComponent(taskId)}/${action}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: "{}",
  });

  if (action === "approve") {
    window.location.assign(response.task.chatHref);
    return;
  }

  window.location.assign(`/chat/${encodeURIComponent(agentId)}`);
}

async function mountWorkspace(agentId) {
  const root = document.getElementById("chatRoot");
  const taskId = currentTaskId();
  const sessionId = currentSessionId();
  const query = new URLSearchParams();
  if (taskId) {
    query.set("taskId", taskId);
  }
  if (sessionId) {
    query.set("sessionId", sessionId);
  }

  try {
    const workspace = await fetchJson(
      `/api/chat/agents/${encodeURIComponent(agentId)}/workspace${query.toString() ? `?${query.toString()}` : ""}`,
    );
    root.innerHTML = renderWorkspace(workspace);
    updateDocumentTitle(workspace.agent.name);

    const sessionSearchInput = document.getElementById("sessionSearchInput");
    const sessionList = [...document.querySelectorAll("[data-session-link]")];
    const sessionSelect = document.getElementById("sessionSelect");
    const activeSessionId = workspace.activeSession?.session?.id || null;
    const linkedTask = workspace.activeSession?.linkedTask || workspace.selectedTask || null;
    const skillSearchInput = document.getElementById("skillSearchInput");
    const skillOptions = [...document.querySelectorAll("[data-skill-option]")];
    const errorBox = document.getElementById("workspaceError");

    const showError = (message) => {
      errorBox.hidden = false;
      errorBox.textContent = message;
    };

    const collectSelectedSkills = () =>
      skillOptions
        .map((option) => option.querySelector("input"))
        .filter((input) => input?.checked)
        .map((input) => input.value);

    if (sessionSearchInput) {
      sessionSearchInput.addEventListener("input", () => {
        const term = sessionSearchInput.value.trim().toLowerCase();

        sessionList.forEach((link) => {
          const haystack = link.getAttribute("data-search") || "";
          link.hidden = term.length > 0 && !haystack.includes(term);
        });

        [...sessionSelect.options].forEach((option) => {
          const label = option.textContent.toLowerCase();
          option.hidden = term.length > 0 && !label.includes(term);
        });
      });
    }

    if (skillSearchInput) {
      skillSearchInput.addEventListener("input", () => {
        const term = skillSearchInput.value.trim().toLowerCase();

        skillOptions.forEach((option) => {
          const haystack = option.getAttribute("data-search") || "";
          option.hidden = term.length > 0 && !haystack.includes(term);
        });
      });
    }

    sessionSelect?.addEventListener("change", () => {
      if (sessionSelect.value) {
        window.location.assign(
          workspaceHref(agentId, { sessionId: sessionSelect.value, taskId: null }),
        );
      }
    });

    document.getElementById("newSessionButton")?.addEventListener("click", async () => {
      try {
        const modelFamily =
          document.getElementById("modelSelect")?.value ||
          workspace.modelCatalog[0]?.family ||
          "sonnet";
        const created = await fetchJson(
          `/api/chat/agents/${encodeURIComponent(agentId)}/sessions`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              modelFamily,
              sessionType: "general",
              requestedSkills: collectSelectedSkills(),
            }),
          },
        );

        window.location.assign(
          workspaceHref(agentId, { sessionId: created.session.id, taskId: null }),
        );
      } catch (error) {
        showError(error.message);
      }
    });

    document.getElementById("saveSkillSelectionButton")?.addEventListener("click", async () => {
      const requestedSkills = collectSelectedSkills();

      try {
        if (linkedTask?.id) {
          await fetchJson(`/api/tasks/${encodeURIComponent(linkedTask.id)}/skills`, {
            method: "PATCH",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({ requestedSkills }),
          });
        } else if (activeSessionId) {
          await fetchJson(
            `/api/chat/sessions/${encodeURIComponent(activeSessionId)}/skills`,
            {
              method: "PATCH",
              headers: {
                "content-type": "application/json",
              },
              body: JSON.stringify({ requestedSkills }),
            },
          );
        }

        await mountWorkspace(agentId);
      } catch (error) {
        showError(error.message);
      }
    });

    document.getElementById("forkModelButton")?.addEventListener("click", async () => {
      if (!activeSessionId) {
        return;
      }

      try {
        const modelFamily = document.getElementById("modelSelect")?.value || "";
        const forked = await fetchJson(
          `/api/chat/sessions/${encodeURIComponent(activeSessionId)}/fork-model`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({ modelFamily }),
          },
        );

        window.location.assign(
          workspaceHref(agentId, {
            sessionId: forked.session.id,
            taskId: forked.linkedTask?.id || taskId,
          }),
        );
      } catch (error) {
        showError(error.message);
      }
    });

    document.getElementById("compactSessionButton")?.addEventListener("click", async () => {
      if (!activeSessionId) {
        return;
      }

      try {
        await fetchJson(
          `/api/chat/sessions/${encodeURIComponent(activeSessionId)}/compact`,
          {
            method: "POST",
          },
        );
        await mountWorkspace(agentId);
      } catch (error) {
        showError(error.message);
      }
    });

    document.querySelectorAll("[data-task-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!workspace.activeSession?.linkedTask?.id) {
          return;
        }

        button.disabled = true;

        try {
          await performTaskAction(
            agentId,
            workspace.activeSession.linkedTask.id,
            button.getAttribute("data-task-action"),
          );
        } catch (error) {
          const errorBox = document.getElementById("workspaceError");
          errorBox.hidden = false;
          errorBox.textContent = error.message;
          button.disabled = false;
        }
      });
    });

    document.getElementById("composerForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const errorBox = document.getElementById("workspaceError");
      const composer = document.getElementById("composerInput");
      const message = composer.value.trim();

      if (!message || !activeSessionId) {
        return;
      }

      errorBox.hidden = true;

      try {
        await fetchJson(
          `/api/chat/sessions/${encodeURIComponent(activeSessionId)}/messages`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({ body: message }),
          },
        );
        composer.value = "";
        await mountWorkspace(agentId);
      } catch (error) {
        errorBox.hidden = false;
        errorBox.textContent = error.message;
      }
    });

    const messagesStream = document.getElementById("messagesStream");
    if (messagesStream) {
      messagesStream.scrollTop = messagesStream.scrollHeight;
    }
  } catch (error) {
    root.innerHTML = `<div class="error-state">${escapeHtml(error.message)}</div>`;
    updateDocumentTitle("Agent Chat");
  }
}

function initLiveRefresh() {
  const source = new EventSource("/api/work/events");
  let refreshTimer = null;

  const scheduleRefresh = () => {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      const agentId = currentAgentId();
      if (agentId) {
        mountWorkspace(agentId);
        return;
      }

      mountLauncher();
    }, 180);
  };

  source.addEventListener("work", scheduleRefresh);
  source.onmessage = scheduleRefresh;
}

function initChat() {
  const agentId = currentAgentId();
  if (agentId) {
    mountWorkspace(agentId);
  } else {
    mountLauncher();
  }
  initLiveRefresh();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initChat, { once: true });
} else {
  initChat();
}
