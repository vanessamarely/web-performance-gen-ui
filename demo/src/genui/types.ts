// Contrato de la UI generativa: el modelo devuelve DATOS de un catálogo de componentes.
// El orden de las propiedades está pensado para el streaming: lo de arriba del pliegue primero.
export interface HeroBlock {
  title: string;
  subtitle: string;
  image: string;
}
export interface ProductPick {
  id: string;
  reason: string;
  tag: string;
  highlights: string[];
}
export interface CompareBlock {
  title: string;
  columns: string[];
  rows: string[][];
}
export interface Tip {
  title: string;
  text: string;
}
export interface Promo {
  text: string;
  code: string;
}

/** Vista de inicio: búsqueda generada a partir del prompt. */
export interface HomeUI {
  hero: HeroBlock;
  products: ProductPick[];
  compare: CompareBlock;
  tips: Tip[];
  promo: Promo;
}

/** Vista de detalle (soft navigation a /p/:id). */
export interface DetailUI {
  hero: HeroBlock;
  story: string;
  specs: string[][];
  pairings: ProductPick[];
}

export type UIState = Partial<HomeUI & DetailUI>;

/** JSON Schema (para Prompt API `responseConstraint` o Gemini `responseJsonSchema`). */
export const HOME_SCHEMA = {
  type: 'object',
  properties: {
    hero: { type: 'object', properties: { title: { type: 'string' }, subtitle: { type: 'string' }, image: { type: 'string' } }, required: ['title', 'subtitle', 'image'] },
    products: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, reason: { type: 'string' }, tag: { type: 'string' }, highlights: { type: 'array', items: { type: 'string' }, maxItems: 3 } },
        required: ['id', 'reason', 'tag', 'highlights'],
      },
    },
    compare: { type: 'object', properties: { title: { type: 'string' }, columns: { type: 'array', items: { type: 'string' } }, rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } } } },
    tips: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, text: { type: 'string' } } } },
    promo: { type: 'object', properties: { text: { type: 'string' }, code: { type: 'string' } } },
  },
  required: ['hero', 'products', 'compare', 'tips', 'promo'],
} as const;
