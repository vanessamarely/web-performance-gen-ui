# Prompts para agentes con Chrome DevTools MCP

Configura el servidor en tu agente de código (Gemini CLI, Antigravity, Claude Code, Cursor…):

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--categoryExperimentalWebmcp=true"]
    }
  }
}
```

`--categoryExperimentalWebmcp=true` habilita `list_webmcp_tools` y `execute_webmcp_tool`, para que el agente use las tools que Mercadito registra. Las tools de performance (`performance_start_trace`, `performance_stop_trace`, `performance_analyze_insight`) y `emulate` vienen por defecto.

Levanta la demo con `npm run dev:demo` y usa estos prompts.

## 1. CLS: ¿qué se mueve mientras se genera?

> Usa chrome-devtools. Abre http://localhost:5174/?preset=broken, inicia un trace con performance_start_trace (sin recargar), escribe "regalo de café bajo Q200" en el buscador, pulsa Generar, espera a que el HUD diga "listo" y detén el trace. Analiza el insight CLSCulprits con performance_analyze_insight. Dime qué elementos se movieron y por qué, y propón cambios en demo/src/genui/render.ts y demo/src/styles.css para dejar el CLS < 0,1. Aplícalos, vuelve a medir con ?preset=fixed y compara.

## 2. INP: el botón "Ordenar por recomendación"

> Usa chrome-devtools con emulate { cpuThrottlingRate: 4 }. Abre http://localhost:5174/?q=regalo&preset=broken, espera a que termine de generar, inicia un trace, haz clic en "Ordenar por recomendación" y detén el trace. Analiza INPBreakdown: ¿cuánto es input delay, processing duration y presentation delay? Mueve rankProducts (demo/src/rank/rank.ts) a un Web Worker si no lo está y vuelve a medir.

## 3. Hilo bloqueado durante el stream

> Usa chrome-devtools con emulate { cpuThrottlingRate: 4 }. En http://localhost:5174/?preset=broken genera "textiles tejidos a mano" y, mientras se genera, haz clic en "♡ Guardar" de la primera tarjeta. Graba el trace y reporta los long animation frames > 50 ms con sus scripts. Explica por qué renderizar por evento SSE bloquea el clic y cómo lo arregla agrupar por frame (requestAnimationFrame) y ceder con scheduler.yield().

## 4. Soft navigations

> Usa chrome-devtools. En http://localhost:5174/?q=cafe&preset=fixed abre el detalle de un producto (clic en "Ver detalle"). Con evaluate_script lee las entradas soft-navigation e interaction-contentful-paint y dime la URL, el interactionId y el LCP de esa vista relativo a la interacción. ¿Qué cambiaría en mi RUM para reportarlo con web-vitals { reportSoftNavs: true }?

## 5. Con WebMCP

> Usa chrome-devtools. Abre http://localhost:5174/, lista las tools WebMCP de la página, ejecuta configurar_laboratorio { flag: "worker", on: false }, luego generar_resultados { prompt: "regalo de café" } y ordenar_por_recomendacion, y lee leer_metricas. Repite con worker: true y compara el INP.

## 6. Memoria (nodos que se quedan vivos)

> Usa chrome-devtools con --memoryDebugging=true. En Mercadito con ?preset=broken genera 5 búsquedas seguidas, toma un heap snapshot y busca nodos DOM desconectados (detached). Repite con ?preset=fixed y compara.

---

**Siempre verifica**: la IA propone, tú mides. Repite cada medición al menos 3 veces y compara medianas.
