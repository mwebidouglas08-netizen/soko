import { useMemo, useState } from 'react';
import { load } from '@/external/bot-skeleton';
import { save_types } from '@/external/bot-skeleton/constants/save-type';
import { botVisual, botIcon } from '@/components/bot-visuals';
import './bots-catalog.scss';

type Bot = {
    file: string;
    name: string;
    tag: string;
    desc: string;
    premium?: boolean;
};

const BOTS: Bot[] = [
    { file: 'digit-nexus-ai', name: 'Digit Nexus', tag: 'DIGITS', desc: 'Digit frequency Over/Under entries.' },
    { file: 'volt-scalper', name: 'Volt Scalper', tag: 'SCALP', desc: 'Fast volatility scalping.' },
    { file: 'apex-ai', name: 'Apex AI', tag: 'PREMIUM', desc: 'Adaptive multi-market AI.', premium: true },
    { file: 'dmo-bot', name: 'DMO Bot', tag: 'PREMIUM', desc: 'AI signal-scoring digit engine.', premium: true },
    { file: 'dollar-printer-ai', name: 'Dollar Printer', tag: 'PREMIUM', desc: 'Volatility analyzer with stake management.', premium: true },
    { file: 'neutrade-ai', name: 'Neutrade', tag: 'BALANCED', desc: 'Balanced risk engine.' },
    { file: 'straddle-edge', name: 'Rise Fall Reversal', tag: 'RISE/FALL', desc: 'Straddle Rise/Fall around digit bias.' },
    { file: 'parity-pulse-ai', name: 'Parity Pulse', tag: 'PARITY', desc: 'Even/Odd parity hunter.', premium: true },
    { file: 'obsidian-parity', name: 'Even Odd', tag: 'PARITY', desc: 'Deep-sample even/odd engine.', premium: true },
    { file: 'prism-extremes', name: 'Extreme Digits', tag: 'EXTREMES', desc: 'Extreme digit outlier trades.', premium: true },
    { file: 'pulsetrader-ai', name: 'PulseTrader', tag: 'MOMENTUM', desc: 'Momentum-driven tick velocity entries.' },
    { file: 'titan-range', name: 'Titan Range', tag: 'RANGE', desc: 'Range break volatility-scaled stakes.', premium: true },
    { file: 'zenith-flow', name: 'Zenith Flow', tag: 'FLOW', desc: 'Flow-based direction engine.', premium: true },
    { file: 'over-under-edge-ai', name: 'Over Under Edge', tag: 'OVER/UNDER', desc: 'Over/Under digit percentage setup.' },
    { file: 'trend-match-fusion-ai', name: 'Trend Match Fusion', tag: 'TREND', desc: 'Call-trend rider with TP/SL.', premium: true },
    { file: 'bt-frequency-hunter', name: 'BT Frequency Hunter', tag: 'BT', desc: 'Digit-frequency edge hunter.', premium: true },
    { file: 'bt-pattern-matrix', name: 'BT Pattern Matrix', tag: 'BT', desc: 'Pattern-matrix even/odd scanner.', premium: true },
    { file: 'bt-probability-shield', name: 'BT Probability Shield', tag: 'BT', desc: 'Probability-shielded Over/Under.', premium: true },
    { file: 'bt-adaptive-market-rotator', name: 'BT Adaptive Market Rotator', tag: 'BT', desc: 'Multi-market Call/Put rotator.', premium: true },
    { file: 'bt-dual-momentum-fusion', name: 'BT Dual Momentum Fusion', tag: 'BT', desc: 'Dual-momentum digit fusion.', premium: true },
    { file: 'bt-ultimate-fusion-ai', name: 'BT Ultimate Fusion AI', tag: 'BT', desc: 'AI-fused extreme-digit parity.', premium: true },
    { file: 'bt-trend-runner', name: 'BT Trend Runner', tag: 'BT', desc: 'Trend-following Call/Put runner.', premium: true },
];

const loadBot = async (bot: Bot) => {
    try {
        const mod = await import(/* webpackChunkName: `[request]` */ `../../xml/ai/${bot.file}.xml`);
        const dom = window.Blockly.utils.xml.textToDom(mod.default);
        const workspace = window.Blockly.derivWorkspace;
        await load({
            block_string: window.Blockly.Xml.domToText(dom),
            file_name: bot.name,
            workspace,
            from: save_types.UNSAVED,
            drop_event: null,
            strategy_id: null,
            showIncompatibleStrategyDialog: null,
        });
        // Surface the Bot Monitor screen.
        document.dispatchEvent(new CustomEvent('mwx:go-bot-monitor'));
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to load bot', bot.file, e);
    }
};

const BotsCatalog = () => {
    const [filter, setFilter] = useState<'all' | 'free' | 'premium'>('all');
    const [loading, setLoading] = useState<string | null>(null);

    const bots = useMemo(() => BOTS.filter(b => (filter === 'all' ? true : filter === 'premium' ? b.premium : !b.premium)), [filter]);

    const onLoad = async (bot: Bot) => {
        setLoading(bot.file);
        await loadBot(bot);
        setLoading(null);
    };

    return (
        <div className='bots-catalog'>
            <header className='bots-catalog__head'>
                <span className='bots-catalog__eyebrow'>Free Workspace</span>
                <h2 className='bots-catalog__title'>Trading Bots</h2>
                <div className='bots-catalog__filters'>
                    {(['all', 'free', 'premium'] as const).map(f => (
                        <button key={f} type='button' className={`bots-catalog__filter ${filter === f ? 'is-active' : ''}`} onClick={() => setFilter(f)}>
                            {f === 'all' ? 'All' : f === 'free' ? 'Free' : 'Premium'}
                        </button>
                    ))}
                </div>
            </header>

            <div className='bots-catalog__grid'>
                {bots.map((bot, i) => {
                    const theme = botVisual(bot.file);
                    const cardStyle: React.CSSProperties & { '--bot-color'?: string } = {
                        '--bot-color': theme.color as string,
                        animationDelay: `${i * 80}ms`,
                    };
                    return (
                        <article key={bot.file} className='bots-card' style={cardStyle}>
                            <div className='bots-card__icon'>
                                <span className='bots-card__icon-symbol' dangerouslySetInnerHTML={{ __html: botIcon(theme.kind) }} />
                            </div>
                            <div className='bots-card__content'>
                                <div className='bots-card__header'>
                                    <span className='bots-card__tag'>{theme.tag}</span>
                                    {theme.premium && <span className='bots-card__premium'>PREMIUM</span>}
                                </div>
                                <h3 className='bots-card__name'>{bot.name}</h3>
                                <p className='bots-card__desc'>{bot.desc}</p>
                            </div>
                            <div className='bots-card__footer'>
                                <button type='button' className='bots-card__load' onClick={() => onLoad(bot)} disabled={loading === bot.file}>
                                    {loading === bot.file ? 'Loading…' : 'Load Bot'}
                                </button>
                            </div>
                        </article>
                    );
                })}
                {loading && (
                    <div className='bots-card__load lp-loading' style={{ textAlign: 'center', marginTop: '1rem', fontSize: '12px', color: '#9fb6d4' }}>
                        Loading bot…
                    </div>
                )}
            </div>
        </div>
    );
};

export default BotsCatalog;