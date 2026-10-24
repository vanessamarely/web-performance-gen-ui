# Code Patterns

Framework-agnostic TypeScript examples; adapt them to the project's stack (framework equivalents
are listed at the end). Each example supports one of the 10 rules in `SKILL.md`.

## Contents

1. Data contract: catalog + schema
2. Reserve space (CSS)
3. Parse once (NDJSON or incremental parser)
4. One render per frame + yield to the browser
5. Stable keys + View Transitions
6. Heavy work in a Worker
7. State outside rendering
8. Soft navigations and RUM
9. Custom tracks in the Performance panel
10. Framework equivalents

## 1. Data Contract: Catalog + Schema

```ts
// Property order determines streaming order: visible content first (LCP).
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
// Validate each `id` against your actual catalog before rendering it (grounding).
```

## 2. Reserve Space

```css
.slot-card { min-height: 320px; contain: layout paint; }
.slot-card img { width: 100%; height: auto; aspect-ratio: 4 / 3; }
.slot-card .reason { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; line-clamp: 3; overflow: hidden; }
/* Late banners: reserve their space from the first frame. */
.slot-promo { min-height: 56px; }
/* Only for completed sections that are outside the viewport. */
.section-done { content-visibility: auto; contain-intrinsic-size: auto 600px; }
```

Render skeletons with the same dimensions as the completed component and **fill the same node**
when data arrives (do not replace it with a differently sized node).

The space must be reserved **at first paint**: put skeletons in the initial HTML or give each
container its final height in CSS. If the page loads empty and a script creates the slots later,
everything below moves and contributes to load CLS:

```css
/* The container reserves the height of six cards, even before they exist. */
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; min-height: calc(2 * 320px + 16px); }
.compare { min-height: 300px; }
```

## 3. Parse Once

The simplest option is to request **one JSON object per line** (NDJSON). Parse each line once,
when it is complete.

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

If the format must be one JSON object, use an incremental parser that remembers its position
(`pos`) and emits each item when its closing `}` arrives. Do not scan already processed input
again.

## 4. One Render per Frame + Yield to the Browser

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
    // Yield about every eight changes so pending input can be handled (INP).
    if (i % 8 === 7) await yieldToMain();
  }
}
```

Inspect long animation frames (LoAF):

```ts
type LoAF = PerformanceEntry & { scripts?: { sourceFunctionName: string; duration: number }[] };

new PerformanceObserver((list) => {
  for (const frame of list.getEntries() as LoAF[]) {
    for (const s of frame.scripts ?? []) console.log('LoAF', Math.round(frame.duration), s.sourceFunctionName, Math.round(s.duration));
  }
}).observe({ type: 'long-animation-frame', buffered: true });
```

## 5. Stable Keys + View Transitions

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
  if (h3.textContent !== item.title) h3.textContent = item.title; // textContent, never model-generated HTML
  if (p.textContent !== item.reason) p.textContent = item.reason;
}

export function reorder(list: HTMLElement, ids: string[]) {
  const move = () => ids.forEach((id) => { const el = nodes.get(id); if (el) list.append(el); });
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) doc.startViewTransition(move);
  else move();
}
```

## 6. Heavy Work in a Worker

```ts
// rank.worker.ts
self.onmessage = (e: MessageEvent<{ ids: string[] }>) => {
  const ranked = [...e.data.ids].sort(); // Replace with your actual calculation.
  self.postMessage(ranked);
};

// main.ts
const worker = new Worker(new URL('./rank.worker.ts', import.meta.url), { type: 'module' });
export function rankInWorker(ids: string[], button: HTMLButtonElement): Promise<string[]> {
  button.textContent = 'Sorting…'; // Give feedback in the same frame as the click.
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

## 7. State Outside Rendering

```ts
type Listener = () => void;
export class StreamStore<T extends { id: string }> {
  private draft = new Map<string, T>();   // Incoming data.
  private committed = new Map<string, T>(); // Validated data; previous content stays visible.
  private listeners = new Map<string, Set<Listener>>();

  upsertDraft(item: T) {
    this.draft.set(item.id, item);
    this.listeners.get(item.id)?.forEach((l) => l()); // Notify only subscribers to this id.
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

Derive totals, filters, and ordering **in code** from the store; do not ask the model to compute them.

## 8. Soft Navigations and RUM

```ts
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';

const send = (m: Metric) => navigator.sendBeacon('/rum', JSON.stringify({ name: m.name, value: m.value, id: m.id, nav: m.navigationType }));
for (const on of [onLCP, onINP, onCLS]) on(send, { reportSoftNavs: true });
```

`reportSoftNavs` requires a web-vitals version with soft-navigation support (v6 or its
`soft-navs` build); check the documentation for the installed version. Without the library,
observe `soft-navigation` and associate each `interaction-contentful-paint` with its view by
`interactionId`. These APIs are currently supported in Chromium-based browsers, so feature-detect
them and expect different coverage in other browsers.

## 9. Custom Tracks in the Performance Panel

```ts
export function track(name: string, start: number, color: 'primary' | 'secondary' | 'tertiary' | 'error' = 'primary') {
  performance.measure(name, {
    start,
    end: performance.now(),
    detail: { devtools: { dataType: 'track-entry', track: 'GenUI', trackGroup: 'My app', color, tooltipText: name } },
  });
}
// const t0 = performance.now(); render(); track('render', t0);
```

In Chrome DevTools versions that support `detail.devtools`, this adds context for AI assistance
and agents reading the trace. Without DevTools open, the measure remains a User Timing entry.

## 10. Framework Equivalents

| Pattern | React | Angular | Vue |
|---|---|---|---|
| Claves estables | `key={item.id}` | `@for (… ; track item.id)` | `:key="item.id"` |
| Fine-grained subscription | `useSyncExternalStore` per id | `signal`/`computed` per id, `OnPush` | `shallowRef` + `computed` per id |
| Batch per frame | accumulate and call `setState` once in rAF | update signals in rAF | update in rAF; `nextTick` is not enough |
| Long list | `@tanstack/react-virtual` | CDK `cdk-virtual-scroll-viewport` | `vue-virtual-scroller` |
