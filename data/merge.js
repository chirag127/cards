// merge.js — merges new researched cards into existing cards.json
const fs = require('fs');
const path = require('path');

const dataDir = path.dirname(__filename);
const cardsPath = path.join(dataDir, 'cards.json');

// ── Load existing data ──────────────────────────────────────────────────────
const existing = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
const existingMap = new Map(existing.map(c => [c.id, c]));

// ── Helper: count filled fields (non-null, non-empty) ──────────────────────
function filledFields(obj) {
  let count = 0;
  for (const v of Object.values(obj)) {
    if (v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)) count++;
  }
  return count;
}

// ── Helper: convert new-style card to merged shape ─────────────────────────
function normaliseNew(nc) {
  return {
    id: nc.id,
    name: nc.name,
    tagline: nc.tagline || '',
    description: nc.description || '',
    bank: nc.bank || '',
    bankCode: nc.bankCode || '',
    network: nc.network || '',
    cardType: nc.cardType || 'credit',
    tier: nc.tier || null,
    colorScheme: nc.colorScheme || '',
    isLifetimeFree: nc.isLifetimeFree === true,
    benefits: Array.isArray(nc.benefits) ? nc.benefits : [],
    benefitIcons: Array.isArray(nc.benefitIcons) ? nc.benefitIcons : [],
    charges: [
      { label: 'Joining Fee', amount: nc.joiningFee != null ? nc.joiningFee : 0 },
      { label: 'Annual Fee', amount: nc.annualFee != null ? nc.annualFee : 0 },
    ],
    eligibility: {
      minSalary: nc.minIncome || null,
      minCreditScore: nc.minCreditScore || null,
    },
    feeWaiverSpend: nc.feeWaiverSpend || null,
    applyUrl: nc.applyUrl || null,
  };
}

// ── New cards (provided inline) ────────────────────────────────────────────
const newCards = JSON.parse(fs.readFileSync(path.join(dataDir, 'new_cards_raw.json'), 'utf8'));

let added = 0;
let updated = 0;

for (const nc of newCards) {
  if (!nc.id) continue;

  if (!existingMap.has(nc.id)) {
    // Brand new — add normalised version
    existingMap.set(nc.id, normaliseNew(nc));
    added++;
  } else {
    // Already exists — keep the richer version
    const ex = existingMap.get(nc.id);
    const exFields = filledFields(ex);
    const ncFields = filledFields(nc);

    if (ncFields > exFields) {
      // New version is richer — merge: new base + existing extras
      const merged = Object.assign({}, normaliseNew(nc), ex);
      // Prefer new description/tagline/benefits if existing ones are shorter/empty
      if ((nc.description || '').length > (ex.description || '').length) merged.description = nc.description;
      if ((nc.tagline || '').length > (ex.tagline || '').length) merged.tagline = nc.tagline;
      if ((nc.benefits || []).length > (ex.benefits || []).length) merged.benefits = nc.benefits;
      if ((nc.benefitIcons || []).length > (ex.benefitIcons || []).length) merged.benefitIcons = nc.benefitIcons;
      existingMap.set(nc.id, merged);
      updated++;
    }
    // else existing is richer — leave untouched
  }
}

// ── Ensure required fields on every card ──────────────────────────────────
const required = ['id','name','bank','bankCode','cardType','network','description','tagline','benefits','benefitIcons','isLifetimeFree','colorScheme'];
const finalCards = [...existingMap.values()].map(c => {
  for (const f of required) {
    if (c[f] === undefined || c[f] === null) {
      if (f === 'benefits' || f === 'benefitIcons') c[f] = [];
      else if (f === 'isLifetimeFree') c[f] = false;
      else if (f === 'annualFee' || f === 'joiningFee') c[f] = 0;
      else c[f] = '';
    }
  }
  return c;
});

// ── Write merged data ──────────────────────────────────────────────────────
fs.writeFileSync(cardsPath, JSON.stringify(finalCards, null, 2));
console.log(JSON.stringify({ total: finalCards.length, added, updated, banks: new Set(finalCards.map(c => c.bank)).size }));
