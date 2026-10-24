# Guion · Web performance en la era de la UI generativa (30 min, 8–10 de demo)

Resumen rápido para tener a la vista. El texto completo de cada slide está en [SPEECH.md](SPEECH.md).

**Hilo narrativo**: la IA ya no responde texto, responde interfaces… y cada token es trabajo en el hilo principal. Primero aprendemos a **medir con DevTools agéntico**, luego arreglamos los cuatro frentes del abstract (renderizado, streaming, reciclaje del DOM y estado) y lo comprobamos en vivo en **Mercadito**, con el muro de **quitapenas** como cierre guatemalteco.

**Antes de empezar**
- Deck en el proyector: `https://web-performance-gen-ui-slides.web.app/?presenter=1&screen=event` (pantalla 1680×672) → menú → **Presentar en vivo (GitHub)** (badge rojo **EN VIVO**). En ensayo: `/?presenter&local`.
- En tu laptop: **P** abre la consola (`/presenter/`): guion, siguiente slide, cronómetro (**Iniciar** al arrancar) y contadores.
- Pestaña de la demo: `https://web-performance-gen-ui-demo.web.app/?preset=broken&lab` con DevTools abierto (Performance + AI assistance) y CPU **4×** o un nivel calibrado.
- Pestaña 2: `https://web-performance-gen-ui-demo.web.app/compare` (CPU 4× por defecto). Pestaña 3: terminal con tu agente y `chrome-devtools-mcp` configurado ([AGENTES.md](AGENTES.md)).
- Plan B sin red: la demo no necesita red (motor simulado). Si no puedes usar DevTools, `?cpu=4` simula un equipo lento.
- **Slides con código:** modo foco; avanza solo, o usa **↓ / ↑** o un clic. **← / →** cambian de slide.
- Menú → **Vaciar sesión en vivo…** antes de empezar (escribe VACIAR): borra asistentes, quitapenas de prueba, reacciones y preguntas.
- El QR y la URL de asistentes apuntan siempre al sitio publicado (`…-slides.web.app/live`), aunque abras el deck desde localhost.

| # | Slide | Min | Qué decir / hacer |
|---|---|---|---|
| 1 | Portada | 0:00 | "La IA ya no responde texto, responde interfaces." |
| 2 | Únete | 0:40 | QR. "Si están escribiendo una nota, su celular **no cambia de slide** hasta que guarden. Creen su **quitapenas** y déjenle su pena de performance. Al final descargan su memoria **en PDF** con un toque." |
| 3 | Quién soy | 1:30 | 20 s. |
| 4 | Cada token cuesta | 2:00 | La tesis. |
| 5 | ¿Qué es web performance? | 2:40 | Para quien no viene de performance: "¿a quién le ha saltado un botón justo cuando iba a tocarlo?". Tres preguntas = tres métricas (¿ya cargó? LCP · ¿me hizo caso? INP · ¿se quedó quieto? CLS). Laboratorio vs. campo y p75. Los números van en el siguiente slide. |
| 6 | Métricas 2026 | 3:30 | LCP/INP/CLS + LoAF. **Soft navs**: API en Chrome 151, CrUX experimental desde octubre 2026 (sin fecha confirmada para ser estables). |
| 7 | Dónde se rompe | 4:30 | Los 5 villanos = los 5 interruptores de la demo. |
| 8 | 01 Medir con agentes | 5:15 | Quitapenas: *"Mide en un celular lento, no solo en tu laptop."* |
| 9 | Performance panel | 5:30 | Live metrics + CrUX, Insights (también por soft nav), CPU calibrada. Explica el mini trace con su leyenda: frame lento (LoAF), layout shift, tus pistas y soft nav = causa y efecto juntos. |
| 10 | AI assistance | 6:30 | Ask AI sobre un insight; preguntas abiertas que graban el trace solas. |
| 11 | DevTools for agents | 7:30 | MCP + CLI estables. "Mi agente mide, propone y **vuelve a medir**." El video es real: INP 1.162 ms (ranking en el hilo principal) → 16 ms (Worker), con CPU 4×. |
| 12 | Pistas propias | 8:30 | Modo foco en 5 pasos. Dónde va: `demo/src/lab/perf-tracks.ts`, llamado desde el controlador del stream. `performance.measure` + `detail.devtools`. |
| 13 | 02 Renderizado | 9:15 | Quitapenas: *"Dale a cada componente su espacio antes de que llegue."* |
| 14 | Datos, no HTML | 9:30 | Catálogo + schema (`$defs`), ordenado para el streaming: el hero primero para el LCP. Modo foco. |
| 15 | Reserva el espacio | 10:15 | Slots, aspect-ratio, line-clamp; content-visibility solo al terminar. Modo foco. |
| 16 | 03 Streaming | 11:15 | Quitapenas: *"70 tokens por segundo no son 70 renders: pinta una vez por frame."* |
| 17 | Parsea una sola vez | 11:30 | Notación O con el libro: releer desde la página 1 (O(n²), 6,5 M caracteres) vs. separador (O(n), 5 mil). Código real de la demo en modo foco; se comprueba con el HUD y la pista Parser. |
| 18 | Un render por frame | 12:30 | rAF + `scheduler.yield()` + observer de LoAF. En la demo: 210 → 8 renders. Modo foco. |
| 19 | Declarative Partial Updates | 13:30 | `<template for>` (Chrome 150) y `streamHTMLUnsafe()` (con flag) — experimental. Modo foco. |
| 20 | 04 Reciclar el DOM | 14:30 | Quitapenas: *"No tires el DOM: recíclalo."* |
| 21 | Claves estables | 14:45 | ~23.500 vs ~340 nodos. Dato curioso: si recreas TODA la vista con innerHTML, el CLS ni lo ve (nodos nuevos)… pero tu usuario sí. |
| 22 | Listas largas | 15:45 | Pool de nodos, content-visibility, memoria con el MCP. |
| 23 | 05 Estado | 16:30 | Quitapenas: *"La IA decide qué mostrar; el código calcula el resto."* |
| 24 | Estado fuera del render | 16:45 | Store por stream, suscripción por clave, lo derivado en un Worker. |
| 25 | Soft navigations | 17:45 | Interacción + URL + pintura. `soft-navigation` + `interaction-contentful-paint` (por `interactionId`) y web-vitals `reportSoftNavs: true`. Modo foco. |
| 26 | **Demo · Mercadito** | 18:30 | Ver guion de la demo ↓ (8–10 min). Plan B: el clip del slide se reproduce sin red. |
| 27 | Receta | 28:30 | Reproduce → graba → pregunta a la IA → delega al agente → confirma en campo. |
| 28 | Muro de quitapenas | 29:00 | Lee 2–3 penas y las más repetidas. Muestra los 48 más recientes. Clic en uno para ocultarlo (moderación). |
| 29 | Checklist | 29:20 | Las 10 reglas: "están en su memoria en PDF". Y el **skill** para su agente: `skills/web-performance-genui` en el repo (también en el celular y en la memoria). |
| 30 | ¡Maltiox! | 29:45 | "Gracias en k'iche'. Descarguen su memoria: botón *Descargar memoria (PDF)*." Menciona vanessamarely.dev. Preguntas (tecla **Q**). |

## Demo (10 min)

Todo con un clic: botones de peticiones bajo el buscador y, en el laboratorio (tecla **D**), el **Guion de la demo** (generar, guardar, ordenar, abrir producto, copiar prompt del agente).

1. **`/compare`** (1 min, CPU 4× por defecto): "Mismo stream a los dos". Señala los **recuadros rojos** (saltos) y la tabla con cuántas veces mejor: ~66× menos nodos, ~12× menos renders, CLS ~0,17 → ~0,02.
2. **Mercadito roto + DevTools** (3 min): Performance → Grabar → genera *"regalo de café bajo Q200"* → Detener. Muestra la pista *Mercadito · GenUI*, el insight de **layout shift** → clic derecho → **Ask AI**. Enciende **Reservar espacio** y repite: CLS ≈ 0.
3. **Hilo bloqueado** (2 min): con CPU 4×, haz clic en "♡ Guardar" mientras genera (o el paso 2 del Guion de la demo). Si aparece el aviso amarillo **"La página se congeló X ms"**, léelo: es un LoAF. Enciende **Parser incremental**, **Un render por frame** y **Claves estables**: el HUD baja de cientos de renders y miles de nodos a una decena y unos cientos.
4. **INP** (2 min): "Ordenar por recomendación" en el hilo principal → INP rojo (con CPU 4× ≈ 1.160 ms); *INP breakdown*: casi todo es processing duration. Enciende **Ranking en un Worker**: feedback inmediato y View Transition.
5. **Soft navigation + agente** (2 min): abre un producto → el HUD cuenta la soft nav y su LCP. En la terminal, pega el prompt 2 de [AGENTES.md](AGENTES.md) y muestra cómo el agente graba el trace y analiza el insight.

## Si algo falla

- **Sin red**: deck, consola y app de asistentes siguen en modo local; la demo no usa red.
- **La consola no ve el deck**: deben estar en el mismo navegador y con los mismos `?local` / `?session`.
- **Los celulares no siguen el deck**: toca el aviso amarillo para iniciar sesión con GitHub.
- **Un quitapenas no aparece en el muro**: revisa que el deck y el celular estén en la misma sesión (sin `?session` o la misma).
- **El PDF de la memoria no se genera**: los botones **HTML** y **Markdown** siguen disponibles.
