# Verificar: medir antes y después

Medir es parte del trabajo, no un extra. Usa siempre las mismas condiciones en el "antes" y el
"después" (misma URL, mismo prompt o interacción, misma CPU), y repite cada medición al menos
3 veces: reporta la mediana.

## Con Chrome DevTools MCP (agentes de código)

Configuración (Gemini CLI, Claude Code, Antigravity, Cursor…):

```json
{ "mcpServers": { "chrome-devtools": { "command": "npx", "args": ["-y", "chrome-devtools-mcp@latest"] } } }
```

Mide **las dos fases**: la carga de la página (los esqueletos deben estar desde el primer
pintado) y la generación. Flujo típico para una UI que se genera en streaming:

1. `new_page` o `navigate_page` a la app (por ejemplo `http://localhost:5173`).
2. `emulate` con `{ "cpuThrottlingRate": 4 }` (y red lenta si importa la carga).
3. **CLS durante la generación:** `performance_start_trace` con `{ "reload": false, "autoStop": false }`
   → dispara la generación (`fill`/`click` con los uid de `take_snapshot`) → espera a que termine
   (`wait_for`) → `performance_stop_trace` → `performance_analyze_insight` con `CLSCulprits`.
4. **INP de una interacción:** mismo patrón, pero la acción es el clic que quieres medir;
   analiza `INPBreakdown` (input delay, processing duration, presentation delay).
5. **Carga inicial:** `performance_start_trace` con `{ "reload": true }` → `LCPBreakdown`.
6. Aplica el cambio y repite el mismo paso. Con `screencast_start`/`screencast_stop` puedes
   grabar un video del antes y el después.

Para leer métricas propias o confirmar valores, `evaluate_script` con un observador:

```js
() => new Promise((resolve) => {
  let cls = 0;
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) cls += e.value; }))
    .observe({ type: 'layout-shift', buffered: true });
  setTimeout(() => resolve({ cls }), 500);
})
```

Las rutas de archivo (traces, videos) deben estar dentro de la carpeta de trabajo que el agente
expone al servidor MCP.

## Sin agente: panel Performance de Chrome DevTools

1. DevTools → **Performance** → CPU **4×** (o un nivel de CPU calibrado).
2. **Live metrics** muestra LCP, INP y CLS locales al interactuar (y datos de campo de CrUX si
   la URL es pública).
3. ⏺ Grabar → reproduce la generación o el clic → Detener.
4. Revisa **Insights**: *Layout shift culprits*, *INP breakdown*, *LCP breakdown*; los frames
   rayados en **Main** son Long Animation Frames.
5. Clic derecho en un insight o evento → **Ask AI** para una explicación con el contexto del trace.
6. Rendering (⋮ → More tools) → **Layout Shift Regions** para ver los saltos en vivo.
7. More tools → **Performance monitor** para ver DOM Nodes y Layouts/sec mientras se genera.

## En campo (usuarios reales)

- RUM con web-vitals (ver `patrones.md` §8), segmentando navegación dura vs. suave.
- CrUX / PageSpeed Insights para el p75 público de la URL u origen. Las métricas con soft
  navigations en CrUX son experimentales: no cambian las Core Web Vitals oficiales.

## Umbrales (p75)

| Métrica | Bueno | Necesita mejorar | Malo |
|---|---|---|---|
| LCP | ≤ 2,5 s | ≤ 4 s | > 4 s |
| INP | ≤ 200 ms | ≤ 500 ms | > 500 ms |
| CLS | ≤ 0,1 | ≤ 0,25 | > 0,25 |
