import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const EXTENSION_BUNDLE_DIRS = [
  path.join(os.homedir(), ".vscode", "extensions"),
  path.join(os.homedir(), ".cursor", "extensions"),
];

const STATUS_CACHE_TTL_MS = 5000;

export class ClaudeCliRuntimeError extends Error {
  constructor(message) {
    super(message);
    this.name = "ClaudeCliRuntimeError";
  }
}

function trimEvidence(value, limit = 240) {
  const normalized = String(value || "").trim().replace(/\s+/g, " ");

  if (!normalized) {
    return "";
  }

  return normalized.length > limit
    ? `${normalized.slice(0, Math.max(0, limit - 1)).trimEnd()}…`
    : normalized;
}

function isExecutableFile(candidate) {
  if (!candidate) {
    return false;
  }

  try {
    const stats = fs.statSync(candidate);
    fs.accessSync(candidate, fs.constants.X_OK);
    return stats.isFile();
  } catch {
    return false;
  }
}

function whichBinary(name) {
  if (!name) {
    return null;
  }

  const result = spawnSync("which", [name], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  if (result.status !== 0) {
    return null;
  }

  const resolved = String(result.stdout || "").trim();
  return resolved || null;
}

function resolveExtensionBundleBinary() {
  for (const baseDir of EXTENSION_BUNDLE_DIRS) {
    try {
      const matches = fs
        .readdirSync(baseDir, { withFileTypes: true })
        .filter(
          (entry) =>
            entry.isDirectory() &&
            entry.name.startsWith("anthropic.claude-code-"),
        )
        .map((entry) =>
          path.join(baseDir, entry.name, "resources", "native-binary", "claude"),
        )
        .filter(isExecutableFile)
        .sort();

      if (matches.length > 0) {
        return matches.at(-1);
      }
    } catch {
      continue;
    }
  }

  return null;
}

function resolveClaudeBinary(env) {
  const configuredCandidates = [
    String(env.claudeBinaryPath || "").trim(),
    String(env.claudeBinary || "").trim(),
  ].filter(Boolean);

  for (const candidate of configuredCandidates) {
    if (path.isAbsolute(candidate) && isExecutableFile(candidate)) {
      return {
        path: candidate,
        evidence: "configured_binary",
      };
    }

    const onPath = whichBinary(candidate);
    if (onPath) {
      return {
        path: onPath,
        evidence:
          candidate === "claude" ? "binary_on_path" : "configured_binary_on_path",
      };
    }
  }

  const defaultOnPath = whichBinary("claude");
  if (defaultOnPath) {
    return {
      path: defaultOnPath,
      evidence: "binary_on_path",
    };
  }

  const bundleBinary = resolveExtensionBundleBinary();
  if (bundleBinary) {
    return {
      path: bundleBinary,
      evidence: "binary_from_extension_bundle",
    };
  }

  return {
    path: null,
    evidence: "binary_missing",
  };
}

function normalizeModelAlias(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "haiku" || normalized === "sonnet" || normalized === "opus") {
    return normalized;
  }

  return "sonnet";
}

function parseAuthPayload(raw) {
  const text = String(raw || "").trim();

  if (!text) {
    return {
      loggedIn: null,
      authMethod: null,
      apiProvider: null,
      email: null,
      orgId: null,
      orgName: null,
      subscriptionType: null,
    };
  }

  try {
    const payload = JSON.parse(text);
    return {
      loggedIn:
        typeof payload.loggedIn === "boolean" ? payload.loggedIn : null,
      authMethod: payload.authMethod || null,
      apiProvider: payload.apiProvider || null,
      email: payload.email || null,
      orgId: payload.orgId || null,
      orgName: payload.orgName || null,
      subscriptionType: payload.subscriptionType || null,
    };
  } catch {
    const normalized = text.toLowerCase();
    return {
      loggedIn:
        normalized.includes("not logged in") ||
        normalized.includes("not authenticated")
          ? false
          : normalized.includes("logged in") ||
              normalized.includes("authenticated")
            ? true
            : null,
      authMethod: null,
      apiProvider: null,
      email: null,
      orgId: null,
      orgName: null,
      subscriptionType: null,
    };
  }
}

function runtimeErrorText(result) {
  const stdout = trimEvidence(result.stdout);
  const stderr = trimEvidence(result.stderr);
  const combined = stdout || stderr;
  const normalized = combined.toLowerCase();

  if (normalized.includes("hit your limit")) {
    return `subscription_limit:${combined}`;
  }

  if (
    normalized.includes("auth") &&
    (normalized.includes("login") ||
      normalized.includes("logged") ||
      normalized.includes("authenticate"))
  ) {
    return `auth_required:${combined}`;
  }

  return combined
    ? `exit_code:${result.code}:${combined}`
    : `exit_code:${result.code}`;
}

function commandEnv() {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key !== "CLAUDECODE"),
  );
}

function runCommand(binaryPath, args, options = {}) {
  const timeoutMs = Math.max(
    1000,
    Number.parseInt(options.timeoutMs ?? "45000", 10) || 45000,
  );

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const child = spawn(binaryPath, args, {
      cwd: options.cwd || undefined,
      env: options.env || commandEnv(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      child.kill("SIGKILL");
      reject(new ClaudeCliRuntimeError(`timeout:${timeoutMs}`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      reject(new ClaudeCliRuntimeError(`runtime_error:${error.message}`));
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      resolve({
        code: Number(code ?? 0),
        stdout,
        stderr,
      });
    });
  });
}

function initialStatus(binary) {
  if (!binary.path) {
    return {
      backend: "claude_cli_oauth",
      status: "missing",
      evidence: binary.evidence,
      binaryPath: null,
      checkedAt: null,
      loggedIn: false,
      authMethod: null,
      apiProvider: null,
      email: null,
      orgId: null,
      orgName: null,
      subscriptionType: null,
    };
  }

  return {
    backend: "claude_cli_oauth",
    status: "checking",
    evidence: binary.evidence,
    binaryPath: binary.path,
    checkedAt: null,
    loggedIn: null,
    authMethod: null,
    apiProvider: null,
    email: null,
    orgId: null,
    orgName: null,
    subscriptionType: null,
  };
}

export function createClaudeCliRuntime(env = process.env) {
  const binary = resolveClaudeBinary(env);
  let cachedStatus = initialStatus(binary);
  let cachedAt = 0;

  function getStatusSnapshot() {
    return { ...cachedStatus };
  }

  async function status(options = {}) {
    if (!binary.path) {
      cachedStatus = initialStatus(binary);
      cachedAt = Date.now();
      return getStatusSnapshot();
    }

    const includeLiveCheck = Boolean(options.includeLiveCheck);
    const force = Boolean(options.force);
    const now = Date.now();

    if (
      !force &&
      cachedAt > 0 &&
      now - cachedAt < STATUS_CACHE_TTL_MS &&
      (!includeLiveCheck || cachedStatus.evidence === "cli_runtime_ok")
    ) {
      return getStatusSnapshot();
    }

    const timeoutMs = Math.max(
      5000,
      Number.parseInt(env.claudeTimeoutMs ?? "45000", 10) || 45000,
    );
    const checkedAt = new Date().toISOString();

    try {
      const authResult = await runCommand(binary.path, ["auth", "status"], {
        timeoutMs,
      });
      const parsed = parseAuthPayload(authResult.stdout);

      if (authResult.code !== 0 || parsed.loggedIn === false) {
        cachedStatus = {
          backend: "claude_cli_oauth",
          status: "partial",
          evidence: "cli_not_authenticated",
          binaryPath: binary.path,
          checkedAt,
          ...parsed,
        };
        cachedAt = now;
        return getStatusSnapshot();
      }

      if (parsed.loggedIn == null) {
        cachedStatus = {
          backend: "claude_cli_oauth",
          status: "partial",
          evidence: "invalid_status_payload",
          binaryPath: binary.path,
          checkedAt,
          ...parsed,
        };
        cachedAt = now;
        return getStatusSnapshot();
      }

      cachedStatus = {
        backend: "claude_cli_oauth",
        status: "live",
        evidence: "cli_auth_ok",
        binaryPath: binary.path,
        checkedAt,
        ...parsed,
      };
      cachedAt = now;

      if (!includeLiveCheck) {
        return getStatusSnapshot();
      }

      try {
        await runCompletion({
          modelFamily: options.modelFamily || "sonnet",
          systemPrompt: "Reply with OK only.",
          userPrompt: "OK",
          timeoutMs: Math.min(timeoutMs, 15000),
        });
        cachedStatus = {
          ...cachedStatus,
          evidence: "cli_runtime_ok",
          checkedAt: new Date().toISOString(),
        };
      } catch (error) {
        cachedStatus = {
          ...cachedStatus,
          status: "partial",
          evidence: error.message || "cli_runtime_failed",
          checkedAt: new Date().toISOString(),
        };
      }

      cachedAt = Date.now();
      return getStatusSnapshot();
    } catch (error) {
      cachedStatus = {
        backend: "claude_cli_oauth",
        status: "partial",
        evidence: trimEvidence(
          error.message || "status_error:unknown_runtime_failure",
        ),
        binaryPath: binary.path,
        checkedAt,
        loggedIn: null,
        authMethod: null,
        apiProvider: null,
        email: null,
        orgId: null,
        orgName: null,
        subscriptionType: null,
      };
      cachedAt = now;
      return getStatusSnapshot();
    }
  }

  function recordFailure(message) {
    cachedStatus = {
      ...cachedStatus,
      status: "partial",
      evidence: trimEvidence(message || "cli_runtime_failed"),
      checkedAt: new Date().toISOString(),
    };
    cachedAt = Date.now();
  }

  async function runCompletion({
    systemPrompt,
    userPrompt,
    modelFamily = "sonnet",
    timeoutMs = null,
    effort = null,
    allowTools = false,
    cwd = null,
  }) {
    if (!binary.path) {
      throw new ClaudeCliRuntimeError(binary.evidence);
    }

    const args = [
      "--print",
      "--model",
      normalizeModelAlias(modelFamily),
      "--system-prompt",
      String(systemPrompt || "").trim(),
      "--no-session-persistence",
      "--permission-mode",
      "bypassPermissions",
      "--output-format",
      "text",
    ];

    if (!allowTools) {
      args.push("--tools=");
    }

    const normalizedEffort = String(effort || "").trim().toLowerCase();
    if (
      normalizedEffort === "low" ||
      normalizedEffort === "medium" ||
      normalizedEffort === "high"
    ) {
      args.push("--effort", normalizedEffort);
    }

    args.push(String(userPrompt || "").trim());

    const result = await runCommand(binary.path, args, {
      timeoutMs:
        timeoutMs ||
        Math.max(5000, Number.parseInt(env.claudeTimeoutMs ?? "45000", 10) || 45000),
      cwd,
    });

    if (result.code !== 0) {
      throw new ClaudeCliRuntimeError(runtimeErrorText(result));
    }

    const output = String(result.stdout || "").trim();
    if (!output) {
      throw new ClaudeCliRuntimeError("empty_output");
    }

    cachedStatus = {
      ...cachedStatus,
      status: "live",
      evidence: "cli_runtime_ok",
      checkedAt: new Date().toISOString(),
    };
    cachedAt = Date.now();

    return {
      text: output,
    };
  }

  return {
    backend: "claude_cli_oauth",
    available: Boolean(binary.path),
    resolvedBinaryPath: binary.path,
    getStatusSnapshot,
    status,
    recordFailure,
    runCompletion,
  };
}

export default createClaudeCliRuntime;
