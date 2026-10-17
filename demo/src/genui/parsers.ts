// Dos formas de convertir el stream en estado de UI.
//
// ROTO  · NaiveParser: en cada chunk "repara" el buffer completo (cierra strings y llaves)
//         y hace JSON.parse de TODO. Con n caracteres → O(n²) en total. Es lo que hacen
//         muchos "partial JSON" ingenuos y la razón de muchos long tasks en UI generativa.
// ARREGLADO · IncrementalParser: recorre cada carácter UNA vez, sabe en qué profundidad está
//         y emite eventos solo cuando un valor de interés se completa (O(n) en total).
import type { UIState } from './types';

export interface ParseResult {
  /** Estado nuevo o actualizado (para el renderer) */
  state: UIState;
  /** ¿Cambió algo visible? */
  changed: boolean;
}

export interface Parser {
  push(chunk: string): ParseResult;
  /** Caracteres "procesados" acumulados: muestra la diferencia O(n) vs O(n²). */
  scanned: number;
}

/** Cierra lo que esté abierto para que JSON.parse acepte un prefijo. */
function repair(buf: string): string {
  const stack: string[] = [];
  let inStr = false;
  let esc = false;
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') stack.push('}');
    else if (c === '[') stack.push(']');
    else if (c === '}' || c === ']') stack.pop();
  }
  let out = buf;
  if (inStr) out += '"';
  out = out.replace(/[,:\s]+$/, '').replace(/,\s*"[^"]*"$/, '').replace(/"[^"]*"\s*$/, (m) => (/[{,]\s*"[^"]*"\s*$/.test(out) && !/:\s*"[^"]*"\s*$/.test(out) ? '' : m));
  out = out.replace(/[,:\s]+$/, '');
  return out + stack.reverse().join('');
}

export class NaiveParser implements Parser {
  private buf = '';
  private last: UIState = {};
  scanned = 0;
  push(chunk: string): ParseResult {
    this.buf += chunk;
    this.scanned += this.buf.length * 2; // repair + JSON.parse recorren todo el buffer
    try {
      this.last = JSON.parse(repair(this.buf));
      return { state: this.last, changed: true };
    } catch {
      return { state: this.last, changed: false };
    }
  }
}

/**
 * Parser incremental mínimo para el contrato de la UI:
 *  · propiedades de primer nivel (hero, compare, tips, promo, story…) → se emiten completas
 *  · objetos dentro de arrays de primer nivel (products[], pairings[]) → uno por uno
 * Cada carácter se recorre una sola vez; JSON.parse solo toca el fragmento de cada valor terminado.
 */
export class IncrementalParser implements Parser {
  private buf = '';
  private pos = 0;
  private depth = 0;
  private inStr = false;
  private esc = false;
  private strStart = -1;
  private key: string | null = null;
  private expectValue = false;
  private valueStart = -1;
  private valueIsString = false;
  private arrayKey: string | null = null;
  private itemStart = -1;
  private state: Record<string, unknown> = {};
  scanned = 0;

  push(chunk: string): ParseResult {
    this.buf += chunk;
    const s = this.buf;
    let changed = false;
    for (; this.pos < s.length; this.pos++) {
      const c = s[this.pos];
      this.scanned++;
      if (this.inStr) {
        if (this.esc) this.esc = false;
        else if (c === '\\') this.esc = true;
        else if (c === '"') {
          this.inStr = false;
          if (this.depth === 1) {
            const str = JSON.parse(s.slice(this.strStart, this.pos + 1));
            if (this.valueIsString) {
              this.state[this.key!] = str;
              this.valueIsString = false;
              this.valueStart = -1;
              changed = true;
            } else this.key = str;
          }
        }
        continue;
      }
      switch (c) {
        case '"':
          this.inStr = true;
          this.strStart = this.pos;
          if (this.depth === 1 && this.expectValue) {
            this.expectValue = false;
            this.valueIsString = true;
            this.valueStart = this.pos;
          }
          break;
        case ':':
          if (this.depth === 1) this.expectValue = true;
          break;
        case '{':
        case '[':
          if (this.depth === 1 && this.expectValue) {
            this.expectValue = false;
            this.valueStart = this.pos;
            if (c === '[') {
              this.arrayKey = this.key;
              this.state[this.key!] = [];
            }
          } else if (this.depth === 2 && this.arrayKey && c === '{') this.itemStart = this.pos;
          this.depth++;
          break;
        case '}':
        case ']':
          this.depth--;
          if (this.depth === 2 && this.arrayKey && this.itemStart >= 0) {
            // Un ítem del array terminó: lo emitimos ya (la tarjeta aparece completa).
            (this.state[this.arrayKey] as unknown[]).push(JSON.parse(s.slice(this.itemStart, this.pos + 1)));
            this.itemStart = -1;
            changed = true;
          } else if (this.depth === 1 && this.valueStart >= 0) {
            // El valor de primer nivel terminó (objeto o array completo).
            this.state[this.key!] = JSON.parse(s.slice(this.valueStart, this.pos + 1));
            this.valueStart = -1;
            this.arrayKey = null;
            changed = true;
          }
          break;
      }
    }
    return { state: this.state as UIState, changed };
  }
}
