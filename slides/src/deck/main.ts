// Controlador del deck: pie de página, tema, pantalla completa, menú, decoraciones
// (quitapenas, checklist) y la conexión en vivo con el público y la consola de la presentadora.
import {
  Activity,
  ArrowUpRight,
  Bot,
  Briefcase,
  Camera,
  CirclePlay,
  Cpu,
  Download,
  Eye,
  EyeOff,
  FileJson,
  FlaskConical,
  GitBranch,
  Globe,
  Hourglass,
  LayoutTemplate,
  Lightbulb,
  MemoryStick,
  MousePointerClick,
  MoveVertical,
  NotebookPen,
  Recycle,
  Route,
  Search,
  StickyNote,
  Trash2,
  Users,
  Waves,
  createIcons,
} from 'lucide';
import { CHECKLIST, SLIDE_BY_ID } from '../shared/content';
import { DEMO_URL, REPO_URL, publicLiveUrl, withSessionParams } from '../shared/config';
import { quitapenasSVG, randomDoll } from '../shared/quitapenas';
import { animateNotchLogos } from './gdg-logo';
import { initLive } from './live';
import { initEventScreen } from './screen';
import { initCodeFocus } from './code-focus';

type DeckStage = HTMLElement & { goTo(i: number): void; next(): void; prev(): void };

void animateNotchLogos().then(() => dispatchEvent(new Event('tweakchange')));

const stage = document.querySelector('deck-stage') as DeckStage;
const sections = [...stage.querySelectorAll<HTMLElement>(':scope > section')];
const total = sections.length;
const pad = (n: number) => String(n).padStart(2, '0');

// Cada slide del HTML debe existir en content.ts (fuente del celular, la consola y la memoria).
sections.forEach((s) => {
  if (!SLIDE_BY_ID.has(s.dataset.id ?? '')) console.warn('[deck] slide sin contenido en content.ts:', s.dataset.id);
});

// ── Pie de página con contador ───────────────────────────────────────
sections.forEach((s, i) => {
  if (i === 0) return;
  s.insertAdjacentHTML(
    'beforeend',
    `<div class="footer"><span>Instagram <b>@vanessamarelycode</b> · GitHub <b>vanessamarely</b> · <b>vanessamarely.dev</b></span><span>${pad(i + 1)} / ${total}</span></div>`,
  );
});

// ── Decoraciones: quitapenas de ejemplo y checklist ──────────────────
// Semilla fija por posición: las mismas muñecas en cada ensayo (y en las miniaturas).
const DECOR = [
  { traje: 0, patron: 0, cabello: 0, piel: 1, accesorio: 3, expresion: 0 },
  { traje: 1, patron: 1, cabello: 1, piel: 3, accesorio: 1, expresion: 1 },
  { traje: 3, patron: 2, cabello: 3, piel: 2, accesorio: 4, expresion: 0 },
  { traje: 4, patron: 3, cabello: 2, piel: 0, accesorio: 2, expresion: 2 },
  { traje: 2, patron: 0, cabello: 4, piel: 4, accesorio: 5, expresion: 3 },
  { traje: 0, patron: 1, cabello: 1, piel: 2, accesorio: 0, expresion: 1 },
];
document.querySelectorAll<HTMLElement>('[data-dolls]').forEach((el) => {
  const n = Number(el.dataset.dolls) || 3;
  el.innerHTML = Array.from({ length: n }, (_, i) => quitapenasSVG(DECOR[i % DECOR.length] ?? randomDoll(), 'Quitapenas').replace('<svg ', `<svg style="--i:${i}" `)).join('');
});
const checklist = document.querySelector('[data-checklist]');
if (checklist) checklist.innerHTML = CHECKLIST.map(([h, p]) => `<li><span><b>${h}:</b> ${p}</span></li>`).join('');

// ── Enlaces a la demo ────────────────────────────────────────────────
document.querySelectorAll<HTMLAnchorElement>('[data-demo-link]').forEach((a) => (a.href = new URL(a.dataset.demoLink!, DEMO_URL).toString()));

// ── Tema (claro DevFest / oscuro DevFest) ────────────────────────────
const isDark = () => document.documentElement.dataset.theme === 'dark';
function setTheme(dark: boolean) {
  if (dark) document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
  try {
    localStorage.setItem('deck.theme', dark ? 'dark' : 'light');
  } catch {
    /* noop */
  }
  dispatchEvent(new Event('tweakchange')); // deck-stage re-sincroniza las miniaturas
}
document.fonts?.ready.then(() => dispatchEvent(new Event('tweakchange')));

// ── Pantalla completa / panel lateral ────────────────────────────────
const toggleFullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => undefined);
let railOn = true;
try {
  railOn = localStorage.getItem('deck-stage.railVisible') !== '0';
} catch {
  /* noop */
}
const toggleRail = () => {
  railOn = !railOn;
  postMessage({ type: '__deck_rail_visible', on: railOn }, location.origin);
};

// ── Menú hamburguesa (siempre arriba a la derecha) ───────────────────
const menuBtn = document.querySelector<HTMLButtonElement>('.deck-menu-btn')!;
const menu = document.querySelector<HTMLElement>('.deck-menu-panel')!;
let current = Math.max(0, sections.findIndex((s) => s.hasAttribute('data-deck-active')));

menu.innerHTML = `
  <div class="group">Enlaces</div>
  <a href="${withSessionParams('/presenter/')}" target="_blank" rel="noreferrer">Consola de la presentadora <kbd>P</kbd></a>
  <a href="${publicLiveUrl()}" target="_blank" rel="noreferrer">App de asistentes <i data-lucide="arrow-up-right"></i></a>
  <a href="${DEMO_URL}" target="_blank" rel="noreferrer">Demo: Mercadito <i data-lucide="arrow-up-right"></i></a>
  <a href="${new URL('/compare.html', DEMO_URL)}" target="_blank" rel="noreferrer">Demo: roto vs. arreglado <i data-lucide="arrow-up-right"></i></a>
  <a href="${REPO_URL}" target="_blank" rel="noreferrer">Repositorio <i data-lucide="arrow-up-right"></i></a>
  <div class="group">Vista</div>
  <button type="button" data-act="theme">Modo claro / oscuro <kbd>L</kbd></button>
  <button type="button" data-act="fs">Pantalla completa <kbd>F</kbd></button>
  <button type="button" data-act="rail">Panel de miniaturas <kbd>S</kbd></button>
  <button type="button" data-act="screen">Pantalla del evento 16:9 <kbd><span data-screen-state>1680×672</span> · E</kbd></button>
  <button type="button" data-act="present" data-presenter-only>Presentar en vivo (GitHub)</button>
  <button type="button" data-act="questions" data-presenter-ui hidden>Preguntas del público <kbd><span data-q-count>0</span> · Q</kbd></button>
  <button type="button" data-act="wipe" data-presenter-ui hidden>Vaciar sesión en vivo…</button>
  <div class="group">Ir a</div>
  <div class="slides-list"></div>`;

function renderMenuList() {
  const list = menu.querySelector('.slides-list')!;
  if (!list.childElementCount) {
    sections.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `${pad(i + 1)} · ${s.dataset.label ?? 'Slide'}`;
      b.addEventListener('click', () => {
        stage.goTo(i);
        closeMenu();
      });
      list.append(b);
    });
  }
  [...list.children].forEach((b, i) => (i === current ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
}

const openMenu = () => {
  menu.hidden = false;
  menuBtn.setAttribute('aria-expanded', 'true');
  menuBtn.setAttribute('aria-label', 'Cerrar menú');
  menu.querySelector<HTMLElement>('a, button')?.focus();
};
const closeMenu = () => {
  menu.hidden = true;
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.setAttribute('aria-label', 'Abrir menú');
};
menuBtn.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
addEventListener('pointerdown', (e) => {
  if (!menu.hidden && !menu.contains(e.target as Node) && !menuBtn.contains(e.target as Node)) closeMenu();
});
menu.addEventListener('click', (e) => {
  const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
  if (act === 'theme') setTheme(!isDark());
  if (act === 'fs') toggleFullscreen();
  if (act === 'rail') toggleRail();
  if (act === 'screen') eventScreen.toggle();
  if (act === 'present') document.dispatchEvent(new CustomEvent('deck:present'));
  if (act === 'wipe') {
    closeMenu();
    document.dispatchEvent(new CustomEvent('deck:wipe'));
  }
  if (act === 'questions') {
    closeMenu();
    document.dispatchEvent(new CustomEvent('deck:questions'));
  }
});

// ── Cambio de slide: clips (plan B de la demo) y menú ────────────────
function onSlide(index: number, slide: HTMLElement) {
  current = index;
  // Clips: se cargan perezosamente y solo se reproducen en el slide activo.
  document.querySelectorAll<HTMLVideoElement>('.clip video').forEach((v) => {
    if (slide.contains(v)) {
      if (!v.src && v.dataset.src) {
        v.src = v.dataset.src;
        v.addEventListener('loadeddata', () => v.parentElement?.querySelector('.ph')?.remove(), { once: true });
        v.addEventListener('error', () => v.remove(), { once: true });
      }
      v.play().catch(() => undefined);
    } else v.pause();
  });
  renderMenuList();
}
stage.addEventListener('slidechange', (e) => {
  const { index, slide } = (e as CustomEvent).detail as { index: number; slide: HTMLElement };
  onSlide(index, slide);
});
renderMenuList();
// El 'slidechange' inicial ocurre antes de que cargue este módulo: procesamos el slide activo.
setTimeout(() => {
  const first = sections.findIndex((s) => s.hasAttribute('data-deck-active'));
  if (first >= 0) onSlide(first, sections[first]);
});

createIcons({
  icons: { Activity, ArrowUpRight, Bot, Briefcase, Camera, CirclePlay, Cpu, Download, Eye, EyeOff, FileJson, FlaskConical, GitBranch, Globe, Hourglass, LayoutTemplate, Lightbulb, MemoryStick, MousePointerClick, MoveVertical, NotebookPen, Recycle, Route, Search, StickyNote, Trash2, Users, Waves },
  attrs: { 'stroke-width': 1.75, 'aria-hidden': 'true' },
});
dispatchEvent(new Event('tweakchange'));

// ── Atajos (sin chocar con deck-stage: ←/→, espacio, R, números) ─────
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'escape' && !menu.hidden) closeMenu();
  if (k === 'l') setTheme(!isDark());
  if (k === 'f') toggleFullscreen();
  if (k === 's') toggleRail();
  if (k === 'e') eventScreen.toggle();
  if (k === 'm') (menu.hidden ? openMenu : closeMenu)();
  if (k === 'p') open(withSessionParams('/presenter/'), 'wpgu-presenter');
});

// ── En vivo ──────────────────────────────────────────────────────────
// ── Pantalla del evento (1680×672): slide 16:9 al centro + laterales con QR y progreso ──
const eventScreen = initEventScreen(stage, sections);

// ── Modo foco en el código: una idea a la vez (↓/↑ o clic) ──
initCodeFocus(stage, sections);

initLive(stage, sections).catch((err) => console.error('[live]', err));
