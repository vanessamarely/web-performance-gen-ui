// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { ACCESORIOS, DEFAULT_DOLL, normalizeDoll, quitapenasSVG, type QuitapenasOptions } from './quitapenas';

describe('normalizeDoll', () => {
  it('conserva índices válidos', () => {
    const o: QuitapenasOptions = { traje: 4, patron: 3, cabello: 4, piel: 4, accesorio: ACCESORIOS.length - 1, expresion: 3 };
    expect(normalizeDoll(o)).toEqual(o);
  });

  it('acota índices inválidos (fuera de rango, negativos, decimales, NaN) a 0', () => {
    expect(normalizeDoll({ traje: 99, patron: -1, cabello: 1.5, piel: Number.NaN, accesorio: Infinity, expresion: 4 })).toEqual({
      traje: 0,
      patron: 0,
      cabello: 0,
      piel: 0,
      accesorio: 0,
      expresion: 0,
    });
  });

  it('rellena lo que falta con los valores por omisión', () => {
    expect(normalizeDoll(null)).toEqual({ traje: 0, patron: 0, cabello: 0, piel: 1, accesorio: 0, expresion: 0 });
    expect(normalizeDoll({ traje: 2 })).toEqual({ traje: 2, patron: 0, cabello: 0, piel: 1, accesorio: 0, expresion: 0 });
  });
});

describe('quitapenasSVG', () => {
  const ids = (svg: string) => [...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);

  it('genera ids únicos por llamada', () => {
    const a = ids(quitapenasSVG(DEFAULT_DOLL));
    const b = ids(quitapenasSVG(DEFAULT_DOLL));
    expect(a.length).toBeGreaterThan(0);
    expect(new Set(a).size).toBe(a.length);
    expect(a.filter((id) => b.includes(id))).toEqual([]);
  });

  it('cada url(#…) apunta a un id del mismo SVG', () => {
    const svg = quitapenasSVG(DEFAULT_DOLL);
    const own = new Set(ids(svg));
    const refs = [...svg.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(0);
    for (const r of refs) expect(own).toContain(r);
  });
});
