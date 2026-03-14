import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

import { rootDir } from "./support.js";

const mirrorRoot = path.join(
  rootDir,
  "programs",
  "lavprishjemmeside",
  "local-mirror",
);

const files = {
  server: path.join(mirrorRoot, "api", "server.cjs"),
  env: path.join(mirrorRoot, "api", ".env.example"),
  schema: path.join(mirrorRoot, "api", "src", "schema_shop.sql"),
  publicRoute: path.join(mirrorRoot, "api", "src", "routes", "shop-public.cjs"),
  adminRoute: path.join(mirrorRoot, "api", "src", "routes", "shop-admin.cjs"),
  flatpayRoute: path.join(mirrorRoot, "api", "src", "routes", "shop-flatpay.cjs"),
  flatpayService: path.join(mirrorRoot, "api", "src", "services", "flatpay.cjs"),
  emailService: path.join(mirrorRoot, "api", "src", "services", "shop-email.cjs"),
  layout: path.join(mirrorRoot, "src", "layouts", "Layout.astro"),
  header: path.join(mirrorRoot, "src", "components", "Header.astro"),
  cartScript: path.join(mirrorRoot, "src", "scripts", "cart.js"),
  productGridDoc: path.join(mirrorRoot, "api", "src", "component-docs", "product-grid.md"),
  shopHeroDoc: path.join(mirrorRoot, "api", "src", "component-docs", "shop-hero.md"),
};

const frontendPages = [
  "src/pages/shop/index.astro",
  "src/pages/shop/[category].astro",
  "src/pages/shop/produkt/[slug].astro",
  "src/pages/shop/kurv.astro",
  "src/pages/shop/checkout.astro",
  "src/pages/shop/ordre/[token].astro",
  "src/pages/admin/shop/products.astro",
  "src/pages/admin/shop/orders.astro",
  "src/pages/admin/shop/settings.astro",
].map((relativePath) => path.join(mirrorRoot, relativePath));

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function assertParses(filePath) {
  const result = spawnSync(process.execPath, ["--check", filePath], {
    encoding: "utf8",
  });

  assert.equal(
    result.status,
    0,
    `Expected ${path.basename(filePath)} to parse cleanly.\n${result.stderr || result.stdout}`,
  );
}

test("Lavprishjemmeside shop module source files exist and parse", () => {
  for (const filePath of Object.values(files)) {
    assert.equal(fs.existsSync(filePath), true, filePath);
  }

  for (const filePath of frontendPages) {
    assert.equal(fs.existsSync(filePath), true, filePath);
  }

  for (const filePath of [
    files.server,
    files.publicRoute,
    files.adminRoute,
    files.flatpayRoute,
    files.flatpayService,
    files.emailService,
  ]) {
    assertParses(filePath);
  }
});

test("Lavprishjemmeside shop module mounts webhook, admin, and public routes in safe order", () => {
  const serverSource = read(files.server);
  const envSource = read(files.env);

  const flatpayIndex = serverSource.indexOf("app.use('/shop/flatpay', shopFlatpayRoutes);");
  const adminIndex = serverSource.indexOf("app.use('/shop/admin', shopAdminRoutes);");
  const publicIndex = serverSource.indexOf("app.use('/shop', shopPublicRoutes);");

  assert.ok(flatpayIndex >= 0);
  assert.ok(adminIndex >= 0);
  assert.ok(publicIndex >= 0);
  assert.ok(flatpayIndex < adminIndex);
  assert.ok(adminIndex < publicIndex);

  for (const envVar of [
    "FLATPAY_API_KEY",
    "FLATPAY_WEBHOOK_SECRET",
    "FLATPAY_TEST_MODE",
    "FLATPAY_WEBHOOK_URL",
    "FLATPAY_ACCEPT_URL",
    "FLATPAY_CANCEL_URL",
  ]) {
    assert.match(envSource, new RegExp(`^${envVar}=`, "m"));
  }
});

test("Lavprishjemmeside shop schema defines the expected catalog, order, and settings tables", () => {
  const schema = read(files.schema);

  for (const tableName of [
    "product_categories",
    "products",
    "product_variants",
    "product_images",
    "customers",
    "shipping_methods",
    "discount_codes",
    "orders",
    "order_items",
    "order_events",
    "shop_settings",
  ]) {
    assert.match(
      schema,
      new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName}\\s*\\(`),
    );
  }

  assert.match(schema, /INSERT IGNORE INTO shipping_methods/i);
  assert.match(schema, /INSERT IGNORE INTO shop_settings/i);
  assert.match(schema, /flatpay_session_id/i);
  assert.match(schema, /flatpay_charge_id/i);
  assert.match(schema, /processed_webhook_ids/i);
});

test("Lavprishjemmeside shop route modules declare the expected public, admin, and webhook surface", () => {
  const publicRoute = read(files.publicRoute);
  const adminRoute = read(files.adminRoute);
  const flatpayRoute = read(files.flatpayRoute);
  const flatpayService = read(files.flatpayService);

  for (const pattern of [
    /router\.get\('\/products'/,
    /router\.get\('\/products\/:slug'/,
    /router\.get\('\/categories'/,
    /router\.post\('\/cart\/validate'/,
    /router\.get\('\/shipping\/methods'/,
    /router\.post\('\/discount\/validate'/,
    /router\.post\('\/orders'/,
    /router\.get\('\/orders\/:token'/,
  ]) {
    assert.match(publicRoute, pattern);
  }

  for (const pattern of [
    /router\.get\('\/products'/,
    /router\.post\('\/products'/,
    /router\.put\('\/products\/:id'/,
    /router\.delete\('\/products\/:id'/,
    /router\.get\('\/orders'/,
    /router\.get\('\/orders\/:id'/,
    /router\.post\('\/orders\/:id\/status'/,
    /router\.post\('\/orders\/:id\/tracking'/,
    /router\.get\('\/shipping'/,
    /router\.get\('\/discounts'/,
    /router\.get\('\/settings'/,
    /router\.post\('\/settings'/,
    /router\.get\('\/dashboard'/,
  ]) {
    assert.match(adminRoute, pattern);
  }

  assert.match(flatpayRoute, /router\.post\('\/webhook'/);
  assert.match(flatpayRoute, /verifyWebhookSignature/);
  assert.match(flatpayRoute, /charge_settled/);
  assert.match(flatpayService, /createCheckoutSession/);
  assert.match(flatpayService, /verifyWebhookSignature/);
  assert.match(flatpayService, /timingSafeEqual/);
});

test("Lavprishjemmeside shop frontend shell is wired into the public site and admin", () => {
  const layout = read(files.layout);
  const header = read(files.header);
  const cartScript = read(files.cartScript);
  const productGridDoc = read(files.productGridDoc);
  const shopHeroDoc = read(files.shopHeroDoc);

  assert.match(layout, /CartDrawer/);
  assert.match(header, /CartIcon/);
  assert.match(header, /href=\"\/shop\/\"|href=\/shop\//);
  assert.match(cartScript, /localStorage/);
  assert.match(cartScript, /validateCart/);
  assert.match(productGridDoc, /product-grid/i);
  assert.match(shopHeroDoc, /shop-hero/i);
});
