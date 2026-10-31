import { useMemo, useState } from 'react';
import { load } from '@/external/bot-skeleton';
import { save_types } from '@/external/bot-skeleton/constants/save-type';
import { botVisual, botIcon } from '@/components/bot-visuals';
import { botImage } from '@/components/bot-images';
import './bots-catalog.scss';

type Bot = {
    file: string;
    name: string;
    tag: string;
    desc: string;
    color: string;
    premium?: boolean;
};

const BOTS: Bot[] = [
    { file: 'digit-nexus-ai', name: 'Digit Nexus', tag: 'DIGITS', desc: 'Scans last-digit frequencies and fires Over/Under entries on a confirmed edge.', color: '#22e7ff' },
    { file: 'volt-scalper', name: 'Volt Scalper', tag: 'SCALP', desc: 'Fast volatility scalping with tight recovery and session take-profit.', color: '#7effd8' },
    { file: 'apex-ai', name: 'Apex AI', tag: 'PREMIUM', desc: 'Adaptive multi-market AI with automatic recovery selection.', color: '#FFD700', premium: true },
    { file: 'neutrade-ai', name: 'Neutrade', tag: 'BALANCED', desc: 'Balanced risk engine that sizes stakes from live confidence scores.', color: '#60a5fa' },
    { file: 'straddle-edge', name: 'Straddle Edge', tag: 'STRADDLE', desc: 'Straddles Rise/Fall around a digit bias with dual-direction protection.', color: '#a78bfa' },
    { file: 'aurora-parity', name: 'Aurora Parity', tag: 'PARITY', desc: 'Even/Odd parity hunter with streak-aware recovery.', color: '#f093fb', premium: true },
    { file: 'obsidian-parity', name: 'Obsidian Parity', tag: 'PARITY', desc: 'Deep-sample even/odd engine tuned for sustained sessions.', color: '#c084fc', premium: true },
    { file: 'prism-extremes', name: 'Prism Extremes', tag: 'EXTREMES', desc: 'Trades extreme digit outliers with hard stop-loss guardrails.', color: '#fb7185', premium: true },
    { file: 'pulsetrader-ai', name: 'PulseTrader', tag: 'MOMENTUM', desc: 'Momentum-driven entries synced to tick velocity.', color: '#34d399' },
    { file: 'titan-range', name: 'Titan Range', tag: 'RANGE', desc: 'Range Break strategy with volatility-scaled stake sizing.', color: '#fbbf24', premium: true },
    { file: 'zenith-flow', name: 'Zenith Flow', tag: 'FLOW', desc: 'Flow-based direction engine with adaptive barriers.', color: '#38bdf8', premium: true },
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
        // Surface the Blockly workspace.
        (window as any).__goToBotBuilder?.();
        document.dispatchEvent(new CustomEvent('mwx:go-bot-builder'));
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
                <span className='bots-catalog__eyebrow'>FREE WORKSPACE</span>
                <h2 className='bots-catalog__title'>Free &amp; Premium AI Bots</h2>
                <p className='bots-catalog__sub'>Load a proven strategy straight into your bot builder — no coding required.</p>
                <div className='bots-catalog__filters'>
                    {(['all', 'free', 'premium'] as const).map(f => (
                        <button key={f} type='button' className={`bots-catalog__filter ${filter === f ? 'is-active' : ''}`} onClick={() => setFilter(f)}>
                            {f === 'all' ? 'All bots' : f === 'free' ? 'Free' : 'Premium AI'}
                        </button>
                    ))}
                </div>
            </header>

            <div className='bots-catalog__grid'>
                {bots.map(bot => {
                    const theme = botVisual(bot.file);
                    return (
                        <article key={bot.file} className='bots-card' style={{ '--bot-color': theme.color } as React.CSSProperties}>
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
            </div>
        </div>
    );
};

export default BotsCatalog;
