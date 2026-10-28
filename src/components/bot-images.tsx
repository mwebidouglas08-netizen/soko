/**
 * Bot images — beautiful SVG illustrations for every free-bot card.
 * Each bot gets a distinct, eye-catching visual that reflects its strategy.
 */
export type BotImageId =
    | 'vertex' | 'quantum'
    | 'digit-nexus-ai' | 'volt-scalper' | 'apex-ai' | 'neutrade-ai' | 'straddle-edge'
    | 'aurora-parity' | 'obsidian-parity' | 'prism-extremes' | 'pulsetrader-ai'
    | 'titan-range' | 'zenith-flow';

const SVG = (id: BotImageId): string => {
    switch (id) {
        case 'vertex':
            return `<svg viewBox='0 0 200 160' xmlns='http://www.w3.org/2000/svg'>
                <defs>
                    <linearGradient id='vgrad' x1='0%' y1='0%' x2='100%' y2='100%'>
                        <stop offset='0%' style='stop-color:#22e7ff;stop-opacity:1' />
                        <stop offset='100%' style='stop-color:#2563eb;stop-opacity:1' />
                    </linearGradient>
                    <filter id='vglow' x='-20%' y='-20%' width='140%' height='140%'>
                        <feGaussianBlur stdDeviation='8' result='blur' />
                        <feComposite in='SourceGraphic' in2='blur' operator='over' />
                    </filter>
                </defs>
                <rect width='200' height='160' fill='#0b111e' rx='16' />
                <circle cx='100' cy='80' r='45' fill='url(#vgrad)' opacity='0.15' />
                <polygon points='100,35 135,80 100,125 65,80' fill='url(#vgrad)' filter='url(#vglow)' />
                <circle cx='100' cy='80' r='12' fill='#fff' />
                <text x='100' y='145' font-family='monospace' font-size='14' font-weight='bold' fill='#22e7ff' text-anchor='middle'>VERTEX</text>
                <path d='M80,50 Q100,30 120,50 M80,110 Q100,130 120,110' stroke='#22e7ff' stroke-width='2' fill='none' opacity='0.4' />
            </svg>`;
        case 'quantum':
            return `<svg viewBox='0 0 200 160' xmlns='http://www.w3.org/2000/svg'>
                <defs>
                    <linearGradient id='qgrad' x1='0%' y1='0%' x2='100%' y2='100%'>
                        <stop offset='0%' style='stop-color:#ffd700;stop-opacity:1' />
                        <stop offset='100%' style='stop-color:#f59e0b;stop-opacity:1' />
                    </linearGradient>
                    <filter id='qglow' x='-20%' y='-20%' width='140%' height='140%'>
                        <feGaussianBlur stdDeviation='8' result='blur' />
                        <feComposite in='SourceGraphic' in2='blur' operator='over' />
                    </filter>
                </defs>
                <rect width='200' height='160' fill='#0b111e' rx='16' />
                <circle cx='100' cy='80' r='45' fill='#1a1a2e' opacity='0.8' />
                <circle cx='100' cy='80' r='35' fill='none' stroke='url(#qgrad)' stroke-width='3' filter='url(#qglow)' />
                <circle cx='100' cy='80' r='20' fill='none' stroke='#ffd700' stroke-width='2' stroke-dasharray='40,20' />
                <circle cx='100' cy='80' r='8' fill='#ffd700' />
                <text x='100' y='145' font-family='monospace' font-size='14' font-weight='bold' fill='#ffd700' text-anchor='middle'>QUANTUM</text>
                <path d='M65,55 L100,35 L135,55 L100,75 Z' fill='none' stroke='#ffd700' stroke-width='2' opacity='0.5' />
            </svg>`;
        case 'digit-nexus-ai':
            return `<svg viewBox='0 0 200 160' xmlns='http://www.w3.org/2000/svg'>
                <defs>
                    <linearGradient id='dgrad' x1='0%' y1='0%' x2='100%' y2='100%'>
                        <stop offset='0%' style='stop-color:#22e7ff;stop-opacity:1' />
                        <stop offset='100%' style='stop-color:#2563eb;stop-opacity:1' />
                    </linearGradient>
                </defs>
                <rect width='200' height='160' fill='#0b111e' rx='16' />
                <text x='100' y='75' font-family='monospace' font-size='48' font-weight='bold' fill='#22e7ff' text-anchor='middle' opacity='0.9'>7</text>
                <circle cx='75' cy='50' r='8' fill='#22e7ff' opacity='0.6' />
                <circle cx='125' cy='110' r='6' fill='#2563eb' opacity='0.6' />
                <circle cx='140' cy='60' r='5' fill='#22e7ff' opacity='0.5' />
                <path d='M40,140 Q60,100 100,120 Q140,140 160,100' stroke='#22e7ff' stroke-width='2' fill='none' opacity='0.3' />
                <text x='100' y='145' font-family='monospace' font-size='14' font-weight='bold' fill='#22e7ff' text-anchor='middle'>NEXUS AI</text>
            </svg>`;
        case 'volt-scalper':
            return `<svg viewBox='0 0 200 160' xmlns='http://www.w3.org/2000/svg'>
                <defs>
                    <linearGradient id='vgrad' x1='0%' y1='0%' x2='100%' y2='100%'>
                        <stop offset='0%' style='stop-color:#7effd8;stop-opacity:1' />
                        <stop offset='100%' style='stop-color:#10b981;stop-opacity:1' />
                    </linearGradient>
                </defs>
                <rect width='200' height='160' fill='#0b111e' rx='16' />
                <path d='M30,140 L60,40 L90,120 L120,30 L150,140' fill='none' stroke='url(#vgrad)' stroke-width='4' stroke-linecap='round' stroke-linejoin='round' />
                <circle cx='60' cy='40' r='6' fill='#7effd8' />
                <circle cx='120' cy='30' r='6' fill='#10b981' />
                <circle cx='100' cy='80' r='25' fill='none' stroke='#7effd8' stroke-width='2' opacity='0.3' />
                <text x='100' y='145' font-family='monospace' font-size='14' font-weight='bold' fill='#7effd8' text-anchor='middle'>VOLT</text>
            </svg>`;
        case 'apex-ai':
            return `<svg viewBox='0 0 200 160' xmlns='http://www.w3.org/2000/svg'>
                <defs>
                    <linearGradient id='agrad' x1='0%' y1='0%' x2='100%' y2='100%'>
                        <stop offset='0%' style='stop-color:#ffd700;stop-opacity:1' />
                        <stop offset='100%' style='stop-color:#f59e0b;stop-opacity:1' />
                    </linearGradient>
                </defs>
                <rect width='200' height='160' fill='#0b111e' rx='16' />
                <path d='M50,140 L100,20 L150,140' fill='none' stroke='url(#agrad)' stroke-width='5' stroke-linejoin='round' />
                <circle cx='100' cy='70' r='10' fill='#ffd700' />
                <path d='M85,95 L100,80 L115,95' fill='none' stroke='#ffd700' stroke-width='3' stroke-linecap='round' />
                <text x='100' y='145' font-family='monospace' font-size='14' font-weight='bold' fill='#ffd700' text-anchor='middle'>APEX</text>
            </svg>`;
        case 'neutrade-ai':
            return `<svg viewBox='0 0 200 160' xmlns='http://www.w3.org/2000/svg'>
                <defs>
                    <linearGradient id='ngrad' x1='0%' y1='0%' x2='100%' y2='100%'>
                        <stop offset='0%' style='stop-color:#60a5fa;stop-opacity:1' />
                        <stop offset='100%' style='stop-color:#3b82f6;stop-opacity:1' />
                    </linearGradient>
                </defs>
                <rect width='200' height='160' fill='#0b111e' rx='16' />
                <path d='M80,60 M120,60 M100,100' fill='none' stroke='url(#ngrad)' stroke-width='4' stroke-linecap='round' />
                <path d='M100,100 L100,130' stroke='url(#ngrad)' stroke-width='4' stroke-linecap='round' />
                <circle cx='100' cy='80' r='8' fill='#60a5fa' />
                <rect x='90' y='30' width='20' height='10' fill='#3b82f6' rx='2' />
                <rect x='90' y='120' width='20' height='10' fill='#60a5fa' rx='2' />
                <text x='100' y='145' font-family='monospace' font-size='14' font-weight='bold' fill='#60a5fa' text-anchor='middle'>NEUTRADE</text>
            </svg>`;
        case 'straddle-edge':
            return `<svg viewBox='0 0 200 160' xmlns='http://www.w3.org/2000/svg'>
                <defs>
                    <linearGradient id='sgrad' x1='0%' y1='0%' x2='100%' y2='100%'>
                        <stop offset='0%' style='stop-color:#a78bfa;stop-opacity:1' />
                        <stop offset='100%' style='stop-color:#7c3aed;stop-opacity:1' />
                    </linearGradient>
                </defs>
                <rect width='200' height='160' fill='#0b111e' rx='16' />
                <path d='M50,80 Q100,40 150,80' fill='none' stroke='url(#sgrad)' stroke-width='4' stroke-linecap='round' />
                <path d='M100,40 Q100,120 150,80' fill='none' stroke='url(#sgrad)' stroke-width='4' stroke-linecap='round' opacity='0.6' />
                <circle cx='100' cy='80' r='6' fill='#a78bfa' />
                <text x='100' y='145' font-family='monospace' font-size='14' font-weight='bold' fill='#a78bfa' text-anchor='middle'>STRADDLE</text>
            </svg>`;
        case 'aurora-parity':
            return `<svg viewBox='0 0 200 160' xmlns='http://www.w3.org/2000/svg'>
                <defs>
                    <linearGradient id='agrad' x1='0%' y1='0%' x2='100%' y2='100%'>
                        <stop offset='0%' style='stop-color:#f093fb;stop-opacity:1' />
                        <stop offset='100%' style='stop-color:#ec4899;stop-opacity:1' />
                    </linearGradient>
                </defs>
                <rect width='200' height='160' fill='#0b111e' rx='16' />
                <circle cx='100' cy='80' r='30' fill='none' stroke='url(#agrad)' stroke-width='3' />
                <path d='M60,80 Q100,50 140,80 Q100,110 60,80' fill='none' stroke='#f093fb' stroke-width='2' opacity='0.5' />
                <circle cx='70' cy='70' r='5' fill='#f093fb' opacity='0.7' />
                <circle cx='130' cy='90' r='5' fill='#ec4899' opacity='0.7' />
                <circle cx='100' cy='100' r='4' fill='#fff' opacity='0.6' />
                <text x='100' y='145' font-family='monospace' font-size='14' font-weight='bold' fill='#f093fb' text-anchor='middle'>AURORA</text>
            </svg>`;
        case 'obsidian-parity':
            return `<svg viewBox='0 0 200 160' xmlns='http://www.w3.org/2000/svg'>
                <defs>
                    <linearGradient id='ograd' x1='0%' y1='0%' x2='100%' y2='100%'>
                        <stop offset='0%' style='stop-color:#c084fc;stop-opacity:1' />
                        <stop offset='100%' style='stop-color:#a855f7;stop-opacity:1' />
                    </linearGradient>
                </defs>
                <rect width='200' height='160' fill='#0b111e' rx='16' />
                <path d='M40,140 Q100,20 160,140' fill='none' stroke='url(#ograd)' stroke-width='4' stroke-linecap='round' />
                <circle cx='100' cy='80' r='15' fill='none' stroke='#c084fc' stroke-width='2' />
                <circle cx='85' cy='65' r='4' fill='#a855f7' />
                <circle cx='115' cy='95' r='4' fill='#c084fc' />
                <text x='100' y='145' font-family='monospace' font-size='14' font-weight='bold' fill='#c084fc' text-anchor='middle'>OBSIDIAN</text>
            </svg>`;
        case 'prism-extremes':
            return `<svg viewBox='0 0 200 160' xmlns='http://www.w3.org/2000/svg'>
                <defs>
                    <linearGradient id='pgrad' x1='0%' y1='0%' x2='100%' y2='100%'>
                        <stop offset='0%' style='stop-color:#fb7185;stop-opacity:1' />
                        <stop offset='100%' style='stop-color:#e11d48;stop-opacity:1' />
                    </linearGradient>
                </defs>
                <rect width='200' height='160' fill='#0b111e' rx='16' />
                <polygon points='100,30 140,130 60,130' fill='url(#pgrad)' opacity='0.15' />
                <path d='M50,80 L100,30 L150,80 L100,130 Z' fill='none' stroke='#fb7185' stroke-width='3' />
                <circle cx='100' cy='80' r='8' fill='#fb7185' />
                <text x='100' y='145' font-family='monospace' font-size='14' font-weight='bold' fill='#fb7185' text-anchor='middle'>PRISM</text>
            </svg>`;
        case 'pulsetrader-ai':
            return `<svg viewBox='0 0 200 160' xmlns='http://www.w3.org/2000/svg'>
                <defs>
                    <linearGradient id='pgrad' x1='0%' y1='0%' x2='100%' y2='100%'>
                        <stop offset='0%' style='stop-color:#34d399;stop-opacity:1' />
                        <stop offset='100%' style='stop-color:#10b981;stop-opacity:1' />
                    </linearGradient>
                </defs>
                <rect width='200' height='160' fill='#0b111e' rx='16' />
                <path d='M30,80 L60,40 L90,120 L120,40 L150,80 L170,120' fill='none' stroke='url(#pgrad)' stroke-width='3' stroke-linecap='round' stroke-linejoin='round' />
                <circle cx='60' cy='40' r='5' fill='#34d399' />
                <circle cx='150' cy='80' r='5' fill='#10b981' />
                <text x='100' y='145' font-family='monospace' font-size='14' font-weight='bold' fill='#34d399' text-anchor='middle'>PULSE</text>
            </svg>`;
        case 'titan-range':
            return `<svg viewBox='0 0 200 160' xmlns='http://www.w3.org/2000/svg'>
                <defs>
                    <linearGradient id='tgrad' x1='0%' y1='0%' x2='100%' y2='100%'>
                        <stop offset='0%' style='stop-color:#fbbf24;stop-opacity:1' />
                        <stop offset='100%' style='stop-color:#d97706;stop-opacity:1' />
                    </linearGradient>
                </defs>
                <rect width='200' height='160' fill='#0b111e' rx='16' />
                <rect x='40' y='120' width='30' height='20' fill='#fbbf24' rx='3' />
                <rect x='85' y='100' width='30' height='40' fill='#d97706' rx='3' />
                <rect x='130' y='110' width='30' height='30' fill='#fbbf24' rx='3' />
                <circle cx='100' cy='80' r='10' fill='none' stroke='#fbbf24' stroke-width='2' />
                <text x='100' y='145' font-family='monospace' font-size='14' font-weight='bold' fill='#fbbf24' text-anchor='middle'>TITAN</text>
            </svg>`;
        case 'zenith-flow':
            return `<svg viewBox='0 0 200 160' xmlns='http://www.w3.org/2000/svg'>
                <defs>
                    <linearGradient id='zgrad' x1='0%' y1='0%' x2='100%' y2='100%'>
                        <stop offset='0%' style='stop-color:#38bdf8;stop-opacity:1' />
                        <stop offset='100%' style='stop-color:#0ea5e9;stop-opacity:1' />
                    </linearGradient>
                </defs>
                <rect width='200' height='160' fill='#0b111e' rx='16' />
                <path d='M40,60 Q80,20 120,60 Q160,20 160,60 Q120,100 80,60 Q40,100 40,60 Z' fill='none' stroke='url(#zgrad)' stroke-width='3' opacity='0.6' />
                <circle cx='100' cy='80' r='12' fill='none' stroke='#38bdf8' stroke-width='3' />
                <path d='M85,80 Q100,70 115,80' fill='none' stroke='#0ea5e9' stroke-width='3' stroke-linecap='round' />
                <text x='100' y='145' font-family='monospace' font-size='14' font-weight='bold' fill='#38bdf8' text-anchor='middle'>ZENITH</text>
            </svg>`;
        default:
            return `<svg viewBox='0 0 200 160' xmlns='http://www.w3.org/2000/svg'>
                <rect width='200' height='160' fill='#0b111e' rx='16' />
                <circle cx='100' cy='80' r='30' fill='#60a5fa' opacity='0.2' />
                <text x='100' y='85' font-family='monospace' font-size='14' fill='#60a5fa' text-anchor='middle'>BOT</text>
            </svg>`;
    }
};

export const botImage = (id: BotImageId): string => SVG(id);
