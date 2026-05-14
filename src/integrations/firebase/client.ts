import { getApp, getApps, initializeApp } from 'firebase/app'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim(),
}

const placeholderFirebaseConfig = {
  apiKey: 'placeholder-api-key',
  authDomain: 'placeholder.firebaseapp.com',
  projectId: 'placeholder-project',
  storageBucket: 'placeholder.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:placeholder',
  measurementId: 'G-PLACEHOLDER',
}

const useFirestoreEmulator =
  import.meta.env.VITE_FIREBASE_USE_EMULATOR?.trim() === 'true'
const firestoreEmulatorHost =
  import.meta.env.VITE_FIRESTORE_EMULATOR_HOST?.trim() || '127.0.0.1'
const firestoreEmulatorPort = Number(
  import.meta.env.VITE_FIRESTORE_EMULATOR_PORT?.trim() || '8080',
)
const emulatorConnectionFlag = '__WSWM_FIRESTORE_EMULATOR_CONNECTED__'

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
)

if (!isFirebaseConfigured) {
  console.warn(
    'Firebase environment variables are missing. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID before using Firestore-backed flows.',
  )
}

const app = getApps().length > 0
  ? getApp()
  : initializeApp(isFirebaseConfigured ? firebaseConfig : placeholderFirebaseConfig)

export const db = getFirestore(app)

if (useFirestoreEmulator) {
  const globalState = globalThis as typeof globalThis & {
    [emulatorConnectionFlag]?: boolean
  }

  if (!globalState[emulatorConnectionFlag]) {
    connectFirestoreEmulator(db, firestoreEmulatorHost, firestoreEmulatorPort)
    globalState[emulatorConnectionFlag] = true
  }
}

export { app }
