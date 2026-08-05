import { ClerkProvider as ClerkReactProvider } from '@clerk/clerk-react'
import type { ReactNode } from 'react'

const publishableKey = import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY

// The Embossing Plate — phosphor-mint primary on a graphite-steel deck,
// Instrument Serif headings, oxidized-brass avatar ring. Themed to this
// site's palette.
const appearance = {
  variables: {
    colorPrimary: '#5FD0A8',
    colorText: '#E8E4D8',
    colorTextSecondary: '#8B97A0',
    colorBackground: '#1B2027',
    colorInputBackground: '#14181D',
    colorInputText: '#E8E4D8',
    colorDanger: '#E2674F',
    borderRadius: '3px',
    fontFamily: "'Archivo', system-ui, sans-serif",
  },
  elements: {
    card: {
      backgroundColor: '#1B2027',
      border: '1px solid #3A434D',
      boxShadow: '0 1px 0 #96702F, 0 12px 40px rgba(0,0,0,0.5)',
      borderRadius: '8px',
    },
    headerTitle: {
      fontFamily: "'Instrument Serif', Georgia, serif",
      fontStyle: 'italic',
      color: '#E8E4D8',
      letterSpacing: '-0.01em',
    },
    headerSubtitle: { color: '#8B97A0' },
    formButtonPrimary: {
      backgroundColor: '#5FD0A8',
      color: '#0B1A15',
      fontWeight: '600',
      borderRadius: '3px',
      textTransform: 'none',
    },
    formFieldInput: {
      backgroundColor: '#14181D',
      borderColor: '#3A434D',
      color: '#E8E4D8',
    },
    formFieldLabel: { color: '#E8E4D8' },
    footerActionLink: { color: '#5FD0A8' },
    identityPreviewEditButton: { color: '#5FD0A8' },
    logoBox: { height: '28px' },
  },
} as const

export default function ClerkProvider({ children }: { children: ReactNode }) {
  if (!publishableKey) return <>{children}</>
  return (
    <ClerkReactProvider publishableKey={publishableKey} appearance={appearance}>
      {children}
    </ClerkReactProvider>
  )
}
