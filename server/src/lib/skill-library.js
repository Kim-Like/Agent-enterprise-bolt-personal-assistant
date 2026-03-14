import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function stripQuotes(value) {
  const normalized = String(value || "").trim();
  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    return normalized.slice(1, -1);
  }

  return normalized;
}

function parseFrontmatter(raw) {
  const match = String(raw || "").match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return {
      metadata: {},
      body: String(raw || "").trim(),
    };
  }

  const metadata = {};
  for (const line of match[1].split(/\r?\n/)) {
    const entry = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!entry) {
      continue;
    }

    metadata[entry[1]] = stripQuotes(entry[2]);
  }

  return {
    metadata,
    body: match[2].trim(),
  };
}

function safeReadDir(rootPath) {
  try {
    return fs.readdirSync(rootPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

function skillRoots(env) {
  const codexHome =
    env?.codexHome ||
    process.env.CODEX_HOME ||
    path.join(os.homedir(), ".codex");

  return [
    {
      scope: "project",
      rootPath: path.resolve(env.cwd, ".agents", "skills"),
    },
    {
      scope: "user",
      rootPath: path.resolve(codexHome, "skills"),
    },
  ];
}

function readSkillRecord(rootPath, scope, directoryName) {
  const skillRoot = path.join(rootPath, directoryName);
  const sourcePath = path.join(skillRoot, "SKILL.md");

  if (!fs.existsSync(sourcePath)) {
    return null;
  }

  const content = fs.readFileSync(sourcePath, "utf8");
  const parsed = parseFrontmatter(content);
  const name = stripQuotes(parsed.metadata.name || directoryName);
  const description = stripQuotes(parsed.metadata.description || "");

  if (!name) {
    return null;
  }

  return {
    name,
    description,
    scope,
    directoryName,
    rootPath: skillRoot,
    sourcePath,
    content,
    body: parsed.body,
  };
}

export function normalizeRequestedSkills(values = []) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

export function listSkillLibrary(env) {
  const discovered = [];

  for (const source of skillRoots(env)) {
    for (const entry of safeReadDir(source.rootPath)) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) {
        continue;
      }

      const record = readSkillRecord(source.rootPath, source.scope, entry.name);
      if (record) {
        discovered.push(record);
      }
    }
  }

  const deduped = [];
  const seen = new Set();

  for (const record of discovered.sort((left, right) => {
    const scopeOrder = { project: 0, user: 1 };
    const leftOrder = scopeOrder[left.scope] ?? 9;
    const rightOrder = scopeOrder[right.scope] ?? 9;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.name.localeCompare(right.name);
  })) {
    if (seen.has(record.name)) {
      continue;
    }

    seen.add(record.name);
    deduped.push(record);
  }

  return deduped;
}

export function resolveSkillSelection(env, requestedSkills = [], options = {}) {
  const library = options.library || listSkillLibrary(env);
  const byName = new Map(library.map((skill) => [skill.name, skill]));
  const normalized = normalizeRequestedSkills(requestedSkills);
  const resolved = [];
  const missing = [];

  for (const name of normalized) {
    const skill = byName.get(name);
    if (skill) {
      resolved.push(skill);
    } else {
      missing.push(name);
    }
  }

  return {
    requestedSkills: normalized,
    resolved,
    missing,
  };
}

export default {
  listSkillLibrary,
  normalizeRequestedSkills,
  resolveSkillSelection,
};
