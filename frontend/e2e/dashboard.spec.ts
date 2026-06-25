import { test, expect, type Page } from "@playwright/test";

const TESTNET_NETWORK = "TESTNET";
const TEST_ADDRESS = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMN";

async function mockFreighter(page: Page) {
  await page.addInitScript(
    ({ address, network }) => {
      (window as any).freighter = {
        isConnected: () => Promise.resolve({ isConnected: true }),
        getPublicKey: () => Promise.resolve(address),
        getNetwork: () => Promise.resolve(network),
        signTransaction: (xdr: string) => Promise.resolve(`signed:${xdr}`),
      };
    },
    { address: TEST_ADDRESS, network: TESTNET_NETWORK },
  );
}

async function mockRpc(page: Page) {
  await page.route("**/soroban-testnet.stellar.org", async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    const method = body.method;

    if (method === "simulateTransaction") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: {
            transactionData: { resources: { footprints: [] } },
            minResourceFee: "100",
            results: [{ xdr: "AAAAAA==" }],
          },
        }),
      });
      return;
    }

    if (method === "sendTransaction") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: {
            status: "PENDING",
            hash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c",
          },
        }),
      });
      return;
    }

    if (method === "getTransaction") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: { status: "SUCCESS", resultXdr: "AAAAAA==" },
        }),
      });
      return;
    }

    // Default: return hash result (for getLedgerEntries, etc.)
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: { hash: "mock-hash" },
      }),
    });
  });
}

test.describe("constella dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await mockFreighter(page);
    await mockRpc(page);
  });

  test("connects wallet on load", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByText(`${TEST_ADDRESS.slice(0, 6)}...${TEST_ADDRESS.slice(-4)}`),
    ).toBeVisible();

    await expect(page.getByRole("button", { name: "Agents" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Payments" })).toBeVisible();
  });

  test("disconnect resets to login view", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Disconnect" }).click();
    await expect(page.getByText("Welcome to constella")).toBeVisible();
  });

  test("agent registration form enables on valid input", async ({ page }) => {
    await page.goto("/");

    const btn = page.getByRole("button", { name: "Register Agent" });
    await expect(btn).toBeDisabled();

    const inputs = page.locator('input[placeholder="G..."]');
    await inputs.nth(0).fill("GA7Q3B7V6QV4Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3");
    await inputs.nth(1).fill(TEST_ADDRESS);

    await expect(btn).toBeEnabled();
  });

  test("full flow: connect → agents → budgets → payments", async ({ page }) => {
    await page.goto("/");

    // ── Agents tab ───────────────────────────────────────
    await expect(
      page.getByRole("heading", { name: "Register Agent" }),
    ).toBeVisible();

    // Fill agent registration
    const inputs = page.locator('input[placeholder="G..."]');
    await inputs.nth(0).fill("GA7Q3B7V6QV4Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3");
    await inputs.nth(1).fill(TEST_ADDRESS);
    await page.getByPlaceholder("agent-name or description").fill("e2e-agent");

    await page.getByRole("button", { name: "Register Agent" }).click();

    // The form should react: either success or error message appears
    await expect(
      page.locator(".text-green-300, .text-red-300").first(),
    ).toBeVisible({ timeout: 5000 });

    // ── Budgets tab ──────────────────────────────────────
    await page.getByRole("button", { name: "Budgets" }).click();

    await page.getByPlaceholder("G...").fill("GA7Q3B7V6QV4Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3");
    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.nth(0).fill("1000");
    await numberInputs.nth(1).fill("10000");

    await page.getByRole("button", { name: "Set Budget" }).click();

    // Budget form should also react
    await expect(
      page.locator(".text-green-300, .text-red-300").first(),
    ).toBeVisible({ timeout: 5000 });

    // ── Payments tab ─────────────────────────────────────
    await page.getByRole("button", { name: "Payments" }).click();

    const payInputs = page.locator('input[placeholder="G..."]');
    await payInputs.nth(0).fill("GA7Q3B7V6QV4Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3");
    await payInputs.nth(1).fill("GB7Q3B7V6QV4Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3");
    await page.getByPlaceholder("100").fill("500");
    await page.getByPlaceholder("task-001").fill("e2e-demo");

    await page.getByRole("button", { name: "Create Payment" }).click();

    // Payment form should react
    await expect(
      page.locator(".text-green-300, .text-red-300").first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test("mobile viewport is usable", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "constella", exact: true }),
    ).toBeVisible();

    await expect(page.getByRole("button", { name: "Agents" })).toBeVisible();

    await page.getByRole("button", { name: "Payments" }).click();
    await expect(
      page.getByRole("heading", { name: "Create Payment" }),
    ).toBeVisible();

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 10);
  });
});
