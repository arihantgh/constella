import { test, expect, type Page } from "@playwright/test";

const TESTNET_NETWORK = "TESTNET";
const TEST_ADDRESS = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMN";

/**
 * Inject a mock Freighter extension into the page before the app loads.
 * This lets the useWallet hook auto-connect on mount.
 */
async function mockFreighter(page: Page) {
  await page.addInitScript(
    ({ address, network }) => {
      (window as any).freighter = {
        isConnected: () => Promise.resolve({ isConnected: true }),
        getPublicKey: () => Promise.resolve(address),
        getNetwork: () => Promise.resolve(network),
        signTransaction: (xdr: string) =>
          Promise.resolve(`signed:${xdr}`),
      };
    },
    { address: TEST_ADDRESS, network: TESTNET_NETWORK },
  );
}

/**
 * Mock the Soroban RPC endpoint so contract calls return
 * predictable responses without hitting the real Testnet.
 */
async function mockRpc(page: Page) {
  await page.route("**/soroban-testnet.stellar.org", async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    const method = body.method;

    // Return appropriate mock responses per method
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
          result: {
            status: "SUCCESS",
            resultXdr: "AAAAAA==",
          },
        }),
      });
      return;
    }

    if (method === "simulateTransaction") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: {
            transactionData: {
              resources: { footprints: [] },
            },
            minResourceFee: 100,
            results: [{ xdr: "AAAAAA==" }],
          },
        }),
      });
      return;
    }

    // Default: return empty result
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

    // Should show connected state with truncated address
    await expect(
      page.getByText(`${TEST_ADDRESS.slice(0, 6)}...${TEST_ADDRESS.slice(-4)}`),
    ).toBeVisible();

    // Should show the tab bar
    await expect(page.getByText("Agents")).toBeVisible();
    await expect(page.getByText("Payments")).toBeVisible();
  });

  test("disconnect resets to login view", async ({ page }) => {
    await page.goto("/");

    // Click disconnect
    await page.getByText("Disconnect").click();

    // Should show the welcome screen
    await expect(page.getByText("Welcome to constella")).toBeVisible();
    await expect(page.getByText("Connect Wallet")).toBeVisible();
  });

  test("agent registration form enables on valid input", async ({ page }) => {
    await page.goto("/");

    const btn = page.getByText("Register Agent");
    await expect(btn).toBeDisabled();

    // Fill in the form
    const inputs = page.locator('input[placeholder="G..."]');
    await inputs.nth(0).fill("GA7Q3B7V6QV4Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3");
    await inputs.nth(1).fill(TEST_ADDRESS);

    await expect(btn).toBeEnabled();
  });

  test("full flow: connect → agents → budgets → payments", async ({ page }) => {
    await page.goto("/");

    // ── Agents tab ───────────────────────────────────────
    await expect(page.getByText("Register Agent")).toBeVisible();

    // Fill agent registration
    const inputs = page.locator('input[placeholder="G..."]');
    await inputs.nth(0).fill("GA7Q3B7V6QV4Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3");
    await inputs.nth(1).fill(TEST_ADDRESS);
    await page.getByPlaceholder("agent-name or description").fill("e2e-agent");

    // Click Register Agent
    await page.getByText("Register Agent").click();

    // Should show success state
    await expect(page.getByText("Agent registered successfully!")).toBeVisible();

    // ── Budgets tab ──────────────────────────────────────
    await page.getByText("Budgets").click();

    await page.getByPlaceholder("G...").fill("GA7Q3B7V6QV4Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3");
    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.nth(0).fill("1000");
    await numberInputs.nth(1).fill("10000");

    await page.getByText("Set Budget").click();
    await expect(page.getByText("Budget configured successfully!")).toBeVisible();

    // ── Payments tab ─────────────────────────────────────
    await page.getByText("Payments").click();

    // Fill payment form
    const payInputs = page.locator('input[placeholder="G..."]');
    await payInputs.nth(0).fill("GA7Q3B7V6QV4Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3");
    await payInputs.nth(1).fill("GB7Q3B7V6QV4Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3Q7Q3");
    await page.getByPlaceholder("100").fill("500");
    await page.getByPlaceholder("task-001").fill("e2e-demo");

    await page.getByText("Create Payment").click();
    await expect(page.getByText(/Payment created/)).toBeVisible({ timeout: 5000 });
  });

  test("mobile viewport is usable", async ({ page }) => {
    // Set viewport to 360px (iPhone SE size)
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/");

    // Header should be visible
    await expect(page.getByText("constella")).toBeVisible();

    // Tab bar should be present
    await expect(page.getByText("Agents")).toBeVisible();

    // Navigate to payments tab and check it renders
    await page.getByText("Payments").click();
    await expect(page.getByText("Create Payment")).toBeVisible();

    // No horizontal scroll on this narrow viewport
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 10); // allow tiny rounding
  });
});
