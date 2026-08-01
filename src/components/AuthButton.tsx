/*
 * AuthButton — compact top-right sign-in / account island (client:load).
 * Reflects the shared Firebase auth state (oriz family SSO). Signed out →
 * "sign in"; signed in → the user's name/email linking to /account/.
 *
 * Per the no-auth rule this gates only saved-cards/compare-sync, never the
 * free ledger. This repo has no Clerk dependency — Firebase is the family
 * auth provider, so the "auth button island" is wired to it.
 */
import { onAuthStateChanged, type User } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { auth } from '~/lib/firebase'

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setReady(true)
    })
    return unsub
  }, [])

  const label = !ready ? 'sign in' : user ? (user.displayName ?? user.email ?? 'account') : 'sign in'

  return (
    <a className="auth-btn mono" href="/account/" aria-label={user ? 'Account' : 'Sign in'}>
      <span className="auth-dot" data-on={user ? 'true' : 'false'} aria-hidden="true" />
      {label}
    </a>
  )
}
