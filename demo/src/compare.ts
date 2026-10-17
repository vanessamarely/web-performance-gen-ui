// Envía el mismo prompt a los dos iframes y compara sus métricas en una tabla.
import './styles.css';
import type { Metrics } from './lab/metrics';

const frames = [...document.querySelectorAll('iframe')];
const latest: (Metrics | null)[] = [null, null];
addEventListener('message', (e) => {
  if (e.origin !== location.origin || e.data?.type !== 'metrics') return;
  const i = frames.findIndex((f) => f.contentWindow === e.source);
  if (i >= 0) latest[i] = e.data.metrics;
});
document.querySelector<HTMLFormElement>('[data-cmp]')!.addEventListener('submit', (e) => {
  e.preventDefault();
  const prompt = (e.currentTarget as HTMLFormElement).querySelector('input')!.value;
  frames.forEach((f) => f.contentWindow?.postMessage({ type: 'generate', prompt }, location.origin));
});
const rows: [string, (m: Metrics) => string][] = [
  ['CLS', (m) => m.cls.toFixed(3)],
  ['LoAF (> 50 ms)', (m) => `${m.loafCount} · máx ${Math.round(m.loafMax)} ms`],
  ['INP (aprox.)', (m) => `${Math.round(m.inp)} ms`],
  ['Nodos creados', (m) => m.nodesCreated.toLocaleString('es-GT')],
  ['Parseo', (m) => `${m.parseMs.toFixed(1)} ms`],
  ['Renders', (m) => String(m.renders)],
  ['Estado', (m) => m.status],
];
const table = document.querySelector<HTMLTableElement>('[data-table]')!;
setInterval(() => {
  table.innerHTML = `<thead><tr><th>Métrica</th><th class="bad">Roto</th><th class="good">Arreglado</th></tr></thead><tbody>${rows
    .map(([k, f]) => `<tr><th scope="row">${k}</th><td>${latest[0] ? f(latest[0]) : '—'}</td><td>${latest[1] ? f(latest[1]) : '—'}</td></tr>`)
    .join('')}</tbody>`;
}, 500);
