param(
    [string]$NewCardsPath = 'C:/g/ws/.work/cards-repo/data/new_cards_input.json',
    [string]$ExistingPath = 'C:/g/ws/.work/cards-repo/data/cards.json'
)

function Count-FilledFields($obj) {
    $count = 0
    foreach ($prop in $obj.PSObject.Properties) {
        $val = $prop.Value
        if ($null -ne $val) {
            if ($val -is [string] -and $val.Trim() -ne '') { $count++ }
            elseif ($val -is [System.Array] -and $val.Count -gt 0) { $count++ }
            elseif ($val -isnot [string] -and $val -isnot [System.Array]) { $count++ }
        }
    }
    return $count
}

function Ensure-RequiredFields($card) {
    # Ensure required fields with defaults
    if ($null -eq $card.annualFee) { $card | Add-Member -NotePropertyName annualFee -NotePropertyValue 0 -Force }
    if ($null -eq $card.joiningFee) { $card | Add-Member -NotePropertyName joiningFee -NotePropertyValue 0 -Force }
    if ($null -eq $card.isLifetimeFree) { $card | Add-Member -NotePropertyName isLifetimeFree -NotePropertyValue $false -Force }
    if ($null -eq $card.benefits -or ($card.benefits -is [System.Array] -and $card.benefits.Count -eq 0)) {
        $card | Add-Member -NotePropertyName benefits -NotePropertyValue @() -Force
    }
    if ($null -eq $card.benefitIcons -or ($card.benefitIcons -is [System.Array] -and $card.benefitIcons.Count -eq 0)) {
        $card | Add-Member -NotePropertyName benefitIcons -NotePropertyValue @() -Force
    }
    if ([string]::IsNullOrWhiteSpace($card.colorScheme)) {
        $card | Add-Member -NotePropertyName colorScheme -NotePropertyValue '' -Force
    }
    if ([string]::IsNullOrWhiteSpace($card.description)) {
        $card | Add-Member -NotePropertyName description -NotePropertyValue '' -Force
    }
    if ([string]::IsNullOrWhiteSpace($card.tagline)) {
        $card | Add-Member -NotePropertyName tagline -NotePropertyValue '' -Force
    }
    return $card
}

Write-Host "Loading existing cards..."
$existing = Get-Content $ExistingPath -Raw | ConvertFrom-Json
Write-Host "Existing cards: $($existing.Count)"

Write-Host "Loading new cards..."
$newCards = Get-Content $NewCardsPath -Raw | ConvertFrom-Json
Write-Host "New cards to merge: $($newCards.Count)"

# Build hashtable by id
$cardMap = [ordered]@{}
foreach ($card in $existing) {
    $card = Ensure-RequiredFields $card
    $cardMap[$card.id] = $card
}

$added = 0
$updated = 0

foreach ($newCard in $newCards) {
    $newCard = Ensure-RequiredFields $newCard
    $id = $newCard.id

    if ($cardMap.Contains($id)) {
        # Compare field counts - keep version with more filled fields
        $existingCount = Count-FilledFields $cardMap[$id]
        $newCount = Count-FilledFields $newCard
        if ($newCount -gt $existingCount) {
            $cardMap[$id] = $newCard
            $updated++
        }
    } else {
        $cardMap[$id] = $newCard
        $added++
    }
}

$merged = @($cardMap.Values)
Write-Host "Merged total: $($merged.Count) (added: $added, updated: $updated)"

# Get bank count
$banks = $merged | ForEach-Object { $_.bank } | Sort-Object -Unique
Write-Host "Unique banks: $($banks.Count)"

# Write merged back
$mergedJson = $merged | ConvertTo-Json -Depth 10 -Compress
Set-Content -Path $ExistingPath -Value $mergedJson -Encoding UTF8
Write-Host "Written to $ExistingPath"

# Write README summary
$byType = $merged | Group-Object cardType | Sort-Object Name
$byNetwork = $merged | Group-Object network | Sort-Object Name

$readmeLines = @(
    "# Cards Database",
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "|--------|-------|",
    "| Total cards | $($merged.Count) |",
    "| Banks | $($banks.Count) |",
    "",
    "## By Card Type",
    "",
    "| Type | Count |",
    "|------|-------|"
)
foreach ($g in $byType) {
    $readmeLines += "| $($g.Name) | $($g.Count) |"
}
$readmeLines += ""
$readmeLines += "## By Network"
$readmeLines += ""
$readmeLines += "| Network | Count |"
$readmeLines += "|---------|-------|"
foreach ($g in $byNetwork) {
    $readmeLines += "| $($g.Name) | $($g.Count) |"
}
$readmeLines += ""
$readmeLines += "## Banks"
$readmeLines += ""
foreach ($b in $banks) {
    $cnt = ($merged | Where-Object { $_.bank -eq $b }).Count
    $readmeLines += "- $b ($cnt cards)"
}
$readmeLines += ""
$readmeLines += "_Last updated: $(Get-Date -Format 'yyyy-MM-dd')_"

Set-Content -Path 'C:/g/ws/.work/cards-repo/data/README.md' -Value ($readmeLines -join "`n") -Encoding UTF8
Write-Host "README written"

# Output structured result for caller
Write-Host "RESULT:total=$($merged.Count),added=$added,updated=$updated,banks=$($banks.Count)"
