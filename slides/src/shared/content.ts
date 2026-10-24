// Fuente única del contenido "de bolsillo" de cada slide.
//  · El deck solo transmite { index, id }: el celular busca aquí el título y los puntos clave
//    (el documento en vivo pesa ~200 bytes y nadie descarga capturas).
//  · La consola de la presentadora lee `notes` (guion) y `time`.
//  · La memoria descargable usa `summary` de TODOS los slides, aunque alguien llegue tarde.
export type LiveKind = 'content' | 'join' | 'demo' | 'wall' | 'end';

export interface SlideContent {
  id: string;
  label: string;
  kind: LiveKind;
  /** Título que ve el público en el celular y en la memoria */
  title: string;
  /** Sección (para agrupar la memoria) */
  section?: string;
  /** Lo más importante del slide: 1–4 frases cortas */
  summary: string[];
  /** Código de referencia (se muestra en el celular y entra a la memoria) */
  code?: { file: string; text: string };
  /** Guion de la presentadora (solo consola) */
  notes: string;
  /** Minuto aproximado en que empieza (charla de 30 min con 10 de demo) */
  time: string;
  /** Este slide entra a la memoria descargable */
  inSummary?: boolean;
}

const S1 = '01 · Medir con agentes';
const S2 = '02 · Renderizado';
const S3 = '03 · Streaming';
const S4 = '04 · Reciclar el DOM';
const S5 = '05 · Estado y navegación';

export const SLIDES: SlideContent[] = [
  {
    id: 'portada',
    label: 'Portada',
    kind: 'content',
    title: 'Web performance en la era de la UI generativa',
    summary: [
      'La IA ya no solo responde texto: genera interfaces completas, en streaming.',
      'Cada token que llega es trabajo para el hilo principal: parsear, renderizar, calcular layout y pintar.',
    ],
    notes: 'Bienvenida. "Hoy vamos a hablar de lo que pasa en el navegador cuando la IA nos responde con interfaces, y de cómo medirlo con DevTools… que ahora también tiene agentes."',
    time: '0:00',
    inSummary: true,
  },
  {
    id: 'unete',
    label: 'Únete',
    kind: 'join',
    title: 'Únete a la charla',
    summary: ['Escanea el QR: sigue los slides en tu celular, toma notas y crea tu quitapenas.'],
    notes: 'Que escaneen el QR mientras te presentas. "Sus notas se guardan solo en su celular y, si están escribiendo, la app NO les cambia de slide hasta que guarden. Al final descargan una memoria de la charla con su quitapenas."',
    time: '0:40',
  },
  {
    id: 'bio',
    label: 'Quién soy',
    kind: 'content',
    title: 'Vanessa Aristizabal',
    summary: ['Software Engineer · Google Developer Expert en Web Technologies y Angular · GitHub Star.'],
    notes: 'Breve: 20 segundos.',
    time: '1:30',
  },
  {
    id: 'tesis',
    label: 'Cada token cuesta',
    kind: 'content',
    title: 'Cada token que llega es trabajo en el hilo principal',
    summary: [
      'La personalización de la UI generativa se paga en el cliente: CPU, layout shifts y latencia de render.',
      'El modelo puede ser rápido y la experiencia, lenta: el cuello de botella suele estar en el navegador.',
    ],
    notes: 'La tesis. Pausa. "El modelo puede devolver 80 tokens por segundo y aun así tu UI se siente lenta."',
    time: '2:00',
    inSummary: true,
  },
  {
    id: 'que-es-perf',
    label: '¿Qué es web performance?',
    kind: 'content',
    title: '¿Qué es web performance?',
    summary: [
      'Web performance es qué tan rápida y estable se siente una web para quien la usa.',
      '¿Ya cargó? → LCP (Largest Contentful Paint): cuándo aparece lo más importante. ¿Me hizo caso? → INP (Interaction to Next Paint): cuánto tarda en responder a un clic.',
      '¿Se quedó quieto? → CLS (Cumulative Layout Shift): cuánto se mueve lo que ya estabas viendo.',
      'Se mide en laboratorio (DevTools, Lighthouse: para encontrar la causa) y en campo (usuarios reales: CrUX, web-vitals). Se aprueba con el percentil 75.',
    ],
    notes: 'Para quien no viene del mundo de performance. Pregunta al público: "¿a quién le ha saltado un botón justo cuando iba a tocarlo?". Cada pregunta es una métrica. Laboratorio = tu laptop, para depurar; campo = la gente real con su celular y su red. p75: no basta con que funcione en tu máquina, tiene que funcionar para 3 de cada 4 visitas. En el siguiente slide, los números.',
    time: '2:40',
    inSummary: true,
  },
  {
    id: 'metricas',
    label: 'Métricas 2026',
    kind: 'content',
    title: 'Las métricas que importan (y lo nuevo de 2026)',
    summary: [
      'Core Web Vitals: LCP ≤ 2,5 s · INP ≤ 200 ms · CLS ≤ 0,1 (percentil 75 de usuarios reales).',
      'Long Animation Frames (LoAF) explica el porqué de un mal INP: qué script bloqueó el frame.',
      'Soft navigations: API estable desde Chrome 151; CrUX publica métricas experimentales con soft navs desde octubre de 2026.',
      'Por ahora son experimentales: las métricas estables de Core Web Vitals no cambian mientras se evalúan. CrUX Vis ya las muestra.',
    ],
    notes: 'Las SPA y las UIs generativas cambian la URL sin recargar: hasta ahora CrUX solo veía la carga inicial. Eso está cambiando. Menciona que en sitios con muchas soft navs el LCP "bueno" en Android pasó de 26 % a 87 %.',
    time: '3:30',
    inSummary: true,
  },
  {
    id: 'villanos',
    label: 'Dónde se rompe',
    kind: 'content',
    title: 'Cinco lugares donde se rompe una UI generativa',
    summary: [
      'Layout shift: el contenido nuevo empuja lo que ya leías (CLS).',
      'Hilo bloqueado: renderizar en cada token congela clics y scroll (INP, LoAF).',
      'Re-parseo: volver a parsear todo el JSON en cada token es O(n²).',
      'DOM desechable: innerHTML recrea miles de nodos y se pierde el foco. Y navegaciones suaves que nadie mide.',
    ],
    notes: 'Presenta los 5 villanos: los vamos a ver en la demo, cada uno con su interruptor.',
    time: '4:30',
    inSummary: true,
  },
  {
    id: 'sec-medir',
    label: '01 Medir con agentes',
    kind: 'content',
    section: S1,
    title: 'Medir con DevTools agéntico',
    summary: ['Antes de optimizar, mide: DevTools ahora tiene IA integrada y un servidor MCP para que tus agentes de código midan por ti.'],
    notes: 'Transición. "Lo primero no es optimizar: es medir. Y en 2026 medir ya no es solo grabar un trace."',
    time: '5:15',
  },
  {
    id: 'devtools-perf',
    label: 'Performance panel',
    kind: 'content',
    section: S1,
    title: 'El panel Performance en 2026',
    summary: [
      'Live metrics: LCP, INP y CLS locales al instante, junto a los datos de campo de CrUX.',
      'Insights: el panel te dice qué causó el layout shift o el INP alto, ahora también por soft navigation.',
      'Overrides de nivel de CPU calibrados para reproducir equipos lentos de forma consistente.',
      'En un mismo trace ves tu código (tus pistas: stream, parser, render) junto a sus efectos: frames lentos (LoAF), layout shifts y soft navigations.',
    ],
    notes: 'Abre DevTools en la demo si da tiempo: Live metrics con interacción. Soft navs en Live metrics desde Chrome 152 e Insights completos en 153/154.',
    time: '5:30',
    inSummary: true,
  },
  {
    id: 'ai-assistance',
    label: 'AI assistance',
    kind: 'content',
    section: S1,
    title: 'AI assistance: pregúntale al trace',
    summary: [
      'Clic derecho en un insight o evento del trace → "Ask AI": Gemini explica qué pasó con el contexto real.',
      'Preguntas abiertas ("¿qué hace lento este clic?"): DevTools graba el trace por ti y busca el contexto.',
      'Usa datos de Lighthouse y muestra su razonamiento; puedes anotar el trace con sus hallazgos.',
    ],
    notes: 'Mensaje: la IA no reemplaza entender el trace, pero acelera llegar a la causa. Siempre verifica.',
    time: '6:30',
    inSummary: true,
  },
  {
    id: 'devtools-mcp',
    label: 'DevTools for agents',
    kind: 'content',
    section: S1,
    title: 'Chrome DevTools for agents (MCP + CLI)',
    summary: [
      'Servidor MCP estable: tu agente de código (Gemini CLI, Antigravity, Claude Code…) abre Chrome, graba traces y lee insights.',
      'Tools clave: performance_start_trace, performance_analyze_insight, emulate (CPU y red), lighthouse_audit.',
      'Con WebMCP habilitado, el agente también puede listar y ejecutar las tools que tu web expone.',
      'Medido de verdad en Mercadito con CPU 4×: INP de 1.162 ms con el ranking en el hilo principal → 16 ms con un Worker.',
    ],
    code: {
      file: 'mcp.json',
      text: `{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}`,
    },
    notes: 'El video es real: chrome-devtools-mcp grabó el navegador con screencast_start mientras el agente emulaba CPU 4×, grababa el trace, hacía clic y analizaba INPBreakdown (traces en docs/traces/agente-*.json.gz). El prompt está en docs/AGENTES.md. "Le pido a mi agente: mide el INP del botón Ordenar con CPU 4x y propón un fix. Y lo hace: graba el trace, lee el insight, edita el código."',
    time: '7:30',
    inSummary: true,
  },
  {
    id: 'tracks',
    label: 'Pistas propias',
    kind: 'content',
    section: S1,
    title: 'Tu UI generativa como pistas en Performance',
    summary: [
      'performance.measure() con detail.devtools dibuja tus propias pistas: stream, parser, render.',
      'Le das contexto a la IA de DevTools y a tus agentes: ven tus nombres, no solo "Function call".',
    ],
    code: {
      file: 'perf-tracks.ts',
      text: `performance.measure('parse', {
  start, end: performance.now(),
  detail: { devtools: {
    dataType: 'track-entry',
    track: 'Stream', trackGroup: 'Mercadito',
    color: 'tertiary',
    properties: [['tokens', '128']],
  } },
});`,
    },
    notes: 'En la demo, abre Performance y muestra la pista "Mercadito · GenUI".',
    time: '8:30',
    inSummary: true,
  },
  {
    id: 'sec-render',
    label: '02 Renderizado',
    kind: 'content',
    section: S2,
    title: 'Estrategias de renderizado',
    summary: ['El modelo devuelve datos; tu UI decide cómo se ven, cuánto miden y cuándo se pintan.'],
    notes: 'Transición.',
    time: '9:15',
  },
  {
    id: 'contrato',
    label: 'Datos, no HTML',
    kind: 'content',
    section: S2,
    title: 'Datos, no HTML: catálogo + schema',
    summary: [
      'El modelo elige componentes de un catálogo cerrado y devuelve JSON validado por un schema.',
      'Ordena el schema para el streaming: primero lo que va arriba del pliegue (título, LCP), después el detalle.',
      'Ganas seguridad (sin HTML arbitrario), accesibilidad por diseño y componentes medibles.',
    ],
    notes: 'Prompt API (Chrome 148) y Gemini API aceptan schema: responseConstraint / responseJsonSchema.',
    time: '9:30',
    inSummary: true,
  },
  {
    id: 'reserva',
    label: 'Reserva el espacio',
    kind: 'content',
    section: S2,
    title: 'Reserva el espacio antes que el contenido',
    summary: [
      'Cada componente nace con su altura final: min-height, aspect-ratio, line-clamp.',
      'contain y contain-intrinsic-size aíslan el layout; content-visibility: auto solo para lo ya terminado.',
      'Nunca insertes arriba de lo que la persona está leyendo (banners tardíos = CLS).',
    ],
    code: {
      file: 'slots.css',
      text: `.slot-product {
  min-height: 312px;
  contain: layout paint;
}
.slot-product img { aspect-ratio: 4 / 3; width: 100%; }
.slot-done {
  content-visibility: auto;
  contain-intrinsic-size: auto 312px;
}`,
    },
    notes: 'Ojo: content-visibility: auto mientras el componente todavía se genera puede causar shifts. Úsalo cuando ya terminó.',
    time: '10:15',
    inSummary: true,
  },
  {
    id: 'sec-stream',
    label: '03 Streaming',
    kind: 'content',
    section: S3,
    title: 'Streaming de HTML y JSON',
    summary: ['Muestra valor desde el primer token sin bloquear el hilo principal.'],
    notes: 'Transición.',
    time: '11:15',
  },
  {
    id: 'parser',
    label: 'Parsea una sola vez',
    kind: 'content',
    section: S3,
    title: 'Parsea cada carácter una sola vez',
    summary: [
      'La notación O dice cuánto crece el trabajo cuando crece la respuesta (n = caracteres que van llegando).',
      'O(n²), releer todo: como releer el libro desde la página 1 cada vez que pasas de página. En Mercadito, 5 KB → 6,5 millones de caracteres leídos.',
      'O(n), leer solo lo nuevo: un parser incremental recuerda dónde iba y solo convierte en datos cada producto cuando se completa (5 KB → 5 mil caracteres).',
      'Se comprueba: los dos parsers dan el mismo JSON final, y el HUD y la pista Parser de DevTools muestran la diferencia de tiempo.',
    ],
    code: {
      file: 'demo/src/genui/parsers.ts',
      text: `// controller.ts · en cada pedazo del stream
const { state, changed } = parser.push(chunk);
if (changed) render(state);
// ✗ NaiveParser.push
this.buf += chunk;
return JSON.parse(repair(this.buf));
// ✓ IncrementalParser.push
for (; this.pos < this.buf.length; this.pos++)
  // ¿cerró un producto? → JSON.parse de ese trozo`,
    },
    notes: 'Explica la notación O con el libro: no hace falta matemática, solo "¿el trabajo crece igual que la respuesta, o mucho más rápido?". El código es el real de Mercadito (demo/src/genui/parsers.ts): el interruptor "Parser incremental" cambia entre los dos. En la demo, el HUD "parseo" baja de ~35 ms a ~3 ms.',
    time: '11:30',
    inSummary: true,
  },
  {
    id: 'frame',
    label: 'Un render por frame',
    kind: 'content',
    section: S3,
    title: 'Un render por frame y cede el hilo',
    summary: [
      '70 tokens/s no son 70 renders/s: agrupa los cambios y pinta una vez por frame (requestAnimationFrame).',
      'scheduler.yield() divide el trabajo largo para que los clics se atiendan a tiempo (INP).',
      'Observa long-animation-frame para encontrar qué script bloqueó cada frame.',
    ],
    code: {
      file: 'scheduler.ts',
      text: `let dirty = false;
function onToken(ev) {
  store.apply(ev);
  if (!dirty) { dirty = true; requestAnimationFrame(flush); }
}
async function flush() {
  dirty = false;
  for (const part of store.takeChanges()) {
    render(part);
    await scheduler.yield();
  }
}`,
    },
    notes: 'Muestra en la demo el LoAF más largo con el interruptor apagado y encendido.',
    time: '12:30',
    inSummary: true,
  },
  {
    id: 'dpu',
    label: 'Declarative Partial Updates',
    kind: 'content',
    section: S3,
    title: 'Streaming de HTML nativo: Declarative Partial Updates',
    summary: [
      'Out-of-order streaming: el servidor envía un marcador y, más tarde, un <template for> que lo reemplaza (Chrome 150).',
      'Nuevas APIs: setHTML, appendHTML y sus versiones en streaming como streamHTMLUnsafe() (en prueba, con flag).',
      'Patrón ideal para UI generativa en el servidor: la página llega primero y los componentes después, sin JavaScript propio de parcheo.',
    ],
    code: {
      file: 'stream.html',
      text: `<ul id="productos">
  <?start name="productos">Generando…<?end>
</ul>
<!-- …el modelo sigue pensando… -->
<template for="productos">
  <li>Café de Huehuetenango</li>
  <?marker name="productos">
</template>`,
    },
    notes: 'Experimental: verifica soporte antes de usarlo en producción. La versión con JS: el.streamHTMLUnsafe() + pipeTo().',
    time: '13:30',
    inSummary: true,
  },
  {
    id: 'sec-dom',
    label: '04 Reciclar el DOM',
    kind: 'content',
    section: S4,
    title: 'Reciclaje del DOM',
    summary: ['Mover y actualizar nodos existentes es mucho más barato que destruirlos y crearlos de nuevo.'],
    notes: 'Transición.',
    time: '14:30',
  },
  {
    id: 'claves',
    label: 'Claves estables',
    kind: 'content',
    section: S4,
    title: 'Claves estables en vez de innerHTML',
    summary: [
      'innerHTML en cada actualización recrea todo: miles de nodos, foco perdido, imágenes que vuelven a decodificarse.',
      'Con una clave por id (producto, sección) solo se actualiza el texto que cambió.',
      'Las listas que cambian de orden se animan con View Transitions con alcance de elemento (Chrome 147).',
    ],
    code: {
      file: 'keyed.ts',
      text: `const nodes = new Map<string, HTMLElement>();
function upsert(item: Product) {
  let el = nodes.get(item.id);
  if (!el) nodes.set(item.id, (el = createCard(item)));
  patchText(el, item);   // solo lo que cambió
}`,
    },
    notes: 'Mismo stream en Mercadito: ~23.500 nodos creados con innerHTML vs ~340 con claves y slots reciclados. El parseo baja de ~17 ms a ~1 ms y los renders de 210 a 8.',
    time: '14:45',
    inSummary: true,
  },
  {
    id: 'reciclaje',
    label: 'Listas largas',
    kind: 'content',
    section: S4,
    title: 'Listas largas: recicla, virtualiza, contén',
    summary: [
      'Pool de nodos: los que salen de la vista se reutilizan para los que entran (virtualización).',
      'content-visibility: auto para secciones generadas que ya terminaron y están fuera de pantalla.',
      'Mide el tamaño del DOM y la memoria: DevTools for agents ya puede analizar heap snapshots.',
    ],
    notes: 'El MCP tiene tools de memoria (heap snapshots, nodos desconectados): útil cuando la UI generativa vive horas abierta.',
    time: '15:45',
    inSummary: true,
  },
  {
    id: 'sec-estado',
    label: '05 Estado',
    kind: 'content',
    section: S5,
    title: 'Estado y navegación',
    summary: ['Varios streams a la vez: el estado vive fuera del render y cada componente se suscribe solo a lo suyo.'],
    notes: 'Transición.',
    time: '16:30',
  },
  {
    id: 'estado',
    label: 'Estado fuera del render',
    kind: 'content',
    section: S5,
    title: 'Estado fuera del render, suscripciones finas',
    summary: [
      'Un store por stream: borrador (lo que llega) vs. confirmado (lo validado). Lo anterior se queda hasta su reemplazo.',
      'Suscripción por clave (signals, useSyncExternalStore): un token actualiza un componente, no la página.',
      'Lo derivado (totales, filtros, orden) lo calcula el código, no el modelo; lo pesado, en un Worker.',
    ],
    notes: 'En la demo: el botón "Ordenar por recomendación" corre un cálculo pesado. Roto: en el hilo principal. Arreglado: en un Worker.',
    time: '16:45',
    inSummary: true,
  },
  {
    id: 'softnav',
    label: 'Soft navigations',
    kind: 'content',
    section: S5,
    title: 'La UI generativa también navega: mide las soft navigations',
    summary: [
      'Soft navigation = interacción + cambio de URL + pintura visible, sin recargar el documento.',
      'Observa soft-navigation e interaction-contentful-paint para medir LCP, INP y CLS por vista.',
      'web-vitals v6 las reporta con { reportSoftNavs: true }.',
    ],
    code: {
      file: 'soft-navs.ts',
      text: `new PerformanceObserver((list) => {
  for (const nav of list.getEntries()) {
    report('soft-nav', nav.name, nav.navigationId);
  }
}).observe({ type: 'soft-navigation', buffered: true });

onLCP(send, { reportSoftNavs: true });`,
    },
    notes: 'Mercadito navega a /p/:id al abrir un producto: es una soft navigation. El HUD la cuenta.',
    time: '17:45',
    inSummary: true,
  },
  {
    id: 'demo',
    label: 'Demo · Mercadito',
    kind: 'demo',
    title: 'Demo: Mercadito, laboratorio de performance',
    summary: [
      'Mercadito: un asistente de compras generativo para el mercado de artesanías, con 5 interruptores roto/arreglado.',
      'El HUD mide en vivo CLS, INP, LoAF, nodos creados, ms de parseo y soft navigations.',
      '/compare.html: el mismo stream en dos iframes, roto vs. arreglado.',
    ],
    notes: 'DEMO 10 min. 1) compare.html. 2) Mercadito roto: graba trace, Insights → layout shift → Ask AI. 3) Enciende los arreglos uno a uno. 4) "Ordenar por recomendación" con CPU 4x: INP roto vs Worker. 5) Abre un producto: soft navigation en el HUD. 6) Prompt al agente con DevTools MCP.',
    time: '18:30',
    inSummary: true,
  },
  {
    id: 'receta',
    label: 'Receta con DevTools',
    kind: 'content',
    title: 'Receta: del síntoma al arreglo',
    summary: [
      '1. Reproduce con CPU calibrada y red lenta. 2. Graba el trace y abre Insights.',
      '3. Pregúntale a AI assistance sobre el insight. 4. Pide a tu agente (DevTools MCP) el fix y que vuelva a medir.',
      '5. Confirma en campo: RUM con web-vitals y CrUX, incluidas las soft navigations.',
    ],
    notes: 'Resumen de la demo en 5 pasos. Laboratorio → campo.',
    time: '28:30',
    inSummary: true,
  },
  {
    id: 'muro',
    label: 'Muro de quitapenas',
    kind: 'wall',
    title: 'El muro de quitapenas',
    summary: ['Las muñecas quitapenas de Guatemala guardan tus preocupaciones mientras duermes. Aquí guardan tus penas de performance.'],
    notes: 'Muestra el muro. Lee 2–3 penas en voz alta. Clic en una para ocultarla (moderación).',
    time: '29:00',
  },
  {
    id: 'checklist',
    label: 'Checklist',
    kind: 'content',
    title: '10 reglas para una UI generativa rápida',
    summary: [
      'Mide primero (DevTools + agentes) · Datos, no HTML · Reserva el espacio · Parser incremental · Un render por frame.',
      'Cede el hilo con scheduler.yield() · Claves estables · Recicla listas largas · Estado fuera del render · Mide las soft navigations.',
    ],
    notes: 'Las 10 reglas también están en el README y en su memoria descargable.',
    time: '29:20',
    inSummary: true,
  },
  {
    id: 'gracias',
    label: 'Gracias',
    kind: 'end',
    title: '¡Gracias, DevFest Guatemala!',
    summary: ['Descarga tu memoria de la charla: resumen, tus notas y tu quitapenas.'],
    notes: '"En su celular ya pueden descargar su memoria con el resumen, sus notas y su quitapenas." Preguntas.',
    time: '29:45',
  },
];

export const SLIDE_BY_ID = new Map(SLIDES.map((s) => [s.id, s]));

export const CHECKLIST = [
  ['Mide primero', 'Performance panel, AI assistance y DevTools for agents.'],
  ['Datos, no HTML', 'catálogo de componentes + JSON Schema.'],
  ['Reserva el espacio', 'min-height, aspect-ratio, contain-intrinsic-size.'],
  ['Parser incremental', 'cada carácter una sola vez.'],
  ['Un render por frame', 'requestAnimationFrame + cambios agrupados.'],
  ['Cede el hilo', 'scheduler.yield() y Workers para lo pesado.'],
  ['Claves estables', 'por id; View Transitions para mover.'],
  ['Recicla listas largas', 'virtualización y content-visibility.'],
  ['Estado fuera del render', 'suscripciones finas, lo derivado en código.'],
  ['Mide las soft navigations', 'web-vitals con reportSoftNavs y CrUX.'],
] as const;
