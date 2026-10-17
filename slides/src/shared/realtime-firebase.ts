import { GithubAuthProvider, getAuth, linkWithPopup, signInAnonymously, signInWithCredential } from 'firebase/auth';
import { Timestamp, addDoc, collection, deleteDoc, doc, getDocs, getFirestore, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { PRESENTER_GITHUB_ID, SESSION_ID } from './config';
import { getFirebaseApp } from './firebase';
import { emptySlide, type AudienceQuestion, type DollData, type Player, type Reaction, type Realtime, type SlideState } from './realtime';

const ms = (v: unknown) => (v instanceof Timestamp ? v.toMillis() : typeof v === 'number' ? v : undefined);

export async function createFirebaseRealtime(): Promise<Realtime> {
  const app = await getFirebaseApp();
  const auth = getAuth(app);
  const db = getFirestore(app);

  // Todo el público entra anónimo: sin formularios, sin datos personales.
  // Primero esperamos a que Firebase restaure la sesión: si ya es la presentadora (GitHub),
  // NO entramos anónimo (eso reemplazaría su sesión y las reglas dejarían de reconocerla).
  await auth.authStateReady();
  if (!auth.currentUser) await signInAnonymously(auth);

  const session = doc(db, 'sessions', SESSION_ID);
  const sub = (name: string) => collection(session, name);
  const uid = () => auth.currentUser!.uid;

  return {
    mode: 'firebase',
    uid,

    async patchSlide(s) {
      await setDoc(session, { ...s, updatedAt: serverTimestamp() }, { merge: true });
    },
    onSlide(cb) {
      return onSnapshot(session, (snap) => cb({ ...emptySlide(), ...((snap.data() ?? {}) as Partial<SlideState>) }));
    },

    async join(name) {
      await setDoc(doc(sub('players'), uid()), { name, at: serverTimestamp() });
    },
    async react(r) {
      await setDoc(doc(sub('reactions'), uid()), { r, n: Math.floor(Math.random() * 1e9), at: serverTimestamp() });
    },
    async ask(q) {
      await addDoc(sub('questions'), { ...q, uid: uid(), at: serverTimestamp() });
    },
    async publishDoll(d) {
      await setDoc(doc(sub('dolls'), uid()), { ...d, createdAt: serverTimestamp(), hidden: false });
    },

    onPlayers(cb) {
      return onSnapshot(sub('players'), (snap) => cb(snap.docs.map((d): Player => ({ id: d.id, name: d.data().name }))));
    },
    onReaction(cb) {
      let first = true;
      return onSnapshot(sub('reactions'), (snap) => {
        if (first) {
          first = false; // ignoramos el estado inicial: solo reacciones nuevas
          return;
        }
        for (const change of snap.docChanges()) if (change.type !== 'removed') cb(change.doc.data().r as Reaction);
      });
    },
    onDolls(cb) {
      const q = query(sub('dolls'), orderBy('createdAt', 'desc'), limit(120));
      return onSnapshot(q, (snap) =>
        cb(
          snap.docs.map((d) => {
            const data = d.data({ serverTimestamps: 'estimate' });
            return { ...(data as DollData), id: d.id, createdAt: ms(data.createdAt) ?? Date.now() };
          }),
        ),
      );
    },
    onQuestions(cb, onError) {
      // Si el listener falla (permiso, red), Firestore lo cierra: lo reabrimos solos.
      let off: (() => void) | null = null;
      let timer = 0;
      let stopped = false;
      const listen = () => {
        off = onSnapshot(
          query(sub('questions'), orderBy('at', 'asc'), limit(100)),
          (snap) =>
            cb(
              snap.docs.map((d) => {
                const data = d.data({ serverTimestamps: 'estimate' });
                return { ...(data as AudienceQuestion), id: d.id, at: ms(data.at) ?? Date.now() };
              }),
            ),
          (err) => {
            onError?.(err.code === 'permission-denied' ? 'Sin permiso para leer preguntas: inicia sesión con GitHub (Presentar en vivo).' : `No pude leer las preguntas (${err.code}). Reintentando…`);
            if (!stopped) timer = window.setTimeout(listen, 4000);
          },
        );
      };
      listen();
      return () => {
        stopped = true;
        clearTimeout(timer);
        off?.();
      };
    },
    async removeQuestion(id) {
      await deleteDoc(doc(sub('questions'), id));
    },
    async setDollHidden(id, hidden) {
      await updateDoc(doc(sub('dolls'), id), { hidden });
    },
    async resetSession() {
      let n = 0;
      for (const name of ['players', 'reactions', 'questions', 'dolls']) {
        const snap = await getDocs(sub(name));
        for (let i = 0; i < snap.docs.length; i += 400) {
          const batch = writeBatch(db);
          snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
        n += snap.size;
      }
      await setDoc(session, { ...emptySlide(), updatedAt: serverTimestamp() });
      return n;
    },

    async signInPresenter() {
      const provider = new GithubAuthProvider();
      const current = auth.currentUser;
      if (current?.providerData.some((p) => p.providerId === 'github.com')) {
        return current.providerData.some((p) => p.providerId === 'github.com' && p.uid === PRESENTER_GITHUB_ID);
      }
      try {
        if (current) await linkWithPopup(current, provider);
      } catch (err) {
        // Esa cuenta de GitHub ya estaba vinculada a otro uid: entramos con ella.
        const cred = GithubAuthProvider.credentialFromError(err as never);
        if (!cred) throw err;
        await signInWithCredential(auth, cred);
      }
      await auth.currentUser?.getIdToken(true);
      return true;
    },
    isPresenterSession: () => Boolean(auth.currentUser?.providerData.some((p) => p.providerId === 'github.com' && p.uid === PRESENTER_GITHUB_ID)),
  };
}
