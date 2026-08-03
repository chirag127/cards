/*
 * CompareDrawer — fixed bottom-right pill that surfaces the cards the visitor
 * has ticked in the home ledger. Shares the ledger's sessionStorage bucket
 * (`oriz:cards:compare`) so ticking a row and this drawer stay in lock-step
 * across a `client:load` boundary. Max 3 cards (the compare table stays
 * legible three-wide; the ledger's own inline drawer historically allowed 4,
 * but the dedicated compare view caps at 3).
 *
 * "Compare (N)" links to /compare?ids=issuer:slug,... — the id is the stable
 * `issuer:slug` key the compare page + /compare-data.json use.
 */
import { useEffect, useState } from 'react'

const KEY = 'oriz:cards:compare'
const MAX = 4

interface Entry {
  slug: string
  issuer: string
  name: string
  bank: string
  network: string
}

function read(): Entry[] {
  try {
    const arr = JSON.parse(sessionStorage.getItem(KEY) ?? '[]')
    return Array.isArray(arr) ? arr.filter((e) => e?.slug && e?.issuer) : []
  } catch {
    return []
  }
}

export default function CompareDrawer() {
  const [items, setItems] = useState<Entry[]>([])
  const [open, setOpen] = useState(true)

  useEffect(() => {
    const sync = () => setItems(read().slice(0, MAX))
    sync()
    // Cross-document (other tab) + same-document (ledger checkbox) updates.
    window.addEventListener('storage', sync)
    window.addEventListener('oriz:compare-change', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('oriz:compare-change', sync)
    }
  }, [])

  const remove = (slug: string) => {
    const next = read().filter((x) => x.slug !== slug)
    sessionStorage.setItem(KEY, JSON.stringify(next))
    setItems(next.slice(0, MAX))
    window.dispatchEvent(new CustomEvent('oriz:compare-change'))
  }

  const ids = items.map((e) => `${e.issuer}:${e.slug}`).join(',')

  return (
    <aside className="cmp-drw" aria-label="Compare drawer">
      <button
        type="button"
        className="cmp-drw-bar mono"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>
          COMPARE · {items.length} / {MAX}
        </span>
        <span aria-hidden="true">{open ? '▾' : '▴'}</span>
      </button>

      {open && (
        <div className="cmp-drw-body">
          {items.length === 0 ? (
            <p className="cmp-drw-empty mono">add up to {MAX} cards</p>
          ) : (
            <ul className="cmp-drw-list">
              {items.map((e) => (
                <li key={`${e.issuer}:${e.slug}`} className="cmp-drw-item">
                  <span className="cmp-drw-name">{e.name}</span>
                  <span className="cmp-drw-bank mono">
                    {e.bank} · {e.network}
                  </span>
                  <button
                    type="button"
                    className="cmp-drw-x"
                    aria-label={`Remove ${e.name}`}
                    onClick={() => remove(e.slug)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <a
            className={`cmp-drw-go mono${items.length < 2 ? ' is-disabled' : ''}`}
            href={items.length < 2 ? undefined : `/compare?ids=${encodeURIComponent(ids)}`}
            aria-disabled={items.length < 2}
            aria-label={items.length < 2 ? 'Select at least 2 cards to compare' : 'Compare selected cards'}
          >
            [ COMPARE ({items.length}) → ]
          </a>
        </div>
      )}

      <style>{`
        .cmp-drw {
          position: fixed;
          right: clamp(0.75rem, 2vw, 1.5rem);
          bottom: clamp(0.75rem, 2vw, 1.5rem);
          z-index: 60;
          width: min(360px, calc(100vw - 1.5rem));
          background: var(--surface-raised);
          border: 1px solid var(--rule);
          box-shadow: none;
          font-family: var(--font-sans);
        }
        @media (max-width: 767px) {
          /* Sit above the mobile BottomBar (64px). */
          .cmp-drw { bottom: 72px; right: 0.5rem; }
        }
        .cmp-drw-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0.6rem 0.875rem;
          background: var(--accent);
          color: var(--accent-fg);
          border: 0;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: var(--font-mono);
        }
        .cmp-drw-body {
          padding: 0.75rem 0.875rem 0.875rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .cmp-drw-empty {
          margin: 0;
          color: var(--ink-mute);
          font-size: 12px;
          letter-spacing: 0.06em;
          text-align: center;
        }
        .cmp-drw-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .cmp-drw-item {
          display: grid;
          grid-template-columns: 1fr auto;
          grid-template-areas: 'name x' 'bank x';
          align-items: center;
          column-gap: 0.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px dotted var(--rule);
        }
        .cmp-drw-name {
          grid-area: name;
          font-size: 13px;
          color: var(--ink);
          line-height: 1.3;
        }
        .cmp-drw-bank {
          grid-area: bank;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-mute);
        }
        .cmp-drw-x {
          grid-area: x;
          background: transparent;
          border: 1px solid var(--rule);
          color: var(--ink-mute);
          width: 24px;
          height: 24px;
          font-size: 16px;
          line-height: 1;
          cursor: pointer;
        }
        .cmp-drw-x:hover {
          color: var(--vermilion);
          border-color: var(--vermilion);
        }
        .cmp-drw-go {
          display: block;
          text-align: center;
          padding: 0.6rem;
          background: var(--accent);
          color: var(--accent-fg);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-family: var(--font-mono);
        }
        .cmp-drw-go:hover {
          background: var(--accent-deep);
        }
        .cmp-drw-go.is-disabled {
          background: var(--paper-deep);
          color: var(--ink-mute);
          border: 1px dashed var(--rule);
          pointer-events: none;
        }
      `}</style>
    </aside>
  )
}
