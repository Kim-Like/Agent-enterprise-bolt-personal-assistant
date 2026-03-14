import fs from "node:fs";
import path from "node:path";

const LEGACY_PATH_RULES = Object.freeze([
  {
    id: "legacy-absolute-root",
    description: "Retired absolute AI-Enterprise repo root",
    pattern: /\/Users\/IAn\/Agent\/AI-Enterprise\b/g,
  },
  {
    id: "legacy-relative-root",
    description: "Retired AI-Enterprise repo-relative path prefix",
    pattern: /\bAI-Enterprise\//g,
  },
  {
    id: "legacy-lavpris-site-root",
    description: "Retired Lavprishjemmeside site-root checkout path",
    pattern: /\bprograms\/lavprishjemmeside\/lavprishjemmeside\.dk\//g,
  },
]);

const ACTIVE_TARGETS = Object.freeze([
  { base: "codexHome", relative: "config.toml" },
  {
    base: "codexHome",
    relative: "rules",
    recursive: true,
    extensions: [".rules"],
  },
  {
    base: "codexHome",
    relative: "agents",
    recursive: true,
    extensions: [".md", ".toml"],
  },
  { base: "codexHome", relative: "gsd-file-manifest.json" },
  { base: "cwd", relative: "AGENTS.md" },
  { base: "cwd", relative: "INTRODUCTION.md" },
  { base: "cwd", relative: "TECHSTACK.md" },
  {
    base: "cwd",
    relative: "docs",
    recursive: true,
    extensions: [".md"],
  },
  {
    base: "cwd",
    relative: "server/src",
    recursive: true,
    extensions: [".js", ".json", ".md"],
  },
  {
    base: "cwd",
    relative: "scripts",
    recursive: true,
    extensions: [".sh", ".mjs", ".cjs", ".js", ".md", ".json"],
  },
  {
    base: "cwd",
    relative: "programs/lavprishjemmeside",
    recursive: true,
    extensions: [".md", ".js", ".mjs", ".cjs", ".json"],
  },
  { base: "cwd", relative: "programs/ian-agency/README.md" },
  { base: "cwd", relative: "programs/ian-agency/contexts/README.md" },
  { base: "cwd", relative: "programs/ian-agency/contexts/samlino/README.md" },
  { base: "cwd", relative: "programs/baltzer/TCG-index/README.md" },
]);

const WALK_IGNORES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".cache",
  ".data",
  "sessions",
  "shell_snapshots",
  "log",
]);

function relativeTo(baseRoot, filePath) {
  return path.relative(baseRoot, filePath).replace(/\\/g, "/");
}

function resolveBasePath(env, base) {
  if (base === "cwd") {
    return env.cwd;
  }

  if (base === "codexHome") {
    return env.codexHome;
  }

  throw new Error(`Unknown path-health base: ${base}`);
}

function extensionSet(target) {
  return new Set(target.extensions || []);
}

function shouldIncludeFile(target, filePath) {
  if (!target.extensions || target.extensions.length === 0) {
    return true;
  }

  return extensionSet(target).has(path.extname(filePath).toLowerCase());
}

function collectTargetFiles(target, env, files) {
  const baseRoot = resolveBasePath(env, target.base);
  const targetPath = path.resolve(baseRoot, target.relative);

  if (!fs.existsSync(targetPath)) {
    return;
  }

  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    files.add(targetPath);
    return;
  }

  if (!target.recursive) {
    for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
      const entryPath = path.join(targetPath, entry.name);
      if (entry.isFile() && shouldIncludeFile(target, entryPath)) {
        files.add(entryPath);
      }
    }
    return;
  }

  const stack = [targetPath];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (!WALK_IGNORES.has(entry.name)) {
          stack.push(entryPath);
        }
        continue;
      }

      if (entry.isFile() && shouldIncludeFile(target, entryPath)) {
        files.add(entryPath);
      }
    }
  }
}

function collectLineMatches(content, rule) {
  const matches = [];
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!rule.pattern.test(line)) {
      continue;
    }

    matches.push({
      line: index + 1,
      text: line.trim().slice(0, 240),
    });
    rule.pattern.lastIndex = 0;
  }

  rule.pattern.lastIndex = 0;
  return matches;
}

export function collectLavprisPathHealth({ env }) {
  const files = new Set();
  for (const target of ACTIVE_TARGETS) {
    collectTargetFiles(target, env, files);
  }

  const findings = [];
  for (const filePath of [...files].sort()) {
    let content = "";

    try {
      content = fs.readFileSync(filePath, "utf8");
    } catch {
      continue;
    }

    for (const rule of LEGACY_PATH_RULES) {
      const matches = collectLineMatches(content, rule);
      if (matches.length === 0) {
        continue;
      }

      findings.push({
        ruleId: rule.id,
        description: rule.description,
        file: relativeTo(env.cwd, filePath),
        matches,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    ok: findings.length === 0,
    scannedFileCount: files.size,
    ignoredRoots: [
      path.join(env.codexHome, "sessions"),
      path.join(env.codexHome, "session_index.jsonl"),
      path.join(env.codexHome, "shell_snapshots"),
      path.join(env.codexHome, "state_*.sqlite*"),
      path.join(env.codexHome, "log"),
    ],
    findings,
  };
}

