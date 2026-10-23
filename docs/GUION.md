# Guion · Web performance en la era de la UI generativa (30 min, 10 de demo)

**Hilo narrativo**: la IA ya no responde texto, responde interfaces… y cada token es trabajo en el hilo principal. Primero aprendemos a **medir con DevTools agéntico**, luego arreglamos los cuatro frentes del abstract (renderizado, streaming, reciclaje del DOM y estado) y lo comprobamos en vivo en **Mercadito**, con el muro de **quitapenas** como cierre guatemalteco.

**Antes de empezar**
- Deck en el proyector: `/?presenter=1` → menú → **Presentar en vivo (GitHub)** (badge rojo **EN VIVO**). En ensayo: `/?presenter&local`.
- En tu laptop: **P** abre la consola (`/presenter/`): guion, siguiente slide, cronómetro (**Iniciar** al arrancar) y contadores.
- Pestaña de la demo: `http://localhost:5174/?preset=broken&lab` con DevTools abierto (Performance + AI assistance) y CPU **4×** o un nivel calibrado.
- Pestaña 2: `/compare.html`. Pestaña 3: terminal con tu agente y `chrome-devtools-mcp` configurado ([AGENTES.md](AGENTES.md)).
- Plan B sin red: la demo no necesita red (motor simulado). Si no puedes usar DevTools, `?cpu=4` simula un equipo lento.
- Menú → **Vaciar sesión en vivo…** antes de empezar (escribe VACIAR).

| # | Slide | Min | Qué decir / hacer |
|---|---|---|---|
| 1 | Portada | 0:00 | "La IA ya no responde texto, responde interfaces." |
| 2 | Únete | 0:40 | QR. "Si están escribiendo una nota, su celular **no cambia de slide** hasta que guarden. Al final descargan su memoria con su quitapenas." |
| 3 | Quién soy | 1:30 | 20 s. |
| 4 | Cada token cuesta | 2:00 | La tesis. |
| 5 | ¿Qué es web performance? | 2:40 | Para quien no viene de performance: "¿a quién le ha saltado un botón justo cuando iba a tocarlo?". Tres preguntas = tres métricas (¿ya cargó? LCP · ¿me hizo caso? INP · ¿se quedó quieto? CLS). Laboratorio vs. campo y p75. Los números van en el siguiente slide. |
| 6 | Métricas 2026 | 3:30 | LCP/INP/CLS + LoAF. **Soft navs**: API en Chrome 151, CrUX experimental desde octubre 2026, meta mayo 2027. |
| 7 | Dónde se rompe | 4:30 | Los 5 villanos = los 5 interruptores de la demo. |
| 8 | 01 Medir con agentes | 5:15 | — |
| 9 | Performance panel | 5:30 | Live metrics + CrUX, Insights (también por soft nav), CPU calibrada, pistas propias. |
| 10 | AI assistance | 6:30 | Ask AI sobre un insight; preguntas abiertas que graban el trace solas. |
| 11 | DevTools for agents | 7:30 | MCP + CLI estables. "Mi agente mide, propone y **vuelve a medir**." |
| 12 | Pistas propias | 8:30 | `performance.measure` + `detail.devtools`. |
| 13 | 02 Renderizado | 9:15 | — |
| 14 | Datos, no HTML | 9:30 | Catálogo + schema, ordenado para el streaming. |
| 15 | Reserva el espacio | 10:15 | Slots, aspect-ratio, content-visibility solo al terminar. |
| 16 | 03 Streaming | 11:15 | — |
| 17 | Parsea una sola vez | 11:30 | O(n²) vs O(n). |
| 18 | Un render por frame | 12:30 | rAF + `scheduler.yield()` + observer de LoAF. |
| 19 | Declarative Partial Updates | 13:30 | `<template for>` y `streamHTMLUnsafe()` — experimental. |
| 20 | 04 Reciclar el DOM | 14:30 | — |
| 21 | Claves estables | 14:45 | ~23.500 vs ~340 nodos. Dato curioso: si recreas TODA la vista con innerHTML, el CLS ni lo ve (nodos nuevos)… pero tu usuario sí. |
| 22 | Listas largas | 15:45 | Pool de nodos, content-visibility, memoria con el MCP. |
| 23 | 05 Estado | 16:30 | — |
| 24 | Estado fuera del render | 16:45 | Store por stream, suscripción por clave, lo derivado en un Worker. |
| 25 | Soft navigations | 17:45 | PerformanceObserver + `reportSoftNavs`. |
| 26 | **Demo · Mercadito** | 18:30 | Ver guion de la demo ↓ (10 min). |
| 27 | Receta | 28:30 | Reproduce → graba → pregunta a la IA → delega al agente → confirma en campo. |
| 28 | Muro de quitapenas | 29:00 | Lee 2–3 penas. Clic para ocultar (moderación). |
| 29 | Checklist | 29:20 | "Está en su memoria descargable." |
| 30 | ¡Maltiox! | 29:45 | "Gracias en k'iche'. Descarguen su memoria." Preguntas. |

## Demo (10 min)

1. **`/compare.html`** (1 min): "Mismo stream a los dos". Señala nodos creados, renders, parseo y CLS en la tabla.
2. **Mercadito roto + DevTools** (3 min): Performance → Grabar → genera *"regalo de café bajo Q200"* → Detener. Muestra la pista *Mercadito · GenUI*, el insight de **layout shift** → clic derecho → **Ask AI**. Enciende **Reservar espacio** y repite: CLS ≈ 0.
3. **Hilo bloqueado** (2 min): con CPU 4×, haz clic en "♡ Guardar" mientras genera. Enciende **Parser incremental**, **Un render por frame** y **Claves estables**: el HUD baja de cientos de renders y miles de nodos a una decena y unos cientos.
4. **INP** (2 min): "Ordenar por recomendación" en el hilo principal → INP rojo; *INP breakdown*. Enciende **Ranking en un Worker**: feedback inmediato y View Transition.
5. **Soft navigation + agente** (2 min): abre un producto → el HUD cuenta la soft nav y su LCP. En la terminal, pega el prompt 2 de [AGENTES.md](AGENTES.md) y muestra cómo el agente graba el trace y analiza el insight.

## Si algo falla

- **Sin red**: deck, consola y app de asistentes siguen en modo local; la demo no usa red.
- **La consola no ve el deck**: deben estar en el mismo navegador y con los mismos `?local` / `?session`.
- **Los celulares no siguen el deck**: toca el aviso amarillo para iniciar sesión con GitHub.
