/*
 * CardScreener — the home-ledger filter island (client:load). Owns search,
 * the full filter rail, sort, pagination (50/page) and the compare drawer for
 * all 750 cards. Receives the derived `CardRow[]` inline from index.astro so
 * there's no fetch. Pure React 19 + local state; no extra deps (fuzzy match is
 * a small subsequence scorer, not a library — ladder rung 6).
 *
 * The embossed thumbnail markup mirrors EmbossedThumb.astro; the shared static
 * CSS (`.emboss-thumb-static`) is emitted once by a hidden EmbossedThumb in the
 * Astro page so this island reuses it.
 */
import { useEffect, useMemo, useState } from 'react'
import type { CardRow, CardType } from '~/lib/cards'

interface Props {
  rows: CardRow[]
  issuers: Array<{ code: string; name: string; count: number }>
  networks: string[]
  cardTypes: Array<{ type: CardType; count: number }>
  maxFee: number
  total: number
}

const NETWORK_LABEL: Record<string, string> = {
  Visa: 'VISA',
  Mastercard: 'MASTERCARD',
  RuPay: 'RuPay',
  Amex: 'AMEX',
  DinersClub: 'DINERS',
  Discover: 'DISCOVER',
}

const TYPE_LABEL: Record<CardType, string> = {
  credit: 'CREDIT',
  debit: 'DEBIT',
  prepaid: 'PREPAID',
}

type BenefitKey = 'lounge' | 'fuel' | 'rewards' | 'welcome' | 'insurance' | 'intl'
const BENEFITS: Array<{ key: BenefitKey; glyph: string; label: string; field: keyof CardRow }> = [
  { key: 'lounge', glyph: '✈', label: 'Lounge access', field: 'hasLounge' },
  { key: 'fuel', glyph: '⛽', label: 'Fuel surcharge waiver', field: 'hasFuelWaiver' },
  { key: 'rewards', glyph: '★', label: 'Rewards / cashback', field: 'hasRewards' },
  { key: 'welcome', glyph: '🎁', label: 'Welcome bonus', field: 'hasWelcomeBonus' },
  { key: 'insurance', glyph: '⛨', label: 'Insurance cover', field: 'hasInsurance' },
  { key: 'intl', glyph: '🌐', label: 'International usable', field: 'hasInternational' },
]

const SORTS: Array<{ key: string; label: string; cmp: (a: CardRow, b: CardRow) => number }> = [
  { key: 'name', label: 'Name A→Z', cmp: (a, b) => a.name.localeCompare(b.name) },
  { key: 'fee-asc', label: 'Annual fee ↑', cmp: (a, b) => a.annualFee - b.annualFee },
  { key: 'fee-desc', label: 'Annual fee ↓', cmp: (a, b) => b.annualFee - a.annualFee },
  { key: 'rewards-desc', label: 'Rewards % ↓', cmp: (a, b) => b.rewardsRatePct - a.rewardsRatePct },
  { key: 'apr-asc', label: 'APR ↑', cmp: (a, b) => a.apr - b.apr },
  { key: 'bank', label: 'Bank A→Z', cmp: (a, b) => a.bank.localeCompare(b.bank) },
]

const PAGE_SIZE = 50
const CMP_KEY = 'oriz:cards:compare'
const inr = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
const fmtApr = (n: number) => (n ? `${n.toFixed(2)}% p.a.` : '—')

/** Subsequence fuzzy score over card name + bank. Higher = better; -1 = no match. */
function fuzzyScore(haystack: string, needle: string): number {
  if (!needle) return 0
  const h = haystack.toLowerCase()
  const n = needle.toLowerCase()
  let hi = 0
  let score = 0
  let streak = 0
  for (let ni = 0; ni < n.length; ni++) {
    const ch = n[ni]
    if (ch === ' ') continue
    const found = h.indexOf(ch, hi)
    if (found === -1) return -1
    streak = found === hi ? streak + 2 : 0
    score += 1 + streak
    hi = found + 1
  }
  return score
}

function EmbossThumb({ row }: { row: CardRow }) {
  const [a, b] = row.stockGradient
  return (
    <div
      className="emboss-static emboss-thumb-static"
      style={{ ['--card-stock-a' as string]: a, ['--card-stock-b' as string]: b }}
      aria-hidden="true"
    >
      <span className="emboss-issuer">{(row.bankCode || row.bank).toUpperCase()}</span>
      <span className="emboss-chip">
        <span className="emboss-chip-line" />
        <span className="emboss-chip-line" />
        <span className="emboss-chip-line" />
        <span className="emboss-chip-line" />
        <span className="emboss-chip-line" />
      </span>
      <span className="emboss-bin">{row.binPrefix} •••• •••• ••••</span>
      <span className="emboss-name">•••• •••• ••••</span>
      <span className="emboss-network">{NETWORK_LABEL[row.network] ?? row.network.toUpperCase()}</span>
    </div>
  )
}

export default function CardScreener({ rows, issuers, networks, cardTypes, maxFee, total }: Props) {
  const [q, setQ] = useState('')
  const [types, setTypes] = useState<Set<string>>(new Set())
  const [nets, setNets] = useState<Set<string>>(new Set())
  const [banks, setBanks] = useState<Set<string>>(new Set())
  const [benefits, setBenefits] = useState<Set<BenefitKey>>(new Set())
  const [feeMax, setFeeMax] = useState(maxFee)
  const [ltfOnly, setLtfOnly] = useState(false)
  const [sortKey, setSortKey] = useState('name')
  const [page, setPage] = useState(0)
  const [compare, setCompare] = useState<CardRow[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(CMP_KEY) ?? '[]') as Array<{ slug: string }>
      const bySlug = new Map(rows.map((r) => [r.slug, r]))
      setCompare(saved.map((s) => bySlug.get(s.slug)).filter((r): r is CardRow => !!r).slice(0, 4))
    } catch {
      /* ignore */
    }
  }, [rows])

  useEffect(() => {
    sessionStorage.setItem(CMP_KEY, JSON.stringify(compare.map((c) => ({ slug: c.slug }))))
  }, [compare])

  const filtered = useMemo(() => {
    const scored: Array<{ row: CardRow; score: number }> = []
    for (const r of rows) {
      if (types.size && !types.has(r.cardType)) continue
      if (nets.size && !nets.has(r.network)) continue
      if (banks.size && !banks.has(r.bankCode)) continue
      if (ltfOnly && !r.isLtf) continue
      if (r.annualFee > feeMax) continue
      if (benefits.size) {
        const ok = [...benefits].every((k) => {
          const meta = BENEFITS.find((x) => x.key === k)
          return meta ? Boolean(r[meta.field]) : true
        })
        if (!ok) continue
      }
      let score = 0
      if (q.trim()) {
        score = fuzzyScore(`${r.name} ${r.bank}`, q.trim())
        if (score < 0) continue
      }
      scored.push({ row: r, score })
    }
    const cmp = SORTS.find((s) => s.key === sortKey)?.cmp ?? SORTS[0].cmp
    scored.sort((a, b) => (q.trim() ? b.score - a.score : 0) || cmp(a.row, b.row))
    return scored.map((s) => s.row)
  }, [rows, types, nets, banks, benefits, feeMax, ltfOnly, q, sortKey])

  useEffect(() => setPage(0), [q, types, nets, banks, benefits, feeMax, ltfOnly, sortKey])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  const toggleSet = <T,>(set: Set<T>, v: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set)
    next.has(v) ? next.delete(v) : next.add(v)
    setter(next)
  }

  const toggleCompare = (r: CardRow) => {
    setCompare((prev) => {
      if (prev.some((x) => x.slug === r.slug)) return prev.filter((x) => x.slug !== r.slug)
      if (prev.length >= 4) return prev
      return [...prev, r]
    })
  }

  const reset = () => {
    setQ('')
    setTypes(new Set())
    setNets(new Set())
    setBanks(new Set())
    setBenefits(new Set())
    setFeeMax(maxFee)
    setLtfOnly(false)
  }

  const compareSlugs = new Set(compare.map((c) => c.slug))
  const compareHref =
    compare.length >= 2 ? `/compare/?cards=${compare.map((c) => c.slug).join(',')}` : undefined

  return (
    <>
      <header className="vf-hero" aria-label="Every card in India, in one ledger">
        <div className="vf-hero-copy">
          <p className="vf-hero-eyebrow mono">The card ledger · India</p>
          <h1 className="vf-hero-title">
            Every card in India, <span className="vf-hero-foil">in one ledger.</span>
          </h1>
          <p className="vf-hero-lede">
            Credit, debit and prepaid — fees, rewards and benefits, side by side. Search, filter and
            compare across every issuer.
          </p>
          <p className="vf-hero-count mono">
            <span className="vf-hero-count-num">{total.toLocaleString('en-IN')}</span> cards indexed
          </p>
        </div>
        <div className="vf-hero-art" aria-hidden="true">
          <div className="vf-hero-card emboss-tilt">
            <div className="emboss-static emboss-thumb-static vf-hero-thumb" style={{ ['--card-stock-a' as string]: '#1F2A44', ['--card-stock-b' as string]: '#0E1524' }}>
              <span className="emboss-issuer">ORIZ</span>
              <span className="emboss-chip">
                <span className="emboss-chip-line" />
                <span className="emboss-chip-line" />
                <span className="emboss-chip-line" />
                <span className="emboss-chip-line" />
                <span className="emboss-chip-line" />
              </span>
              <span className="emboss-bin">4242 •••• •••• ••••</span>
              <span className="emboss-name">•••• •••• ••••</span>
              <span className="emboss-network">RuPay</span>
            </div>
            <span className="vf-shimmer" aria-hidden="true" />
          </div>
        </div>
      </header>

      <section className="ledger-shell" aria-label="Card screener">
        <aside className="rail" aria-label="Filter rail">
          <div className="rail-inner">
            <div className="rail-summary">
              <span className="rail-count mono">{filtered.length.toLocaleString('en-IN')}</span>
              <span className="rail-total mono">/ {total.toLocaleString('en-IN')} CARDS</span>
            </div>

            <div className="rail-search">
              <input
                type="search"
                className="rail-search-input mono"
                placeholder="search card or bank…"
                aria-label="Search cards"
                value={q}
                onInput={(e) => setQ((e.target as HTMLInputElement).value)}
              />
            </div>

            <fieldset className="rail-section">
              <legend className="rail-h mono">Card type</legend>
              <div className="rail-checks">
                {cardTypes.map((t) => (
                  <label className="rail-check" key={t.type}>
                    <input
                      type="checkbox"
                      checked={types.has(t.type)}
                      onChange={() => toggleSet(types, t.type, setTypes)}
                    />
                    <span className="mono">{TYPE_LABEL[t.type]}</span>
                    <span className="mono issuer-count">{t.count}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="rail-section">
              <legend className="rail-h mono">Network</legend>
              <div className="rail-checks">
                {networks.map((n) => (
                  <label className="rail-check" key={n}>
                    <input
                      type="checkbox"
                      checked={nets.has(n)}
                      onChange={() => toggleSet(nets, n, setNets)}
                    />
                    <span className="mono">{n}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="rail-section">
              <legend className="rail-h mono">
                Annual fee ≤ <span className="mono">₹{inr(feeMax)}</span>
              </legend>
              <input
                type="range"
                className="rail-range"
                min={0}
                max={maxFee}
                step={500}
                value={feeMax}
                aria-label="Maximum annual fee"
                onInput={(e) => setFeeMax(Number((e.target as HTMLInputElement).value))}
              />
              <div className="rail-range-ends mono">
                <span>₹0</span>
                <span>₹{inr(maxFee)}</span>
              </div>
              <label className="rail-check">
                <input type="checkbox" checked={ltfOnly} onChange={() => setLtfOnly((v) => !v)} />
                <span className="mono">Lifetime free only</span>
              </label>
            </fieldset>

            <fieldset className="rail-section">
              <legend className="rail-h mono">Benefits</legend>
              <div className="rail-checks">
                {BENEFITS.map((b) => (
                  <label className="rail-check" key={b.key}>
                    <input
                      type="checkbox"
                      checked={benefits.has(b.key)}
                      onChange={() => toggleSet(benefits, b.key, setBenefits)}
                    />
                    <span className="mono">
                      <span aria-hidden="true">{b.glyph}</span> {b.label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="rail-section rail-issuers">
              <legend className="rail-h mono">Bank</legend>
              <div className="rail-issuers-scroll">
                {issuers.map((i) => (
                  <label className="rail-check" key={i.code}>
                    <input
                      type="checkbox"
                      checked={banks.has(i.code)}
                      onChange={() => toggleSet(banks, i.code, setBanks)}
                    />
                    <span className="mono issuer-name">{i.name}</span>
                    <span className="mono issuer-count">{i.count}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <button type="button" className="rail-reset mono" onClick={reset}>
              [ × CLEAR ALL ]
            </button>
          </div>
        </aside>

        <div className="ledger">
          <div className="ledger-toolbar">
            <label className="sort-wrap mono">
              SORT
              <select
                className="rail-select sort-select mono"
                value={sortKey}
                aria-label="Sort cards"
                onChange={(e) => setSortKey((e.target as HTMLSelectElement).value)}
              >
                {SORTS.map((s) => (
                  <option value={s.key} key={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <span className="toolbar-count mono">
              {filtered.length.toLocaleString('en-IN')} match
            </span>
          </div>

          <div className="ledger-header" role="row">
            <span className="col-thumb">CARD</span>
            <span className="col-name">NAME</span>
            <span className="col-badges">TYPE · NET</span>
            <span className="col-perks">BENEFITS</span>
            <span className="col-num">ANNUAL</span>
            <span className="col-num">APR p.a.</span>
            <span className="col-cmp" aria-label="Compare">
              ▢
            </span>
          </div>

          <div className="ledger-body">
            {pageRows.map((r) => (
              <div className="row" key={r.slug + r.bankCode}>
                <a className="row-link" href={`/${r.cardType}/${r.bankCode}/${r.slug}/`} aria-label={r.name}>
                  <span className="col-thumb">
                    <span className="emboss-tilt">
                      <EmbossThumb row={r} />
                      <span className="vf-shimmer" aria-hidden="true" />
                    </span>
                  </span>
                  <span className="col-name">
                    <span className="row-name">{r.name}</span>
                    <span className="row-bank mono">
                      {r.bank} · {r.tier ?? 'card'}
                    </span>
                  </span>
                  <span className="col-badges">
                    <span className={`badge badge-type badge-${r.cardType}`}>{TYPE_LABEL[r.cardType]}</span>
                    <span className="badge badge-net">{r.network}</span>
                  </span>
                  <span className="col-perks">
                    {BENEFITS.filter((b) => Boolean(r[b.field])).map((b) => (
                      <span className="perk-icon" title={b.label} aria-label={b.label} key={b.key}>
                        {b.glyph}
                      </span>
                    ))}
                  </span>
                  <span className="col-num num">
                    {r.annualFee === 0 ? <span className="ltf-tag">LTF</span> : `₹${inr(r.annualFee)}`}
                  </span>
                  <span className={`col-num num ${r.apr >= 36 ? 'num-neg' : ''}`}>{fmtApr(r.apr)}</span>
                </a>
                <span className="col-cmp">
                  <input
                    type="checkbox"
                    className="cmp-check"
                    checked={compareSlugs.has(r.slug)}
                    disabled={!compareSlugs.has(r.slug) && compare.length >= 4}
                    aria-label={`Add ${r.name} to compare`}
                    onChange={() => toggleCompare(r)}
                  />
                </span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="ledger-empty mono">
                0 cards match.{' '}
                <button type="button" className="rail-reset" onClick={reset}>
                  clear filters
                </button>
              </div>
            )}
          </div>

          {filtered.length > PAGE_SIZE && (
            <nav className="pager mono" aria-label="Pagination">
              <button
                type="button"
                className="pager-btn"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ← prev
              </button>
              <span className="pager-status">
                {page * PAGE_SIZE + 1}–{Math.min(filtered.length, (page + 1) * PAGE_SIZE)} of{' '}
                {filtered.length.toLocaleString('en-IN')} · pg {page + 1}/{pageCount}
              </span>
              <button
                type="button"
                className="pager-btn"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                next →
              </button>
            </nav>
          )}
        </div>
      </section>

      <aside className={`cmp-drawer ${drawerOpen ? 'open' : ''}`} aria-label="Compare drawer">
        <button
          type="button"
          className="cmp-toggle mono"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((v) => !v)}
        >
          <span>COMPARE · {compare.length} / 4</span>
          <span className="cmp-toggle-icon" aria-hidden="true">
            ▴
          </span>
        </button>
        {drawerOpen && (
          <div className="cmp-body">
            {compare.length === 0 && <p className="cmp-empty mono">add up to 4 cards from the ledger</p>}
            <ul className="cmp-list">
              {compare.map((c) => (
                <li className="cmp-item" key={c.slug}>
                  <span className="cmp-item-name mono">{c.name}</span>
                  <span className="cmp-item-bank mono">
                    {c.bank} · {c.network}
                  </span>
                  <button
                    type="button"
                    className="cmp-item-x"
                    aria-label={`Remove ${c.name}`}
                    onClick={() => toggleCompare(c)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <a
              className={`cmp-go mono ${compareHref ? '' : 'cmp-go-disabled'}`}
              href={compareHref ?? undefined}
              aria-disabled={!compareHref}
            >
              [ COMPARE → ]
            </a>
          </div>
        )}
      </aside>
    </>
  )
}
