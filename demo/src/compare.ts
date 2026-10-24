// Envía el mismo prompt a los dos iframes y compara sus métricas en una tabla.
import './styles.css';
import type { Metrics } from './lab/metrics';

const frames = [...document.querySelectorAll<HTMLIFrameElement>('iframe')];
// Los dos iframes con la MISMA CPU simulada (por defecto 4×: en una laptop rápida casi
// todo se ve bien; en un celular de gama media es donde la diferencia duele).
const cpuSel = document.querySelector<HTMLSelectElement>('[data-cpu]')!;
const urlCpu = new URLSearchParams(location.search).get('cpu');
if (urlCpu) cpuSel.value = urlCpu;
const loadFrames = () => frames.forEach((f) => (f.src = `${f.dataset.src}&cpu=${cpuSel.value}`));
cpuSel.addEventListener('change', loadFrames);
loadFrames();
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
// [etiqueta, valor para mostrar, valor numérico para comparar (menor = mejor)]
const rows: [string, (m: Metrics) => string, ((m: Metrics) => number)?][] = [
  ['CLS · ¿se movió?', (m) => m.cls.toFixed(3), (m) => m.cls],
  ['Frames congelados (LoAF)', (m) => `${m.loafCount} · máx ${Math.round(m.loafMax)} ms`, (m) => m.loafMax],
  ['INP · ¿me hizo caso?', (m) => `${Math.round(m.inp)} ms`, (m) => m.inp],
  ['Nodos creados', (m) => m.nodesCreated.toLocaleString('es-GT'), (m) => m.nodesCreated],
  ['Parseo', (m) => `${m.parseMs.toFixed(1)} ms`, (m) => m.parseMs],
  ['Renders', (m) => String(m.renders), (m) => m.renders],
  ['Estado', (m) => m.status],
];
const factor = (bad: number, good: number) => {
  if (!(bad > 0)) return '';
  if (good < 0.005) return '<b class="x">≈ 0</b>';
  if (good <= 0) return '<b class="x">mucho mejor</b>';
  const x = bad / good;
  return x >= 1.5 ? `<b class="x">${x >= 10 ? Math.round(x) : x.toFixed(1)}× mejor</b>` : '';
};
const table = document.querySelector<HTMLTableElement>('[data-table]')!;
setInterval(() => {
  table.innerHTML = `<thead><tr><th>Métrica</th><th class="bad">Roto</th><th class="good">Arreglado</th></tr></thead><tbody>${rows
    .map(([k, f, num]) => {
      const [b, g] = latest;
      const x = b && g && num ? factor(num(b), num(g)) : '';
      return `<tr><th scope="row">${k}</th><td>${b ? f(b) : '—'}</td><td>${g ? f(g) : '—'} ${x}</td></tr>`;
    })
    .join('')}</tbody>`;
}, 500);
