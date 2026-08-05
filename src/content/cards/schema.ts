/**
 * Maximal financial-card schema.
 *
 * Covers every card type oriz-financial-cards-app catalogs:
 *   - credit, debit, prepaid, travel/forex, corporate, business,
 *     student, metal, virtual.
 *
 * Designed to validate every existing JSON under `data/cards/**` (the
 * 750+ credit-card profiles use a rich shape with `charges`, `atmCharges`,
 * `insurance`, etc.) AND the simpler shape sketched in the design brief
 * (top-level `fees`, `rewards`, `lounge`, `travel`, ...).
 *
 * Most fields are optional; the schema uses `.passthrough()` at the root
 * so unknown keys do not fail validation — important because the catalog
 * is appended to from scrapers that may emit issuer-specific extras.
 *
 * Source-of-truth: this file. Update here and re-run `astro check`.
 */

import { z } from 'astro:content'

// ───────────────────────────────────────────────────────────── enums

export const CARD_NETWORKS = [
  'visa',
  'mastercard',
  'rupay',
  'amex',
  'diners',
  'jcb',
  'discover',
  'unionpay',
] as const

export const CARD_TYPES = [
  'credit',
  'debit',
  'prepaid',
  'travel',
  'forex',
  'corporate',
  'business',
  'student',
  'metal',
  'virtual',
] as const

export const CARD_TIERS = [
  'entry',
  'mid',
  'premium',
  'super-premium',
  'invite-only',
  'black',
  'infinite',
  'platinum',
  'gold',
  'signature',
  'world',
  'world-elite',
] as const

export const EMPLOYMENT_TYPES = [
  'salaried',
  'self-employed',
  'student',
  'retired',
  'homemaker',
  'business-owner',
] as const

export const LOUNGE_PROGRAMS = [
  'priority-pass',
  'dragonpass',
  'dreamfolks',
  'adani-one',
  'visa-airport-companion',
  'mastercard-airport-experiences',
  'none',
] as const

// ──────────────────────────────────────────── nested sub-schemas

// Designed for the "compact" shape from the brief.
const compactFeesSchema = z
  .object({
    joining: z.number().optional(),
    annual: z.number().optional(),
    annualWaiverSpend: z.number().optional(),
    annualWaiverConditions: z.string().optional(),
    addOnCard: z.number().optional(),
    apr: z.number().optional(),
    forexMarkup: z.number().optional(),
    cashAdvance: z.string().optional(),
    overlimit: z.string().optional(),
    latePayment: z.string().optional(),
    fuelSurchargeWaiver: z
      .object({
        min: z.number(),
        max: z.number(),
        monthlyCap: z.number(),
      })
      .optional(),
  })
  .partial()
  .passthrough()

const compactRewardsSchema = z
  .object({
    pointsPerINR: z.number().optional(),
    cashbackPercentByCategory: z.record(z.string(), z.number()).optional(),
    milestoneBonuses: z
      .array(
        z.object({
          spendINR: z.number(),
          reward: z.string(),
        }),
      )
      .optional(),
    conversionRate: z.string().optional(),
    pointsExpiry: z.string().optional(),
    welcomeBonus: z.string().optional(),
  })
  .partial()
  .passthrough()

const compactLoungeSchema = z
  .object({
    domesticVisitsPerQuarter: z.number().optional(),
    internationalVisitsPerYear: z.number().optional(),
    program: z.enum(LOUNGE_PROGRAMS).optional(),
    guestAccess: z.boolean().optional(),
  })
  .partial()
  .passthrough()

const compactTravelSchema = z
  .object({
    insurance: z
      .object({
        amount: z.number(),
        coverage: z.string(),
      })
      .optional(),
    purchaseProtection: z.boolean().optional(),
    fraudLiability: z.string().optional(),
    travelAccident: z.number().optional(),
  })
  .partial()
  .passthrough()

const eligibilitySchema = z
  .object({
    minIncomeMonthly: z.number().optional(),
    minIncomeAnnual: z.number().optional(),
    minCreditScore: z.number().optional(),
    minAge: z.number().optional(),
    maxAge: z.number().optional(),
    employment: z.array(z.enum(EMPLOYMENT_TYPES)).optional(),
    // legacy keys carried by the 750 existing JSONs:
    employmentType: z.array(z.string()).optional(),
    minSalary: z.number().optional(),
    existingAccountRequired: z.boolean().optional(),
    invitationOnly: z.boolean().optional(),
    notes: z.array(z.string()).optional(),
  })
  .partial()
  .passthrough()

const limitsSchema = z
  .object({
    creditLimitMin: z.number().optional(),
    creditLimitMax: z.number().optional(),
    cashWithdrawalPercent: z.number().optional(),
    autoDebit: z.boolean().optional(),
    // legacy keys:
    atmPerDay: z.number().optional(),
    posEcomPerDay: z.number().optional(),
    contactlessPerTxn: z.number().optional(),
    contactlessDailyLimit: z.number().optional(),
  })
  .partial()
  .passthrough()

const emiSchema = z
  .object({
    flexipay: z.boolean().optional(),
    autoEMI: z.boolean().optional(),
    interestRange: z.string().optional(),
    tenureRangeMonths: z.array(z.number()).optional(),
    // legacy:
    available: z.boolean().optional(),
    minTransactionAmount: z.number().optional(),
    tenureOptions: z.array(z.number()).optional(),
    interestRatePerMonth: z.number().optional(),
    processingFeePercent: z.number().optional(),
  })
  .partial()
  .passthrough()

const perksSchema = z
  .object({
    movieTickets: z.string().optional(),
    diningOffers: z.array(z.string()).optional(),
    goldenHourOffers: z.array(z.string()).optional(),
    conciergeService: z.boolean().optional(),
    golfPrivileges: z.boolean().optional(),
    spaPrivileges: z.boolean().optional(),
  })
  .partial()
  .passthrough()

const ratingsSchema = z
  .object({
    overall: z.number(),
    cashback: z.number().optional(),
    rewards: z.number().optional(),
    customerService: z.number().optional(),
    valueForMoney: z.number().optional(),
  })
  .partial()
  .passthrough()

// ─────────────────────────── legacy rich sub-schemas (existing 750 JSONs)

const chargeSchema = z
  .object({
    label: z.string(),
    amount: z.number().optional(),
    amountWithGst: z.number().optional(),
    note: z.string().optional(),
  })
  .passthrough()

const atmChargesSchema = z
  .object({
    ownBankFreePerMonth: z.number().optional(),
    ownBankCharge: z.number().optional(),
    otherBankFreePerMonth: z.number().optional(),
    otherBankCharge: z.number().optional(),
    internationalWithdrawalFee: z.number().optional(),
    internationalWithdrawalPercent: z.number().optional(),
    balanceEnquiryOwnBank: z.number().optional(),
    balanceEnquiryOtherBank: z.number().optional(),
    miniStatementOtherBank: z.number().optional(),
  })
  .partial()
  .passthrough()

const transactionChargesSchema = z
  .object({
    currencyMarkupPercent: z.number().optional(),
    crossBorderFee: z.number().optional(),
    dccFeePercent: z.number().optional(),
    smsAlertPerMonth: z.number().optional(),
    pinRegenerationCharge: z.number().optional(),
    physicalStatementCharge: z.number().optional(),
    chequeBounceCharge: z.number().optional(),
    latePaymentFee: z.number().optional(),
    overLimitFee: z.number().optional(),
    cashAdvanceFeePercent: z.number().optional(),
    cashAdvanceFlatFee: z.number().optional(),
    interestRatePerMonth: z.number().optional(),
    annualInterestRate: z.number().optional(),
  })
  .partial()
  .passthrough()

const fuelSurchargeSchema = z
  .object({
    available: z.boolean().optional(),
    waiverPercent: z.number().optional(),
    minTransactionAmount: z.number().optional(),
    maxTransactionAmount: z.number().optional(),
    maxWaiverPerCycle: z.number().optional(),
    fuelNetworks: z.array(z.string()).optional(),
  })
  .partial()
  .passthrough()

const insuranceSchema = z
  .object({
    accidentalDeathCover: z.number().optional(),
    permanentDisabilityCover: z.number().optional(),
    purchaseProtectionCover: z.number().optional(),
    purchaseProtectionDays: z.number().optional(),
    lostCardLiability: z.number().optional(),
    lostCardLiabilityWindow: z.number().optional(),
    travelInsuranceCover: z.number().optional(),
    airAccidentCover: z.number().optional(),
    baggageCover: z.number().optional(),
    conditions: z.array(z.string()).optional(),
    provider: z.string().optional(),
  })
  .partial()
  .passthrough()

const benefitSchema = z
  .object({
    category: z.string(),
    title: z.string(),
    description: z.string().optional(),
    valueStr: z.string().optional(),
    valueNum: z.number().optional(),
    frequencyStr: z.string().optional(),
    frequencyPerYear: z.number().optional(),
    annualValue: z.number().optional(),
    conditions: z.array(z.string()).optional(),
    isSellable: z.boolean().optional(),
    sellValue: z.number().optional(),
    isActive: z.boolean().optional(),
    activationRequired: z.boolean().optional(),
  })
  .passthrough()

const rewardProgramSchema = z
  .object({
    name: z.string().optional(),
    earnRate: z.string().optional(),
    pointsPer100: z.number().optional(),
    pointValue: z.number().optional(),
    effectiveCashbackPercent: z.number().optional(),
    pointsExpiry: z.string().optional(),
    bonusCategories: z.array(z.unknown()).optional(),
    redemptionOptions: z.array(z.string()).optional(),
    minRedemptionPoints: z.number().optional(),
    rewardRateStr: z.string().optional(),
  })
  .partial()
  .passthrough()

const welcomeBonusSchema = z
  .object({
    available: z.boolean().optional(),
    description: z.string().optional(),
    valueStr: z.string().optional(),
    valueNum: z.number().optional(),
    conditions: z.array(z.string()).optional(),
  })
  .partial()
  .passthrough()

const milestoneBonusSchema = z
  .object({
    description: z.string().optional(),
    spendRequired: z.number().optional(),
    spendPeriod: z.string().optional(),
    rewardStr: z.string().optional(),
    rewardNum: z.number().optional(),
    // also support brief shape:
    spendINR: z.number().optional(),
    reward: z.string().optional(),
  })
  .partial()
  .passthrough()

const feeWaiverSchema = z
  .object({
    description: z.string().optional(),
    annualSpendRequired: z.number().optional(),
    waives: z.string().optional(),
  })
  .partial()
  .passthrough()

const creditCardDetailsSchema = z
  .object({
    billingCycleDays: z.number().optional(),
    gracePeriodDays: z.number().optional(),
    minimumDuePercent: z.number().optional(),
    minimumDueFlat: z.number().optional(),
    balanceTransfer: z.boolean().optional(),
    emiConversion: z.boolean().optional(),
    addOnCardAvailable: z.boolean().optional(),
    maxAddOnCards: z.number().optional(),
    addOnCardFee: z.number().optional(),
  })
  .partial()
  .passthrough()

const valueSchema = z
  .object({
    highestValue: z.number().optional(),
    averageValue: z.number().optional(),
    isSellable: z.boolean().optional(),
    marketPrice: z
      .object({
        minSellPrice: z.number().optional(),
        maxSellPrice: z.number().optional(),
        averageMarketValue: z.number().optional(),
      })
      .partial()
      .optional(),
    annualNetValue: z.number().optional(),
    tenYearNetValue: z.number().optional(),
    totalAnnualCharges: z.number().optional(),
    totalAnnualBenefits: z.number().optional(),
    roiPercent: z.any().optional(),
  })
  .partial()
  .passthrough()

const dataQualitySchema = z
  .object({
    status: z.enum(['verified', 'partial', 'unverified', 'auto-scraped']).optional(),
    verifiedFields: z.array(z.string()).optional(),
    unverifiedFields: z.array(z.string()).optional(),
    sourceUrls: z.array(z.string()).optional(),
    lastVerified: z.string().optional(),
  })
  .partial()
  .passthrough()

// ──────────────────────────────────────────────────── root schema

export const cardSchema = z
  .object({
    // Identity
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    tagline: z.string().optional(),
    description: z.string().optional(),

    // Issuer
    bank: z.string(),
    bankCode: z.string().optional(),
    // case-insensitive in practice — accept any string; recommended values in CARD_NETWORKS
    network: z.string().optional(),
    cardType: z.enum(CARD_TYPES),
    tier: z.string().optional(),
    variant: z.string().optional(),
    usage: z.string().optional(),
    bin: z.string().optional(),
    material: z.string().optional(),
    colorScheme: z.string().optional(),
    virtualCardAvailable: z.boolean().optional(),

    // Eligibility / limits / EMI
    eligibility: eligibilitySchema.optional(),
    limits: limitsSchema.optional(),
    emi: emiSchema.optional(),
    emiOptions: emiSchema.optional(),

    // Fees — both shapes
    fees: compactFeesSchema.optional(),
    charges: z.array(chargeSchema).optional(),
    atmCharges: atmChargesSchema.optional(),
    transactionCharges: transactionChargesSchema.optional(),
    fuelSurcharge: fuelSurchargeSchema.optional(),
    feeWaivers: z.array(feeWaiverSchema).optional(),

    // Rewards — both shapes
    rewards: compactRewardsSchema.optional(),
    rewardProgram: rewardProgramSchema.optional(),
    welcomeBonus: welcomeBonusSchema.optional(),
    milestoneBonuses: z.array(milestoneBonusSchema).optional(),
    benefits: z.array(benefitSchema).optional(),

    // Lounge + travel + insurance
    lounge: compactLoungeSchema.optional(),
    travel: compactTravelSchema.optional(),
    insurance: insuranceSchema.optional(),

    // Perks
    perks: perksSchema.optional(),

    // Card-type specifics
    creditCardDetails: creditCardDetailsSchema.optional(),

    // Derived value / ROI
    value: valueSchema.optional(),

    // Presentation
    gradientColors: z.array(z.string()).optional(),
    features: z.array(z.string()).optional(),
    validity: z.string().optional(),
    contactless: z.boolean().optional(),
    ncmc: z.boolean().optional(),
    internationalUsable: z.boolean().optional(),
    bestFor: z.array(z.string()).optional(),
    category: z.string().optional(),

    // Reviews + ratings
    ratings: ratingsSchema.optional(),

    // Metadata
    launchDate: z.string().optional(),
    discontinued: z.boolean().optional(),
    variantOf: z.string().optional(),
    comparison: z.array(z.string()).optional(),
    affiliateLinks: z.record(z.string(), z.string()).optional(),
    customerCareNumber: z.string().optional(),
    applyUrl: z.string().optional(),
    lastUpdated: z.string().optional(),
    type: z.string().optional(), // legacy duplicate of cardType
    dataQuality: dataQualitySchema.optional(),
  })
  .passthrough()

export type Card = z.infer<typeof cardSchema>
