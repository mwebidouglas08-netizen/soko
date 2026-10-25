/**
 * Analysis-tool core — a faithful re-implementation of the reference scanner
 * (prodigittool.vercel.app) computed over REAL Deriv tick data.
 *
 * The reference runs a strict 15-tick window per index and shows, for each
 * contract family, the observed split plus an entry recommendation once the
 * window is full. Nothing here predicts the next tick: every number is the
 * empirical frequency of the last 15 ticks.
 */

export const SCAN_WINDOW = 15;
export const FEED_LEN = 14;

export type CategoryId = 'even_odd' | 'over_under' | 'match_diff' | 'rise_fall';
export type MarketGroup = 'all' | '1s' | 'standard';

export interface MarketDef {
    symbol: string;
    name: string;
    code: string;
    group: '1s' | 'standard';
}

/** The reference's 17 indexes: 12 one-second + 5 standard volatility. */
export const MARKETS: MarketDef[] = [
    { symbol: '1HZ10V', name: 'Volatility 10 (1s)', code: '1HZ10V', group: '1s' },
    { symbol: '1HZ15V', name: 'Volatility 15 (1s)', code: '1HZ15V', group: '1s' },
    { symbol: '1HZ25V', name: 'Volatility 25 (1s)', code: '1HZ25V', group: '1s' },
    { symbol: '1HZ30V', name: 'Volatility 30 (1s)', code: '1HZ30V', group: '1s' },
    { symbol: '1HZ50V', name: 'Volatility 50 (1s)', code: '1HZ50V', group: '1s' },
    { symbol: '1HZ75V', name: 'Volatility 75 (1s)', code: '1HZ75V', group: '1s' },
    { symbol: '1HZ90V', name: 'Volatility 90 (1s)', code: '1HZ90V', group: '1s' },
    { symbol: '1HZ100V', name: 'Volatility 100 (1s)', code: '1HZ100V', group: '1s' },
    { symbol: '1HZ150V', name: 'Volatility 150 (1s)', code: '1HZ150V', group: '1s' },
    { symbol: '1HZ200V', name: 'Volatility 200 (1s)', code: '1HZ200V', group: '1s' },
    { symbol: '1HZ250V', name: 'Volatility 250 (1s)', code: '1HZ250V', group: '1s' },
    { symbol: '1HZ300V', name: 'Volatility 300 (1s)', code: '1HZ300V', group: '1s' },
    { symbol: 'R_10', name: 'Volatility 10', code: 'R_10', group: 'standard' },
    { symbol: 'R_25', name: 'Volatility 25', code: 'R_25', group: 'standard' },
    { symbol: 'R_50', name: 'Volatility 50', code: 'R_50', group: 'standard' },
    { symbol: 'R_75', name: 'Volatility 75', code: 'R_75', group: 'standard' },
    { symbol: 'R_100', name: 'Volatility 100', code: 'R_100', group: 'standard' },
];

export const CATEGORY_META: {
    id: CategoryId;
    tag: string;
    title: string;
    blurb: string;
    accent: string;
    engine: string;
}[] = [
    {
        id: 'even_odd',
        tag: 'EVEN / ODD',
        title: 'Even/Odd Signals',
        blurb: 'Analyze the latest market digits to identify even and odd patterns using real-time tick data.',
        accent: '#22e7ff',
        engine: 'Even/Odd Parity Engine',
    },
    {
        id: 'over_under',
        tag: 'OVER / UNDER',
        title: 'Over/Under Signals',
        blurb: 'Analyze last-digit thresholds and observed digit distributions for available Over and Under contracts.',
        accent: '#7effd8',
        engine: 'Barrier Threshold Engine',
    },
    {
        id: 'match_diff',
        tag: 'DIGIT MATCH',
        title: 'Matches/Differs Signals',
        blurb: 'Explore target-digit analysis and compare matching versus non-matching digits from live market ticks.',
        accent: '#a78bfa',
        engine: 'Digit Frequency Engine',
    },
    {
        id: 'rise_fall',
        tag: 'RISE / FALL',
        title: 'Rise/Fall Signals',
        blurb: 'Trade consecutive tick momentum and tick velocity swings using real-time price action.',
        accent: '#fbbf24',
        engine: 'Directional Velocity Engine',
    },
];

/** Barriers the reference exposes, in the x.5 form Deriv quotes them. */
export const BARRIERS = [2.5, 3.5, 4.5, 5.5, 6.5, 7.5];

/** "Over 4 / Under 5" — the integer digits a half-barrier splits. */
export const barrierLabel = (barrierHalf: number): string =>
    `Over ${Math.floor(barrierHalf)} / Under ${Math.ceil(barrierHalf)}`;

export interface DigitShare {
    digit: number;
    pct: number;
}

export interface WindowStats {
    /** Ticks in the strict window. */
    n: number;
    /** True once the strict window is full — the reference's SCANNING gate. */
    ready: boolean;
    even: number;
    odd: number;
    over: number;
    under: number;
    match: number;
    differ: number;
    rise: number;
    fall: number;
    counts: number[];
    hotDigit: number;
    coldDigit: number;
    topDigits: DigitShare[];
    entryDigit: number;
    evenOddPick: 'EVEN' | 'ODD';
    overUnderPick: 'OVER' | 'UNDER';
    matchPick: 'MATCH' | 'DIFFER';
    riseFallPick: 'RISE' | 'FALL';
}

/**
 * Measure the strict 15-tick window.
 *
 * `barrierHalf` is the Deriv half-barrier (e.g. 4.5): OVER wins when the last
 * digit is greater than the floor (5-9) and UNDER when it is below the ceiling
 * (0-4), so the two legs partition all ten digits — exactly the reference's
 * "Current Barrier: 4.5 (Over 4 / Under 5)".
 */
export const computeWindow = (allDigits: number[], allQuotes: number[], barrierHalf: number): WindowStats => {
    const digits = allDigits.slice(-SCAN_WINDOW);
    // One extra quote so tick-to-tick moves cover the same span as the digits.
    const quotes = allQuotes.slice(-(SCAN_WINDOW + 1));
    const n = digits.length;
    const ready = n >= SCAN_WINDOW;
    const safe = n || 1;

    const evenCount = digits.filter(d => d % 2 === 0).length;
    const oddCount = n - evenCount;

    const overThreshold = Math.floor(barrierHalf);
    const underThreshold = Math.ceil(barrierHalf);
    const overCount = digits.filter(d => d > overThreshold).length;
    const underCount = digits.filter(d => d < underThreshold).length;

    const counts = new Array(10).fill(0);
    for (const d of digits) if (d >= 0 && d <= 9) counts[d] += 1;

    const topDigits: DigitShare[] = counts
        .map((c, d) => ({ digit: d, pct: c / safe }))
        .sort((a, b) => b.pct - a.pct || a.digit - b.digit)
        .slice(0, 3);
    const entryDigit = topDigits[0].digit;
    const matchCount = counts[entryDigit];
    const differCount = n - matchCount;

    let hotDigit = 0;
    let coldDigit = 0;
    counts.forEach((c, d) => {
        if (c > counts[hotDigit]) hotDigit = d;
        if (c < counts[coldDigit]) coldDigit = d;
    });

    let riseCount = 0;
    let moves = 0;
    for (let i = 1; i < quotes.length; i += 1) {
        moves += 1;
        if (quotes[i] > quotes[i - 1]) riseCount += 1;
    }
    const fallCount = moves - riseCount;

    const even = evenCount / safe;
    const odd = oddCount / safe;
    const over = overCount / safe;
    const under = underCount / safe;
    const match = matchCount / safe;
    const differ = differCount / safe;
    const rise = moves ? riseCount / moves : 0;
    const fall = moves ? fallCount / moves : 0;

    return {
        n,
        ready,
        even,
        odd,
        over,
        under,
        match,
        differ,
        rise,
        fall,
        counts,
        hotDigit,
        coldDigit,
        topDigits,
        entryDigit,
        evenOddPick: even >= odd ? 'EVEN' : 'ODD',
        overUnderPick: over >= under ? 'OVER' : 'UNDER',
        matchPick: match >= differ ? 'MATCH' : 'DIFFER',
        riseFallPick: rise >= fall ? 'RISE' : 'FALL',
    };
};

/** Leading-side confidence for a family, as a 0..1 fraction of the window. */
export const leadConfidence = (id: CategoryId, s: WindowStats): number => {
    switch (id) {
        case 'even_odd':
            return Math.max(s.even, s.odd);
        case 'over_under':
            return Math.max(s.over, s.under);
        case 'match_diff':
            return s.topDigits[0]?.pct ?? 0;
        case 'rise_fall':
            return Math.max(s.rise, s.fall);
    }
};

/** Tick-to-tick direction, used for the reference's ▲/▼ digit history. */
export const directions = (quotes: number[], len: number): ('up' | 'down')[] => {
    const out: ('up' | 'down')[] = [];
    const start = Math.max(1, quotes.length - len);
    for (let i = start; i < quotes.length; i += 1) out.push(quotes[i] >= quotes[i - 1] ? 'up' : 'down');
    return out;
};
