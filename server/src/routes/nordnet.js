const KNOWN_ACCOUNTS = {
  vp: "130440064864036",
  investment: "64864036",
  pension: "66114745",
  ratepension: "6614810",
};

const ACCOUNT_LABELS = {
  "130440064864036": { label: "VP Account", type: "vp" },
  "64864036": { label: "Investment", type: "investment" },
  "66114745": { label: "Pension", type: "pension" },
  "6614810": { label: "Rate Pension", type: "ratepension" },
};

function resolveAccountIds(query) {
  if (!query) return Object.values(KNOWN_ACCOUNTS);
  if (query === "all") return Object.values(KNOWN_ACCOUNTS);
  if (KNOWN_ACCOUNTS[query]) return [KNOWN_ACCOUNTS[query]];
  return [query];
}

function mapNordnetAccount(raw, accountId) {
  const meta = ACCOUNT_LABELS[String(accountId)] || {};
  return {
    accountId: String(accountId),
    label: meta.label || raw.label || String(accountId),
    accountType: meta.type || "investment",
    currency: raw.currency || "DKK",
    totalValue: raw.total_account_value?.value ?? null,
    ownCapital: raw.own_capital?.value ?? null,
    buyingPower: raw.buying_power?.value ?? null,
    rawData: raw,
  };
}

function mapNordnetPosition(raw, accountId) {
  const inst = raw.instrument || {};
  return {
    accountId: String(accountId),
    instrumentId: String(raw.instrument_id || inst.instrument_id || ""),
    isin: inst.isin_code || "",
    symbol: inst.symbol || "",
    name: inst.name || inst.instrument_name || "",
    quantity: raw.qty ?? 0,
    avgPrice: raw.average_acquisition_price?.value ?? null,
    lastPrice: raw.last_trade_price?.value ?? null,
    marketValue: raw.market_value?.value ?? null,
    unrealizedPnl: raw.unrealized_gain?.value ?? null,
    unrealizedPnlPct: raw.unrealized_gain_percent ?? null,
    currency: raw.market_value?.currency || "DKK",
    rawData: raw,
  };
}

function mapNordnetOrder(raw, accountId) {
  const inst = raw.instrument || {};
  return {
    orderId: String(raw.order_id),
    accountId: String(accountId),
    instrumentId: String(raw.instrument_id || inst.instrument_id || ""),
    isin: inst.isin_code || "",
    symbol: inst.symbol || "",
    name: inst.name || "",
    orderType: raw.order_type || "LIMIT",
    side: raw.side || "BUY",
    quantity: raw.qty ?? 0,
    price: raw.price?.value ?? null,
    status: raw.order_state || "active",
    currency: raw.price?.currency || "DKK",
    createdAt: raw.created_at || null,
    rawData: raw,
  };
}

function mapNordnetTrade(raw, accountId) {
  const inst = raw.instrument || {};
  return {
    tradeId: String(raw.trade_id),
    accountId: String(accountId),
    instrumentId: String(raw.instrument_id || inst.instrument_id || ""),
    isin: inst.isin_code || "",
    symbol: inst.symbol || "",
    name: inst.name || "",
    side: raw.side || "BUY",
    quantity: raw.qty ?? 0,
    price: raw.price?.value ?? 0,
    amount: raw.amount?.value ?? 0,
    currency: raw.price?.currency || "DKK",
    tradedAt: raw.trade_timestamp || raw.created_at || new Date().toISOString(),
    rawData: raw,
  };
}

export async function nordnetRoutes(app) {
  const db = app.controlPlane.db;
  const nordnet = app.controlPlane.nordnetSession;

  app.get("/api/pa/nordnet/status", async () => {
    return nordnet.getStatus();
  });

  app.post("/api/pa/nordnet/connect", async (request, reply) => {
    if (!nordnet.isConfigured()) {
      return reply.code(400).send({
        error: "Nordnet API not configured. Set NORDNET_API_KEY and NORDNET_PRIVATE_KEY_PATH in .env",
        configured: false,
      });
    }
    try {
      await nordnet.authenticate();
      const status = await nordnet.getStatus();
      return { connected: true, ...status };
    } catch (err) {
      return reply.code(502).send({ error: err.message, connected: false });
    }
  });

  app.get("/api/pa/nordnet/accounts", async (request, reply) => {
    if (!nordnet.isConfigured()) {
      const cached = db.nordnet.listAccounts();
      return { source: "cache", entries: cached, accounts: KNOWN_ACCOUNTS };
    }

    try {
      const data = await nordnet.request("GET", "/accounts");
      const accounts = Array.isArray(data) ? data : (data.accounts || []);

      for (const raw of accounts) {
        const mapped = mapNordnetAccount(raw, raw.accid || raw.account_id);
        db.nordnet.upsertAccount(mapped);
      }

      const cached = db.nordnet.listAccounts();
      return { source: "live", entries: cached, accounts: KNOWN_ACCOUNTS };
    } catch (err) {
      const cached = db.nordnet.listAccounts();
      return { source: "cache-fallback", error: err.message, entries: cached, accounts: KNOWN_ACCOUNTS };
    }
  });

  app.get("/api/pa/nordnet/positions", async (request) => {
    const { account } = request.query;
    const accountIds = resolveAccountIds(account);

    if (!nordnet.isConfigured()) {
      const positions = nordnet.isConfigured() ? [] : db.nordnet.listPositions(account ? accountIds[0] : null);
      return { source: "cache", entries: positions };
    }

    const allPositions = [];

    for (const accountId of accountIds) {
      try {
        const data = await nordnet.request("GET", `/accounts/${accountId}/positions`);
        const positions = Array.isArray(data) ? data : (data.positions || []);

        db.nordnet.clearPositions(accountId);

        for (const raw of positions) {
          const mapped = mapNordnetPosition(raw, accountId);
          db.nordnet.upsertPosition(mapped);
          allPositions.push({ ...mapped, rawData: undefined });
        }
      } catch (_err) {
        const cached = db.nordnet.listPositions(accountId);
        allPositions.push(...cached);
      }
    }

    return {
      source: nordnet.isValid() ? "live" : "cache",
      total: allPositions.length,
      entries: allPositions,
    };
  });

  app.get("/api/pa/nordnet/orders", async (request) => {
    const { account } = request.query;
    const accountIds = resolveAccountIds(account);

    if (!nordnet.isConfigured()) {
      return { source: "cache", entries: db.nordnet.listOrders(account ? accountIds[0] : null) };
    }

    const allOrders = [];

    for (const accountId of accountIds) {
      try {
        const data = await nordnet.request("GET", `/accounts/${accountId}/orders`);
        const orders = Array.isArray(data) ? data : (data.orders || []);

        for (const raw of orders) {
          const mapped = mapNordnetOrder(raw, accountId);
          db.nordnet.upsertOrder(mapped);
          allOrders.push({ ...mapped, rawData: undefined });
        }
      } catch (_err) {
        const cached = db.nordnet.listOrders(accountId);
        allOrders.push(...cached);
      }
    }

    return {
      source: nordnet.isValid() ? "live" : "cache",
      total: allOrders.length,
      entries: allOrders,
    };
  });

  app.get("/api/pa/nordnet/trades", async (request) => {
    const { account, limit } = request.query;
    const accountIds = resolveAccountIds(account);
    const limitN = limit ? Number(limit) : 50;

    if (!nordnet.isConfigured()) {
      return { source: "cache", entries: db.nordnet.listTrades(account ? accountIds[0] : null, { limit: limitN }) };
    }

    const allTrades = [];

    for (const accountId of accountIds) {
      try {
        const data = await nordnet.request("GET", `/accounts/${accountId}/trades?limit=${limitN}`);
        const trades = Array.isArray(data) ? data : (data.trades || []);

        for (const raw of trades) {
          const mapped = mapNordnetTrade(raw, accountId);
          db.nordnet.upsertTrade(mapped);
          allTrades.push({ ...mapped, rawData: undefined });
        }
      } catch (_err) {
        const cached = db.nordnet.listTrades(accountId, { limit: limitN });
        allTrades.push(...cached);
      }
    }

    allTrades.sort((a, b) => new Date(b.tradedAt) - new Date(a.tradedAt));

    return {
      source: nordnet.isValid() ? "live" : "cache",
      total: allTrades.length,
      entries: allTrades.slice(0, limitN),
    };
  });

  app.post("/api/pa/nordnet/sync", async (request, reply) => {
    if (!nordnet.isConfigured()) {
      return reply.code(400).send({ error: "Nordnet not configured" });
    }

    const results = {};
    const accountIds = Object.values(KNOWN_ACCOUNTS);

    for (const accountId of accountIds) {
      try {
        const posData = await nordnet.request("GET", `/accounts/${accountId}/positions`);
        const positions = Array.isArray(posData) ? posData : (posData.positions || []);
        db.nordnet.clearPositions(accountId);

        let synced = 0;
        for (const raw of positions) {
          const mapped = mapNordnetPosition(raw, accountId);
          db.nordnet.upsertPosition(mapped);

          const sym = mapped.symbol || mapped.isin;
          if (sym && mapped.quantity > 0) {
            const existing = db.inv.getHoldingBySymbol(sym);
            if (!existing) {
              const { randomUUID } = await import("node:crypto");
              db.inv.upsertHolding({
                id: randomUUID(),
                symbol: sym,
                name: mapped.name || sym,
                assetType: "stock",
                currency: mapped.currency || "DKK",
                isin: mapped.isin,
                notes: `Imported from Nordnet account ${accountId}`,
              });
            }
          }
          synced++;
        }

        results[accountId] = { ok: true, positionsSynced: synced };
      } catch (err) {
        results[accountId] = { ok: false, error: err.message };
      }
    }

    return { syncedAt: new Date().toISOString(), accounts: results };
  });
}

export default nordnetRoutes;
