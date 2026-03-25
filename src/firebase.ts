/// <reference types="vite/client" />
import { initializeApp, FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfigJson from '../firebase-applet-config.json';

// Support both JSON file and environment variables
const config: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
};

const databaseId = import.meta.env.VITE_FIRESTORE_DATABASE_ID || firebaseConfigJson.firestoreDatabaseId;

if (!config.apiKey || config.apiKey.includes('TODO')) {
  throw new Error('Configuración de Firebase incompleta. Asegúrate de haber configurado las variables de entorno en Vercel o de incluir el archivo firebase-applet-config.json.');
}

let app;
let auth: any;
let db: any;

try {
  app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app, databaseId);
} catch (error) {
  console.error('Error al inicializar Firebase:', error);
  // Fallback to avoid crashing the whole module import
  auth = { currentUser: null } as any;
  db = {} as any;
}

export { auth, db };
