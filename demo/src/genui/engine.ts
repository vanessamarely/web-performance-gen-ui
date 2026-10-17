// Motor de generación: devuelve el JSON de la UI como un stream de chunks de texto.
//  · simulado (por defecto): determinista, a N tokens/s, funciona sin red.
//  · Gemini Nano (?engine=nano): Prompt API con responseConstraint, si el equipo lo tiene.
import { CATALOG } from '../catalog';
import { TPS } from '../lab/flags';
import { detailResponse, homeResponse } from './responses';
import { HOME_SCHEMA } from './types';

export type View = { kind: 'home'; prompt: string } | { kind: 'detail'; id: string };

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => (clearTimeout(t), reject(new DOMException('abort', 'AbortError'))), { once: true });
  });

/** Divide el texto en "tokens" de 2–6 caracteres con una semilla fija (siempre igual). */
function tokenize(text: string): string[] {
  const out: string[] = [];
  let seed = 7;
  for (let i = 0; i < text.length; ) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const n = 2 + (seed % 5);
    out.push(text.slice(i, i + n));
    i += n;
  }
  return out;
}

async function* mockStream(view: View, signal: AbortSignal): AsyncGenerator<string> {
  const json = JSON.stringify(view.kind === 'home' ? homeResponse(view.prompt) : detailResponse(view.id), null, 2);
  const tokens = tokenize(json);
  // Como en la red real: cada lectura del stream trae VARIOS eventos SSE juntos (ráfaga).
  // Los 4 eventos de una ráfaga se procesan en la MISMA tarea: si renderizas por evento, se nota.
  const TICK = 100;
  const BURST = 4;
  const perEvent = Math.max(1, Math.round((TPS * TICK) / 1000 / BURST));
  await sleep(view.kind === 'home' ? 350 : 200, signal); // "time to first token"
  for (let i = 0; i < tokens.length; ) {
    for (let b = 0; b < BURST && i < tokens.length; b++, i += perEvent) yield tokens.slice(i, i + perEvent).join('');
    await sleep(TICK, signal);
  }
}

interface LanguageModelLike {
  availability(): Promise<string>;
  create(o?: unknown): Promise<{ promptStreaming(p: string, o?: unknown): AsyncIterable<string> & ReadableStream<string>; destroy(): void }>;
}

async function* nanoStream(view: View, signal: AbortSignal): AsyncGenerator<string> {
  const LM = (globalThis as unknown as { LanguageModel?: LanguageModelLike }).LanguageModel;
  if (!LM || (await LM.availability()) !== 'available' || view.kind !== 'home') {
    yield* mockStream(view, signal);
    return;
  }
  const session = await LM.create({ signal });
  const ids = CATALOG.map((p) => `${p.id} (${p.name}, ${p.category}, Q${p.price})`).join('\n');
  const prompt = `Eres el asistente de un mercado de artesanías de Guatemala. Responde SOLO con JSON que cumpla el schema.
Elige de 6 a 8 productos de esta lista (usa el id exacto):\n${ids}\nImágenes de hero válidas: /img/hero-cafe.svg, /img/hero-regalo.svg, /img/hero-textil.svg, /img/hero-cacao.svg.
Petición: ${view.prompt}`;
  try {
    for await (const chunk of session.promptStreaming(prompt, { responseConstraint: HOME_SCHEMA, signal })) yield chunk;
  } finally {
    session.destroy();
  }
}

export const engineName = () => (new URLSearchParams(location.search).get('engine') === 'nano' ? 'Gemini Nano (si está disponible)' : 'simulado determinista');

export function streamUI(view: View, signal: AbortSignal): AsyncGenerator<string> {
  return new URLSearchParams(location.search).get('engine') === 'nano' ? nanoStream(view, signal) : mockStream(view, signal);
}
