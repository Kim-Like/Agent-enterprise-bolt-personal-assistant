function internalAction(href, label = "Open page") {
  return {
    kind: "internal",
    href,
    label,
  };
}

function externalAction(href, label = "Open surface") {
  return {
    kind: "external",
    href,
    label,
  };
}

function panelAction(label = "View details") {
  return {
    kind: "panel",
    label,
  };
}

function detail(summary, meta = [], actions = [], relatedDocs = []) {
  return {
    summary,
    meta,
    actions,
    relatedDocs,
  };
}

function meta(label, value) {
  return { label, value };
}

const DOCS_ROOT = "docs";
const PROGRAMS_ROOT = "programs";
const AGENT_ROOT = "agents";
const ARTISAN_ROOT = `${PROGRAMS_ROOT}/artisan/the-artisan-wp`;
const ARTISAN_AGENT_ROOT = `${AGENT_ROOT}/artisan/artisan-master`;
const BALTZER_ROOT = `${AGENT_ROOT}/baltzer/baltzer-master`;
const LAVPRIS_ROOT = `${PROGRAMS_ROOT}/lavprishjemmeside`;
const PA_ROOT = `${PROGRAMS_ROOT}/personal-assistant`;
const SAMLINO_ROOT =
  `${PROGRAMS_ROOT}/ian-agency/contexts/samlino/seo-agent-playground`;
const SAMLINO_AGENT_ROOT = `${AGENT_ROOT}/samlino/samlino-master`;

const PROJECT_ORDER = [
  "ian-agency",
  "artisan",
  "baltzer",
  "lavprishjemmeside",
  "personal-assistant",
  "samlino",
];

const PROJECT_DEFINITIONS = {
  "ian-agency": {
    id: "ian-agency",
    label: "IAn Agency",
    summary:
      "Portfolio governance, orchestration, and platform operations across the full estate.",
    masterAgentId: "ian-master",
    theme: {
      accent: "#EF4444",
      shell: "#7F1D1D",
      surface: "#FEF2F2",
    },
    hero: {
      eyebrow: "Portfolio control layer",
      title: "Navigate the full operating model.",
      summary:
        "IAn Agency is the portfolio root. It links the control plane, governance lanes, platform interfaces, and context-heavy workspaces that sit above individual client projects.",
    },
    featuredCards: [
      {
        id: "ian-primary-workspace",
        title: "Primary Workspace",
        label: "Mission Control",
        previewKind: "workspace",
        description:
          "Open the control-plane workboard used for portfolio execution, review, and governed delivery.",
        action: internalAction("/workboard", "Open workboard"),
      },
      {
        id: "ian-docs",
        title: "Docs & Runbooks",
        label: "Governance Docs",
        previewKind: "docs",
        description:
          "Portfolio structure, repository governance, agent hierarchy, and the orchestration target model.",
        action: panelAction("View governance docs"),
        detail: detail(
          "The IAn Agency page is anchored in the legacy portfolio structure, agent hierarchy, and repository topology docs.",
          [
            meta("Primary scope", "Governance + orchestration"),
            meta("Top-level projects", "Artisan, Baltzer, Lavprishjemmeside, Personal Assistant"),
            meta("Context workspace", "Samlino"),
          ],
          [],
          [
            `${DOCS_ROOT}/portfolio-structure.md`,
            `${DOCS_ROOT}/agent-hierarchy.md`,
            `${DOCS_ROOT}/repository-governance.md`,
            `AI-ENTERPRISE-VISION-PROMPT-v2.md`,
          ],
        ),
      },
      {
        id: "ian-work-and-agents",
        title: "Work & Agents",
        label: "Portfolio lanes",
        previewKind: "agents",
        description:
          "Jump into portfolio Kanban, review agent workspaces, and route work into engineer or governance lanes.",
        action: internalAction("/kanban", "Open Kanban"),
      },
      {
        id: "ian-data-integrations",
        title: "Data & Integrations",
        label: "Control State",
        previewKind: "data",
        description:
          "Queue state, execution history, error ownership, and the model/context control surfaces that support the control plane.",
        action: panelAction("View control state"),
        detail: detail(
          "IAn Agency owns the orchestration state model. Business data stays in app-native systems, while queue, errors, and execution history remain centralized.",
          [
            meta("Core state", "task queue, error log, execution history"),
            meta("Model control", "/api/models/catalog and thread context routes"),
            meta("Visibility", "/api/tasks, /api/errors, /api/agents, /api/system-map"),
          ],
        ),
      },
    ],
    statusStrip: [
      { tone: "accent", value: "Portfolio root", label: "6 mapped project pages" },
      { tone: "info", value: "Platform interfaces", label: "Queue, runtime, agent, and model control" },
      { tone: "muted", value: "Context-linked", label: "Samlino remains visible without becoming the portfolio root" },
    ],
    agentSurfaces: [
      {
        agentId: "father",
        label: "father (IAn)",
        description:
          "Top-level orchestrator for portfolio routing and priority decisions.",
      },
      {
        agentId: "ian-master",
        label: "IAn Master",
        description:
          "Governance, standards, PMO, QA gates, and cross-program ownership.",
      },
      {
        agentId: "engineer",
        label: "Engineer",
        description:
          "Platform engineering, reliability, integrations, and escalation authority.",
      },
      {
        agentId: "portfolio-pmo-task",
        type: "task-lane",
        label: "Portfolio PMO",
        description:
          "Dependency tracking, roadmap shape, and cross-program planning.",
      },
      {
        agentId: "automation-quality-task",
        type: "task-lane",
        label: "Automation Quality",
        description:
          "Regression policy, verification, and readiness gates.",
      },
      {
        agentId: "ian-implementation-task",
        type: "task-lane",
        label: "Implementation Lane",
        description:
          "Scoped execution work on platform and portfolio needs.",
      },
      {
        agentId: "ian-research-task",
        type: "task-lane",
        label: "Research Lane",
        description:
          "Research support for decisions, standards, and portfolio change.",
      },
    ],
    programSurfaces: [
      {
        programId: "ian-agency",
        label: "IAn Agency Program Root",
        description:
          "Portfolio governance manifest and top-level project directory.",
      },
    ],
    applicationSurfaces: [
      {
        id: "ian-control-plane",
        kind: "application",
        label: "IAn Control Plane",
        description:
          "Single-process dashboard and operator entry point for the rebuilt monorepo.",
        status: "active",
        action: internalAction("/", "Open control-plane home"),
        detail: detail(
          "The control plane is the current live application boundary for Agent Enterprise.",
          [
            meta("Route", "/"),
            meta("Mode", "single-process-control-plane"),
            meta("Entry", "Node + SQLite"),
          ],
        ),
      },
      {
        id: "ian-mission-control",
        kind: "application",
        label: "Mission Control",
        description:
          "Portfolio workboard and the closest current replacement for the legacy mission-control surface.",
        status: "active",
        action: internalAction("/workboard", "Open mission control"),
      },
      {
        id: "ian-samlino-context",
        kind: "application",
        label: "Samlino Context",
        description:
          "Context-linked product workspace carried under IAn Agency without replacing the dedicated Samlino page.",
        status: "active",
        action: internalAction("/projects/samlino", "Open Samlino page"),
      },
    ],
    endpointSurfaces: [
      {
        id: "endpoint-api-tasks",
        kind: "endpoint",
        label: "Task Queue API",
        description: "Queue intake, approval, transition, and lifecycle visibility.",
        status: "active",
        action: panelAction("View endpoint contract"),
        detail: detail(
          "The task queue is the canonical work intake surface for routed objectives and engineer delivery.",
          [meta("Primary route", "/api/tasks"), meta("Related page", "/kanban")],
        ),
      },
      {
        id: "endpoint-api-errors",
        kind: "endpoint",
        label: "Error Ownership",
        description: "Error visibility and blocker ownership for portfolio execution.",
        status: "active",
        action: panelAction("View endpoint contract"),
        detail: detail(
          "Legacy IAn tooling treats error visibility and ownership as core portfolio control responsibilities.",
          [meta("Primary route", "/api/errors"), meta("Owner", "ian-master + engineer")],
        ),
      },
      {
        id: "endpoint-api-agents",
        kind: "endpoint",
        label: "Agent Inventory",
        description: "Registry-backed view of master lanes, tasks, and health state.",
        status: "active",
        action: internalAction("/agents", "Open agent inventory"),
      },
      {
        id: "endpoint-api-system-map",
        kind: "endpoint",
        label: "System Map",
        description: "Current single-process runtime topology and brownfield holds.",
        status: "active",
        action: internalAction("/programs", "Open program inventory"),
      },
      {
        id: "endpoint-health",
        kind: "endpoint",
        label: "Health Check",
        description: "Runtime, storage, and agent summary health entry point.",
        status: "active",
        action: panelAction("View endpoint contract"),
        detail: detail(
          "The health route exposes single-process runtime state, SQLite connection, and agent activation counts.",
          [meta("Route", "/health"), meta("Kind", "runtime status")],
        ),
      },
      {
        id: "endpoint-runtime-meta",
        kind: "endpoint",
        label: "Runtime Metadata",
        description: "Same-origin delivery, page catalog, and inventory snapshot.",
        status: "active",
        action: panelAction("View endpoint contract"),
        detail: detail(
          "Meta is the canonical system summary for the current dashboard build.",
          [meta("Route", "/api/meta"), meta("Kind", "system metadata")],
        ),
      },
    ],
    docSurfaces: [
      {
        id: "doc-portfolio-structure",
        kind: "doc",
        label: "Portfolio Structure",
        description:
          "Legacy structure document for top-level projects and IAn Agency contexts.",
        status: "active",
        action: panelAction("View doc details"),
        detail: detail(
          "Defines IAn Agency as the governing layer and describes the top-level project lanes plus Samlino as context.",
          [meta("Repo path", `${DOCS_ROOT}/portfolio-structure.md`)],
          [],
          [`${DOCS_ROOT}/portfolio-structure.md`],
        ),
      },
      {
        id: "doc-agent-hierarchy",
        kind: "doc",
        label: "Agent Hierarchy",
        description:
          "Legacy mapping between father, engineer, and domain masters.",
        status: "active",
        action: panelAction("View doc details"),
        detail: detail(
          "Explains the master roster and the canonical packet locations from the legacy system.",
          [meta("Repo path", `${DOCS_ROOT}/agent-hierarchy.md`)],
          [],
          [`${DOCS_ROOT}/agent-hierarchy.md`],
        ),
      },
      {
        id: "doc-repository-governance",
        kind: "doc",
        label: "Repository Governance",
        description:
          "Remote-first repo topology and the rule against nested live repos in the control plane.",
        status: "active",
        action: panelAction("View doc details"),
        detail: detail(
          "Repository governance defines Git as source of truth and keeps remote client repos outside the main control-plane tree.",
          [meta("Repo path", `${DOCS_ROOT}/repository-governance.md`)],
          [],
          [`${DOCS_ROOT}/repository-governance.md`],
        ),
      },
    ],
    integrationSurfaces: [
      {
        id: "integration-model-control",
        kind: "integration",
        label: "Model Catalog",
        description:
          "Model and context-control surfaces for thread-level reasoning and compacting.",
        status: "active",
        action: panelAction("View model surfaces"),
        detail: detail(
          "Legacy control surfaces include model catalog, thread context usage, and carryover refresh endpoints.",
          [
            meta("Catalog", "/api/models/catalog"),
            meta("Context", "/api/chat/sessions/:sessionId/context"),
            meta("Compaction", "/api/chat/sessions/:sessionId/compact"),
          ],
        ),
      },
      {
        id: "integration-workspace-overview",
        kind: "integration",
        label: "Workspace Overview APIs",
        description:
          "Cross-project overviews that feed the dashboard and delivery lanes.",
        status: "active",
        action: internalAction("/overview", "Open overview"),
      },
    ],
    dataSurfaces: [
      {
        id: "data-task-queue",
        kind: "data-store",
        label: "Task Queue",
        description:
          "Canonical orchestration work queue for objectives and engineer handoff.",
        status: "active",
        action: panelAction("View queue details"),
      },
      {
        id: "data-execution-history",
        kind: "data-store",
        label: "Execution History",
        description:
          "Historical execution and review trace used for throughput and quality.",
        status: "active",
        action: panelAction("View execution history details"),
      },
      {
        id: "data-error-log",
        kind: "data-store",
        label: "Error Ownership",
        description:
          "Blocker accountability and escalation history across the portfolio.",
        status: "active",
        action: panelAction("View error ownership details"),
      },
    ],
  },
  artisan: {
    id: "artisan",
    label: "Artisan",
    summary:
      "Cafe operations, WordPress/B2B workflows, reporting, accounting, and lifecycle marketing.",
    masterAgentId: "artisan-master",
    theme: {
      accent: "#22C55E",
      shell: "#14532D",
      surface: "#F0FDF4",
    },
    hero: {
      eyebrow: "Cafe systems",
      title: "Reporting, WordPress, and B2B in one place.",
      summary:
        "Artisan is operations-heavy. The page needs to expose reporting, WordPress/B2B operations, lifecycle marketing, and the tool contracts that support daily execution.",
    },
    featuredCards: [
      {
        id: "artisan-primary-workspace",
        title: "Primary Workspace",
        label: "Artisan Master",
        previewKind: "workspace",
        description:
          "Open the Artisan master workspace for day-to-day routing, status, and decisions.",
        action: internalAction("/chat/artisan-master", "Open Artisan workspace"),
      },
      {
        id: "artisan-docs",
        title: "Docs & Runbooks",
        label: "WP Ops Docs",
        previewKind: "docs",
        description:
          "Operational runbooks, B2B maps, and WordPress/database documentation from the legacy system.",
        action: panelAction("View runbooks"),
        detail: detail(
          "Artisan’s strongest legacy documentation sits in the WordPress program folder and the master tool/runbook packets.",
          [
            meta("WP runbook", `${ARTISAN_ROOT}/OPERATIONS_RUNBOOK.md`),
            meta("B2B function map", `${ARTISAN_ROOT}/B2B_FUNCTION_MAP.md`),
            meta("Database map", `${ARTISAN_ROOT}/DATABASE_MAP.md`),
          ],
          [],
          [
            `${ARTISAN_ROOT}/OPERATIONS_RUNBOOK.md`,
            `${ARTISAN_ROOT}/B2B_FUNCTION_MAP.md`,
            `${ARTISAN_ROOT}/DATABASE_MAP.md`,
            `${ARTISAN_AGENT_ROOT}/ARCHITECTURE.md`,
            `${ARTISAN_AGENT_ROOT}/tools.md`,
          ],
        ),
      },
      {
        id: "artisan-work",
        title: "Work & Agents",
        label: "Cafe delivery",
        previewKind: "agents",
        description:
          "Follow intake, Kanban, and the three execution lanes tied to reporting, B2B, and Brevo lifecycle work.",
        action: internalAction("/kanban", "Open Kanban"),
      },
      {
        id: "artisan-data",
        title: "Data & Integrations",
        label: "Ops connectors",
        previewKind: "data",
        description:
          "Billy, Brevo, WordPress, cPanel, and MySQL are the operational integration surfaces that shape this project.",
        action: panelAction("View connectors"),
      },
    ],
    statusStrip: [
      { tone: "accent", value: "3 execution lanes", label: "Accounting, WP/B2B, lifecycle" },
      { tone: "info", value: "Ops-heavy", label: "WordPress diagnostics and intake classification" },
      { tone: "muted", value: "Mixed runtime", label: "Local reporting + remote WordPress + planned email workspace" },
    ],
    agentSurfaces: [
      {
        agentId: "artisan-master",
        label: "Artisan Master",
        description:
          "Domain master for reporting, WP/B2B, Brevo, and accounting integration.",
      },
      {
        agentId: "artisan-accounting-integration-task",
        type: "task-lane",
        label: "Accounting Integration",
        description:
          "Billy-backed accounting and reporting synchronization lane.",
      },
      {
        agentId: "artisan-wp-b2b-task",
        type: "task-lane",
        label: "WP + B2B",
        description:
          "WordPress, B2B access, catalog, checkout, and order operations lane.",
      },
      {
        agentId: "artisan-brevo-lifecycle-task",
        type: "task-lane",
        label: "Brevo Lifecycle",
        description:
          "Campaign and lifecycle automation lane for email and customer journeys.",
      },
    ],
    programSurfaces: [
      {
        programId: "artisan-reporting",
        label: "Artisan Reporting",
        description:
          "Billy-backed reporting dashboard and accounting surface.",
      },
      {
        programId: "artisan-wordpress",
        label: "Artisan WordPress",
        description:
          "Remote WordPress and WooCommerce surface with B2B operations tooling.",
      },
      {
        programId: "artisan-email-marketing",
        label: "Email Marketing",
        description:
          "Lifecycle marketing workspace and campaign lane placeholder.",
      },
    ],
    applicationSurfaces: [
      {
        id: "artisan-reporting-app",
        kind: "application",
        label: "Reporting App",
        description:
          "Primary reporting application for Artisan financial and operational visibility.",
        status: "active",
        action: externalAction("https://reporting.theartisan.dk", "Open reporting site"),
      },
      {
        id: "artisan-wordpress-site",
        kind: "application",
        label: "WordPress Site",
        description:
          "The live WordPress commerce surface governing theme, B2B, and checkout work.",
        status: "remote",
        action: panelAction("View site details"),
        detail: detail(
          "The WordPress site is remote-governed and operated through inventory, SSH checks, and controlled actions.",
          [meta("Program", "artisan-wordpress"), meta("Surface", "WordPress + WooCommerce")],
        ),
      },
      {
        id: "artisan-b2b-dashboard-orders",
        kind: "application",
        label: "B2B Orders Dashboard",
        description:
          "Legacy placeholder for B2B order oversight inside the WordPress domain.",
        status: "stub",
        action: panelAction("View placeholder details"),
      },
    ],
    endpointSurfaces: [
      {
        id: "artisan-wordpress-inventory",
        kind: "endpoint",
        label: "WP Inventory",
        description:
          "Canonical inventory endpoint for the Artisan WordPress estate.",
        status: "active",
        action: panelAction("View endpoint contract"),
        detail: detail(
          "Use the inventory route as the source of truth for the WordPress/B2B operational snapshot.",
          [meta("Route", "GET /api/programs/artisan-wordpress/inventory")],
        ),
      },
      {
        id: "artisan-wordpress-ssh-check",
        kind: "endpoint",
        label: "SSH Diagnostics",
        description:
          "Deterministic diagnostics endpoint for repo, DB, and theme/plugin checks.",
        status: "active",
        action: panelAction("View endpoint contract"),
        detail: detail(
          "The SSH check route is the supported diagnostic entry for Artisan WordPress operations.",
          [meta("Route", "POST /api/programs/artisan-wordpress/ssh-check")],
        ),
      },
      {
        id: "artisan-wordpress-ops-action",
        kind: "endpoint",
        label: "Controlled Ops Action",
        description:
          "Allowlisted operational action interface for managed WordPress changes.",
        status: "active",
        action: panelAction("View endpoint contract"),
        detail: detail(
          "Write actions stay behind the controlled ops endpoint instead of free-form shell access.",
          [meta("Route", "POST /api/programs/artisan-wordpress/ops-action")],
        ),
      },
      {
        id: "artisan-intake-classify",
        kind: "endpoint",
        label: "Daily Intake Classification",
        description:
          "Legacy intake classifier for routing daily requests to the right Artisan lane.",
        status: "active",
        action: panelAction("View endpoint contract"),
        detail: detail(
          "The intake classifier assigns requests into content, catalog, B2B access, order issues, checkout issues, design adjustment, or incident buckets.",
          [meta("Route", "POST /api/workspace/artisan/intake-classify")],
        ),
      },
    ],
    docSurfaces: [
      {
        id: "artisan-runbook",
        kind: "doc",
        label: "Operations Runbook",
        description:
          "Operational procedures for WordPress/B2B work and controlled interventions.",
        status: "active",
        action: panelAction("View doc details"),
        detail: detail(
          "The operations runbook is the primary WP/B2B operational playbook.",
          [meta("Legacy path", `${ARTISAN_ROOT}/OPERATIONS_RUNBOOK.md`)],
          [],
          [`${ARTISAN_ROOT}/OPERATIONS_RUNBOOK.md`],
        ),
      },
      {
        id: "artisan-b2b-map",
        kind: "doc",
        label: "B2B Function Map",
        description:
          "Plugin paths, operational ownership, and B2B-specific behavior mapping.",
        status: "active",
        action: panelAction("View doc details"),
        detail: detail(
          "Explains the B2B portal plugin and operational roles across Artisan.",
          [meta("Legacy path", `${ARTISAN_ROOT}/B2B_FUNCTION_MAP.md`)],
          [],
          [`${ARTISAN_ROOT}/B2B_FUNCTION_MAP.md`],
        ),
      },
      {
        id: "artisan-db-map",
        kind: "doc",
        label: "Database Map",
        description:
          "Database structures and operational data map for the WordPress domain.",
        status: "active",
        action: panelAction("View doc details"),
        detail: detail(
          "Maps the WordPress/B2B database surface and related control routes.",
          [meta("Legacy path", `${ARTISAN_ROOT}/DATABASE_MAP.md`)],
          [],
          [`${ARTISAN_ROOT}/DATABASE_MAP.md`],
        ),
      },
    ],
    integrationSurfaces: [
      {
        id: "artisan-billy",
        kind: "integration",
        label: "Billy API",
        description:
          "Accounting and reporting connector used for reconciliation and dashboard sync.",
        status: "active",
        action: panelAction("View connector details"),
      },
      {
        id: "artisan-brevo",
        kind: "integration",
        label: "Brevo",
        description:
          "Campaign, contact, and lifecycle automation tooling for Artisan marketing.",
        status: "active",
        action: panelAction("View connector details"),
      },
      {
        id: "artisan-cpanel",
        kind: "integration",
        label: "cPanel Controls",
        description:
          "SSH and deployment controls for the remote WordPress environment.",
        status: "remote",
        action: panelAction("View connector details"),
      },
      {
        id: "artisan-mysql",
        kind: "data-store",
        label: "MySQL",
        description:
          "Primary data store for the reporting and WordPress operations surfaces.",
        status: "active",
        action: panelAction("View datastore details"),
      },
    ],
  },
  baltzer: {
    id: "baltzer",
    label: "Baltzer",
    summary:
      "Ecommerce, reporting, pricing intelligence, and the placeholder operational tracks around the Baltzer estate.",
    masterAgentId: "baltzer-master",
    theme: {
      accent: "#F59E0B",
      shell: "#7C2D12",
      surface: "#FFF7ED",
    },
    hero: {
      eyebrow: "Ecommerce operations",
      title: "Shopify, reporting, and the latent Baltzer stack.",
      summary:
        "Baltzer combines active reporting with Shopify-adjacent work and several placeholder product tracks. The page should keep every operational and planned surface visible in one place.",
    },
    featuredCards: [
      {
        id: "baltzer-primary-workspace",
        title: "Primary Workspace",
        label: "Baltzer Master",
        previewKind: "workspace",
        description:
          "Open the Baltzer master workspace for ecommerce and operations routing.",
        action: internalAction("/chat/baltzer-master", "Open Baltzer workspace"),
      },
      {
        id: "baltzer-docs",
        title: "Docs & Runbooks",
        label: "Ops contracts",
        previewKind: "docs",
        description:
          "Architecture, tooling, and the TCG migration-hold context preserved from the legacy system.",
        action: panelAction("View docs"),
      },
      {
        id: "baltzer-work",
        title: "Work & Agents",
        label: "Operational lanes",
        previewKind: "agents",
        description:
          "Follow the Shopify, reporting, TCG, events, and workforce lanes in the Kanban and agent workspaces.",
        action: internalAction("/kanban", "Open Kanban"),
      },
      {
        id: "baltzer-data",
        title: "Data & Integrations",
        label: "Commerce connectors",
        previewKind: "data",
        description:
          "Shopify, Billy, pricing sources, and proxy infrastructure shape the Baltzer delivery surface.",
        action: panelAction("View connectors"),
      },
    ],
    statusStrip: [
      { tone: "accent", value: "5 work lanes", label: "Shopify, reporting, TCG, events, workforce" },
      { tone: "info", value: "Mixed maturity", label: "Active reporting + several stub tracks" },
      { tone: "muted", value: "Pricing hold", label: "TCG remains intentionally dormant in the base runtime" },
    ],
    agentSurfaces: [
      {
        agentId: "baltzer-master",
        label: "Baltzer Master",
        description:
          "Domain master for Baltzer ecommerce, reporting, TCG, events, and workforce operations.",
      },
      {
        agentId: "baltzer-accounting-integration-task",
        type: "task-lane",
        label: "Accounting Integration",
        description:
          "Reporting and accounting lane for Baltzer financial visibility.",
      },
      {
        agentId: "baltzer-shopify-core-task",
        type: "task-lane",
        label: "Shopify Core",
        description:
          "Ecommerce core lane for store operations and Shopify wiring.",
      },
      {
        agentId: "baltzer-tcg-index-task",
        type: "task-lane",
        label: "TCG Index",
        description:
          "Pricing intelligence lane tied to the dormant TCG stack.",
      },
      {
        agentId: "baltzer-events-task",
        type: "task-lane",
        label: "Events Platform",
        description:
          "Placeholder events lane kept visible until the product surface is defined.",
      },
      {
        agentId: "baltzer-workforce-salary-task",
        type: "task-lane",
        label: "Workforce + Salary",
        description:
          "Placeholder workforce operations lane for scheduling and payroll work.",
      },
    ],
    programSurfaces: [
      {
        programId: "baltzer-reporting",
        label: "Baltzer Reporting",
        description:
          "Reporting and accounting visibility surface for Baltzer.",
      },
      {
        programId: "baltzer-shopify",
        label: "Baltzer Shopify",
        description:
          "Shopify program root for ecommerce operations.",
      },
      {
        programId: "baltzer-tcg-index",
        label: "TCG Index",
        description:
          "Dormant pricing tracker and migration-hold stack.",
      },
    ],
    applicationSurfaces: [
      {
        id: "baltzer-reporting-app",
        kind: "application",
        label: "Reporting App",
        description:
          "Baltzer reporting application for commercial and accounting views.",
        status: "active",
        action: panelAction("View app details"),
      },
      {
        id: "baltzer-shopify-core",
        kind: "application",
        label: "Shopify Core",
        description:
          "Current Shopify application surface, still not wired into the new control plane.",
        status: "stub",
        action: panelAction("View app details"),
      },
      {
        id: "baltzer-event-management-platform",
        kind: "application",
        label: "Event Platform",
        description:
          "Placeholder event-management application track.",
        status: "stub",
        action: panelAction("View app details"),
      },
      {
        id: "baltzer-employee-schedule-salary-api",
        kind: "application",
        label: "Schedule + Salary API",
        description:
          "Placeholder workforce and salary application track.",
        status: "stub",
        action: panelAction("View app details"),
      },
      {
        id: "baltzer-social-media-management",
        kind: "application",
        label: "Social Management",
        description:
          "Placeholder social media management application track.",
        status: "stub",
        action: panelAction("View app details"),
      },
      {
        id: "baltzer-tcg-index-app",
        kind: "application",
        label: "TCG Index App",
        description:
          "Legacy TCG application surface that remains under hold in the rebuild.",
        status: "hold",
        action: panelAction("View app details"),
      },
    ],
    endpointSurfaces: [
      {
        id: "baltzer-kanban",
        kind: "endpoint",
        label: "Work Queue",
        description:
          "Queue and error surfaces used to manage Baltzer work across active and placeholder lanes.",
        status: "active",
        action: internalAction("/kanban", "Open Kanban"),
      },
      {
        id: "baltzer-datastores",
        kind: "endpoint",
        label: "Datastore Verify",
        description:
          "Legacy datastore verification surface for infrastructure and hold validation.",
        status: "active",
        action: panelAction("View endpoint contract"),
        detail: detail(
          "Datastore verify is the closest legacy visibility surface for Baltzer data and migration holds.",
          [meta("Route", "/api/datastores/verify")],
        ),
      },
      {
        id: "baltzer-runtime-health",
        kind: "endpoint",
        label: "Runtime Health",
        description:
          "Health and runtime metadata surfaces for the single-process rebuild.",
        status: "active",
        action: panelAction("View endpoint contract"),
        detail: detail(
          "The rebuilt stack uses /health and /api/meta to surface runtime state instead of the legacy multi-process topology.",
          [meta("Routes", "/health and /api/meta")],
        ),
      },
    ],
    docSurfaces: [
      {
        id: "baltzer-architecture-doc",
        kind: "doc",
        label: "Baltzer Architecture",
        description:
          "Owned programs, task agents, and routing rules for the Baltzer domain.",
        status: "active",
        action: panelAction("View doc details"),
        detail: detail(
          "The architecture packet defines Baltzer’s owned programs and all domain lanes.",
          [meta("Agent path", `${BALTZER_ROOT}/ARCHITECTURE.md`)],
          [],
          [`${BALTZER_ROOT}/ARCHITECTURE.md`],
        ),
      },
      {
        id: "baltzer-tools-doc",
        kind: "doc",
        label: "Baltzer Tooling",
        description:
          "Operational tooling, queue surfaces, and guardrails for Baltzer work.",
        status: "active",
        action: panelAction("View doc details"),
        detail: detail(
          "The tooling packet explains the operational surfaces available to Baltzer master.",
          [meta("Agent path", `${BALTZER_ROOT}/tools.md`)],
          [],
          [`${BALTZER_ROOT}/tools.md`],
        ),
      },
      {
        id: "baltzer-tcg-hold-doc",
        kind: "doc",
        label: "TCG Hold Contract",
        description:
          "Migration-hold context for the TCG stack and why it remains dormant.",
        status: "hold",
        action: panelAction("View hold details"),
        detail: detail(
          "The TCG stack is intentionally held out of the core runtime because of its heavy scrape stack and brownfield dependencies.",
          [meta("Current program status", "hold"), meta("Legacy state", "archive/planned")],
          [],
          [`${DOCS_ROOT}/program-payloads.md`],
        ),
      },
    ],
    integrationSurfaces: [
      {
        id: "baltzer-shopify",
        kind: "integration",
        label: "Shopify",
        description:
          "Core ecommerce integration surface for Baltzer operations.",
        status: "active",
        action: panelAction("View connector details"),
      },
      {
        id: "baltzer-billy",
        kind: "integration",
        label: "Billy API",
        description:
          "Reporting and accounting integration surface for Baltzer.",
        status: "active",
        action: panelAction("View connector details"),
      },
      {
        id: "baltzer-cardmarket",
        kind: "integration",
        label: "Cardmarket",
        description:
          "Pricing source attached to the dormant TCG intelligence lane.",
        status: "hold",
        action: panelAction("View connector details"),
      },
      {
        id: "baltzer-tcgplayer",
        kind: "integration",
        label: "TCGPlayer",
        description:
          "Pricing source attached to the TCG migration-hold stack.",
        status: "hold",
        action: panelAction("View connector details"),
      },
      {
        id: "baltzer-proxy-stack",
        kind: "integration",
        label: "Proxy Providers",
        description:
          "Proxy infrastructure referenced by the legacy TCG scrape stack.",
        status: "hold",
        action: panelAction("View connector details"),
      },
    ],
  },
  lavprishjemmeside: {
    id: "lavprishjemmeside",
    label: "Lavprishjemmeside",
    summary:
      "GitHub-synced remote-first CMS governance, governed client sites, SEO/ads dashboards, and subscription operations.",
    masterAgentId: "lavprishjemmeside-master",
    theme: {
      accent: "#8B5CF6",
      shell: "#4C1D95",
      surface: "#F5F3FF",
    },
    hero: {
      eyebrow: "Remote-first client platform",
      title: "Sites, APIs, and CMS authority in one navigator.",
      summary:
        "Lavprishjemmeside is not a local app tree. The page needs to present the Bolt-to-GitHub-to-cPanel handoff, the remote repos, the public sites, the API surfaces, and the dashboards layered around them.",
    },
    featuredCards: [
      {
        id: "lavpris-primary-workspace",
        title: "Primary Workspace",
        label: "Lavprishjemmeside Master",
        previewKind: "workspace",
        description:
          "Open the Lavprishjemmeside master workspace for CMS, SEO, ads, and subscription decisions.",
        action: internalAction(
          "/chat/lavprishjemmeside-master",
          "Open Lavprishjemmeside workspace",
        ),
      },
      {
        id: "lavpris-docs",
        title: "Docs & Runbooks",
        label: "Remote authority docs",
        previewKind: "docs",
        description:
          "Manifest-only docs covering the CMS authority and the governed client-site surfaces.",
        action: panelAction("View docs"),
      },
      {
        id: "lavpris-work",
        title: "Work & Agents",
        label: "CMS + growth lanes",
        previewKind: "agents",
        description:
          "Open the four task lanes behind AI CMS, SEO, ads, and subscription operations.",
        action: internalAction("/kanban", "Open Kanban"),
      },
      {
        id: "lavpris-data",
        title: "Data & Integrations",
        label: "GitHub + cPanel + MySQL",
        previewKind: "data",
        description:
          "GitHub, Bolt.new, the remote cPanel repos, and cPanel MySQL are the real operating surfaces behind this project.",
        action: panelAction("View remote surfaces"),
      },
    ],
    statusStrip: [
      { tone: "accent", value: "GitHub synced", label: "Bolt.new and Agent Enterprise converge on one shared repo" },
      { tone: "info", value: "Live on cPanel", label: "Agent Enterprise can push approved repo state over SSH" },
      { tone: "muted", value: "2 governed sites", label: "lavprishjemmeside.dk and ljdesignstudio.dk" },
    ],
    agentSurfaces: [
      {
        agentId: "lavprishjemmeside-master",
        label: "Lavprishjemmeside Master",
        description:
          "Master lane for AI CMS, SEO/ads dashboards, and subscription operations.",
      },
      {
        agentId: "lph-ai-cms-task",
        type: "task-lane",
        label: "AI CMS",
        description:
          "AI CMS delivery and governance lane.",
      },
      {
        agentId: "lph-seo-dashboard-task",
        type: "task-lane",
        label: "SEO Dashboard",
        description:
          "SEO reporting and roadmap lane.",
      },
      {
        agentId: "lph-ads-dashboard-task",
        type: "task-lane",
        label: "Ads Dashboard",
        description:
          "Paid media reporting and dashboard lane.",
      },
      {
        agentId: "lph-subscription-ops-task",
        type: "task-lane",
        label: "Subscription Ops",
        description:
          "Client subscription and renewal operations lane.",
      },
    ],
    programSurfaces: [
      {
        programId: "lavprishjemmeside-cms",
        label: "Lavprishjemmeside CMS",
        description:
          "Remote-first CMS authority surface for the project.",
      },
    ],
    applicationSurfaces: [
      {
        id: "lavprishjemmeside-ai-cms",
        kind: "application",
        label: "AI CMS",
        description:
          "Core application surface for AI-enabled CMS governance.",
        status: "remote",
        action: panelAction("View app details"),
      },
      {
        id: "lavprishjemmeside-seo-dashboard",
        kind: "application",
        label: "SEO Dashboard",
        description:
          "SEO reporting surface carried as repo and DB-backed scope rather than a local module.",
        status: "stub",
        action: panelAction("View app details"),
      },
      {
        id: "lavprishjemmeside-ads-dashboard",
        kind: "application",
        label: "Ads Dashboard",
        description:
          "Ads reporting surface carried as repo and DB-backed scope rather than a local module.",
        status: "stub",
        action: panelAction("View app details"),
      },
      {
        id: "lavprishjemmeside-client-subscription-overview",
        kind: "application",
        label: "Subscription Overview",
        description:
          "Client subscription operations surface tied to repo and database state.",
        status: "stub",
        action: panelAction("View app details"),
      },
    ],
    siteSurfaces: [
      {
        id: "lavpris-site-main",
        kind: "site",
        label: "lavprishjemmeside.dk",
        description:
          "Parent site and brand surface that also anchors CMS governance.",
        status: "remote",
        action: externalAction("https://lavprishjemmeside.dk", "Open live site"),
      },
      {
        id: "lavpris-site-lj",
        kind: "site",
        label: "ljdesignstudio.dk",
        description:
          "Governed client-site proof point under the Lavprishjemmeside operating model.",
        status: "remote",
        action: externalAction("https://ljdesignstudio.dk", "Open live site"),
      },
    ],
    endpointSurfaces: [
      {
        id: "lavpris-api-main",
        kind: "endpoint",
        label: "lavprishjemmeside API",
        description:
          "Public API health surface for the parent CMS and site authority.",
        status: "remote",
        action: externalAction(
          "https://api.lavprishjemmeside.dk/health",
          "Open API health",
        ),
      },
      {
        id: "lavpris-api-lj",
        kind: "endpoint",
        label: "ljdesignstudio API",
        description:
          "Public API health surface for the governed client-site.",
        status: "remote",
        action: externalAction("https://api.ljdesignstudio.dk/health", "Open API health"),
      },
      {
        id: "lavpris-repo-github",
        kind: "repo",
        label: "GitHub Repo",
        description:
          "Shared upstream repo used to keep Bolt.new and Agent Enterprise in sync before SSH deploys.",
        status: "active",
        action: externalAction(
          "https://github.com/kimjeppesen01/lavprishjemmeside.dk",
          "Open GitHub repo",
        ),
        detail: detail(
          "GitHub is the shared sync surface between Bolt.new and Agent Enterprise for Lavprishjemmeside.",
          [
            meta("Repo", "https://github.com/kimjeppesen01/lavprishjemmeside.dk"),
            meta("Sync rule", "Bolt.new changes should land here before SSH deployment"),
          ],
        ),
      },
      {
        id: "lavpris-repo-main",
        kind: "repo",
        label: "lavprishjemmeside Repo",
        description:
          "cPanel deployment mirror behind the parent site and CMS surface.",
        status: "remote",
        action: panelAction("View repo details"),
        detail: detail(
          "This repo is the live cPanel deployment mirror. Agent Enterprise may update it over SSH, but the repo state should already be synced through GitHub.",
          [
            meta("Repo", "ssh://theartis@cp10.nordicway.dk/home/theartis/repositories/lavprishjemmeside.dk"),
            meta("Upstream sync", "https://github.com/kimjeppesen01/lavprishjemmeside.dk"),
          ],
        ),
      },
      {
        id: "lavpris-repo-lj",
        kind: "repo",
        label: "ljdesignstudio Repo",
        description:
          "cPanel repo authority behind the governed client-site surface.",
        status: "remote",
        action: panelAction("View repo details"),
        detail: detail(
          "This repo is remote-first and intentionally represented as metadata rather than a nested working tree.",
          [meta("Repo", "ssh://theartis@cp10.nordicway.dk/home/theartis/repositories/ljdesignstudio.dk")],
        ),
      },
    ],
    docSurfaces: [
      {
        id: "lavpris-program-readme",
        kind: "doc",
        label: "Program README",
        description:
          "Top-level remote-first contract and authority notes for Lavprishjemmeside.",
        status: "active",
        action: panelAction("View doc details"),
        detail: detail(
          "The program README explains the remote-first structure and why the local repo keeps only manifests.",
          [meta("Legacy path", `${LAVPRIS_ROOT}/README.md`)],
          [],
          [`${LAVPRIS_ROOT}/README.md`],
        ),
      },
      {
        id: "lavpris-cms-readme",
        kind: "doc",
        label: "CMS README",
        description:
          "CMS authority, live surfaces, and provisioning notes for the parent site.",
        status: "active",
        action: panelAction("View doc details"),
        detail: detail(
          "Documents the CMS authority and provisioning workflow.",
          [meta("Legacy path", `${LAVPRIS_ROOT}/cms/README.md`)],
          [],
          [`${LAVPRIS_ROOT}/cms/README.md`],
        ),
      },
      {
        id: "lavpris-site-readmes",
        kind: "doc",
        label: "Client-site READMEs",
        description:
          "Surface-level docs for the parent site and the governed client site.",
        status: "active",
        action: panelAction("View doc details"),
        detail: detail(
          "The client-site READMEs preserve the remote live surfaces and authority model.",
          [
            meta("Parent site", `${LAVPRIS_ROOT}/client-sites/lavprishjemmeside.dk/README.md`),
            meta("Client site", `${LAVPRIS_ROOT}/client-sites/ljdesignstudio.dk/README.md`),
          ],
          [],
          [
            `${LAVPRIS_ROOT}/client-sites/lavprishjemmeside.dk/README.md`,
            `${LAVPRIS_ROOT}/client-sites/ljdesignstudio.dk/README.md`,
          ],
        ),
      },
    ],
    integrationSurfaces: [
      {
        id: "lavpris-cpanel-mysql",
        kind: "data-store",
        label: "cPanel MySQL",
        description:
          "Primary data source of truth for app data and governed client-site control state.",
        status: "remote",
        action: panelAction("View datastore details"),
      },
      {
        id: "lavpris-provisioning",
        kind: "integration",
        label: "Provisioning Workflow",
        description:
          "SSH-driven client installation workflow tied to the Lavprishjemmeside control database.",
        status: "remote",
        action: panelAction("View workflow details"),
      },
      {
        id: "lavpris-bolt-workspace",
        kind: "integration",
        label: "Bolt.new Workspace",
        description:
          "AI build surface for Lavprishjemmeside that should sync through GitHub before cPanel deployment.",
        status: "active",
        action: externalAction("https://bolt.new", "Open Bolt.new"),
      },
      {
        id: "lavpris-search-reporting",
        kind: "integration",
        label: "Search + SEO Reporting",
        description:
          "SEO and search-oriented reporting surface attached to the CMS roadmap.",
        status: "stub",
        action: panelAction("View connector details"),
      },
      {
        id: "lavpris-ads-reporting",
        kind: "integration",
        label: "Ads Reporting",
        description:
          "Paid media and campaign reporting surface attached to the CMS roadmap.",
        status: "stub",
        action: panelAction("View connector details"),
      },
      {
        id: "lavpris-subscription-reporting",
        kind: "integration",
        label: "Subscription Reporting",
        description:
          "Client subscription and renewal operations surface attached to MySQL-backed state.",
        status: "stub",
        action: panelAction("View connector details"),
      },
    ],
  },
  "personal-assistant": {
    id: "personal-assistant",
    label: "Personal Assistant",
    summary:
      "A planned suite of personal productivity and assistant modules kept visible as one navigable roadmap surface.",
    masterAgentId: "personal-assistant-master",
    theme: {
      accent: "#0F766E",
      shell: "#134E4A",
      surface: "#F0FDFA",
    },
    hero: {
      eyebrow: "Personal ops suite",
      title: "Modules, lanes, and provider boundaries.",
      summary:
        "Personal Assistant is mostly scaffolded today. The page should make the module roadmap, grouped work lanes, and privacy-sensitive boundaries explicit without pretending there are live deployments already.",
    },
    featuredCards: [
      {
        id: "pa-primary-workspace",
        title: "Primary Workspace",
        label: "PA Master",
        previewKind: "workspace",
        description:
          "Open the Personal Assistant master workspace for module planning and review.",
        action: internalAction(
          "/chat/personal-assistant-master",
          "Open PA workspace",
        ),
      },
      {
        id: "pa-docs",
        title: "Docs & Runbooks",
        label: "Module notes",
        previewKind: "docs",
        description:
          "Program README plus per-module notes that define the current scaffold state.",
        action: panelAction("View docs"),
      },
      {
        id: "pa-work",
        title: "Work & Agents",
        label: "Grouped lanes",
        previewKind: "agents",
        description:
          "Task + calendar, email + social, and fitness are grouped as three execution lanes.",
        action: internalAction("/kanban", "Open Kanban"),
      },
      {
        id: "pa-data",
        title: "Data & Integrations",
        label: "Consent boundaries",
        previewKind: "data",
        description:
          "Provider APIs, health-data boundaries, and audit expectations shape the future suite.",
        action: panelAction("View boundaries"),
      },
    ],
    statusStrip: [
      { tone: "accent", value: "5 modules", label: "Task, calendar, email, social, fitness" },
      { tone: "info", value: "3 grouped lanes", label: "Task+Calendar, Email+Social, Fitness" },
      { tone: "muted", value: "Roadmap-first", label: "No standalone live deployment yet" },
    ],
    agentSurfaces: [
      {
        agentId: "personal-assistant-master",
        label: "PA Master",
        description:
          "Master lane for the personal productivity and assistant suite.",
      },
      {
        agentId: "pa-taskmanager-calendar-task",
        type: "task-lane",
        label: "Task + Calendar",
        description:
          "Grouped productivity lane for task manager and calendar orchestration.",
      },
      {
        agentId: "pa-email-social-task",
        type: "task-lane",
        label: "Email + Social",
        description:
          "Grouped communications lane for email and social workflows.",
      },
      {
        agentId: "pa-fitness-dashboard-task",
        type: "task-lane",
        label: "Fitness Dashboard",
        description:
          "Health and fitness intelligence lane.",
      },
    ],
    programSurfaces: [
      {
        programId: "personal-assistant-root",
        label: "Personal Assistant Suite",
        description:
          "Program root and canonical placeholder suite inventory.",
      },
    ],
    applicationSurfaces: [
      {
        id: "personal-assistant-task-manager",
        kind: "application",
        label: "Task Manager",
        description:
          "Placeholder productivity module for task capture and routing.",
        status: "stub",
        action: panelAction("View module details"),
      },
      {
        id: "personal-assistant-calendar-management",
        kind: "application",
        label: "Calendar Management",
        description:
          "Placeholder calendar module for event and scheduling orchestration.",
        status: "stub",
        action: panelAction("View module details"),
      },
      {
        id: "personal-assistant-email-management",
        kind: "application",
        label: "Email Management",
        description:
          "Placeholder email operations module with token and consent requirements.",
        status: "stub",
        action: panelAction("View module details"),
      },
      {
        id: "personal-assistant-social-media-management",
        kind: "application",
        label: "Social Media Management",
        description:
          "Placeholder social workflow module.",
        status: "stub",
        action: panelAction("View module details"),
      },
      {
        id: "personal-assistant-fitness-dashboard",
        kind: "application",
        label: "Fitness Dashboard",
        description:
          "Placeholder Apple Watch and health-data dashboard module.",
        status: "stub",
        action: panelAction("View module details"),
      },
    ],
    endpointSurfaces: [
      {
        id: "pa-queue-errors",
        kind: "endpoint",
        label: "Queue + Errors",
        description:
          "Shared work queue and error surfaces for assistant delivery.",
        status: "active",
        action: internalAction("/kanban", "Open Kanban"),
      },
      {
        id: "pa-runtime-meta",
        kind: "endpoint",
        label: "Runtime Diagnostics",
        description:
          "Runtime and workspace overview surfaces relevant to the planned suite.",
        status: "active",
        action: panelAction("View endpoint details"),
        detail: detail(
          "The rebuilt dashboard uses shared runtime metadata and workspace APIs for planned suites too.",
          [meta("Routes", "/api/meta, /api/chat/agents/:agentId/workspace")],
        ),
      },
    ],
    docSurfaces: [
      {
        id: "pa-program-readme",
        kind: "doc",
        label: "Suite README",
        description:
          "Top-level program note covering the planned assistant modules.",
        status: "active",
        action: panelAction("View doc details"),
        detail: detail(
          "The root README is the canonical summary for the suite.",
          [meta("Legacy path", `${PA_ROOT}/README.md`)],
          [],
          [`${PA_ROOT}/README.md`],
        ),
      },
      {
        id: "pa-module-notes",
        kind: "doc",
        label: "Module Notes",
        description:
          "Per-module notes describing the current scaffold state and next definition steps.",
        status: "active",
        action: panelAction("View doc details"),
        detail: detail(
          "Every assistant module has lightweight notes defining its current placeholder status.",
          [
            meta("Task manager", `${PA_ROOT}/task-manager/docs/NOTES.md`),
            meta("Calendar", `${PA_ROOT}/calendar-management/docs/NOTES.md`),
            meta("Email", `${PA_ROOT}/email-management/docs/NOTES.md`),
            meta("Social", `${PA_ROOT}/social-media-management/docs/NOTES.md`),
            meta("Fitness", `${PA_ROOT}/fitness-dashboard/docs/NOTES.md`),
          ],
          [],
          [
            `${PA_ROOT}/task-manager/docs/NOTES.md`,
            `${PA_ROOT}/calendar-management/docs/NOTES.md`,
            `${PA_ROOT}/email-management/docs/NOTES.md`,
            `${PA_ROOT}/social-media-management/docs/NOTES.md`,
            `${PA_ROOT}/fitness-dashboard/docs/NOTES.md`,
          ],
        ),
      },
    ],
    integrationSurfaces: [
      {
        id: "pa-provider-apis",
        kind: "integration",
        label: "Provider APIs",
        description:
          "Calendar, email, social, and fitness provider APIs sit behind explicit token and consent requirements.",
        status: "planned",
        action: panelAction("View connector details"),
      },
      {
        id: "pa-consent-boundaries",
        kind: "integration",
        label: "Consent Boundaries",
        description:
          "Privacy and approval guardrails for outbound communication and health-data access.",
        status: "planned",
        action: panelAction("View boundary details"),
      },
      {
        id: "pa-audit-log",
        kind: "data-store",
        label: "Action Audit",
        description:
          "Audit logging requirement for sent actions and sensitive access.",
        status: "planned",
        action: panelAction("View audit details"),
      },
      {
        id: "pa-health-boundary",
        kind: "data-store",
        label: "Health Data Boundary",
        description:
          "Data boundary for fitness data, with storage design still undefined.",
        status: "planned",
        action: panelAction("View boundary details"),
      },
    ],
  },
  samlino: {
    id: "samlino",
    label: "Samlino",
    summary:
      "Context-heavy SEO and product workspace preserved as a first-class project page without reactivating its heavy legacy runtime.",
    masterAgentId: "samlino-master",
    theme: {
      accent: "#0F172A",
      shell: "#111827",
      surface: "#F8FAFC",
    },
    hero: {
      eyebrow: "Context-linked workspace",
      title: "Product, runtime, and archive context side by side.",
      summary:
        "Samlino stays visible because it still matters, but its heavy workspace remains held. The page needs to expose the specialist lanes, runtime APIs, archive context, and data contracts without pretending the old stack should boot again.",
    },
    featuredCards: [
      {
        id: "samlino-primary-workspace",
        title: "Primary Workspace",
        label: "Samlino Master",
        previewKind: "workspace",
        description:
          "Open the Samlino master workspace for product and SEO planning inside the new control plane.",
        action: internalAction("/chat/samlino-master", "Open Samlino workspace"),
      },
      {
        id: "samlino-docs",
        title: "Docs & Runbooks",
        label: "Runtime docs",
        previewKind: "docs",
        description:
          "Architecture, tools, and context docs for the held Samlino workspace.",
        action: panelAction("View docs"),
      },
      {
        id: "samlino-work",
        title: "Work & Agents",
        label: "SEO specialist set",
        previewKind: "agents",
        description:
          "All current specialist lanes remain navigable even though the underlying brownfield workspace is held.",
        action: internalAction("/kanban", "Open Kanban"),
      },
      {
        id: "samlino-data",
        title: "Data & Integrations",
        label: "Held runtime surfaces",
        previewKind: "data",
        description:
          "The Samlino DB, runtime modules, and API contracts stay visible as reference surfaces.",
        action: panelAction("View runtime surfaces"),
      },
    ],
    statusStrip: [
      { tone: "accent", value: "Held workspace", label: "Visible without reactivating the heavy brownfield stack" },
      { tone: "info", value: "12 specialist lanes", label: "Product, keyword, content, audit, schema, prototyper" },
      { tone: "muted", value: "Archive preserved", label: "AI-visibility, seo-auditor, and mind-map stay navigable" },
    ],
    agentSurfaces: [
      {
        agentId: "samlino-master",
        label: "Samlino Master",
        description:
          "Master lane for product and SEO context routing.",
      },
      {
        agentId: "samlino-product-ops-task",
        type: "task-lane",
        label: "Product Ops",
        description:
          "Product operations and delivery planning lane.",
      },
      {
        agentId: "samlino-competitor-research-task",
        type: "task-lane",
        label: "Competitor Research",
        description:
          "Competitive research and market comparison lane.",
      },
      {
        agentId: "samlino-keyword-analysis-task",
        type: "task-lane",
        label: "Keyword Analysis",
        description:
          "Keyword research and opportunity identification lane.",
      },
      {
        agentId: "samlino-content-writer-task",
        type: "task-lane",
        label: "Content Writer",
        description:
          "Draft generation lane for content execution.",
      },
      {
        agentId: "samlino-content-composer-task",
        type: "task-lane",
        label: "Content Composer",
        description:
          "Structured composition and format lane.",
      },
      {
        agentId: "samlino-content-analyst-task",
        type: "task-lane",
        label: "Content Analyst",
        description:
          "Analytical review and content assessment lane.",
      },
      {
        agentId: "samlino-performance-reviewer-task",
        type: "task-lane",
        label: "Performance Reviewer",
        description:
          "Performance and ranking diagnostics lane.",
      },
      {
        agentId: "samlino-opportunity-explorer-task",
        type: "task-lane",
        label: "Opportunity Explorer",
        description:
          "Opportunity discovery and prioritization lane.",
      },
      {
        agentId: "samlino-schema-generator-task",
        type: "task-lane",
        label: "Schema Generator",
        description:
          "Structured schema and markup generation lane.",
      },
      {
        agentId: "samlino-prototyper-task",
        type: "task-lane",
        label: "Prototyper",
        description:
          "Prototype generation and insertion lane.",
      },
      {
        agentId: "samlino-seo-auditor-task",
        type: "task-lane",
        label: "SEO Auditor",
        description:
          "SEO audit lane for snapshot and crawl review.",
      },
      {
        agentId: "samlino-seo-agent-task",
        type: "task-lane",
        label: "SEO Agent",
        description:
          "Legacy SEO agent lane retained for traceability.",
      },
    ],
    programSurfaces: [
      {
        programId: "samlino-seo-agent-playground",
        label: "SEO Agent Playground",
        description:
          "Held brownfield workspace and runtime experiment stack.",
      },
    ],
    applicationSurfaces: [
      {
        id: "samlino-seo-agent-playground-app",
        kind: "application",
        label: "Workspace App",
        description:
          "Legacy workspace shell for the Samlino environment.",
        status: "hold",
        action: panelAction("View app details"),
      },
      {
        id: "samlino-seo-schema-runtime",
        kind: "application",
        label: "Schema Runtime",
        description:
          "Schema generation runtime surface tied to the held workspace.",
        status: "hold",
        action: panelAction("View app details"),
      },
      {
        id: "samlino-seo-audit-runtime",
        kind: "application",
        label: "Audit Runtime",
        description:
          "SEO audit runtime surface tied to the held workspace.",
        status: "hold",
        action: panelAction("View app details"),
      },
      {
        id: "samlino-prototyper-runtime",
        kind: "application",
        label: "Prototyper Runtime",
        description:
          "Prototype generation runtime surface tied to the held workspace.",
        status: "hold",
        action: panelAction("View app details"),
      },
    ],
    endpointSurfaces: [
      {
        id: "samlino-inventory-functions",
        kind: "endpoint",
        label: "Inventory + Functions",
        description:
          "Program inventory, function listing, and ops-action contract for the playground.",
        status: "hold",
        action: panelAction("View endpoint contract"),
        detail: detail(
          "The inventory and function routes expose the known surfaces inside the playground.",
          [
            meta("Routes", "GET /api/programs/samlino-seo-agent-playground/inventory"),
            meta("Routes", "GET /api/programs/samlino-seo-agent-playground/functions"),
            meta("Routes", "POST /api/programs/samlino-seo-agent-playground/ops-action"),
          ],
        ),
      },
      {
        id: "samlino-schema-api",
        kind: "endpoint",
        label: "Schema APIs",
        description:
          "Schema generation and history surfaces.",
        status: "hold",
        action: panelAction("View endpoint contract"),
        detail: detail(
          "Schema operations remain documented even though the runtime is held.",
          [
            meta("Routes", "POST /api/samlino/schema/generate"),
            meta("Routes", "GET /api/samlino/schema/history"),
          ],
        ),
      },
      {
        id: "samlino-audit-api",
        kind: "endpoint",
        label: "Audit APIs",
        description:
          "Audit upload and snapshot surfaces for page, link, and keyword data.",
        status: "hold",
        action: panelAction("View endpoint contract"),
        detail: detail(
          "Audit upload APIs accept page, link, and keyword inputs and expose snapshots.",
          [
            meta("Upload", "POST /api/samlino/audits/{project_slug}/upload/pages"),
            meta("Upload", "POST /api/samlino/audits/{project_slug}/upload/links"),
            meta("Upload", "POST /api/samlino/audits/{project_slug}/upload/keywords"),
            meta("Snapshot", "GET /api/samlino/audits/{project_slug}/snapshot"),
          ],
        ),
      },
      {
        id: "samlino-prototyper-api",
        kind: "endpoint",
        label: "Prototyper APIs",
        description:
          "Prototype generation and insertion surfaces.",
        status: "hold",
        action: panelAction("View endpoint contract"),
        detail: detail(
          "The prototyper routes stay visible as contract surfaces.",
          [
            meta("Generate", "POST /api/samlino/prototyper/generate"),
            meta("Insert", "POST /api/samlino/prototyper/insert"),
          ],
        ),
      },
    ],
    docSurfaces: [
      {
        id: "samlino-architecture-doc",
        kind: "doc",
        label: "Samlino Architecture",
        description:
          "Held runtime model, specialist set, and routing rule for Samlino.",
        status: "active",
        action: panelAction("View doc details"),
        detail: detail(
          "The architecture packet explains the control-plane hosted runtime model and the specialist set.",
          [meta("Agent path", `${SAMLINO_AGENT_ROOT}/ARCHITECTURE.md`)],
          [],
          [`${SAMLINO_AGENT_ROOT}/ARCHITECTURE.md`],
        ),
      },
      {
        id: "samlino-tools-doc",
        kind: "doc",
        label: "Samlino Tooling",
        description:
          "Tool and API inventory for the legacy Samlino workspace.",
        status: "active",
        action: panelAction("View doc details"),
        detail: detail(
          "The tools packet is the clearest source for Samlino API and runtime surfaces.",
          [meta("Agent path", `${SAMLINO_AGENT_ROOT}/tools.md`)],
          [],
          [`${SAMLINO_AGENT_ROOT}/tools.md`],
        ),
      },
      {
        id: "samlino-context-doc",
        kind: "doc",
        label: "Context README",
        description:
          "IAn Agency context note explaining why Samlino stays visible but not top-level in legacy.",
        status: "active",
        action: panelAction("View doc details"),
        detail: detail(
          "The context README explains Samlino’s position under IAn Agency contexts.",
          [meta("Repo path", `${PROGRAMS_ROOT}/ian-agency/contexts/samlino/README.md`)],
          [],
          [`${PROGRAMS_ROOT}/ian-agency/contexts/samlino/README.md`],
        ),
      },
    ],
    integrationSurfaces: [
      {
        id: "samlino-db",
        kind: "data-store",
        label: "samlino.db",
        description:
          "Local workspace database referenced by the legacy runtime.",
        status: "hold",
        action: panelAction("View datastore details"),
      },
      {
        id: "samlino-runtime-modules",
        kind: "integration",
        label: "Runtime Modules",
        description:
          "Schema, audit, and prototyper runtime modules from the legacy workspace.",
        status: "hold",
        action: panelAction("View runtime details"),
      },
      {
        id: "samlino-workspace-context",
        kind: "integration",
        label: "Workspace Context",
        description:
          "The held workspace remains useful as planning and audit context.",
        status: "hold",
        action: panelAction("View context details"),
      },
    ],
    archiveSurfaces: [
      {
        id: "samlino-ai-visibility",
        kind: "archive-context",
        label: "AI-visibility",
        description:
          "Archive-mapped brownfield module preserved for context traceability.",
        status: "archive-context",
        action: panelAction("View archive details"),
      },
      {
        id: "samlino-seo-auditor-archive",
        kind: "archive-context",
        label: "seo-auditor",
        description:
          "Archive-mapped brownfield module preserved for context traceability.",
        status: "archive-context",
        action: panelAction("View archive details"),
      },
      {
        id: "samlino-mind-map",
        kind: "archive-context",
        label: "samlino-mind-map",
        description:
          "Archive-mapped mind-map module preserved for context traceability.",
        status: "archive-context",
        action: panelAction("View archive details"),
      },
    ],
  },
};

export function listProjectDefinitions() {
  return PROJECT_ORDER.map((id) => PROJECT_DEFINITIONS[id]);
}

export function getProjectDefinition(projectId) {
  return PROJECT_DEFINITIONS[projectId] || null;
}

export { PROJECT_ORDER, PROJECT_DEFINITIONS };

export default {
  getProjectDefinition,
  listProjectDefinitions,
  PROJECT_DEFINITIONS,
  PROJECT_ORDER,
};
