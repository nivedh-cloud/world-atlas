import {
  initializeApp,
  getApps,
  type FirebaseApp,
  type FirebaseOptions,
} from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';

import pkg from '../../package.json' with { type: 'json' };

import {
  SHARED_FEEDBACK_APP_NAME,
  SHARED_FEEDBACK_FIREBASE_DEFAULTS,
} from '../config/sharedFeedbackFirebase';

/** Matches the `appSource` field stored with each feedback document. */
export const FEEDBACK_APP_SOURCE = 'World Atlas' as const;

export function getAppVersion(): string {
  return pkg.version ?? '0.0.0';
}

function resolveFeedbackFirebaseOptions(): FirebaseOptions {
  const e = import.meta.env;
  const d = SHARED_FEEDBACK_FIREBASE_DEFAULTS;
  return {
    apiKey: e.VITE_FIREBASE_API_KEY?.trim() ?? d.apiKey,
    authDomain:
      e.VITE_FIREBASE_AUTH_DOMAIN?.trim() ?? d.authDomain,
    projectId: e.VITE_FIREBASE_PROJECT_ID?.trim() ?? d.projectId,
    storageBucket:
      e.VITE_FIREBASE_STORAGE_BUCKET?.trim() ?? d.storageBucket,
    messagingSenderId:
      e.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? d.messagingSenderId,
    appId: e.VITE_FIREBASE_APP_ID?.trim() ?? d.appId,
  };
}

/** True when required fields are present (defaults cover the shared feedback hub project). */
export function isFeedbackFirestoreConfigured(): boolean {
  const o = resolveFeedbackFirebaseOptions();
  return Boolean(o.apiKey && o.projectId && o.appId);
}

function getSharedFeedbackFirestoreApp(): FirebaseApp {
  const options = resolveFeedbackFirebaseOptions();
  let app = getApps().find((a) => a.name === SHARED_FEEDBACK_APP_NAME);
  if (app) return app;
  try {
    return initializeApp(options, SHARED_FEEDBACK_APP_NAME);
  } catch {
    app = getApps().find((a) => a.name === SHARED_FEEDBACK_APP_NAME);
    if (app) return app;
    throw new Error('Failed to initialize Firebase for feedback.');
  }
}

export type FeedbackSubmitPayload = {
  /** Optional — omitted in Firestore when empty. */
  name?: string;
  /** Optional — omitted in Firestore when empty. */
  email?: string;
  message: string;
};

/** Writes one document to the `feedback` collection. */
export async function submitFeedback(
  payload: FeedbackSubmitPayload,
): Promise<void> {
  if (!isFeedbackFirestoreConfigured()) {
    throw new Error('Feedback Firebase config is incomplete.');
  }

  const app = getSharedFeedbackFirestoreApp();
  const db = getFirestore(app);

  const message = payload.message.trim();
  if (!message) throw new Error('Message is required.');

  const doc: Record<string, unknown> = {
    message,
    appVersion: getAppVersion(),
    receivedAt: serverTimestamp(),
    appSource: FEEDBACK_APP_SOURCE,
  };
  const name = payload.name?.trim();
  const email = payload.email?.trim();
  if (name) doc.name = name;
  if (email) doc.email = email;

  await addDoc(collection(db, 'feedback'), doc);
}
