/*
 * Firebase (Firestore only) — shared oriz-in project. Auth is Clerk's job;
 * Firestore holds small per-user card data keyed by the Clerk user id.
 *
 * Config comes from import.meta.env.PUBLIC_FIREBASE_* (browser-safe). When
 * the env is absent (local dev without secrets), getDb() returns null and
 * callers fall back to localStorage — the free registry never depends on it.
 *
 * Firestore layout:  users/{clerkUserId}/cards/wishlist  → { ids: string[] }
 */
import { type FirebaseApp, getApps, initializeApp } from 'firebase/app'
import { type Firestore, getFirestore } from 'firebase/firestore'

const cfg = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
}

let app: FirebaseApp | null = null
let db: Firestore | null = null

export function getDb(): Firestore | null {
  if (!cfg.apiKey || !cfg.projectId) return null
  if (!app) app = getApps()[0] ?? initializeApp(cfg)
  if (!db) db = getFirestore(app)
  return db
}
