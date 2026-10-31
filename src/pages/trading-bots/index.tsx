import { useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
    HUB_STRATEGIES,
    deployHubStrategy,
    type HubStrategy,
} from '@/pages/ai-trading-hub/deploy-strategy';
import { VERTEX_DIGITS, QUANTUM_EDGE } from '@/pages/quick-bot';
import { navigateToHubView } from '@/services/hub-navigation';
import { HubNote, HubPage, HubPageHeader } from '@/components/hub-page';
import { botVisual, botIcon } from '@/components/bot-visuals';
import { botImage, type BotImageId } from '@/components/bot-images';
import './trading-bots.scss';

type CardBadge = 'QUICK' | 'PREMIUM' | 'FREE';

interface BotCard {
    id: string;
    name: string;
    description: string;
    kind: 'quick' | 'hub';
    badge: CardBadge;
    hubId?: string;
    preset?: 'vertex' | 'quantum';
}

/** Free bots grid — clean, human-made card design. */
const REFERENCE_CARDS: BotCard[] = [
    { id: 'vertex', name: 'Vertex Digits', description: 'Quick Over/Under + Even/Odd analysis bot. Stake 1.0, recovery ×2, pattern gate after every 3 trades.', kind: 'quick', badge: 'FREE', preset: 'vertex' },
    { id: 'digit_nexus', name: 'Digit Nexus', description: 'Digit-trend rider on Volatility 75. Three-tick Rise contracts with stake recovery.', kind: 'hub', badge: 'PREMIUM', hubId: 'digit_nexus' },
    { id: 'volt_scalper', name: 'Volt Scalper', description: 'Ultra-fast scalper. One-tick Rise contracts on Volatility 100 with aggressive recovery.', kind: 'hub', badge: 'PREMIUM', hubId: 'volt_scalper' },
    { id: 'apex_ai', name: 'Apex AI', description: 'Trend-following apex bot. Two-tick Rise contracts on Volatility 25.', kind: 'hub', badge: 'PREMIUM', hubId: 'apex_ai' },
    { id: 'neutrade', name: 'Neutrade', description: 'Neutral mean-reversion bot. One-minute Fall contracts on Volatility 50.', kind: 'hub', badge: 'PREMIUM', hubId: 'neutrade' },
    { id: 'straddle', name: 'Straddle Edge', description: 'Breakout straddle. Two-tick Fall contracts on Boom 1000 Index.', kind: 'hub', badge: 'PREMIUM', hubId: 'straddle_edge' },
    { id: 'aurora', name: 'Aurora Parity', description: 'Parity momentum rider. One-tick Rise contracts on Volatility 100 (1s) Index.', kind: 'hub', badge: 'FREE', hubId: 'aurora' },
    { id: 'obsidian', name: 'Obsidian Parity', description: 'Dark-parity streak hunter. One-tick Fall contracts on Volatility 75 (1s) Index.', kind: 'hub', badge: 'FREE', hubId: 'obsidian' },
    { id: 'prism', name: 'Prism Extremes', description: 'Extreme-digit prism. One-tick Rise contracts on Volatility 100 Index.', kind: 'hub', badge: 'FREE', hubId: 'prism' },
    { id: 'pulsetrader', name: 'PulseTrader', description: 'Pulse-riding momentum bot. Five-tick Rise contracts on Jump 100 Index.', kind: 'hub', badge: 'FREE', hubId: 'pulsetrader' },
    { id: 'titan', name: 'Titan Range', description: 'Range-capping titan. One-tick Fall contracts on Volatility 50 Index.', kind: 'hub', badge: 'FREE', hubId: 'titan' },
    { id: 'zenith', name: 'Zenith Flow', description: 'Zenith flow rider. Two-tick Rise contracts on Volatility 25 (1s) Index.', kind: 'hub', badge: 'FREE', hubId: 'zenith' },
    { id: 'quantum', name: 'Quantum Edge', description: 'Extreme-digit bot. Stake 0.8, recovery ×2, Over/Under on every trade.', kind: 'quick', badge: 'FREE', preset: 'quantum' },
];

const IMAGE_MAP: Record<string, BotImageId> = {
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

    const onLoad = async (card: BotCard) => {
        setError(null);
        setNotice(null);

        if (card.kind === 'quick') {
            const preset = card.preset === 'quantum' ? QUANTUM_EDGE : VERTEX_DIGITS;
            window.sessionStorage.setItem('quick-bot-preset', JSON.stringify(preset));
            navigateToHubView('quick-bot');
            setNotice(`${card.name} loaded into Quick Bot.`);
            return;
        }

        const strategy: HubStrategy | undefined = HUB_STRATEGIES.find(s => s.id === card.hubId);
        const workspace = window.Blockly?.derivWorkspace;
        if (!strategy || !workspace) {
            setError('Bot Builder workspace is still loading — try again in a moment.');
            return;
        }

        setBusyId(card.id);
        try {
            await deployHubStrategy(strategy, workspace);
            if (workspace.getAllBlocks().length === 0) {
                throw new Error('Nothing landed in the workspace — check your connection and try again.');
            }
            navigateToHubView('bot-builder');
            setNotice(`${card.name} loaded into Bot Builder. Press Run to start — try on demo first.`);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load this strategy into the builder.');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <HubPage className='bots-page'>
            <HubPageHeader
                title='Free Bots'
                subtitle='Load a ready-made strategy into the Bot Builder or open a Quick Bot preset. Nothing trades until you press Run.'
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

            <HubNote tone='info'>
                These entries are strategies and stake progressions — they change how your stake moves between trades. Nothing here guarantees profit. Loading a bot only fills the workspace: nothing trades until you press Run, and demo orders are the safe first step.
            </HubNote>

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
                        const theme = botVisual(card.id);
                        const imgId = imageId(card.id);
                        return (
                            <article key={card.id} className='bots-card' style={{ '--bot-color': theme.color } as React.CSSProperties}>
                                <div className='bots-card__image'>
                                    <img src={`data:image/svg+xml;base64,${btoa(botImage(imgId))}`} alt={card.name} loading='lazy' decoding='async' />
                                </div>
                                <div className='bots-card__content'>
                                    <div className='bots-card__header'>
                                        <span className={`bots-card__badge bots-card__badge--${card.badge.toLowerCase()}`}>{card.badge}</span>
                                        <span className='bots-card__kind'>{card.kind === 'quick' ? 'Quick' : 'Hub'}</span>
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
