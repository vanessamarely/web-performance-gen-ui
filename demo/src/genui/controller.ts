// Orquesta stream → parser → estado → render según los interruptores del laboratorio.
// Cada etapa deja su pista en el panel Performance (Mercadito · GenUI).
import { WORK, burn, flags } from '../lab/flags';
import { metrics } from '../lab/metrics';
import { trackMarker, trackSpan } from '../lab/perf-tracks';
import { rankProducts } from '../rank/rank';
import { streamUI, type View } from './engine';
import { IncrementalParser, NaiveParser, type Parser } from './parsers';
import { KeyedRenderer, NaiveRenderer, type Renderer } from './render';
import type { UIState } from './types';

type SchedulerLike = { yield?: () => Promise<void> };
const yieldToMain = () => {
  const s = (globalThis as unknown as { scheduler?: SchedulerLike }).scheduler;
  return s?.yield ? s.yield() : new Promise<void>((r) => setTimeout(r, 0));
};

export class GenUIController {
  private abort: AbortController | null = null;
  private renderer: Renderer = new NaiveRenderer();
  private state: UIState = {};
  private worker: Worker | null = null;
  view: View | null = null;

  constructor(private root: HTMLElement) {}

  async run(view: View) {
    this.abort?.abort();
    const ac = (this.abort = new AbortController());
    this.view = view;
    const kind = view.kind;
    this.renderer = flags.keyed ? new KeyedRenderer() : new NaiveRenderer();
    const parser: Parser = flags.incremental ? new IncrementalParser() : new NaiveParser();
    this.state = {};
    this.root.setAttribute('aria-busy', 'true');
    this.root.classList.toggle('reserve', flags.reserve);
    this.renderer.mount(this.root, kind);
    if (flags.reserve) this.renderer.render({}); // esqueletos con la altura final
    metrics.status = 'generando…';
    trackMarker(`genui:start ${kind}`);
    const tStream = performance.now();

    // Render: inmediato (roto) o agrupado por frame (arreglado).
    let dirty = false;
    let rendering = false;
    const flush = async () => {
      dirty = false;
      if (rendering) return;
      rendering = true;
      const t0 = performance.now();
      this.renderer.render(this.state);
      burn(performance.now() - t0);
      trackSpan('Render', flags.keyed ? 'patch por clave' : 'innerHTML', t0, performance.now(), flags.keyed ? 'secondary' : 'error');
      rendering = false;
      await yieldToMain();
    };
    const schedule = () => {
      if (!flags.frame) {
        const t0 = performance.now();
        this.renderer.render(this.state);
        burn(performance.now() - t0);
        trackSpan('Render', flags.keyed ? 'patch por clave' : 'innerHTML', t0, performance.now(), flags.keyed ? 'secondary' : 'error');
        return;
      }
      if (!dirty) {
        dirty = true;
        requestAnimationFrame(() => void flush());
      }
    };

    try {
      for await (const chunk of streamUI(view, ac.signal)) {
        if (ac.signal.aborted) return;
        metrics.chunks++;
        const t0 = performance.now();
        const before = parser.scanned;
        const { state, changed } = parser.push(chunk);
        burn(performance.now() - t0);
        const dt = performance.now() - t0;
        metrics.parseMs += dt;
        metrics.scanned += parser.scanned - before;
        trackSpan('Parser', flags.incremental ? 'incremental' : 'JSON.parse(buffer)', t0, t0 + dt, flags.incremental ? 'tertiary' : 'warning', [['chars', String(parser.scanned - before)]]);
        if (changed) {
          this.state = state;
          schedule();
        }
      }
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return;
      console.error('[genui]', err);
      metrics.status = 'error (ver consola)';
    }
    if (ac.signal.aborted) return;
    this.renderer.render(this.state);
    metrics.streamMs = performance.now() - tStream;
    trackSpan('Stream', `${kind} · ${metrics.chunks} chunks`, tStream, performance.now(), 'primary');
    this.root.setAttribute('aria-busy', 'false');
    metrics.status = `listo en ${(metrics.streamMs / 1000).toFixed(1)} s`;
    document.querySelector('[data-announce]')!.textContent = kind === 'home' ? 'Resultados listos.' : 'Detalle listo.';
  }

  /** "Ordenar por recomendación": en el hilo principal (roto) o en un Worker (arreglado). */
  async rank(button: HTMLButtonElement) {
    const ids = (this.state.products ?? []).map((p) => p.id);
    if (!ids.length) return;
    const t0 = performance.now();
    if (!flags.worker) {
      // ROTO: el handler del clic hace todo el cálculo; el navegador no puede pintar.
      const res = rankProducts({ ids, work: WORK });
      burn(res.ms);
      metrics.rankMs = res.ms;
      trackSpan('Ranking', 'rankProducts() · hilo principal', t0, performance.now(), 'error');
      this.renderer.reorder(res.ids);
      button.textContent = `Ordenado (${Math.round(res.ms)} ms bloqueando)`;
      return;
    }
    // ARREGLADO: feedback inmediato, cálculo en un Worker, reordenar con View Transition.
    button.textContent = 'Ordenando…';
    button.disabled = true;
    this.worker ??= new Worker(new URL('../rank/rank.worker.ts', import.meta.url), { type: 'module' });
    const res = await new Promise<{ ids: string[]; ms: number }>((resolve) => {
      this.worker!.onmessage = (e) => resolve(e.data);
      this.worker!.postMessage({ ids, work: WORK });
    });
    metrics.rankMs = res.ms;
    trackSpan('Ranking', 'rankProducts() · Worker', t0, performance.now(), 'secondary');
    this.renderer.reorder(res.ids);
    button.disabled = false;
    button.textContent = `Ordenado (${Math.round(res.ms)} ms en un Worker)`;
  }

  get current() {
    return this.state;
  }
}
