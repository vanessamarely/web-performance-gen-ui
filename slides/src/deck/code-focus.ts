// Modo foco para los bloques de código: en vez de leer 12 líneas de golpe, el público ve
// una idea a la vez. Se oscurece el bloque, se iluminan (y se acercan) las líneas del paso
// actual y abajo aparece la explicación en lenguaje simple.
//  · Avanza solo cada ~5 s mientras el slide está activo (y vuelve a mostrar todo al final).
//  · ↓ / ↑ o un clic sobre el código lo controlan a mano.
// Los pasos se declaran en el HTML: data-focus='[["1-2", "Explicación"], ["4", "…"]]'.
type Step = { from: number; to: number; note: string };

const AUTO_MS = 5200;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

interface FocusBlock {
  el: HTMLElement;
  pre: HTMLElement;
  lines: HTMLElement[];
  steps: Step[];
  note: HTMLElement;
  i: number;
}

function parseSteps(raw: string): Step[] {
  try {
    return (JSON.parse(raw) as [string, string][]).map(([range, note]) => {
      const [a, b] = range.split('-').map(Number);
      return { from: a, to: b || a, note };
    });
  } catch (err) {
    console.warn('[code-focus] data-focus inválido', err);
    return [];
  }
}

function setup(el: HTMLElement): FocusBlock | null {
  const pre = el.querySelector('pre');
  const steps = parseSteps(el.dataset.focus ?? '');
  if (!pre || !steps.length) return null;
  // Una línea = un <span class="ln"> (las líneas del código no cruzan etiquetas).
  pre.innerHTML = pre.innerHTML
    .split('\n')
    .map((l) => `<span class="ln">${l || ' '}</span>`)
    .join('');
  const note = document.createElement('div');
  note.className = 'focus-note';
  note.setAttribute('aria-live', 'off');
  el.append(note);
  el.classList.add('has-focus');
  const block: FocusBlock = { el, pre, lines: [...pre.querySelectorAll<HTMLElement>('.ln')], steps, note, i: -1 };
  el.addEventListener('click', () => go(block, block.i + 1));
  return block;
}

function go(b: FocusBlock, i: number) {
  // Después del último paso se muestra todo el bloque (resumen), luego vuelve a empezar.
  const n = b.steps.length;
  b.i = ((i % (n + 1)) + (n + 1)) % (n + 1);
  const step = b.steps[b.i];
  b.el.classList.toggle('focusing', Boolean(step));
  b.lines.forEach((ln, k) => ln.classList.toggle('on', Boolean(step) && k + 1 >= step.from && k + 1 <= step.to));
  if (!step) {
    b.pre.style.transform = '';
    b.note.innerHTML = `<span class="txt">Todo junto</span>${dots(b)}`;
    return;
  }
  b.note.innerHTML = `<span class="num">${b.i + 1}/${n}</span><span class="txt">${step.note}</span>${dots(b)}`;
  if (reduced()) return;
  // Zoom suave hacia las líneas del paso (origen a la izquierda para no cortar el inicio).
  const first = b.lines[step.from - 1];
  const last = b.lines[step.to - 1] ?? first;
  if (!first) return;
  const cy = (first.offsetTop + last.offsetTop + last.offsetHeight) / 2;
  b.pre.style.transformOrigin = `0 ${cy}px`;
  b.pre.style.transform = 'scale(1.1)';
}

const dots = (b: FocusBlock) => `<span class="dots" aria-hidden="true">${b.steps.map((_, k) => `<i${k === b.i ? ' class="cur"' : ''}></i>`).join('')}</span>`;

export function initCodeFocus(stage: HTMLElement, sections: HTMLElement[]) {
  const bySlide = new Map<HTMLElement, FocusBlock[]>();
  sections.forEach((s) => {
    const blocks = [...s.querySelectorAll<HTMLElement>('.code[data-focus]')].map(setup).filter((b): b is FocusBlock => Boolean(b));
    if (blocks.length) bySlide.set(s, blocks);
  });
  let timer = 0;
  let active: FocusBlock[] = [];
  const tick = () => active.forEach((b) => go(b, b.i + 1));
  const restart = () => {
    clearInterval(timer);
    timer = window.setInterval(tick, AUTO_MS);
  };
  function onSlide(slide: HTMLElement) {
    clearInterval(timer);
    active = bySlide.get(slide) ?? [];
    active.forEach((b) => go(b, 0));
    if (active.length) restart();
  }
  stage.addEventListener('slidechange', (e) => onSlide((e as CustomEvent).detail.slide));
  const first = sections.find((s) => s.hasAttribute('data-deck-active'));
  if (first) onSlide(first);
  // ↓ siguiente paso · ↑ paso anterior (← / → siguen cambiando de slide).
  addEventListener('keydown', (e) => {
    if (!active.length || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
    if (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    e.preventDefault();
    active.forEach((b) => go(b, b.i + (e.key === 'ArrowDown' ? 1 : -1)));
    restart();
  });
}
