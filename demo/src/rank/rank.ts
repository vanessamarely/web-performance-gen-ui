// "Recomendador" pesado del lado del cliente: puntúa cada producto contra millones de
// señales sintéticas (como un modelito de embeddings). Determinista y sin memoria extra.
// En el hilo principal bloquea el clic (INP alto); en un Worker, la UI sigue respondiendo.
export interface RankInput {
  ids: string[];
  work: number;
}

export function rankProducts({ ids, work }: RankInput): { ids: string[]; ms: number } {
  const t0 = performance.now();
  const scores = new Map<string, number>();
  const N = Math.round(8_000_000 * work);
  for (const id of ids) {
    let seed = 0;
    for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) | 0;
    let acc = 0;
    for (let i = 0; i < N; i++) {
      // xorshift32 + producto punto "de 1 dimensión": barato por iteración, caro en total.
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      acc += ((seed & 0xffff) / 0xffff) * Math.sin(i & 63);
    }
    scores.set(id, acc / N);
  }
  return { ids: [...ids].sort((a, b) => scores.get(b)! - scores.get(a)!), ms: performance.now() - t0 };
}
