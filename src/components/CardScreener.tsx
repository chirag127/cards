/*
 * CardScreener — the dense full-width card screener island (client:load). Owns
 * search, the full filter rail, sort, pagination (120/page) and the compare
 * drawer for all 750 cards. Filter rail + results grid live in ONE React island
 * so selecting a filter immediately narrows the grid (the previous bug: the
 * results felt un-filterable because the shell capped width at 1280px and the
 * table columns were crushed — now edge-to-edge dense text tiles).
 *
 * NO card images / embossed thumbnails — text-only tiles pack far more per
 * screen. Pure React 19 + local state; fuzzy match is a small subsequence
 * scorer, not a library (ladder rung 6).
 *
 * Compare state lives in the shared `oriz:cards:compare` sessionStorage bucket
 * (rich {slug,issuer,name,bank,network} schema) + an `oriz:compare-change`
 * event; the global CompareDrawer island (BaseLayout) renders the drawer. This
 * island does NOT render its own drawer — one drawer, one bucket.
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

const PAGE_SIZE = 120
const CMP_KEY = 'oriz:cards:compare'
const CMP_MAX = 3
const inr = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)

interface CmpEntry {
  slug: string
  issuer: string
  name: string
  bank: string
  network: string
}

function readCompare(): CmpEntry[] {
  try {
    const arr = JSON.parse(sessionStorage.getItem(CMP_KEY) ?? '[]')
    return Array.isArray(arr) ? arr.filter((e) => e?.slug && e?.issuer) : []
  } catch {
    return []
  }
}

function writeCompare(entries: CmpEntry[]) {
  sessionStorage.setItem(CMP_KEY, JSON.stringify(entries))
  window.dispatchEvent(new CustomEvent('oriz:compare-change'))
}

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
  const [compareSlugs, setCompareSlugs] = useState<Set<string>>(new Set())
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    const sync = () => setCompareSlugs(new Set(readCompare().map((e) => e.slug)))
    sync()
    window.addEventListener('storage', sync)
    window.addEventListener('oriz:compare-change', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('oriz:compare-change', sync)
    }
  }, [])

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
    const cur = readCompare()
    const exists = cur.some((x) => x.slug === r.slug)
    if (exists) {
      writeCompare(cur.filter((x) => x.slug !== r.slug))
      return
    }
    if (cur.length >= CMP_MAX) return
    writeCompare([
      ...cur,
      { slug: r.slug, issuer: r.bankCode, name: r.name, bank: r.bank, network: r.network },
    ])
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

  const activeCount =
    types.size + nets.size + banks.size + benefits.size + (ltfOnly ? 1 : 0) + (feeMax < maxFee ? 1 : 0)
  const compareCount = compareSlugs.size

  return (
    <div className="scr-shell">
      <aside
        className={`scr-rail ${filtersOpen ? 'open' : ''}`}
        aria-label="Filter cards"
      >
        <div className="scr-rail-inner">
          <div className="scr-rail-summary">
            <span className="scr-count">{filtered.length.toLocaleString('en-IN')}</span>
            <span className="scr-total">/ {total.toLocaleString('en-IN')} cards</span>
          </div>

          <input
            type="search"
            className="scr-search"
            placeholder="Search card or bank…"
            aria-label="Search cards"
            value={q}
            onInput={(e) => setQ((e.target as HTMLInputElement).value)}
          />

          <fieldset className="scr-sect">
            <legend className="scr-h">Card type</legend>
            {cardTypes.map((t) => (
              <label className="scr-check" key={t.type}>
                <input
                  type="checkbox"
                  checked={types.has(t.type)}
                  onChange={() => toggleSet(types, t.type, setTypes)}
                />
                <span>{TYPE_LABEL[t.type]}</span>
                <span className="scr-check-n">{t.count}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className="scr-sect">
            <legend className="scr-h">Network</legend>
            {networks.map((n) => (
              <label className="scr-check" key={n}>
                <input
                  type="checkbox"
                  checked={nets.has(n)}
                  onChange={() => toggleSet(nets, n, setNets)}
                />
                <span>{n}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className="scr-sect">
            <legend className="scr-h">
              Annual fee ≤ ₹{inr(feeMax)}
            </legend>
            <input
              type="range"
              className="scr-range"
              min={0}
              max={maxFee}
              step={500}
              value={feeMax}
              aria-label="Maximum annual fee"
              onInput={(e) => setFeeMax(Number((e.target as HTMLInputElement).value))}
            />
            <div className="scr-range-ends">
              <span>₹0</span>
              <span>₹{inr(maxFee)}</span>
            </div>
            <label className="scr-check">
              <input type="checkbox" checked={ltfOnly} onChange={() => setLtfOnly((v) => !v)} />
              <span>Lifetime free only</span>
            </label>
          </fieldset>

          <fieldset className="scr-sect">
            <legend className="scr-h">Benefits</legend>
            {BENEFITS.map((b) => (
              <label className="scr-check" key={b.key}>
                <input
                  type="checkbox"
                  checked={benefits.has(b.key)}
                  onChange={() => toggleSet(benefits, b.key, setBenefits)}
                />
                <span>
                  <span aria-hidden="true">{b.glyph}</span> {b.label}
                </span>
              </label>
            ))}
          </fieldset>

          <fieldset className="scr-sect">
            <legend className="scr-h">Bank</legend>
            <div className="scr-banks">
              {issuers.map((i) => (
                <label className="scr-check" key={i.code}>
                  <input
                    type="checkbox"
                    checked={banks.has(i.code)}
                    onChange={() => toggleSet(banks, i.code, setBanks)}
                  />
                  <span className="scr-bank-name">{i.name}</span>
                  <span className="scr-check-n">{i.count}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <button type="button" className="scr-reset" onClick={reset}>
            Clear all{activeCount ? ` (${activeCount})` : ''}
          </button>
        </div>
      </aside>

      <div className="scr-main">
        <div className="scr-toolbar">
          <button
            type="button"
            className="scr-filter-btn"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            Filters{activeCount ? ` · ${activeCount}` : ''}
          </button>
          <span className="scr-toolbar-count">
            {filtered.length.toLocaleString('en-IN')} cards
          </span>
          <label className="scr-sort">
            <span className="scr-sort-lbl">Sort</span>
            <select
              className="scr-select"
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
        </div>

        {filtered.length === 0 ? (
          <div className="scr-empty">
            No cards match.{' '}
            <button type="button" onClick={reset}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="scr-grid">
            {pageRows.map((r) => (
              <a
                className="tile"
                key={r.slug + r.bankCode}
                href={`/${r.cardType}/${r.bankCode}/${r.slug}/`}
              >
                <div className="tile-top">
                  <span className="tile-name" title={r.name}>
                    {r.name}
                  </span>
                  <span className={`tile-fee ${r.annualFee === 0 ? 'is-ltf' : ''}`}>
                    {r.annualFee === 0 ? 'LTF' : `₹${inr(r.annualFee)}`}
                  </span>
                </div>
                <div className="tile-meta">
                  {r.bank} · {r.network} · {TYPE_LABEL[r.cardType]}
                </div>
                <div className="tile-perks" aria-hidden="true">
                  {BENEFITS.filter((b) => Boolean(r[b.field])).map((b) => (
                    <span className="tile-perk" title={b.label} key={b.key}>
                      {b.glyph}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  className={`tile-cmp ${compareSlugs.has(r.slug) ? 'on' : ''}`}
                  aria-label={`${compareSlugs.has(r.slug) ? 'Remove' : 'Add'} ${r.name} ${
                    compareSlugs.has(r.slug) ? 'from' : 'to'
                  } compare`}
                  aria-pressed={compareSlugs.has(r.slug)}
                  disabled={!compareSlugs.has(r.slug) && compareCount >= CMP_MAX}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    toggleCompare(r)
                  }}
                >
                  {compareSlugs.has(r.slug) ? '✓' : '+'}
                </button>
              </a>
            ))}
          </div>
        )}

        {filtered.length > PAGE_SIZE && (
          <nav className="scr-pager" aria-label="Pagination">
            <button
              type="button"
              className="scr-pager-btn"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              ← Prev
            </button>
            <span className="scr-pager-status">
              {page * PAGE_SIZE + 1}–{Math.min(filtered.length, (page + 1) * PAGE_SIZE)} of{' '}
              {filtered.length.toLocaleString('en-IN')} · pg {page + 1}/{pageCount}
            </span>
            <button
              type="button"
              className="scr-pager-btn"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Next →
            </button>
          </nav>
        )}
      </div>
    </div>
  )
}
