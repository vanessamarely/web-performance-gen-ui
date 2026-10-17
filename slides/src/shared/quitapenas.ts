// Crea tu quitapenas: avatar inspirado en las muñecas quitapenas de Guatemala.
// Según la tradición, le cuentas tu pena antes de dormir, lo pones bajo la almohada
// y en la mañana la pena ya no está. Aquí guardan tus penas de performance.
//
// Todo se dibuja en el dispositivo con SVG (y canvas para el PNG): sin red, sin fotos.
// Al muro solo viajan las opciones (pocos bytes); el deck vuelve a dibujar el SVG.
import { EVENT, SPEAKER, SPEAKER_HANDLE, TALK_TITLE } from './config';

export interface QuitapenasOptions {
  traje: number;
  patron: number;
  cabello: number;
  piel: number;
  accesorio: number;
  expresion: number;
}

export const DEFAULT_DOLL: QuitapenasOptions = { traje: 0, patron: 0, cabello: 0, piel: 1, accesorio: 3, expresion: 0 };

/** Paletas del traje: [base, acento, acento 2, faja] — colores de Google + jacaranda de Antigua. */
export const TRAJES = [
  { label: 'Lago de Atitlán', c: ['#4285f4', '#57caff', '#c3ecf6', '#f9ab00'] },
  { label: 'Chichicastenango', c: ['#ea4335', '#ff7daf', '#ffd427', '#34a853'] },
  { label: 'Quetzal', c: ['#34a853', '#5cdb6d', '#ea4335', '#ffd427'] },
  { label: 'Maíz', c: ['#f9ab00', '#ffd427', '#ea4335', '#4285f4'] },
  { label: 'Jacaranda', c: ['#8430ce', '#c3a6ff', '#ff7daf', '#5cdb6d'] },
] as const;

export const PATRONES = ['Rombos', 'Zigzag', 'Rayas', 'Cruces'] as const;
export const CABELLOS = ['Trenzas', 'Tocoyal', 'Moño', 'Sombrero', 'Corto'] as const;
export const PIELES = ['#f6d3b3', '#e8b48a', '#c98b5e', '#9a6440', '#6b4329'] as const;
export const ACCESORIOS = ['Ninguno', 'Canasta', 'Laptop', 'Quetzal', 'Café', 'Barrilete'] as const;
export const EXPRESIONES = ['Sonrisa', 'Guiño', 'Sorpresa', 'Dormido'] as const;

/** Penas de performance (lista cerrada: nada de texto libre llega al proyector). */
export const PENAS = [
  'Mi CLS no baja de 0,25',
  'Mi INP pasa de 500 ms',
  'Long tasks por todos lados',
  'El bundle pesa 4 MB',
  'El modelo tarda en responder',
  'Re-renders en cada token',
  'Fugas de memoria',
  'Mis soft navs no se miden',
  'Hidratación eterna',
  'Imágenes sin dimensiones',
  'Scripts de terceros que bloquean',
  'Nadie mide en producción',
] as const;

export const LEYENDA =
  'Según la tradición guatemalteca, le cuentas tu pena al quitapenas antes de dormir, lo pones bajo la almohada y, al despertar, la pena ya no está.';

const INK = '#1e1e1e';
const HAIR = '#2b2118';
let seq = 0;

const clampIdx = (n: number, len: number) => (Number.isInteger(n) && n >= 0 && n < len ? n : 0);

export function normalizeDoll(o: Partial<QuitapenasOptions> | null | undefined): QuitapenasOptions {
  return {
    traje: clampIdx(o?.traje ?? 0, TRAJES.length),
    patron: clampIdx(o?.patron ?? 0, PATRONES.length),
    cabello: clampIdx(o?.cabello ?? 0, CABELLOS.length),
    piel: clampIdx(o?.piel ?? 1, PIELES.length),
    accesorio: clampIdx(o?.accesorio ?? 0, ACCESORIOS.length),
    expresion: clampIdx(o?.expresion ?? 0, EXPRESIONES.length),
  };
}

export function randomDoll(): QuitapenasOptions {
  const r = (n: number) => Math.floor(Math.random() * n);
  return { traje: r(TRAJES.length), patron: r(PATRONES.length), cabello: r(CABELLOS.length), piel: r(PIELES.length), accesorio: r(ACCESORIOS.length), expresion: r(EXPRESIONES.length) };
}

/** Patrón del huipil (tejido) como <pattern> con id único por dibujo. */
function patternDef(id: string, kind: number, [base, a1, a2]: readonly string[]): string {
  const bg = `<rect width="16" height="16" fill="${base}"/>`;
  switch (kind) {
    case 1: // zigzag
      return `<pattern id="${id}" width="16" height="10" patternUnits="userSpaceOnUse"><rect width="16" height="10" fill="${base}"/><path d="M0 7 L4 3 L8 7 L12 3 L16 7" fill="none" stroke="${a1}" stroke-width="2.2"/><path d="M0 10 L4 6 L8 10 L12 6 L16 10" fill="none" stroke="${a2}" stroke-width="1.2"/></pattern>`;
    case 2: // rayas
      return `<pattern id="${id}" width="16" height="12" patternUnits="userSpaceOnUse"><rect width="16" height="12" fill="${base}"/><rect y="2" width="16" height="3" fill="${a1}"/><rect y="8" width="16" height="1.5" fill="${a2}"/></pattern>`;
    case 3: // cruces (tejido pixelado)
      return `<pattern id="${id}" width="16" height="16" patternUnits="userSpaceOnUse">${bg}<path d="M6 2h4v4h4v4h-4v4H6v-4H2V6h4z" fill="${a1}"/><rect x="7" y="7" width="2" height="2" fill="${a2}"/></pattern>`;
    default: // rombos
      return `<pattern id="${id}" width="16" height="16" patternUnits="userSpaceOnUse">${bg}<path d="M8 1 L15 8 L8 15 L1 8 Z" fill="${a1}"/><path d="M8 5 L11 8 L8 11 L5 8 Z" fill="${a2}"/></pattern>`;
  }
}

function hairBack(cabello: number, [, a1, a2]: readonly string[]): string {
  if (cabello === 0)
    // Trenzas a los lados, con cintas de colores
    return `<g stroke="${INK}" stroke-width="2">
      <path d="M72 96 C60 140 64 170 70 196" fill="none" stroke="${HAIR}" stroke-width="16" stroke-linecap="round"/>
      <path d="M168 96 C180 140 176 170 170 196" fill="none" stroke="${HAIR}" stroke-width="16" stroke-linecap="round"/>
      <rect x="61" y="186" width="18" height="9" rx="3" fill="${a1}"/><rect x="161" y="186" width="18" height="9" rx="3" fill="${a2}"/>
    </g>`;
  if (cabello === 2) return `<circle cx="120" cy="40" r="20" fill="${HAIR}" stroke="${INK}" stroke-width="2"/>`;
  return '';
}

function hairFront(cabello: number, [base, a1, a2, faja]: readonly string[], pid: string): string {
  const cap = `<path d="M68 96 C66 52 94 38 120 38 C146 38 174 52 172 96 C160 72 140 64 120 66 C100 64 80 72 68 96 Z" fill="${HAIR}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
  switch (cabello) {
    case 1: // Tocoyal: la cinta enrollada como corona (Santiago Atitlán)
      return `${cap}<ellipse cx="120" cy="58" rx="64" ry="18" fill="url(#${pid})" stroke="${INK}" stroke-width="2"/>
        <ellipse cx="120" cy="58" rx="64" ry="18" fill="none" stroke="${faja}" stroke-width="5" stroke-dasharray="14 8"/>
        <ellipse cx="120" cy="55" rx="32" ry="8" fill="${HAIR}" stroke="${INK}" stroke-width="2"/>`;
    case 2: // Moño con listón
      return `${cap}<path d="M100 42 L86 30 L88 50 Z M140 42 L154 30 L152 50 Z" fill="${a1}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><circle cx="120" cy="42" r="6" fill="${a2}" stroke="${INK}" stroke-width="2"/>`;
    case 3: // Sombrero de palma (traje de Sololá)
      return `<path d="M76 92 C74 70 92 62 120 62 C148 62 166 70 164 92 C152 80 136 76 120 77 C104 76 88 80 76 92 Z" fill="${HAIR}" stroke="${INK}" stroke-width="2"/>
        <ellipse cx="120" cy="58" rx="78" ry="14" fill="#e9c77b" stroke="${INK}" stroke-width="2"/>
        <path d="M88 56 C88 30 100 22 120 22 C140 22 152 30 152 56 Z" fill="#f3d58f" stroke="${INK}" stroke-width="2"/>
        <rect x="88" y="44" width="64" height="9" fill="${base}" stroke="${INK}" stroke-width="1.5"/>
        <path d="M92 48.5 H148" stroke="${a1}" stroke-width="3" stroke-dasharray="5 4"/>`;
    case 4: // Corto
      return `<path d="M68 94 C64 50 94 36 120 36 C150 36 176 50 172 94 C168 78 160 70 150 66 C142 76 124 80 104 76 C92 74 80 80 68 94 Z" fill="${HAIR}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
    default: // Trenzas: raya al medio
      return `${cap}<path d="M120 40 L120 64" stroke="#4a3a2c" stroke-width="2"/>`;
  }
}

function face(expresion: number): string {
  const cheeks = `<circle cx="94" cy="116" r="7" fill="#ff7daf" opacity=".55"/><circle cx="146" cy="116" r="7" fill="#ff7daf" opacity=".55"/>`;
  switch (expresion) {
    case 1: // guiño
      return `<circle cx="102" cy="100" r="5" fill="${INK}"/><path d="M132 100 Q138 95 144 100" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>${cheeks}<path d="M108 120 Q120 132 134 119" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    case 2: // sorpresa
      return `<circle cx="102" cy="100" r="6" fill="${INK}"/><circle cx="138" cy="100" r="6" fill="${INK}"/>${cheeks}<ellipse cx="120" cy="124" rx="7" ry="9" fill="${INK}"/>`;
    case 3: // dormido (soñando que su pena ya se fue)
      return `<path d="M95 101 Q102 107 109 101 M131 101 Q138 107 145 101" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>${cheeks}<path d="M112 121 Q120 126 128 121" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
        <text x="160" y="70" font-family="system-ui, sans-serif" font-weight="700" font-size="18" fill="${INK}">z</text><text x="172" y="54" font-family="system-ui, sans-serif" font-weight="700" font-size="13" fill="${INK}">z</text>`;
    default: // sonrisa
      return `<circle cx="102" cy="100" r="5" fill="${INK}"/><circle cx="138" cy="100" r="5" fill="${INK}"/>${cheeks}<path d="M106 118 Q120 134 134 118" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  }
}

function accessory(n: number, skin: string, [, a1, a2, faja]: readonly string[], cabello = 0): { back: string; front: string } {
  switch (n) {
    case 1: // Canasta con frutas en la cabeza
      return {
        back: '',
        // La canasta se apoya sobre el tocado (sombrero, moño o tocoyal).
        front: `<g stroke="${INK}" stroke-width="2" stroke-linejoin="round" transform="translate(0 ${[0, -8, -14, -22, 0][cabello] ?? 0})">
          <circle cx="104" cy="16" r="10" fill="#ea4335"/><circle cx="124" cy="10" r="11" fill="#f9ab00"/><circle cx="142" cy="18" r="9" fill="#34a853"/>
          <path d="M86 22 H154 L146 44 H94 Z" fill="#d9a35b"/>
          <path d="M92 30 H148 M96 37 H144" stroke="#9c6b2f" stroke-width="2"/></g>`,
      };
    case 2: // Laptop
      return {
        back: '',
        front: `<g stroke="${INK}" stroke-width="2" stroke-linejoin="round">
          <rect x="84" y="196" width="72" height="44" rx="5" fill="#f0f0f0"/>
          <path d="M76 240 H164 L158 250 H82 Z" fill="#c4c4c4"/>
          <rect x="91" y="203" width="58" height="30" rx="2" fill="#1e1e1e"/>
          <path d="M98 214 l6 4 -6 4 M108 224 h12" fill="none" stroke="#5cdb6d" stroke-width="2.4" stroke-linecap="round"/>
          <circle cx="78" cy="236" r="7" fill="${skin}"/><circle cx="162" cy="236" r="7" fill="${skin}"/></g>`,
      };
    case 3: // Quetzal en el hombro (ave nacional de Guatemala)
      return {
        back: `<path d="M190 172 C214 214 206 262 196 300 C194 262 190 222 172 182 Z" fill="#34a853" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M184 176 C204 214 198 250 190 282" fill="none" stroke="#5cdb6d" stroke-width="3"/>`,
        front: `<g stroke="${INK}" stroke-width="2" stroke-linejoin="round">
          <ellipse cx="180" cy="160" rx="17" ry="20" fill="#34a853"/>
          <path d="M166 164 C170 182 186 186 194 172 C188 178 176 178 166 164 Z" fill="#ea4335"/>
          <path d="M172 142 C176 132 186 132 190 140" fill="#5cdb6d"/>
          <circle cx="185" cy="152" r="2.6" fill="${INK}" stroke="none"/>
          <path d="M194 154 L202 157 L194 160 Z" fill="#f9ab00"/></g>`,
      };
    case 4: // Taza de café
      return {
        back: '',
        front: `<g stroke="${INK}" stroke-width="2" stroke-linejoin="round">
          <path d="M150 210 h34 v22 a12 12 0 0 1 -12 12 h-10 a12 12 0 0 1 -12 -12 Z" fill="#ffffff"/>
          <path d="M184 216 a8 8 0 0 1 0 16" fill="none"/>
          <rect x="154" y="216" width="26" height="6" fill="#6b4329" stroke="none"/>
          <path d="M160 202 c-4 -6 4 -8 0 -14 M172 202 c-4 -6 4 -8 0 -14" fill="none" stroke="#9a9a9a" stroke-linecap="round"/>
          <circle cx="152" cy="230" r="7" fill="${skin}"/></g>`,
      };
    case 5: // Barrilete gigante de Sumpango (en miniatura)
      return {
        back: `<path d="M64 228 C40 190 30 150 34 112" fill="none" stroke="${INK}" stroke-width="1.5" stroke-dasharray="3 3"/>`,
        front: `<g stroke="${INK}" stroke-width="2" stroke-linejoin="round">
          <polygon points="34,58 58,82 34,112 10,82" fill="${a1}"/>
          <polygon points="34,66 50,82 34,102 18,82" fill="${a2}"/>
          <circle cx="34" cy="84" r="6" fill="${faja}"/>
          <path d="M34 58 V112 M10 82 H58" stroke-width="1.2"/>
          <circle cx="64" cy="228" r="7" fill="${skin}"/></g>`,
      };
    default:
      return { back: '', front: `<circle cx="70" cy="236" r="7" fill="${skin}" stroke="${INK}" stroke-width="2"/><circle cx="170" cy="236" r="7" fill="${skin}" stroke="${INK}" stroke-width="2"/>` };
  }
}

/** SVG del quitapenas (viewBox 240×320). `title` da nombre accesible. */
export function quitapenasSVG(opts: QuitapenasOptions, title = 'Quitapenas'): string {
  const o = normalizeDoll(opts);
  const traje = TRAJES[o.traje].c;
  const [base, a1, a2, faja] = traje;
  const skin = PIELES[o.piel];
  const id = `qp${++seq}`;
  const huipil = `${id}-h`;
  const corte = `${id}-c`;
  const thread = `${id}-t`;
  const acc = accessory(o.accesorio, skin, traje, o.cabello);
  // Brazos envueltos en hilo: en laptop y café sostienen el objeto.
  const arms =
    o.accesorio === 2
      ? `<path d="M84 160 C70 190 72 214 78 234" /><path d="M156 160 C170 190 168 214 162 234" />`
      : o.accesorio === 4
        ? `<path d="M84 160 C66 190 64 214 70 236" /><path d="M156 160 C166 186 160 214 152 230" />`
        : o.accesorio === 5
          ? `<path d="M84 160 C70 190 64 210 64 228" /><path d="M156 160 C170 190 172 214 170 236" />`
          : `<path d="M84 160 C70 190 66 214 70 236" /><path d="M156 160 C170 190 174 214 170 236" />`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -24 240 344" role="img" aria-label="${escapeXml(title)}">
  <title>${escapeXml(title)}</title>
  <defs>
    ${patternDef(huipil, o.patron, traje)}
    <pattern id="${corte}" width="12" height="40" patternUnits="userSpaceOnUse"><rect width="12" height="40" fill="${base}"/><rect x="2" width="3" height="40" fill="${a1}"/><path d="M8 0 v8 M8 14 v8 M8 28 v8" stroke="${a2}" stroke-width="2"/></pattern>
    <pattern id="${thread}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)"><path d="M0 3 H6" stroke="${INK}" stroke-opacity=".16" stroke-width="1"/></pattern>
  </defs>
  ${acc.back}
  ${hairBack(o.cabello, traje)}
  <g fill="none" stroke="${INK}" stroke-width="15" stroke-linecap="round">${arms}</g>
  <g fill="none" stroke="${a1}" stroke-width="11" stroke-linecap="round">${arms}</g>
  <g fill="none" stroke="url(#${thread})" stroke-width="11" stroke-linecap="round">${arms}</g>
  <!-- Cuerpo: huipil, faja y corte envueltos en hilo -->
  <g stroke="${INK}" stroke-width="2" stroke-linejoin="round">
    <path d="M90 142 H150 C158 160 160 178 158 194 H82 C80 178 82 160 90 142 Z" fill="url(#${huipil})"/>
    <rect x="80" y="192" width="80" height="14" rx="3" fill="${faja}"/>
    <path d="M82 206 H158 L166 284 C150 290 90 290 74 284 Z" fill="url(#${corte})"/>
    <path d="M82 206 H158 L166 284 C150 290 90 290 74 284 Z" fill="url(#${thread})" stroke="none"/>
    <path d="M90 142 H150 C158 160 160 178 158 194 H82 C80 178 82 160 90 142 Z" fill="url(#${thread})" stroke="none"/>
    <path d="M104 142 Q120 156 136 142" fill="none" stroke-width="2"/>
    <ellipse cx="102" cy="294" rx="14" ry="7" fill="${INK}"/><ellipse cx="138" cy="294" rx="14" ry="7" fill="${INK}"/>
  </g>
  <!-- Cabeza -->
  <rect x="110" y="132" width="20" height="14" fill="${skin}" stroke="${INK}" stroke-width="2"/>
  <circle cx="120" cy="96" r="52" fill="${skin}" stroke="${INK}" stroke-width="2"/>
  ${hairFront(o.cabello, traje, huipil)}
  ${face(o.expresion)}
  ${acc.front}
</svg>`;
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export interface DollCard {
  name: string;
  pena: number;
  opts: QuitapenasOptions;
}

/** PNG 1080×1350 para compartir: el quitapenas, su nombre, su pena y la leyenda. */
export async function quitapenasPNG(card: DollCard): Promise<Blob> {
  await document.fonts?.ready;
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const o = normalizeDoll(card.opts);
  const [base, a1, a2, faja] = TRAJES[o.traje].c;
  const sans = "'Google Sans', system-ui, sans-serif";
  const mono = "'Roboto Mono', ui-monospace, monospace";

  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, W, H);
  // Tarjeta
  const r = 56;
  ctx.beginPath();
  ctx.roundRect(48, 48, W - 96, H - 96, r);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#1e1e1e';
  ctx.stroke();
  // Franja tejida arriba (rombos)
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(48, 48, W - 96, H - 96, r);
  ctx.clip();
  ctx.fillStyle = base;
  ctx.fillRect(48, 48, W - 96, 56);
  for (let x = 48; x < W - 48; x += 56) {
    ctx.fillStyle = a1;
    ctx.beginPath();
    ctx.moveTo(x + 28, 52);
    ctx.lineTo(x + 52, 76);
    ctx.lineTo(x + 28, 100);
    ctx.lineTo(x + 4, 76);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = a2;
    ctx.fillRect(x + 22, 70, 12, 12);
  }
  ctx.fillStyle = faja;
  ctx.fillRect(48, 104, W - 96, 10);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(48, 114);
  ctx.lineTo(W - 48, 114);
  ctx.stroke();

  ctx.fillStyle = '#4b4b4b';
  ctx.font = `300 30px ${mono}`;
  ctx.fillText('// MI QUITAPENAS · ' + EVENT.toUpperCase(), 104, 180);

  // Círculo de fondo + muñeca
  ctx.beginPath();
  ctx.arc(W / 2, 520, 300, 0, Math.PI * 2);
  ctx.fillStyle = a2;
  ctx.globalAlpha = 0.35;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 4;
  ctx.stroke();
  const img = await loadImage(svgDataUrl(quitapenasSVG(o, card.name)));
  ctx.drawImage(img, W / 2 - 210, 222, 420, 602); // viewBox 240×344

  // Nombre
  ctx.fillStyle = '#1e1e1e';
  ctx.textAlign = 'center';
  ctx.font = `700 76px ${sans}`;
  ctx.fillText(card.name || 'Mi quitapenas', W / 2, 920);
  // Pena
  const pena = PENAS[clampIdx(card.pena, PENAS.length)];
  ctx.font = `500 40px ${sans}`;
  const penaText = `Mi pena: “${pena}”`;
  const pw = Math.min(ctx.measureText(penaText).width + 64, W - 180);
  ctx.beginPath();
  ctx.roundRect(W / 2 - pw / 2, 952, pw, 74, 37);
  ctx.fillStyle = '#ffe7a5';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#1e1e1e';
  ctx.fillText(penaText, W / 2, 1002, W - 220);
  // Leyenda
  ctx.font = `400 28px ${sans}`;
  ctx.fillStyle = '#4b4b4b';
  wrap(ctx, LEYENDA, W - 260).forEach((l, i) => ctx.fillText(l, W / 2, 1086 + i * 38));
  // Pie
  ctx.textAlign = 'left';
  ctx.font = `300 24px ${mono}`;
  ctx.fillStyle = '#1e1e1e';
  ctx.fillText(TALK_TITLE, 104, H - 108, W - 208);
  ctx.fillStyle = '#4b4b4b';
  ctx.fillText(`${SPEAKER} · ${SPEAKER_HANDLE}`, 104, H - 74);
  // Puntos de Google
  ['#4285f4', '#ea4335', '#f9ab00', '#34a853'].forEach((c, i) => {
    ctx.beginPath();
    ctx.arc(W - 120 - (3 - i) * 34, H - 92, 12, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png'));
}

/** Data URL PNG pequeña para incrustar en la memoria descargable. */
export async function quitapenasPNGDataUrl(opts: QuitapenasOptions, size = 360): Promise<string> {
  const img = await loadImage(svgDataUrl(quitapenasSVG(opts)));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round((size * 240) / 344);
  canvas.height = size;
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}
