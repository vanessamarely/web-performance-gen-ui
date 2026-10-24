// Mercadito: asistente de compras con UI generativa + laboratorio de performance.
// Rutas (soft navigations): /  ·  /?q=prompt  ·  /p/:id
import './styles.css';
import { engineName } from './genui/engine';
import { GenUIController } from './genui/controller';
import { saved } from './genui/render';
import { flags, onFlags } from './lab/flags';
import { mountHud } from './lab/hud';
import { metrics, resetMetrics, startObservers } from './lab/metrics';
import { mountLab } from './lab/panel';
import { registerTools } from './webmcp';
import { startVisual } from './lab/visual';

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const params = new URLSearchParams(location.search);
const embed = params.has('embed');
document.body.classList.toggle('embed', embed);

const root = $('#genui');
const ui = new GenUIController(root);
startObservers(root);
startVisual(); // saltos en rojo y avisos de congelamiento
mountHud($('#hud'));
const setLab = mountLab($('#lab'), $<HTMLButtonElement>('[data-lab-toggle]'), () => void 0);
if (params.has('lab')) setLab(true);
$('[data-engine]').textContent = engineName();

const SUGGESTIONS = ['Regalo de café bajo Q200', 'Textiles tejidos a mano', 'Chocolate para compartir', 'Recuerdos para la oficina'];
$('[data-suggest]').innerHTML = SUGGESTIONS.map((s) => `<button type="button" data-q="${s}">${s}</button>`).join('');

const form = $<HTMLFormElement>('[data-prompt]');
const input = $<HTMLInputElement>('[data-prompt] input');

// ── Router: cada cambio es una soft navigation (interacción + URL + pintura) ──
function route() {
  const m = location.pathname.match(/^\/p\/([\w-]+)/);
  if (m) return void ui.run({ kind: 'detail', id: m[1] });
  const q = new URLSearchParams(location.search).get('q');
  if (q) {
    input.value = q;
    return void ui.run({ kind: 'home', prompt: q });
  }
  root.innerHTML = `<section class="empty"><h1>¿Qué buscas hoy en el mercado?</h1><p>Escribe una petición o elige una sugerencia. La página se <b>genera en streaming</b>; abre el <b>laboratorio</b> (tecla D) para romperla y arreglarla.</p></section>`;
}
function navigate(url: string) {
  // Conservamos ?preset, ?embed, ?tps… para que el laboratorio no cambie al navegar.
  const next = new URL(url, location.origin);
  for (const k of ['preset', 'embed', 'tps', 'work', 'engine', 'lab', 'cpu', 'visual']) if (params.has(k)) next.searchParams.set(k, params.get(k)!);
  history.pushState({}, '', next);
  scrollTo({ top: 0 }); // una SPA también debe restaurar el scroll al navegar
  resetMetricsForView();
  route();
}
// Cada vista generada se mide desde cero (?keep acumula entre navegaciones).
const resetMetricsForView = () => {
  if (!params.has('keep')) resetMetrics();
};
addEventListener('popstate', route);

async function generate(prompt: string) {
  input.value = prompt;
  navigate(`/?q=${encodeURIComponent(prompt)}`);
}
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (q) void generate(q);
});
$('[data-suggest]').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-q]');
  if (b) void generate(b.dataset.q!);
});

// ── Interacciones dentro de la UI generada (delegación: sobrevive a innerHTML) ──
root.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const save = t.closest<HTMLButtonElement>('[data-save]');
  if (save) {
    const id = save.dataset.save!;
    saved.has(id) ? saved.delete(id) : saved.add(id);
    save.setAttribute('aria-pressed', String(saved.has(id)));
    save.textContent = saved.has(id) ? '♥ Guardado' : '♡ Guardar';
    return;
  }
  const open = t.closest<HTMLAnchorElement>('[data-open]');
  if (open) {
    e.preventDefault();
    return navigate(`/p/${open.dataset.open}`);
  }
  if (t.closest('[data-home]')) {
    e.preventDefault();
    return history.length > 1 ? history.back() : navigate('/');
  }
  const sort = t.closest<HTMLButtonElement>('[data-sort]');
  if (sort) void ui.rank(sort);
});

onFlags(() => {
  document.body.dataset.preset = Object.values(flags).every(Boolean) ? 'fixed' : 'custom';
});

// ── Comparación (compare.html): el padre ordena generar y lee las métricas ──
addEventListener('message', (e) => {
  if (e.origin !== location.origin) return;
  if (e.data?.type === 'generate') {
    resetMetrics();
    void generate(e.data.prompt);
  }
  if (e.data?.type === 'reset') resetMetrics();
});
if (embed && parent !== window) setInterval(() => parent.postMessage({ type: 'metrics', metrics, flags }, location.origin), 500);

const webmcp = registerTools({
  generate: (p) => generate(p).then(() => waitIdle()),
  open: (id) => (navigate(`/p/${id}`), waitIdle()),
  rank: async () => {
    const b = root.querySelector<HTMLButtonElement>('[data-sort]');
    if (b) await ui.rank(b);
  },
});
$('[data-webmcp]').textContent = webmcp ? 'WebMCP activo' : 'WebMCP: window.mercadito';
function waitIdle() {
  return new Promise<void>((resolve) => {
    const t = setInterval(() => root.getAttribute('aria-busy') === 'false' && (clearInterval(t), resolve()), 100);
  });
}

route();
