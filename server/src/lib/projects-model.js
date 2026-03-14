import { toAgentListItem } from "./agent-view-model.js";
import { getProjectDefinition, listProjectDefinitions } from "./project-catalog.js";

const PROGRAM_STATUS_MAP = {
  active: "active",
  remote: "remote",
  hold: "hold",
  stub: "stub",
};

const AGENT_STATUS_MAP = {
  enabled: "active",
  ready: "active",
  blocked: "planned",
  disabled: "planned",
  held: "hold",
};

function countBy(items, selector) {
  return items.reduce((counts, item) => {
    const key = selector(item);
    if (!key) {
      return counts;
    }

    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function internalAction(href, label = "Open page") {
  return {
    kind: "internal",
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

function buildDetail(summary, meta = [], actions = [], relatedDocs = []) {
  return {
    summary,
    meta,
    actions,
    relatedDocs,
  };
}

function ensureArray(values) {
  return Array.isArray(values) ? values : [];
}

function mapAgentStatus(entry) {
  if (!entry) {
    return "planned";
  }

  return AGENT_STATUS_MAP[entry.enablement.state] || "planned";
}

function mapProgramStatus(entry) {
  if (!entry) {
    return "planned";
  }

  return PROGRAM_STATUS_MAP[entry.classification] || "planned";
}

function buildFallbackDetail({ summary, type, status, meta = [], relatedDocs = [] }) {
  return buildDetail(summary, [{ label: "Type", value: type }, { label: "Status", value: status }, ...meta], [], relatedDocs);
}

function normalizeAction(action, fallback) {
  if (action && action.kind && (action.href || action.kind === "panel")) {
    return action;
  }

  return fallback;
}

function buildAgentTile(surface, agentById) {
  const entry = agentById.get(surface.agentId);
  const agent = entry ? toAgentListItem(entry) : null;
  const type = surface.type || "agent";
  const status = surface.status || mapAgentStatus(entry);
  const description = surface.description || agent?.purpose || "Agent workspace.";
  const action = normalizeAction(
    surface.action,
    agent
      ? internalAction(agent.chatHref, `Open ${surface.label || agent.name}`)
      : panelAction("View details"),
  );
  const detail =
    surface.detail ||
    buildFallbackDetail({
      summary: description,
      type,
      status,
      meta: [
        { label: "Agent id", value: surface.agentId },
        { label: "Enablement", value: entry?.enablement?.state || "unknown" },
        { label: "Health", value: entry?.health?.status || "unknown" },
        { label: "Runtime", value: entry?.runtime?.adapter || "registry-only" },
      ],
      relatedDocs: entry?.sourcePath ? [entry.sourcePath] : [],
    });

  return {
    id: surface.agentId,
    type,
    label: surface.label || agent?.name || surface.agentId,
    description,
    status,
    action,
    detail,
    agentId: surface.agentId,
    href: action.href || null,
    linkedAgent: agent,
  };
}

function buildProgramTile(surface, programById) {
  const entry = programById.get(surface.programId);
  const type = "program";
  const status = surface.status || mapProgramStatus(entry);
  const description = surface.description || entry?.purpose || "Program surface.";
  const action = normalizeAction(surface.action, panelAction("View program details"));
  const detail =
    surface.detail ||
    buildFallbackDetail({
      summary: description,
      type,
      status,
      meta: [
        { label: "Program id", value: surface.programId },
        { label: "Classification", value: entry?.classification || "unknown" },
        { label: "Runtime", value: entry?.runtime || "registry-only" },
        { label: "Triggers", value: ensureArray(entry?.triggers).join(", ") || "manual" },
      ],
      relatedDocs: entry?.sourcePath ? [entry.sourcePath] : [],
    });

  return {
    id: surface.programId,
    type,
    label: surface.label || entry?.name || surface.programId,
    description,
    status,
    action,
    detail,
    programId: surface.programId,
    href: action.href || null,
    linkedProgram: entry || null,
  };
}

function buildCatalogTile(surface, fallbackType) {
  const type = surface.kind || fallbackType;
  const status = surface.status || "planned";
  const description = surface.description || `${surface.label} surface`;
  const action = normalizeAction(surface.action, panelAction("View details"));
  const detail =
    surface.detail ||
    buildFallbackDetail({
      summary: description,
      type,
      status,
    });

  return {
    id: surface.id,
    type,
    label: surface.label,
    description,
    status,
    action,
    detail,
    href: action.href || null,
  };
}

function buildFeaturedCard(card) {
  const action = normalizeAction(card.action, panelAction("View details"));
  const detail =
    card.detail ||
    buildFallbackDetail({
      summary: card.description,
      type: "featured-card",
      status: "active",
    });

  return {
    ...card,
    action,
    detail,
    href: action.href || null,
  };
}

function buildGridTiles(definition, agentById, programById) {
  return [
    ...ensureArray(definition.agentSurfaces).map((surface) =>
      buildAgentTile(surface, agentById),
    ),
    ...ensureArray(definition.programSurfaces).map((surface) =>
      buildProgramTile(surface, programById),
    ),
    ...ensureArray(definition.applicationSurfaces).map((surface) =>
      buildCatalogTile(surface, "application"),
    ),
    ...ensureArray(definition.siteSurfaces).map((surface) =>
      buildCatalogTile(surface, "site"),
    ),
    ...ensureArray(definition.endpointSurfaces).map((surface) =>
      buildCatalogTile(surface, "endpoint"),
    ),
    ...ensureArray(definition.docSurfaces).map((surface) =>
      buildCatalogTile(surface, "doc"),
    ),
    ...ensureArray(definition.integrationSurfaces).map((surface) =>
      buildCatalogTile(surface, surface.kind || "integration"),
    ),
    ...ensureArray(definition.dataSurfaces).map((surface) =>
      buildCatalogTile(surface, "data-store"),
    ),
    ...ensureArray(definition.archiveSurfaces).map((surface) =>
      buildCatalogTile(surface, "archive-context"),
    ),
  ];
}

function buildCounts(tiles, definition) {
  const types = countBy(tiles, (tile) => tile.type);

  return {
    agents: ensureArray(definition.agentSurfaces).length,
    programs: ensureArray(definition.programSurfaces).length,
    applications:
      ensureArray(definition.applicationSurfaces).length +
      ensureArray(definition.siteSurfaces).length,
    docs: ensureArray(definition.docSurfaces).length,
    integrations:
      ensureArray(definition.integrationSurfaces).length +
      ensureArray(definition.dataSurfaces).length,
    endpoints: ensureArray(definition.endpointSurfaces).length,
    totalTiles: tiles.length,
    byType: types,
  };
}

function buildProjectEntry(definition, agentById, programById) {
  const featuredCards = ensureArray(definition.featuredCards).map(buildFeaturedCard);
  const gridTiles = buildGridTiles(definition, agentById, programById);
  const statusMix = countBy(gridTiles, (tile) => tile.status);

  return {
    id: definition.id,
    label: definition.label,
    summary: definition.summary,
    masterAgentId: definition.masterAgentId,
    href: `/projects/${definition.id}`,
    theme: definition.theme,
    hero: definition.hero,
    featuredCards,
    gridTiles,
    statusStrip: ensureArray(definition.statusStrip),
    counts: buildCounts(gridTiles, definition),
    statusMix,
    linkedAgents: gridTiles.filter(
      (tile) => tile.type === "agent" || tile.type === "task-lane",
    ),
    linkedPrograms: gridTiles.filter((tile) => tile.type === "program"),
    linkedApplications: gridTiles.filter(
      (tile) => tile.type === "application" || tile.type === "site" || tile.type === "repo",
    ),
    integrations: gridTiles.filter(
      (tile) => tile.type === "integration" || tile.type === "data-store",
    ),
    docs: gridTiles.filter((tile) => tile.type === "doc"),
  };
}

function buildProjectMap(agentManager, programRegistry) {
  const agentEntries = agentManager.list();
  const programEntries = ensureArray(programRegistry.entries);
  const agentById = new Map(agentEntries.map((entry) => [entry.id, entry]));
  const programById = new Map(programEntries.map((entry) => [entry.id, entry]));
  const projects = new Map();

  for (const definition of listProjectDefinitions()) {
    projects.set(
      definition.id,
      buildProjectEntry(definition, agentById, programById),
    );
  }

  return projects;
}

export function buildProjectsDirectoryModel({ agentManager, programRegistry }) {
  const projects = [...buildProjectMap(agentManager, programRegistry).values()];

  return {
    generatedAt: new Date().toISOString(),
    entries: projects.map((project) => ({
      id: project.id,
      label: project.label,
      summary: project.summary,
      masterAgentId: project.masterAgentId,
      counts: project.counts,
      statusMix: project.statusMix,
      href: project.href,
      theme: project.theme,
    })),
  };
}

export function buildProjectDetailModel({
  projectId,
  agentManager,
  programRegistry,
}) {
  const definition = getProjectDefinition(projectId);

  if (!definition) {
    return null;
  }

  const project = buildProjectMap(agentManager, programRegistry).get(projectId);

  return {
    generatedAt: new Date().toISOString(),
    ...project,
  };
}

export default {
  buildProjectDetailModel,
  buildProjectsDirectoryModel,
};
