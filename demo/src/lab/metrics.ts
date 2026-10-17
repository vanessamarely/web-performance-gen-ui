// Métricas de laboratorio (las mismas que verás en DevTools, medidas en la página).
//  · CLS: layout-shift sin input reciente · INP aprox.: Event Timing (peor interacción)
//  · LoAF: long-animation-frame (> 50 ms) · LCP y soft navigations (Chrome 151+)
//  · nodos creados: MutationObserver sobre la UI generada
export const metrics = {
  cls: 0,
  inp: 0,
  lastInteraction: 0,
  loafCount: 0,
  loafMax: 0,
  loafScript: '',
  lcp: 0,
  nodesCreated: 0,
  domSize: 0,
  parseMs: 0,
  scanned: 0,
  renders: 0,
  chunks: 0,
  streamMs: 0,
  status: 'listo',
  softNavs: 0,
  softUrl: '',
  softLcp: 0,
  softSupported: false,
  rankMs: 0,
};
export type Metrics = typeof metrics;

const resettable: (keyof Metrics)[] = ['cls', 'inp', 'lastInteraction', 'loafCount', 'loafMax', 'loafScript', 'nodesCreated', 'parseMs', 'scanned', 'renders', 'chunks', 'streamMs', 'rankMs'];
export function resetMetrics() {
  for (const k of resettable) (metrics as Record<string, unknown>)[k] = typeof metrics[k] === 'string' ? '' : 0;
}

function observe(type: string, cb: (e: PerformanceEntry) => void, extra: Record<string, unknown> = {}) {
  try {
    if (!PerformanceObserver.supportedEntryTypes?.includes(type)) return false;
    new PerformanceObserver((list) => list.getEntries().forEach(cb)).observe({ type, buffered: true, ...extra } as PerformanceObserverInit);
    return true;
  } catch {
    return false;
  }
}

export function startObservers(root: HTMLElement) {
  observe('layout-shift', (e) => {
    const s = e as PerformanceEntry & { value: number; hadRecentInput: boolean };
    if (!s.hadRecentInput) metrics.cls += s.value;
  });
  const worst = new Map<number, number>();
  observe(
    'event',
    (e) => {
      const ev = e as PerformanceEntry & { interactionId?: number };
      if (!ev.interactionId) return;
      const d = Math.max(worst.get(ev.interactionId) ?? 0, ev.duration);
      worst.set(ev.interactionId, d);
      metrics.lastInteraction = d;
      metrics.inp = Math.max(metrics.inp, d);
    },
    { durationThreshold: 16 },
  );
  observe('long-animation-frame', (e) => {
    const f = e as PerformanceEntry & { blockingDuration?: number; scripts?: { sourceFunctionName?: string; invoker?: string; duration: number }[] };
    // Solo frames largos con trabajo de script (los demás son ruido del compositor o de capturas).
    const scriptTime = (f.scripts ?? []).reduce((a, s) => a + s.duration, 0);
    if (scriptTime < 30 && !f.blockingDuration) return;
    metrics.loafCount++;
    if (f.duration > metrics.loafMax) {
      metrics.loafMax = f.duration;
      const top = [...(f.scripts ?? [])].sort((a, b) => b.duration - a.duration)[0];
      metrics.loafScript = top ? top.sourceFunctionName || top.invoker || '' : '';
    }
  });
  observe('largest-contentful-paint', (e) => (metrics.lcp = e.startTime));

  // Soft navigations (Chrome 151+): interacción + cambio de URL + pintura.
  // Las pinturas se atribuyen a su vista por interactionId (no por navigationId), y pueden
  // llegar ANTES que la entrada soft-navigation: guardamos la mayor por interacción.
  const icp = new Map<number, number>();
  let softInteraction = -1;
  metrics.softSupported = observe('soft-navigation', (e) => {
    const n = e as PerformanceEntry & { interactionId?: number };
    metrics.softNavs++;
    metrics.softUrl = new URL(n.name, location.origin).pathname;
    softInteraction = n.interactionId ?? -1;
    metrics.softLcp = icp.get(softInteraction) ?? 0;
  });
  observe('interaction-contentful-paint', (e) => {
    const p = e as PerformanceEntry & { interactionId?: number; largestContentfulPaint?: { renderTime?: number; startTime: number } };
    if (!p.interactionId) return;
    const lcp = (p.largestContentfulPaint?.renderTime || p.largestContentfulPaint?.startTime || p.startTime + p.duration) - p.startTime;
    icp.set(p.interactionId, Math.max(icp.get(p.interactionId) ?? 0, lcp));
    if (p.interactionId === softInteraction) metrics.softLcp = icp.get(p.interactionId)!;
  });

  // Nodos creados en la UI generada (lo que innerHTML dispara y las claves evitan).
  new MutationObserver((records) => {
    for (const r of records)
      r.addedNodes.forEach((n) => {
        metrics.nodesCreated += n.nodeType === 1 ? 1 + (n as Element).getElementsByTagName('*').length : 1;
      });
  }).observe(root, { childList: true, subtree: true });
  setInterval(() => (metrics.domSize = root.getElementsByTagName('*').length), 500);
}
