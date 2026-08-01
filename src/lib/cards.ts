/*
 * Card data loader — at build time, reads data/cards.json (the canonical
 * 750-card index) and exposes typed access functions for Astro pages. The
 * raw shape lives in data/ as committed JSON; this file just types it and
 * derives a compact "row" shape for the home ledger so we don't ship every
 * benefit object to every visitor.
 *
 * IMPORTANT: this module is imported only from .astro files (not React
 * islands) so it runs at build time / SSG time. The cards.json blob is
 * ~5 MB raw; we never ship it whole to the browser. Detail pages
 * statically pre-render the slice they need; the home ledger ships a
 * derived `cardRows` array via data-attributes / inline JSON.
 */
import rawCards from '../../data/cards.json'

export type CardType = 'credit' | 'debit' | 'prepaid'
export type Network = 'Visa' | 'Mastercard' | 'RuPay' | 'Amex' | 'DinersClub' | 'Discover'

export interface FullCard {
  id: string
  slug: string
  name: string
  tagline?: string
  description?: string
  bank: string
  bankCode: string
  network: Network | string
  cardType: CardType
  tier?: string
  variant?: string
  usage?: string
  bin?: string
  material?: string
  colorScheme?: string
  virtualCardAvailable?: boolean
  type?: string
  category?: string
  bestFor?: string[]
  internationalUsable?: boolean
  applyUrl?: string
  customerCareNumber?: string
  lastUpdated?: string
  validity?: string
  contactless?: boolean
  ncmc?: boolean
  gradientColors?: string[]
  features?: string[]
  eligibility?: {
    employmentType?: string[]
    minSalary?: number
    minAge?: number
    maxAge?: number
    minAnnualIncome?: number
    minCreditScore?: number
    existingAccountRequired?: boolean
    invitationOnly?: boolean
    notes?: string[]
  }
  charges?: Array<{ label: string; amount: number; amountWithGst?: number; note?: string }>
  atmCharges?: Record<string, number>
  transactionCharges?: Record<string, number>
  fuelSurcharge?: {
    available?: boolean
    waiverPercent?: number
    minTransactionAmount?: number
    maxTransactionAmount?: number
    maxWaiverPerCycle?: number
    fuelNetworks?: string[]
  }
  limits?: Record<string, number>
  insurance?: {
    accidentalDeathCover?: number
    permanentDisabilityCover?: number
    purchaseProtectionCover?: number
    purchaseProtectionDays?: number
    lostCardLiability?: number
    lostCardLiabilityWindow?: number
    travelInsuranceCover?: number
    airAccidentCover?: number
    baggageCover?: number
    conditions?: string[]
    provider?: string
  }
  loungeAccess?: {
    domestic?: {
      count?: number
      frequency?: string
      valuePerVisit?: number
      guestAllowed?: boolean
    }
    international?: {
      count?: number
      frequency?: string
      valuePerVisit?: number
      guestAllowed?: boolean
    }
  }
  rewardProgram?: {
    name?: string
    earnRate?: string
    pointsPer100?: number
    pointValue?: number
    effectiveCashbackPercent?: number
    pointsExpiry?: string
    bonusCategories?: Array<{ category?: string; rate?: string }>
    redemptionOptions?: string[]
    minRedemptionPoints?: number
    rewardRateStr?: string
  }
  welcomeBonus?: { available?: boolean; description?: string; valueStr?: string; valueNum?: number }
  feeWaivers?: Array<{ description?: string; annualSpendRequired?: number; waives?: string }>
  benefits?: Array<{
    category?: string
    title?: string
    description?: string
    valueStr?: string
    annualValue?: number
  }>
  creditCardDetails?: {
    billingCycleDays?: number
    gracePeriodDays?: number
    minimumDuePercent?: number
    minimumDueFlat?: number
    addOnCardAvailable?: boolean
    maxAddOnCards?: number
    addOnCardFee?: number
  }
}

const FULL_CARDS: FullCard[] = rawCards as unknown as FullCard[]

/** Compact row shape for the home ledger. Designed to be JSON-serialised
 * inline so the client-side filter rail can run without a fetch. */
export interface CardRow {
  id: string
  slug: string
  name: string
  tagline?: string
  bank: string
  bankCode: string
  network: string
  cardType: CardType
  tier?: string
  /** Joining fee (excl. GST). 0 means free / lifetime free. */
  joiningFee: number
  /** Annual fee (excl. GST). 0 means LTF. */
  annualFee: number
  /** Annual fee waived above some spend? Used to render the LTF brass tag. */
  isLtf: boolean
  /** Effective cashback / reward rate as percent. May be 0 if not derivable. */
  rewardsRatePct: number
  rewardsLabel: string
  /** Annual interest rate (APR), in percent. */
  apr: number
  /** Min annual income for eligibility, in INR. */
  minAnnualIncome: number
  /** Card-supported networks for Apple/Google Pay etc. — not used yet, but
   * persisted in the row so the filter rail can cheaply check. */
  hasLounge: boolean
  hasFuelWaiver: boolean
  hasRewards: boolean
  hasWelcomeBonus: boolean
  hasInsurance: boolean
  hasInternational: boolean
  /** A numeric BIN prefix to render in the embossed card thumbnail (first
   * 4 digits). When `bin` is empty in the source, derive from network. */
  binPrefix: string
  /** Fallback gradient used by the embossed card when card-specific colors
   * are missing. */
  stockGradient: [string, string]
}

const NETWORK_BIN_FALLBACK: Record<string, string> = {
  Visa: '4242',
  Mastercard: '5333',
  RuPay: '6076',
  Amex: '3742',
  DinersClub: '3600',
  Discover: '6011',
}

const NETWORK_STOCK_GRADIENT: Record<string, [string, string]> = {
  Visa: ['#2B3A55', '#1A2438'],
  Mastercard: ['#3D2A20', '#1F140C'],
  RuPay: ['#1F4A33', '#0F2A1D'],
  Amex: ['#2A2F5C', '#101535'],
  DinersClub: ['#1F1F1F', '#000000'],
  Discover: ['#5C3A1F', '#2A1A0E'],
}

function toRow(card: FullCard): CardRow {
  const charges = card.charges ?? []
  const find = (label: string) =>
    charges.find((c) => c.label?.toLowerCase().includes(label.toLowerCase()))?.amount ?? 0
  const joining = find('Joining')
  const annual = find('Annual')
  const isLtf = annual === 0 || /lifetime free|ltf/i.test(card.tagline ?? '')
  const apr =
    card.transactionCharges?.annualInterestRate ??
    (card.transactionCharges?.interestRatePerMonth ?? 0) * 12
  const rewardsRate = card.rewardProgram?.effectiveCashbackPercent ?? 0
  const rewardsLabel =
    card.rewardProgram?.rewardRateStr ??
    card.rewardProgram?.earnRate ??
    (rewardsRate ? `${rewardsRate}%` : '—')
  const lounge =
    (card.loungeAccess?.domestic?.count ?? 0) !== 0 ||
    (card.loungeAccess?.international?.count ?? 0) !== 0
  const fuel = !!card.fuelSurcharge?.available
  const hasRewards = rewardsRate > 0 || !!card.rewardProgram?.earnRate || !!card.rewardProgram?.rewardRateStr
  const hasWelcomeBonus = !!card.welcomeBonus?.available || !!card.welcomeBonus?.description
  const hasInsurance = !!card.insurance && Object.values(card.insurance).some((v) => typeof v === 'number' && v > 0)
  const hasInternational = !!card.internationalUsable || card.usage === 'International'
  const network = String(card.network ?? 'Visa')
  const binPrefix =
    (card.bin ?? '').toString().slice(0, 4) || NETWORK_BIN_FALLBACK[network] || '0000'
  const stockFromCard =
    card.gradientColors && card.gradientColors.length >= 2
      ? ([card.gradientColors[0], card.gradientColors[1]] as [string, string])
      : null
  const stock = stockFromCard ?? NETWORK_STOCK_GRADIENT[network] ?? ['#2B3A55', '#1A2438']
  return {
    id: card.id,
    slug: card.slug,
    name: card.name,
    tagline: card.tagline,
    bank: card.bank,
    bankCode: card.bankCode,
    network,
    cardType: card.cardType,
    tier: card.tier,
    joiningFee: joining,
    annualFee: annual,
    isLtf,
    rewardsRatePct: rewardsRate,
    rewardsLabel,
    apr,
    minAnnualIncome: card.eligibility?.minAnnualIncome ?? 0,
    hasLounge: lounge,
    hasFuelWaiver: fuel,
    hasRewards,
    hasWelcomeBonus,
    hasInsurance,
    hasInternational,
    binPrefix,
    stockGradient: stock,
  }
}

const ROWS: CardRow[] = FULL_CARDS.map(toRow)

export function getAllRows(): CardRow[] {
  return ROWS
}

export function getCreditRows(): CardRow[] {
  return ROWS.filter((r) => r.cardType === 'credit')
}

export function getCardBySlug(slug: string, type: CardType = 'credit'): FullCard | undefined {
  return FULL_CARDS.find((c) => c.slug === slug && c.cardType === type)
}

export function getAllCards(): FullCard[] {
  return FULL_CARDS
}

export function getCardById(id: string): FullCard | undefined {
  return FULL_CARDS.find((c) => c.id === id)
}

export function getRowsByType(type: CardType): CardRow[] {
  return ROWS.filter((r) => r.cardType === type)
}

/** Rows on a specific network (e.g. RuPay), sorted free-first then A→Z. */
export function getRowsByNetwork(network: string): CardRow[] {
  return ROWS.filter((r) => r.network === network)
}

/** Rows for one issuer (bankCode). */
export function getRowsByBank(bankCode: string): CardRow[] {
  return ROWS.filter((r) => r.bankCode === bankCode)
}

/** Similar cards: same type, prefer same network, exclude self. Max `n`. */
export function getSimilarRows(card: FullCard, n = 6): CardRow[] {
  const pool = ROWS.filter((r) => r.id !== card.id && r.cardType === card.cardType)
  const net = String(card.network ?? '')
  const sameNet = pool.filter((r) => r.network === net)
  const rest = pool.filter((r) => r.network !== net)
  return [...sameNet, ...rest].slice(0, n)
}

export const COUNT_BY_TYPE: Record<CardType, number> = {
  credit: FULL_CARDS.filter((c) => c.cardType === 'credit').length,
  debit: FULL_CARDS.filter((c) => c.cardType === 'debit').length,
  prepaid: FULL_CARDS.filter((c) => c.cardType === 'prepaid').length,
}

export const RUPAY_COUNT = FULL_CARDS.filter((c) => String(c.network) === 'RuPay').length

export function getCardByIssuerSlug(
  issuer: string,
  slug: string,
  type: CardType = 'credit',
): FullCard | undefined {
  return FULL_CARDS.find((c) => c.slug === slug && c.bankCode === issuer && c.cardType === type)
}

export function listIssuers(): Array<{ code: string; name: string; count: number }> {
  const map = new Map<string, { code: string; name: string; count: number }>()
  for (const c of FULL_CARDS) {
    const e = map.get(c.bankCode) ?? { code: c.bankCode, name: c.bank, count: 0 }
    e.count += 1
    map.set(c.bankCode, e)
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export function listNetworks(): string[] {
  const set = new Set<string>()
  for (const c of FULL_CARDS) set.add(String(c.network ?? 'Visa'))
  return Array.from(set).sort()
}

export function listCardTypes(): Array<{ type: CardType; count: number }> {
  const map = new Map<CardType, number>()
  for (const c of FULL_CARDS) map.set(c.cardType, (map.get(c.cardType) ?? 0) + 1)
  return (['credit', 'debit', 'prepaid'] as CardType[])
    .filter((t) => map.has(t))
    .map((t) => ({ type: t, count: map.get(t) ?? 0 }))
}

/** Highest annual fee across all rows — used to bound the fee range slider. */
export const MAX_ANNUAL_FEE = ROWS.reduce((m, r) => Math.max(m, r.annualFee), 0)

export const TOTAL_CARD_COUNT = FULL_CARDS.length
export const CREDIT_COUNT = FULL_CARDS.filter((c) => c.cardType === 'credit').length

/** Format an INR amount as a mono number string. Returns '—' for 0/missing. */
export function inr(n: number | undefined | null, opts?: { keepZero?: boolean }): string {
  if (n === undefined || n === null) return '—'
  if (n === 0 && !opts?.keepZero) return '0'
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
}

/** Format APR as `XX.XX% p.a.` */
export function fmtApr(n: number | undefined): string {
  if (!n) return '—'
  return `${n.toFixed(2)}% p.a.`
}

/** Format a percent rewards rate as `X.XX%` */
export function fmtPct(n: number | undefined, suffix = '%'): string {
  if (!n && n !== 0) return '—'
  return `${n.toFixed(2)}${suffix}`
}
