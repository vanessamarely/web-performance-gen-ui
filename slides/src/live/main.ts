// App de asistentes (celular). Sigue al deck en vivo y aplica las ideas de la charla:
//  · Escucha UN solo documento (índice + id del slide): el contenido ya viene en el bundle.
//  · Las pantallas se construyen una vez por slide y se actualizan por partes (sin recrear todo).
//  · Notas con RETENCIÓN: si estás escribiendo, tu pantalla no cambia de slide hasta que guardes.
//  · Quitapenas y memoria se generan EN EL DISPOSITIVO: tus notas nunca salen del teléfono.
import { Brain, Check, Download, FileText, Flame, GitBranch, Heart, MessageCircleQuestion, NotebookPen, Radio, Send, Shuffle, Sparkles, Store, X, createElement, createIcons, type IconNode } from 'lucide';
import { SLIDES, SLIDE_BY_ID, type SlideContent } from '../shared/content';
import { DEMO_URL, EVENT, REPO_URL, TALK_TITLE } from '../shared/config';
import { downloadFile, keepsakeHTML, keepsakeMarkdown, type SavedNote } from '../shared/keepsake';
import { ACCESORIOS, CABELLOS, DEFAULT_DOLL, EXPRESIONES, LEYENDA, PATRONES, PENAS, PIELES, TRAJES, normalizeDoll, quitapenasPNG, quitapenasSVG, randomDoll, type QuitapenasOptions } from '../shared/quitapenas';
import { REACTIONS, getRealtime, type Reaction, type Realtime, type SlideState } from '../shared/realtime';
import { esc } from '../shared/esc';

const ICONS = { Brain, Check, Download, FileText, Flame, GitBranch, Heart, MessageCircleQuestion, NotebookPen, Radio, Send, Shuffle, Sparkles, Store, X };
const REACTION_ICONS: Record<Reaction, IconNode> = { fire: Flame, heart: Heart, mind: Brain, ask: MessageCircleQuestion };
const REACTION_SHORT: Record<Reaction, string> = { fire: 'Fuego', heart: 'Me gusta', mind: '¡Wow!', ask: 'Pregunta' };

const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel)!;
const icon = (node: IconNode, size = 20) => {
  const el = createElement(node);
  el.setAttribute('width', String(size));
  el.setAttribute('height', String(size));
  el.setAttribute('aria-hidden', 'true');
  return el.outerHTML;
};
const store = {
  get<T>(k: string, fallback: T): T {
    try {
      return JSON.parse(localStorage.getItem(`wpgu.live.${k}`) ?? 'null') ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(`wpgu.live.${k}`, JSON.stringify(v));
    } catch {
      /* modo privado o cuota llena: seguimos en memoria */
    }
  },
};

// ── Apodos generados (sin texto libre: nada inapropiado llega al proyector) ──
const NOUNS = ['Quetzal', 'Volcán', 'Jade', 'Cacao', 'Barrilete', 'Colibrí', 'Jaguar', 'Cenzontle', 'Tecolote', 'Tamal', 'Chuchito', 'Pepián', 'Cafetal', 'Maíz', 'Lago', 'Pixel', 'Token', 'Frame', 'Stream', 'Prompt', 'Agente', 'Cometa', 'Parser', 'Render', 'Cursor', 'Hook', 'Byte', 'Kernel', 'Shuco', 'Atol'];
const ADJS = ['Veloz', 'Fluido', 'Chapín', 'Chilero', 'Valiente', 'Curioso', 'Brillante', 'Sereno', 'Épico', 'Ninja', 'Cósmico', 'Ágil', 'Sabio', 'Audaz', 'Feliz', 'Turbo', 'Volcánico', 'Estelar', 'Asíncrono', 'Reactivo', 'Eléctrico', 'Dorado', 'Zen', 'Pro', 'Galáctico', 'Atómico', 'Legendario', 'Imparable', 'Sin Lag', 'Optimizado'];
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const randomName = () => `${pick(NOUNS)} ${pick(ADJS)}`;
const BANNED = /(put[ao]|mierd|cul[oa]|pend[ae]j|verga|coñ|carajo|fuck|shit|sex|nazi|hij[oa]e?p|cerot)/i;
const cleanName = (s: string) => (BANNED.test(s) ? randomName() : s.trim().slice(0, 18)) || randomName();

// ── Estado ──────────────────────────────────────────────────────────────
type View = 'live' | 'doll' | 'notes';
let rt: Realtime;
let live: SlideState | null = null;
let view: View = 'live';
let name: string | null = store.get('name', null);
/** Notas GUARDADAS por slide (lo que va a la memoria). */
const notes: Record<string, SavedNote> = store.get('notes', {});
/** Borradores sin guardar: sobreviven a recargas, pero no cuentan como guardados. */
const drafts: Record<string, string> = store.get('drafts', {});
/** Slides que esta persona vio (para "Mis notas"). */
const seen: string[] = store.get('seen', []);
interface DollState {
  name: string;
  pena: number;
  opts: QuitapenasOptions;
  saved: boolean;
  published: boolean;
}
const doll: DollState = store.get('doll', { name: '', pena: 0, opts: { ...DEFAULT_DOLL }, saved: false, published: false });
doll.opts = normalizeDoll(doll.opts);

/** Slide que se muestra en "En vivo" (puede ir detrás del en vivo si hay una nota sin guardar). */
let shownId: string | null = null;

const savedText = (id: string) => notes[id]?.text ?? '';
const draftText = (id: string) => drafts[id] ?? savedText(id);
const isDirty = (id: string | null) => Boolean(id) && draftText(id!) !== savedText(id!);
/** ¿Estamos reteniendo un slide porque hay una nota a medio escribir? */
const holding = () => view === 'live' && isDirty(shownId) && Boolean(live?.id) && live!.id !== shownId;

function setDraft(id: string, text: string) {
  if (text === savedText(id)) delete drafts[id];
  else drafts[id] = text;
  store.set('drafts', drafts);
}
function saveNote(id: string) {
  const text = draftText(id).trim();
  if (text) notes[id] = { text, savedAt: Date.now() };
  else delete notes[id];
  delete drafts[id];
  store.set('notes', notes);
  store.set('drafts', drafts);
}
function discardDraft(id: string) {
  delete drafts[id];
  store.set('drafts', drafts);
}
function markSeen(id: string) {
  if (id && !seen.includes(id)) {
    seen.push(id);
    store.set('seen', seen);
  }
}

async function boot() {
  createIcons({ icons: ICONS, attrs: { 'stroke-width': 1.75, 'aria-hidden': 'true' } });
  setupMenu();
  setupReactions();
  rt = await getRealtime();
  const forcedLocal = new URLSearchParams(location.search).has('local');
  if (rt.mode === 'local' && !forcedLocal && import.meta.env.VITE_FIREBASE_API_KEY) {
    $('[data-status]').innerHTML = 'Sin conexión en vivo con la pantalla. Reintentando… <button class="link" type="button" onclick="location.reload()">Reintentar</button>';
    setTimeout(() => location.reload(), 20000);
  } else $('[data-status]').textContent = rt.mode === 'local' ? 'Modo ensayo (local) · esperando el deck…' : 'Conectado · esperando el deck…';

  rt.onSlide((s) => {
    live = s;
    if (s.id) markSeen(s.id);
    $('[data-status]').textContent = s.total ? `En vivo · ${s.label} · ${s.index + 1}/${s.total}` : 'Conectado · esperando a que empiece la charla…';
    if (view === 'live') renderLive();
    renderHold();
  });
  renderMe();
  if (name) void rt.join(name).catch(() => undefined);
  render();
}

function renderMe() {
  const el = $('[data-me]');
  el.hidden = !name;
  el.textContent = name ?? '';
}

// ── Pantallas ───────────────────────────────────────────────────────────
function render() {
  const screen = $('#screen');
  renderHold();
  if (view === 'doll') return renderDoll(screen);
  if (view === 'notes') return renderNotes(screen);
  if (!name) return renderJoin(screen);
  renderLive(true);
}

function renderJoin(screen: HTMLElement) {
  screen.dataset.screen = 'join';
  const options = Array.from(new Set(Array.from({ length: 8 }, randomName))).slice(0, 3);
  screen.innerHTML = `<section class="card-sheet">
    <p class="kicker">Bienvenida/o · ${esc(EVENT)}</p>
    <h1>Elige tu apodo</h1>
    <p class="muted">Aparece en el muro de quitapenas. Sin correo, sin contraseña.</p>
    <div class="name-options" role="radiogroup" aria-label="Apodos">${options
      .map((o, i) => `<button type="button" role="radio" aria-checked="${i === 0}" data-name="${esc(o)}">${esc(o)}</button>`)
      .join('')}</div>
    <div class="row"><button class="btn ghost" type="button" data-shuffle>${icon(Shuffle, 18)} Otros apodos</button>
    <button class="btn primary" type="button" data-join>Entrar</button></div>
    <p class="fine">Tus notas se guardan solo en este celular. Al final descargas tu memoria de la charla.</p>
  </section>`;
  screen.querySelectorAll<HTMLButtonElement>('[data-name]').forEach((b) =>
    b.addEventListener('click', () => screen.querySelectorAll('[data-name]').forEach((x) => x.setAttribute('aria-checked', String(x === b)))),
  );
  $('[data-shuffle]', screen).addEventListener('click', () => renderJoin(screen));
  $('[data-join]', screen).addEventListener('click', async () => {
    name = screen.querySelector<HTMLElement>('[aria-checked="true"]')?.dataset.name ?? options[0];
    store.set('name', name);
    if (!doll.name) doll.name = name;
    renderMe();
    render();
    await rt.join(name).catch((err) => console.warn('[live] entrar', err));
  });
}

/** "En vivo": construye la pantalla una vez por slide; el resto son actualizaciones puntuales. */
function renderLive(force = false) {
  if (!name) return renderJoin($('#screen'));
  const screen = $('#screen');
  // Retención: con una nota sin guardar, el slide mostrado NO cambia.
  if (!holding()) shownId = live?.id || shownId;
  const c = shownId ? SLIDE_BY_ID.get(shownId) : undefined;
  const key = `live:${shownId ?? 'wait'}`;
  if (!force && screen.dataset.screen === key) return void updateProgress(screen);
  screen.dataset.screen = key;

  if (!c) {
    screen.innerHTML = `<section class="card-sheet"><p class="kicker">Hola, ${esc(name)}</p><h1>La charla está por empezar</h1>
      <p class="muted">Cuando la presentadora avance, aquí verás cada slide con sus ideas clave y podrás tomar notas.</p>
      <button class="btn wide" type="button" data-go-doll>${icon(Sparkles, 18)} Crear mi quitapenas mientras espero</button></section>`;
    $('[data-go-doll]', screen).addEventListener('click', () => go('doll'));
    return;
  }
  if (c.kind === 'join') return renderLobby(screen);
  if (c.kind === 'wall') return renderWallCta(screen);
  if (c.kind === 'end') return renderEnd(screen);
  renderMirror(screen, c);
}

function updateProgress(screen: HTMLElement) {
  const p = screen.querySelector<HTMLElement>('[data-progress]');
  const label = screen.querySelector<HTMLElement>('[data-on-screen]');
  if (!live?.total || !p || !label) return;
  const idx = SLIDES.findIndex((s) => s.id === shownId);
  p.style.width = `${Math.round(((idx + 1) / live.total) * 100)}%`;
  label.textContent = live.id === shownId ? `En pantalla · ${live.index + 1}/${live.total}` : `Tu nota · slide ${idx + 1}/${live.total}`;
}

function renderMirror(screen: HTMLElement, c: SlideContent) {
  const idx = SLIDES.indexOf(c);
  screen.innerHTML = `<section class="mirror" data-tone="${idx % 4}">
    <div class="mirror-top">
      <span class="live-dot" aria-hidden="true"></span>
      <span data-on-screen>En pantalla</span>
      <span class="mirror-progress" aria-hidden="true"><i data-progress></i></span>
    </div>
    ${c.section ? `<p class="kicker">${esc(c.section)}</p>` : ''}
    <h1>${esc(c.title)}</h1>
    <ul class="mirror-points">${c.summary.map((p, i) => `<li data-tone="${['blue', 'green', 'yellow', 'red'][i % 4]}"><span>${esc(p)}</span></li>`).join('')}</ul>
    ${c.code ? `<figure class="mirror-code"><figcaption>${esc(c.code.file)}</figcaption><pre><code>${esc(c.code.text)}</code></pre></figure>` : ''}
  </section>
  <section class="card-sheet">
    ${noteBoxHTML(c.id, 'Mi nota sobre este slide')}
    ${c.kind === 'demo' ? `<a class="btn wide primary" href="${DEMO_URL}" target="_blank" rel="noreferrer">${icon(Store, 18)} Abrir Mercadito en tu celular</a>` : ''}
    <p class="muted small">Mientras escribes, tu pantalla <b>se queda en este slide</b>. Al guardar vuelves al en vivo.</p>
  </section>`;
  bindNoteBox(screen, c.id, { followLiveOnSave: true });
  updateProgress(screen);
}

function noteBoxHTML(id: string, label: string) {
  const saved = notes[id];
  return `<div class="note-box" data-note="${esc(id)}" ${isDirty(id) ? 'data-dirty' : ''}>
    <label><span>${esc(label)}</span><textarea rows="3" maxlength="1200" data-note-text placeholder="Algo que quiero probar, una duda, un enlace…">${esc(draftText(id))}</textarea></label>
    <div class="note-meta">
      <p class="fine" data-note-state role="status">${saved ? `<span class="saved-chip">${icon(Check, 12)} Guardada</span>` : 'Sin guardar · Ctrl/⌘ + Enter guarda'}</p>
      <button class="btn primary" type="button" data-note-save ${isDirty(id) ? '' : 'disabled'}>Guardar nota</button>
    </div>
  </div>`;
}

function bindNoteBox(root: ParentNode, id: string, { followLiveOnSave }: { followLiveOnSave: boolean }) {
  const box = $<HTMLElement>(`[data-note="${CSS.escape(id)}"]`, root);
  const area = $<HTMLTextAreaElement>('[data-note-text]', box);
  const btn = $<HTMLButtonElement>('[data-note-save]', box);
  const state = $('[data-note-state]', box);
  const sync = () => {
    const dirty = isDirty(id);
    box.toggleAttribute('data-dirty', dirty);
    btn.disabled = !dirty;
    state.innerHTML = dirty ? 'Sin guardar · tu pantalla espera' : notes[id] ? `<span class="saved-chip">${icon(Check, 12)} Guardada</span>` : 'Sin guardar · Ctrl/⌘ + Enter guarda';
    renderHold();
  };
  area.addEventListener('input', () => {
    setDraft(id, area.value);
    sync();
  });
  const doSave = () => {
    saveNote(id);
    sync();
    state.innerHTML = `<span class="saved-chip">${icon(Check, 12)} Guardada</span>`;
    // Al guardar, si el en vivo avanzó, saltamos a donde va la charla.
    if (followLiveOnSave && live?.id && live.id !== id) renderLive();
  };
  btn.addEventListener('click', doSave);
  area.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      doSave();
    }
  });
}

/** Banner fijo: la presentadora avanzó mientras escribías (o ya guardaste y vas detrás). */
function renderHold() {
  const el = $('[data-hold]');
  const behind = view === 'live' && Boolean(live?.id) && Boolean(shownId) && live!.id !== shownId;
  if (!behind) {
    if (!el.hidden) el.hidden = true;
    return;
  }
  const dirty = isDirty(shownId);
  const sig = `${live!.id}:${dirty}`;
  if (el.dataset.for !== sig || el.hidden) {
    el.dataset.for = sig;
    const next = SLIDE_BY_ID.get(live!.id);
    const where = `“${esc(next?.title ?? live!.label)}” (${live!.index + 1}/${live!.total})`;
    el.innerHTML = dirty
      ? `<p><span class="pulse" aria-hidden="true"></span><b>La charla avanzó</b> a ${where}. Tu pantalla te espera hasta que guardes tu nota.</p>
        <div class="row"><button class="btn" type="button" data-hold-discard>Descartar cambios</button><button class="btn primary" type="button" data-hold-save>Guardar y seguir en vivo</button></div>`
      : `<p><span class="pulse" aria-hidden="true"></span>La charla va en ${where}.</p>
        <div class="row"><button class="btn primary" type="button" data-hold-go>Ir al en vivo</button></div>`;
    const jump = () => {
      el.hidden = true;
      shownId = live!.id;
      renderLive(true);
    };
    el.querySelector('[data-hold-save]')?.addEventListener('click', () => (shownId && saveNote(shownId), jump()));
    el.querySelector('[data-hold-discard]')?.addEventListener('click', () => (shownId && discardDraft(shownId), jump()));
    el.querySelector('[data-hold-go]')?.addEventListener('click', jump);
  }
  el.hidden = false;
}

function renderLobby(screen: HTMLElement) {
  screen.innerHTML = `<section class="card-sheet">
    <p class="kicker">Hola, ${esc(name)}</p>
    <h1>¡Estás dentro!</h1>
    <div class="lobby-dolls" aria-hidden="true">${[0, 1, 2, 3].map((i) => quitapenasSVG({ traje: i, patron: i % 4, cabello: (i * 2) % 5, piel: (i + 1) % 5, accesorio: (i + 3) % 6, expresion: i % 4 })).join('')}</div>
    <p class="muted">En cada slide verás las ideas clave y podrás escribir tus notas. Si estás escribiendo, <b>la app no te cambia de slide</b> hasta que guardes.</p>
    <p class="legend">${esc(LEYENDA)} Hoy creamos el nuestro para dejarle las <b>penas de performance</b>.</p>
    <button class="btn wide primary" type="button" data-go-doll>${icon(Sparkles, 18)} Crear mi quitapenas</button>
  </section>`;
  $('[data-go-doll]', screen).addEventListener('click', () => go('doll'));
}

function renderWallCta(screen: HTMLElement) {
  screen.innerHTML = `<section class="card-sheet">
    <p class="kicker">Muro de quitapenas</p>
    <h1>${doll.published ? '¡Tu quitapenas está en la pantalla!' : '¿Ya le contaste tu pena a tu quitapenas?'}</h1>
    ${doll.saved ? `<div class="end-doll">${quitapenasSVG(doll.opts, doll.name)}<div><b>${esc(doll.name)}</b><span>“${esc(PENAS[doll.pena])}”</span></div></div>` : ''}
    <p class="muted">Se dibuja en tu celular; al muro solo viajan las opciones que elegiste.</p>
    <button class="btn wide primary" type="button" data-go-doll>${icon(Sparkles, 18)} ${doll.saved ? 'Editar mi quitapenas' : 'Crear mi quitapenas'}</button>
  </section>`;
  $('[data-go-doll]', screen).addEventListener('click', () => go('doll'));
}

function keepsakeInput() {
  return { nickname: name, notes, doll: doll.saved ? { name: doll.name, pena: doll.pena, opts: doll.opts } : null };
}
const slug = () => `memoria-web-performance-genui-devfest-gt${name ? '-' + name.normalize('NFD').replace(/[^\w]+/g, '-').toLowerCase() : ''}`;

function keepsakeButtons() {
  return `<button class="btn wide primary" type="button" data-dl-pdf>${icon(Download, 18)} Descargar memoria (PDF)</button>
    <div class="row">
      <button class="btn" type="button" data-dl-html>${icon(FileText, 18)} HTML</button>
      <button class="btn" type="button" data-dl-md>${icon(FileText, 18)} Markdown</button>
    </div>
    <p class="fine" data-pdf-msg role="status"></p>
    ${doll.saved ? `<button class="btn wide" type="button" data-dl-doll>${icon(Download, 18)} Descargar mi quitapenas (PNG)</button>` : ''}
    <button class="btn wide ghost" type="button" data-share>${icon(Send, 18)} Compartir</button>`;
}
/** PDF con pdf-lib: se carga al pulsar (import dinámico) y se genera en el celular. */
async function makePDF(): Promise<Blob> {
  const { keepsakePDF } = await import('../shared/keepsake-pdf');
  return keepsakePDF(keepsakeInput());
}
function bindKeepsake(root: ParentNode) {
  root.querySelector('[data-dl-pdf]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const msg = root.querySelector<HTMLElement>('[data-pdf-msg]');
    btn.disabled = true;
    if (msg) msg.textContent = 'Generando tu PDF en el celular…';
    try {
      downloadFile(`${slug()}.pdf`, await makePDF());
      if (msg) msg.textContent = 'Listo: revisa tus descargas.';
    } catch (err) {
      console.error('[memoria] PDF', err);
      if (msg) msg.textContent = 'No se pudo generar el PDF. Prueba con HTML.';
    } finally {
      btn.disabled = false;
    }
  });
  root.querySelector('[data-dl-html]')?.addEventListener('click', () => downloadFile(`${slug()}.html`, keepsakeHTML(keepsakeInput()), 'text/html;charset=utf-8'));
  root.querySelector('[data-dl-md]')?.addEventListener('click', () => downloadFile(`${slug()}.md`, keepsakeMarkdown(keepsakeInput()), 'text/markdown;charset=utf-8'));
  root.querySelector('[data-dl-doll]')?.addEventListener('click', async () => downloadFile(`quitapenas-${slug()}.png`, await quitapenasPNG(doll)));
  root.querySelector('[data-share]')?.addEventListener('click', async () => {
    try {
      const file = new File([await makePDF()], `${slug()}.pdf`, { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: `Memoria · ${TALK_TITLE}`, files: [file] });
      else if (navigator.share) await navigator.share({ title: `Memoria · ${TALK_TITLE}`, text: keepsakeMarkdown(keepsakeInput()) });
      else {
        await navigator.clipboard.writeText(keepsakeMarkdown(keepsakeInput()));
        alert('Memoria copiada al portapapeles (Markdown).');
      }
    } catch {
      /* la persona canceló */
    }
  });
}

function renderEnd(screen: HTMLElement) {
  const n = Object.keys(notes).length;
  screen.innerHTML = `<section class="card-sheet keepsake">
    <div class="weave-strip" aria-hidden="true"></div>
    <p class="kicker">¡Maltiox! · Gracias</p>
    <h1>Tu memoria de la charla</h1>
    <p class="muted">Un resumen con lo más importante de cada slide, tus notas${doll.saved ? ' y tu quitapenas' : ''}. Se genera en tu celular; ábrelo sin internet o imprímelo a PDF.</p>
    <div class="stats"><span>${SLIDES.filter((s) => s.inSummary).length} ideas clave</span><span>${n} ${n === 1 ? 'nota' : 'notas'}</span><span>${doll.saved ? '1 quitapenas' : 'sin quitapenas'}</span></div>
    ${doll.saved ? `<div class="end-doll">${quitapenasSVG(doll.opts, doll.name)}<div><b>${esc(doll.name)}</b><span>“${esc(PENAS[doll.pena])}”</span></div></div>` : `<button class="btn wide" type="button" data-go-doll>${icon(Sparkles, 18)} Crear mi quitapenas para la memoria</button>`}
    ${keepsakeButtons()}
    <a class="btn wide ghost" href="${REPO_URL}" target="_blank" rel="noreferrer">${icon(GitBranch, 18)} Ver el repositorio</a>
  </section>`;
  screen.querySelector('[data-go-doll]')?.addEventListener('click', () => go('doll'));
  bindKeepsake(screen);
}

// ── Mis notas (todas) + memoria ─────────────────────────────────────────
function renderNotes(screen: HTMLElement) {
  screen.dataset.screen = 'notes';
  const list = SLIDES.filter((s) => seen.includes(s.id) || notes[s.id] || drafts[s.id]).filter((s) => s.kind === 'content' || s.kind === 'demo');
  let section = '';
  screen.innerHTML = `<section class="card-sheet">
    <div class="creator-head"><p class="kicker">Mis notas</p><button class="icon-btn" type="button" data-close aria-label="Volver al en vivo">${icon(X, 20)}</button></div>
    <h1>Lo que me llevo</h1>
    <p class="muted small">Edita cualquier nota y guárdala. La memoria incluye el resumen de <b>todos</b> los slides, aunque hayas llegado tarde.</p>
    ${keepsakeButtons()}
    ${
      list.length
        ? `<ol class="notes-list">${list
            .map((s) => {
              const head = s.section && s.section !== section ? `<p class="section-label">${esc((section = s.section))}</p>` : '';
              return `${head}<li><h3>${esc(s.title)}</h3><ul class="pts">${s.summary.slice(0, 2).map((p) => `<li>${esc(p)}</li>`).join('')}</ul>${noteBoxHTML(s.id, 'Mi nota')}</li>`;
            })
            .join('')}</ol>`
        : '<p class="muted">Se irán llenando mientras avanza la charla.</p>'
    }
    <button class="btn wide ghost" type="button" data-back>Volver al en vivo</button>
  </section>`;
  list.forEach((s) => bindNoteBox(screen, s.id, { followLiveOnSave: false }));
  bindKeepsake(screen);
  $('[data-back]', screen).addEventListener('click', () => go('live'));
  $('[data-close]', screen).addEventListener('click', () => go('live'));
}

// ── Crea tu quitapenas (todo en el dispositivo) ────────────────────────
function renderDoll(screen: HTMLElement) {
  screen.dataset.screen = 'doll';
  doll.name ||= name ?? '';
  screen.innerHTML = `<section class="card-sheet creator">
    <div class="creator-head"><p class="kicker">Crea tu quitapenas</p><button class="icon-btn" type="button" data-close aria-label="Cerrar">${icon(X, 20)}</button></div>
    <div class="doll-preview" data-preview></div>
    <p class="legend">${esc(LEYENDA)}</p>
    <label class="field"><span>Nombre de tu quitapenas</span><input data-f="name" maxlength="18" value="${esc(doll.name)}" autocomplete="off" /></label>
    <fieldset class="field"><legend>Tu pena de performance</legend><div class="chips penas" role="radiogroup">${PENAS.map(
      (p, i) => `<button type="button" role="radio" aria-checked="${doll.pena === i}" data-pena="${i}">${esc(p)}</button>`,
    ).join('')}</div></fieldset>
    <fieldset class="field"><legend>Traje</legend><div class="palettes" role="radiogroup">${TRAJES.map(
      (t, i) => `<button type="button" role="radio" aria-checked="${doll.opts.traje === i}" data-opt="traje" data-v="${i}"><i>${t.c.map((c) => `<b style="background:${c}"></b>`).join('')}</i>${esc(t.label)}</button>`,
    ).join('')}</div></fieldset>
    <div data-opts></div>
    <button class="btn ghost" type="button" data-random>${icon(Shuffle, 16)} Sorpréndeme</button>
    <p class="fine">Se dibuja <b>en tu celular</b> (SVG). Si lo publicas, al muro solo viajan tus elecciones.</p>
    <div class="row">
      <button class="btn" type="button" data-download>${icon(Download, 18)} Descargar PNG</button>
      <button class="btn primary" type="button" data-save>${icon(Check, 18)} ${doll.saved ? 'Guardado' : 'Guardar en mi memoria'}</button>
    </div>
    <button class="btn wide" type="button" data-publish>${icon(Send, 18)} ${doll.published ? 'Actualizar en el muro' : 'Publicar en el muro'}</button>
    <p class="fine" data-msg role="status"></p>
  </section>`;

  const persist = () => store.set('doll', doll);
  const preview = () => {
    $('[data-preview]', screen).innerHTML = `${quitapenasSVG(doll.opts, `Quitapenas ${doll.name}`)}<span class="pena-bubble">“${esc(PENAS[doll.pena])}”</span>`;
  };
  const chips = (key: keyof QuitapenasOptions, label: string, labels: readonly string[]) =>
    `<p class="mini">${label}</p><div class="chips" role="radiogroup" aria-label="${label}">${labels
      .map((l, i) => `<button type="button" role="radio" aria-checked="${doll.opts[key] === i}" data-opt="${key}" data-v="${i}">${esc(l)}</button>`)
      .join('')}</div>`;
  const opts = () => {
    $('[data-opts]', screen).innerHTML = `${chips('patron', 'Patrón del huipil', PATRONES)}${chips('cabello', 'Cabello y tocado', CABELLOS)}
      <p class="mini">Piel</p><div class="swatches" role="radiogroup" aria-label="Piel">${PIELES.map(
        (c, i) => `<button type="button" class="swatch" role="radio" aria-label="Tono de piel ${i + 1}" aria-checked="${doll.opts.piel === i}" data-opt="piel" data-v="${i}" style="--swatch:${c}"></button>`,
      ).join('')}</div>
      ${chips('accesorio', 'Accesorio', ACCESORIOS)}${chips('expresion', 'Expresión', EXPRESIONES)}`;
  };
  // Si ya estaba guardado, la memoria usa siempre la versión actual.
  const changed = () => {
    persist();
    preview();
  };
  // Delegación en la hoja (se recrea en cada render) para no acumular listeners en #screen.
  $('.creator', screen).addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-opt],[data-pena]');
    if (!b) return;
    if (b.dataset.pena) doll.pena = Number(b.dataset.pena);
    else doll.opts = { ...doll.opts, [b.dataset.opt as keyof QuitapenasOptions]: Number(b.dataset.v) };
    b.parentElement!.querySelectorAll('[role="radio"]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    changed();
  });
  $('[data-f="name"]', screen).addEventListener('input', (e) => {
    doll.name = (e.target as HTMLInputElement).value;
    changed();
  });
  $('[data-random]', screen).addEventListener('click', () => {
    doll.opts = randomDoll();
    doll.pena = Math.floor(Math.random() * PENAS.length);
    persist();
    renderDoll(screen);
  });
  $('[data-close]', screen).addEventListener('click', () => go('live'));
  $('[data-download]', screen).addEventListener('click', async () => {
    doll.name = cleanName(doll.name || name || '');
    downloadFile(`quitapenas-${slug()}.png`, await quitapenasPNG(doll));
  });
  $('[data-save]', screen).addEventListener('click', (e) => {
    doll.name = cleanName(doll.name || name || '');
    doll.saved = true;
    persist();
    (e.currentTarget as HTMLElement).innerHTML = `${icon(Check, 18)} Guardado`;
    $('[data-msg]', screen).textContent = 'Listo: tu quitapenas estará en tu memoria de la charla.';
  });
  $('[data-publish]', screen).addEventListener('click', async () => {
    const msg = $('[data-msg]', screen);
    doll.name = cleanName(doll.name || name || '');
    msg.textContent = 'Publicando…';
    try {
      await rt.publishDoll({ name: doll.name, pena: doll.pena, opts: doll.opts });
      doll.published = true;
      doll.saved = true;
      persist();
      msg.textContent = '¡Listo! Tu quitapenas está en el muro y en tu memoria.';
    } catch (err) {
      console.error(err);
      msg.textContent = 'No se pudo publicar. Revisa tu conexión e inténtalo de nuevo.';
    }
  });
  opts();
  preview();
}

// ── Menú y reacciones ───────────────────────────────────────────────────
function go(v: View) {
  view = v;
  closeMenu();
  render();
  scrollTo({ top: 0 });
}

const menuBtn = () => $<HTMLButtonElement>('.menu-btn');
const menuPanel = () => $('.menu-panel');
function closeMenu() {
  menuPanel().hidden = true;
  menuBtn().setAttribute('aria-expanded', 'false');
  menuBtn().setAttribute('aria-label', 'Abrir menú');
}
function setupMenu() {
  menuBtn().addEventListener('click', () => {
    const open = menuPanel().hidden;
    menuPanel().hidden = !open;
    menuBtn().setAttribute('aria-expanded', String(open));
    menuBtn().setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    if (open) menuPanel().querySelector<HTMLElement>('button, a')?.focus();
  });
  document.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go as View)));
  addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());
  addEventListener('pointerdown', (e) => {
    if (!menuPanel().hidden && !menuPanel().contains(e.target as Node) && !menuBtn().contains(e.target as Node)) closeMenu();
  });
}

function setupReactions() {
  const bar = $('[data-reactions]');
  bar.innerHTML = (Object.keys(REACTIONS) as Reaction[])
    .map((r) => `<button type="button" data-r="${r}" title="${REACTIONS[r].label}" style="--c:${REACTIONS[r].color}">${icon(REACTION_ICONS[r], 24)}<span>${REACTION_SHORT[r]}</span></button>`)
    .join('');
  let last = 0;
  bar.addEventListener('click', async (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-r]');
    if (!b || !rt) return;
    const r = b.dataset.r as Reaction;
    if (r === 'ask') return openAsk();
    if (Date.now() - last < 900) return; // las reglas también lo limitan
    last = Date.now();
    b.classList.remove('pop');
    void b.offsetWidth;
    b.classList.add('pop');
    navigator.vibrate?.(15);
    await rt.react(r).catch(() => undefined);
  });
}

// Preguntas para la presentadora: texto libre, por eso NO se proyecta (solo ella las lee).
let lastAsk = 0;
function openAsk() {
  const dlg = document.createElement('dialog');
  dlg.className = 'ask-sheet';
  dlg.innerHTML = `<form>
    <h2>${icon(MessageCircleQuestion, 22)} ¿Tienes una pregunta?</h2>
    <p class="fine">Le llega a Vanessa con tu apodo${name ? ` <b>${esc(name)}</b>` : ''}. No se proyecta: la responde al final.</p>
    <textarea name="q" rows="4" maxlength="280" required placeholder="Ej.: ¿Cómo mido el INP de una soft navigation?"></textarea>
    <p class="fine" data-ask-msg role="status"></p>
    <div class="row"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn primary" type="submit">${icon(Send, 18)} Enviar</button></div>
  </form>`;
  document.body.append(dlg);
  const close = () => {
    dlg.close();
    dlg.remove();
  };
  dlg.addEventListener('cancel', () => dlg.remove());
  $('[data-cancel]', dlg).addEventListener('click', close);
  dlg.querySelector('form')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = dlg.querySelector('textarea')!.value.trim();
    const msg = $('[data-ask-msg]', dlg);
    if (!text) return;
    if (Date.now() - lastAsk < 15000) return void (msg.textContent = 'Espera unos segundos antes de enviar otra.');
    const send = dlg.querySelector<HTMLButtonElement>('[type="submit"]')!;
    send.disabled = true;
    msg.textContent = 'Enviando…';
    try {
      await rt.ask({ name: name ?? 'Anónimo', text: text.slice(0, 280), slide: (live?.label ?? '').slice(0, 80) });
      void rt.react('ask').catch(() => undefined);
      lastAsk = Date.now();
      msg.textContent = '¡Enviada! Gracias.';
      setTimeout(close, 1100);
    } catch (err) {
      console.error('[live] pregunta', err);
      send.disabled = false;
      msg.textContent = 'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.';
    }
  });
  dlg.showModal();
  dlg.querySelector('textarea')!.focus();
}

void boot();
