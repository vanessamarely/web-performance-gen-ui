import { emptySlide, type AudienceQuestion, type DollData, type Player, type Reaction, type Realtime, type SlideState } from './realtime';

interface LocalDb {
  slide: SlideState;
  players: Record<string, string>;
  dolls: Record<string, DollData>;
  questions: Record<string, AudienceQuestion>;
}

const KEY = 'wpgu.local.db';
const empty = (): LocalDb => ({ slide: emptySlide(), players: {}, dolls: {}, questions: {} });

function read(): LocalDb {
  try {
    const db = { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    db.slide = { ...emptySlide(), ...db.slide };
    return db;
  } catch {
    return empty();
  }
}

/** Modo ensayo: sin red. Cada pestaña es un asistente distinto. */
export function createLocalRealtime(): Realtime {
  const channel = new BroadcastChannel('wpgu-live');
  const listeners = new Set<(db: LocalDb) => void>();
  const reactionListeners = new Set<(r: Reaction) => void>();

  let uid: string | null = null;
  try {
    uid = sessionStorage.getItem('wpgu.uid');
    if (!uid) sessionStorage.setItem('wpgu.uid', (uid = 'local-' + crypto.randomUUID().slice(0, 8)));
  } catch {
    uid = 'local-' + Math.random().toString(36).slice(2, 10);
  }
  const me = uid;

  const emit = () => {
    const db = read();
    listeners.forEach((l) => l(db));
  };
  const write = (fn: (db: LocalDb) => void) => {
    const db = read();
    fn(db);
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch {
      /* cuota llena */
    }
    channel.postMessage({ type: 'db' });
    emit();
  };
  channel.onmessage = (e) => {
    if (e.data?.type === 'db') emit();
    if (e.data?.type === 'reaction') reactionListeners.forEach((l) => l(e.data.r));
  };
  const sub = (fn: (db: LocalDb) => void) => {
    listeners.add(fn);
    queueMicrotask(() => fn(read()));
    return () => {
      listeners.delete(fn);
    };
  };

  return {
    mode: 'local',
    uid: () => me,

    async patchSlide(s) {
      write((db) => (db.slide = { ...db.slide, ...s }));
    },
    onSlide: (cb) => sub((db) => cb(db.slide)),

    async join(name) {
      write((db) => (db.players[me] = name));
    },
    async react(r) {
      channel.postMessage({ type: 'reaction', r });
      reactionListeners.forEach((l) => l(r));
    },
    async ask(q) {
      const id = crypto.randomUUID().slice(0, 8);
      write((db) => (db.questions[id] = { ...q, id, uid: me, at: Date.now() }));
    },
    async publishDoll(d) {
      write((db) => (db.dolls[me] = { ...d, id: me, createdAt: Date.now(), hidden: false }));
    },

    onPlayers: (cb) => sub((db) => cb(Object.entries(db.players).map(([id, name]): Player => ({ id, name })))),
    onReaction(cb) {
      reactionListeners.add(cb);
      return () => {
        reactionListeners.delete(cb);
      };
    },
    onDolls: (cb) => sub((db) => cb(Object.values(db.dolls).sort((a, b) => b.createdAt - a.createdAt))),
    onQuestions: (cb) => sub((db) => cb(Object.values(db.questions).sort((a, b) => a.at - b.at))),
    async removeQuestion(id) {
      write((db) => delete db.questions[id]);
    },
    async setDollHidden(id, hidden) {
      write((db) => {
        if (db.dolls[id]) db.dolls[id].hidden = hidden;
      });
    },
    async resetSession() {
      const db = read();
      const n = Object.keys(db.players).length + Object.keys(db.dolls).length + Object.keys(db.questions).length;
      write((d) => Object.assign(d, empty()));
      return n;
    },

    async signInPresenter() {
      return true;
    },
    // En ensayo local "presentadora" = quien abre el deck con ?presenter.
    isPresenterSession: () => new URLSearchParams(location.search).has('presenter'),
  };
}
