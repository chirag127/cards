import { ClerkProvider as ClerkReactProvider } from '@clerk/clerk-react'
import type { ReactNode } from 'react'

const publishableKey =
  import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY ?? 'pk_live_Y2xlcmsub3Jpei5pbiQ'

// Vault & Foil — brass-gold embossed accent on warm statement paper.
const appearance = {
  variables: {
    colorPrimary: '#C6A15B',
    colorText: '#12131A',
    colorTextSecondary: '#6B6A63',
    colorBackground: '#FFFFFF',
    colorInputBackground: '#FAF8F3',
    colorInputText: '#12131A',
    colorDanger: '#C1440E',
    borderRadius: '12px',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  elements: {
    card: {
      backgroundColor: '#FFFFFF',
      border: '1px solid #E8E3D6',
      boxShadow: '0 1px 0 #E4CE96, 0 12px 40px rgba(18,19,26,0.12)',
      borderRadius: '16px',
    },
    headerTitle: {
      fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
      color: '#12131A',
      letterSpacing: '-0.01em',
    },
    headerSubtitle: { color: '#6B6A63' },
    formButtonPrimary: {
      backgroundColor: '#C6A15B',
      backgroundImage: 'linear-gradient(180deg, #E4CE96 0%, #C6A15B 55%, #9A7736 100%)',
      color: '#12131A',
      fontWeight: '600',
      borderRadius: '12px',
      boxShadow: '0 1px 0 rgba(255,255,255,0.4) inset, 0 2px 8px rgba(154,119,54,0.35)',
      textTransform: 'none',
    },
    formFieldInput: {
      backgroundColor: '#FAF8F3',
      borderColor: '#E8E3D6',
      color: '#12131A',
    },
    formFieldLabel: { color: '#12131A' },
    footerActionLink: { color: '#097DC6' },
    identityPreviewEditButton: { color: '#097DC6' },
    logoBox: { height: '28px' },
  },
} as const

export default function ClerkProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkReactProvider publishableKey={publishableKey} appearance={appearance}>
      {children}
    </ClerkReactProvider>
  )
}
