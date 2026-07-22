#!/usr/bin/env node
// Admin screenshot harness: logs in via the dev endpoint, injects the auth
// store into localStorage, then screenshots the requested path (desktop).
import { chromium } from "playwright";

const path = process.argv[2] ?? "/";
const out = process.argv[3] ?? "/tmp/admin.png";
const API = "http://localhost:4000/api/v1";

const res = await fetch(`${API}/auth/admin/telegram-login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ id: 100000001, first_name: "7MZ", hash: "dev-mode-unsigned", auth_date: Math.floor(Date.now() / 1000) }),
});
const auth = await res.json();

const browser = await chromium.launch({ args: ["--no-sandbox", "--force-color-profile=srgb"] });
try {
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1.5, colorScheme: "dark" });
  page.on("pageerror", (e) => console.error("[pageerror]", e.message));
  await page.goto("http://localhost:3001/login", { waitUntil: "domcontentloaded" });
  await page.evaluate((state) => {
    localStorage.setItem(
      "7mz-admin-auth",
      JSON.stringify({ state: { user: state.user, accessToken: state.tokens.accessToken, refreshToken: state.tokens.refreshToken }, version: 0 }),
    );
  }, auth);
  await page.goto(`http://localhost:3001${path}`, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: out });
  console.log(`✅ ${out}`);
} finally {
  await browser.close();
}
