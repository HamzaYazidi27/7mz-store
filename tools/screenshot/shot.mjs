#!/usr/bin/env node
/**
 * 7MZ Store — visual QA harness.
 * Captures pixel-accurate screenshots of the running app at an iPhone-class
 * viewport (390×844 @2x, dark scheme).
 *
 * Usage:
 *   node tools/screenshot/shot.mjs <url> <outfile> [--full] [--wait=ms] [--selector=css]
 */

import { chromium } from "playwright";

const args = process.argv.slice(2);
const url = args[0] ?? "http://localhost:3000";
const out = args[1] ?? "/tmp/shot.png";
const fullPage = args.includes("--full");
const waitArg = args.find((a) => a.startsWith("--wait="));
const selectorArg = args.find((a) => a.startsWith("--selector="));
const extraWait = waitArg ? Number(waitArg.split("=")[1]) : 1400;
const selector = selectorArg ? selectorArg.split("=")[1] : null;

const browser = await chromium.launch({
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-color-profile=srgb"],
});

try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") console.error("[console.error]", msg.text());
  });
  page.on("pageerror", (err) => console.error("[pageerror]", err.message));

  await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
  if (selector) {
    await page.waitForSelector(selector, { timeout: 30_000 });
  }
  await page.waitForTimeout(extraWait); // let entrance animations settle

  await page.screenshot({ path: out, fullPage });
  console.log(`✅ ${out}`);
} finally {
  await browser.close();
}
