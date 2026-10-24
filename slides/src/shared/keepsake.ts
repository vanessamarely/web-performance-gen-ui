// Memoria de la charla: resumen de TODOS los slides + las notas de la persona + su quitapenas.
// Se genera en el celular (nada sale del dispositivo) como un HTML autocontenido que se ve
// bien offline, se puede imprimir a PDF y se comparte como archivo. También hay versión .md.
import { CHECKLIST, SLIDES } from './content';
import { EVENT, PUBLIC_DEMO_URL as DEMO_URL, PUBLIC_SLIDES_URL as SLIDES_URL, REPO_URL, SPEAKER, SPEAKER_HANDLE, TALK_TITLE, TALK_TITLE_ES } from './config';
import { LEYENDA, PENAS, quitapenasSVG, type QuitapenasOptions } from './quitapenas';
import { esc } from './esc';

export interface SavedNote {
  text: string;
  savedAt: number;
}

export interface KeepsakeInput {
  nickname: string | null;
  notes: Record<string, SavedNote>;
  doll: { name: string; pena: number; opts: QuitapenasOptions } | null;
}

export const fmtDate = (d = new Date()) => d.toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' });

/** Slides que entran a la memoria: los marcados + cualquiera donde la persona escribió algo. */
export function keepsakeSlides(notes: KeepsakeInput['notes']) {
  return SLIDES.filter((s) => s.inSummary || notes[s.id]?.text.trim());
}

export function keepsakeMarkdown({ nickname, notes, doll }: KeepsakeInput): string {
  const out: string[] = [];
  out.push(`# ${TALK_TITLE}`, `_${TALK_TITLE_ES}_`, '', `${EVENT} · ${SPEAKER} (${SPEAKER_HANDLE}) · ${fmtDate()}`);
  if (nickname) out.push(`Memoria de **${nickname}**`);
  if (doll) out.push('', `## Mi quitapenas: ${doll.name}`, `Mi pena: “${PENAS[doll.pena] ?? ''}”`, '', `> ${LEYENDA}`);
  let section = '';
  for (const s of keepsakeSlides(notes)) {
    if (s.section && s.section !== section) {
      section = s.section;
      out.push('', `## ${section}`);
    }
    out.push('', `### ${s.title}`);
    s.summary.forEach((p) => out.push(`- ${p}`));
    if (s.code) out.push('', '```' + (s.code.file.split('.').pop() ?? ''), s.code.text, '```');
    const mine = notes[s.id]?.text.trim();
    if (mine) out.push('', `> **Mi nota:** ${mine.replace(/\n/g, '\n> ')}`);
  }
  out.push('', '## 10 reglas para una UI generativa rápida');
  CHECKLIST.forEach(([h, p], i) => out.push(`${i + 1}. **${h}:** ${p}`));
  out.push('', '---', `- Web de Vanessa: https://vanessamarely.dev`, `- Repo: ${REPO_URL}`, `- Slides: ${SLIDES_URL}`, `- Demo: ${DEMO_URL}`, '');
  return out.join('\n');
}

export function keepsakeHTML({ nickname, notes, doll }: KeepsakeInput): string {
  const noteCount = Object.values(notes).filter((n) => n.text.trim()).length;
  let section = '';
  const body = keepsakeSlides(notes)
    .map((s) => {
      const head = s.section && s.section !== section ? `<h2 class="sec">${esc((section = s.section))}</h2>` : '';
      const mine = notes[s.id]?.text.trim();
      return `${head}<article class="slide${mine ? ' has-note' : ''}">
        <h3>${esc(s.title)}</h3>
        <ul>${s.summary.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        ${s.code ? `<figure><figcaption>${esc(s.code.file)}</figcaption><pre><code>${esc(s.code.text)}</code></pre></figure>` : ''}
        ${mine ? `<aside class="note"><b>Mi nota</b><p>${esc(mine).replace(/\n/g, '<br>')}</p></aside>` : ''}
      </article>`;
    })
    .join('');

  const dollBlock = doll
    ? `<section class="doll">
        <div class="doll-art">${quitapenasSVG(doll.opts, `Quitapenas ${doll.name}`)}</div>
        <div>
          <p class="eyebrow">// Mi quitapenas</p>
          <h2>${esc(doll.name)}</h2>
          <p class="pena">Mi pena: “${esc(PENAS[doll.pena] ?? '')}”</p>
          <p class="muted">${esc(LEYENDA)} Hoy le dejamos nuestras penas de performance.</p>
        </div>
      </section>`
    : '';

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Memoria · ${esc(TALK_TITLE)} · ${esc(EVENT)}</title>
<style>
  :root { --bg:#f0f0f0; --surface:#fff; --ink:#1e1e1e; --dim:#4b4b4b; --blue:#4285f4; --red:#ea4335; --yellow:#f9ab00; --green:#34a853;
    --p-blue:#c3ecf6; --p-green:#ccf6c5; --p-yellow:#ffe7a5; --p-red:#f8d8d8; --sans:'Google Sans',system-ui,sans-serif; --mono:'Roboto Mono',ui-monospace,monospace; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { --bg:#1e1e1e; --surface:#2a2a2b; --ink:#f0f0f0; --dim:#c4c4c4; --p-blue:#2d4a55; --p-green:#2f4a33; --p-yellow:#54472a; --p-red:#553336; } }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.5 var(--sans); padding:24px 16px 48px; }
  main { max-width:820px; margin:0 auto; display:grid; gap:18px; }
  .card { background:var(--surface); border:2px solid var(--ink); border-radius:28px; padding:28px; }
  .hero { position:relative; overflow:hidden; padding-top:46px; }
  .hero::before { content:''; position:absolute; inset:0 0 auto; height:18px; background:repeating-linear-gradient(90deg,var(--blue) 0 25%,var(--red) 0 50%,var(--yellow) 0 75%,var(--green) 0 100%); background-size:96px 100%; border-bottom:2px solid var(--ink); }
  .eyebrow { font:300 13px var(--mono); letter-spacing:.12em; text-transform:uppercase; color:var(--dim); margin:0 0 8px; }
  h1 { font-size:clamp(28px,6vw,44px); line-height:1.05; margin:0 0 8px; letter-spacing:-.01em; }
  .hl { background:linear-gradient(transparent 55%, var(--p-yellow) 55%); }
  .meta { font:300 14px var(--mono); color:var(--dim); margin:0; }
  .stats { display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; }
  .pill { display:inline-flex; gap:6px; padding:6px 14px; border:2px solid var(--ink); border-radius:999px; background:var(--surface); font-size:14px; font-weight:500; }
  .pill.blue{background:var(--p-blue)} .pill.green{background:var(--p-green)} .pill.yellow{background:var(--p-yellow)}
  .doll { display:grid; grid-template-columns:200px 1fr; gap:24px; align-items:center; background:var(--surface); border:2px solid var(--ink); border-radius:28px; padding:24px; }
  .doll-art { background:var(--p-yellow); border:2px solid var(--ink); border-radius:22px; padding:10px; }
  .doll-art svg { width:100%; height:auto; display:block; }
  .doll h2 { margin:0 0 6px; font-size:32px; }
  .pena { display:inline-block; margin:0 0 10px; padding:6px 14px; border:2px solid var(--ink); border-radius:999px; background:var(--p-red); font-weight:500; }
  .muted { color:var(--dim); margin:0; }
  .sec { font:300 14px var(--mono); text-transform:uppercase; letter-spacing:.1em; margin:18px 4px 0; color:var(--dim); }
  .slide { background:var(--surface); border:2px solid var(--ink); border-radius:20px; padding:18px 20px; break-inside:avoid; }
  .slide h3 { margin:0 0 8px; font-size:20px; line-height:1.2; }
  .slide ul { margin:0; padding-left:20px; display:grid; gap:4px; }
  figure { margin:12px 0 0; border:2px solid var(--ink); border-radius:14px; overflow:hidden; }
  figcaption { padding:6px 12px; font:300 12px var(--mono); border-bottom:2px solid var(--ink); color:var(--dim); }
  pre { margin:0; padding:12px; font:400 13px/1.5 var(--mono); overflow-x:auto; background:var(--bg); }
  .note { margin-top:12px; padding:12px 14px; border-radius:14px; background:var(--p-yellow); border-left:6px solid var(--yellow); }
  .note p { margin:4px 0 0; }
  ol.rules { margin:0; padding-left:22px; display:grid; gap:6px; }
  a { color:inherit; }
  footer { font:300 13px var(--mono); color:var(--dim); text-align:center; }
  @media (max-width:560px) { .doll { grid-template-columns:1fr; } .doll-art { max-width:200px; } .card { padding:20px; } }
  @media print { body { background:#fff; padding:0; } .card, .slide, .doll { border-width:1px; } }
</style>
</head>
<body>
<main>
  <header class="card hero">
    <p class="eyebrow">// Memoria de la charla · ${esc(EVENT)}</p>
    <h1>${esc(TALK_TITLE)}</h1>
    <p class="meta">${esc(TALK_TITLE_ES)} · ${esc(SPEAKER)} ${esc(SPEAKER_HANDLE)} · ${esc(fmtDate())}</p>
    <div class="stats">
      ${nickname ? `<span class="pill yellow">${esc(nickname)}</span>` : ''}
      <span class="pill blue">${keepsakeSlides(notes).length} ideas clave</span>
      <span class="pill green">${noteCount} ${noteCount === 1 ? 'nota mía' : 'notas mías'}</span>
    </div>
  </header>
  ${dollBlock}
  ${body}
  <section class="card">
    <p class="eyebrow">// Para llevar</p>
    <h2 style="margin:0 0 10px">10 reglas para una <span class="hl">UI generativa rápida</span></h2>
    <ol class="rules">${CHECKLIST.map(([h, p]) => `<li><b>${esc(h)}:</b> ${esc(p)}</li>`).join('')}</ol>
  </section>
  <section class="card">
    <p class="eyebrow">// Enlaces</p>
    <p style="margin:0">Web de Vanessa: <a href="https://vanessamarely.dev">vanessamarely.dev</a><br>Repo: <a href="${esc(REPO_URL)}">${esc(REPO_URL)}</a><br>Slides: <a href="${esc(SLIDES_URL)}">${esc(SLIDES_URL)}</a><br>Demo: <a href="${esc(DEMO_URL)}">${esc(DEMO_URL)}</a></p>
  </section>
  <footer>Generada en tu celular · tus notas nunca salieron de tu dispositivo</footer>
</main>
</body>
</html>`;
}

export function downloadFile(name: string, content: string | Blob, type = 'text/plain;charset=utf-8') {
  const blob = typeof content === 'string' ? new Blob([content], { type }) : content;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
