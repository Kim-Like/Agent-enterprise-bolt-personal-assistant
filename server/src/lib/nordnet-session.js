import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createPrivateKey, sign } from "node:crypto";

const NORDNET_ACCOUNTS = {
  vp: "130440064864036",
  investment: "64864036",
  pension: "66114745",
  ratepension: "6614810",
};

function resolveKeyPath(rawPath) {
  if (!rawPath) return "";
  if (rawPath.startsWith("~")) {
    return path.join(os.homedir(), rawPath.slice(1));
  }
  return rawPath;
}

function loadPrivateKey(keyPath) {
  const resolved = resolveKeyPath(keyPath);
  if (!resolved || !fs.existsSync(resolved)) return null;
  const pem = fs.readFileSync(resolved, "utf8");
  return createPrivateKey(pem);
}

function signChallenge(challenge, privateKey) {
  const buf = Buffer.from(challenge, "utf8");
  const signature = sign(null, buf, privateKey);
  return signature.toString("base64");
}

export function createNordnetSession(env) {
  let sessionKey = null;
  let expiresAt = 0;
  let refreshPromise = null;

  const baseUrl = env.nordnetBaseUrl || "https://www.nordnet.dk/api/2";
  const apiKey = env.nordnetApiKey || "";
  const privateKeyPath = env.nordnetPrivateKeyPath || "";

  function isConfigured() {
    return Boolean(apiKey && privateKeyPath);
  }

  function isValid() {
    return Boolean(sessionKey && Date.now() < expiresAt - 60_000);
  }

  async function authenticate() {
    if (!isConfigured()) {
      throw new Error("Nordnet API not configured: NORDNET_API_KEY and NORDNET_PRIVATE_KEY_PATH are required");
    }

    const privateKey = loadPrivateKey(privateKeyPath);
    if (!privateKey) {
      throw new Error(`Nordnet private key not found at: ${privateKeyPath}`);
    }

    const startResp = await fetch(`${baseUrl}/login/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ api_key: apiKey }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!startResp.ok) {
      const text = await startResp.text().catch(() => "");
      throw new Error(`Nordnet login/start failed (${startResp.status}): ${text}`);
    }

    const { challenge } = await startResp.json();
    if (!challenge) throw new Error("Nordnet login/start returned no challenge");

    const signedChallenge = signChallenge(challenge, privateKey);

    const verifyResp = await fetch(`${baseUrl}/login/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ api_key: apiKey, signed_challenge: signedChallenge }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!verifyResp.ok) {
      const text = await verifyResp.text().catch(() => "");
      throw new Error(`Nordnet login/verify failed (${verifyResp.status}): ${text}`);
    }

    const data = await verifyResp.json();
    sessionKey = data.session_key;
    expiresAt = Date.now() + (data.expires_in || 1800) * 1000;

    return sessionKey;
  }

  async function getSession() {
    if (isValid()) return sessionKey;
    if (refreshPromise) return refreshPromise;
    refreshPromise = authenticate().finally(() => { refreshPromise = null; });
    return refreshPromise;
  }

  function authHeader(key) {
    const credentials = Buffer.from(`${key}:${key}`).toString("base64");
    return `Basic ${credentials}`;
  }

  async function request(method, path, body) {
    const key = await getSession();
    const url = `${baseUrl}${path}`;
    const opts = {
      method,
      headers: {
        "Authorization": authHeader(key),
        "Accept": "application/json",
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(15_000),
    };
    if (body) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }

    const resp = await fetch(url, opts);
    if (resp.status === 401) {
      sessionKey = null;
      expiresAt = 0;
      throw new Error("Nordnet session expired — re-authentication required");
    }
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Nordnet API ${method} ${path} failed (${resp.status}): ${text}`);
    }
    return resp.json();
  }

  async function getStatus() {
    if (!isConfigured()) {
      return { configured: false, connected: false, sessionKey: null, expiresAt: null };
    }
    return {
      configured: true,
      connected: isValid(),
      sessionKey: sessionKey ? `${sessionKey.slice(0, 8)}...` : null,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      accounts: NORDNET_ACCOUNTS,
    };
  }

  return {
    isConfigured,
    isValid,
    getSession,
    request,
    getStatus,
    accounts: NORDNET_ACCOUNTS,
    authenticate,
  };
}
