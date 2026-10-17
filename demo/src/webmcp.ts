// WebMCP: Mercadito se ofrece como herramientas para agentes del navegador.
// Con Chrome DevTools MCP (--categoryExperimentalWebmcp=true) tu agente puede listar y
// ejecutar estas tools… y medir el INP de las interacciones que dispara.
// Si el navegador no trae la API, las mismas funciones quedan en window.mercadito.
import { CATALOG } from './catalog';
import { flags, setFlag, type Flags } from './lab/flags';
import { metrics } from './lab/metrics';

interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute(args: Record<string, unknown>): Promise<{ content: { type: 'text'; text: string }[] }>;
}
type ModelContext = { registerTool(t: ToolDef): void };

export interface MercaditoApi {
  generate(prompt: string): Promise<void>;
  open(id: string): Promise<void>;
  rank(): Promise<void>;
}

const text = (v: unknown) => ({ content: [{ type: 'text' as const, text: typeof v === 'string' ? v : JSON.stringify(v) }] });

export function registerTools(api: MercaditoApi) {
  const tools: ToolDef[] = [
    {
      name: 'generar_resultados',
      description: 'Genera la página de resultados de Mercadito a partir de una petición en lenguaje natural (p. ej. "regalo de café bajo Q200").',
      inputSchema: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] },
      execute: async ({ prompt }) => (await api.generate(String(prompt)), text(`Listo: ${metrics.status}`)),
    },
    {
      name: 'abrir_producto',
      description: 'Abre el detalle de un producto (soft navigation a /p/:id).',
      inputSchema: { type: 'object', properties: { id: { type: 'string', enum: CATALOG.map((p) => p.id) } }, required: ['id'] },
      execute: async ({ id }) => (await api.open(String(id)), text(`Abierto /p/${id}`)),
    },
    {
      name: 'ordenar_por_recomendacion',
      description: 'Ordena los resultados con el recomendador (cálculo pesado: útil para medir INP).',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => (await api.rank(), text(`Ranking en ${Math.round(metrics.rankMs)} ms (${flags.worker ? 'Worker' : 'hilo principal'})`)),
    },
    {
      name: 'configurar_laboratorio',
      description: 'Enciende (arreglado) o apaga (roto) una técnica: reserve, incremental, frame, keyed, worker.',
      inputSchema: { type: 'object', properties: { flag: { type: 'string', enum: Object.keys(flags) }, on: { type: 'boolean' } }, required: ['flag', 'on'] },
      execute: async ({ flag, on }) => (setFlag(flag as keyof Flags, Boolean(on)), text(flags)),
    },
    {
      name: 'leer_metricas',
      description: 'Devuelve las métricas de laboratorio actuales (CLS, INP, LoAF, nodos creados, parseo, soft navs).',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => text(metrics),
    },
  ];
  const ctx = (navigator as Navigator & { modelContext?: ModelContext }).modelContext ?? (document as Document & { modelContext?: ModelContext }).modelContext;
  if (ctx) tools.forEach((t) => ctx.registerTool(t));
  (window as unknown as { mercadito: unknown }).mercadito = { ...api, tools, flags, metrics, webmcp: Boolean(ctx) };
  return Boolean(ctx);
}
