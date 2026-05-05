import type { FirebaseOptions } from 'firebase/app';

/**
 * Central Firebase project for feedback from all apps (Firestore `feedback` collection).
 * Values match `google-services.json` project **bible-trace-maps** (shared hub).
 *
 * Override any field via VITE_FIREBASE_* in `.env.local` if you rotate keys or use a dedicated Web registration.
 *
 * NOTE: Firebase requires an `appId`. This uses the project's Android-registration ID from google-services.json;
 * if Installations rejects it in the browser, add a Web app in this Firebase project and set `VITE_FIREBASE_APP_ID`.
 */
export const SHARED_FEEDBACK_FIREBASE_DEFAULTS: FirebaseOptions = {
  apiKey: 'AIzaSyDcUsKDA5l5i4PyEPer-AQqPrnXB07kHps',
  authDomain: 'bible-trace-maps.firebaseapp.com',
  projectId: 'bible-trace-maps',
  storageBucket: 'bible-trace-maps.firebasestorage.app',
  messagingSenderId: '1067822285275',
  appId: '1:1067822285275:android:6936db9e10fb2b321667fe',
};

export const SHARED_FEEDBACK_APP_NAME = 'shared-feedback-console' as const;
