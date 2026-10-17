// Catálogo cerrado (grounding): el "modelo" solo puede elegir productos que existen aquí.
// Productos y precios FICTICIOS, inspirados en artesanías, café y cacao de Guatemala.
export type Category = 'cafe' | 'cacao' | 'textil' | 'artesania';

export interface Product {
  id: string;
  name: string;
  category: Category;
  origin: string;
  price: number;
  rating: number;
  image: string;
}

export const CATALOG: Product[] = [
  { id: 'cafe-huehue', name: 'Café Huehuetenango, tueste medio', category: 'cafe', origin: 'Huehuetenango', price: 95, rating: 4.8, image: '/img/cafe-huehue.svg' },
  { id: 'cafe-acatenango', name: 'Café Acatenango, proceso natural', category: 'cafe', origin: 'Acatenango', price: 120, rating: 4.7, image: '/img/cafe-acatenango.svg' },
  { id: 'cafe-atitlan', name: 'Café Atitlán, proceso honey', category: 'cafe', origin: 'Lago de Atitlán', price: 110, rating: 4.6, image: '/img/cafe-atitlan.svg' },
  { id: 'cafe-coban', name: 'Café de Cobán, tueste oscuro', category: 'cafe', origin: 'Cobán', price: 85, rating: 4.4, image: '/img/cafe-coban.svg' },
  { id: 'cacao-coban', name: 'Chocolate 70 % de Cobán', category: 'cacao', origin: 'Alta Verapaz', price: 45, rating: 4.7, image: '/img/cacao-coban.svg' },
  { id: 'choco-cardamomo', name: 'Chocolate con cardamomo', category: 'cacao', origin: 'Antigua Guatemala', price: 55, rating: 4.9, image: '/img/choco-cardamomo.svg' },
  { id: 'nibs-peten', name: 'Nibs de cacao de Petén', category: 'cacao', origin: 'Petén', price: 40, rating: 4.3, image: '/img/nibs-peten.svg' },
  { id: 'huipil-chichi', name: 'Huipil bordado (réplica)', category: 'textil', origin: 'Chichicastenango', price: 480, rating: 4.9, image: '/img/huipil-chichi.svg' },
  { id: 'faja-toto', name: 'Faja tejida a mano', category: 'textil', origin: 'Totonicapán', price: 150, rating: 4.6, image: '/img/faja-toto.svg' },
  { id: 'bolso-corte', name: 'Bolso de tela de corte', category: 'textil', origin: 'Quetzaltenango', price: 175, rating: 4.5, image: '/img/bolso-corte.svg' },
  { id: 'hamaca-solola', name: 'Hamaca de algodón', category: 'textil', origin: 'Sololá', price: 320, rating: 4.4, image: '/img/hamaca-solola.svg' },
  { id: 'quitapenas-set', name: 'Muñecas quitapenas (set de 6)', category: 'artesania', origin: 'Antigua Guatemala', price: 35, rating: 4.8, image: '/img/quitapenas-set.svg' },
  { id: 'barrilete-mini', name: 'Barrilete de Sumpango (mini)', category: 'artesania', origin: 'Sumpango', price: 90, rating: 4.7, image: '/img/barrilete-mini.svg' },
  { id: 'jade-motagua', name: 'Dije de jade del Motagua', category: 'artesania', origin: 'Valle del Motagua', price: 260, rating: 4.6, image: '/img/jade-motagua.svg' },
  { id: 'mayolica-antigua', name: 'Plato de mayólica', category: 'artesania', origin: 'Antigua Guatemala', price: 140, rating: 4.5, image: '/img/mayolica-antigua.svg' },
  { id: 'miel-reu', name: 'Miel de abeja multifloral', category: 'artesania', origin: 'Retalhuleu', price: 60, rating: 4.4, image: '/img/miel-reu.svg' },
];

export const BY_ID = new Map(CATALOG.map((p) => [p.id, p]));
export const fmtQ = (n: number) => `Q${n.toLocaleString('es-GT')}`;
