/*
 * /compare-data.json — compact per-card comparison payload keyed by
 * `issuer:slug`. The compare page fetches this once, then renders only the
 * cards named in `?ids=`. Kept separate from /cards.json (the full 5 MB dump)
 * so the compare island downloads a lean row set, not every benefit object of
 * all 750 cards. Still one static file — SSG-friendly, cached an hour.
 */
import type { APIRoute } from 'astro'
import { getCardByIssuerSlug, getCreditRows } from '~/lib/cards'

export interface CompareEntry {
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

function buildEntry(issuer: string, slug: string): CompareEntry | null {
  const card = getCardByIssuerSlug(issuer, slug, 'credit')
  if (!card) return null

  const charges = card.charges ?? []
  const find = (label: string) =>
    charges.find((c) => c.label?.toLowerCase().includes(label.toLowerCase()))
  const joining = find('Joining')
  const annual = find('Annual')
  const inr = (n?: number) =>
    n === undefined ? '—' : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)

  const feeStr = (c?: { amount: number; amountWithGst?: number }) =>
    c?.amount === 0 ? 'Lifetime free' : c ? `₹${inr(c.amount)}` : '—'

  const feeWaiver =
    card.feeWaivers
      ?.map((w) => w.description ?? '')
      .filter(Boolean)
      .join(' · ') || (annual?.amount === 0 ? 'Not applicable (LTF)' : '—')

  const benefits =
    card.benefits?.map((b) => [b.title, b.valueStr].filter(Boolean).join(' — ')).filter(Boolean) ??
    []
  if (card.rewardProgram?.rewardRateStr || card.rewardProgram?.earnRate)
    benefits.unshift(`Rewards — ${card.rewardProgram.rewardRateStr ?? card.rewardProgram.earnRate}`)
  if (card.loungeAccess?.domestic?.count)
    benefits.push(
      `Domestic lounge — ${card.loungeAccess.domestic.frequency ?? `${card.loungeAccess.domestic.count}/yr`}`,
    )
  if (card.loungeAccess?.international?.count)
    benefits.push(
      `Intl lounge — ${card.loungeAccess.international.frequency ?? `${card.loungeAccess.international.count}/yr`}`,
    )
  if (card.fuelSurcharge?.available)
    benefits.push(`Fuel waiver — ${card.fuelSurcharge.waiverPercent ?? ''}%`)

  const e = card.eligibility
  const eligibility: string[] = []
  if (e?.employmentType?.length) eligibility.push(`Employment: ${e.employmentType.join(' / ')}`)
  if (e?.minAnnualIncome) eligibility.push(`Min income: ₹${inr(e.minAnnualIncome)}/yr`)
  if (e?.minSalary) eligibility.push(`Min salary: ₹${inr(e.minSalary)}/mo`)
  if (e?.minAge || e?.maxAge) eligibility.push(`Age: ${e.minAge ?? '—'}–${e.maxAge ?? '—'}`)
  if (e?.minCreditScore) eligibility.push(`Min credit score: ${e.minCreditScore}`)
  if (e?.invitationOnly) eligibility.push('Invitation only')
  if (!eligibility.length) eligibility.push('—')

  const stockA = card.gradientColors?.[0] ?? '#2B3A55'
  const stockB = card.gradientColors?.[1] ?? '#1A2438'
  const binPrefix =
    (card.bin ?? '').toString().slice(0, 4) ||
    ({ Visa: '4242', Mastercard: '5333', RuPay: '6076', Amex: '3742', DinersClub: '3600' }[
      String(card.network ?? 'Visa')
    ] ??
      '4242')

  return {
    id: `${issuer}:${slug}`,
    slug,
    issuer,
    name: card.name,
    bank: card.bank,
    network: String(card.network ?? 'Visa'),
    cardType: card.tier ?? card.cardType,
    stock: [stockA, stockB],
    binPrefix,
    annualFee: feeStr(annual),
    joiningFee: feeStr(joining),
    feeWaiver,
    benefits: benefits.length ? benefits : ['—'],
    eligibility,
    applyUrl: card.applyUrl,
  }
}

export const GET: APIRoute = () => {
  const rows = getCreditRows()
  const map: Record<string, CompareEntry> = {}
  for (const r of rows) {
    const entry = buildEntry(r.bankCode, r.slug)
    if (entry) map[entry.id] = entry
  }
  return new Response(JSON.stringify(map), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
