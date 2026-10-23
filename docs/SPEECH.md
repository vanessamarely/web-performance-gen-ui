# Speech · Web performance en la era de la UI generativa

**DevFest Guatemala 2026 · 30 minutos (≈ 20 de charla + 8–10 de demo + cierre)**

Cómo leer este documento:
- **Di**: el texto sugerido, en primera persona. No hay que memorizarlo: son las ideas en el orden en que funcionan.
- **Clave**: lo que *no* puede faltar en ese slide aunque vayas corta de tiempo.
- **Haz**: acciones en el escenario (tecla, demo, pregunta al público).
- ⏱ minuto objetivo al empezar el slide (el mismo que muestra la consola de presentadora).

Hilo de toda la charla, en una frase: **"La IA ya no responde texto, responde interfaces; y cada token es trabajo para el navegador. Hoy aprendemos a medirlo con DevTools (y sus agentes) y a arreglarlo en cuatro frentes: renderizado, streaming, DOM y estado."**

---

## Antes de subir

- Deck en el proyector: `https://web-performance-gen-ui-slides.web.app/?presenter=1&screen=event` → menú → **Presentar en vivo (GitHub)**. Debe verse el badge rojo **● EN VIVO**.
- Menú → **Vaciar sesión en vivo…** (escribe VACIAR).
- Laptop: tecla **P** → consola de presentadora → **Iniciar** el cronómetro al decir la primera palabra.
- Pestañas listas: Mercadito `?preset=broken&lab`, `/compare.html`, DevTools abierto en Performance (CPU 4×), terminal con tu agente y `chrome-devtools-mcp`.
- Plan B: los clips del slide de demo se reproducen sin red; `?cpu=4` si no puedes usar DevTools.

---

## Apertura (0:00 – 2:00)

### 1 · Portada ⏱ 0:00

**Di:** "¡Buenas! Gracias por estar aquí. Levanten la mano: ¿quién ha usado esta semana una app que le responde con IA? … Casi todos. Ahora: ¿a quién le ha pasado que la respuesta *llega*, pero la página se congela, salta o tarda en dejarte hacer clic? … Esa sensación es de lo que vamos a hablar. La charla se llama *Optimizing Web Performance in the Era of Generative UI*: cómo hacer que las interfaces generadas por IA se sientan rápidas, fluidas y accesibles."

**Clave:** plantear el problema desde la experiencia, no desde la tecnología.

### 2 · Únete ⏱ 0:40

**Di:** "Esta charla también es una app. Escaneen el QR: van a ver cada slide en su celular con las ideas clave, pueden tomar notas y, algo importante, **si están escribiendo una nota, su celular no les cambia de slide hasta que la guarden**: nadie pierde lo que estaba escribiendo. También van a crear su **quitapenas**: ¿conocen las muñecas quitapenas? Según la tradición, le cuentas tu pena antes de dormir, la pones bajo la almohada y al despertar la pena ya no está. Hoy le vamos a dejar nuestras **penas de performance**. Y al final descargan una memoria de la charla con el resumen, sus notas y su quitapenas. Todo se genera en su celular: sus notas no salen de su teléfono."

**Haz:** deja el QR 20–30 s mientras pasas al siguiente slide. El QR también queda visible en el lateral izquierdo de la pantalla del evento.

### 3 · Quién soy ⏱ 1:30

**Di:** "Soy Vanessa Aristizabal, ingeniera de software, Google Developer Expert en Web Technologies y Angular y GitHub Star. Me encontrarán como *vanessamarely* en casi todas partes, y acabo de lanzar mi sitio: **vanessamarely.dev**."

**Clave:** 20 segundos, no más.

---

## El problema (2:00 – 5:15)

### 4 · Cada token cuesta ⏱ 2:00

**Di:** "La tesis de hoy cabe en una línea: **la IA ya no responde texto, responde interfaces.** Le pides 'un regalo de café bajo 200 quetzales' y no te devuelve un párrafo: te devuelve tarjetas, una tabla comparativa, imágenes, botones. Y aquí está el detalle: **cada token que llega es trabajo para el hilo principal del navegador**: hay que interpretarlo, actualizar el estado, crear o actualizar elementos, calcular el layout y pintar. El modelo puede ser rapidísimo, 80 tokens por segundo, y aun así tu UI se siente lenta, porque el cuello de botella está en el navegador."

**Clave:** "el modelo puede ser rápido y la experiencia lenta". Pausa después.

### 5 · ¿Qué es web performance? ⏱ 2:40

**Di:** "Antes de seguir, pongámonos de acuerdo en qué es web performance, porque no es solo 'que cargue rápido'. **Web performance es qué tan rápida y estable *se siente* una web para quien la usa.** Y se resume en tres preguntas que se hace cualquier persona, aunque nunca haya oído de métricas:

- **'¿Ya cargó?'** Esa pregunta la mide el **LCP, Largest Contentful Paint**: el momento en que aparece lo más importante de la pantalla, la imagen o el bloque de texto principal.
- **'¿Me hizo caso?'** Esa la mide el **INP, Interaction to Next Paint**: desde que tocas un botón o escribes, cuánto tarda la pantalla en mostrar que reaccionó.
- **'¿Se quedó quieto?'** Esa la mide el **CLS, Cumulative Layout Shift**: cuánto se mueve lo que ya estabas viendo. ¿A quién le ha saltado un botón justo cuando iba a tocarlo? Eso es layout shift.

¿Y cómo se mide? De dos formas que se complementan. **En laboratorio**: en tu equipo, con condiciones controladas, usando DevTools o Lighthouse; sirve para encontrar la causa. **En campo**: con usuarios reales, en sus celulares y sus redes, con datos como CrUX, el reporte de experiencia de usuarios de Chrome, o la librería web-vitals en tu sitio. Y en campo no se mira el promedio: se mira el **percentil 75**. Es decir, tu página aprueba si **3 de cada 4 visitas** tienen una buena experiencia. No basta con que funcione en tu máquina."

**Clave:** las 3 preguntas → 3 métricas; laboratorio vs. campo; p75. Sin números todavía (van en el siguiente).
**Haz:** pregunta al público lo del botón que salta; esperas risas o manos.

### 6 · Métricas 2026 ⏱ 3:30

**Di:** "Ahora los números que hay que recordar. Una página está 'bien' cuando, en el percentil 75: **LCP de 2,5 segundos o menos, INP de 200 milisegundos o menos y CLS de 0,1 o menos.** Para entender *por qué* un INP es malo existe una herramienta muy útil: **Long Animation Frames, LoAF**, que te dice qué script bloqueó cada frame.

Y lo nuevo de 2026, que nos importa mucho para UI generativa: las **soft navigations**. Una app de una sola página, o una UI generativa, cambia de vista y de URL sin recargar el documento. Hasta ahora, las métricas de campo solo veían la carga inicial. **Desde Chrome 151 existe la API de soft navigations**, DevTools ya las muestra en Live metrics e Insights (Chrome 152 a 154), y **desde octubre de 2026 CrUX publica LCP, INP y CLS experimentales que incluyen soft navigations.** La meta es que dejen de ser experimentales en **mayo de 2027**, y ahí Search Console empezará a usar esos datos. O sea: lo que pasa *después* de la primera carga, que es justo donde vive la UI generativa, empieza a contar."

**Clave:** los tres umbrales; LoAF como diagnóstico; soft navs (Chrome 151 → CrUX octubre 2026 → meta mayo 2027).

### 7 · Dónde se rompe ⏱ 4:30

**Di:** "¿Dónde se rompe una UI generativa? Hay cinco lugares típicos, y los vamos a romper y arreglar en vivo en la demo:

1. **Layout shift**: el componente nuevo llega y empuja lo que estabas leyendo; banners que aparecen tarde arriba.
2. **Hilo bloqueado**: renderizar en cada token y hacer cálculos pesados en el hilo principal; tu clic espera.
3. **Re-parseo**: volver a hacer `JSON.parse` de *todo* lo recibido en cada token. Eso crece cuadráticamente.
4. **DOM desechable**: usar `innerHTML` en cada actualización: destruyes y recreas miles de nodos y se pierde el foco.
5. **Navegación invisible**: la UI cambia de vista y de URL, pero nadie mide esa soft navigation."

**Clave:** son los 5 interruptores de la demo; dilo explícitamente.

---

## 01 · Medir con agentes (5:15 – 9:15)

### 8 · Separador ⏱ 5:15

**Di:** "Regla número uno: antes de optimizar, se mide. Y en 2026 medir ya no es solo grabar un trace: DevTools tiene IA integrada y un servidor para que tus agentes de código midan por ti."

### 9 · Performance panel ⏱ 5:30

**Di:** "El panel Performance de Chrome DevTools cambió mucho:
- **Live metrics**: apenas lo abres ves tu LCP, INP y CLS locales en tiempo real, al lado de los datos de campo de CrUX, ahora también por soft navigation.
- **Insights**: en vez de leer el trace a ojo, el panel te dice *qué* causó el layout shift o el INP alto, y en qué vista de tu SPA.
- **Niveles de CPU calibrados**: puedes reproducir 'un celular de gama baja' de forma consistente.
- **Pistas propias**: puedes dibujar tus propias filas en el trace y buscarlas con Ctrl+F."

**Haz (opcional, si vas a tiempo):** abre DevTools en Mercadito y muestra Live metrics 15 segundos.

### 10 · AI assistance ⏱ 6:30

**Di:** "AI assistance es Gemini dentro de DevTools. Haces clic derecho en un insight o en un evento del trace, eliges **Ask AI**, y te explica qué pasó con el contexto real de tu página. También puedes hacer preguntas abiertas, '¿qué hace lento este clic?', y DevTools graba el trace por ti y busca el contexto. Usa datos de Lighthouse, te muestra su razonamiento y puedes anotar el trace con lo que encontró. Ojo: la IA no reemplaza entender el trace, pero te acerca a la causa mucho más rápido. **Siempre verifica.**"

**Clave:** Ask AI sobre un insight; preguntas abiertas; "siempre verifica". El chat del slide es un ejemplo ilustrativo.

### 11 · DevTools for agents ⏱ 7:30

**Di:** "Y ahora lo más agéntico: **Chrome DevTools for agents**. Es un servidor MCP, y también una CLI, ya estables, que conectas a tu agente de código: Gemini CLI, Antigravity, Claude Code, Cursor… Con eso, tu agente puede abrir Chrome, emular CPU lenta, grabar un trace, leer los insights y correr Lighthouse. Las tools clave: `performance_start_trace`, `performance_analyze_insight`, `emulate` y `lighthouse_audit`. Y si tu página expone herramientas con WebMCP, el agente también puede listarlas y ejecutarlas. La idea no es que el agente 'adivine': le pides 'mide el INP de este botón con CPU 4×, propón un arreglo y **vuelve a medir**'. Esa última parte es la que importa."

**Clave:** MCP + CLI estables; las 4 tools; "y vuelve a medir".

### 12 · Pistas propias ⏱ 8:30

**Di:** "Un truco que les recomiendo: con `performance.measure` y un objeto `detail.devtools`, sus etapas aparecen como pistas en el panel Performance: Stream, Parser, Render. Ganan dos veces: ustedes ven 'parse' en vez de un mar de 'Function call', y la IA de DevTools y sus agentes también leen esos nombres. Y casi no cuesta nada: si DevTools no está abierto, son solo marcas de User Timing."

---

## 02 · Renderizado (9:15 – 11:15)

### 13 · Separador ⏱ 9:15

**Di:** "Primer frente: renderizado. El modelo devuelve datos; tu UI decide cómo se ven, cuánto miden y cuándo se pintan."

### 14 · Datos, no HTML ⏱ 9:30

**Di:** "La decisión más importante: **que el modelo devuelva datos, no HTML.** El modelo elige componentes de un **catálogo cerrado**, como hero, producto, tabla o consejo, y devuelve JSON validado por un **schema**. La Prompt API de Chrome y la Gemini API aceptan ese schema. Y un detalle de performance: **ordena el schema pensando en el streaming.** Lo que va arriba del pliegue primero, el título y el hero, para que el LCP no espere al detalle. Ganas seguridad, porque no hay HTML arbitrario, accesibilidad por diseño y componentes que puedes medir."

**Clave:** catálogo + schema; orden del schema = orden del streaming.

### 15 · Reserva el espacio ⏱ 10:15

**Di:** "Contra el layout shift: **reserva el espacio antes que el contenido.** Cada componente nace con su altura final: `min-height`, `aspect-ratio` en las imágenes, `line-clamp` en los textos. `contain` aísla su layout. Y nunca insertes algo *arriba* de lo que la persona está leyendo: los banners tardíos van en un espacio ya reservado. Un cuidado: `content-visibility: auto` es genial para lo que ya terminó y está fuera de pantalla, pero si lo pones mientras el componente todavía se genera, puede provocar shifts."

**Clave:** altura final desde el inicio; nada entra arriba; `content-visibility` solo al terminar.

---

## 03 · Streaming (11:15 – 14:30)

### 16 · Separador ⏱ 11:15

**Di:** "Segundo frente: streaming. Queremos mostrar valor desde el primer token sin bloquear el hilo principal."

### 17 · Parsea una sola vez ⏱ 11:30

**Di:** "El error más común: cada vez que llega un token, concatenas al buffer y haces `JSON.parse` de **todo**, 'reparando' el JSON incompleto. Eso es O(n²): en Mercadito, una respuesta de 5 KB termina recorriendo unos 6,5 millones de caracteres. La alternativa es un **parser incremental**: recorre cada carácter **una sola vez** y emite eventos cuando algo se completa, 'llegó un producto completo'. Y renderizas por ítem completo, no por carácter."

**Clave:** O(n²) vs O(n); cifra de la demo (5 KB → 6,5 M caracteres).

### 18 · Un render por frame ⏱ 12:30

**Di:** "70 tokens por segundo no son 70 renders por segundo. La pantalla pinta, como mucho, una vez por frame. Así que **agrupa los cambios y renderiza una vez por frame** con `requestAnimationFrame`. Y si el trabajo es largo, **cede el hilo** con `scheduler.yield()`: le das al navegador la oportunidad de atender un clic a mitad del trabajo, que es justo lo que mide el INP. Para encontrar culpables, observa `long-animation-frame`: te dice qué script bloqueó cada frame. En la demo, el mismo stream pasa de 210 renders a 8."

**Clave:** rAF + `scheduler.yield()` + LoAF; 210 → 8 renders.

### 19 · Declarative Partial Updates ⏱ 13:30

**Di:** "Y algo nuevo y experimental para quienes generan UI en el servidor: **Declarative Partial Updates.** Con *out-of-order streaming* el servidor manda un marcador, `<?start name="productos">`, y más tarde un `<template for="productos">` con el contenido, en cualquier orden, sin JavaScript propio de parcheo; eso está desde Chrome 150. Además vienen APIs como `setHTML`, `appendHTML` y sus versiones en streaming, como `streamHTMLUnsafe()`, que todavía están en prueba detrás de un flag. Verifiquen soporte y tengan un plan B."

**Clave:** es experimental; el patrón encaja con UI generativa del lado del servidor.

---

## 04 · Reciclar el DOM (14:30 – 16:30)

### 20 · Separador ⏱ 14:30

**Di:** "Tercer frente: el DOM. Mover y actualizar nodos es mucho más barato que destruirlos y crearlos de nuevo."

### 21 · Claves estables ⏱ 14:45

**Di:** "Con `innerHTML` en cada actualización, en Mercadito se crean **unos 23.500 nodos** para una sola respuesta. Con **una clave estable por id**, un nodo por producto que se crea una vez y luego solo se actualiza el texto que cambió, son **unos 340**. Además se conserva el foco, el hover y las imágenes ya decodificadas. Y cuando la lista cambia de orden, la animas con **View Transitions con alcance de elemento**, desde Chrome 147.

Un dato curioso que encontré preparando la demo: si recreas **toda** la vista con `innerHTML`, el CLS ni siquiera registra el salto, porque los nodos son nuevos y la métrica sigue a los elementos que ya existían. La métrica dice cero… pero tu usuario sí lo vio. Por eso hay que mirar las métricas *y* el comportamiento."

**Clave:** 23.500 vs 340; el dato curioso del CLS invisible.

### 22 · Listas largas ⏱ 15:45

**Di:** "Cuando la IA genera 500 resultados: **recicla, virtualiza, contén.** Un pool de nodos: solo existen los visibles y los que salen se reutilizan para los que entran. `content-visibility: auto` para secciones terminadas fuera de pantalla, con `contain-intrinsic-size` para que no salten. Y midan la memoria: una UI generativa puede estar abierta horas, y el servidor MCP de DevTools ya analiza heap snapshots y nodos desconectados. La regla: **el tamaño del DOM depende de la pantalla, no de la respuesta del modelo.**"

---

## 05 · Estado y navegación (16:30 – 18:30)

### 23 · Separador ⏱ 16:30

**Di:** "Cuarto frente: el estado. En UI generativa suelen llegar varios streams a la vez."

### 24 · Estado fuera del render ⏱ 16:45

**Di:** "Tres ideas: **un store por stream**, con lo que va llegando como borrador y lo validado como confirmado; y lo anterior se queda en pantalla hasta que llega su reemplazo, nunca una pantalla en blanco. **Suscripciones finas por clave**, con signals o `useSyncExternalStore`, para que un token actualice *un* componente y no la página entera. Y **lo derivado lo calcula el código, no el modelo**: totales, filtros y orden. Si es pesado, en un Web Worker. La IA decide *qué* mostrar; el código calcula todo lo demás."

**Clave:** borrador/confirmado; suscripción por clave; lo derivado en código (Worker).

### 25 · Soft navigations ⏱ 17:45

**Di:** "Y como la UI generativa también navega, cuando abres un producto y cambia la URL sin recargar, hay que medir esas **soft navigations**. Una soft navigation es una interacción, más un cambio de URL, más una pintura visible. Con un `PerformanceObserver` de tipo `soft-navigation` sabes cuándo empieza cada vista, y con `interaction-contentful-paint` mides su LCP. Un detalle: asocia cada pintura a su vista por `interactionId`, no por `navigationId`. Si usan la librería web-vitals, desde la v6 basta con `reportSoftNavs: true`. Y en su RUM, separen navegaciones duras de suaves para no mezclar sus LCP."

**Clave:** definición (interacción + URL + pintura); los dos tipos de entrada; `reportSoftNavs: true`.

---

## 26 · Demo: Mercadito ⏱ 18:30 – 28:30 (8–10 min)

**Di (intro, 20 s):** "Esto es Mercadito: un asistente de compras generativo para artesanías, café y cacao de Guatemala. Los productos y precios son ficticios. Tiene un laboratorio con cinco interruptores, uno por cada villano, y un HUD abajo que mide en vivo CLS, INP, LoAF, nodos creados, milisegundos de parseo y soft navigations."

**1. Comparación, 1 min.** Abre `/compare.html` → **Generar en ambos**.
"Mismo stream, mismo prompt, dos renderers. Miren la tabla: nodos creados, renders, parseo, CLS."

**2. Medir el modo roto con DevTools, 3 min.** Mercadito con `?preset=broken` y DevTools en Performance.
- ⏺ Grabar → *"regalo de café bajo Q200"* → Generar → Detener.
- "Aquí está nuestra pista *Mercadito · GenUI*: Stream, Parser y Render en rojo."
- Abre el insight de **layout shifts** → clic derecho → **Ask AI**. Lee la respuesta en voz alta.
- Enciende **Reservar espacio** (tecla D) y repite: "CLS prácticamente cero: los slots ya tenían su altura".

**3. Hilo bloqueado, 2 min.** CPU 4×. Genera de nuevo y, mientras genera, haz clic en **♡ Guardar** de una tarjeta.
- "Con `innerHTML` el botón se recrea y mi clic se pierde."
- Enciende **Parser incremental**, **Un render por frame** y **Claves estables**: "de cientos de renders y miles de nodos a una decena y unos cientos".

**4. INP, 2 min.** Con todo roto, clic en **Ordenar por recomendación**.
- "El HUD marca INP en rojo." Muestra el insight **INP breakdown**: "casi todo es *processing duration*, nuestro ranking en el hilo principal".
- Enciende **Ranking en un Worker**: "feedback inmediato, el cálculo va en un Worker y el reorden se anima con una View Transition".

**5. Soft navigation y agente, 2 min.** Abre un producto: "el HUD cuenta la soft navigation y su LCP".
- En la terminal, pega el prompt 2 de `docs/AGENTES.md`: "mi agente emula CPU 4×, graba el trace, hace clic, analiza INPBreakdown… y vuelve a medir."

**Si algo falla:** usa el clip del slide ("esto es lo que acabamos de intentar") y sigue. No depurar en vivo.

---

## Cierre (28:30 – 30:00)

### 27 · Receta ⏱ 28:30

**Di:** "Lo que acabamos de hacer, en cinco pasos: **uno**, reproduce con CPU calibrada y red lenta; **dos**, graba y lee los Insights; **tres**, pregúntale a AI assistance; **cuatro**, delega al agente el arreglo y que vuelva a medir; **cinco**, confirma en campo con web-vitals y CrUX, incluidas las soft navigations. Laboratorio para encontrar, campo para confirmar."

### 28 · Muro de quitapenas ⏱ 29:00

**Di:** "Y ustedes también generaron UI hoy: este es el muro de quitapenas. Se dibujan en cada celular con SVG; al muro solo viajaron sus elecciones, unos pocos bytes." Lee 2 o 3 penas en voz alta, con humor: "'Mis deploys del viernes'… alguien aquí sufre".

**Haz:** clic en una tarjeta para ocultarla si hace falta (moderación).

### 29 · Checklist ⏱ 29:20

**Di:** "Diez reglas para llevarse: mide primero; datos, no HTML; reserva el espacio; parser incremental; un render por frame; cede el hilo; claves estables; recicla listas largas; estado fuera del render; y mide las soft navigations. Están en su memoria descargable."

### 30 · ¡Maltiox! ⏱ 29:45

**Di:** "Maltiox, que es 'gracias' en k'iche'. En su celular ya pueden descargar su memoria de la charla con el resumen, sus notas y su quitapenas. El código del deck, la app y la demo está en el repositorio, y todo lo que hago lo encuentran en vanessamarely.dev. ¿Preguntas?"

**Haz:** tecla **Q** para ver las preguntas que llegaron desde los celulares.

---

## Preguntas probables (para tener la respuesta lista)

- **"¿Esto aplica a React, Angular o Vue?"** Sí: las ideas son agnósticas. En React: `key` estable, `useSyncExternalStore`, `startTransition` con cuidado. En Angular: `track` en `@for`, signals y `ChangeDetectionStrategy.OnPush`.
- **"¿INP reemplazó a FID?"** Sí, desde marzo de 2024 INP es Core Web Vital en lugar de FID.
- **"¿Las soft navigations ya afectan el SEO?"** Todavía no: son experimentales en CrUX desde octubre de 2026 y la meta para pasar a estables es mayo de 2027, cuando Search Console usará esos datos.
- **"¿Necesito pagar por DevTools MCP o AI assistance?"** DevTools MCP es open source (`npx chrome-devtools-mcp@latest`). AI assistance viene en Chrome; revisa la disponibilidad para tu cuenta y región.
- **"¿Y si no puedo usar un parser incremental?"** Como mínimo, no parsees en cada token: agrupa por frame y parsea solo lo nuevo o por bloques completos.
- **"¿Qué tan confiable es la IA de DevTools?"** Úsala como copiloto: te acerca a la causa, pero confirma en el trace y vuelve a medir.

## Si vas corta de tiempo

Recorta en este orden, sin perder el hilo:
1. Slide 12 (pistas propias): menciónalo en la demo.
2. Slide 19 (Declarative Partial Updates): una frase.
3. Slide 22 (listas largas): una frase dentro de "Claves estables".
4. Paso 5 de la demo (agente): muestra solo la soft navigation.
