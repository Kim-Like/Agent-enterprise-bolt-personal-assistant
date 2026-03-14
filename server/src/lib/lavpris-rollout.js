import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { collectLavprisPathHealth } from "./lavpris-path-health.js";

const PARENT_SITE_KEY = "lavprishjemmeside-dk";
const PARENT_DOMAIN = "lavprishjemmeside.dk";
const REQUIRED_CMS_FIELDS = Object.freeze([
  "release_version",
  "api_version",
  "build",
  "commit",
  "commit_short",
  "git_ref",
  "git_committed_at",
  "dirty",
  "update_channel",
  "changelog_sha",
  "changelog_updated_at",
  "last_deployed_at",
]);

function hashText(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function nowIso() {
  return new Date().toISOString();
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function readJson(filePath) {
  try {
    return JSON.parse(readText(filePath));
  } catch {
    return null;
  }
}

function runGit(env, args) {
  try {
    return execFileSync("git", args, {
      cwd: env.cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function lavprisProgramRoot(env) {
  return path.join(env.cwd, "programs", "lavprishjemmeside");
}

export function lavprisRootChangelogPath(env) {
  return path.join(lavprisProgramRoot(env), "CHANGELOG.md");
}

export function lavprisMirrorChangelogPath(env) {
  return path.join(lavprisProgramRoot(env), "local-mirror", "CHANGELOG.md");
}

function changelogUpdatedAt(env, filePath) {
  const relativePath = path.relative(env.cwd, filePath).replace(/\\/g, "/");
  return runGit(env, ["log", "-1", "--format=%cI", "--", relativePath]);
}

function localBuildInfo(env) {
  const packageJson =
    readJson(path.join(env.cwd, "package.json")) || Object.freeze({});
  const version = packageJson.version || "0.0.0";
  const commit = runGit(env, ["rev-parse", "HEAD"]);
  const commitShort = commit ? commit.slice(0, 7) : null;
  const dirty = Boolean(runGit(env, ["status", "--porcelain"]));
  const buildBase = commitShort ? `${version}+${commitShort}` : version;

  return {
    releaseVersion: version,
    build: dirty ? `${buildBase}.dirty` : buildBase,
    commit,
    commitShort,
    dirty,
  };
}

export function extractUnreleasedSection(changelogText) {
  const source = String(changelogText || "");
  const marker = /^## \[Unreleased\][^\n]*$/m;
  const match = source.match(marker);

  if (!match || match.index == null) {
    return "";
  }

  const start = match.index + match[0].length;
  const remainder = source.slice(start);
  const nextRelease = remainder.match(/\n## \[[^\]]+\]/);
  const end = nextRelease?.index != null ? start + nextRelease.index : source.length;

  return source.slice(start, end).trim();
}

function normalizeEvidenceText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function validateLavprisChangelogEntry(env, changelogEntryText) {
  const expected = normalizeEvidenceText(changelogEntryText);
  const changelogText = readText(lavprisRootChangelogPath(env));
  const unreleased = extractUnreleasedSection(changelogText);

  if (!expected) {
    return {
      ok: false,
      code: "CHANGELOG_REQUIRED",
      message:
        "Lavprishjemmeside tasks require a changelog entry under [Unreleased] before completion.",
    };
  }

  if (!normalizeEvidenceText(unreleased).includes(expected)) {
    return {
      ok: false,
      code: "CHANGELOG_REQUIRED",
      message:
        "The supplied changelog evidence was not found under [Unreleased] in programs/lavprishjemmeside/CHANGELOG.md.",
    };
  }

  return {
    ok: true,
  };
}

export function isLavprisTask(taskLike = {}) {
  const programId = taskLike.programId || taskLike.program_id || "";
  const sourceAgentId =
    taskLike.sourceAgentId || taskLike.source_agent_id || "";

  return (
    programId === "lavprishjemmeside" ||
    sourceAgentId === "lavprishjemmeside-master" ||
    String(sourceAgentId).startsWith("lavpris-client-")
  );
}

function sourceChangelogState(env) {
  const rootPath = lavprisRootChangelogPath(env);
  const mirrorPath = lavprisMirrorChangelogPath(env);
  const rootExists = fs.existsSync(rootPath);
  const mirrorExists = fs.existsSync(mirrorPath);
  const rootText = rootExists ? readText(rootPath) : "";
  const mirrorText = mirrorExists ? readText(mirrorPath) : "";
  const rootSha = rootExists ? hashText(rootText) : null;
  const mirrorSha = mirrorExists ? hashText(mirrorText) : null;

  return {
    rootPath: path.relative(env.cwd, rootPath).replace(/\\/g, "/"),
    mirrorPath: path.relative(env.cwd, mirrorPath).replace(/\\/g, "/"),
    rootExists,
    mirrorExists,
    rootChangelogSha: rootSha,
    mirrorChangelogSha: mirrorSha,
    changelogSync:
      rootExists && mirrorExists
        ? rootSha === mirrorSha
          ? "aligned"
          : "mismatch"
        : "missing",
    rootChangelogUpdatedAt: rootExists ? changelogUpdatedAt(env, rootPath) : null,
    mirrorChangelogUpdatedAt: mirrorExists
      ? changelogUpdatedAt(env, mirrorPath)
      : null,
    unreleasedText: rootExists ? extractUnreleasedSection(rootText) : "",
    ...localBuildInfo(env),
  };
}

function missingCmsFields(cms) {
  if (!cms || typeof cms !== "object") {
    return [...REQUIRED_CMS_FIELDS];
  }

  return REQUIRED_CMS_FIELDS.filter((field) => {
    if (!Object.prototype.hasOwnProperty.call(cms, field)) {
      return true;
    }

    const value = cms[field];
    return value == null || (typeof value === "string" && value.trim() === "");
  });
}

async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function apiUrlForRecord(record) {
  if (record?.metadata?.apiUrl) {
    return record.metadata.apiUrl;
  }

  if (record?.domain) {
    return `https://api.${record.domain}`;
  }

  return PARENT_API_URL;
}

async function fetchSiteHealth(fetchImpl, target) {
  try {
    const response = await fetchImpl(`${target.apiUrl.replace(/\/+$/, "")}/health`, {
      headers: {
        accept: "application/json",
      },
    });
    const payload = await parseJsonResponse(response);
    const cms = payload?.cms && typeof payload.cms === "object" ? payload.cms : null;
    const missingFields = missingCmsFields(cms);

    return {
      siteKey: target.siteKey,
      domain: target.domain,
      apiUrl: target.apiUrl,
      httpStatus: response.status,
      healthStatus: response.ok ? "reachable" : "status_unavailable",
      fetchedAt: nowIso(),
      error: response.ok
        ? null
        : payload?.error || `HTTP ${response.status} from ${target.apiUrl}/health`,
      cms,
      missingFields,
    };
  } catch (error) {
    return {
      siteKey: target.siteKey,
      domain: target.domain,
      apiUrl: target.apiUrl,
      httpStatus: null,
      healthStatus: "status_unavailable",
      fetchedAt: nowIso(),
      error: error.message || `Unable to reach ${target.apiUrl}/health`,
      cms: null,
      missingFields: [...REQUIRED_CMS_FIELDS],
    };
  }
}

function compareSourceToParent(source, parent) {
  if (source.changelogSync !== "aligned") {
    return {
      status: "telemetry_missing",
      updateAvailable: false,
      message:
        "The local root changelog and local-mirror changelog are not aligned, so rollout status is incomplete.",
    };
  }

  if (parent.healthStatus !== "reachable") {
    return {
      status: "status_unavailable",
      updateAvailable: false,
      message: "The live mastersite health endpoint is unavailable.",
    };
  }

  if (parent.missingFields.length > 0) {
    return {
      status: "telemetry_missing",
      updateAvailable: false,
      message:
        "The live mastersite does not expose the required release telemetry yet.",
    };
  }

  if (source.rootChangelogSha !== parent.cms?.changelog_sha) {
    return {
      status: "changelog_live_pending",
      updateAvailable: true,
      message:
        "Local changelog state is ahead of the live mastersite. A rollout is still pending.",
    };
  }

  return {
    status: "aligned",
    updateAvailable: false,
    message: "Local changelog state matches the live mastersite.",
  };
}

function compareParentToSite(parent, site) {
  if (parent.healthStatus !== "reachable" || site.healthStatus !== "reachable") {
    return {
      status: "status_unavailable",
      updateAvailable: false,
      message: "Live rollout status is unavailable for this site.",
    };
  }

  if (parent.missingFields.length > 0 || site.missingFields.length > 0) {
    return {
      status: "telemetry_missing",
      updateAvailable: false,
      message: "Release telemetry is incomplete for this site comparison.",
    };
  }

  if (parent.cms?.changelog_sha && site.cms?.changelog_sha) {
    if (parent.cms.changelog_sha === site.cms.changelog_sha) {
      return {
        status: "aligned",
        updateAvailable: false,
        message: "This site matches the live mastersite release.",
      };
    }

    return {
      status: "update_available",
      updateAvailable: true,
      message: "The live mastersite is ahead of this site.",
    };
  }

  if (parent.cms?.build && site.cms?.build && parent.cms.build === site.cms.build) {
    return {
      status: "aligned",
      updateAvailable: false,
      message: "This site matches the live mastersite build.",
    };
  }

  return {
    status: "update_available",
    updateAvailable: true,
    message: "This site differs from the live mastersite build.",
  };
}

function summarizeMasterStatus(masterStatus) {
  const hardFailures = [];
  const warnings = [];

  if (masterStatus.source.changelogSync !== "aligned") {
    hardFailures.push(
      "Root and local-mirror changelog files are not aligned.",
    );
  }

  if (!masterStatus.pathHealth.ok) {
    hardFailures.push(
      `${masterStatus.pathHealth.findings.length} active legacy-path references remain.`,
    );
  }

  if (masterStatus.parent.healthStatus !== "reachable") {
    hardFailures.push("The live mastersite health endpoint is unavailable.");
  } else if (masterStatus.parent.missingFields.length > 0) {
    hardFailures.push("The live mastersite is missing required release telemetry.");
  }

  if (masterStatus.sourceVsParent.status === "changelog_live_pending") {
    warnings.push("Local changelog state is ahead of the live mastersite.");
  }

  for (const client of masterStatus.clients) {
    if (client.comparison.status === "update_available") {
      warnings.push(`${client.domain} is behind the live mastersite.`);
    }

    if (client.comparison.status === "telemetry_missing") {
      hardFailures.push(`${client.domain} is missing required release telemetry.`);
    }

    if (client.comparison.status === "status_unavailable") {
      hardFailures.push(`${client.domain} rollout status is unavailable.`);
    }
  }

  return {
    status:
      hardFailures.length > 0
        ? "error"
        : warnings.length > 0
          ? "warning"
          : "aligned",
    hardFailures,
    warnings,
    pendingParentRollout:
      masterStatus.sourceVsParent.status === "changelog_live_pending",
    clientUpdateCount: masterStatus.clients.filter(
      (client) => client.comparison.status === "update_available",
    ).length,
  };
}

export function createLavprisRolloutService({
  env,
  db,
  fetchImpl = fetch,
  ttlMs = 30_000,
}) {
  let masterCache = null;

  async function computeMasterStatus() {
    const source = sourceChangelogState(env);
    const pathHealth = collectLavprisPathHealth({ env });
    const parent = await fetchSiteHealth(fetchImpl, {
      siteKey: PARENT_SITE_KEY,
      domain: PARENT_DOMAIN,
      apiUrl: env.lavprisParentApiUrl || "https://api.lavprishjemmeside.dk",
    });
    const sourceVsParent = compareSourceToParent(source, parent);
    const records = db
      .listClientAgents()
      .filter((record) => record.domain !== PARENT_DOMAIN);

    const clients = await Promise.all(
      records.map(async (record) => {
        const site = await fetchSiteHealth(fetchImpl, {
          siteKey: record.siteKey,
          domain: record.domain,
          apiUrl: apiUrlForRecord(record),
        });

        return {
          ...site,
          clientAgentId: record.agentId,
          comparison: compareParentToSite(parent, site),
        };
      }),
    );

    const snapshot = {
      generatedAt: nowIso(),
      source,
      pathHealth,
      parent,
      sourceVsParent,
      clients,
    };

    return {
      ...snapshot,
      summary: summarizeMasterStatus(snapshot),
    };
  }

  return {
    requireMasterToken(token) {
      if (!env.lavprisMasterToken) {
        const error = new Error("Lavpris master rollout status is not configured.");
        error.statusCode = 503;
        throw error;
      }

      if (String(token || "").trim() !== env.lavprisMasterToken) {
        const error = new Error("Master rollout token rejected.");
        error.statusCode = 403;
        throw error;
      }
    },
    async getMasterRolloutStatus(options = {}) {
      if (
        !options.force &&
        masterCache &&
        masterCache.expiresAt > Date.now()
      ) {
        return masterCache.payload;
      }

      const payload = await computeMasterStatus();
      masterCache = {
        expiresAt: Date.now() + ttlMs,
        payload,
      };
      return payload;
    },
    async getSiteRolloutStatus(siteKey, options = {}) {
      const payload = await this.getMasterRolloutStatus(options);

      if (siteKey === PARENT_SITE_KEY) {
        return {
          generatedAt: payload.generatedAt,
          siteKey,
          domain: PARENT_DOMAIN,
          parent: payload.parent,
          comparison: payload.sourceVsParent,
        };
      }

      const site = payload.clients.find((entry) => entry.siteKey === siteKey);
      if (!site) {
        const error = new Error(`Unknown Lavprishjemmeside site: ${siteKey}`);
        error.statusCode = 404;
        throw error;
      }

      return {
        generatedAt: payload.generatedAt,
        siteKey: site.siteKey,
        domain: site.domain,
        parent: payload.parent,
        site,
        comparison: site.comparison,
      };
    },
    async getReleaseHealth(options = {}) {
      const rollout = await this.getMasterRolloutStatus(options);
      const exitCode =
        rollout.summary.hardFailures.length > 0
          ? 2
          : rollout.summary.warnings.length > 0
            ? 1
            : 0;

      return {
        generatedAt: nowIso(),
        exitCode,
        rollout,
      };
    },
  };
}
