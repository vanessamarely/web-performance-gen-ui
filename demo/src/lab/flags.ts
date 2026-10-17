// Interruptores del laboratorio: cada uno enciende (arreglado) o apaga (roto) una técnica.
// ?preset=broken | fixed fuerza todos; si no, se recuerdan en localStorage.
export interface Flags {
  /** Slots con altura final, imágenes con dimensiones y el banner tardío en espacio reservado (CLS). */
  reserve: boolean;
  /** Parser incremental O(n) en vez de JSON.parse del buffer completo en cada token. */
  incremental: boolean;
  /** Un render por frame (rAF) + scheduler.yield() en vez de renderizar en cada chunk. */
  frame: boolean;
  /** Claves estables (actualiza nodos) en vez de innerHTML de toda la vista. */
  keyed: boolean;
  /** Ranking pesado en un Web Worker en vez del hilo principal (INP). */
  worker: boolean;
}

export const FLAG_META: { key: keyof Flags; label: string; metric: string; broken: string; fixed: string }[] = [
  { key: 'reserve', label: 'Reservar espacio', metric: 'CLS', broken: 'Componentes sin altura, imágenes sin dimensiones y un banner que entra arriba.', fixed: 'Slots con su altura final, aspect-ratio y banner con espacio reservado.' },
  { key: 'incremental', label: 'Parser incremental', metric: 'ms de parseo', broken: 'Repara y hace JSON.parse de TODO el buffer en cada chunk: O(n²).', fixed: 'Cada carácter se procesa una vez y emite ítems completos: O(n).' },
  { key: 'frame', label: 'Un render por frame', metric: 'LoAF', broken: 'Renderiza en cada chunk de forma síncrona.', fixed: 'Agrupa con requestAnimationFrame y cede con scheduler.yield().' },
  { key: 'keyed', label: 'Claves estables', metric: 'nodos creados', broken: 'innerHTML de toda la vista en cada actualización.', fixed: 'Un nodo por id; solo se actualiza el texto que cambió.' },
  { key: 'worker', label: 'Ranking en un Worker', metric: 'INP', broken: '"Ordenar por recomendación" calcula en el hilo principal.', fixed: 'El cálculo corre en un Web Worker; la UI responde al instante.' },
];

const params = new URLSearchParams(location.search);
const ALL = (v: boolean): Flags => ({ reserve: v, incremental: v, frame: v, keyed: v, worker: v });

function initial(): Flags {
  const preset = params.get('preset');
  if (preset === 'broken') return ALL(false);
  if (preset === 'fixed') return ALL(true);
  try {
    return { ...ALL(false), ...JSON.parse(localStorage.getItem('mercadito.flags') ?? '{}') };
  } catch {
    return ALL(false);
  }
}

export const flags: Flags = initial();
const listeners = new Set<() => void>();

export function setFlag(key: keyof Flags, on: boolean) {
  flags[key] = on;
  persist();
}
export function setAll(on: boolean) {
  Object.assign(flags, ALL(on));
  persist();
}
function persist() {
  if (!params.has('preset')) {
    try {
      localStorage.setItem('mercadito.flags', JSON.stringify(flags));
    } catch {
      /* noop */
    }
  }
  listeners.forEach((l) => l());
}
export function onFlags(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Tokens por segundo del "modelo" (configurable para ensayar). */
export const TPS = Number(params.get('tps')) || 220;
/** Multiplicador de trabajo del ranking (sube a 2–3 en laptops muy rápidas). */
export const WORK = Number(params.get('work')) || 1;

/**
 * CPU simulada (plan B si no puedes usar el throttling de DevTools): después de cada parseo
 * y render, la página "gira" (factor − 1) × lo que tardó, como un celular más lento.
 * Lo correcto en la charla es DevTools → Performance → CPU 4× o un nivel de CPU calibrado.
 */
export const cpu = { factor: Number(params.get('cpu')) || 1 };
export function burn(ms: number) {
  if (cpu.factor <= 1) return;
  const end = performance.now() + ms * (cpu.factor - 1);
  while (performance.now() < end) {
    /* trabajo sintético */
  }
}
