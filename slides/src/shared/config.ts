export const REPO_OWNER = 'vanessamarely';
export const REPO_NAME = 'web-performance-gen-ui';
export const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;
export const PRESENTER_GITHUB_ID = '4331491';

export const EVENT = 'DevFest Guatemala 2026';
export const TALK_TITLE = 'Optimizing Web Performance in the Era of Generative UI';
export const TALK_TITLE_ES = 'Web performance en la era de la UI generativa';
export const SPEAKER = 'Vanessa Aristizabal';
export const SPEAKER_HANDLE = '@vanessamarelycode';

const params = new URLSearchParams(location.search);

/** ?session=ensayo1 usa una sesión aparte (ideal para ensayar sin ensuciar la de la charla). */
export const SESSION_PARAM = params.get('session');
export const SESSION_ID = SESSION_PARAM || import.meta.env.VITE_SESSION_ID || 'devfest-gt-2026';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

/** ?local fuerza el modo ensayo (BroadcastChannel) aunque haya config de Firebase. */
export const hasFirebase = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId) && !params.has('local');

export const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** URLs públicas: los slides enlazan a la demo y viceversa (en local, los puertos de Vite). */
export const SLIDES_URL = import.meta.env.DEV ? 'http://localhost:5173' : (import.meta.env.VITE_SLIDES_URL as string) || location.origin;
export const DEMO_URL = import.meta.env.DEV ? 'http://localhost:5174' : (import.meta.env.VITE_DEMO_URL as string) || '/';

/** Conserva ?local y ?session al construir enlaces entre deck, consola y app de asistentes. */
export function withSessionParams(path: string): string {
  const url = new URL(path, location.origin);
  if (SESSION_PARAM) url.searchParams.set('session', SESSION_PARAM);
  if (params.has('local')) url.searchParams.set('local', '');
  return url.toString();
}
