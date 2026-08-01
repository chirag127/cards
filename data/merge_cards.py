"""
Merge new researched cards into existing cards.json.
- Dedup by id: keep version with more fields
- Add all new cards not already present
- Ensure required fields with defaults
"""
import json
import sys
from collections import Counter

NEW_CARDS_FILE = 'C:/g/ws/.work/cards-repo/data/new_cards_input.json'
EXISTING_FILE = 'C:/g/ws/.work/cards-repo/data/cards.json'
OUTPUT_FILE = 'C:/g/ws/.work/cards-repo/data/cards.json'
README_FILE = 'C:/g/ws/.work/cards-repo/data/README.md'

REQUIRED_FIELDS = {
    'id': '',
    'name': '',
    'bank': '',
    'bankCode': '',
    'cardType': 'credit',
    'network': 'Visa',
    'annualFee': 0,
    'joiningFee': 0,
    'description': '',
    'tagline': '',
    'benefits': [],
    'benefitIcons': [],
    'isLifetimeFree': False,
    'colorScheme': '#1a1a2e',
}

def count_filled(card):
    """Count non-None, non-empty fields."""
    count = 0
    for v in card.values():
        if v is None:
            continue
        if isinstance(v, (list, dict)) and len(v) == 0:
            continue
        if isinstance(v, str) and v == '':
            continue
        count += 1
    return count

def ensure_required(card):
    """Fill missing required fields with defaults."""
    for field, default in REQUIRED_FIELDS.items():
        if field not in card or card[field] is None:
            if field == 'benefits' and isinstance(default, list):
                card[field] = []
            elif field == 'benefitIcons' and isinstance(default, list):
                card[field] = []
            elif field not in card:
                card[field] = default
    # Normalize benefits: must be list of strings
    if isinstance(card.get('benefits'), list):
        normalized = []
        for b in card['benefits']:
            if isinstance(b, str):
                normalized.append(b)
            elif isinstance(b, dict):
                # existing cards have benefits as objects; keep as-is
                normalized = card['benefits']
                break
        else:
            card['benefits'] = normalized
    return card

def main():
    # Load existing
    with open(EXISTING_FILE, encoding='utf-8') as f:
        existing = json.load(f)
    print(f"Existing cards: {len(existing)}")

    # Load new
    with open(NEW_CARDS_FILE, encoding='utf-8') as f:
        new_cards = json.load(f)
    print(f"New cards to process: {len(new_cards)}")

    existing_by_id = {c['id']: c for c in existing}

    added = 0
    updated = 0

    for new_card in new_cards:
        cid = new_card['id']
        new_card = ensure_required(new_card)

        if cid in existing_by_id:
            old = existing_by_id[cid]
            old_filled = count_filled(old)
            new_filled = count_filled(new_card)
            if new_filled > old_filled:
                # New has more data: merge — keep existing rich fields, patch missing ones from new
                merged = dict(new_card)
                for k, v in old.items():
                    if k not in merged or merged[k] is None or merged[k] == '' or merged[k] == []:
                        merged[k] = v
                # But preserve existing rich fields if they exist
                for k, v in old.items():
                    if isinstance(v, dict) and k not in ('benefits',):
                        merged[k] = v
                existing_by_id[cid] = merged
                updated += 1
            else:
                # Existing has more data: patch only missing required fields from new
                for field in REQUIRED_FIELDS:
                    if field not in old or old[field] is None or old[field] == '':
                        if field in new_card and new_card[field] is not None:
                            old[field] = new_card[field]
                existing_by_id[cid] = old
                # count as updated only if we changed something
        else:
            existing_by_id[cid] = new_card
            added += 1

    # Rebuild list preserving original order then appending new
    original_ids = [c['id'] for c in existing]
    result = []
    seen = set()
    for oid in original_ids:
        if oid in existing_by_id:
            result.append(existing_by_id[oid])
            seen.add(oid)
    for cid, card in existing_by_id.items():
        if cid not in seen:
            result.append(card)

    total = len(result)
    print(f"Total after merge: {total} (added={added}, updated={updated})")

    # Write output
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"Written to {OUTPUT_FILE}")

    # Stats for README
    banks = set(c.get('bank', 'Unknown') for c in result)
    by_type = Counter(c.get('cardType', 'unknown') for c in result)
    by_network = Counter(c.get('network', 'unknown') for c in result)
    by_bank = Counter(c.get('bank', 'Unknown') for c in result)

    readme = f"""# Cards Database

**Total cards:** {total}
**Banks covered:** {len(banks)}

## Breakdown by Card Type

| Type | Count |
|------|-------|
"""
    for t, n in sorted(by_type.items(), key=lambda x: -x[1]):
        readme += f"| {t} | {n} |\n"

    readme += """
## Breakdown by Network

| Network | Count |
|---------|-------|
"""
    for net, n in sorted(by_network.items(), key=lambda x: -x[1]):
        readme += f"| {net} | {n} |\n"

    readme += """
## Breakdown by Bank (top 30)

| Bank | Count |
|------|-------|
"""
    for bank, n in sorted(by_bank.items(), key=lambda x: -x[1])[:30]:
        readme += f"| {bank} | {n} |\n"

    with open(README_FILE, 'w', encoding='utf-8') as f:
        f.write(readme)
    print(f"README written to {README_FILE}")

    print(json.dumps({"total": total, "added": added, "updated": updated, "banks": len(banks)}))

if __name__ == '__main__':
    main()
