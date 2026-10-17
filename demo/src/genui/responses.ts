// "Modelo" simulado y determinista: el mismo prompt produce siempre el mismo JSON.
// Así las comparaciones roto vs. arreglado son justas y la demo funciona sin red.
import { BY_ID, CATALOG, fmtQ, type Category } from '../catalog';
import type { DetailUI, HomeUI, ProductPick } from './types';

const REASONS: Record<Category, string[]> = {
  cafe: [
    'Notas de chocolate y frutos rojos; de altura, ideal para filtrado o prensa francesa.',
    'Cultivado a más de 1.500 metros: acidez brillante y cuerpo medio, perfecto para regalar.',
    'Proceso cuidadoso por cooperativas locales; trazable desde la finca hasta tu taza.',
    'Tueste reciente y empaque con válvula: llega fresco y aromático.',
  ],
  cacao: [
    'Cacao fino de aroma con notas a frutos secos; poca azúcar y mucho sabor.',
    'Hecho en pequeños lotes; combina tradición maya del cacao con técnicas actuales.',
    'Ideal para acompañar café: equilibrio entre amargor y dulzor.',
  ],
  textil: [
    'Tejido en telar de cintura con patrones que cuentan la historia de su comunidad.',
    'Colores vivos teñidos a mano; cada pieza es única y ligeramente distinta.',
    'Pieza artesanal: comprarla apoya directamente a las tejedoras.',
  ],
  artesania: [
    'Hecho a mano por artesanos locales; un recuerdo lleno de identidad guatemalteca.',
    'Liviano y fácil de llevar en la maleta; un detalle con historia.',
    'Perfecto como regalo: viene con una tarjeta que explica su tradición.',
  ],
};
const HIGHLIGHTS: Record<Category, string[]> = {
  cafe: ['Grano entero', 'Tueste de esta semana', 'Cooperativa local', 'Altura > 1.500 m', 'Notas a cacao', 'Taza limpia'],
  cacao: ['70 % cacao', 'Sin aditivos', 'Lote pequeño', 'Receta tradicional', 'Ideal con café'],
  textil: ['Telar de cintura', 'Tinte natural', 'Pieza única', 'Hecho a mano', 'Algodón local'],
  artesania: ['Hecho a mano', 'Liviano', 'Con historia', 'Ideal para regalo', 'Pieza local'],
};
const TAGS = ['Más vendido', 'Para regalar', 'Edición local', 'Favorito del mercado', 'Nuevo', 'Comercio justo'];

type Intent = { focus: Category[]; hero: string; title: string; subtitle: string; budget?: number };

function intentOf(prompt: string): Intent {
  const p = prompt.toLowerCase();
  const budget = Number(p.match(/q\s?(\d{2,4})/)?.[1]) || undefined;
  if (/caf[eé]/.test(p)) return { focus: ['cafe', 'cacao'], hero: '/img/hero-cafe.svg', title: 'Café de altura para regalar', subtitle: 'Seleccionamos cafés de cinco regiones y unos chocolates para acompañar.', budget };
  if (/(textil|tejid|huipil|faja|ropa)/.test(p)) return { focus: ['textil', 'artesania'], hero: '/img/hero-textil.svg', title: 'Textiles tejidos a mano', subtitle: 'Piezas de telar de cintura y de pie, con historia y color.', budget };
  if (/(cacao|chocolate)/.test(p)) return { focus: ['cacao', 'cafe'], hero: '/img/hero-cacao.svg', title: 'Cacao guatemalteco', subtitle: 'Del cacao de Cobán al chocolate con cardamomo de Antigua.', budget };
  return { focus: ['artesania', 'cafe', 'cacao', 'textil'], hero: '/img/hero-regalo.svg', title: 'Regalos con historia', subtitle: 'Una selección del mercado para llevar un pedacito de Guatemala.', budget };
}

/** Respuesta de la vista de inicio (≈ 6–7 KB de JSON, como un modelo real con razones). */
export function homeResponse(prompt: string): HomeUI {
  const it = intentOf(prompt);
  const ranked = [...CATALOG].sort((a, b) => {
    const fa = it.focus.indexOf(a.category);
    const fb = it.focus.indexOf(b.category);
    return (fa < 0 ? 9 : fa) - (fb < 0 ? 9 : fb) || b.rating - a.rating;
  });
  const within = it.budget ? ranked.filter((p) => p.price <= it.budget!) : ranked;
  const picks = (within.length >= 6 ? within : ranked).slice(0, 8);
  const products: ProductPick[] = picks.map((p, i) => ({
    id: p.id,
    tag: TAGS[i % TAGS.length],
    reason: `${REASONS[p.category][i % REASONS[p.category].length]} ${REASONS[p.category][(i + 1) % REASONS[p.category].length]} Origen: ${p.origin}, ${fmtQ(p.price)}.`,
    highlights: [0, 1, 2].map((k) => HIGHLIGHTS[p.category][(i + k) % HIGHLIGHTS[p.category].length]),
  }));
  return {
    hero: { title: it.title, subtitle: it.budget ? `${it.subtitle} Todo por debajo de ${fmtQ(it.budget)}.` : it.subtitle, image: it.hero },
    products,
    compare: {
      title: 'Comparativa rápida',
      columns: ['Producto', 'Origen', 'Precio', 'Valoración'],
      rows: picks.map((p) => [p.name, p.origin, fmtQ(p.price), `${p.rating.toFixed(1)} ★`]),
    },
    tips: [
      { title: 'Cómo guardarlo', text: 'El café en grano dura más: guárdalo en un frasco hermético lejos de la luz y muélelo justo antes de preparar.' },
      { title: 'Para viajar', text: 'Los textiles se doblan mejor en rollo; el chocolate, en la maleta de mano si viajas a un lugar caluroso.' },
      { title: 'Regalo perfecto', text: 'Combina un café de altura con un chocolate con cardamomo y unas muñecas quitapenas: sabor, aroma y una tradición para contar.' },
      { title: 'Comercio justo', text: 'Pregunta por la cooperativa o la artesana: el sello de origen ayuda a que el ingreso llegue a quien produce.' },
    ],
    promo: { text: 'Envío gratis a todo Guatemala en compras mayores a Q300', code: 'DEVFESTGT' },
  };
}

/** Respuesta de la vista de detalle (soft navigation). */
export function detailResponse(id: string): DetailUI {
  const p = BY_ID.get(id) ?? CATALOG[0];
  const pairings = CATALOG.filter((x) => x.id !== p.id && x.category !== p.category)
    .slice(0, 3)
    .map((x, i) => ({ id: x.id, tag: 'Combina bien', reason: REASONS[x.category][i % REASONS[x.category].length], highlights: HIGHLIGHTS[x.category].slice(0, 2) }));
  return {
    hero: { title: p.name, subtitle: `${p.origin} · ${fmtQ(p.price)} · ${p.rating.toFixed(1)} ★`, image: p.image },
    story: `${REASONS[p.category].join(' ')} Esta pieza viene de ${p.origin}, donde la producción se hace en pequeñas cantidades. La recomendación se generó con el catálogo del mercado: el modelo solo puede elegir productos que existen.`,
    specs: [
      ['Origen', p.origin],
      ['Categoría', p.category],
      ['Precio', fmtQ(p.price)],
      ['Valoración', `${p.rating.toFixed(1)} de 5`],
      ['Envío', '2 a 4 días hábiles'],
    ],
    pairings,
  };
}
