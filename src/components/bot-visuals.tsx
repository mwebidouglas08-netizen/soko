/**
 * Bot visual themes — attractive icons + gradient palettes for free-bot
 * cards. Matches the reference app (dollarprinter.com) design: indigo #6366f1
 * and cyan #22d3ee gradient accents on a dark canvas.
 */
export type BotTheme = {
    tag: string;
    kind: 'digits' | 'scalp' | 'premium' | 'balanced' | 'risefall' | 'parity' | 'extremes' | 'momentum' | 'range' | 'flow' | 'vertex' | 'quantum' | 'overunder' | 'callput';
    color: string;
    color2: string;
    glow: string;
    premium?: boolean;
};

const GRAD = (c1: string, c2: string) => `linear-gradient(135deg, ${c1}, ${c2})`;

const INDIGO = '#6366f1';
const CYAN = '#22d3ee';

const ICON: Record<BotTheme['kind'], string> = {
    digits: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='3' width='18' height='18' rx='2'/><path d='M12 9l3 3 5-5'/><circle cx='9' cy='9' r='1' fill='currentColor'/></svg>`,
    scalp: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M12 2l4 20l-8-10z'/><path d='M12 8l4 4l-4 4'/></svg>`,
    premium: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='8' r='7'/><polyline points='8.21 13.89 7 23 12 15 17 23 15.79 13.89'/></svg>`,
    balanced: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M3 12h18'/><path d='M7 6v12l5-3-5-3z'/></svg>`,
    risefall: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M5 12h14M12 5l7 7-7 7'/></svg>`,
    parity: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='10'/><path d='M12 2v20M2 12h20'/></svg>`,
    extremes: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M13 2L3 14h9l-1 8 10-12h-9l1-8z'/></svg>`,
    momentum: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M5 12h14M12 5l7 7-7 7'/></svg>`,
    range: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='3' width='18' height='18' rx='2'/><path d='M3 12h18M12 3v18'/></svg>`,
    flow: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M2 12h20'/><path d='M12 2v20'/></svg>`,
    overunder: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M5 12h14M12 19l7-7M12 5l7 7'/></svg>`,
    callput: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M12 2l7 7-7 7M12 22l-7-7 7-7'/></svg>`,
    vertex: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polygon points='12 2 22 12 12 22 2 12'/><path d='M12 12l5 5M12 12l-5-5'/></svg>`,
    quantum: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='10'/><path d='M12 2v6M12 16v6M4.93 4.93l4.24 4.24M17.77 17.77l4.24 4.24M2 12h6M16 12h6'/></svg>`,
};

export const BOT_VISUALS: Record<string, BotTheme> = {
    // trading-bots (quick bots)
    vertex: { tag: 'QUICK', kind: 'vertex', color: INDIGO, color2: CYAN, glow: INDIGO },
    quantum: { tag: 'QUICK', kind: 'quantum', color: INDIGO, color2: CYAN, glow: INDIGO },
    // bots-catalog
    'dmo-bot': { tag: 'PREMIUM', kind: 'balanced', color: INDIGO, color2: CYAN, glow: INDIGO },
    'dollar-printer-ai': { tag: 'PREMIUM', kind: 'balanced', color: INDIGO, color2: CYAN, glow: INDIGO },
    'digit-nexus-ai': { tag: 'DIGITS', kind: 'digits', color: INDIGO, color2: CYAN, glow: INDIGO },
    'volt-scalper': { tag: 'SCALP', kind: 'scalp', color: INDIGO, color2: CYAN, glow: INDIGO },
    'apex-ai': { tag: 'PREMIUM', kind: 'premium', color: INDIGO, color2: CYAN, glow: INDIGO, premium: true },
    'neutrade-ai': { tag: 'BALANCED', kind: 'balanced', color: INDIGO, color2: CYAN, glow: INDIGO },
    'straddle-edge': { tag: 'RISE/FALL', kind: 'risefall', color: INDIGO, color2: CYAN, glow: INDIGO },
    'parity-pulse-ai': { tag: 'PARITY', kind: 'parity', color: INDIGO, color2: CYAN, glow: INDIGO, premium: true },
    'obsidian-parity': { tag: 'PARITY', kind: 'parity', color: INDIGO, color2: CYAN, glow: INDIGO, premium: true },
    'prism-extremes': { tag: 'EXTREMES', kind: 'extremes', color: INDIGO, color2: CYAN, glow: INDIGO, premium: true },
    'pulsetrader-ai': { tag: 'MOMENTUM', kind: 'momentum', color: INDIGO, color2: CYAN, glow: INDIGO },
    'titan-range': { tag: 'RANGE', kind: 'range', color: INDIGO, color2: CYAN, glow: INDIGO, premium: true },
    'zenith-flow': { tag: 'FLOW', kind: 'flow', color: INDIGO, color2: CYAN, glow: INDIGO, premium: true },
    'over-under-edge-ai': { tag: 'OVER/UNDER', kind: 'overunder', color: INDIGO, color2: CYAN, glow: INDIGO },
    'trend-match-fusion-ai': { tag: 'TREND', kind: 'callput', color: INDIGO, color2: CYAN, glow: INDIGO, premium: true },
    'bt-frequency-hunter': { tag: 'BT', kind: 'premium', color: INDIGO, color2: CYAN, glow: INDIGO, premium: true },
    'bt-pattern-matrix': { tag: 'BT', kind: 'premium', color: INDIGO, color2: CYAN, glow: INDIGO, premium: true },
    'bt-probability-shield': { tag: 'BT', kind: 'premium', color: INDIGO, color2: CYAN, glow: INDIGO, premium: true },
    'bt-adaptive-market-rotator': { tag: 'BT', kind: 'premium', color: INDIGO, color2: CYAN, glow: INDIGO, premium: true },
    'bt-dual-momentum-fusion': { tag: 'BT', kind: 'premium', color: INDIGO, color2: CYAN, glow: INDIGO, premium: true },
    'bt-ultimate-fusion-ai': { tag: 'BT', kind: 'premium', color: INDIGO, color2: CYAN, glow: INDIGO, premium: true },
    'bt-trend-runner': { tag: 'BT', kind: 'premium', color: INDIGO, color2: CYAN, glow: INDIGO, premium: true },
};

export const botVisual = (id: string): BotTheme =>
    BOT_VISUALS[id] ?? { tag: 'BOT', kind: 'balanced', color: INDIGO, color2: CYAN, glow: INDIGO };

export const botIcon = (kind: BotTheme['kind']): string => ICON[kind] ?? ICON.balanced;
export const botGradient = (theme: BotTheme): string => GRAD(theme.color, theme.color2);
