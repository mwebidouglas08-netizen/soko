import { useMemo, useState } from 'react';
import { loadStrategyXml } from '@/pages/ai-trading-hub/deploy-strategy';
import { navigateToHubView } from '@/services/hub-navigation';
import './bots-catalog.scss';

// Static imports so the XML is bundled by the raw-loader rule (rsbuild.config
// `test: /\.xml$/`). A dynamic `import()` of a template-literal path is not
// statically analysable and silently fails to resolve at runtime — which is why
// loading a bot previously did nothing.
import digitNexusAi from '@/xml/ai/digit-nexus-ai.xml';
import voltScalper from '@/xml/ai/volt-scalper.xml';
import apexAi from '@/xml/ai/apex-ai.xml';
import neutradeAi from '@/xml/ai/neutrade-ai.xml';
import straddleEdge from '@/xml/ai/straddle-edge.xml';
import auroraParity from '@/xml/ai/aurora-parity.xml';
import obsidianParity from '@/xml/ai/obsidian-parity.xml';
import prismExtremes from '@/xml/ai/prism-extremes.xml';
import pulsetraderAi from '@/xml/ai/pulsetrader-ai.xml';
import titanRange from '@/xml/ai/titan-range.xml';
import zenithFlow from '@/xml/ai/zenith-flow.xml';

type Bot = {
    file: string;
    name: string;
    tag: string;
    desc: string;
    color: string;
    premium?: boolean;
    xml: string;
};

const BOTS: Bot[] = [
    { file: 'digit-nexus-ai', name: 'Digit Nexus AI', tag: 'DIGITS', desc: 'Scans last-digit frequencies and fires Over/Under entries on a confirmed edge.', color: '#22e7ff', xml: digitNexusAi },
    { file: 'volt-scalper', name: 'Volt Scalper', tag: 'SCALP', desc: 'Fast volatility scalping with tight recovery and session take-profit.', color: '#7effd8', xml: voltScalper },
    { file: 'apex-ai', name: 'Apex AI', tag: 'PREMIUM', desc: 'Adaptive multi-market AI with automatic recovery selection.', color: '#FFD700', premium: true, xml: apexAi },
    { file: 'neutrade-ai', name: 'Neutrade AI', tag: 'BALANCED', desc: 'Balanced risk engine that sizes stakes from live confidence scores.', color: '#60a5fa', xml: neutradeAi },
    { file: 'straddle-edge', name: 'Straddle Edge', tag: 'STRADDLE', desc: 'Straddles Rise/Fall around a digit bias with dual-direction protection.', color: '#a78bfa', xml: straddleEdge },
    { file: 'aurora-parity', name: 'Aurora Parity', tag: 'PARITY', desc: 'Even/Odd parity hunter with streak-aware recovery.', color: '#f093fb', premium: true, xml: auroraParity },
    { file: 'obsidian-parity', name: 'Obsidian Parity', tag: 'PARITY', desc: 'Deep-sample even/odd engine tuned for sustained sessions.', color: '#c084fc', premium: true, xml: obsidianParity },
    { file: 'prism-extremes', name: 'Prism Extremes', tag: 'EXTREMES', desc: 'Trades extreme digit outliers with hard stop-loss guardrails.', color: '#fb7185', premium: true, xml: prismExtremes },
    { file: 'pulsetrader-ai', name: 'PulseTrader AI', tag: 'MOMENTUM', desc: 'Momentum-driven entries synced to tick velocity.', color: '#34d399', xml: pulsetraderAi },
    { file: 'titan-range', name: 'Titan Range', tag: 'RANGE', desc: 'Range Break strategy with volatility-scaled stake sizing.', color: '#fbbf24', premium: true, xml: titanRange },
    { file: 'zenith-flow', name: 'Zenith Flow', tag: 'FLOW', desc: 'Flow-based direction engine with adaptive barriers.', color: '#38bdf8', premium: true, xml: zenithFlow },
];

const BotsCatalog = () => {
    const [filter, setFilter] = useState<'all' | 'free' | 'premium'>('all');
    const [loading, setLoading] = useState<string | null>(null);
    const [loaded, setLoaded] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const bots = useMemo(
        () => BOTS.filter(b => (filter === 'all' ? true : filter === 'premium' ? b.premium : !b.premium)),
        [filter]
    );

    const onLoad = async (bot: Bot) => {
        setLoading(bot.file);
        setError(null);
        setLoaded(null);
        try {
            const workspace = window.Blockly?.derivWorkspace;
            const ok = await loadStrategyXml(bot.xml, bot.name, workspace);
            if (!ok) {
                throw new Error('Nothing landed in the workspace.');
            }
            setLoaded(bot.file);
            // Surface the Bot Builder so the Run button is immediately reachable.
            navigateToHubView('bot-builder');
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('Failed to load bot', bot.file, e);
            setError(
                `Could not load ${bot.name}. The Bot Builder workspace may still be loading \u2014 try again in a moment.`
            );
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className='bots-catalog'>
            <header className='bots-catalog__head'>
                <span className='bots-catalog__eyebrow'>FREE WORKSPACE</span>
                <h2 className='bots-catalog__title'>Free &amp; Premium AI Bots</h2>
                <p className='bots-catalog__sub'>
                    Load a proven strategy straight into your bot builder — no coding required.
                </p>
                <div className='bots-catalog__filters'>
                    {(['all', 'free', 'premium'] as const).map(f => (
                        <button
                            key={f}
                            type='button'
                            className={`bots-catalog__filter ${filter === f ? 'is-active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f === 'all' ? 'All bots' : f === 'free' ? 'Free' : 'Premium AI'}
                        </button>
                    ))}
                </div>
            </header>

            {error && (
                <div className='bots-catalog__error' role='alert'>
                    {error}
                </div>
            )}
            {loaded && !error && (
                <div className='bots-catalog__notice' role='status'>
                    Bot loaded into the Bot Builder. Press <strong>Run</strong> to start it — try it on a demo
                    account first.
                </div>
            )}

            <div className='bots-catalog__grid'>
                {bots.map(bot => (
                    <article key={bot.file} className='bots-card' style={{ ['--bot-color' as any]: bot.color }}>
                        <div className='bots-card__top'>
                            <span className='bots-card__tag'>{bot.tag}</span>
                            {bot.premium && <span className='bots-card__premium'>PREMIUM</span>}
                        </div>
                        <h3 className='bots-card__name'>{bot.name}</h3>
                        <p className='bots-card__desc'>{bot.desc}</p>
                        <button
                            type='button'
                            className='bots-card__load'
                            onClick={() => onLoad(bot)}
                            disabled={loading === bot.file}
                        >
                            {loading === bot.file ? 'Loading\u2026' : 'Load Bot'}
                        </button>
                    </article>
                ))}
            </div>
        </div>
    );
};

export default BotsCatalog;
