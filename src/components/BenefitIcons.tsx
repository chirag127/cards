/*
 * BenefitIcons — a row of benefit glyphs for a card. Each icon is a slug from
 * the card's `benefitIcons` array; the visual is an emoji (no icon library
 * shipped). On hover/focus a pure-CSS dark tooltip shows the specific benefit
 * text pulled from the card's `benefits[]`, matched to the icon's category.
 *
 * Accessibility: each icon is a keyboard-focusable <button> with an aria-label
 * (label + matched benefit text). Tooltip is CSS-only (:hover / :focus-visible),
 * hidden from AT via aria-hidden since the button label already carries it.
 */
import type { Card } from '~/content/cards/schema'

type Benefit = NonNullable<Card['benefits']>[number]

interface IconDef {
  emoji: string
  label: string
  /** benefit categories/titles this slug matches, lowercased */
  match: string[]
}

const ICONS: Record<string, IconDef> = {
  cashback: { emoji: '💳', label: 'Cashback', match: ['cashback'] },
  lounge: { emoji: '🛋️', label: 'Lounge access', match: ['lounge', 'airport'] },
  travel: { emoji: '✈️', label: 'Travel', match: ['travel', 'flight', 'air'] },
  fuel: { emoji: '⛽', label: 'Fuel surcharge waiver', match: ['fuel'] },
  dining: { emoji: '🍽️', label: 'Dining', match: ['dining', 'restaurant', 'food'] },
  shopping: { emoji: '🛒', label: 'Shopping', match: ['shopping', 'retail'] },
  movie: { emoji: '🎬', label: 'Movie tickets', match: ['movie', 'cinema', 'entertainment'] },
  grocery: { emoji: '🛍️', label: 'Grocery', match: ['grocery', 'supermarket'] },
  health: { emoji: '🏥', label: 'Health', match: ['health', 'medical', 'wellness'] },
  insurance: { emoji: '🛡️', label: 'Insurance', match: ['insurance', 'protection', 'cover'] },
  rewards: { emoji: '⭐', label: 'Rewards', match: ['rewards', 'points', 'reward'] },
  milestone: { emoji: '🎯', label: 'Milestone benefits', match: ['milestone'] },
  forex: { emoji: '💱', label: 'Forex', match: ['forex', 'foreign', 'markup', 'international'] },
  golf: { emoji: '⛳', label: 'Golf privileges', match: ['golf'] },
  concierge: { emoji: '🛎️', label: 'Concierge', match: ['concierge'] },
}

function matchBenefit(def: IconDef, benefits: Benefit[]): string | undefined {
  const hit = benefits.find((b) => {
    const hay = `${b.category ?? ''} ${b.title ?? ''}`.toLowerCase()
    return def.match.some((m) => hay.includes(m))
  })
  if (!hit) return undefined
  return hit.description ?? hit.valueStr ?? hit.title
}

interface Props {
  benefitIcons: string[]
  benefits?: Benefit[]
}

export default function BenefitIcons({ benefitIcons, benefits = [] }: Props) {
  const items = benefitIcons
    .map((slug) => ({ slug, def: ICONS[slug] }))
    .filter((x): x is { slug: string; def: IconDef } => Boolean(x.def))

  if (items.length === 0) return null

  return (
    <ul className="bfi" aria-label="Card benefits">
      {items.map(({ slug, def }) => {
        const text = matchBenefit(def, benefits)
        const tip = text ? `${def.label}: ${text}` : def.label
        return (
          <li key={slug} className="bfi-item">
            <button type="button" className="bfi-btn" aria-label={tip}>
              <span className="bfi-glyph" aria-hidden="true">
                {def.emoji}
              </span>
              <span className="bfi-tip" role="tooltip" aria-hidden="true">
                <strong>{def.label}</strong>
                {text ? <span className="bfi-tip-desc">{text}</span> : null}
              </span>
            </button>
          </li>
        )
      })}

      <style>{`
        .bfi {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .bfi-item { display: inline-flex; }
        .bfi-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          padding: 0;
          border: 1px solid var(--rule);
          border-radius: 8px;
          background: var(--paper-raised);
          color: var(--ink);
          cursor: help;
          font-size: 16px;
          line-height: 1;
          transition: border-color 120ms ease, background 120ms ease, transform 120ms ease;
        }
        .bfi-btn:hover,
        .bfi-btn:focus-visible {
          border-color: var(--accent);
          background: var(--paper-deep);
          transform: translateY(-1px);
          outline: none;
        }
        .bfi-btn:focus-visible {
          box-shadow: 0 0 0 2px color-mix(in oklab, var(--accent) 45%, transparent);
        }
        .bfi-glyph {
          font-family:
            'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
        }
        .bfi-tip {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%) translateY(4px);
          z-index: 30;
          display: flex;
          flex-direction: column;
          gap: 3px;
          width: max-content;
          max-width: 220px;
          padding: 8px 10px;
          border-radius: 8px;
          background: var(--ink);
          color: var(--paper-raised);
          font-family: var(--font-sans);
          font-size: 12px;
          line-height: 1.4;
          text-align: left;
          letter-spacing: 0;
          white-space: normal;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
          transition: opacity 120ms ease, transform 120ms ease, visibility 120ms;
        }
        .bfi-tip strong {
          font-weight: 600;
          font-size: 11px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--brass-light);
        }
        .bfi-tip-desc { color: color-mix(in oklab, var(--paper-raised) 82%, var(--ink)); }
        .bfi-tip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 5px solid transparent;
          border-top-color: var(--ink);
        }
        .bfi-btn:hover .bfi-tip,
        .bfi-btn:focus-visible .bfi-tip {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .bfi-btn, .bfi-tip { transition: none; }
        }
      `}</style>
    </ul>
  )
}
