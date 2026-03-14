const DEFAULT_API_BASE_URL = "https://api.anthropic.com";
const DEFAULT_API_VERSION = "2023-06-01";
const DEFAULT_TIMEOUT_MS = 30000;

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function createHttpError(message, statusCode, payload = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.payload = payload;
  return error;
}

export function createAnthropicClient(env = process.env) {
  const apiKey = env.anthropicApiKey || env.ANTHROPIC_API_KEY || "";
  const apiBaseUrl = trimTrailingSlash(
    env.anthropicApiBaseUrl || env.ANTHROPIC_API_BASE_URL || DEFAULT_API_BASE_URL,
  );
  const apiVersion = env.anthropicApiVersion || DEFAULT_API_VERSION;
  const timeoutMs = Number.parseInt(
    env.anthropicTimeoutMs || env.ANTHROPIC_TIMEOUT_MS || `${DEFAULT_TIMEOUT_MS}`,
    10,
  );

  return {
    configured: Boolean(apiKey),
    mode: apiKey ? "anthropic-api" : "simulated",
    label: apiKey ? "Anthropic API" : "Local simulation",
    modelApiBaseUrl: apiBaseUrl,
    async createMessage({ model, system, messages, maxTokens = 1024 }) {
      if (!apiKey) {
        throw createHttpError(
          "Anthropic API key is not configured.",
          503,
        );
      }

      const response = await fetch(`${apiBaseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": apiVersion,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system,
          messages,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw createHttpError(
          payload?.error?.message ||
            payload?.message ||
            `Anthropic request failed with ${response.status}.`,
          response.status,
          payload,
        );
      }

      const text = (payload?.content || [])
        .filter((block) => block?.type === "text")
        .map((block) => block.text)
        .join("\n\n")
        .trim();

      return {
        id: payload?.id || null,
        model: payload?.model || model,
        stopReason: payload?.stop_reason || null,
        text,
        usage: {
          inputTokens: payload?.usage?.input_tokens ?? null,
          outputTokens: payload?.usage?.output_tokens ?? null,
          totalTokens:
            (payload?.usage?.input_tokens ?? 0) +
              (payload?.usage?.output_tokens ?? 0) || null,
          source: "provider-measured",
        },
      };
    },
  };
}

export default createAnthropicClient;
