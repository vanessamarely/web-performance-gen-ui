// Memoria de la charla en PDF, generada EN EL CELULAR con pdf-lib (MIT, gratis).
// Este módulo se carga solo al pulsar "Descargar PDF" (import dinámico), así la app
// de asistentes no paga su peso hasta que alguien lo usa.
// Usa la Helvetica estándar del PDF (sin descargar fuentes): los pocos símbolos que esa
// fuente no tiene (≤, →, ✓…) se traducen a equivalentes legibles.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
import { CHECKLIST } from './content';
import { EVENT, PUBLIC_DEMO_URL as DEMO_URL, PUBLIC_SLIDES_URL as SLIDES_URL, REPO_URL, SKILL_URL, SPEAKER, SPEAKER_HANDLE, TALK_TITLE, TALK_TITLE_ES } from './config';
import { fmtDate, keepsakeSlides, type KeepsakeInput } from './keepsake';
import { LEYENDA, PENAS, quitapenasPNGDataUrl } from './quitapenas';

const W = 595.28; // A4
const H = 841.89;
const M = 48;
const INK = rgb(0.118, 0.118, 0.118);
const DIM = rgb(0.29, 0.29, 0.29);
const hex = (h: string): RGB => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const C = { blue: hex('#4285f4'), red: hex('#ea4335'), yellow: hex('#f9ab00'), green: hex('#34a853'), pYellow: hex('#ffe7a5'), pBlue: hex('#c3ecf6'), pGreen: hex('#ccf6c5'), pRed: hex('#f8d8d8'), code: hex('#f0f0f0') };

/** Solo caracteres que la Helvetica estándar (WinAnsi) puede dibujar. */
const SAFE: Record<string, string> = { '≤': '<=', '≥': '>=', '→': '->', '←': '<-', '↑': '^', '↓': 'v', '✓': 'OK', '✗': 'X', '≈': '~', '²': '^2', '⏱': '', '⏺': '*', '●': '*', '·': '·', '∥': '||', '♡': '', '♥': '', ' ': ' ' };
const safe = (t: string) =>
  [...t.replace(/\s+/g, ' ')]
    .map((ch) => SAFE[ch] ?? (ch.charCodeAt(0) <= 0xff || '–—‘’“”•…€™'.includes(ch) ? ch : ''))
    .join('');

class Writer {
  page!: PDFPage;
  y = 0;
  constructor(
    private pdf: PDFDocument,
    private f: { r: PDFFont; b: PDFFont; i: PDFFont; m: PDFFont },
  ) {
    this.newPage();
  }
  newPage() {
    this.page = this.pdf.addPage([W, H]);
    this.y = H - M;
  }
  ensure(h: number) {
    if (this.y - h < M + 24) this.newPage();
  }
  lines(text: string, font: PDFFont, size: number, width: number): string[] {
    const out: string[] = [];
    let line = '';
    for (const word of safe(text).split(' ')) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > width && line) {
        out.push(line);
        line = word;
      } else line = test;
    }
    if (line) out.push(line);
    return out;
  }
  text(text: string, { font = this.f.r, size = 10.5, color = INK, x = M, width = W - 2 * M, gap = 1.35 } = {}) {
    for (const l of this.lines(text, font, size, width)) {
      this.ensure(size * gap);
      this.page.drawText(l, { x, y: this.y - size, size, font, color });
      this.y -= size * gap;
    }
  }
  space(h: number) {
    this.y -= h;
  }
  /** Caja de color con texto dentro (notas, código). */
  box(text: string, { bg, font = this.f.r, size = 10, label = '', mono = false }: { bg: RGB; font?: PDFFont; size?: number; label?: string; mono?: boolean }) {
    const pad = 8;
    const width = W - 2 * M - pad * 2;
    // En código se conserva la sangría (safe() colapsa espacios en el texto normal).
    const indent = (l: string) => ' '.repeat(l.length - l.trimStart().length);
    const rows = mono
      ? text.split('\n').flatMap((l) => this.lines(l.trim() || ' ', this.f.m, size, width - this.f.m.widthOfTextAtSize(indent(l), size)).map((r) => indent(l) + r))
      : this.lines(text, font, size, width);
    const lh = size * 1.4;
    const h = rows.length * lh + pad * 2 + (label ? 13 : 0);
    this.ensure(Math.min(h, H / 2));
    this.page.drawRectangle({ x: M, y: this.y - h, width: W - 2 * M, height: h, color: bg, borderColor: INK, borderWidth: 0.8 });
    let y = this.y - pad;
    if (label) {
      this.page.drawText(safe(label), { x: M + pad, y: y - 9, size: 8.5, font: this.f.b, color: DIM });
      y -= 13;
    }
    for (const r of rows) {
      this.page.drawText(r, { x: M + pad, y: y - size, size, font: mono ? this.f.m : font, color: INK });
      y -= lh;
    }
    this.y -= h + 8;
  }
}

export async function keepsakePDF({ nickname, notes, doll }: KeepsakeInput): Promise<Blob> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Memoria · ${TALK_TITLE}`);
  pdf.setAuthor(nickname ?? 'Asistente');
  pdf.setSubject(`${EVENT} · ${SPEAKER}`);
  const f = { r: await pdf.embedFont(StandardFonts.Helvetica), b: await pdf.embedFont(StandardFonts.HelveticaBold), i: await pdf.embedFont(StandardFonts.HelveticaOblique), m: await pdf.embedFont(StandardFonts.Courier) };
  const w = new Writer(pdf, f);

  // Franja tejida con los colores de Google
  const band = (page: PDFPage) => [C.blue, C.red, C.yellow, C.green].forEach((c, i) => {
    for (let x = i * 24; x < W; x += 96) page.drawRectangle({ x, y: H - 14, width: 24, height: 14, color: c });
  });
  band(w.page);

  // Encabezado
  w.space(14);
  w.text(`MEMORIA DE LA CHARLA · ${EVENT.toUpperCase()}`, { font: f.b, size: 8.5, color: DIM });
  w.space(4);
  w.text(TALK_TITLE, { font: f.b, size: 22, gap: 1.15 });
  w.text(TALK_TITLE_ES, { font: f.i, size: 12, color: DIM });
  w.text(`${SPEAKER} ${SPEAKER_HANDLE} · ${fmtDate()}`, { size: 10, color: DIM });
  const list = keepsakeSlides(notes);
  const nNotes = Object.values(notes).filter((n) => n.text.trim()).length;
  w.space(6);
  w.text(`${nickname ? `${nickname} · ` : ''}${list.length} ideas clave · ${nNotes} ${nNotes === 1 ? 'nota mía' : 'notas mías'}`, { font: f.b, size: 10.5 });
  w.space(10);

  // Mi quitapenas
  if (doll) {
    const png = await pdf.embedPng(await quitapenasPNGDataUrl(doll.opts, 480));
    const imgH = 150;
    const imgW = (png.width / png.height) * imgH;
    w.ensure(imgH + 20);
    const top = w.y;
    w.page.drawRectangle({ x: M, y: top - imgH - 16, width: W - 2 * M, height: imgH + 16, color: C.pYellow, borderColor: INK, borderWidth: 0.8 });
    w.page.drawImage(png, { x: M + 10, y: top - imgH - 8, width: imgW, height: imgH });
    const tx = M + imgW + 28;
    const tw = W - M - tx - 12;
    w.y = top - 14;
    w.text('MI QUITAPENAS', { font: f.b, size: 8.5, color: DIM, x: tx, width: tw });
    w.text(doll.name, { font: f.b, size: 20, x: tx, width: tw });
    w.text(`Mi pena: “${PENAS[doll.pena] ?? ''}”`, { font: f.b, size: 11, x: tx, width: tw });
    w.space(4);
    w.text(`${LEYENDA} Hoy le dejamos nuestras penas de performance.`, { size: 9.5, color: DIM, x: tx, width: tw });
    w.y = top - imgH - 30;
  }

  // Resumen por slide (con mis notas)
  let section = '';
  for (const s of list) {
    if (s.section && s.section !== section) {
      section = s.section;
      w.space(6);
      w.ensure(40);
      w.text(section.toUpperCase(), { font: f.b, size: 9, color: C.blue });
      w.space(2);
    }
    w.ensure(40);
    w.text(s.title, { font: f.b, size: 13, gap: 1.25 });
    for (const p of s.summary) w.text(`•  ${p}`, { size: 10, x: M + 6, width: W - 2 * M - 6 });
    if (s.code) {
      w.space(4);
      w.box(s.code.text, { bg: C.code, size: 8, label: s.code.file, mono: true });
    }
    const mine = notes[s.id]?.text.trim();
    if (mine) {
      w.space(2);
      w.box(mine, { bg: C.pYellow, size: 10, label: 'MI NOTA' });
    }
    w.space(8);
  }

  // Checklist y enlaces
  w.ensure(80);
  w.text('10 reglas para una UI generativa rápida', { font: f.b, size: 14 });
  w.space(2);
  CHECKLIST.forEach(([h, p], i) => w.text(`${i + 1}. ${h}: ${p}`, { size: 10, x: M + 6, width: W - 2 * M - 6 }));
  w.space(10);
  w.text('Enlaces', { font: f.b, size: 12 });
  for (const l of [`Web de Vanessa: https://vanessamarely.dev`, `Repo: ${REPO_URL}`, `Skill para tu agente: ${SKILL_URL}`, `Slides: ${SLIDES_URL}`, `Demo: ${DEMO_URL}`]) w.text(l, { size: 10 });

  // Pie con número de página en todas
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    if (i > 0) band(p);
    p.drawText(safe(`Generada en tu celular · tus notas nunca salieron de tu dispositivo · ${i + 1}/${pages.length}`), { x: M, y: 24, size: 8, font: f.r, color: DIM });
  });

  const bytes = await pdf.save();
  return new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' });
}
