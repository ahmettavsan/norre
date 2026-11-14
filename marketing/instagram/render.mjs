// Renders poster.html to poster.png (2160×2700, Instagram downsizes it to 1080×1350 sharply).
// Needs playwright-core and a Chromium: PLAYWRIGHT_CHROMIUM=/path/to/chrome node render.mjs
import { chromium } from 'playwright-core';
import os from 'node:os';

const exe =
  process.env.PLAYWRIGHT_CHROMIUM ||
  `${os.homedir()}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const dir = new URL('./', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
await page.goto('file://' + dir + 'poster.html');
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
await page.screenshot({ path: dir + 'poster.png' });
await browser.close();
