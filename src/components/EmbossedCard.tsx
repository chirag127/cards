/*
 * EmbossedCard — CSS-rendered CR80 credit card with the signed-in user's
 * displayName text-shadow-embossed onto it. This is the cards-site
 * SIGNATURE component — no images, no SVG cards, no Lottie flips. Pure CSS
 * + a Firebase auth subscription for the cardholder line.
 *
 * Real CR80 proportions: 86 × 54mm. Hero size: 480 × 302 (≈ 1px = 0.18mm).
 * List/drawer thumbnail: 140 × 88 (≈ 1px = 0.61mm).
 *
 * Components rendered in CSS only:
 *   - Top-left: issuer logo wordmark (text — bank short code uppercased,
 *     embossed) — we don't ship 35 SVG bank logos, the type-only treatment
 *     is intentional and matches the spec's "issuer SVG, white at 88%"
 *     spirit while staying image-free.
 *   - Bottom-right: network logo wordmark (text — VISA / MASTERCARD /
 *     RUPAY / AMEX / DINERS / DISCOVER, embossed).
 *   - EMV chip: brass-gradient rectangle with horizontal hairlines, at
 *     left-center, 28% from top.
 *   - BIN window: `4242 •••• •••• ••••` Geist Mono — first 4 chars from
 *     the card's network/BIN; rest dotted. Embossed.
 *   - Cardholder line: bottom-left, 14% from bottom. From Firebase auth
 *     `displayName`, fallback `YOUR NAME HERE`. In list/drawer thumbnails,
 *     name is redacted to dots per the spec.
 *   - Expiry: `••/••` placeholder above cardholder.
 *
 * Embossing trick: text-shadow with a 1px white highlight (top-left) plus a
 * 1px dark shadow (bottom-right). Combined with `transform: translateZ(0)`
 * the text reads as physically pressed plastic.
 */
import { onAuthStateChanged } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { auth } from '~/lib/firebase'

interface Props {
  size?: 'hero' | 'thumb'
  cardName?: string
  bankCode: string
  bankName: string
  network: string
  /** Optional override for the gradient stock. Two CSS color stops. */
  stock?: [string, string]
  /** First 4 BIN digits. */
  binPrefix?: string
  /** When true (the default for thumbnails), redact the name to dots. */
  redactName?: boolean
}

const NETWORK_LABEL: Record<string, string> = {
  Visa: 'VISA',
  Mastercard: 'MASTERCARD',
  RuPay: 'RuPay',
  Amex: 'AMERICAN EXPRESS',
  DinersClub: 'DINERS',
  Discover: 'DISCOVER',
}

export default function EmbossedCard({
  size = 'hero',
  cardName,
  bankCode,
  bankName,
  network,
  stock,
  binPrefix = '4242',
  redactName,
}: Props) {
  const [displayName, setDisplayName] = useState<string | null>(null)
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setDisplayName(u?.displayName ?? null)
      }),
    [],
  )

  const isThumb = size === 'thumb'
  const shouldRedact = redactName ?? isThumb
  const fallbackName = 'YOUR NAME HERE'
  const rawName = displayName?.toUpperCase() ?? fallbackName
  const cardholderName = shouldRedact
    ? rawName
        .split(' ')
        .map((w) => '•'.repeat(Math.max(2, Math.min(w.length, 6))))
        .join(' ')
    : rawName

  const stockA = stock?.[0] ?? '#2B3A55'
  const stockB = stock?.[1] ?? '#1A2438'
  const networkLabel = NETWORK_LABEL[network] ?? network.toUpperCase()
  const issuerLabel = (bankCode ?? bankName).toUpperCase()

  return (
    <div
      className={`emboss emboss-${size}`}
      style={{
        // Background gradient varies per card; everything else is constant.
        ['--card-stock-a' as string]: stockA,
        ['--card-stock-b' as string]: stockB,
      }}
      role="img"
      aria-label={`${bankName} ${cardName ?? 'card'} (${networkLabel})`}
    >
      <div className="emboss-issuer emboss-text" data-emboss-text>
        {issuerLabel}
      </div>
      <div className="emboss-chip" aria-hidden="true">
        <span className="emboss-chip-line" />
        <span className="emboss-chip-line" />
        <span className="emboss-chip-line" />
        <span className="emboss-chip-line" />
        <span className="emboss-chip-line" />
      </div>
      <div className="emboss-bin emboss-text" data-emboss-text>
        {binPrefix} •••• •••• ••••
      </div>
      <div className="emboss-meta-row">
        <div className="emboss-expiry">
          <span className="emboss-meta-label">VALID THRU</span>
          <span className="emboss-meta-value emboss-text" data-emboss-text>
            ••/••
          </span>
        </div>
      </div>
      <div className="emboss-name emboss-text" data-emboss-text>
        {cardholderName}
      </div>
      <div className="emboss-network emboss-text" data-emboss-text>
        {networkLabel}
      </div>
      <div className="emboss-shimmer" aria-hidden="true" />

      <style>{`
        /* All sizes share the same proportions and emboss treatment — only
           the absolute pixel values differ. */
        .emboss {
          position: relative;
          background:
            radial-gradient(120% 80% at 0% 0%, color-mix(in oklab, var(--card-stock-a) 90%, white) 0%, var(--card-stock-a) 35%, var(--card-stock-b) 100%);
          color: rgba(255, 255, 255, 0.88);
          font-family: var(--font-display);
          font-weight: 700;
          letter-spacing: 0.04em;
          overflow: hidden;
          isolation: isolate;
          /* The card sheen — a subtle linear highlight crossing diagonally. */
          transform: perspective(800px) rotateY(0) rotateX(0) scale(1);
          transform-style: preserve-3d;
          transition: transform 200ms ease-out, box-shadow 200ms ease-out;
          will-change: transform;
        }
        .emboss:hover {
          transform: perspective(800px) rotateY(4deg) rotateX(2deg) scale(1.02);
        }
        /* Foil-shimmer sweep — diagonal light bar catching the foil on hover. */
        .emboss-shimmer {
          position: absolute;
          inset: -40% -20%;
          z-index: 3;
          pointer-events: none;
          background: linear-gradient(
            115deg,
            transparent 30%,
            rgba(255, 255, 255, 0.28) 45%,
            rgba(228, 206, 150, 0.55) 50%,
            rgba(255, 255, 255, 0.28) 55%,
            transparent 70%
          );
          transform: translateX(-120%);
          opacity: 0;
          transition: opacity 120ms ease-out;
        }
        .emboss:hover .emboss-shimmer {
          opacity: 1;
          animation: emboss-shimmer-sweep 900ms ease-out;
        }
        @keyframes emboss-shimmer-sweep {
          from { transform: translateX(-120%); }
          to { transform: translateX(120%); }
        }
        .emboss::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, transparent 30%, transparent 70%, rgba(0, 0, 0, 0.18) 100%);
          pointer-events: none;
          z-index: 1;
        }
        .emboss::after {
          content: "";
          position: absolute;
          inset: 0;
          /* The hologram-strip hint — vertical thin band on the right. */
          background:
            linear-gradient(90deg, transparent 75%, rgba(255, 255, 255, 0.04) 76%, rgba(255, 255, 255, 0.08) 79%, rgba(255, 255, 255, 0.04) 82%, transparent 83%);
          pointer-events: none;
          z-index: 1;
        }
        .emboss-text {
          position: absolute;
          z-index: 2;
          color: rgba(255, 255, 255, 0.9);
          /* The embossing — the load-bearing CSS in this component. */
          text-shadow:
            0 1px 0 rgba(255, 255, 255, 0.22),
            0 -1px 0 rgba(0, 0, 0, 0.5),
            0 0 1px rgba(0, 0, 0, 0.4);
          transform: translateZ(0);
          font-feature-settings: 'tnum' 1, 'zero' 1, 'calt' 0;
        }

        /* HERO — 480 × 302. */
        .emboss-hero {
          width: min(480px, 100%);
          aspect-ratio: 86 / 54;
          border-radius: 16px;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.08) inset,
            0 0 0 1px rgba(0, 0, 0, 0.3),
            0 18px 36px rgba(0, 0, 0, 0.32),
            0 4px 8px rgba(0, 0, 0, 0.18);
        }
        .emboss-hero .emboss-issuer {
          top: 22px;
          left: 24px;
          font-size: 14px;
          letter-spacing: 0.18em;
        }
        .emboss-hero .emboss-chip {
          top: 28%;
          left: 28px;
          width: 50px;
          height: 38px;
          z-index: 2;
        }
        .emboss-hero .emboss-bin {
          left: 28px;
          top: calc(28% + 56px);
          font-size: 22px;
          letter-spacing: 0.16em;
        }
        .emboss-hero .emboss-meta-row {
          position: absolute;
          left: 28px;
          bottom: 22%;
          z-index: 2;
        }
        .emboss-hero .emboss-name {
          left: 28px;
          bottom: 22px;
          font-size: 14px;
          letter-spacing: 0.18em;
        }
        .emboss-hero .emboss-network {
          right: 24px;
          bottom: 22px;
          font-size: 18px;
          letter-spacing: 0.18em;
        }

        /* THUMB — 140 × 88, used in ledger rows + compare drawer. */
        .emboss-thumb {
          width: 140px;
          height: 88px;
          border-radius: 6px;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.08) inset,
            0 0 0 1px rgba(0, 0, 0, 0.25),
            0 4px 8px rgba(0, 0, 0, 0.2);
          flex-shrink: 0;
        }
        .emboss-thumb .emboss-issuer {
          top: 6px;
          left: 8px;
          font-size: 7px;
          letter-spacing: 0.12em;
          max-width: 70%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .emboss-thumb .emboss-chip {
          top: 32%;
          left: 8px;
          width: 14px;
          height: 11px;
          z-index: 2;
        }
        .emboss-thumb .emboss-bin {
          left: 8px;
          top: calc(32% + 16px);
          font-size: 8px;
          letter-spacing: 0.06em;
        }
        .emboss-thumb .emboss-meta-row {
          display: none; /* Too small to render readably. */
        }
        .emboss-thumb .emboss-name {
          left: 8px;
          bottom: 8px;
          font-size: 7px;
          letter-spacing: 0.08em;
        }
        .emboss-thumb .emboss-network {
          right: 8px;
          bottom: 8px;
          font-size: 7px;
          letter-spacing: 0.12em;
        }

        /* The chip itself — brass gradient + 5 horizontal hairlines. */
        .emboss-chip {
          position: absolute;
          background: linear-gradient(135deg, #ecd28a 0%, #d4ae5c 30%, #b8923a 60%, #8b6e2a 100%);
          border-radius: 3px;
          display: grid;
          grid-template-rows: repeat(5, 1fr);
          align-content: stretch;
          padding: 1px;
          gap: 1px;
          box-shadow:
            0 0 0 0.5px rgba(0, 0, 0, 0.4),
            0 1px 1px rgba(0, 0, 0, 0.25),
            inset 0 0 0 1px rgba(255, 255, 255, 0.1);
        }
        .emboss-chip-line {
          background: linear-gradient(90deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0.3));
          height: 1px;
          align-self: end;
        }

        .emboss-meta-label {
          display: block;
          font-family: var(--font-mono);
          font-size: 8px;
          color: rgba(255, 255, 255, 0.52);
          letter-spacing: 0.18em;
          text-transform: uppercase;
          margin-bottom: 3px;
          text-shadow: none;
        }
        .emboss-meta-value {
          font-size: 13px;
          letter-spacing: 0.08em;
        }

        @media (prefers-reduced-motion: reduce) {
          .emboss,
          .emboss:hover {
            transition: box-shadow 200ms ease-out;
            transform: none;
          }
          .emboss:hover {
            box-shadow:
              0 1px 0 rgba(255, 255, 255, 0.08) inset,
              0 0 0 1px rgba(0, 0, 0, 0.3),
              0 22px 44px rgba(0, 0, 0, 0.4);
          }
          .emboss-shimmer { display: none; }
        }
      `}</style>
    </div>
  )
}
