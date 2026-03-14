import { toAgentListItem } from "./agent-view-model.js";

const FAMILY_DEFINITIONS = [
  {
    id: "engineer",
    masterAgentId: "engineer",
    label: "Engineer",
  },
  {
    id: "ian-master",
    masterAgentId: "ian-master",
    label: "IAn Agency",
  },
  {
    id: "artisan-master",
    masterAgentId: "artisan-master",
    label: "Artisan",
  },
  {
    id: "baltzer-master",
    masterAgentId: "baltzer-master",
    label: "Baltzer",
  },
  {
    id: "lavprishjemmeside-master",
    masterAgentId: "lavprishjemmeside-master",
    label: "Lavprishjemmeside",
  },
  {
    id: "personal-assistant-master",
    masterAgentId: "personal-assistant-master",
    label: "Personal Assistant",
  },
  {
    id: "samlino-master",
    masterAgentId: "samlino-master",
    label: "Samlino",
  },
];

function countAgents(entries) {
  return {
    total: entries.length,
    enabled: entries.filter((entry) => entry.enablement.state === "enabled").length,
    healthy: entries.filter((entry) => entry.health.status === "healthy").length,
    invokable: entries.filter((entry) => entry.invocation.available).length,
  };
}

function resolveProgramIds(familyId, programs) {
  switch (familyId) {
    case "engineer":
      return [];
    case "ian-master":
      return programs
        .filter((program) => program.id === "ian-agency")
        .map((program) => program.id);
    case "samlino-master":
      return programs
        .filter((program) => program.id === "samlino-seo-agent-playground")
        .map((program) => program.id);
    default: {
      const prefix = familyId.replace("-master", "");
      return programs
        .filter((program) => program.id === prefix || program.id.startsWith(`${prefix}-`))
        .map((program) => program.id);
    }
  }
}

export function buildOverviewModel({ agentManager, programRegistry }) {
  const entries = agentManager.list();
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const summary = agentManager.summary();
  const programs = programRegistry.entries;

  const rootEntry = entryById.get("father");
  const root = rootEntry
    ? {
        ...toAgentListItem(rootEntry),
        groupRole: "root",
      }
    : null;

  const families = FAMILY_DEFINITIONS.map((family) => {
    const familyEntries = entries.filter(
      (entry) =>
        entry.id === family.masterAgentId || entry.parentId === family.masterAgentId,
    );

    return {
      id: family.id,
      label: family.label,
      masterAgentId: family.masterAgentId,
      programIds: resolveProgramIds(family.id, programs),
      counts: countAgents(familyEntries),
      agents: familyEntries.map((entry) => ({
        ...toAgentListItem(entry),
        groupRole: entry.id === family.masterAgentId ? "master" : "task",
        familyId: family.id,
        familyLabel: family.label,
      })),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    defaultFilter: "all",
    root,
    families,
    counts: {
      totalAgents: entries.length,
      totalFamilies: families.length,
      enabledAgents: summary.byEnablement.enabled || 0,
      healthyAgents: summary.byHealth.healthy || 0,
    },
  };
}

export default buildOverviewModel;
