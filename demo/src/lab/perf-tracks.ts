// Pistas propias en el panel Performance de Chrome DevTools (Extensibility API):
// stream, parser, render y ranking aparecen como bloques en "Mercadito · GenUI".
// Le dan contexto a AI assistance y a los agentes con DevTools MCP al leer el trace.
type DevToolsColor = 'primary' | 'primary-light' | 'primary-dark' | 'secondary' | 'secondary-light' | 'secondary-dark' | 'tertiary' | 'tertiary-light' | 'tertiary-dark' | 'error' | 'warning';

const GROUP = 'Mercadito · GenUI';

export function trackSpan(track: string, name: string, start: number, end = performance.now(), color: DevToolsColor = 'primary', properties: [string, string][] = []) {
  try {
    performance.measure(`${track}: ${name}`, {
      start,
      end,
      detail: { devtools: { dataType: 'track-entry', track, trackGroup: GROUP, color, tooltipText: name, properties } },
    });
  } catch {
    /* navegadores sin soporte para `detail` */
  }
}

export function trackMarker(name: string, color: DevToolsColor = 'secondary') {
  try {
    performance.mark(name, { detail: { devtools: { dataType: 'marker', color, tooltipText: name } } });
  } catch {
    /* noop */
  }
}

// Las medidas se acumulan en el buffer de User Timing: lo limpiamos de vez en cuando.
setInterval(() => {
  if (performance.getEntriesByType('measure').length > 2000) performance.clearMeasures();
}, 10_000);
