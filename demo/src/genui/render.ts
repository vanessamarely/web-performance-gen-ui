// Dos renderers para el MISMO estado:
//
// ROTO · NaiveRenderer: root.innerHTML = plantilla(estado) en cada actualización.
//        Recrea miles de nodos, pierde el foco/hover y vuelve a pedir las imágenes.
// ARREGLADO · KeyedRenderer: un nodo por id (o por slot reservado) que se crea UNA vez
//        y luego solo se actualiza el texto que cambió. Reordenar mueve nodos (View Transitions).
import { BY_ID, fmtQ } from '../catalog';
import { flags } from '../lab/flags';
import { metrics } from '../lab/metrics';
import type { CompareBlock, HeroBlock, ProductPick, Promo, Tip, UIState } from './types';

export type ViewKind = 'home' | 'detail';

export interface Renderer {
  mount(root: HTMLElement, kind: ViewKind): void;
  render(state: UIState, done?: boolean): void;
  /** Reordena las tarjetas según los ids (ranking). */
  reorder(ids: string[]): void;
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const saved = new Set<string>();

// ── "Red" simulada para imágenes: la primera vez tardan (CDN lento), luego vienen de caché ──
const loadedSrc = new Set<string>();
let imgSeq = 0;
export function wireImages(scope: ParentNode) {
  scope.querySelectorAll<HTMLImageElement>('img[data-src]').forEach((img) => {
    const src = img.dataset.src!;
    img.removeAttribute('data-src');
    if (loadedSrc.has(src)) {
      img.src = src;
      return;
    }
    // Red realista (igual en roto y arreglado): 0,6–1,8 s la primera vez.
    const delay = 600 + ((imgSeq++ * 337) % 1200);
    setTimeout(() => {
      img.src = src;
      img.addEventListener('load', () => loadedSrc.add(src), { once: true });
    }, delay);
  });
}

// Con "reservar espacio" las imágenes llevan width/height y el contenedor tiene aspect-ratio.
const imgTag = (src: string, alt: string, w: number, h: number, priority = false) =>
  flags.reserve
    ? `<img data-src="${esc(src)}" alt="${esc(alt)}" width="${w}" height="${h}" decoding="async"${priority ? ' fetchpriority="high"' : ' loading="lazy"'} />`
    : `<img data-src="${esc(src)}" alt="${esc(alt)}" />`;

function heroHTML(h: HeroBlock | undefined, kind: ViewKind) {
  if (!h) return flags.reserve ? `<section class="hero skeleton" aria-hidden="true"><div class="media"></div><div><i></i><i></i></div></section>` : '';
  return `<section class="hero" data-part="hero">
    <div class="media">${h.image ? imgTag(h.image, '', 400, 300, true) : ''}</div>
    <div><p class="eyebrow">${kind === 'home' ? '// Generado para ti' : '// Detalle generado'}</p><h1 data-f="title">${esc(h.title)}</h1><p class="sub" data-f="subtitle">${esc(h.subtitle)}</p></div>
  </section>`;
}

function promoHTML(p: Promo | undefined) {
  if (!p) return flags.reserve ? `<aside class="promo skeleton" aria-hidden="true"><span>Buscando ofertas del día…</span></aside>` : '';
  return `<aside class="promo" data-part="promo"><b data-f="text">${esc(p.text)}</b><code data-f="code">${esc(p.code)}</code></aside>`;
}

export function cardHTML(pick: Partial<ProductPick> | undefined, inner = false) {
  const p = pick?.id ? BY_ID.get(pick.id) : undefined;
  if (!p) return inner ? '' : flags.reserve ? `<article class="card skeleton" aria-hidden="true"><div class="media"></div><div class="body"><i></i><i></i><i></i></div></article>` : '';
  const body = `<div class="media">${imgTag(p.image, p.name, 400, 300)}</div>
    <div class="body">
      <span class="tag" data-f="tag">${esc(pick!.tag)}</span>
      <h3>${esc(p.name)}</h3>
      <p class="meta">${esc(p.origin)} · <b>${fmtQ(p.price)}</b> · ${p.rating.toFixed(1)} ★</p>
      <p class="reason" data-f="reason">${esc(pick!.reason)}</p>
      <ul class="chips" data-f="highlights">${(pick!.highlights ?? []).map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
      <div class="actions">
        <button type="button" class="save" data-save="${esc(p.id)}" aria-pressed="${saved.has(p.id)}">${saved.has(p.id) ? '♥ Guardado' : '♡ Guardar'}</button>
        <a href="/p/${esc(p.id)}" data-open="${esc(p.id)}">Ver detalle →</a>
      </div>
    </div>`;
  return inner ? body : `<article class="card" data-id="${esc(p.id)}">${body}</article>`;
}

function compareHTML(c: CompareBlock | undefined) {
  if (!c) return flags.reserve ? `<section class="compare skeleton" aria-hidden="true"></section>` : '';
  return `<section class="compare" data-part="compare"><h2>${esc(c.title)}</h2><div class="table-wrap"><table>
    <thead><tr>${(c.columns ?? []).map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${(c.rows ?? []).map((r) => `<tr>${(r ?? []).map((v, i) => (i ? `<td>${esc(v)}</td>` : `<th scope="row">${esc(v)}</th>`)).join('')}</tr>`).join('')}</tbody></table></div></section>`;
}

function tipsHTML(t: Tip[] | undefined) {
  if (!t) return flags.reserve ? `<section class="tips skeleton" aria-hidden="true"></section>` : '';
  return `<section class="tips" data-part="tips"><h2>Consejos</h2><div class="tip-grid">${t.map((x) => `<div class="tip"><h3>${esc(x?.title)}</h3><p>${esc(x?.text)}</p></div>`).join('')}</div></section>`;
}

function gridHead(kind: ViewKind) {
  return kind === 'home'
    ? `<div class="grid-head"><h2>Recomendados</h2><button type="button" class="sort" data-sort>Ordenar por recomendación</button></div>`
    : `<div class="grid-head"><h2>Combina con</h2><a href="/" data-home>← Volver a los resultados</a></div>`;
}

function storyHTML(state: UIState) {
  if (state.story === undefined) return flags.reserve ? `<section class="story skeleton" aria-hidden="true"></section>` : '';
  return `<section class="story" data-part="story"><p data-f="story">${esc(state.story)}</p>
    ${state.specs ? `<dl class="specs">${state.specs.map(([k, v] = []) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}</section>`;
}

/**
 * ROTO: innerHTML de CADA sección en CADA actualización (sin diff, sin claves).
 * Los contenedores de sección sí son estables (como en muchas apps reales): por eso,
 * cuando el banner tardío o una imagen sin dimensiones cambian de tamaño, todo lo de abajo
 * se mueve y el CLS lo registra. Dato curioso: si recreas TODA la vista, el CLS ni siquiera
 * lo ve (los nodos son nuevos), pero tu usuario sí.
 */
export class NaiveRenderer implements Renderer {
  private root!: HTMLElement;
  private kind: ViewKind = 'home';
  private last: UIState = {};
  private sec: Record<string, HTMLElement> = {};
  mount(root: HTMLElement, kind: ViewKind) {
    this.root = root;
    this.kind = kind;
    this.last = {};
    root.innerHTML = `${kind === 'home' ? '<div data-sec="promo"></div>' : ''}<div data-sec="hero"></div>${kind === 'detail' ? '<div data-sec="story"></div>' : ''}
      <section class="products">${gridHead(kind)}<div class="grid" data-sec="grid"></div></section>
      ${kind === 'home' ? '<div data-sec="compare"></div><div data-sec="tips"></div>' : ''}`;
    this.sec = Object.fromEntries([...root.querySelectorAll<HTMLElement>('[data-sec]')].map((el) => [el.dataset.sec!, el]));
  }
  render(state: UIState) {
    this.last = state;
    const list = (this.kind === 'home' ? state.products : state.pairings) ?? [];
    const slots = flags.reserve ? Math.max(list.length, this.kind === 'home' ? 8 : 3) : list.length;
    // El banner "tardío" va ARRIBA: si no hay espacio reservado, empuja todo lo demás.
    if (this.sec.promo) this.sec.promo.innerHTML = promoHTML(state.promo);
    this.sec.hero.innerHTML = heroHTML(state.hero, this.kind);
    if (this.sec.story) this.sec.story.innerHTML = storyHTML(state);
    this.sec.grid.innerHTML = Array.from({ length: slots }, (_, i) => cardHTML(list[i])).join('');
    if (this.sec.compare) this.sec.compare.innerHTML = compareHTML(state.compare);
    if (this.sec.tips) this.sec.tips.innerHTML = tipsHTML(state.tips);
    wireImages(this.root);
    metrics.renders++;
  }
  reorder(ids: string[]) {
    const list = this.last.products ?? [];
    this.last = { ...this.last, products: ids.map((id) => list.find((p) => p.id === id)!).filter(Boolean) };
    this.render(this.last);
  }
}

/** ARREGLADO: nodos estables por parte y por id; slots reservados que se reciclan. */
export class KeyedRenderer implements Renderer {
  private root!: HTMLElement;
  private kind: ViewKind = 'home';
  private parts = new Map<string, { el: HTMLElement; sig: string }>();
  private grid!: HTMLElement;
  private cards = new Map<string, HTMLElement>();
  private slots: HTMLElement[] = [];

  mount(root: HTMLElement, kind: ViewKind) {
    this.root = root;
    this.kind = kind;
    this.parts.clear();
    this.cards.clear();
    // Estructura fija: cada parte tiene su contenedor desde el inicio (vacío o con esqueleto).
    root.innerHTML = `${kind === 'home' ? '<div data-slot="promo"></div>' : ''}<div data-slot="hero"></div>${kind === 'detail' ? '<div data-slot="story"></div>' : ''}
      <section class="products">${gridHead(kind)}<div class="grid"></div></section>
      ${kind === 'home' ? '<div data-slot="compare"></div><div data-slot="tips"></div>' : ''}`;
    this.grid = root.querySelector('.grid')!;
    this.slots = [];
    if (flags.reserve) {
      const n = kind === 'home' ? 8 : 3;
      this.grid.innerHTML = Array.from({ length: n }, () => cardHTML(undefined)).join('');
      this.slots = [...this.grid.children] as HTMLElement[];
      for (const name of ['promo', 'hero', 'story', 'compare', 'tips']) this.setPart(name, '', true);
    }
  }

  /** Reemplaza una parte solo si su contenido cambió (firma). */
  private setPart(name: string, html: string, skeleton = false) {
    const slot = this.root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
    if (!slot) return;
    const sig = skeleton ? '__skeleton' : html;
    const cur = this.parts.get(name);
    if (cur?.sig === sig) return;
    if (skeleton) {
      const fn = { promo: promoHTML, hero: (x: undefined) => heroHTML(x, this.kind), story: () => storyHTML({}), compare: compareHTML, tips: tipsHTML }[name as 'promo'];
      slot.innerHTML = fn(undefined);
    } else if (cur && name === 'hero' && cur.sig !== '__skeleton') {
      // Mismo hero, distinto texto: solo parcheamos el texto (la imagen no se toca).
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      slot.querySelectorAll<HTMLElement>('[data-f]').forEach((el) => {
        const next = tmp.querySelector<HTMLElement>(`[data-f="${el.dataset.f}"]`);
        if (next && el.textContent !== next.textContent) el.textContent = next.textContent;
      });
    } else {
      slot.innerHTML = html;
      wireImages(slot);
    }
    this.parts.set(name, { el: slot, sig });
  }

  render(state: UIState) {
    if (state.promo) this.setPart('promo', promoHTML(state.promo));
    if (state.hero) this.setPart('hero', heroHTML(state.hero, this.kind));
    if (this.kind === 'detail' && state.story !== undefined) this.setPart('story', storyHTML(state));
    const list = (this.kind === 'home' ? state.products : state.pairings) ?? [];
    list.forEach((pick, i) => this.upsertCard(pick, i));
    if (this.kind === 'home') {
      if (state.compare) this.setPart('compare', compareHTML(state.compare));
      if (state.tips) this.setPart('tips', tipsHTML(state.tips));
    }
    metrics.renders++;
  }

  private upsertCard(pick: ProductPick, i: number) {
    if (!pick?.id || !BY_ID.has(pick.id)) return;
    let el = this.cards.get(pick.id);
    if (!el) {
      // Reciclamos el slot reservado (mismo nodo, misma caja): cero layout shift.
      el = this.slots[i] ?? document.createElement('article');
      el.className = 'card';
      el.removeAttribute('aria-hidden');
      el.dataset.id = pick.id;
      el.style.viewTransitionName = `card-${pick.id}`;
      el.innerHTML = cardHTML(pick, true);
      if (!el.isConnected) this.grid.append(el);
      wireImages(el);
      this.cards.set(pick.id, el);
      return;
    }
    // Ya existe: solo el texto que cambió (tag, razón, chips).
    const reason = el.querySelector<HTMLElement>('[data-f="reason"]')!;
    if (reason.textContent !== pick.reason) reason.textContent = pick.reason;
    const tag = el.querySelector<HTMLElement>('[data-f="tag"]')!;
    if (tag.textContent !== pick.tag) tag.textContent = pick.tag;
  }

  reorder(ids: string[]) {
    const move = () => ids.forEach((id) => this.cards.get(id) && this.grid.append(this.cards.get(id)!));
    // View Transition con alcance de elemento (Chrome 147+) o de documento como respaldo.
    const g = this.grid as HTMLElement & { startViewTransition?: (cb: () => void) => unknown };
    const vt = g.startViewTransition?.bind(g) ?? (document as Document & { startViewTransition?: (cb: () => void) => unknown }).startViewTransition?.bind(document);
    if (vt && !matchMedia('(prefers-reduced-motion: reduce)').matches) vt(move);
    else move();
  }
}
