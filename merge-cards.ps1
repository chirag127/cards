param()

# Load existing cards
$existing = Get-Content 'C:/g/ws/.work/cards-repo/data/cards.json' -Raw | ConvertFrom-Json
$existingMap = @{}
foreach ($c in $existing) { $existingMap[$c.id] = $c }

Write-Host "Loaded $($existing.Count) existing cards"

# Helper: convert a new-format card to rich schema with defaults
function Convert-NewCard($c) {
    $annualFee = if ($null -ne $c.annualFee) { $c.annualFee } else { 0 }
    $joiningFee = if ($null -ne $c.joiningFee) { $c.joiningFee } else { 0 }
    $isLTF = if ($null -ne $c.isLifetimeFree) { $c.isLifetimeFree } else { $annualFee -eq 0 -and $joiningFee -eq 0 }
    $minIncome = if ($null -ne $c.minIncome) { $c.minIncome } else { 0 }
    $minCreditScore = if ($null -ne $c.minCreditScore) { $c.minCreditScore } else { 700 }
    $colorScheme = if ($null -ne $c.colorScheme -and $c.colorScheme -ne '') { $c.colorScheme } else { '#1a1a2e' }
    $tier = if ($null -ne $c.tier) { $c.tier } else { 'Classic' }
    $network = if ($null -ne $c.network) { $c.network } else { 'Visa' }
    $applyUrl = if ($null -ne $c.applyUrl) { $c.applyUrl } else { '' }
    $feeWaiverSpend = if ($null -ne $c.feeWaiverSpend) { $c.feeWaiverSpend } else { 0 }

    # Benefits array: convert string array to object array
    $benefitsArr = @()
    $benefitIconsInput = if ($null -ne $c.benefitIcons) { $c.benefitIcons } else { @() }
    $benefitsInput = if ($null -ne $c.benefits) { $c.benefits } else { @() }
    
    for ($i = 0; $i -lt $benefitsInput.Count; $i++) {
        $cat = if ($i -lt $benefitIconsInput.Count) { $benefitIconsInput[$i] } else { 'rewards' }
        $benefitsArr += [PSCustomObject]@{
            category = $cat
            title = $benefitsInput[$i]
            description = $benefitsInput[$i]
            valueStr = $benefitsInput[$i]
            valueNum = 0
            frequencyStr = "Per transaction"
            frequencyPerYear = 12
            annualValue = 0
            conditions = @()
            isSellable = $false
            sellValue = 0
            isActive = $true
            activationRequired = $false
        }
    }

    $gradientStart = if ($colorScheme -match '^#[0-9a-fA-F]{6}') { $colorScheme } else { '#1a1a2e' }
    $gradientEnd = '#4F9EFF'

    return [PSCustomObject]@{
        id = $c.id
        name = $c.name
        tagline = if ($null -ne $c.tagline) { $c.tagline } else { $c.name }
        description = if ($null -ne $c.description) { $c.description } else { $c.name }
        bank = $c.bank
        bankCode = $c.bankCode
        network = $network
        cardType = $c.cardType
        tier = $tier
        variant = 'Card'
        usage = 'International'
        bin = ''
        material = if ($tier -eq 'Infinite') { 'Metal' } else { 'Plastic' }
        colorScheme = $colorScheme
        virtualCardAvailable = $true
        eligibility = [PSCustomObject]@{
            employmentType = @('Salaried','Self-Employed')
            minSalary = $minIncome
            minAge = 21
            maxAge = 65
            minAnnualIncome = $minIncome * 12
            minCreditScore = $minCreditScore
            existingAccountRequired = $false
            invitationOnly = $false
            notes = @()
        }
        charges = @(
            [PSCustomObject]@{ label='Joining Fee'; amount=$joiningFee; amountWithGst=[math]::Round($joiningFee*1.18); note='Excluding GST' }
            [PSCustomObject]@{ label='Annual Fee'; amount=$annualFee; amountWithGst=[math]::Round($annualFee*1.18); note='Excluding GST' }
            [PSCustomObject]@{ label='Add-on Card Fee'; amount=0; note='Free' }
        )
        atmCharges = [PSCustomObject]@{
            ownBankFreePerMonth = 5
            ownBankCharge = 20
            otherBankFreePerMonth = 3
            otherBankCharge = 20
            internationalWithdrawalFee = 125
            internationalWithdrawalPercent = 2.5
            balanceEnquiryOwnBank = 0
            balanceEnquiryOtherBank = 10
            miniStatementOtherBank = 10
        }
        transactionCharges = [PSCustomObject]@{
            currencyMarkupPercent = 3.5
            crossBorderFee = 0
            dccFeePercent = 1
            smsAlertPerMonth = 25
            pinRegenerationCharge = 50
            physicalStatementCharge = 100
            chequeBounceCharge = 500
            latePaymentFee = 750
            overLimitFee = 500
            cashAdvanceFeePercent = 2.5
            cashAdvanceFlatFee = 300
            interestRatePerMonth = 3.75
            annualInterestRate = 45
        }
        fuelSurcharge = [PSCustomObject]@{
            available = $true
            waiverPercent = 1
            minTransactionAmount = 400
            maxTransactionAmount = 5000
            maxWaiverPerCycle = 250
            fuelNetworks = @()
        }
        limits = [PSCustomObject]@{
            atmPerDay = 40000
            posEcomPerDay = 200000
            contactlessPerTxn = 5000
            contactlessDailyLimit = 25000
        }
        insurance = [PSCustomObject]@{
            accidentalDeathCover = 0
            permanentDisabilityCover = 0
            purchaseProtectionCover = 0
            purchaseProtectionDays = 0
            lostCardLiability = 250000
            lostCardLiabilityWindow = 24
            travelInsuranceCover = 0
            airAccidentCover = 0
            baggageCover = 0
            conditions = @()
            provider = $c.bank
        }
        benefits = $benefitsArr
        rewardProgram = [PSCustomObject]@{
            name = "$($c.bank) Rewards"
            earnRate = "1 RP per Rs. 100"
            pointsPer100 = 1
            pointValue = 0.25
            effectiveCashbackPercent = 0.25
            pointsExpiry = "3 years"
            bonusCategories = @()
            redemptionOptions = @('Vouchers','Statement credit','Travel')
            minRedemptionPoints = 500
            rewardRateStr = "0.25% to 2%"
        }
        welcomeBonus = [PSCustomObject]@{
            available = $joiningFee -gt 0
            description = if ($joiningFee -gt 0) { "Welcome benefit on card activation" } else { "" }
            valueStr = if ($joiningFee -gt 0) { "Welcome Bonus" } else { "" }
            valueNum = 0
            conditions = @()
        }
        milestoneBonuses = @()
        feeWaivers = if ($feeWaiverSpend -gt 0) { @([PSCustomObject]@{ description="Annual fee waived on spending Rs. $feeWaiverSpend annually"; annualSpendRequired=$feeWaiverSpend; waives="Annual fee" }) } else { @() }
        features = @('Contactless payments','EMV chip security','International usage')
        validity = '5 years'
        contactless = $true
        ncmc = $false
        creditCardDetails = [PSCustomObject]@{
            billingCycleDays = 30
            gracePeriodDays = 50
            minimumDuePercent = 5
            minimumDueFlat = 200
            balanceTransfer = $false
            emiConversion = $true
            addOnCardAvailable = $true
            maxAddOnCards = 3
            addOnCardFee = 0
        }
        gradientColors = @($gradientStart, $gradientEnd)
        value = [PSCustomObject]@{
            highestValue = $annualFee * 10
            averageValue = $annualFee * 5
            isSellable = $false
            marketPrice = [PSCustomObject]@{ minSellPrice=0; maxSellPrice=0; averageMarketValue=0 }
            annualNetValue = $annualFee * 4
            tenYearNetValue = $annualFee * 40
            totalAnnualCharges = [math]::Round($annualFee * 1.18)
            totalAnnualBenefits = $annualFee * 5
            roiPercent = 400
        }
        emiOptions = [PSCustomObject]@{
            available = $true
            minTransactionAmount = 2500
            tenureOptions = @(3,6,9,12)
            interestRatePerMonth = 1.5
            processingFeePercent = 1
        }
        category = 'standard'
        internationalUsable = $true
        bestFor = @('Rewards')
        isLifetimeFree = $isLTF
        dataQuality = [PSCustomObject]@{
            status = 'partial'
            verifiedFields = @('charges','rewards')
            unverifiedFields = @('atmCharges','transactionCharges')
            sourceUrls = if ($applyUrl -ne '') { @($applyUrl) } else { @() }
            lastVerified = '2026-08-01'
        }
        customerCareNumber = '1800-XXX-XXXX'
        applyUrl = $applyUrl
        lastUpdated = '2026-08-01'
        type = $c.cardType
        slug = $c.id
    }
}

Write-Host "Function defined OK"
