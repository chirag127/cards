/*
 * Wishlist store — Clerk userId + localStorage for instant UX, mirrored to
 * Firestore (shared oriz-in DB) when signed in so saved cards follow the user
 * across devices + across *.oriz.in. No Firebase auth — Clerk owns identity;
 * Firestore rows are keyed by the Clerk user id.
 *
 * Sync model:
 *   - localStorage is the instant local cache (works signed-out, offline).
 *   - On sign-in, loadWishlist(userId) merges the Firestore doc with local.
 *   - Every mutation writes local synchronously + fires Firestore in the bg.
 * Card ids are the string `id` from data/cards.json (see lib/cards.ts).
 */
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { getDb } from './firebase'

const KEY_PREFIX = 'cards.oriz.in:wishlist:'

function keyFor(userId: string | null | undefined): string {
  return `${KEY_PREFIX}${userId ?? 'guest'}`
}

function read(userId: string | null | undefined): string[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(keyFor(userId))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

function write(userId: string | null | undefined, ids: string[]): void {
  if (typeof localStorage === 'undefined') return
  const unique = [...new Set(ids)]
  localStorage.setItem(keyFor(userId), JSON.stringify(unique))
  if (userId) void pushToFirestore(userId, unique)
}

// ── Firestore mirror ────────────────────────────────────────────────────────

function ref(userId: string) {
  const db = getDb()
  return db ? doc(db, 'users', userId, 'cards', 'wishlist') : null
}

async function pushToFirestore(userId: string, ids: string[]): Promise<void> {
  const r = ref(userId)
  if (!r) return
  try {
    await setDoc(r, { ids, updatedAt: Date.now() })
  } catch {
    /* offline / rules — local cache still holds; retried on next mutation */
  }
}

/** Merge the Firestore doc into local for this user; returns the merged ids. */
export async function loadWishlist(userId: string): Promise<string[]> {
  const local = read(userId)
  const r = ref(userId)
  if (!r) return local
  try {
    const snap = await getDoc(r)
    const remote = (snap.exists() ? (snap.data().ids as unknown) : []) as string[]
    const merged = [...new Set([...local, ...(Array.isArray(remote) ? remote : [])])]
    write(userId, merged)
    return merged
  } catch {
    return local
  }
}

// ── Sync local API (unchanged signatures) ────────────────────────────────────

export function listWishlist(userId: string | null | undefined): string[] {
  return read(userId)
}

export function isWishlisted(userId: string | null | undefined, cardId: string): boolean {
  return read(userId).includes(cardId)
}

export function saveToWishlist(userId: string | null | undefined, cardId: string): string[] {
  const next = [...read(userId), cardId]
  write(userId, next)
  return read(userId)
}

export function removeFromWishlist(userId: string | null | undefined, cardId: string): string[] {
  const next = read(userId).filter((id) => id !== cardId)
  write(userId, next)
  return next
}

export function toggleWishlist(userId: string | null | undefined, cardId: string): string[] {
  return isWishlisted(userId, cardId)
    ? removeFromWishlist(userId, cardId)
    : saveToWishlist(userId, cardId)
}
