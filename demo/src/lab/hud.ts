// HUD fijo con las métricas en vivo. Se actualiza 2 veces por segundo (no por token):
// medir no debe convertirse en el cuello de botella.
import { flags } from './flags';
import { metrics, resetMetrics } from './metrics';

const fmt = (n: number, d = 0) => n.toLocaleString('es-GT', { maximumFractionDigits: d, minimumFractionDigits: d });
const grade = (v: number, good: number, poor: number) => (v <= good ? 'good' : v <= poor ? 'ni' : 'poor');

export function mountHud(host: HTMLElement) {
  host.innerHTML = `<div class="hud" role="group" aria-label="Métricas en vivo">
    <span data-k="cls"></span><span data-k="inp"></span><span data-k="loaf"></span><span data-k="nodes"></span>
    <span data-k="parse"></span><span data-k="soft"></span><span data-k="status" class="status"></span>
    <button type="button" data-reset title="Reiniciar métricas">↺</button>
  </div>`;
  const set = (k: string, html: string, g = '') => {
    const el = host.querySelector<HTMLElement>(`[data-k="${k}"]`)!;
    if (el.innerHTML !== html) el.innerHTML = html;
    el.dataset.grade = g;
  };
  const tick = () => {
    set('cls', `CLS <b>${fmt(metrics.cls, 3)}</b>`, grade(metrics.cls, 0.1, 0.25));
    set('inp', `INP <b>${fmt(metrics.inp)} ms</b>`, metrics.inp ? grade(metrics.inp, 200, 500) : '');
    set('loaf', `LoAF <b>${metrics.loafCount}</b> · máx <b>${fmt(metrics.loafMax)} ms</b>`, metrics.loafMax ? grade(metrics.loafMax, 50, 150) : '');
    set('nodes', `nodos creados <b>${fmt(metrics.nodesCreated)}</b> · DOM <b>${fmt(metrics.domSize)}</b>`);
    set('parse', `parseo <b>${fmt(metrics.parseMs, 1)} ms</b> · ${fmt(metrics.renders)} renders`);
    set('soft', metrics.softSupported ? `soft navs <b>${metrics.softNavs}</b>${metrics.softLcp ? ` · LCP <b>${fmt(metrics.softLcp)} ms</b>` : ''}` : 'soft navs <b>n/d</b>');
    set('status', `${metrics.status}`);
    host.dataset.mode = Object.values(flags).every(Boolean) ? 'fixed' : Object.values(flags).some(Boolean) ? 'mixed' : 'broken';
  };
  host.querySelector('[data-reset]')!.addEventListener('click', () => {
    resetMetrics();
    tick();
  });
  setInterval(tick, 500);
  tick();
}
