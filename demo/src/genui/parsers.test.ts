import { describe, expect, it } from 'vitest';
import { IncrementalParser, NaiveParser, type Parser } from './parsers';
import { detailResponse, homeResponse } from './responses';

const chunks = (text: string, size: number) => Array.from({ length: Math.ceil(text.length / size) }, (_, i) => text.slice(i * size, (i + 1) * size));

function feed(parser: Parser, text: string, size: number) {
  let state = {};
  for (const c of chunks(text, size)) state = parser.push(c).state;
  return state;
}

// Mismo formato que usa engine.ts (con sangría) y también compacto.
const cases = [
  ['home', homeResponse('café para regalar')],
  ['detail', detailResponse('cafe-huehue')],
] as const;
const texts = cases.flatMap(([name, value]) => [
  [`${name} (pretty)`, JSON.stringify(value, null, 2)],
  [`${name} (compacto)`, JSON.stringify(value)],
]);

describe.each(texts)('parsers · %s', (_name, text) => {
  const expected = JSON.parse(text);

  it.each([1, 4, 37])('IncrementalParser con chunks de %i llega al mismo estado que JSON.parse', (size) => {
    expect(feed(new IncrementalParser(), text, size)).toEqual(expected);
  });

  it.each([1, 4, 37])('NaiveParser con chunks de %i llega al mismo estado que JSON.parse', (size) => {
    expect(feed(new NaiveParser(), text, size)).toEqual(expected);
  });

  it.each([1, 4, 37])('IncrementalParser recorre cada carácter una sola vez (chunks de %i)', (size) => {
    const parser = new IncrementalParser();
    feed(parser, text, size);
    expect(parser.scanned).toBe(text.length);
  });
});
