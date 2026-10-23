#!/usr/bin/env node
// Plan B de la demo: graba clips .webm de Mercadito y traces de DevTools con Playwright.
// Usa el Google Chrome instalado (channel: 'chrome'); no descarga navegadores.
//
//   node scripts/record-clips.mjs                 → los 3 clips + los 2 traces
//   node scripts/record-clips.mjs compare traces  → solo lo que nombres
//
// Clips  → slides/public/clips/{compare,broken-vs-fixed,ranking-inp}.webm
// Traces → docs/traces/mercadito-{broken,fixed}.json (ábrelos en DevTools → Performance → Load profile;
//          se ve la pista "Mercadito · GenUI" con Stream, Parser, Render y Ranking).
// Si la demo no está corriendo en DEMO_URL (http://localhost:5174), la levanta con `npm run dev:demo`.
import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = resolve(import.meta.dirname, '..');
const DEMO = process.env.DEMO_URL ?? 'http://localhost:5174';
const CLIPS = resolve(ROOT, 'slides/public/clips');
const TRACES = resolve(ROOT, 'docs/traces');
const PROMPT = 'Regalo de café bajo Q200';
const SIZE = { width: 1600, height: 900 }; // 16:9, igual que .clip en el slide

// Categorías que usa el panel Performance al grabar (blink.user_timing trae las pistas propias).
const CATEGORIES = [
  '-*',
  'blink.console',
  'blink.user_timing',
  'devtools.timeline',
  'disabled-by-default-devtools.timeline',
  'disabled-by-default-devtools.timeline.frame',
  'disabled-by-default-devtools.timeline.stack',
  'disabled-by-default-devtools.screenshot',
  'disabled-by-default-v8.cpu_profiler',
  'disabled-by-default-layout_shift.debug',
  'latencyInfo',
  'loading',
  'v8.execute',
];

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Escenas ──────────────────────────────────────────────────────────
/** Escribe el prompt como una persona y espera a que termine el stream. */
async function generate(page) {
  const input = page.locator('[data-prompt] input');
  await input.click();
  await input.fill('');
  await input.pressSequentially(PROMPT, { delay: 35 });
  await input.press('Enter');
  await page.waitForSelector('#genui[aria-busy="true"]');
  await page.waitForSelector('#genui[aria-busy="false"]', { timeout: 60_000 });
}

/** "Ordenar por recomendación" y espera a que el botón diga "Ordenado (…)". */
async function rank(page) {
  const sort = page.locator('[data-sort]');
  await sort.scrollIntoViewIfNeeded();
  await pause(600);
  await sort.click();
  await page.waitForFunction(() => document.querySelector('[data-sort]')?.textContent?.startsWith('Ordenado'), null, { timeout: 60_000 });
}

const SCENES = {
  /** 1) /compare.html: el mismo prompt en los dos iframes, con la tabla de métricas. */
  async compare(page) {
    await page.goto(`${DEMO}/compare.html`);
    await page.waitForLoadState('networkidle');
    await pause(800);
    const input = page.locator('[data-cmp] input');
    await input.fill('');
    await input.pressSequentially(PROMPT, { delay: 35 });
    await page.locator('[data-cmp] button').click();
    // La tabla dice "listo en …" en las dos columnas cuando ambos streams terminan.
    await page.waitForFunction(() => (document.querySelector('[data-table]')?.textContent?.match(/listo en/g) ?? []).length >= 2, null, { timeout: 90_000 });
    await page.locator('[data-table]').scrollIntoViewIfNeeded();
    await pause(2500);
  },
  /** 2) /?preset=broken genera, luego /?preset=fixed con el mismo prompt. */
  async 'broken-vs-fixed'(page) {
    for (const preset of ['broken', 'fixed']) {
      await page.goto(`${DEMO}/?preset=${preset}`);
      await page.waitForLoadState('networkidle');
      await pause(600);
      await generate(page);
      await pause(2000);
    }
  },
  /** 3) "Ordenar por recomendación": hilo principal con CPU 4× vs. Worker. */
  async 'ranking-inp'(page) {
    for (const query of ['preset=broken&cpu=4', 'preset=fixed']) {
      await page.goto(`${DEMO}/?${query}&q=${encodeURIComponent(PROMPT)}`);
      await page.waitForSelector('#genui[aria-busy="false"] [data-sort]', { timeout: 60_000 });
      await pause(500);
      await rank(page);
      await pause(2200);
    }
  },
};

// ── Grabación ────────────────────────────────────────────────────────
async function recordClip(browser, name) {
  const tmp = resolve(CLIPS, `.tmp-${name}`);
  const context = await browser.newContext({ viewport: SIZE, deviceScaleFactor: 1, recordVideo: { dir: tmp, size: SIZE }, locale: 'es-GT' });
  const page = await context.newPage();
  const t0 = Date.now();
  await SCENES[name](page);
  await context.close(); // cierra el video
  const out = resolve(CLIPS, `${name}.webm`);
  await page.video().saveAs(out);
  await rm(tmp, { recursive: true, force: true });
  console.log(`  ✓ clip  ${name}.webm (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}

/** Trace de DevTools: generar + ordenar, con CPU 4× simulada para que los villanos se noten. */
async function recordTrace(browser, preset) {
  const context = await browser.newContext({ viewport: SIZE, locale: 'es-GT' });
  const page = await context.newPage();
  await page.goto(`${DEMO}/?preset=${preset}&cpu=4`);
  await page.waitForLoadState('networkidle');
  const path = resolve(TRACES, `mercadito-${preset}.json`);
  await browser.startTracing(page, { path, screenshots: true, categories: CATEGORIES });
  await generate(page);
  await rank(page);
  await pause(500);
  await browser.stopTracing();
  await context.close();
  console.log(`  ✓ trace mercadito-${preset}.json`);
}

// ── Servidor de la demo ──────────────────────────────────────────────
const isUp = () =>
  fetch(DEMO)
    .then((r) => r.ok)
    .catch(() => false);

async function ensureDemo() {
  if (await isUp()) return null;
  console.log(`Levantando la demo en ${DEMO}…`);
  const child = spawn('npm', ['run', 'dev:demo'], { cwd: ROOT, stdio: 'ignore', detached: true });
  for (let i = 0; i < 60; i++) {
    await pause(500);
    if (await isUp()) return child;
  }
  throw new Error(`La demo no respondió en ${DEMO}`);
}

// ── Main ─────────────────────────────────────────────────────────────
const wanted = process.argv.slice(2);
const want = (k) => !wanted.length || wanted.includes(k);
const server = await ensureDemo();
await mkdir(CLIPS, { recursive: true });
await mkdir(TRACES, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  console.log('Grabando plan B de Mercadito:');
  for (const name of Object.keys(SCENES)) if (want(name)) await recordClip(browser, name);
  if (want('traces')) for (const preset of ['broken', 'fixed']) await recordTrace(browser, preset);
} finally {
  await browser.close();
  if (server) process.kill(-server.pid);
}
