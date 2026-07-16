import { test, expect, type Page } from "@playwright/test";

const TEST_ADDRESS = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMN";
const TESTNET_NETWORK = "TESTNET";

async function mockFreighter(page: Page) {
  await page.addInitScript(
    `window.freighter = true;
    window.addEventListener("message", function(event) {
      var data = event.data;
      if (data && data.source === "FREIGHTER_EXTERNAL_MSG_REQUEST" && event.source === window) {
        var msgId = data.messagedId;
        var resp = { source: "FREIGHTER_EXTERNAL_MSG_RESPONSE", messagedId: msgId };
        switch (data.type) {
          case "REQUEST_CONNECTION_STATUS":
            resp.isConnected = true;
            break;
          case "REQUEST_PUBLIC_KEY":
            resp.publicKey = "${TEST_ADDRESS}";
            break;
          case "REQUEST_NETWORK_DETAILS":
            resp.networkDetails = { network: "${TESTNET_NETWORK}", networkPassphrase: "Test SDF Network ; September 2015" };
            break;
          case "REQUEST_ACCESS":
            resp.publicKey = "${TEST_ADDRESS}";
            break;
          case "REQUEST_ALLOWED_STATUS":
            resp.isAllowed = true;
            break;
          case "SET_ALLOWED_STATUS":
            resp.isAllowed = true;
            break;
          case "SUBMIT_TRANSACTION":
            resp.signedTransaction = "signed:" + data.transactionXdr;
            resp.signerAddress = "${TEST_ADDRESS}";
            break;
          default:
            return;
        }
        window.postMessage(resp, "*");
      }
    });`,
  );
}

test.describe("constella dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await mockFreighter(page);
  });

  test("page loads with header", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "constella", exact: true }),
    ).toBeVisible();
  });

  test("shows connect wallet button", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Connect Wallet" }).first(),
    ).toBeVisible();
  });

  test("shows contract architecture footer", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Contract Architecture" }),
    ).toBeVisible();
  });

  test("dark mode toggle is present", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Toggle dark mode" }),
    ).toBeVisible();
  });

  test("network selector is present", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("combobox", { name: "Select network" })).toBeVisible();
  });
});
