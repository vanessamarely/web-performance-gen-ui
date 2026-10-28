// Lado "deck" de la experiencia en vivo.
//  · La presentadora publica { index, id } del slide actual → los celulares cambian de pantalla
//    (salvo quien está escribiendo una nota: su celular espera a que guarde).
//  · El deck es el ÚNICO que escucha las colecciones (asistentes, quitapenas, reacciones)
//    y las listas se actualizan por CLAVE: se agregan nodos, no se recrea el muro.
//  · La consola de la presentadora (/presenter/) controla este deck por BroadcastChannel.
import QRCode from 'qrcode';
import { createElement, Flame, Heart, Brain, MessageCircleQuestion, type IconNode } from 'lucide';
import { SLIDE_BY_ID } from '../shared/content';
import { REPO_URL, SESSION_ID, prettyUrl, publicLiveUrl } from '../shared/config';
import { PENAS, quitapenasSVG } from '../shared/quitapenas';
import { getRealtime, REACTIONS, type AudienceQuestion, type DollData, type Reaction } from '../shared/realtime';
import { esc } from '../shared/esc';

type DeckStage = HTMLElement & { goTo(i: number): void; next(): void; prev(): void };

const REACTION_ICONS: Record<Reaction, IconNode> = { fire: Flame, heart: Heart, mind: Brain, ask: MessageCircleQuestion };

function icon(node: IconNode, size = 28, color?: string): SVGElement {
  const el = createElement(node);
  el.setAttribute('width', String(size));
  el.setAttribute('height', String(size));
  el.setAttribute('aria-hidden', 'true');
  if (color) el.setAttribute('color', color);
  return el;
}

/** Mensajes entre el deck y la consola de la presentadora (misma máquina, sin red). */
export type PresenterMsg =
  | { type: 'state'; index: number; total: number; id: string; players: number; dolls: number; questions: number; live: boolean; mode: string }
  | { type: 'goto'; index: number }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'hello' };

export async function initLive(stage: DeckStage, sections: HTMLElement[]) {
  // QR (no dependen de la conexión)
  const liveUrl = publicLiveUrl();
  const qr = (text: string) => QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1e1e1e', light: '#ffffff' } });
  const [qrLive, qrRepo] = await Promise.all([qr(liveUrl), qr(REPO_URL)]);
  document.querySelectorAll('[data-qr="live"]').forEach((el) => (el.innerHTML = qrLive));
  document.querySelectorAll('[data-qr="repo"]').forEach((el) => (el.innerHTML = qrRepo));
  document.querySelectorAll('[data-live-url]').forEach((el) => (el.textContent = prettyUrl(liveUrl)));
  dispatchEvent(new Event('tweakchange'));

  const rt = await getRealtime();
  const presenterLink = new URLSearchParams(location.search).has('presenter');
  let presenter = rt.isPresenterSession();
  let players = 0;
  let dollCount = 0;
  let questions: AudienceQuestion[] = [];
  let unsubQuestions: (() => void) | null = null;
  let qaError = '';

  const bc = new BroadcastChannel(`wpgu-presenter-${SESSION_ID}`);
  const badge = document.querySelector<HTMLElement>('.presenter-badge')!;
  // Aviso visible si abriste el enlace de presentadora pero el deck NO está transmitiendo.
  const warn = document.createElement('button');
  warn.type = 'button';
  warn.className = 'broadcast-warn';
  warn.hidden = true;
  warn.textContent = 'Los celulares NO siguen el deck · toca para iniciar sesión con GitHub';
  warn.addEventListener('click', () => document.dispatchEvent(new CustomEvent('deck:present')));
  document.body.append(warn);

  const syncPresenterUi = () => {
    badge.hidden = !presenter;
    warn.hidden = presenter || !presenterLink || rt.mode !== 'firebase';
    // El acceso de presentadora solo aparece con ?presenter (o ya autenticada).
    document.querySelectorAll<HTMLElement>('[data-presenter-only]').forEach((el) => (el.hidden = presenter || !presenterLink || rt.mode === 'local'));
    document.querySelectorAll<HTMLElement>('[data-presenter-ui]').forEach((el) => (el.hidden = !presenter));
    document.querySelectorAll('[data-q-count]').forEach((el) => (el.textContent = String(questions.length)));
  };

  // ── Publicar el slide actual (solo la presentadora) ───────────────────
  const send = (p: Promise<unknown>) =>
    p.catch((err) => {
      console.warn('[live] no se pudo publicar:', err);
      if (rt.mode === 'firebase') {
        presenter = false;
        syncPresenterUi();
      }
    });
  let lastIndex = -1;
  function publish(index: number) {
    lastIndex = index;
    const s = sections[index];
    const c = SLIDE_BY_ID.get(s.dataset.id ?? '');
    tellConsole();
    if (!presenter) return;
    void send(rt.patchSlide({ index, total: sections.length, id: s.dataset.id ?? '', label: s.dataset.label ?? '', kind: c?.kind ?? 'content' }));
  }
  stage.addEventListener('slidechange', (e) => publish((e as CustomEvent).detail.index));
  {
    const first = sections.findIndex((s) => s.hasAttribute('data-deck-active'));
    publish(first >= 0 ? first : 0);
  }

  // ── Consola de la presentadora (BroadcastChannel) ─────────────────────
  function tellConsole() {
    const id = sections[lastIndex]?.dataset.id ?? '';
    const msg: PresenterMsg = { type: 'state', index: lastIndex, total: sections.length, id, players, dolls: dollCount, questions: questions.length, live: presenter, mode: rt.mode };
    bc.postMessage(msg);
  }
  bc.onmessage = (e: MessageEvent<PresenterMsg>) => {
    const m = e.data;
    if (m.type === 'goto') stage.goTo(m.index);
    if (m.type === 'next') stage.next();
    if (m.type === 'prev') stage.prev();
    if (m.type === 'hello') tellConsole();
  };

  document.addEventListener('deck:present', async () => {
    try {
      const ok = await rt.signInPresenter();
      presenter = rt.isPresenterSession() || ok;
      if (!presenter) alert('Esta cuenta de GitHub no es la de la presentadora.');
    } catch (err) {
      console.error(err);
      alert('No se pudo iniciar sesión con GitHub.');
    }
    syncPresenterUi();
    if (presenter) {
      publish(lastIndex);
      listenQuestions();
    }
  });
  document.addEventListener('deck:wipe', async () => {
    if (prompt(`Esto borra asistentes, quitapenas, reacciones y preguntas de la sesión "${SESSION_ID}".\nEscribe VACIAR para confirmar:`) !== 'VACIAR') return;
    const n = await rt.resetSession();
    publish(lastIndex);
    alert(`Sesión vaciada (${n} documentos).`);
  });

  // ── Contadores ────────────────────────────────────────────────────────
  const setCount = (k: string, v: number) => document.querySelectorAll(`[data-count="${k}"]`).forEach((el) => (el.textContent = v.toLocaleString('es-GT')));
  rt.onPlayers((ps) => {
    players = ps.length;
    setCount('players', players);
    tellConsole();
  });

  // ── Muro de quitapenas (actualización por clave) ─────────────────────
  const wall = document.querySelector<HTMLElement>('[data-doll-wall]');
  const top = document.querySelector<HTMLElement>('[data-pena-top]');
  const tiles = new Map<string, { el: HTMLElement; sig: string }>();
  rt.onDolls((dolls: DollData[]) => {
    const visible = presenter ? dolls : dolls.filter((d) => !d.hidden);
    dollCount = dolls.filter((d) => !d.hidden).length;
    setCount('dolls', dollCount);
    tellConsole();
    if (!wall) return;
    if (!visible.length && !wall.querySelector('.wall-empty')) {
      wall.innerHTML = '<div class="wall-empty" style="grid-column: 1 / -1">Aún no hay quitapenas. Crea el tuyo en <b>Menú → Mi quitapenas</b>.</div>';
      tiles.clear();
    }
    if (visible.length) wall.querySelector('.wall-empty')?.remove();
    const keep = new Set(visible.map((d) => d.id));
    for (const [id, t] of tiles) {
      if (keep.has(id)) continue;
      t.el.remove();
      tiles.delete(id);
    }
    // Todos: el muro hace scroll (antes se cortaba en 48 y el resto no se veía).
    visible.forEach((d, i) => {
      const sig = JSON.stringify([d.name, d.pena, d.opts, d.hidden]);
      let t = tiles.get(d.id);
      if (!t) {
        const el = document.createElement('figure');
        el.className = 'doll-tile';
        el.style.margin = '0';
        el.title = 'Clic para ocultar o mostrar (moderación)';
        el.addEventListener('click', () => {
          if (!presenter) return;
          const cur = el.hasAttribute('data-hidden');
          void rt.setDollHidden(d.id, !cur);
        });
        tiles.set(d.id, (t = { el, sig: '' }));
      }
      if (t.sig !== sig) {
        t.sig = sig;
        t.el.innerHTML = `${quitapenasSVG(d.opts, `Quitapenas de ${d.name}`)}<b>${esc(d.name)}</b><small>${esc(PENAS[d.pena] ?? '')}</small>`;
        t.el.toggleAttribute('data-hidden', d.hidden);
      }
      // Orden estable: solo movemos si cambió de posición.
      if (wall.children[i] !== t.el) wall.insertBefore(t.el, wall.children[i] ?? null);
    });
    // Penas más comunes (agregado en el deck: los celulares no leen el muro).
    if (top) {
      const counts = new Map<number, number>();
      visible.filter((d) => !d.hidden).forEach((d) => counts.set(d.pena, (counts.get(d.pena) ?? 0) + 1));
      top.innerHTML = [...counts]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([p, n]) => `<span>${esc(PENAS[p] ?? '')}<b>×${n}</b></span>`)
        .join('');
    }
    dispatchEvent(new Event('tweakchange'));
  });

  // ── Reacciones flotantes ──────────────────────────────────────────────
  const layer = document.querySelector<HTMLElement>('.reactions')!;
  let floating = 0;
  rt.onReaction((r) => {
    if (floating > 24 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const meta = REACTIONS[r];
    if (!meta) return;
    const span = document.createElement('span');
    span.append(icon(REACTION_ICONS[r], 40, meta.color));
    span.style.setProperty('--dx', `${Math.round(Math.random() * 60 - 30)}px`);
    span.style.left = `${Math.round(Math.random() * 60)}px`;
    floating++;
    span.addEventListener('animationend', () => (span.remove(), floating--), { once: true });
    layer.append(span);
  });

  // ── Preguntas del público (panel de la presentadora, tecla Q) ─────────
  const panel = document.createElement('aside');
  panel.className = 'qa-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Preguntas del público');
  panel.innerHTML = `<header><h2>Preguntas del público <small data-q-total></small></h2><button class="qa-download" type="button" data-q-md>Descargar .md</button><button class="qa-close" type="button" aria-label="Cerrar">✕</button></header>
    <ol class="qa-list"></ol><p class="qa-empty">Aún no hay preguntas.</p>`;
  document.body.append(panel);
  panel.querySelector('.qa-close')!.addEventListener('click', () => (panel.hidden = true));
  panel.querySelector('[data-q-md]')!.addEventListener('click', () => {
    const md = `# Preguntas del público · ${SESSION_ID}\n\n${questions.map((q) => `- **${q.name}** (${q.slide}): ${q.text}`).join('\n')}\n`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    a.download = `preguntas-${SESSION_ID}.md`;
    a.click();
  });
  function renderQuestions() {
    const list = panel.querySelector('.qa-list')!;
    list.innerHTML = questions
      .map((q) => `<li><p>${esc(q.text)}</p><small>${esc(q.name)} · ${esc(q.slide)}</small><button type="button" data-del="${esc(q.id)}">Respondida · quitar</button></li>`)
      .join('');
    list.querySelectorAll<HTMLButtonElement>('[data-del]').forEach((b) => b.addEventListener('click', () => void rt.removeQuestion(b.dataset.del!)));
    const empty = panel.querySelector<HTMLElement>('.qa-empty')!;
    empty.hidden = questions.length > 0 && !qaError;
    empty.textContent = qaError || 'Aún no hay preguntas.';
    empty.classList.toggle('error', Boolean(qaError));
    panel.querySelector('[data-q-total]')!.textContent = String(questions.length);
  }
  function listenQuestions() {
    if (!presenter || unsubQuestions) return;
    unsubQuestions = rt.onQuestions(
      (qs) => {
        questions = qs;
        qaError = '';
        renderQuestions();
        syncPresenterUi();
        tellConsole();
      },
      (msg) => {
        qaError = msg;
        renderQuestions();
      },
    );
  }
  document.addEventListener('deck:questions', () => {
    panel.hidden = !panel.hidden;
    renderQuestions();
  });
  addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key.toLowerCase() === 'q' && presenter && !e.metaKey && !e.ctrlKey) document.dispatchEvent(new CustomEvent('deck:questions'));
    if (e.key === 'Escape') panel.hidden = true;
  });

  syncPresenterUi();
  listenQuestions();
  if (presenter) publish(lastIndex);
}
