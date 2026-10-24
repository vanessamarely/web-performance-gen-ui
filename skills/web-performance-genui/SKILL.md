---
name: web-performance-genui
description: Prácticas de web performance para interfaces que se generan o actualizan en streaming (UI generativa, respuestas de LLM, chats con componentes, dashboards en vivo, SPAs). Úsalo SIEMPRE que construyas, revises u optimices una web app que pinte contenido que llega por partes (tokens, SSE, fetch en streaming, JSON parcial), que muestre listas largas o que cambie de vista sin recargar, y también cuando el usuario mencione CLS, INP, LCP, LoAF, layout shift, "se congela", "salta el botón", re-renders, Core Web Vitals, soft navigations o medir con Chrome DevTools, aunque no diga "performance". Incluye patrones de código y cómo verificar con Chrome DevTools MCP.
---

# Web performance para UI generativa

Cuando una interfaz se genera mientras llega la respuesta de un modelo, cada token es trabajo
para el hilo principal: parsear, actualizar estado, crear nodos, calcular layout y pintar. El
modelo puede ser rápido y la experiencia lenta. Este skill te ayuda a construir esa UI para que
**no salte (CLS), responda al instante (INP) y muestre lo importante pronto (LCP)**, y a
**demostrarlo con mediciones**, no con suposiciones.

Metas (percentil 75 de usuarios reales): **LCP ≤ 2,5 s · INP ≤ 200 ms · CLS ≤ 0,1**.
El p75 importa: tres de cada cuatro visitas deben estar en "bueno", no solo tu laptop.

## Flujo de trabajo

1. **Mide primero.** Antes de cambiar código, obtén una línea base (laboratorio). Si tienes
   Chrome DevTools MCP, úsalo; si no, explica cómo medir con el panel Performance. Detalle en
   `references/verificar.md`.
2. **Diseña el contrato antes que la UI.** El modelo devuelve datos de un catálogo cerrado de
   componentes validados por un schema, no HTML libre. Ordena el schema para el streaming: lo
   que va arriba del pliegue primero.
3. **Aplica las 10 reglas** (abajo). Para el código de cada una lee `references/patrones.md`;
   adapta al framework del proyecto (React, Angular, Vue, Svelte o vanilla).
4. **Vuelve a medir** con las mismas condiciones (CPU 4× o nivel calibrado, mismo prompt) y
   reporta antes → después. Si una métrica no mejoró, dilo y explica por qué.

## Las 10 reglas

1. **Mide primero, en un equipo lento.** CPU 4× (o calibrada) y red lenta; laboratorio para
   encontrar la causa, campo (CrUX, web-vitals) para confirmar.
2. **Datos, no HTML.** Catálogo de componentes + JSON Schema (`responseConstraint` en la Prompt
   API, `responseJsonSchema` en Gemini, equivalentes en otros proveedores). Evita `innerHTML`
   con texto del modelo: inseguro y caro.
3. **Reserva el espacio desde el primer pintado.** Cada slot nace con su altura final
   (`min-height`, `aspect-ratio`, `line-clamp`, `contain`) y esa reserva existe en el HTML/CSS
   inicial: si creas los esqueletos con JavaScript después de cargar, ese cambio también es un
   layout shift. Nada se inserta encima de lo que el usuario está leyendo.
   `content-visibility: auto` solo para secciones que ya terminaron.
4. **Parsea cada carácter una sola vez.** Nunca `JSON.parse(bufferCompleto)` en cada token
   (O(n²)). Usa un parser incremental o pide JSON por líneas (NDJSON) y procesa ítems completos.
5. **Un render por frame.** Agrupa los cambios y pinta con `requestAnimationFrame`;
   70 tokens/s no son 70 renders/s. Las lecturas de red llegan en ráfagas: no renderices por evento.
6. **Cede el hilo.** Trocea trabajo largo con `scheduler.yield()` (con respaldo) y manda lo
   pesado (ranking, filtros, embeddings) a un Web Worker. Da feedback inmediato al clic.
7. **Claves estables.** Un nodo por id (no por posición); actualiza solo el texto que cambió;
   anima reordenamientos con View Transitions. Conservas foco, hover e imágenes decodificadas.
8. **Recicla listas largas.** Virtualiza (pool de nodos): el tamaño del DOM depende de la
   pantalla, no de la respuesta del modelo. Vigila la memoria en sesiones largas.
9. **Estado fuera del render.** Un store por stream (borrador vs. confirmado, lo anterior visible
   hasta su reemplazo), suscripciones finas por clave, lo derivado lo calcula el código.
10. **Mide las soft navigations.** Si la UI cambia de vista y de URL sin recargar, reporta LCP,
    INP y CLS por vista (`soft-navigation`, `interaction-contentful-paint`, o web-vitals con
    `reportSoftNavs`). Segmenta navegaciones duras y suaves en tu RUM.

Accesibilidad mientras genera: `aria-busy` en la región que cambia, anuncios cortos y espaciados
(`role="status"`), nunca mover el foco por tu cuenta, respetar `prefers-reduced-motion`.

## Antipatrones que debes señalar si los ves

- `el.innerHTML = render(estadoCompleto)` en cada token o chunk.
- `JSON.parse` de todo el buffer acumulado (o librerías de "partial JSON" que lo hacen) en cada token.
- Imágenes sin `width`/`height` o sin `aspect-ratio` dentro de componentes generados.
- Esqueletos o contenedores que se crean con JS después del primer pintado y cambian la altura de la página.
- Banners, avisos o "ofertas" que llegan al final del stream y se insertan arriba.
- `setState`/`signal.set` por token sin agrupar; `startTransition` usado como sustituto de agrupar.
- Cálculo pesado síncrono dentro del handler de un clic.
- Keys por índice (`key={i}`) en listas que se reordenan o crecen.
- Una SPA que solo mide la carga inicial.

Nota útil: si se recrea **toda** la vista con `innerHTML`, el CLS puede salir en 0 porque los
nodos son nuevos, aunque el usuario sí vea saltos. Mira las métricas **y** el comportamiento.

## Cómo reportar

Cierra siempre con este formato, para que la persona vea evidencia:

```
## Performance
Condiciones: <CPU, red, prompt o interacción usada>
| Métrica | Antes | Después |
|---|---|---|
| CLS | … | … |
| INP (interacción: …) | … | … |
| LCP | … | … |
Cambios: <regla aplicada → archivo>
Pendiente / riesgos: <lo que no se pudo medir o mejorar>
```

Si no pudiste medir (no hay navegador ni DevTools MCP), dilo explícitamente y deja los pasos
exactos para que la persona mida; no inventes números.
