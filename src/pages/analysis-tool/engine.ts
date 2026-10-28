/**
 * Patel Digit Tool engine — exact port of the reference scanner math.
 *
 * Every number shown by the reference app (even/odd, over/under, digit-match
 * and rise/fall predictions, confidences and digit distributions) comes from
 * `calculateAnalysis` over the trailing 30 digits, plus the strict
 * `validateSignalAgainstContract` guard that rejects mismatched signals.
 */

export type MarketCategory = '1s' | 'plain';

export interface PdtMarket {
    id: string;
    symbol: string;
    displayName: string;
    shortName: string;
    code: string;
    category: MarketCategory;
    volatilityRate: number;
}

export interface DigitStat {
    count: number;
    percentage: number;
}

export interface MarketAnalysis {
    marketId: string;
    marketName: string;
    currentPrice: number;
    lastDigit: number;
    recentDigits: number[];
    evenCount: number;
    oddCount: number;
    evenPercentage: number;
    oddPercentage: number;
    overCount: number;
    underCount: number;
    overPercentage: number;
    underPercentage: number;
    digitDistribution: Record<number, DigitStat>;
    mostProbableDigit: number;
    leastProbableDigit: number;
    evenOddPrediction: 'EVEN' | 'ODD';
    evenOddConfidence: number;
    overUnderPrediction: 'OVER 4' | 'UNDER 5';
    overUnderConfidence: number;
    digitMatchPrediction: number;
    digitMatchConfidence: number;
    matchesDiffersPrediction: { matchDigit: number; differDigit: number; differConfidence: number };
    riseCount: number;
    fallCount: number;
    risePercentage: number;
    fallPercentage: number;
    riseFallPrediction: 'RISE' | 'FALL';
    riseFallConfidence: number;
    recentPriceDeltas: number[];
    timestamp: number;
}

export type ContractCategory = 'EVEN_ODD' | 'OVER_UNDER' | 'MATCHES_DIFFERS' | 'RISE_FALL';

export interface PdtSignal {
    id: string;
    market: string;
    marketName: string;
    contractCategory: ContractCategory;
    signalType: 'even_odd' | 'over_under' | 'matches_differs' | 'rise_fall';
    prediction: string;
    targetDigit?: number;
    confidence: number;
    createdAt: number;
    expiresAt: number;
    status: 'ACTIVE' | 'EXPIRED';
    digitHistory: number[];
    probability: number;
    payoutMultiplier: string;
    winProbabilityEstimate: number;
}

/** 17 volatility indexes in the reference order (1s markets first). */
export const PDT_MARKETS: PdtMarket[] = [
    { id: '1HZ10V', symbol: '1HZ10V', displayName: 'Volatility 10 (1s) Index', shortName: 'VOLATILITY 10 (1S)', code: '1HZ10V', category: '1s', volatilityRate: 10 },
    { id: '1HZ15V', symbol: '1HZ15V', displayName: 'Volatility 15 (1s) Index', shortName: 'VOLATILITY 15 (1S)', code: '1HZ15V', category: '1s', volatilityRate: 15 },
    { id: '1HZ25V', symbol: '1HZ25V', displayName: 'Volatility 25 (1s) Index', shortName: 'VOLATILITY 25 (1S)', code: '1HZ25V', category: '1s', volatilityRate: 25 },
    { id: '1HZ30V', symbol: '1HZ30V', displayName: 'Volatility 30 (1s) Index', shortName: 'VOLATILITY 30 (1S)', code: '1HZ30V', category: '1s', volatilityRate: 30 },
    { id: '1HZ50V', symbol: '1HZ50V', displayName: 'Volatility 50 (1s) Index', shortName: 'VOLATILITY 50 (1S)', code: '1HZ50V', category: '1s', volatilityRate: 50 },
    { id: '1HZ75V', symbol: '1HZ75V', displayName: 'Volatility 75 (1s) Index', shortName: 'VOLATILITY 75 (1S)', code: '1HZ75V', category: '1s', volatilityRate: 75 },
    { id: '1HZ90V', symbol: '1HZ90V', displayName: 'Volatility 90 (1s) Index', shortName: 'VOLATILITY 90 (1S)', code: '1HZ90V', category: '1s', volatilityRate: 90 },
    { id: '1HZ100V', symbol: '1HZ100V', displayName: 'Volatility 100 (1s) Index', shortName: 'VOLATILITY 100 (1S)', code: '1HZ100V', category: '1s', volatilityRate: 100 },
    { id: '1HZ150V', symbol: '1HZ150V', displayName: 'Volatility 150 (1s) Index', shortName: 'VOLATILITY 150 (1S)', code: '1HZ150V', category: '1s', volatilityRate: 150 },
    { id: '1HZ200V', symbol: '1HZ200V', displayName: 'Volatility 200 (1s) Index', shortName: 'VOLATILITY 200 (1S)', code: '1HZ200V', category: '1s', volatilityRate: 200 },
    { id: '1HZ250V', symbol: '1HZ250V', displayName: 'Volatility 250 (1s) Index', shortName: 'VOLATILITY 250 (1S)', code: '1HZ250V', category: '1s', volatilityRate: 250 },
    { id: '1HZ300V', symbol: '1HZ300V', displayName: 'Volatility 300 (1s) Index', shortName: 'VOLATILITY 300 (1S)', code: '1HZ300V', category: '1s', volatilityRate: 300 },
    { id: 'R_10', symbol: 'R_10', displayName: 'Volatility 10 Index', shortName: 'VOLATILITY 10', code: 'R_10', category: 'plain', volatilityRate: 10 },
    { id: 'R_25', symbol: 'R_25', displayName: 'Volatility 25 Index', shortName: 'VOLATILITY 25', code: 'R_25', category: 'plain', volatilityRate: 25 },
    { id: 'R_50', symbol: 'R_50', displayName: 'Volatility 50 Index', shortName: 'VOLATILITY 50', code: 'R_50', category: 'plain', volatilityRate: 50 },
    { id: 'R_75', symbol: 'R_75', displayName: 'Volatility 75 Index', shortName: 'VOLATILITY 75', code: 'R_75', category: 'plain', volatilityRate: 75 },
    { id: 'R_100', symbol: 'R_100', displayName: 'Volatility 100 Index', shortName: 'VOLATILITY 100', code: 'R_100', category: 'plain', volatilityRate: 100 },
];

export const getMarketName = (symbol: string): string =>
    PDT_MARKETS.find(m => m.symbol === symbol)?.displayName ?? symbol;

const FALLBACK_DIGITS = [5, 6, 7, 8, 3, 2, 1, 9, 0, 4];

/** Core analysis — identical math to the reference `calculateAnalysis`. */
export const calculateAnalysis = (
    marketId: string,
    digits: number[],
    price = 1000
): MarketAnalysis => {
    const marketName = getMarketName(marketId);
    const recent = digits.length > 0 ? digits.slice(-30) : FALLBACK_DIGITS;
    const lastDigit = recent[recent.length - 1] ?? 5;

    const digitDistribution: Record<number, DigitStat> = {};
    for (let d = 0; d <= 9; d += 1) digitDistribution[d] = { count: 0, percentage: 0 };

    let evenCount = 0;
    let oddCount = 0;
    let overCount = 0;
    let underCount = 0;
    recent.forEach(d => {
        if (digitDistribution[d]) digitDistribution[d].count += 1;
        if (d % 2 === 0) evenCount += 1;
        else oddCount += 1;
        if (d >= 5) overCount += 1;
        else underCount += 1;
    });

    const n = recent.length || 1;
    for (let d = 0; d <= 9; d += 1) {
        digitDistribution[d].percentage = Math.round((digitDistribution[d].count / n) * 100);
    }

    const evenPercentage = Math.round((evenCount / n) * 100);
    const oddPercentage = Math.round((oddCount / n) * 100);
    const overPercentage = Math.round((overCount / n) * 100);
    const underPercentage = Math.round((underCount / n) * 100);

    let mostProbableDigit = 0;
    let leastProbableDigit = 0;
    let maxCount = -1;
    let minCount = 9999;
    for (let d = 0; d <= 9; d += 1) {
        if (digitDistribution[d].count > maxCount) {
            maxCount = digitDistribution[d].count;
            mostProbableDigit = d;
        }
        if (digitDistribution[d].count < minCount) {
            minCount = digitDistribution[d].count;
            leastProbableDigit = d;
        }
    }

    const evenOddPrediction: 'EVEN' | 'ODD' = evenPercentage >= oddPercentage ? 'EVEN' : 'ODD';
    const evenOddGap = Math.abs(evenPercentage - oddPercentage);
    const evenOddConfidence = Math.min(94, Math.max(68, 70 + Math.round(evenOddGap * 0.75)));

    const overUnderPrediction: 'OVER 4' | 'UNDER 5' = overPercentage >= underPercentage ? 'OVER 4' : 'UNDER 5';
    const overUnderGap = Math.abs(overPercentage - underPercentage);
    const overUnderConfidence = Math.min(92, Math.max(68, 72 + Math.round(overUnderGap * 0.8)));

    const digitMatchPrediction = mostProbableDigit;
    const topPct = digitDistribution[mostProbableDigit].percentage;
    const digitMatchConfidence = Math.min(89, Math.max(72, 70 + Math.round(topPct * 1.2)));

    const leastPct = digitDistribution[leastProbableDigit].percentage;
    const differConfidence = Math.min(96, Math.max(85, 100 - leastPct));

    const recentPriceDeltas: number[] = [];
    let rise = 0;
    let fall = 0;
    for (let i = 1; i < recent.length; i += 1) {
        const delta = recent[i] - recent[i - 1];
        recentPriceDeltas.push(delta >= 0 ? 1 : -1);
        if (delta > 0) rise += 1;
        else if (delta < 0) fall += 1;
        else if (recent[i] % 2 === 0) rise += 1;
        else fall += 1;
    }
    const totalMoves = rise + fall || 1;
    const risePercentage = Math.round((rise / totalMoves) * 100);
    const fallPercentage = Math.round((fall / totalMoves) * 100);
    const riseFallPrediction: 'RISE' | 'FALL' = risePercentage >= fallPercentage ? 'RISE' : 'FALL';
    const riseFallGap = Math.abs(risePercentage - fallPercentage);
    const riseFallConfidence = Math.min(93, Math.max(68, 70 + Math.round(riseFallGap * 0.75)));

    return {
        marketId,
        marketName,
        currentPrice: price,
        lastDigit,
        recentDigits: recent,
        evenCount,
        oddCount,
        evenPercentage,
        oddPercentage,
        overCount,
        underCount,
        overPercentage,
        underPercentage,
        digitDistribution,
        mostProbableDigit,
        leastProbableDigit,
        evenOddPrediction,
        evenOddConfidence,
        overUnderPrediction,
        overUnderConfidence,
        digitMatchPrediction,
        digitMatchConfidence,
        matchesDiffersPrediction: { matchDigit: mostProbableDigit, differDigit: leastProbableDigit, differConfidence },
        riseCount: rise,
        fallCount: fall,
        risePercentage,
        fallPercentage,
        riseFallPrediction,
        riseFallConfidence,
        recentPriceDeltas,
        timestamp: Date.now(),
    };
};

/** Barrier-split stats for the Over/Under view (barrier like 4.5 → threshold digit 4). */
export const barrierSplit = (digits: number[], barrier: number) => {
    const threshold = Math.floor(barrier);
    const recent = digits.slice(-30);
    const n = recent.length || 1;
    const over = recent.filter(d => d > threshold).length;
    return {
        threshold,
        overCount: over,
        underCount: recent.length - over,
        overPercentage: Math.round((over / n) * 100),
        underPercentage: Math.round(((recent.length - over) / n) * 100),
    };
};

const SIGNAL_TTL_MS = 60_000;

export const generateEvenOddSignal = (
    market: string,
    marketName: string,
    digits: number[],
    analysis: MarketAnalysis,
    forced?: 'even' | 'odd'
): PdtSignal => {
    const now = Date.now();
    const prediction =
        forced === 'even' ? 'EVEN' : forced === 'odd' ? 'ODD' : analysis.evenPercentage >= analysis.oddPercentage ? 'EVEN' : 'ODD';
    const confidence = Math.min(94, Math.max(70, analysis.evenOddConfidence || 76));
    const probability = Math.max(52, prediction === 'EVEN' ? analysis.evenPercentage : analysis.oddPercentage);
    return {
        id: `${market}-EVEN_ODD-${now}-${Math.floor(Math.random() * 1000)}`,
        market,
        marketName,
        contractCategory: 'EVEN_ODD',
        signalType: 'even_odd',
        prediction,
        confidence,
        createdAt: now,
        expiresAt: now + SIGNAL_TTL_MS,
        status: 'ACTIVE',
        digitHistory: [...digits.slice(-10)],
        probability,
        payoutMultiplier: '1.95x',
        winProbabilityEstimate: Math.min(98, confidence + 1),
    };
};

export const generateOverUnderSignal = (
    market: string,
    marketName: string,
    digits: number[],
    analysis: MarketAnalysis,
    barrier: number,
    forced?: 'over' | 'under'
): PdtSignal => {
    const now = Date.now();
    const threshold = Math.floor(barrier);
    const last = digits[digits.length - 1] ?? analysis.lastDigit ?? 5;
    const wantOver = forced === 'over' || (forced !== 'under' && analysis.overPercentage >= analysis.underPercentage);
    let targetDigit: number;
    let prediction: string;
    if (wantOver) {
        // Reference: over contracts sit below the chosen barrier — mirror its level heuristic.
        targetDigit = Math.min(threshold, Math.max(1, last >= threshold ? threshold - 1 : threshold - 2));
        prediction = `OVER ${targetDigit}`;
    } else {
        targetDigit = Math.max(threshold + 1, Math.min(8, last <= threshold ? threshold + 2 : threshold + 3));
        prediction = `UNDER ${targetDigit}`;
    }
    const confidence = Math.min(94, Math.max(72, analysis.overUnderConfidence || 78));
    const probability = Math.min(92, Math.max(58, wantOver ? analysis.overPercentage || 65 : analysis.underPercentage || 65));
    return {
        id: `${market}-OVER_UNDER-${now}-${Math.floor(Math.random() * 1000)}`,
        market,
        marketName,
        contractCategory: 'OVER_UNDER',
        signalType: 'over_under',
        prediction,
        targetDigit,
        confidence,
        createdAt: now,
        expiresAt: now + SIGNAL_TTL_MS,
        status: 'ACTIVE',
        digitHistory: [...digits.slice(-10)],
        probability,
        payoutMultiplier: '1.95x',
        winProbabilityEstimate: Math.min(98, confidence + 1),
    };
};

export const generateRiseFallSignal = (
    market: string,
    marketName: string,
    digits: number[],
    analysis: MarketAnalysis,
    forced?: 'rise' | 'fall'
): PdtSignal => {
    const now = Date.now();
    const prediction =
        forced === 'rise' ? 'RISE' : forced === 'fall' ? 'FALL' : analysis.risePercentage >= analysis.fallPercentage ? 'RISE' : 'FALL';
    const confidence = Math.min(93, Math.max(70, analysis.riseFallConfidence || 76));
    const probability = Math.max(55, prediction === 'RISE' ? analysis.risePercentage : analysis.fallPercentage);
    return {
        id: `${market}-RISE_FALL-${now}-${Math.floor(Math.random() * 1000)}`,
        market,
        marketName,
        contractCategory: 'RISE_FALL',
        signalType: 'rise_fall',
        prediction,
        confidence,
        createdAt: now,
        expiresAt: now + SIGNAL_TTL_MS,
        status: 'ACTIVE',
        digitHistory: [...digits.slice(-10)],
        probability,
        payoutMultiplier: '1.95x',
        winProbabilityEstimate: Math.min(98, confidence + 1),
    };
};

export const generateMatchesDiffersSignal = (
    market: string,
    marketName: string,
    digits: number[],
    analysis: MarketAnalysis,
    forced?: 'matches' | 'differs',
    lockedDigit?: number
): PdtSignal => {
    const now = Date.now();
    const isMatch = forced === 'matches';
    let prediction: string;
    let targetDigit: number;
    let confidence: number;
    let probability: number;
    let payoutMultiplier: string;
    if (isMatch) {
        targetDigit = lockedDigit ?? analysis.matchesDiffersPrediction.matchDigit ?? 7;
        prediction = `MATCHES ${targetDigit}`;
        confidence = Math.min(89, Math.max(70, analysis.digitMatchConfidence || 75));
        probability = analysis.digitDistribution[targetDigit]?.percentage ?? 18;
        payoutMultiplier = '9.2x';
    } else {
        targetDigit = lockedDigit ?? analysis.matchesDiffersPrediction.differDigit ?? 0;
        prediction = `DIFFERS ${targetDigit}`;
        confidence = Math.min(96, Math.max(82, analysis.matchesDiffersPrediction.differConfidence || 88));
        probability = confidence;
        payoutMultiplier = '1.12x';
    }
    return {
        id: `${market}-MATCHES_DIFFERS-${now}-${Math.floor(Math.random() * 1000)}`,
        market,
        marketName,
        contractCategory: 'MATCHES_DIFFERS',
        signalType: 'matches_differs',
        prediction,
        targetDigit,
        confidence,
        createdAt: now,
        expiresAt: now + SIGNAL_TTL_MS,
        status: 'ACTIVE',
        digitHistory: [...digits.slice(-10)],
        probability,
        payoutMultiplier,
        winProbabilityEstimate: Math.min(98, confidence + 1),
    };
};

export interface ValidationResult {
    valid: boolean;
    contractCategory: ContractCategory;
    signalType: string;
    prediction: string;
    reason: string;
}

/** Strict contract validation — identical rules to the reference signal engine. */
export const validateSignalAgainstContract = (
    category: ContractCategory,
    signal: PdtSignal | null | undefined
): ValidationResult => {
    if (!signal) {
        return { valid: false, contractCategory: category, signalType: '', prediction: '', reason: 'No signal provided' };
    }
    if (!signal.market) {
        return {
            valid: false,
            contractCategory: category,
            signalType: signal.signalType || '',
            prediction: signal.prediction || '',
            reason: 'REJECT — MISSING MARKET IDENTIFIER',
        };
    }
    if (signal.contractCategory && signal.contractCategory !== category) {
        return {
            valid: false,
            contractCategory: category,
            signalType: signal.signalType || '',
            prediction: signal.prediction || '',
            reason: `REJECT — CONTRACT TYPE MISMATCH (expected ${category}, got ${signal.contractCategory})`,
        };
    }

    const prediction = (signal.prediction || '').trim().toUpperCase();
    const signalType = signal.signalType;

    switch (category) {
        case 'OVER_UNDER': {
            if (signalType && signalType !== 'over_under') {
                return {
                    valid: false,
                    contractCategory: category,
                    signalType,
                    prediction,
                    reason: `REJECT — CONTRACT TYPE MISMATCH (signalType ${signalType} for OVER_UNDER)`,
                };
            }
            const wrongType = /RISE|FALL|EVEN|ODD|MATCH|DIFFER/.test(prediction);
            const ok = /^(OVER|UNDER)\s+[0-9]$/.test(prediction);
            if (wrongType || !ok) {
                return {
                    valid: false,
                    contractCategory: category,
                    signalType: signalType || 'over_under',
                    prediction,
                    reason: 'REJECT — CONTRACT TYPE MISMATCH (Non-Over/Under signal)',
                };
            }
            break;
        }
        case 'RISE_FALL': {
            if (signalType && signalType !== 'rise_fall') {
                return {
                    valid: false,
                    contractCategory: category,
                    signalType,
                    prediction,
                    reason: `REJECT — CONTRACT TYPE MISMATCH (signalType ${signalType} for RISE_FALL)`,
                };
            }
            const wrongType = /OVER|UNDER|EVEN|ODD|MATCH|DIFFER|[0-9]/.test(prediction);
            const ok = /^(RISE|FALL)$/.test(prediction);
            if (wrongType || !ok) {
                return {
                    valid: false,
                    contractCategory: category,
                    signalType: signalType || 'rise_fall',
                    prediction,
                    reason: 'REJECT — CONTRACT TYPE MISMATCH (Non-Rise/Fall signal)',
                };
            }
            break;
        }
        case 'MATCHES_DIFFERS': {
            if (signalType && signalType !== 'matches_differs') {
                return {
                    valid: false,
                    contractCategory: category,
                    signalType,
                    prediction,
                    reason: `REJECT — CONTRACT TYPE MISMATCH (signalType ${signalType} for MATCHES_DIFFERS)`,
                };
            }
            const wrongType = /RISE|FALL|EVEN|ODD|OVER|UNDER/.test(prediction);
            const ok = /^(MATCHES|DIFFERS)\s+[0-9]$/.test(prediction);
            if (wrongType || !ok) {
                return {
                    valid: false,
                    contractCategory: category,
                    signalType: signalType || 'matches_differs',
                    prediction,
                    reason: 'REJECT — CONTRACT TYPE MISMATCH (Non-Matches/Differs signal)',
                };
            }
            break;
        }
        case 'EVEN_ODD': {
            if (signalType && signalType !== 'even_odd') {
                return {
                    valid: false,
                    contractCategory: category,
                    signalType,
                    prediction,
                    reason: `REJECT — CONTRACT TYPE MISMATCH (signalType ${signalType} for EVEN_ODD)`,
                };
            }
            const wrongType = /RISE|FALL|OVER|UNDER|MATCH|DIFFER|[0-9]/.test(prediction);
            const ok = /^(EVEN|ODD)$/.test(prediction);
            if (wrongType || !ok) {
                return {
                    valid: false,
                    contractCategory: category,
                    signalType: signalType || 'even_odd',
                    prediction,
                    reason: 'REJECT — CONTRACT TYPE MISMATCH (Non-Even/Odd signal)',
                };
            }
            break;
        }
        default:
            return {
                valid: false,
                contractCategory: category,
                signalType,
                prediction,
                reason: `REJECT — INVALID CONTRACT CATEGORY: ${category}`,
            };
    }

    if (signal.confidence < 55) {
        return {
            valid: false,
            contractCategory: category,
            signalType,
            prediction,
            reason: `REJECT — CONFIDENCE BELOW THRESHOLD (${signal.confidence}% < 55%)`,
        };
    }

    return { valid: true, contractCategory: category, signalType, prediction, reason: 'ACCEPTED' };
};

/** Generate the strict-validated signal for a contract category. */
export const getStrictSignalForContract = (
    category: ContractCategory,
    market: string,
    marketName: string,
    digits: number[],
    analysis: MarketAnalysis,
    barrier: number,
    override?: string
): PdtSignal => {
    let signal: PdtSignal;
    switch (category) {
        case 'OVER_UNDER':
            signal = generateOverUnderSignal(market, marketName, digits, analysis, barrier, override as 'over' | 'under' | undefined);
            break;
        case 'RISE_FALL':
            signal = generateRiseFallSignal(market, marketName, digits, analysis, override as 'rise' | 'fall' | undefined);
            break;
        case 'MATCHES_DIFFERS':
            signal = generateMatchesDiffersSignal(
                market,
                marketName,
                digits,
                analysis,
                override === 'matches' ? 'matches' : 'differs',
                Number.isFinite(Number(override)) ? Number(override) : undefined
            );
            break;
        case 'EVEN_ODD':
            signal = generateEvenOddSignal(market, marketName, digits, analysis, override as 'even' | 'odd' | undefined);
            break;
        default:
            throw new Error(`[SignalEngine] Invalid contractCategory: ${category}`);
    }
    const verdict = validateSignalAgainstContract(category, signal);
    if (!verdict.valid) {
        throw new Error(`Strict validation failed for ${category}: ${verdict.reason}`);
    }
    return signal;
};

export const filterActiveSignals = (signals: PdtSignal[]): PdtSignal[] => {
    const now = Date.now();
    return signals.filter(s => s.expiresAt > now && s.status === 'ACTIVE');
};
