/**
 * Copy and configuration for the front page. Kept out of the component so the
 * marketing text can be edited without touching layout code.
 *
 * Every number here is a fact about the shipped app: the market list mirrors
 * `src/pages/hub/markets.ts`, the bot library mirrors the bot catalog, and the
 * platform tiles mirror the hub views. Nothing claims a win rate or a user
 * count — the page sells the workspace, not a promise.
 */

export type BotFamily = 'Digits' | 'Volatility' | 'Trend' | 'Premium';

export interface LandingBot {
    name: string;
    family: BotFamily;
    tag: string;
    desc: string;
}

/** A readable slice of the bot catalog (`src/pages/bots-catalog`). */
export const BOT_LIBRARY: LandingBot[] = [
    { name: 'Maziwa AI', family: 'Premium', tag: 'Over / Under', desc: 'Multi-market over/under scanner with confirmed entries and recovery controls.' },
    { name: 'Digit Nexus', family: 'Digits', tag: 'Digits', desc: 'Trades digit frequency — over/under entries driven by the last 100 ticks.' },
    { name: 'Volt Scalper', family: 'Volatility', tag: 'Scalp', desc: 'Fast volatility scalping sized to the instrument it is running on.' },
    { name: 'Rise Fall Reversal', family: 'Trend', tag: 'Rise / Fall', desc: 'Straddles rise/fall around a digit bias instead of chasing the last tick.' },
    { name: 'Aurora Parity', family: 'Digits', tag: 'Parity', desc: 'Even/odd momentum built from a deep parity sample, not a short streak.' },
    { name: 'Neutrade', family: 'Volatility', tag: 'Balanced', desc: 'Balanced risk engine: fixed stake, hard stop, no martingale side effects.' },
    { name: 'PulseTrader', family: 'Volatility', tag: 'Momentum', desc: 'Tick-velocity entries — it waits for the tape to accelerate before it acts.' },
    { name: 'Apex AI', family: 'Premium', tag: 'Adaptive', desc: 'Adaptive multi-market engine with session limits and a recovery ladder.' },
    { name: 'Extreme Digits', family: 'Digits', tag: 'Extremes', desc: 'Hunts 0-2 and 7-9 outliers and exits on the mean reversion.' },
    { name: 'Trend Match Fusion', family: 'Trend', tag: 'Trend', desc: 'Call-side trend rider with take-profit and stop-loss written into the strategy.' },
    { name: 'Titan Range', family: 'Volatility', tag: 'Range', desc: 'Range-break entries with stakes scaled to realised volatility.' },
    { name: 'DMO Bot', family: 'Premium', tag: 'Signal scoring', desc: 'Signal-scoring digit engine that ranks setups before it risks anything.' },
];

export const BOT_FILTERS: Array<'All' | BotFamily> = ['All', 'Digits', 'Volatility', 'Trend', 'Premium'];

export interface LandingMarket {
    symbol: string;
    name: string;
    note: string;
    /** What the instrument is known for, shown as a short mono label. */
    kind: string;
}

/** Synthetic indices available in the workspace, in reference order. */
export const LANDING_MARKETS: LandingMarket[] = [
    { symbol: 'R_10', name: 'Volatility 10', kind: 'Low volatility', note: 'Slow, tight ranges. The calmest tape to learn structure on.' },
    { symbol: 'R_25', name: 'Volatility 25', kind: 'Steady', note: 'A middle gear: enough movement to read, few enough ticks to think.' },
    { symbol: 'R_50', name: 'Volatility 50', kind: 'Active', note: 'The swing trader\u2019s workhorse. Clean reversals on a fast tape.' },
    { symbol: 'R_75', name: 'Volatility 75', kind: 'Fast', note: 'The scalper\u2019s favourite — constant movement, no session close.' },
    { symbol: 'R_100', name: 'Volatility 100', kind: 'Fastest', note: 'Maximum volatility of the standard set. Size it carefully.' },
    { symbol: 'BOOM1000', name: 'Boom 1000', kind: 'Spike', note: 'Slow drift down, sudden spikes up. Built for spike-aware strategies.' },
    { symbol: 'CRASH500', name: 'Crash 500', kind: 'Spike', note: 'The mirror image: steady climb, sharp drops. Test both directions.' },
    { symbol: 'stpRNG', name: 'Step Index', kind: 'Stepped', note: 'Ticks in fixed steps — the cleanest tape for learning digit behaviour.' },
    { symbol: 'JD100', name: 'Jump 100', kind: 'Jump', note: 'Flat stretches punctuated by jumps. Punishes blind entries.' },
    { symbol: 'RB100', name: 'Range Break 100', kind: 'Range', note: 'Breaks out of a defined band — a range trader\u2019s instrument.' },
];

export interface LandingStep {
    n: string;
    title: string;
    body: string;
    detail: string;
}

export const STEPS: LandingStep[] = [
    {
        n: '01',
        title: 'Sign in with Deriv',
        body: 'One OAuth handshake. Your password never touches this site, and a demo account is created for you.',
        detail: 'Deriv OAuth · demo and real accounts · no card, no deposit to start',
    },
    {
        n: '02',
        title: 'Load a bot or build one',
        body: 'Open a strategy from the catalog, or wire your own with the visual Blockly builder. Test it on demo as often as you like.',
        detail: '23 catalogued bots · Blockly workspace · quick strategies · XML import',
    },
    {
        n: '03',
        title: 'Run it, then watch it',
        body: 'Start the bot on demo, watch the journal and the monitor, and only move to a real account once the behaviour fits your plan.',
        detail: 'Live run panel · journal · bot monitor · stop-loss and take-profit built in',
    },
];

export type TileIcon = 'builder' | 'radar' | 'analysis' | 'monitor' | 'copy' | 'speed';

export interface LandingTile {
    icon: TileIcon;
    title: string;
    body: string;
    meta: string;
    span?: 'wide' | 'tall';
}

export const TILES: LandingTile[] = [
    {
        icon: 'builder',
        title: 'Visual bot builder',
        body: 'Drag blocks, define variables, and generate a strategy without writing a line of code. Import an XML strategy if you already have one.',
        meta: 'Bot Builder',
        span: 'wide',
    },
    {
        icon: 'radar',
        title: 'AI signal scanner',
        body: 'Scores live setups across the volatility universe and ranks them before you commit.',
        meta: 'Signal AI',
    },
    {
        icon: 'analysis',
        title: 'Digit analysis',
        body: 'Frequency, parity and streak statistics on the last N ticks of any market.',
        meta: 'Analysis Tools',
    },
    {
        icon: 'monitor',
        title: 'Monitor and journal',
        body: 'Every run is recorded: entries, exits, stake, and the reason the bot acted.',
        meta: 'Bot Monitor',
        span: 'tall',
    },
    {
        icon: 'copy',
        title: 'Copy trading',
        body: 'Follow a published strategy instead of building your own from scratch.',
        meta: 'Copy Trader',
    },
    {
        icon: 'speed',
        title: 'Speedbot',
        body: 'One-click execution for setups you have already validated.',
        meta: 'Speedbot',
    },
];

export interface CourseStep {
    n: string;
    title: string;
    body: string;
    bullets: string[];
}

export const COURSE: CourseStep[] = [
    {
        n: '01',
        title: 'Getting started on Deriv',
        body: 'Create the account, learn what a demo login is for, and get the workspace open.',
        bullets: ['Deriv OAuth in one click', 'Demo vs real accounts', 'Where the bots live'],
    },
    {
        n: '02',
        title: 'How synthetic indices move',
        body: 'Volatility, Boom/Crash, Step and Jump behave differently. Learn what each one is actually doing.',
        bullets: ['Fixed vs 1-second volatility', 'Spike mechanics', 'Why there is no session close'],
    },
    {
        n: '03',
        title: 'Setting up your workspace',
        body: 'Chart, run panel, monitor, journal — arrange the desk once and keep it.',
        bullets: ['Loading a chart', 'Reading the run panel', 'Saving a workspace'],
    },
    {
        n: '04',
        title: 'Reading digit patterns',
        body: 'The last digit is the only number most digit strategies care about. Learn to read the sample.',
        bullets: ['Frequency over streaks', 'Parity and extremes', 'Sample size discipline'],
    },
    {
        n: '05',
        title: 'Your first bot strategy',
        body: 'Load a catalogued bot, read what it does, then change one variable at a time.',
        bullets: ['Loading from the catalog', 'Stake and duration', 'Importing an XML strategy'],
    },
    {
        n: '06',
        title: 'Risk management that holds',
        body: 'The strategy is not the edge — the sizing is. Set limits before the first run, not after the first loss.',
        bullets: ['Stop-loss and take-profit', 'Session limits', 'When to stop the bot'],
    },
];

export interface FaqEntry {
    q: string;
    a: string;
}

export const FAQ: FaqEntry[] = [
    {
        q: 'Is the workspace free?',
        a: 'Yes. The bot library, the builder, the course and the analysis tools are free to use. You only need a Deriv account to place trades, and a demo account costs nothing.',
    },
    {
        q: 'Do I need to know how to code?',
        a: 'No. Every catalogued bot loads in one click, and the visual builder assembles a strategy from blocks. If you do write XML, you can import it directly.',
    },
    {
        q: 'Can I try everything on demo first?',
        a: 'Yes — that is the intended path. Sign in with Deriv, a virtual account comes with the login, and every bot runs on demo exactly as it would live.',
    },
    {
        q: 'How does the login work?',
        a: 'Through Deriv OAuth. You authenticate on Deriv\u2019s own domain and come back with a scoped token; this site never sees your password and cannot withdraw funds.',
    },
    {
        q: 'Which markets can I trade?',
        a: 'Volatility 10 to 100 (including the 1-second indices), Boom and Crash, Step, Jump, Range Break, plus Bull and Bear market indices — all open 24/7.',
    },
    {
        q: 'Does a bot guarantee profit?',
        a: 'No, and any page that promises one is lying to you. A bot executes your rules without hesitation; it cannot remove the risk of loss. Test on demo and size for the drawdown you can survive.',
    },
];

export interface StatEntry {
    value: number;
    suffix: string;
    label: string;
}

/** Count-up figures on the proof strip — each is verifiable in the app. */
export const STATS: StatEntry[] = [
    { value: 13, suffix: '', label: 'Volatility indices' },
    { value: 23, suffix: '', label: 'Bots in the catalog' },
    { value: 6, suffix: '', label: 'Analysis tools' },
    { value: 24, suffix: '/7', label: 'Markets never close' },
];

export const NAV_LINKS = [
    { label: 'How it works', id: 'lp-how' },
    { label: 'Bot library', id: 'lp-bots' },
    { label: 'Platform', id: 'lp-platform' },
    { label: 'Learn', id: 'lp-learn' },
    { label: 'FAQ', id: 'lp-faq' },
];
