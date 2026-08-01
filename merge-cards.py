#!/usr/bin/env python3
"""Merge new research cards into existing cards.json"""

import json
import sys
from datetime import date

EXISTING_PATH = 'C:/g/ws/.work/cards-repo/data/cards.json'
OUTPUT_PATH = 'C:/g/ws/.work/cards-repo/data/cards.json'
README_PATH = 'C:/g/ws/.work/cards-repo/data/README.md'

# Load existing cards
with open(EXISTING_PATH, 'r', encoding='utf-8') as f:
    existing = json.load(f)

existing_map = {c['id']: c for c in existing}
print(f"Loaded {len(existing)} existing cards")

def count_filled(card):
    """Count number of non-null, non-empty fields."""
    count = 0
    for v in card.values():
        if v is not None and v != '' and v != [] and v != {}:
            count += 1
    return count

def new_card_to_rich(c):
    """Convert a new-format card to the rich schema with defaults."""
    annual_fee = c.get('annualFee') or 0
    joining_fee = c.get('joiningFee') or 0
    is_ltf = c.get('isLifetimeFree', annual_fee == 0 and joining_fee == 0)
    min_income = c.get('minIncome') or 0
    min_credit_score = c.get('minCreditScore') or 700
    color_scheme = c.get('colorScheme') or '#1a1a2e'
    tier = c.get('tier') or 'Classic'
    network = c.get('network') or 'Visa'
    apply_url = c.get('applyUrl') or ''
    fee_waiver_spend = c.get('feeWaiverSpend') or 0
    card_type = c.get('cardType', 'credit')

    # Extract gradient start color
    import re
    hex_match = re.search(r'#[0-9a-fA-F]{6}', color_scheme)
    gradient_start = hex_match.group(0) if hex_match else '#1a1a2e'
    gradient_end = '#4F9EFF'

    # Convert benefits strings -> objects
    benefits_input = c.get('benefits') or []
    icons_input = c.get('benefitIcons') or []
    benefits_arr = []
    for i, b in enumerate(benefits_input):
        cat = icons_input[i] if i < len(icons_input) else 'rewards'
        benefits_arr.append({
            'category': cat,
            'title': b,
            'description': b,
            'valueStr': b,
            'valueNum': 0,
            'frequencyStr': 'Per transaction',
            'frequencyPerYear': 12,
            'annualValue': 0,
            'conditions': [],
            'isSellable': False,
            'sellValue': 0,
            'isActive': True,
            'activationRequired': False
        })

    fee_waivers = []
    if fee_waiver_spend > 0:
        fee_waivers.append({
            'description': f'Annual fee waived on spending Rs. {fee_waiver_spend:,} annually',
            'annualSpendRequired': fee_waiver_spend,
            'waives': 'Annual fee'
        })

    material = 'Metal' if tier == 'Infinite' else 'Plastic'

    return {
        'id': c['id'],
        'name': c.get('name', c['id']),
        'tagline': c.get('tagline') or c.get('name', c['id']),
        'description': c.get('description') or c.get('name', c['id']),
        'bank': c.get('bank', ''),
        'bankCode': c.get('bankCode', ''),
        'network': network,
        'cardType': card_type,
        'tier': tier,
        'variant': 'Card',
        'usage': 'International',
        'bin': '',
        'material': material,
        'colorScheme': color_scheme,
        'virtualCardAvailable': True,
        'eligibility': {
            'employmentType': ['Salaried', 'Self-Employed'],
            'minSalary': min_income,
            'minAge': 21,
            'maxAge': 65,
            'minAnnualIncome': min_income * 12,
            'minCreditScore': min_credit_score,
            'existingAccountRequired': False,
            'invitationOnly': False,
            'notes': []
        },
        'charges': [
            {'label': 'Joining Fee', 'amount': joining_fee, 'amountWithGst': round(joining_fee * 1.18), 'note': 'Excluding GST'},
            {'label': 'Annual Fee', 'amount': annual_fee, 'amountWithGst': round(annual_fee * 1.18), 'note': 'Excluding GST'},
            {'label': 'Add-on Card Fee', 'amount': 0, 'note': 'Free'}
        ],
        'atmCharges': {
            'ownBankFreePerMonth': 5,
            'ownBankCharge': 20,
            'otherBankFreePerMonth': 3,
            'otherBankCharge': 20,
            'internationalWithdrawalFee': 125,
            'internationalWithdrawalPercent': 2.5,
            'balanceEnquiryOwnBank': 0,
            'balanceEnquiryOtherBank': 10,
            'miniStatementOtherBank': 10
        },
        'transactionCharges': {
            'currencyMarkupPercent': 3.5,
            'crossBorderFee': 0,
            'dccFeePercent': 1,
            'smsAlertPerMonth': 25,
            'pinRegenerationCharge': 50,
            'physicalStatementCharge': 100,
            'chequeBounceCharge': 500,
            'latePaymentFee': 750,
            'overLimitFee': 500,
            'cashAdvanceFeePercent': 2.5,
            'cashAdvanceFlatFee': 300,
            'interestRatePerMonth': 3.75,
            'annualInterestRate': 45
        },
        'fuelSurcharge': {
            'available': True,
            'waiverPercent': 1,
            'minTransactionAmount': 400,
            'maxTransactionAmount': 5000,
            'maxWaiverPerCycle': 250,
            'fuelNetworks': []
        },
        'limits': {
            'atmPerDay': 40000,
            'posEcomPerDay': 200000,
            'contactlessPerTxn': 5000,
            'contactlessDailyLimit': 25000
        },
        'insurance': {
            'accidentalDeathCover': 0,
            'permanentDisabilityCover': 0,
            'purchaseProtectionCover': 0,
            'purchaseProtectionDays': 0,
            'lostCardLiability': 250000,
            'lostCardLiabilityWindow': 24,
            'travelInsuranceCover': 0,
            'airAccidentCover': 0,
            'baggageCover': 0,
            'conditions': [],
            'provider': c.get('bank', '')
        },
        'benefits': benefits_arr,
        'rewardProgram': {
            'name': f"{c.get('bank', '')} Rewards",
            'earnRate': '1 RP per Rs. 100',
            'pointsPer100': 1,
            'pointValue': 0.25,
            'effectiveCashbackPercent': 0.25,
            'pointsExpiry': '3 years',
            'bonusCategories': [],
            'redemptionOptions': ['Vouchers', 'Statement credit', 'Travel'],
            'minRedemptionPoints': 500,
            'rewardRateStr': '0.25% to 2%'
        },
        'welcomeBonus': {
            'available': joining_fee > 0,
            'description': 'Welcome benefit on card activation' if joining_fee > 0 else '',
            'valueStr': 'Welcome Bonus' if joining_fee > 0 else '',
            'valueNum': 0,
            'conditions': []
        },
        'milestoneBonuses': [],
        'feeWaivers': fee_waivers,
        'features': ['Contactless payments', 'EMV chip security', 'International usage'],
        'validity': '5 years',
        'contactless': True,
        'ncmc': False,
        'creditCardDetails': {
            'billingCycleDays': 30,
            'gracePeriodDays': 50,
            'minimumDuePercent': 5,
            'minimumDueFlat': 200,
            'balanceTransfer': False,
            'emiConversion': True,
            'addOnCardAvailable': True,
            'maxAddOnCards': 3,
            'addOnCardFee': 0
        },
        'gradientColors': [gradient_start, gradient_end],
        'value': {
            'highestValue': annual_fee * 10,
            'averageValue': annual_fee * 5,
            'isSellable': False,
            'marketPrice': {'minSellPrice': 0, 'maxSellPrice': 0, 'averageMarketValue': 0},
            'annualNetValue': annual_fee * 4,
            'tenYearNetValue': annual_fee * 40,
            'totalAnnualCharges': round(annual_fee * 1.18),
            'totalAnnualBenefits': annual_fee * 5,
            'roiPercent': 400
        },
        'emiOptions': {
            'available': True,
            'minTransactionAmount': 2500,
            'tenureOptions': [3, 6, 9, 12],
            'interestRatePerMonth': 1.5,
            'processingFeePercent': 1
        },
        'category': 'standard',
        'internationalUsable': True,
        'bestFor': ['Rewards'],
        'isLifetimeFree': is_ltf,
        'dataQuality': {
            'status': 'partial',
            'verifiedFields': ['charges', 'rewards'],
            'unverifiedFields': ['atmCharges', 'transactionCharges'],
            'sourceUrls': [apply_url] if apply_url else [],
            'lastVerified': str(date.today())
        },
        'customerCareNumber': '1800-XXX-XXXX',
        'applyUrl': apply_url,
        'lastUpdated': str(date.today()),
        'type': card_type,
        'slug': c['id']
    }


# New cards data from research
NEW_CARDS_RAW = """NEW_CARDS_PLACEHOLDER"""

new_cards = json.loads(NEW_CARDS_RAW)
print(f"New cards from research: {len(new_cards)}")

added = 0
updated = 0

for nc in new_cards:
    cid = nc.get('id')
    if not cid:
        continue
    if cid in existing_map:
        # Keep existing (richer schema), only update if new has more filled fields
        existing_filled = count_filled(existing_map[cid])
        new_filled = count_filled(nc)
        if new_filled > existing_filled:
            existing_map[cid] = new_card_to_rich(nc)
            updated += 1
        # else keep existing as-is
    else:
        existing_map[cid] = new_card_to_rich(nc)
        added += 1

merged = list(existing_map.values())
print(f"Added: {added}, Updated: {updated}, Total: {len(merged)}")

# Write merged output
with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
    json.dump(merged, f, ensure_ascii=False, indent=2)
print(f"Written to {OUTPUT_PATH}")

# Compute stats for README
banks = sorted(set(c.get('bank', '') for c in merged if c.get('bank')))
type_counts = {}
network_counts = {}
for c in merged:
    ct = c.get('cardType') or c.get('type') or 'unknown'
    type_counts[ct] = type_counts.get(ct, 0) + 1
    nw = c.get('network', 'unknown')
    network_counts[nw] = network_counts.get(nw, 0) + 1

readme = f"""# Cards Database

Last updated: {date.today()}

## Summary

| Metric | Count |
|--------|-------|
| Total cards | {len(merged)} |
| Banks/Issuers | {len(banks)} |

## Breakdown by Card Type

| Type | Count |
|------|-------|
"""
for t, cnt in sorted(type_counts.items(), key=lambda x: -x[1]):
    readme += f"| {t} | {cnt} |\n"

readme += "\n## Breakdown by Network\n\n| Network | Count |\n|---------|-------|\n"
for nw, cnt in sorted(network_counts.items(), key=lambda x: -x[1]):
    readme += f"| {nw} | {cnt} |\n"

readme += "\n## Banks / Issuers\n\n"
for b in banks:
    count = sum(1 for c in merged if c.get('bank') == b)
    readme += f"- {b} ({count} cards)\n"

with open(README_PATH, 'w', encoding='utf-8') as f:
    f.write(readme)
print(f"README written to {README_PATH}")

# Output final stats as JSON for structured output
print(f"STATS::{json.dumps({'total': len(merged), 'added': added, 'updated': updated, 'banks': len(banks)})}")
