import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import ClerkProvider from './ClerkProvider'

export default function AuthButton() {
  return (
    <ClerkProvider>
      <SignedOut>
        <SignInButton mode="modal" />
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </ClerkProvider>
  )
}
