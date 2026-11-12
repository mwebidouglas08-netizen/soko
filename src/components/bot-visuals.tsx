/**
 * Bot visual themes — attractive icons + gradient palettes for free-bot
 * cards. Matches the reference app (binarytool.site) design: cyan #00c4ff
 * and amber #ffc107 accent colors on a dark canvas.
 */
export type BotTheme = {
    tag: string;
    kind: 'digits' | 'scalp' | 'premium' | 'balanced' | 'straddle' | 'parity' | 'extremes' | 'momentum' | 'range' | 'flow' | 'vertex' | 'quantum';
    color: string;
    color2: string;
    glow: string;
    premium?: boolean;
};

const GRAD = (c1: string, c2: string) => `linear-gradient(135deg, ${c1}, ${c2})`;

const CYAN = '#00c4ff';
const AMBER = '#ffc107';
const GREEN = '#27e49c';

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
    vertex: { tag: 'QUICK', kind: 'vertex', color: CYAN, color2: '#2563eb', glow: CYAN },
    quantum: { tag: 'QUICK', kind: 'quantum', color: AMBER, color2: '#f59e0b', glow: AMBER },
    // bots-catalog
    'dmo-bot': { tag: 'PREMIUM', kind: 'balanced', color: AMBER, color2: '#d97706', glow: AMBER },
    'dollar-printer-ai': { tag: 'PREMIUM', kind: 'balanced', color: GREEN, color2: '#059669', glow: GREEN },
    'digit-nexus-ai': { tag: 'DIGITS', kind: 'digits', color: CYAN, color2: '#2563eb', glow: CYAN },
    'volt-scalper': { tag: 'SCALP', kind: 'scalp', color: CYAN, color2: '#2563eb', glow: CYAN },
    'apex-ai': { tag: 'PREMIUM', kind: 'premium', color: AMBER, color2: '#f59e0b', glow: AMBER, premium: true },
    'neutrade-ai': { tag: 'BALANCED', kind: 'balanced', color: CYAN, color2: '#2563eb', glow: CYAN },
    'straddle-edge': { tag: 'STRADDLE', kind: 'straddle', color: '#a78bfa', color2: '#7c3aed', glow: '#a78bfa' },
    'aurora-parity': { tag: 'PARITY', kind: 'parity', color: CYAN, color2: '#2563eb', glow: CYAN, premium: true },
    'obsidian-parity': { tag: 'PARITY', kind: 'parity', color: '#c084fc', color2: '#a855f7', glow: '#c084fc', premium: true },
    'prism-extremes': { tag: 'EXTREMES', kind: 'extremes', color: '#fb7185', color2: '#e11d48', glow: '#fb7185', premium: true },
    'pulsetrader-ai': { tag: 'MOMENTUM', kind: 'momentum', color: GREEN, color2: '#10b981', glow: GREEN },
    'titan-range': { tag: 'RANGE', kind: 'range', color: AMBER, color2: '#d97706', glow: AMBER, premium: true },
    'zenith-flow': { tag: 'FLOW', kind: 'flow', color: CYAN, color2: '#0ea5e9', glow: CYAN, premium: true },
};

export const botVisual = (id: string): BotTheme =>
    BOT_VISUALS[id] ?? { tag: 'BOT', kind: 'balanced', color: CYAN, color2: '#2563eb', glow: CYAN };

export const botIcon = (kind: BotTheme['kind']): string => ICON[kind] ?? ICON.balanced;
export const botGradient = (theme: BotTheme): string => GRAD(theme.color, theme.color2);
