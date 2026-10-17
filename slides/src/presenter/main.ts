// Consola de la presentadora: guion, tiempo, siguiente slide y contadores.
// Controla el deck abierto en ESTE navegador por BroadcastChannel (sin red, sin latencia).
// Se abre con la tecla P desde el deck o en /presenter/ (conserva ?local y ?session).
import { SLIDES, SLIDE_BY_ID } from '../shared/content';
import { DEMO_URL, SESSION_ID, withSessionParams } from '../shared/config';
import type { PresenterMsg } from '../deck/live';

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const bc = new BroadcastChannel(`wpgu-presenter-${SESSION_ID}`);
const post = (m: PresenterMsg) => bc.postMessage(m);

const deckUrl = new URL(withSessionParams('/'));
deckUrl.searchParams.set('presenter', '1');
$<HTMLAnchorElement>('[data-open-deck]').href = deckUrl.toString();
$<HTMLAnchorElement>('[data-open-live]').href = withSessionParams('/live/');
$<HTMLAnchorElement>('[data-open-demo]').href = DEMO_URL;

let index = -1;
let total = SLIDES.length;
let lastSeen = 0;

// ── Lista de slides ────────────────────────────────────────────────────
const list = $('[data-slides]');
list.innerHTML = SLIDES.map((s, i) => `<li><button type="button" data-i="${i}"><small>${String(i + 1).padStart(2, '0')}</small><span>${esc(s.label)}</span><small>${s.time}</small></button></li>`).join('');
list.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-i]');
  if (b) post({ type: 'goto', index: Number(b.dataset.i) });
});

function render(m: Extract<PresenterMsg, { type: 'state' }>) {
  lastSeen = Date.now();
  const changed = m.index !== index;
  index = m.index;
  total = m.total;
  const c = SLIDE_BY_ID.get(m.id);
  const next = SLIDES[index + 1];
  $('[data-mode]').textContent = m.mode === 'firebase' ? `Firestore · ${SESSION_ID}` : 'modo ensayo local';
  $('[data-stat="players"]').textContent = `${m.players} en la sala`;
  $('[data-stat="dolls"]').textContent = `${m.dolls} quitapenas`;
  $('[data-stat="questions"]').textContent = `${m.questions} preguntas`;
  const live = $('[data-stat="live"]');
  live.textContent = m.live ? '● transmitiendo' : 'sin transmitir';
  live.className = m.live ? 'on' : 'off';
  if (!changed) return;
  $('[data-pos]').textContent = `${index + 1} / ${total}`;
  $('[data-section]').textContent = c?.section ?? c?.label ?? '';
  $('[data-target]').textContent = c?.time ?? '—';
  $('[data-title]').textContent = c?.title ?? m.id;
  $('[data-summary]').innerHTML = (c?.summary ?? []).map((p) => `<li>${esc(p)}</li>`).join('');
  $('[data-notes]').textContent = c?.notes ?? '';
  const code = $('[data-code]');
  code.hidden = !c?.code;
  code.textContent = c?.code?.text ?? '';
  $('[data-next]').textContent = next ? next.title : 'Fin';
  $('[data-next-sum]').textContent = next?.summary[0] ?? '';
  list.querySelectorAll('[data-i]').forEach((b, i) => b.setAttribute('aria-current', String(i === index)));
  // Desplaza solo la lista (no la página) para que el guion quede siempre a la vista.
  const item = list.querySelector<HTMLElement>(`[data-i="${index}"]`);
  if (item) list.scrollTop = item.offsetTop - list.clientHeight / 2;
  updatePace();
}

bc.onmessage = (e: MessageEvent<PresenterMsg>) => {
  if (e.data.type === 'state') render(e.data);
};
post({ type: 'hello' });
setInterval(() => {
  // Si el deck se cerró o recargó, lo volvemos a llamar.
  if (Date.now() - lastSeen > 4000) post({ type: 'hello' });
}, 2000);

$('[data-prev]').addEventListener('click', () => post({ type: 'prev' }));
$('[data-nextbtn]').addEventListener('click', () => post({ type: 'next' }));
addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') (e.preventDefault(), post({ type: 'next' }));
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') (e.preventDefault(), post({ type: 'prev' }));
});

// ── Cronómetro (30 min) y ritmo vs. el guion ───────────────────────────
const KEY = `wpgu.timer.${SESSION_ID}`;
let startedAt: number | null = null;
try {
  startedAt = Number(localStorage.getItem(KEY)) || null;
} catch {
  /* noop */
}
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const toSec = (t: string) => {
  const [m, s] = t.split(':').map(Number);
  return m * 60 + (s || 0);
};
function updatePace() {
  const pace = $('[data-pace]');
  const c = SLIDES[index];
  if (!startedAt || !c) return void (pace.textContent = '');
  const diff = (Date.now() - startedAt) / 1000 - toSec(c.time);
  pace.className = `pace ${Math.abs(diff) < 60 ? 'ok' : diff > 0 ? 'late' : 'early'}`;
  pace.textContent = Math.abs(diff) < 60 ? 'a tiempo' : diff > 0 ? `+${mmss(diff)} tarde` : `${mmss(-diff)} adelantada`;
}
function tick() {
  $('[data-clock]').textContent = startedAt ? mmss((Date.now() - startedAt) / 1000) : '00:00';
  $('[data-timer]').textContent = startedAt ? 'En curso' : 'Iniciar';
  updatePace();
}
$('[data-timer]').addEventListener('click', () => {
  if (startedAt) return;
  startedAt = Date.now();
  try {
    localStorage.setItem(KEY, String(startedAt));
  } catch {
    /* noop */
  }
  tick();
});
$('[data-reset]').addEventListener('click', () => {
  startedAt = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
  tick();
});
setInterval(tick, 1000);
tick();
