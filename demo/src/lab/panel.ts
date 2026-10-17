// Panel del laboratorio (tecla D): interruptores roto/arreglado y, para cada villano,
// cómo verlo en DevTools, qué preguntarle a AI assistance y qué pedirle a tu agente (DevTools MCP).
import { FLAG_META, cpu, flags, onFlags, setAll, setFlag, type Flags } from './flags';
import { metrics } from './metrics';

const GUIDE: Record<keyof Flags, { devtools: string[]; ai: string; agent: string }> = {
  reserve: {
    devtools: [
      'Performance → ⏺ Grabar → genera → Detener.',
      'Pista "Layout shifts" e insight "Layout shift culprits": te dice qué elemento se movió y por qué (imagen sin dimensiones, contenido insertado).',
      'Rendering (⋮ → More tools) → "Layout Shift Regions" para verlo en vivo.',
    ],
    ai: '¿Qué elementos causan los layout shifts mientras se genera la UI y cómo reservo su espacio?',
    agent:
      'Con chrome-devtools: abre http://localhost:5174/?preset=broken, inicia performance_start_trace, escribe "regalo de café bajo Q200", genera y detén el trace. Usa performance_analyze_insight con CLSCulprits y propón cambios en demo/src/genui/render.ts y styles.css para dejar el CLS < 0,1. Vuelve a medir.',
  },
  incremental: {
    devtools: [
      'Performance → pestaña Bottom-up: ordena por Self time y busca JSON.parse / NaiveParser.push.',
      'Pista propia "Parser" (Mercadito · GenUI): cada bloque muestra cuántos caracteres recorrió.',
      'Compara con el interruptor encendido: el total de "parseo" del HUD baja de decenas de ms a ~1 ms.',
    ],
    ai: 'En este trace, ¿cuánto tiempo se va en JSON.parse durante el stream y por qué crece con cada chunk?',
    agent: 'Con chrome-devtools: graba un trace mientras Mercadito genera con ?preset=broken y dime el Self time total de JSON.parse y de NaiveParser.push. Explica por qué es O(n²) y compáralo con ?preset=fixed.',
  },
  frame: {
    devtools: [
      'Performance → pista Main: los frames largos aparecen como "Long animation frame" (rayados).',
      'Insight "INP breakdown" si haces clic en una tarjeta mientras se genera.',
      'Consola: new PerformanceObserver(l => console.table(l.getEntries())).observe({type: "long-animation-frame", buffered: true})',
    ],
    ai: '¿Qué scripts bloquean los frames mientras llega el stream y cómo agrupo el render por frame?',
    agent: 'Con chrome-devtools y emulate { cpuThrottlingRate: 4 }: abre Mercadito con ?preset=broken, genera y haz clic en "Guardar" de una tarjeta durante el stream. Reporta los LoAF > 50 ms y el INP; luego repite con el interruptor "Un render por frame" encendido.',
  },
  keyed: {
    devtools: [
      'More tools → Performance monitor: mira "DOM Nodes" y "Layouts / sec" mientras se genera.',
      'Elements: los nodos que parpadean en morado son los que se recrean.',
      'Haz clic en "Guardar" durante el stream: con innerHTML el botón se recrea y el clic se pierde.',
    ],
    ai: '¿Por qué se crean tantos nodos DOM nuevos mientras llega el stream y cómo los reutilizo?',
    agent: 'Con chrome-devtools: en Mercadito ?preset=broken ejecuta evaluate_script para contar nodos creados con un MutationObserver durante una generación; repite con claves estables y compara. Sugiere el cambio mínimo en render.ts.',
  },
  worker: {
    devtools: [
      'CPU: 4× slowdown (o un nivel de CPU calibrado) en Performance.',
      'Graba y haz clic en "Ordenar por recomendación": pista Interactions + insight "INP breakdown" (processing duration).',
      'Clic derecho en la interacción → Ask AI.',
    ],
    ai: '¿Por qué esta interacción tarda tanto en pintar y qué parte es processing duration?',
    agent: 'Con chrome-devtools: emulate { cpuThrottlingRate: 4 }, abre Mercadito, genera resultados, inicia un trace, haz click en "Ordenar por recomendación" y analiza INPBreakdown. Mueve rankProducts a un Web Worker y vuelve a medir el INP.',
  },
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function mountLab(panel: HTMLElement, toggle: HTMLButtonElement, onChange: () => void) {
  const render = () => {
    panel.innerHTML = `<header><h2>Laboratorio</h2><button type="button" class="icon" data-close aria-label="Cerrar laboratorio">✕</button></header>
      <p class="hint">Cada interruptor arregla un villano. Cambia y vuelve a <b>Generar</b> para medir.</p>
      <div class="presets"><button type="button" data-all="0">Todo roto</button><button type="button" data-all="1">Todo arreglado</button></div>
      <label class="cpu">CPU simulada <select data-cpu>${[1, 4, 6]
        .map((f) => `<option value="${f}" ${cpu.factor === f ? 'selected' : ''}>${f}×${f === 1 ? ' (sin simular)' : ''}</option>`)
        .join('')}</select><small>Mejor: DevTools → Performance → CPU 4× o nivel calibrado.</small></label>
      <ol class="flags">${FLAG_META.map(
        (f) => `<li>
          <div class="flag-row">
            <button type="button" role="switch" aria-checked="${flags[f.key]}" data-flag="${f.key}"><span class="knob"></span></button>
            <div><b>${f.label}</b> <small>${f.metric}</small><p>${esc(flags[f.key] ? f.fixed : f.broken)}</p></div>
          </div>
          <details><summary>Cómo verlo en DevTools</summary>
            <ol>${GUIDE[f.key].devtools.map((d) => `<li>${esc(d)}</li>`).join('')}</ol>
            <div class="copy"><span>AI assistance</span><q>${esc(GUIDE[f.key].ai)}</q><button type="button" data-copy="${esc(GUIDE[f.key].ai)}">Copiar</button></div>
            <div class="copy"><span>Agente · DevTools MCP</span><q>${esc(GUIDE[f.key].agent)}</q><button type="button" data-copy="${esc(GUIDE[f.key].agent)}">Copiar</button></div>
          </details>
        </li>`,
      ).join('')}</ol>
      <div class="lab-foot">
        <button type="button" data-copy-metrics>Copiar métricas (JSON)</button>
        <a href="/compare.html" target="_blank" rel="noreferrer">Roto vs. arreglado lado a lado ↗</a>
      </div>`;
  };
  render();
  onFlags(render);
  panel.addEventListener('change', (e) => {
    const sel = (e.target as HTMLElement).closest<HTMLSelectElement>('[data-cpu]');
    if (sel) cpu.factor = Number(sel.value);
  });
  panel.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const sw = t.closest<HTMLElement>('[data-flag]');
    if (sw) {
      setFlag(sw.dataset.flag as keyof Flags, sw.getAttribute('aria-checked') !== 'true');
      onChange();
    }
    const all = t.closest<HTMLElement>('[data-all]');
    if (all) {
      setAll(all.dataset.all === '1');
      onChange();
    }
    const copy = t.closest<HTMLElement>('[data-copy]');
    if (copy) {
      await navigator.clipboard?.writeText(copy.dataset.copy!).catch(() => undefined);
      copy.textContent = 'Copiado ✓';
    }
    if (t.closest('[data-copy-metrics]')) await navigator.clipboard?.writeText(JSON.stringify({ flags, metrics }, null, 2)).catch(() => undefined);
    if (t.closest('[data-close]')) setOpen(false);
  });
  const setOpen = (open: boolean) => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setOpen(Boolean(panel.hidden)));
  addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key.toLowerCase() === 'd' && !e.metaKey && !e.ctrlKey) setOpen(Boolean(panel.hidden));
    if (e.key === 'Escape') setOpen(false);
  });
  return setOpen;
}
