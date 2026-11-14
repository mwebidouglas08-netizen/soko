import { useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { loadStrategyXml } from '@/pages/ai-trading-hub/deploy-strategy';
import { VERTEX_DIGITS, QUANTUM_EDGE } from '@/pages/quick-bot';
import { navigateToHubView } from '@/services/hub-navigation';
import { HubPage, HubPageHeader } from '@/components/hub-page';
import { botVisual } from '@/components/bot-visuals';
import { botImage, type BotImageId } from '@/components/bot-images';
import './trading-bots.scss';

type CardBadge = 'QUICK' | 'PREMIUM' | 'FREE';

interface BotCard {
    id: string;
    name: string;
    description: string;
    kind: 'quick' | 'xml';
    badge: CardBadge;
    xmlFile?: string;
    preset?: 'vertex' | 'quantum';
}

/** Free bots grid — clean, human-made card design. */
const REFERENCE_CARDS: BotCard[] = [
    { id: 'maziwa', name: 'Maziwa AI', description: 'Premium high-frequency Over/Under scanner. Rotates all synthetic markets, prioritizes Over 2 and Under 8 signals, 1-tick trades with martingale and session risk controls.', kind: 'xml', badge: 'PREMIUM', xmlFile: 'maziwa' },
    { id: 'vertex', name: 'Vertex Digits', description: 'Quick Over/Under + Even/Odd analysis bot. Stake 1.0, recovery ×2, pattern gate after every 3 trades.', kind: 'quick', badge: 'FREE', preset: 'vertex' },
    { id: 'digit_nexus', name: 'Digit Nexus', description: 'Digit-frequency Over/Under strategy on Volatility markets with adaptive recovery.', kind: 'xml', badge: 'PREMIUM', xmlFile: 'digit-nexus-ai' },
    { id: 'volt_scalper', name: 'Volt Scalper', description: 'Fast volatility scalping strategy with momentum-based entries and recovery.', kind: 'xml', badge: 'PREMIUM', xmlFile: 'volt-scalper' },
    { id: 'apex_ai', name: 'Apex AI', description: 'Adaptive Rise/Fall AI strategy with trend-following logic and risk controls.', kind: 'xml', badge: 'PREMIUM', xmlFile: 'apex-ai' },
    { id: 'neutrade', name: 'Neutrade', description: 'Balanced Rise/Fall engine with controlled stake recovery and session targets.', kind: 'xml', badge: 'PREMIUM', xmlFile: 'neutrade-ai' },
    { id: 'straddle', name: 'Rise Fall Reversal', description: 'Breakout straddle strategy for reversal opportunities on volatile markets.', kind: 'xml', badge: 'PREMIUM', xmlFile: 'straddle-edge' },
    { id: 'aurora', name: 'Aurora Parity', description: 'Parity momentum strategy with digit analysis, stake control and session limits.', kind: 'xml', badge: 'PREMIUM', xmlFile: 'aurora-parity' },
    { id: 'obsidian', name: 'Even Odd', description: 'Even/Odd parity engine with streak-aware entries and risk management.', kind: 'xml', badge: 'PREMIUM', xmlFile: 'obsidian-parity' },
    { id: 'prism', name: 'Extreme Digits', description: 'Extreme-digit strategy targeting outlier outcomes with recovery controls.', kind: 'xml', badge: 'PREMIUM', xmlFile: 'prism-extremes' },
    { id: 'pulsetrader', name: 'PulseTrader', description: 'Momentum pulse strategy with tick-driven entries and profit/loss management.', kind: 'xml', badge: 'PREMIUM', xmlFile: 'pulsetrader-ai' },
    { id: 'titan', name: 'Titan Range', description: 'Range-based strategy with disciplined stake sizing and session protection.', kind: 'xml', badge: 'PREMIUM', xmlFile: 'titan-range' },
    { id: 'zenith', name: 'Zenith Flow', description: 'Flow-based strategy designed for consistent entries with adaptive recovery.', kind: 'xml', badge: 'PREMIUM', xmlFile: 'zenith-flow' },
    { id: 'quantum', name: 'Quantum Edge', description: 'Extreme-digit quick bot. Stake 0.8, recovery ×2, Over/Under on every trade.', kind: 'quick', badge: 'FREE', preset: 'quantum' },
];

const IMAGE_MAP: Record<string, BotImageId> = {
    maziwa: 'maziwa',
    vertex: 'vertex',
    quantum: 'quantum',
    digit_nexus: 'digit-nexus-ai',
    volt_scalper: 'volt-scalper',
    apex_ai: 'apex-ai',
    neutrade: 'neutrade-ai',
    straddle: 'straddle-edge',
    aurora: 'aurora-parity',
    obsidian: 'obsidian-parity',
    prism: 'prism-extremes',
    pulsetrader: 'pulsetrader-ai',
    titan: 'titan-range',
    zenith: 'zenith-flow',
};

const THEME_MAP: Record<string, string> = {
    maziwa: 'maziwa',
    vertex: 'vertex',
    quantum: 'quantum',
    digit_nexus: 'digit-nexus-ai',
    volt_scalper: 'volt-scalper',
    apex_ai: 'apex-ai',
    neutrade: 'neutrade-ai',
    straddle: 'straddle-edge',
    aurora: 'aurora-parity',
    obsidian: 'obsidian-parity',
    prism: 'prism-extremes',
    pulsetrader: 'pulsetrader-ai',
    titan: 'titan-range',
    zenith: 'zenith-flow',
};

const TradingBotsPage = observer(() => {
    const [query, setQuery] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const cards = useMemo(() => REFERENCE_CARDS, []);

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return cards;
        return cards.filter(card => card.name.toLowerCase().includes(needle));
    }, [cards, query]);

    const imageId = (cardId: string): BotImageId => IMAGE_MAP[cardId] ?? 'vertex';
    const themeId = (cardId: string): string => THEME_MAP[cardId] ?? cardId;

    const onLoad = async (card: BotCard) => {
        setError(null);
        setNotice(null);

        if (card.kind === 'quick') {
            const preset = card.preset === 'quantum' ? QUANTUM_EDGE : VERTEX_DIGITS;
            window.sessionStorage.setItem('quick-bot-preset', JSON.stringify(preset));
            document.dispatchEvent(new CustomEvent('mwx:quick-bot-preset', { detail: preset }));
            navigateToHubView('quick-bot');
            setNotice(`${card.name} loaded into Quick Bot.`);
            return;
        }

        const workspace = window.Blockly?.derivWorkspace;
        if (!workspace || !card.xmlFile) {
            setError('Bot Builder workspace is still loading — try again in a moment.');
            return;
        }

        setBusyId(card.id);
        try {
            const mod = await import(/* webpackChunkName: `[request]` */ `../../xml/ai/${card.xmlFile}.xml`);
            const loaded = await loadStrategyXml(mod.default, card.name, workspace);
            if (!loaded) {
                throw new Error('Nothing landed in the workspace — check your connection and try again.');
            }
            document.dispatchEvent(new CustomEvent('mwx:go-bot-monitor'));
            setNotice(`${card.name} loaded. Adjust settings in Bot Monitor, then press Run.`);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load this strategy into the builder.');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <HubPage className='bots-page'>
            <HubPageHeader
                title='Trading Bots'
                subtitle='Load a ready-made strategy into the Bot Builder.'
                actions={
                    <input
                        type='search'
                        className='hub-input bots-search'
                        placeholder='Search bots by name…'
                        aria-label='Search bots by name'
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                }
            />

            <div className='bots-toolbar'>
                <span className='bots-count'>
                    {visible.length} of {cards.length} bots
                </span>
            </div>

            {error && (
                <div className='bots-error' role='alert'>
                    {error}
                </div>
            )}
            {notice && (
                <div className='bots-notice' role='status'>
                    {notice}
                </div>
            )}

            {visible.length === 0 ? (
                <div className='bots-empty'>
                    <strong>No bots match “{query.trim()}”.</strong>
                    <span>Try a shorter search.</span>
                    <button type='button' className='hub-btn hub-btn--ghost' onClick={() => setQuery('')}>
                        Reset search
                    </button>
                </div>
            ) : (
                <div className='bots-grid'>
                    {visible.map(card => {
                        const theme = botVisual(themeId(card.id));
                        const imgId = imageId(card.id);
                        return (
                            <article key={card.id} className='bots-card' style={{ '--bot-color': theme.color } as React.CSSProperties}>
                                <div className='bots-card__image'>
                                    <img src={`data:image/svg+xml;base64,${btoa(botImage(imgId))}`} alt={card.name} loading='lazy' decoding='async' />
                                </div>
                                <div className='bots-card__content'>
                                    <div className='bots-card__header'>
                                        <span className={`bots-card__badge bots-card__badge--${card.badge.toLowerCase()}`}>{card.badge}</span>
                                        <span className='bots-card__kind'>{card.kind === 'quick' ? 'Quick' : 'Strategy'}</span>
                                    </div>
                                    <h3 className='bots-card__name'>{card.name}</h3>
                                    <p className='bots-card__desc'>{card.description}</p>
                                </div>
                                <div className='bots-card__footer'>
                                    <button
                                        type='button'
                                        className='hub-btn hub-btn--primary bots-card__load'
                                        disabled={busyId !== null}
                                        onClick={() => onLoad(card)}
                                    >
                                        {busyId === card.id ? 'Loading…' : 'Load Bot'}
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </HubPage>
    );
});

export default TradingBotsPage;
