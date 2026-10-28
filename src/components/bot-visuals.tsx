/**
 * Bot visual themes — attractive icons + gradient palettes for free-bot
 * cards. Every bot gets a distinct visual identity so the catalog is
 * eye-catching and scannable at a glance.
 */
export type BotTheme = {
    /** Short tag shown on the card (e.g. 'DIGITS', 'SCALP'). */
    tag: string;
    /** Bot category used for the icon. */
    kind: 'digits' | 'scalp' | 'premium' | 'balanced' | 'straddle' | 'parity' | 'extremes' | 'momentum' | 'range' | 'flow' | 'vertex' | 'quantum';
    /** Primary gradient color. */
    color: string;
    /** Secondary gradient color. */
    color2: string;
    /** Glow color for shadows/highlights. */
    glow: string;
    /** Whether this is a premium/paid bot. */
    premium?: boolean;
};

const GRAD = (c1: string, c2: string) => `linear-gradient(135deg, ${c1}, ${c2})`;

/** Inline SVG icons for each bot kind — no external image dependencies. */
const ICON: Record<BotTheme['kind'], string> = {
    digits: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='3' width='18' height='18' rx='2'/><path d='M12 9l3 3 5-5'/><circle cx='9' cy='9' r='1' fill='currentColor'/></svg>`,
    scalp: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M12 2l4 20l-8-10z'/><path d='M12 8l4 4l-4 4'/></svg>`,
    premium: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='8' r='7'/><polyline points='8.21 13.89 7 23 12 15 17 23 15.79 13.89'/></svg>`,
    balanced: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M3 12h18'/><path d='M7 6v12l5-3-5-3z'/></svg>`,
    straddle: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M5 12h14'/><path d='M5 19l7-7 7 7'/></svg>`,
    parity: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='10'/><path d='M12 2v20M2 12h20'/></svg>`,
    extremes: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M13 2L3 14h9l-1 8 10-12h-9l1-8z'/></svg>`,
    momentum: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M5 12h14M12 5l7 7-7 7'/></svg>`,
    range: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='3' width='18' height='18' rx='2'/><path d='M3 12h18M12 3v18'/></svg>`,
    flow: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M2 12h20'/><path d='M12 2v20'/></svg>`,
    vertex: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polygon points='12 2 22 12 12 22 2 12'/><path d='M12 12l5 5M12 12l-5-5'/></svg>`,
    quantum: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='10'/><path d='M12 2v6M12 16v6M4.93 4.93l4.24 4.24M17.77 17.77l4.24 4.24M2 12h6M16 12h6'/></svg>`,
};

export const BOT_VISUALS: Record<string, BotTheme> = {
    // trading-bots (quick bots)
    vertex: { tag: 'QUICK', kind: 'vertex', color: '#22e7ff', color2: '#2563eb', glow: '#22e7ff' },
    quantum: { tag: 'QUICK', kind: 'quantum', color: '#ffd700', color2: '#f59e0b', glow: '#ffd700' },
    // bots-catalog
    'digit-nexus-ai': { tag: 'DIGITS', kind: 'digits', color: '#22e7ff', color2: '#2563eb', glow: '#22e7ff' },
    'volt-scalper': { tag: 'SCALP', kind: 'scalp', color: '#7effd8', color2: '#10b981', glow: '#7effd8' },
    'apex-ai': { tag: 'PREMIUM', kind: 'premium', color: '#ffd700', color2: '#f59e0b', glow: '#ffd700', premium: true },
    'neutrade-ai': { tag: 'BALANCED', kind: 'balanced', color: '#60a5fa', color2: '#3b82f6', glow: '#60a5fa' },
    'straddle-edge': { tag: 'STRADDLE', kind: 'straddle', color: '#a78bfa', color2: '#7c3aed', glow: '#a78bfa' },
    'aurora-parity': { tag: 'PARITY', kind: 'parity', color: '#f093fb', color2: '#ec4899', glow: '#f093fb', premium: true },
    'obsidian-parity': { tag: 'PARITY', kind: 'parity', color: '#c084fc', color2: '#a855f7', glow: '#c084fc', premium: true },
    'prism-extremes': { tag: 'EXTREMES', kind: 'extremes', color: '#fb7185', color2: '#e11d48', glow: '#fb7185', premium: true },
    'pulsetrader-ai': { tag: 'MOMENTUM', kind: 'momentum', color: '#34d399', color2: '#10b981', glow: '#34d399' },
    'titan-range': { tag: 'RANGE', kind: 'range', color: '#fbbf24', color2: '#d97706', glow: '#fbbf24', premium: true },
    'zenith-flow': { tag: 'FLOW', kind: 'flow', color: '#38bdf8', color2: '#0ea5e9', glow: '#38bdf8', premium: true },
};

/** Resolve a bot's visual theme by its file/preset id. */
export const botVisual = (id: string): BotTheme =>
    BOT_VISUALS[id] ?? { tag: 'BOT', kind: 'balanced', color: '#60a5fa', color2: '#3b82f6', glow: '#60a5fa' };

export const botIcon = (kind: BotTheme['kind']): string => ICON[kind] ?? ICON.balanced;
export const botGradient = (theme: BotTheme): string => GRAD(theme.color, theme.color2);
