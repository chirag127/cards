import { ClerkProvider as ClerkReactProvider } from '@clerk/clerk-react'
import type { ReactNode } from 'react'

const publishableKey =
  import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY ?? 'pk_live_Y2xlcmsub3Jpei5pbiQ'

export default function ClerkProvider({ children }: { children: ReactNode }) {
  return <ClerkReactProvider publishableKey={publishableKey}>{children}</ClerkReactProvider>
}
