import { FirebaseOptions, getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseEnv = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim(),
};

const requiredConfigKeys = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
] as const;

const missingConfigKeys = requiredConfigKeys.filter((key) => !firebaseEnv[key]);

if (missingConfigKeys.length > 0) {
  const envMap: Record<(typeof requiredConfigKeys)[number], string> = {
    apiKey: "VITE_FIREBASE_API_KEY",
    authDomain: "VITE_FIREBASE_AUTH_DOMAIN",
    projectId: "VITE_FIREBASE_PROJECT_ID",
    storageBucket: "VITE_FIREBASE_STORAGE_BUCKET",
    messagingSenderId: "VITE_FIREBASE_MESSAGING_SENDER_ID",
    appId: "VITE_FIREBASE_APP_ID",
  };

  const missingEnvVars = missingConfigKeys.map((key) => envMap[key]).join(", ");
  throw new Error(
    `[Firebase] Configuracao incompleta. Defina no .env: ${missingEnvVars}`,
  );
}

const firebaseConfig: FirebaseOptions = {
  apiKey: firebaseEnv.apiKey!,
  authDomain: firebaseEnv.authDomain!,
  projectId: firebaseEnv.projectId!,
  storageBucket: firebaseEnv.storageBucket!,
  messagingSenderId: firebaseEnv.messagingSenderId!,
  appId: firebaseEnv.appId!,
  ...(firebaseEnv.measurementId ? { measurementId: firebaseEnv.measurementId } : {}),
};

export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);

const canInitAnalytics =
  typeof window !== "undefined" &&
  !!firebaseEnv.measurementId &&
  import.meta.env.PROD &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1";

export const analytics = canInitAnalytics ? getAnalytics(firebaseApp) : null;
