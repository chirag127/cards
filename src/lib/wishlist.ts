/*
 * Client-side wishlist store — Clerk userId + localStorage. No backend.
 * Runs only in React islands (browser). Keyed per signed-in Clerk user;
 * anonymous visitors fall back to a shared `guest` bucket. Card ids are the
 * string `id` from data/cards.json (see lib/cards.ts FullCard.id).
 *
 * Upgrade path: swap the read/write pair for a Firestore doc keyed by userId;
 * the exported signatures stay identical.
 */

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
  localStorage.setItem(keyFor(userId), JSON.stringify([...new Set(ids)]))
}

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
