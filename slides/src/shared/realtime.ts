// Capa de tiempo real con dos backends intercambiables:
//  - Firestore (Auth anónima) cuando hay configuración de Firebase.
//  - Local (BroadcastChannel + localStorage) para ensayar sin internet:
//    abre el deck en una pestaña y /live/ en otras; cada pestaña es un asistente.
//
// Pensado para cientos de celulares: los celulares SOLO escuchan el documento de la sesión
// (~200 bytes: índice e id del slide). El contenido de cada slide ya viene en el bundle
// (content.ts), así que cambiar de slide no descarga nada más.
import { hasFirebase } from './config';
import type { LiveKind } from './content';
import type { QuitapenasOptions } from './quitapenas';

export interface SlideState {
  index: number;
  total: number;
  id: string;
  label: string;
  kind: LiveKind;
}

export const emptySlide = (): SlideState => ({ index: 0, total: 0, id: '', label: '', kind: 'content' });

export type Reaction = 'fire' | 'heart' | 'mind' | 'ask';
export const REACTIONS: Record<Reaction, { label: string; color: string }> = {
  fire: { label: 'Fuego', color: '#ea4335' },
  heart: { label: 'Me gusta', color: '#ff7daf' },
  mind: { label: 'Mente volada', color: '#4285f4' },
  ask: { label: 'Tengo una pregunta', color: '#34a853' },
};

export interface Player {
  id: string;
  name: string;
}

/** El quitapenas publicado en el muro: solo opciones (pocos bytes), el deck dibuja el SVG. */
export interface DollData {
  id: string;
  name: string;
  pena: number;
  opts: QuitapenasOptions;
  createdAt: number;
  hidden: boolean;
}

export interface AudienceQuestion {
  id: string;
  uid: string;
  name: string;
  text: string;
  slide: string;
  at: number;
}

export type Unsub = () => void;

export interface Realtime {
  readonly mode: 'firebase' | 'local';
  uid(): string;

  // Sesión (presentadora escribe, todos leen)
  patchSlide(s: Partial<SlideState>): Promise<void>;
  onSlide(cb: (s: SlideState) => void): Unsub;

  // Público
  join(name: string): Promise<void>;
  react(r: Reaction): Promise<void>;
  /** Duda para la presentadora (texto libre: NO se proyecta). */
  ask(q: { name: string; text: string; slide: string }): Promise<void>;
  publishDoll(d: Omit<DollData, 'id' | 'createdAt' | 'hidden'>): Promise<void>;

  // Solo el deck agrega
  onPlayers(cb: (players: Player[]) => void): Unsub;
  onReaction(cb: (r: Reaction) => void): Unsub;
  onDolls(cb: (dolls: DollData[]) => void): Unsub;
  /** Solo presentadora (las reglas no dejan leerlas a nadie más). */
  onQuestions(cb: (qs: AudienceQuestion[]) => void, onError?: (msg: string) => void): Unsub;
  removeQuestion(id: string): Promise<void>;
  setDollHidden(id: string, hidden: boolean): Promise<void>;
  /** Solo presentadora: borra jugadores, reacciones, preguntas y quitapenas de ESTA sesión. */
  resetSession(): Promise<number>;

  /** Solo presentadora: login con GitHub para poder escribir la sesión. */
  signInPresenter(): Promise<boolean>;
  isPresenterSession(): boolean;
}

let instance: Promise<Realtime> | null = null;

export function getRealtime(): Promise<Realtime> {
  if (!instance) {
    const local = () => import('./realtime-local').then((m) => m.createLocalRealtime());
    instance = hasFirebase
      ? import('./realtime-firebase')
          .then((m) => m.createFirebaseRealtime())
          .catch((err) => {
            // Si Firebase falla (sin red, Auth sin habilitar…), seguimos en modo local para no romper el deck.
            console.warn('[live] Firebase no disponible, modo local:', err);
            return local();
          })
      : local();
  }
  return instance;
}
