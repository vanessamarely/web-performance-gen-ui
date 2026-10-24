# Patrones de código

Ejemplos en TypeScript sin framework; tradúcelos al del proyecto (al final hay equivalencias).
Cada uno resuelve una de las 10 reglas de `SKILL.md`.

## Contenido

1. Contrato: catálogo + schema
2. Reservar el espacio (CSS)
3. Parsear una sola vez (NDJSON o parser incremental)
4. Un render por frame + ceder el hilo
5. Claves estables + View Transitions
6. Trabajo pesado en un Worker
7. Estado fuera del render
8. Soft navigations y RUM
9. Pistas propias en el panel Performance
10. Equivalencias por framework

## 1. Contrato: catálogo + schema

```ts
// El orden de las propiedades es el orden del streaming: lo visible primero (LCP).
export const UI_SCHEMA = {
  type: 'object',
  properties: {
    hero: { $ref: '#/$defs/hero' },
    products: { type: 'array', maxItems: 8, items: { $ref: '#/$defs/product' } },
    details: { type: 'array', items: { type: 'string' } },
  },
  required: ['hero', 'products'],
  $defs: {
    hero: { type: 'object', properties: { title: { type: 'string' }, image: { type: 'string' } }, required: ['title'] },
    product: { type: 'object', properties: { id: { type: 'string' }, reason: { type: 'string' } }, required: ['id'] },
  },
} as const;
// Valida que cada `id` exista en tu catálogo real antes de pintarlo (grounding).
```

## 2. Reservar el espacio

```css
.slot-card { min-height: 320px; contain: layout paint; }
.slot-card img { width: 100%; height: auto; aspect-ratio: 4 / 3; }
.slot-card .reason { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; line-clamp: 3; overflow: hidden; }
/* Banners tardíos: su espacio existe desde el primer frame. */
.slot-promo { min-height: 56px; }
/* Solo para secciones TERMINADAS y fuera de pantalla. */
.section-done { content-visibility: auto; contain-intrinsic-size: auto 600px; }
```

Pinta esqueletos con la misma caja que tendrá el componente lleno y **rellena ese mismo nodo**
cuando llegue el dato (no lo reemplaces por otro de distinto tamaño).

La reserva tiene que estar **en el primer pintado**: escribe los esqueletos en el HTML inicial,
o da a cada contenedor su altura final en CSS. Si la página carga vacía y luego un script crea
los slots, todo lo de abajo se mueve y eso cuenta como CLS de carga:

```css
/* El contenedor ya mide lo que medirán 6 tarjetas, aunque aún no existan. */
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; min-height: calc(2 * 320px + 16px); }
.compare { min-height: 300px; }
```

## 3. Parsear una sola vez

La forma más simple: pide al modelo **un objeto JSON por línea** (NDJSON). Cada línea se parsea
una vez cuando está completa.

```ts
export async function* readNDJSON<T>(stream: ReadableStream<BufferSource>): AsyncGenerator<T> {
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
  let pending = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    pending += value;
    let nl: number;
    while ((nl = pending.indexOf('\n')) >= 0) {
      const line = pending.slice(0, nl).trim();
      pending = pending.slice(nl + 1); // solo queda el resto sin procesar
      if (line) yield JSON.parse(line) as T;
    }
  }
  if (pending.trim()) yield JSON.parse(pending) as T;
}
```

Si el formato debe ser un único objeto JSON, usa un parser incremental que recuerde su posición
(`pos`) y emita cada ítem cuando se cierra su `}`; no vuelvas a recorrer lo ya leído.

## 4. Un render por frame + ceder el hilo

```ts
type Change = () => void;
const queue: Change[] = [];
let raf = 0;

export function schedule(change: Change) {
  queue.push(change);
  if (!raf) raf = requestAnimationFrame(flush);
}

const yieldToMain = (): Promise<void> => {
  const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  return s?.yield ? s.yield() : new Promise((r) => setTimeout(r, 0));
};

async function flush() {
  raf = 0;
  const batch = queue.splice(0);
  for (let i = 0; i < batch.length; i++) {
    batch[i]();
    // Cada ~8 cambios cede el hilo: si hubo un clic, se atiende ya (INP).
    if (i % 8 === 7) await yieldToMain();
  }
}
```

Encontrar culpables:

```ts
type LoAF = PerformanceEntry & { scripts?: { sourceFunctionName: string; duration: number }[] };

new PerformanceObserver((list) => {
  for (const frame of list.getEntries() as LoAF[]) {
    for (const s of frame.scripts ?? []) console.log('LoAF', Math.round(frame.duration), s.sourceFunctionName, Math.round(s.duration));
  }
}).observe({ type: 'long-animation-frame', buffered: true });
```

## 5. Claves estables + View Transitions

```ts
interface Item { id: string; title: string; reason: string }
const nodes = new Map<string, HTMLElement>();

export function upsert(list: HTMLElement, item: Item) {
  let el = nodes.get(item.id);
  if (!el) {
    el = document.createElement('article');
    el.dataset.id = item.id;
    el.style.viewTransitionName = `item-${CSS.escape(item.id)}`;
    el.append(document.createElement('h3'), document.createElement('p'));
    list.append(el);
    nodes.set(item.id, el);
  }
  const [h3, p] = el.children as unknown as [HTMLElement, HTMLElement];
  if (h3.textContent !== item.title) h3.textContent = item.title; // textContent, nunca HTML del modelo
  if (p.textContent !== item.reason) p.textContent = item.reason;
}

export function reorder(list: HTMLElement, ids: string[]) {
  const move = () => ids.forEach((id) => { const el = nodes.get(id); if (el) list.append(el); });
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) doc.startViewTransition(move);
  else move();
}
```

## 6. Trabajo pesado en un Worker

```ts
// rank.worker.ts
self.onmessage = (e: MessageEvent<{ ids: string[] }>) => {
  const ranked = [...e.data.ids].sort(); // tu cálculo real aquí
  self.postMessage(ranked);
};

// main.ts
const worker = new Worker(new URL('./rank.worker.ts', import.meta.url), { type: 'module' });
export function rankInWorker(ids: string[], button: HTMLButtonElement): Promise<string[]> {
  button.textContent = 'Ordenando…'; // feedback en el mismo frame del clic
  button.disabled = true;
  return new Promise((resolve) => {
    worker.onmessage = (e: MessageEvent<string[]>) => {
      button.disabled = false;
      resolve(e.data);
    };
    worker.postMessage({ ids });
  });
}
```

## 7. Estado fuera del render

```ts
type Listener = () => void;
export class StreamStore<T extends { id: string }> {
  private draft = new Map<string, T>();   // lo que va llegando
  private committed = new Map<string, T>(); // lo validado (y lo anterior sigue visible)
  private listeners = new Map<string, Set<Listener>>();

  upsertDraft(item: T) {
    this.draft.set(item.id, item);
    this.listeners.get(item.id)?.forEach((l) => l()); // solo quien mira ese id
  }
  commit() {
    for (const [id, v] of this.draft) this.committed.set(id, v);
    this.draft.clear();
  }
  get(id: string) {
    return this.draft.get(id) ?? this.committed.get(id);
  }
  subscribe(id: string, l: Listener) {
    let set = this.listeners.get(id);
    if (!set) this.listeners.set(id, (set = new Set()));
    set.add(l);
    return () => set!.delete(l);
  }
}
```

Totales, filtros y orden se **derivan en código** a partir del store; no se los pidas al modelo.

## 8. Soft navigations y RUM

```ts
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';

const send = (m: Metric) => navigator.sendBeacon('/rum', JSON.stringify({ name: m.name, value: m.value, id: m.id, nav: m.navigationType }));
for (const on of [onLCP, onINP, onCLS]) on(send, { reportSoftNavs: true });
```

`reportSoftNavs` requiere una versión de web-vitals con soporte de soft navigations (v6 o su
build `soft-navs`); revisa la documentación de la versión instalada. Sin librería: observa
`soft-navigation` y asocia cada `interaction-contentful-paint` a su vista por `interactionId`.

## 9. Pistas propias en el panel Performance

```ts
export function track(name: string, start: number, color: 'primary' | 'secondary' | 'tertiary' | 'error' = 'primary') {
  performance.measure(name, {
    start,
    end: performance.now(),
    detail: { devtools: { dataType: 'track-entry', track: 'GenUI', trackGroup: 'Mi app', color, tooltipText: name } },
  });
}
// const t0 = performance.now(); render(); track('render', t0);
```

Le da contexto a AI assistance de DevTools y a los agentes que leen el trace.

## 10. Equivalencias por framework

| Patrón | React | Angular | Vue |
|---|---|---|---|
| Claves estables | `key={item.id}` | `@for (… ; track item.id)` | `:key="item.id"` |
| Suscripción fina | `useSyncExternalStore` por id | `signal`/`computed` por id, `OnPush` | `shallowRef` + `computed` por id |
| Agrupar por frame | acumula y un solo `setState` en rAF | actualiza signals en rAF | actualiza en rAF; `nextTick` no basta |
| Lista larga | `@tanstack/react-virtual` | CDK `cdk-virtual-scroll-viewport` | `vue-virtual-scroller` |
