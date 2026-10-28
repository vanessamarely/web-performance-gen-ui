# Web performance en la era de la UI generativa

Charla técnica para **DevFest Guatemala 2026** (track Web) de [Vanessa Aristizabal](https://github.com/vanessamarely).

> **Optimizing Web Performance in the Era of Generative UI.** Dynamic, AI-generated interfaces bring unprecedented personalization, but they also introduce massive performance challenges from layout shifts and high client-side CPU usage to rendering latency. How do we keep generative UI fast, fluid, and accessible? This talk delves into advanced rendering strategies, DOM recycling, streaming HTML/JSON patterns, and state management techniques designed to deliver instant, high-performance generative UI experiences at scale.

30 minutos de charla, de los cuales 10 son demo. Misma estructura y paleta que [fluid-generative-ui](https://github.com/vanessamarely/fluid-generative-ui).

## En vivo

| Qué | URL publicada |
|---|---|
| **Deck** (proyector, pantalla del evento 1680×672) | https://web-performance-gen-ui-slides.web.app/?presenter=1&screen=event |
| **App de asistentes** (celular: notas, quitapenas, memoria en PDF) | https://web-performance-gen-ui-slides.web.app/live/ |
| **Consola de la presentadora** | https://web-performance-gen-ui-slides.web.app/presenter/ |
| **Demo Mercadito** | https://web-performance-gen-ui-demo.web.app |
| **Demo roto vs. arreglado** (CPU 4×) | https://web-performance-gen-ui-demo.web.app/compare |
| **Demo con el laboratorio abierto** | https://web-performance-gen-ui-demo.web.app/?preset=broken&lab |

| Carpeta | Qué es | URL publicada | URL local |
|---|---|---|---|
| [`slides/`](slides) | **Deck interactivo** (30 slides) + **consola de la presentadora** en `/presenter/` + **app de asistentes** en `/live/` | https://web-performance-gen-ui-slides.web.app | http://localhost:5173 |
| [`demo/`](demo) | **Mercadito**: asistente de compras con UI generativa en streaming y **laboratorio de performance** (5 interruptores roto ↔ arreglado) | https://web-performance-gen-ui-demo.web.app | http://localhost:5174 |

## Las tres versiones del deck

| Versión | URL | Para qué |
|---|---|---|
| Proyector | [`/?presenter=1`](https://web-performance-gen-ui-slides.web.app/?presenter=1) (agrega `&screen=event` en la pantalla de 1680×672) | El deck. Con sesión de presentadora publica el slide actual a los celulares. |
| Consola | [`/presenter/`](https://web-performance-gen-ui-slides.web.app/presenter/) (tecla **P** desde el deck) | En tu laptop: guion de cada slide, siguiente slide, cronómetro con ritmo vs. el guion, contadores y controles ←/→. Se comunica con el deck por `BroadcastChannel` (sin red). |
| Asistentes | [`/live/`](https://web-performance-gen-ui-slides.web.app/live/) (QR en el slide 2) | En el celular: el slide actual con sus ideas clave, notas, reacciones, preguntas, **Crea tu quitapenas** y la **memoria** descargable. |

### Notas que no se mueven mientras escribes

En `/live/`, si la persona está escribiendo una nota (texto sin guardar), **su pantalla se queda en ese slide** aunque la presentadora avance. Aparece un aviso fijo: *"La charla avanzó a … Tu pantalla te espera hasta que guardes tu nota"* con **Guardar y seguir en vivo** o **Descartar cambios**. Al guardar salta al slide en vivo. Los borradores sobreviven a recargas; **Ctrl/⌘ + Enter** guarda.

### Crea tu quitapenas

Avatar inspirado en las **muñecas quitapenas** de Guatemala (le cuentas tu pena antes de dormir, lo pones bajo la almohada y al despertar la pena ya no está). Se elige traje (Lago de Atitlán, Chichicastenango, Quetzal, Maíz, Jacaranda), patrón del huipil, cabello y tocado (trenzas, tocoyal, moño, sombrero de Sololá…), piel, accesorio (canasta, laptop, quetzal, café, barrilete de Sumpango) y expresión, más una **pena de performance** de una lista cerrada (*"Mi INP pasa de 500 ms"*…).

- Se dibuja en el dispositivo (SVG) y se descarga como **PNG 1080×1350** ([`quitapenas.ts`](slides/src/shared/quitapenas.ts)).
- **Publicar en el muro** envía solo las opciones elegidas (pocos bytes); el deck vuelve a dibujarlo. El muro (slide 28) muestra las penas más comunes y la presentadora puede ocultar cualquiera con un clic.

### La memoria de la charla

En el último slide (y en **Menú → Mis notas y memoria**) cada asistente descarga su memoria ([`keepsake.ts`](slides/src/shared/keepsake.ts)):

- **PDF con un toque** (botón principal), generado en el celular con [pdf-lib](https://pdf-lib.js.org) (MIT, gratis), que se carga solo al pulsar el botón: el resumen de todos los slides, las notas, el quitapenas y las 10 reglas.
- **HTML autocontenido** (se ve sin internet): el resumen de **todos** los slides aunque haya llegado tarde, sus notas resaltadas en cada slide, su quitapenas con su pena y la leyenda, y las 10 reglas.
- **Markdown** con lo mismo, y **Compartir** (Web Share con el archivo).
- Las notas **nunca salen del celular**: no hay colección para ellas en Firestore.

El contenido de cada slide (título, ideas clave, código y guion) vive en un solo lugar: [`content.ts`](slides/src/shared/content.ts). El deck solo transmite `{ index, id }` (~200 bytes); cambiar de slide no descarga nada más.

## Mercadito: la demo

Un asistente de compras para el mercado de artesanías, café y cacao de Guatemala (productos y precios **ficticios**). Escribes *"regalo de café bajo Q200"* y la página se genera en streaming a partir de un catálogo cerrado + JSON Schema. Abrir un producto (`/p/:id`) o hacer otra búsqueda son **soft navigations**.

**Laboratorio** (tecla **D**): cada interruptor rompe o arregla un villano, con su guía de DevTools, una pregunta para **AI assistance** y un prompt para tu **agente con Chrome DevTools MCP** (botón Copiar).

| Interruptor | Roto | Arreglado | Se ve en |
|---|---|---|---|
| Reservar espacio | Sin alturas, imágenes sin dimensiones, banner tardío arriba | Slots con altura final, `aspect-ratio`, banner reservado | CLS · insight *Layout shift culprits* |
| Parser incremental | `JSON.parse` del buffer completo en cada chunk (O(n²)) | Cada carácter una vez (O(n)) — [`parsers.ts`](demo/src/genui/parsers.ts) | Bottom-up · pista *Parser* |
| Un render por frame | Render síncrono por evento SSE | `requestAnimationFrame` + `scheduler.yield()` | LoAF · INP |
| Claves estables | `innerHTML` por sección en cada update | Nodo por id, slots reciclados, View Transitions — [`render.ts`](demo/src/genui/render.ts) | Performance monitor · nodos creados |
| Ranking en un Worker | "Ordenar por recomendación" en el hilo principal | Web Worker + feedback inmediato | INP · *INP breakdown* |

Resultados con el mismo stream (`/compare.html`): CLS 0,106 → 0,012, **23.546 → 338 nodos creados**, parseo 17 ms → 1,2 ms, 210 → 8 renders.

- **Saltos visibles**: cada layout shift se marca en rojo sobre el elemento que se movió, y los frames congelados (> 100 ms) muestran un aviso. `/compare` usa **CPU 4×** por defecto y muestra cuántas veces mejor sale la versión arreglada.
- **HUD** fijo: CLS, INP, LoAF (con script), nodos creados, tamaño del DOM, ms de parseo, renders, soft navs y el LCP de la soft navigation (Chrome 151+).
- **Pistas propias** en Performance (`Mercadito · GenUI`: Stream, Parser, Render, Ranking) con la Extensibility API — [`perf-tracks.ts`](demo/src/lab/perf-tracks.ts).
- **WebMCP**: 5 tools (`generar_resultados`, `abrir_producto`, `ordenar_por_recomendacion`, `configurar_laboratorio`, `leer_metricas`) si el navegador trae `navigator.modelContext`; si no, quedan en `window.mercadito`.
- **Parámetros**: `?preset=broken|fixed`, `?lab`, `?cpu=4` (CPU simulada, plan B al throttling de DevTools), `?tps=220` (tokens/s), `?work=2` (más trabajo en el ranking), `?engine=nano` (Gemini Nano si está disponible; por defecto, simulado determinista).

Prompts listos para tu agente: [docs/AGENTES.md](docs/AGENTES.md).

### Plan B: clips y traces grabados

Si la demo en vivo falla, el slide **Demo · Mercadito** reproduce un clip local (sin red): el `<video data-src>` solo se carga y reproduce cuando ese slide está activo ([`main.ts`](slides/src/deck/main.ts) → `onSlide`). Para regrabarlos:

```bash
node scripts/record-clips.mjs
```

[`record-clips.mjs`](scripts/record-clips.mjs) usa Playwright con el **Google Chrome instalado** (no descarga navegadores; la primera vez puede pedir `npx playwright-core install ffmpeg`, ~1,4 MB, para codificar video). Si la demo no está corriendo en `http://localhost:5174` la levanta sola (`DEMO_URL` para otra dirección). Puedes pasar solo lo que quieras regrabar: `node scripts/record-clips.mjs compare traces`.

| Salida | Qué muestra |
|---|---|
| `slides/public/clips/compare.webm` | `/compare.html` generando *"Regalo de café bajo Q200"* en ambos iframes + tabla de métricas (el del slide) |
| `slides/public/clips/broken-vs-fixed.webm` | `/?preset=broken` generando y luego `/?preset=fixed` |
| `slides/public/clips/ranking-inp.webm` | "Ordenar por recomendación" con `?preset=broken&cpu=4` vs. `?preset=fixed` |
| `docs/traces/mercadito-{broken,fixed}.json` | Generar + ordenar con CPU 4×. Ábrelos en DevTools → Performance → *Load profile*: aparece la pista **Mercadito · GenUI** (Stream, Parser, Render, Ranking). No se versionan (`.gitignore`). |

## Skill para tu agente de código

El [Agent Skill `web-performance-genui`](skills/web-performance-genui/SKILL.md) convierte las prácticas de la charla en una guía reutilizable. Está escrito en inglés; tu agente (Claude Code, Gemini CLI, Antigravity, Cursor y otros) puede aplicarlo al construir o revisar interfaces con streaming y **medir antes y después** con Chrome DevTools MCP.

- [`SKILL.md`](skills/web-performance-genui/SKILL.md): cuándo usarlo, flujo de trabajo, 10 reglas, antipatrones y formato para reportar resultados.
- [`references/patrones.md`](skills/web-performance-genui/references/patrones.md): patrones TypeScript y equivalencias para React, Angular y Vue.
- [`references/verificar.md`](skills/web-performance-genui/references/verificar.md): medición con DevTools MCP o el panel Performance, LoAF y umbrales.

Instalación en Claude Code (para todos tus proyectos):

```bash
git clone --depth 1 https://github.com/vanessamarely/web-performance-gen-ui /tmp/wpgu && mkdir -p ~/.claude/skills && cp -R /tmp/wpgu/skills/web-performance-genui ~/.claude/skills/
```

Para un solo proyecto, copia la carpeta en `.claude/skills/` del proyecto. Si tu agente no admite skills, copia también `references/` junto al contenido de `SKILL.md` en su contexto, o incorpora las referencias relevantes en `AGENTS.md`.

## Correr en local

```bash
npm install
```

```bash
npm run dev:slides
```

```bash
npm run dev:demo
```

- **Ensayo sin internet**: agrega `?local` al deck, a `/presenter/` y a `/live/`. Cada pestaña es un asistente distinto (BroadcastChannel + localStorage). Abre el deck con `?presenter&local`.
- **Ensayo con Firestore sin ensuciar la sesión real**: `?session=ensayo1` (el QR lo incluye).

Atajos del deck: `←/→` navegar · **P** consola · **Q** preguntas del público · **L** claro/oscuro · **F** pantalla completa · **S** miniaturas · **M** menú.

## Firebase (opcional, plan Spark)

Sin variables de entorno todo corre en modo local. Para la charla en vivo con cientos de celulares:

1. Crea el proyecto y copia [`.env.example`](.env.example) a `slides/.env.local` con la config web.
2. Authentication → habilita **Anónimo** y **GitHub** (redirect `https://<proyecto>.firebaseapp.com/__/auth/handler`). Añade tu dominio de Hosting y `localhost` en *Authorized domains*.
3. Cambia el id de GitHub de la presentadora en [`firestore.rules`](firestore.rules) y en [`config.ts`](slides/src/shared/config.ts) (`PRESENTER_GITHUB_ID`).
4. Abre `/?presenter=1` → menú → **Presentar en vivo (GitHub)**. Aparece el badge rojo **EN VIVO**.

Modelo de datos ([reglas](firestore.rules)): los celulares solo leen `sessions/{sid}` (el slide actual). Asistentes, reacciones, preguntas (solo las lee la presentadora) y quitapenas (solo opciones validadas) son subcolecciones. **Las notas no existen en Firestore.**

```bash
npm run deploy
```

## Guion

El guion con tiempos está en [docs/GUION.md](docs/GUION.md) y también en la consola de la presentadora.

## Créditos

- Diseño: guía DevFest (misma paleta de *IA rápida, UI fluida*). Estructura del deck y `deck-stage` de [fluid-generative-ui](https://github.com/vanessamarely/fluid-generative-ui).
- Íconos: [Lucide](https://lucide.dev) (ISC).
- Quitapenas, textiles y artesanías: ilustraciones propias inspiradas en la tradición guatemalteca. En Mercadito los productos y precios son ficticios.
