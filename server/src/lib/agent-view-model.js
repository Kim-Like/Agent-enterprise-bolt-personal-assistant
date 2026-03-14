import { buildAgentAvatar } from "./chat-avatar.js";

export function toAgentListItem(entry) {
  const avatar = buildAgentAvatar(entry);

  return {
    id: entry.id,
    name: entry.name,
    kind: entry.kind,
    parentId: entry.parentId,
    purpose: entry.purpose,
    sourcePath: entry.sourcePath,
    status: entry.status,
    notes: entry.notes,
    capabilityTags: entry.capabilityTags,
    legacyDependencies: entry.legacyDependencies,
    dependencyRefs: entry.dependencies,
    runtime: entry.runtime,
    enablement: entry.enablement,
    health: {
      status: entry.health.status,
      reason: entry.health.reason,
      expected: entry.health.expected,
      lastCheckedAt: entry.health.lastCheckedAt,
    },
    invocation: entry.invocation,
    policy: entry.policy,
    mergeCandidate: entry.policy.mergeCandidate,
    heavyDependencyRisk: entry.policy.heavyDependencyRisk,
    avatarMode: avatar.avatarMode,
    avatarSeed: avatar.avatarSeed,
    avatarGlyph: avatar.avatarGlyph,
    avatarAccent: avatar.avatarAccent,
    avatarImagePath: avatar.avatarImagePath,
    avatarUrl: avatar.avatarUrl,
    chatHref: `/chat/${encodeURIComponent(entry.id)}`,
  };
}

export default toAgentListItem;
