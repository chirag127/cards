/*
 * CompareTable — the client:load island on /compare. Reads `?ids=` from the
 * URL, fetches the compact /compare-data.json map, and renders the picked
 * cards side by side. First column = row labels (sticky-left so labels stay
 * visible while the card columns scroll horizontally on mobile). Card visual
 * reuses the EmbossedCard thumb. Row set is fixed by the spec:
 *   visual · bank · network · type · annual fee · joining fee · fee waiver ·
 *   benefits · eligibility · apply.
 */
import { useEffect, useState } from 'react'
import EmbossedCard from '~/components/EmbossedCard.tsx'

interface CompareEntry {
  id: string
  slug: string
  issuer: string
  name: string
  bank: string
  network: string
  cardType: string
  stock: [string, string]
  binPrefix: string
  annualFee: string
  joiningFee: string
  feeWaiver: string
  benefits: string[]
  eligibility: string[]
  applyUrl?: string
}

function idsFromUrl(): string[] {
  const raw = new URLSearchParams(window.location.search).get('ids') ?? ''
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)
}

export default function CompareTable() {
  const [cards, setCards] = useState<CompareEntry[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const ids = idsFromUrl()
    if (ids.length === 0) {
      setCards([])
      return
    }
    fetch('/compare-data.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('fetch failed'))))
      .then((map: Record<string, CompareEntry>) => {
        setCards(ids.map((id) => map[id]).filter(Boolean))
      })
      .catch(() => setError(true))
  }, [])

  if (error) return <p className="cmp-msg mono">Could not load card data. Reload the page.</p>
  if (cards === null) return <p className="cmp-msg mono">Loading comparison…</p>
  if (cards.length === 0)
    return (
      <p className="cmp-msg">
        No cards selected. Tick cards in the <a href="/">ledger</a> then hit Compare.
      </p>
    )

  const cols = cards.length

  return (
    <div className="cmp-scroll">
      <table className="cmp-table" style={{ ['--cmp-cols' as string]: String(cols) }}>
        <caption className="cmp-cap mono">Comparing {cols} cards</caption>
        <tbody>
          <tr className="cmp-visual-row">
            <th scope="row" className="cmp-rowlabel">
              Card
            </th>
            {cards.map((c) => (
              <td key={c.id} className="cmp-cell cmp-cell-visual">
                <EmbossedCard
                  size="thumb"
                  cardName={c.name}
                  bankCode={c.issuer}
                  bankName={c.bank}
                  network={c.network}
                  stock={c.stock}
                  binPrefix={c.binPrefix}
                />
                <a className="cmp-cardname" href={`/credit/${c.issuer}/${c.slug}/`}>
                  {c.name}
                </a>
              </td>
            ))}
          </tr>

          <Row label="Bank" cards={cards} render={(c) => c.bank} />
          <Row label="Network" cards={cards} render={(c) => c.network} mono />
          <Row label="Type" cards={cards} render={(c) => c.cardType} mono />
          <Row label="Annual fee" cards={cards} render={(c) => c.annualFee} mono num />
          <Row label="Joining fee" cards={cards} render={(c) => c.joiningFee} mono num />
          <Row label="Fee waiver" cards={cards} render={(c) => c.feeWaiver} />

          <tr>
            <th scope="row" className="cmp-rowlabel">
              Benefits
            </th>
            {cards.map((c) => (
              <td key={c.id} className="cmp-cell">
                <ul className="cmp-bul">
                  {c.benefits.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </td>
            ))}
          </tr>

          <tr>
            <th scope="row" className="cmp-rowlabel">
              Eligibility
            </th>
            {cards.map((c) => (
              <td key={c.id} className="cmp-cell">
                <ul className="cmp-bul">
                  {c.eligibility.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </td>
            ))}
          </tr>

          <tr>
            <th scope="row" className="cmp-rowlabel">
              Apply
            </th>
            {cards.map((c) => (
              <td key={c.id} className="cmp-cell">
                {c.applyUrl ? (
                  <a
                    className="cmp-apply mono"
                    href={c.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    [ APPLY → ]
                  </a>
                ) : (
                  <span className="cmp-noapply mono">Not published</span>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <style>{`
        .cmp-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .cmp-table {
          width: 100%;
          border-collapse: collapse;
          min-width: calc(140px + var(--cmp-cols) * 200px);
        }
        .cmp-cap {
          caption-side: top;
          text-align: left;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-mute);
          padding-bottom: 0.75rem;
        }
        .cmp-rowlabel {
          position: sticky;
          left: 0;
          z-index: 2;
          width: 140px;
          min-width: 140px;
          text-align: left;
          vertical-align: top;
          padding: 0.75rem 0.75rem 0.75rem 0;
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--accent);
          background: var(--paper);
          border-bottom: 1px solid var(--rule);
        }
        .cmp-cell {
          min-width: 200px;
          vertical-align: top;
          padding: 0.75rem;
          font-size: 13px;
          color: var(--ink);
          border-bottom: 1px solid var(--rule);
          border-left: 1px solid var(--rule);
        }
        .cmp-cell.num {
          font-family: var(--font-mono);
          font-feature-settings: 'tnum' 1, 'zero' 1, 'calt' 0;
        }
        .cmp-cell.mono { font-family: var(--font-mono); }
        .cmp-cell-visual { text-align: left; }
        .cmp-cardname {
          display: block;
          margin-top: 0.5rem;
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 13px;
          line-height: 1.25;
          color: var(--ink);
          text-decoration: underline;
          text-decoration-color: color-mix(in oklab, var(--accent) 50%, transparent);
          text-underline-offset: 3px;
        }
        .cmp-cardname:hover { text-decoration-color: var(--accent); }
        .cmp-bul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .cmp-bul li {
          padding-left: 0.875rem;
          position: relative;
          line-height: 1.4;
          font-size: 12.5px;
        }
        .cmp-bul li::before {
          content: '·';
          position: absolute;
          left: 0;
          color: var(--brass);
        }
        .cmp-apply {
          display: inline-flex;
          align-items: center;
          padding: 0.4rem 0.75rem;
          background: var(--vermilion);
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
        }
        .cmp-apply:hover { background: color-mix(in oklab, var(--vermilion) 80%, black); }
        .cmp-noapply { color: var(--ink-mute); font-size: 12px; }
        .cmp-msg { padding: 2rem 0; color: var(--ink-mute); }
        .cmp-msg a { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
      `}</style>
    </div>
  )
}

function Row({
  label,
  cards,
  render,
  mono,
  num,
}: {
  label: string
  cards: CompareEntry[]
  render: (c: CompareEntry) => string
  mono?: boolean
  num?: boolean
}) {
  const cls = `cmp-cell${mono ? ' mono' : ''}${num ? ' num' : ''}`
  return (
    <tr>
      <th scope="row" className="cmp-rowlabel">
        {label}
      </th>
      {cards.map((c) => (
        <td key={c.id} className={cls}>
          {render(c)}
        </td>
      ))}
    </tr>
  )
}
