/*
 * AuthButton — compact top-right sign-in / account island (client:load).
 * Vault & Foil styled Clerk auth. Signed out → foil-bordered "Sign in"
 * button opening a modal; signed in → Clerk <UserButton>.
 *
 * Per the no-auth rule this gates only saved-cards/compare-sync, never the
 * free ledger.
 */
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import ClerkProvider from './auth/ClerkProvider'

export default function AuthButton() {
  return (
    <ClerkProvider>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="auth-btn" type="button" aria-label="Sign in">
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              userButtonAvatarBox: {
                width: '28px',
                height: '28px',
                border: '1.5px solid #C6A15B',
                boxShadow: '0 0 0 2px rgba(198,161,91,0.25)',
              },
            },
          }}
        />
      </SignedIn>
    </ClerkProvider>
  )
}
