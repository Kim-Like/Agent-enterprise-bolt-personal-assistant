import os from "node:os";
import path from "node:path";

function parsePort(value, fallback) {
  const candidate = Number.parseInt(value ?? `${fallback}`, 10);

  if (Number.isNaN(candidate) || candidate <= 0) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return candidate;
}

function resolveFromCwd(cwd, value) {
  return path.isAbsolute(value) ? value : path.resolve(cwd, value);
}

function normalizeLoopbackHost(value) {
  if (!value || value === "0.0.0.0") {
    return "127.0.0.1";
  }

  return value;
}

export function loadEnv(source = process.env) {
  const cwd = source.APP_ROOT ? path.resolve(source.APP_ROOT) : process.cwd();
  const host = source.HOST || "127.0.0.1";
  const port = parsePort(source.PORT, 3000);
  const lavprisPublicIngressHost =
    source.LAVPRIS_PUBLIC_INGRESS_HOST || "127.0.0.1";
  const lavprisPublicIngressPort = parsePort(
    source.LAVPRIS_PUBLIC_INGRESS_PORT,
    8000,
  );
  const lavprisParentApiUrl =
    source.LAVPRIS_PARENT_API_URL || "https://api.lavprishjemmeside.dk";
  const appDataDirInput = source.APP_DATA_DIR || ".data";
  const sqlitePathInput =
    source.SQLITE_PATH || path.join(appDataDirInput, "control-plane.sqlite");
  const generatedClientAgentRootInput =
    source.LAVPRIS_CLIENT_AGENT_ROOT_PATH ||
    "agents/lavprishjemmeside/clients";
  const generatedClientAgentRegistryInput =
    source.LAVPRIS_CLIENT_AGENT_REGISTRY_PATH ||
    path.join(appDataDirInput, "lavpris-client-agents.registry.json");
  const originHost = normalizeLoopbackHost(host);
  const publicIngressOriginHost = normalizeLoopbackHost(lavprisPublicIngressHost);

  return Object.freeze({
    appName: source.APP_NAME || "Agent Enterprise",
    appEnv: source.APP_ENV || "development",
    defaultModelProvider: (source.DEFAULT_MODEL_PROVIDER || "claude").toLowerCase(),
    host,
    port,
    controlPlaneOrigin: `http://${originHost}:${port}`,
    logLevel: source.LOG_LEVEL || "info",
    cwd,
    appDataDir: resolveFromCwd(cwd, appDataDirInput),
    sqlitePath: resolveFromCwd(cwd, sqlitePathInput),
    publicOrigin: source.PUBLIC_ORIGIN || `http://${originHost}:${port}`,
    internalApiToken: source.AGENT_ENTERPRISE_INTERNAL_TOKEN || "",
    lavprisMasterToken:
      source.AGENT_ENTERPRISE_LAVPRIS_MASTER_TOKEN ||
      source.LAVPRIS_MASTER_TOKEN ||
      "",
    lavprisPublicIngressHost,
    lavprisPublicIngressPort,
    lavprisPublicIngressOrigin:
      source.LAVPRIS_PUBLIC_INGRESS_ORIGIN ||
      `http://${publicIngressOriginHost}:${lavprisPublicIngressPort}`,
    lavprisParentApiUrl,
    codexHome: resolveFromCwd(
      cwd,
      source.CODEX_HOME || path.join(os.homedir(), ".codex"),
    ),
    agentRegistryPath: resolveFromCwd(
      cwd,
      source.AGENT_REGISTRY_PATH || "agents/registry.json",
    ),
    generatedClientAgentRootPath: resolveFromCwd(
      cwd,
      generatedClientAgentRootInput,
    ),
    generatedClientAgentRegistryPath: resolveFromCwd(
      cwd,
      generatedClientAgentRegistryInput,
    ),
    programRegistryPath: resolveFromCwd(
      cwd,
      source.PROGRAM_REGISTRY_PATH || "programs/registry.json",
    ),
    modelProfilePath: resolveFromCwd(
      cwd,
      source.MODEL_PROFILE_PATH || "config/model-profiles.json",
    ),
    claudeBinary: source.CLAUDE_BINARY || "claude",
    claudeBinaryPath: source.CLAUDE_BINARY_PATH || "",
    claudeTimeoutMs: source.CLAUDE_TIMEOUT_MS || "45000",
    anthropicApiKey: source.ANTHROPIC_API_KEY || "",
    anthropicApiBaseUrl: source.ANTHROPIC_API_BASE_URL || "https://api.anthropic.com",
    anthropicApiVersion: source.ANTHROPIC_API_VERSION || "2023-06-01",
    anthropicTimeoutMs: source.ANTHROPIC_TIMEOUT_MS || "30000",
    lavprisProvisionToken: source.LAVPRIS_PROVISION_TOKEN || "",
  });
}
