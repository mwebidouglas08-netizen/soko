/** Signal AI analysis engine — exact port of the reference implementation.
 *  Multi-pass market scanning with n-gram/streak/momentum scoring, the bot
 *  parameter → Blockly XML builder, and the terminal log strings. */

export type StrategyId = 'over_under' | 'even_odd' | 'rise_fall';

export interface Profile {
    id: string;
    label: string;
    category: StrategyId;
    contractType: 'DIGITOVER' | 'DIGITUNDER' | 'DIGITEVEN' | 'DIGITODD' | 'CALL' | 'PUT';
    barrier?: number;
}

export interface Market {
    symbol: string;
    displayName: string;
}

export interface Candidate {
    symbol: string;
    marketName: string;
    profile: Profile;
    finalScore: number;
    reasons: string[];
}

export interface ScoreHistory {
    get(key: string): number | undefined;
    set(key: string, value: number): void;
}

export interface BotParams {
    stake: number;
    martingale: number;
    numberOfWins: number;
    stopLoss: number;
    useMartingale: boolean;
}

export const STRATEGIES: Record<StrategyId, string> = {
    over_under: 'Over & Under',
    even_odd: 'Even & Odd',
    rise_fall: 'Rise & Fall',
};

export const PROFILES: Record<StrategyId, Profile[]> = {
    over_under: [
        { id: 'over_4', label: 'Over 4', category: 'over_under', contractType: 'DIGITOVER', barrier: 4 },
        { id: 'under_5', label: 'Under 5', category: 'over_under', contractType: 'DIGITUNDER', barrier: 5 },
    ],
    even_odd: [
        { id: 'even', label: 'Even', category: 'even_odd', contractType: 'DIGITEVEN' },
        { id: 'odd', label: 'Odd', category: 'even_odd', contractType: 'DIGITODD' },
    ],
    rise_fall: [
        { id: 'rise', label: 'Rise', category: 'rise_fall', contractType: 'CALL' },
        { id: 'fall', label: 'Fall', category: 'rise_fall', contractType: 'PUT' },
    ],
};

export const TICK_OPTIONS = [500, 1000, 3000, 5000];
export const MEDALS = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];

/** Log lines streamed into the terminal while the scan runs. */
export const ANALYSIS_LOGS = [
    '[INFO] Connecting to Deriv WebSocket... OK',
    '[INFO] Authenticating session token... OK',
    '[SECURITY] Encrypting channel (TLS 1.3)... OK',
    '[INFO] Extracting digit / momentum patterns...',
    '[INFO] Running streak exhaustion analysis...',
    '[INFO] Building transition matrix...',
    '[INFO] Scoring pattern memory (3-gram)...',
    '[INFO] Computing entropy and stability...',
    '[INFO] Fusing Bayesian confidence...',
    '[SUCCESS] Ranking candidate markets...',
];

/** Random console lines that make up the scrolling matrix background. */
const NOISE_LINES = [
    '[INFO] Connecting to server... [OK]',
    '[INFO] Authenticating API key... [OK]',
    '[WARNING] Unstable connection detected...',
    '[ERROR] Connection timeout. Retrying...',
    '[INFO] Fetching market data... [OK]',
    '[INFO] Analysing Volatility Index...',
    '[SUCCESS] Data stream established...',
    '[SECURITY] Encryption enabled...',
    '[INFO] Predicting next digit...',
    '[WARNING] High market volatility detected...',
    '[INFO] Compiling results...',
    '[INFO] Data transmission complete...',
];

/** One 100-row block of random console noise (the page background text). */
export const makeNoiseBlock = (): string =>
    Array.from({ length: 100 }, () =>
        Array.from({ length: 10 }, () => NOISE_LINES[Math.floor(Math.random() * NOISE_LINES.length)]).join(' ')
    ).join('\n');

export const clamp01 = (value: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, value));

export const toPrice = (value: unknown): number | null => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

/** Decimal places of a quote (2 when the quote has no fraction, capped at 5). */
export const decimalsOf = (price: number): number => {
    const text = price.toString();
    if (!text.includes('.')) return 2;
    const frac = text.split('.')[1]?.length ?? 2;
    return Math.min(Math.max(frac, 0), 5);
};

export const lastDigit = (price: number, decimals: number): number | null => {
    const text = price.toFixed(decimals);
    const d = Number(text[text.length - 1]);
    return Number.isInteger(d) ? d : null;
};

const rate = (values: unknown[]): number => (values.length ? values.filter(Boolean).length / values.length : 0);

const outcomeHit = (value: unknown, profile: Profile): boolean => {
    switch (profile.contractType) {
        case 'DIGITOVER':
            return typeof value === 'number' && value > (profile.barrier ?? 4);
        case 'DIGITUNDER':
            return typeof value === 'number' && value < (profile.barrier ?? 5);
        case 'DIGITEVEN':
            return typeof value === 'number' && value % 2 === 0;
        case 'DIGITODD':
            return typeof value === 'number' && value % 2 === 1;
        case 'CALL':
            return value === 'up';
        case 'PUT':
            return value === 'down';
        default:
            return false;
    }
};

/** Trailing run of hits at the end of the sequence. */
const trailingStreak = (hits: boolean[]): number => {
    let streak = 0;
    for (let i = hits.length - 1; i >= 0 && hits[i]; i -= 1) streak += 1;
    return streak;
};

const streakScore = (streak: number): number =>
    streak >= 8 ? 0.95
        : streak === 7 ? 0.85
            : streak === 6 ? 0.72
                : streak === 5 ? 0.55
                    : streak === 4 ? 0.4
                        : clamp01(0.08 * streak);

/** n-gram win/total counts over the raw sequence (win when position hits). */
const ngrams = (sequence: unknown[], hits: boolean[], size: number): Map<string, { wins: number; total: number }> => {
    const table = new Map<string, { wins: number; total: number }>();
    for (let i = size; i < sequence.length; i += 1) {
        const key = sequence.slice(i - size, i).map(String).join('-');
        const entry = table.get(key) ?? { wins: 0, total: 0 };
        entry.total += 1;
        if (hits[i]) entry.wins += 1;
        table.set(key, entry);
    }
    return table;
};

const bayes = (table: Map<string, { wins: number; total: number }>, key: string, prior = 0.5): number => {
    const entry = table.get(key);
    return entry ? (entry.wins + 1) / (entry.total + 2) : prior;
};

/** Product fusion of independent probabilities (naive Bayes style). */
const fuse = (values: number[]): number => {
    const clamped = values.map(v => clamp01(v, 0.02, 0.98));
    const support = clamped.reduce((acc, v) => acc * v, 1);
    const against = clamped.reduce((acc, v) => acc * (1 - v), 1);
    return support / (support + against);
};

const entropy = (p: number): number =>
    p <= 0 || p >= 1 ? 0 : -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));

/** Push values away from 0.5 so confident inputs read as more confident. */
const contrast = (value: number): number => {
    const t = value - 0.5;
    return clamp01(0.5 + Math.sign(t) * Math.pow(2 * Math.abs(t), 0.55) * 0.5);
};

export interface ScoreResult {
    finalScore: number;
    reasons: string[];
}

/** Score one market/contract family combination. Sequence is 'up'/'down'/false
 *  for rise & fall, or last digits for the digit families. */
export const scoreOutcome = (
    sequence: unknown[],
    profile: Profile,
    key: string,
    history: ScoreHistory
): ScoreResult | null => {
    if (sequence.length < 100) return null;
    const hits = sequence.map(value => outcomeHit(value, profile));
    const streak = trailingStreak(hits);
    const streakPart = streakScore(streak);
    const shortTerm = bayes(ngrams(sequence, hits, 1), String(sequence[sequence.length - 1]));
    const pattern =
        sequence.length >= 50 ? bayes(ngrams(sequence, hits, 3), sequence.slice(-3).map(String).join('-')) : 0.5;
    const momentum = rate(hits.slice(-20));
    const longRun = clamp01(0.5 + (0.5 - rate(hits)));
    const fused = fuse([streakPart, shortTerm, momentum, longRun]);
    const base =
        0.25 * streakPart + 0.2 * shortTerm + 0.15 * pattern + 0.15 * momentum + 0.1 * longRun + 0.05 * fused;
    const stability = 1 - entropy(rate(hits.slice(-50)));
    const previous = history.get(key);
    const carry = previous !== undefined ? 1 - clamp01(2 * Math.abs(base - previous)) : null;
    history.set(key, base);
    const boost = carry !== null ? (0.6 * stability + 0.4 * carry) * 0.1 : 0.1 * stability;
    const finalScore = Math.round(100 * contrast(clamp01(base + boost)));

    const reasons: string[] = [
        `Last 10 ${profile.category === 'rise_fall' ? 'ticks' : 'digits'}: ${sequence
            .slice(-10)
            .map(value => (value === 'up' ? '\u2191' : value === 'down' ? '\u2193' : value))
            .join(', ')}`,
    ];
    if (streak >= 4) reasons.push(`${profile.label} streak exhausted (${streak} in a row)`);
    if (longRun >= 0.6) reasons.push(`Long-term distribution favors ${profile.label}`);
    if (momentum >= 0.55) reasons.push('Momentum agrees');
    else if (momentum <= 0.45) reasons.push('Momentum against (contrarian signal)');
    reasons.push(`Historical probability ${(100 * shortTerm).toFixed(1)}%`);
    if (carry !== null) {
        reasons.push(carry >= 0.7 ? 'Confidence stable across scans' : 'Confidence unstable — treat with caution');
    }
    return { finalScore, reasons };
};

export const sanitizeParams = (value: Partial<BotParams>): BotParams => ({
    stake: Math.max(0.35, Number.isFinite(value.stake as number) ? (value.stake as number) : 0.5),
    martingale: Math.max(1, Number.isFinite(value.martingale as number) ? (value.martingale as number) : 2),
    numberOfWins: Math.max(1, Math.floor(Number.isFinite(value.numberOfWins as number) ? (value.numberOfWins as number) : 4)),
    stopLoss: Math.max(1, Math.floor(Number.isFinite(value.stopLoss as number) ? (value.stopLoss as number) : 50)),
    useMartingale: !!value.useMartingale,
});

const setField = (doc: Document, name: string, text: string): void => {
    doc.querySelectorAll(`field[name="${name}"]`).forEach(node => {
        node.textContent = text;
    });
};

/** Set a Blockly variable's numeric value inside the strategy XML. */
const setVariableNumber = (doc: Document, variable: string, value: number): void => {
    for (const block of Array.from(doc.querySelectorAll('block[type="variables_set"]'))) {
        const field = Array.from(block.children).find(
            child => child.tagName === 'field' && child.getAttribute('name') === 'VAR'
        );
        if (!field || (field.textContent || '').trim() !== variable) continue;
        const num = block.querySelector('value[name="VALUE"] field[name="NUM"]');
        if (num) num.textContent = String(value);
    }
};

/** Set a Blockly variable's boolean value inside the strategy XML. */
const setVariableBoolean = (doc: Document, variable: string, value: boolean): void => {
    for (const block of Array.from(doc.querySelectorAll('block[type="variables_set"]'))) {
        const field = Array.from(block.children).find(
            child => child.tagName === 'field' && child.getAttribute('name') === 'VAR'
        );
        if (!field || (field.textContent || '').trim() !== variable) continue;
        const bool = block.querySelector('value[name="VALUE"] field[name="BOOL"]');
        if (bool) bool.textContent = value ? 'TRUE' : 'FALSE';
    }
};

/** Build the signal bot strategy XML for the winning market/contract. */
export const buildBotXml = (best: Candidate, params: BotParams, template: string): string => {
    const doc = new DOMParser().parseFromString(template, 'text/xml');
    setField(doc, 'MARKET_LIST', 'synthetic_index');
    setField(doc, 'SUBMARKET_LIST', 'random_index');
    setField(doc, 'SYMBOL_LIST', best.symbol);
    setField(doc, 'TRADETYPECAT_LIST', best.profile.category === 'rise_fall' ? 'callput' : 'digits');
    setField(
        doc,
        'TRADETYPE_LIST',
        best.profile.category === 'rise_fall'
            ? 'callput'
            : best.profile.category === 'even_odd'
                ? 'evenodd'
                : 'overunder'
    );
    setField(doc, 'TYPE_LIST', 'both');
    setField(doc, 'PURCHASE_LIST', best.profile.contractType);
    if (typeof best.profile.barrier === 'number') {
        const prediction = doc.querySelector('value[name="PREDICTION"] field[name="NUM"]');
        if (prediction) prediction.textContent = String(best.profile.barrier);
    }
    setVariableNumber(doc, 'Stake', params.stake);
    setVariableNumber(doc, 'Martangle', params.martingale);
    setVariableNumber(doc, 'Number of Wins', params.numberOfWins);
    setVariableNumber(doc, 'Stop Loss', params.stopLoss);
    setVariableBoolean(doc, 'Use Martingale', params.useMartingale);
    return new XMLSerializer().serializeToString(doc);
};

let sharedAudioContext: AudioContext | null = null;

/** Short rising chime played when a scan finds at least one candidate. */
const beep = (frequency: number, delay: number, duration: number, peak: number): void => {
    const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctx) return;
    if (!sharedAudioContext) sharedAudioContext = new Ctx();
    const ctx = sharedAudioContext;
    if (ctx.state === 'suspended') ctx.resume();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    const start = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
};

export const playScanChime = (): void => {
    try {
        beep(523.25, 0, 0.14, 0.12);
        beep(659.25, 0.12, 0.14, 0.12);
        beep(783.99, 0.24, 0.22, 0.14);
    } catch {
        /* audio unavailable — silent */
    }
};
