import fs from "node:fs/promises";

function assertCatalog(rawCatalog) {
  if (!rawCatalog || !Array.isArray(rawCatalog.models) || rawCatalog.models.length === 0) {
    throw new Error("Model catalog must define at least one model profile.");
  }

  return rawCatalog;
}

export async function loadModelCatalog(env) {
  const raw = await fs.readFile(env.modelProfilePath, "utf8");
  return buildModelCatalog(JSON.parse(raw));
}

export function buildModelCatalog(rawCatalog) {
  const catalog = assertCatalog(rawCatalog);
  const models = catalog.models.map((model) => ({
    family: model.family,
    providerId: model.providerId,
    label: model.label,
    maxContextTokens: model.maxContextTokens,
    reservedReplyTokens: model.reservedReplyTokens,
  }));
  const modelMap = new Map(models.map((model) => [model.family, model]));
  const defaultModelFamily = modelMap.has(catalog.defaultModelFamily)
    ? catalog.defaultModelFamily
    : models[0].family;

  return Object.freeze({
    defaultModelFamily,
    models,
    modelMap,
  });
}

export function listModelCatalog(catalog, _agentId) {
  return catalog.models.map((model) => ({
    family: model.family,
    providerId: model.providerId,
    label: model.label,
    maxContextTokens: model.maxContextTokens,
    reservedReplyTokens: model.reservedReplyTokens,
    available: true,
    reason: null,
  }));
}

export function resolveModel(catalog, family) {
  return catalog.modelMap.get(family || catalog.defaultModelFamily) || null;
}

export function requireModel(catalog, family) {
  const model = resolveModel(catalog, family);

  if (!model) {
    throw new Error(`Unknown model family: ${family}`);
  }

  return model;
}

export function estimateTokens(value) {
  if (!value) {
    return 0;
  }

  const text = typeof value === "string" ? value : JSON.stringify(value);
  const normalized = text.trim();
  if (!normalized) {
    return 0;
  }

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const charCount = normalized.length;
  return Math.max(1, Math.ceil(charCount / 4), Math.ceil(wordCount * 1.35));
}

export default {
  buildModelCatalog,
  estimateTokens,
  listModelCatalog,
  loadModelCatalog,
  requireModel,
  resolveModel,
};
