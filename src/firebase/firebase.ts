import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Initialize Firebase using environment variables with safe config fallbacks
const env = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || (firebaseConfigJson as any).databaseURL || `https://${firebaseConfigJson.projectId}-default-rtdb.firebaseio.com`
};

// Singleton App Instance
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Auth Instance
export const auth = getAuth(app);

// Enable standard browser session persistence by default
setPersistence(auth, browserLocalPersistence).catch(() => {
  setPersistence(auth, browserSessionPersistence).catch(() => {});
});

// Firestore Instance
const databaseId = (firebaseConfigJson as any).firestoreDatabaseId || 'ai-studio-18a06fb7-6d93-4f48-8713-9d60be376792';
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, databaseId);

// Firebase Realtime Database Instance
let rtdbInstance: Database | null = null;
try {
  rtdbInstance = getDatabase(app, firebaseConfig.databaseURL);
} catch (e) {
  try {
    rtdbInstance = getDatabase(app);
  } catch (err) {
    console.warn("RTDB initialization warning:", err);
  }
}
export const rtdb = rtdbInstance;

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export default app;
