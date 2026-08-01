/*
 * ClerkAccountPanel — the /account page's sign-in + profile surface.
 * Replaces the old Firebase AccountPanel. Clerk-only, client:load island.
 *
 * Signed out → Clerk <SignIn> card (Google, GitHub, email magic-link, passkeys
 * — whatever is enabled in the Clerk dashboard), plus a "browse anonymously"
 * escape hatch (the free ledger never requires auth).
 * Signed in → profile summary + <UserButton> for management.
 *
 * One Clerk org = one session across every *.oriz.in site.
 */
import { SignedIn, SignedOut, SignIn, UserButton, useUser } from '@clerk/clerk-react'
import ClerkProvider from './auth/ClerkProvider'

function SignedInSummary() {
  const { user } = useUser()
  const name = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? 'there'
  return (
    <div className="acct-signed-in">
      <div className="acct-row">
        <UserButton afterSignOutUrl="/account/" />
        <div className="acct-who">
          <p className="acct-hi">Signed in as {name}</p>
          <p className="acct-sub">
            Your session works across every oriz site. Saved cards and comparisons follow you.
          </p>
        </div>
      </div>
      <a className="acct-link" href="/">
        Browse the card ledger →
      </a>
    </div>
  )
}

export default function ClerkAccountPanel() {
  return (
    <ClerkProvider>
      <SignedOut>
        <div className="acct-signin-mount">
          <SignIn
            routing="hash"
            signUpUrl="/account/"
            fallbackRedirectUrl="/account/"
          />
          <p className="acct-anon">
            Just browsing? <a href="/">Continue anonymously →</a> The card ledger is always free and
            never asks you to sign in.
          </p>
        </div>
      </SignedOut>
      <SignedIn>
        <SignedInSummary />
      </SignedIn>

      <style>{`
        .acct-signin-mount { display: flex; flex-direction: column; gap: 1rem; align-items: center; }
        .acct-anon { color: var(--ink-mute, #6B6A63); font-size: 14px; text-align: center; max-width: 42ch; }
        .acct-anon a { color: var(--rupay, #097DC6); text-decoration: underline; text-underline-offset: 3px; }
        .acct-signed-in { display: flex; flex-direction: column; gap: 1.25rem; }
        .acct-row { display: flex; align-items: center; gap: 1rem; }
        .acct-who { display: flex; flex-direction: column; gap: 0.25rem; }
        .acct-hi { margin: 0; font-family: var(--font-display, 'Hanken Grotesk', sans-serif); font-size: 1.125rem; color: var(--ink, #12131A); }
        .acct-sub { margin: 0; color: var(--ink-mute, #6B6A63); font-size: 14px; }
        .acct-link { color: var(--rupay, #097DC6); text-decoration: underline; text-underline-offset: 3px; font-size: 14px; }
      `}</style>
    </ClerkProvider>
  )
}
