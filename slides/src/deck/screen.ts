// Modo "Pantalla del evento": la pantalla real del DevFest mide 1680×672 (2,5:1, ultra ancha).
// El slide se mantiene en 16:9 a la altura completa (≈1195×672) y los laterales se llenan con
// franjas tejidas: a la izquierda el QR para unirse (útil para quien llega tarde) y a la derecha
// el progreso. Si la ventana no mide 1680×672 (p. ej. al ensayar en la laptop), se dibuja la
// misma pantalla escalada para ver exactamente cómo se verá.
// Se activa con la tecla E, el menú o ?screen=event, y se recuerda en este navegador.
import QRCode from 'qrcode';
import { SLIDE_BY_ID } from '../shared/content';
import { withSessionParams } from '../shared/config';

export const EVENT_SCREEN = { w: 1680, h: 672 };
const KEY = 'deck.screen';

type DeckStage = HTMLElement;

export function initEventScreen(stage: DeckStage, sections: HTMLElement[]) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const frame = document.createElement('div');
  frame.className = 'event-screen';
  frame.hidden = true;
  frame.setAttribute('aria-hidden', 'true');
  frame.innerHTML = `
    <aside class="screen-band left">
      <div class="band-qr" data-band-qr></div>
      <p class="band-title">Únete</p>
      <p class="band-text">Notas, tu quitapenas y tu memoria de la charla</p>
      <p class="band-url" data-band-url></p>
    </aside>
    <aside class="screen-band right">
      <img class="band-logo" src="/brand/logo-gdg-stacked.svg" alt="" />
      <p class="band-section" data-band-section></p>
      <p class="band-count" data-band-count></p>
      <div class="band-progress"><i data-band-progress></i></div>
      <p class="band-text">DevFest Guatemala 2026</p>
    </aside>`;
  document.body.append(frame);

  const liveUrl = withSessionParams('/live/');
  void QRCode.toString(liveUrl, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1e1e1e', light: '#ffffff' } }).then((svg) => {
    frame.querySelector('[data-band-qr]')!.innerHTML = svg;
  });
  frame.querySelector('[data-band-url]')!.textContent = liveUrl.replace(/^https?:\/\//, '').replace(/\?$/, '');

  let on = false;
  let addedNoRail = false;

  // Escala la pantalla de 1680×672 a la ventana y coloca el deck 16:9 en el centro.
  function layout() {
    if (!on) return;
    const k = Math.min(innerWidth / EVENT_SCREEN.w, innerHeight / EVENT_SCREEN.h);
    const fw = EVENT_SCREEN.w * k;
    const fh = EVENT_SCREEN.h * k;
    const fx = (innerWidth - fw) / 2;
    const fy = (innerHeight - fh) / 2;
    const sw = (fh * 16) / 9;
    const root = document.documentElement.style;
    root.setProperty('--scr-x', `${fx}px`);
    root.setProperty('--scr-y', `${fy}px`);
    root.setProperty('--scr-w', `${fw}px`);
    root.setProperty('--scr-h', `${fh}px`);
    root.setProperty('--scr-k', String(k));
    root.setProperty('--slide-x', `${fx + (fw - sw) / 2}px`);
    root.setProperty('--slide-w', `${sw}px`);
    root.setProperty('--band-w', `${(fw - sw) / 2}px`);
  }

  function setOn(next: boolean, remember = true) {
    on = next;
    document.documentElement.toggleAttribute('data-event-screen', on);
    frame.hidden = !on;
    // Las miniaturas no caben en la pantalla del evento: se ocultan mientras dure el modo.
    if (on && !stage.hasAttribute('no-rail')) {
      stage.setAttribute('no-rail', '');
      addedNoRail = true;
    } else if (!on && addedNoRail) {
      stage.removeAttribute('no-rail');
      addedNoRail = false;
    }
    layout();
    // deck-stage se ajusta al tamaño de su host en el siguiente resize.
    dispatchEvent(new Event('resize'));
    if (remember) {
      try {
        localStorage.setItem(KEY, on ? 'event' : '');
      } catch {
        /* noop */
      }
    }
    document.querySelectorAll('[data-screen-state]').forEach((el) => (el.textContent = on ? 'activa' : '1680×672'));
  }

  function updateBand(index: number) {
    const s = sections[index];
    const c = SLIDE_BY_ID.get(s?.dataset.id ?? '');
    frame.querySelector('[data-band-section]')!.textContent = c?.section ?? c?.label ?? '';
    frame.querySelector('[data-band-count]')!.textContent = `${pad(index + 1)} / ${pad(sections.length)}`;
    (frame.querySelector('[data-band-progress]') as HTMLElement).style.width = `${((index + 1) / sections.length) * 100}%`;
  }
  stage.addEventListener('slidechange', (e) => updateBand((e as CustomEvent).detail.index));
  updateBand(Math.max(0, sections.findIndex((s) => s.hasAttribute('data-deck-active'))));

  addEventListener('resize', layout);
  const param = new URLSearchParams(location.search).get('screen');
  let saved = '';
  try {
    saved = localStorage.getItem(KEY) ?? '';
  } catch {
    /* noop */
  }
  if (param === 'event' || (param !== 'off' && saved === 'event')) setOn(true, param !== 'event');

  return { toggle: () => setOn(!on), isOn: () => on };
}
