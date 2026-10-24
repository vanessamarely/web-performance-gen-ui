// Hace VISIBLE lo que miden las métricas, para el público que no lee números:
//  · cada layout shift se marca en rojo sobre el elemento que se movió (como "Layout Shift
//    Regions" de DevTools), con una flecha de cuánto se desplazó;
//  · cada frame congelado (LoAF con más de 100 ms de script) muestra un aviso "congelada".
// Se activa por defecto; ?visual=off o el interruptor del laboratorio lo apagan.
const params = new URLSearchParams(location.search);
export const visual = { on: params.get('visual') !== 'off' };

type Rect = { x: number; y: number; width: number; height: number };
type ShiftSource = { node?: Node; previousRect: Rect; currentRect: Rect };

let layer: HTMLElement | null = null;
const ensureLayer = () => {
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'vis-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.append(layer);
  }
  return layer;
};

function flashShift(src: ShiftSource) {
  const r = src.currentRect;
  if (!r.width || !r.height) return;
  const dy = Math.round(r.y - src.previousRect.y);
  const box = document.createElement('div');
  box.className = 'vis-shift';
  box.style.cssText = `left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${Math.min(r.height, innerHeight)}px`;
  if (Math.abs(dy) >= 4) box.dataset.dy = `${dy > 0 ? '↓' : '↑'} ${Math.abs(dy)} px`;
  ensureLayer().append(box);
  box.addEventListener('animationend', () => box.remove(), { once: true });
}

function flashFreeze(ms: number) {
  const t = document.createElement('div');
  t.className = 'vis-freeze';
  t.textContent = `⏳ La página se congeló ${Math.round(ms)} ms`;
  ensureLayer().append(t);
  t.addEventListener('animationend', () => t.remove(), { once: true });
}

export function startVisual() {
  try {
    new PerformanceObserver((list) => {
      if (!visual.on) return;
      for (const e of list.getEntries() as (PerformanceEntry & { hadRecentInput: boolean; sources?: ShiftSource[] })[]) {
        if (e.hadRecentInput) continue;
        // Marcamos solo los elementos grandes (los que el usuario nota), no cada <span>.
        (e.sources ?? []).filter((s) => s.currentRect.width * s.currentRect.height > 2000).slice(0, 4).forEach(flashShift);
      }
    }).observe({ type: 'layout-shift' });
    new PerformanceObserver((list) => {
      if (!visual.on) return;
      for (const f of list.getEntries() as (PerformanceEntry & { scripts?: { duration: number }[] })[]) {
        const script = (f.scripts ?? []).reduce((a, s) => a + s.duration, 0);
        if (script >= 100) flashFreeze(f.duration);
      }
    }).observe({ type: 'long-animation-frame' });
  } catch {
    /* navegadores sin estas entradas: no mostramos nada */
  }
}
