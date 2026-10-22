import { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { HubSessionSnapshot, HubTradeIntent } from '@/bot/engine/hub-session';
import { useHubSession } from '@/bot/use-hub-session';
import { SymbolSeries, TickFeed } from '@/bot/deriv/ticks';
import { VOL_MARKETS } from '../hub/markets';
import './apex-bot.scss';

const fmtUsd = (n: number): string => `${n >= 0 ? '+' : ''}${n.toFixed(2)}`;
const fmtTime = (t: number): string =>
    new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const OVER_BARRIER = 2;
const UNDER_BARRIER = 7;

const resolveApex = (series: SymbolSeries, symbol: string): HubTradeIntent | null => {
    const digits = series.digits;
    if (digits.length < 15) return null;
    const last = digits[digits.length - 1];
    const prev = digits[digits.length - 2];
    if (last >= 8 && prev >= 7) return { symbol, contractType: 'DIGITUNDER', barrier: UNDER_BARRIER };
    if (last <= 1 && prev <= 2) return { symbol, contractType: 'DIGITOVER', barrier: OVER_BARRIER };
    return null;
};

/** `Top X/Y | O>4 N% | U<5 M%` — X = most common last digit, Y = its count. */
const parityStats = (digits: number[]): { top: string; parity: string; match: boolean } => {
    if (digits.length < 3) return { top: '—', parity: '—', match: false };
    const tail = digits.slice(-10);
    const counts = new Map<number, number>();
    for (const d of tail) counts.set(d, (counts.get(d) || 0) + 1);
    const last = tail[tail.length - 1];
    const over = (tail.filter(d => d > 4).length * 100) / tail.length;
    const under = 100 - over;
    return {
        top: `Top ${last}/${counts.get(last) || 0}`,
        parity: `O>4 ${over.toFixed(0)}% | U<5 ${under.toFixed(0)}%`,
        match: over >= 60 || under >= 60,
    };
};

const fmtQuote = (q?: number): string => (q === undefined || !Number.isFinite(q) ? '—' : String(q));

const ApexBotPage = observer(() => {
    const [stake, setStake] = useState(0.5);
    const [takeProfit, setTakeProfit] = useState(10);
    const [stopLoss, setStopLoss] = useState(30);
    const [martingale, setMartingale] = useState(2);
    const [martingaleOn, setMartingaleOn] = useState(true);
    const [query, setQuery] = useState('');

    const { session, snap } = useHubSession(() => ({
        symbols: VOL_MARKETS.map(m => m.symbol),
        stake: 0.5,
        martingale: 2,
        takeProfit: 10,
        stopLoss: 30,
        durationTicks: 1,
        nameOf: s => VOL_MARKETS.find(m => m.symbol === s)?.name || s,
        evaluate: (symbol: string, series: SymbolSeries, _state: HubSessionSnapshot): HubTradeIntent | null =>
            resolveApex(series, symbol),
    }));

    // Reference streams quotes/digits on every page even while the bot is stopped.
    const [live, setLive] = useState<{
        quotes: Record<string, number>;
        digits: Record<string, number[]>;
        window: Record<string, number[]>;
        at: number;
    }>(() => ({ quotes: {}, digits: {}, window: {}, at: 0 }));

    useEffect(() => {
        const feed = new TickFeed({
            onTick: (symbol, _point, series) => {
                setLive(prev => ({
                    quotes: { ...prev.quotes, [symbol]: series.quotes[series.quotes.length - 1] || 0 },
                    digits: { ...prev.digits, [symbol]: series.digits.slice(-3) },
                    window: { ...prev.window, [symbol]: series.digits.slice(-10) },
                    at: Date.now(),
                }));
            },
        });
        feed.setSymbols(VOL_MARKETS.map(m => m.symbol));
        feed.start();
        return () => feed.stop();
    }, []);

    const sync = (patch: { stake?: number; takeProfit?: number; stopLoss?: number; martingale?: number }) => {
        if (patch.stake !== undefined) setStake(patch.stake);
        if (patch.takeProfit !== undefined) setTakeProfit(patch.takeProfit);
        if (patch.stopLoss !== undefined) setStopLoss(patch.stopLoss);
        if (patch.martingale !== undefined) setMartingale(patch.martingale);
        session.updateOptions({
            stake: patch.stake ?? stake,
            takeProfit: patch.takeProfit ?? takeProfit,
            stopLoss: patch.stopLoss ?? stopLoss,
            martingale: patch.martingale ?? martingale,
        });
    };

    const winRate = snap.trades ? (snap.wins * 100) / snap.trades : 0;
    const subscribed = VOL_MARKETS.length;
    const lastTickAt = live.at || (snap.tickCount ? Date.now() : 0);

    const rows = useMemo(() => {
        const q = query.trim().toLowerCase();
        return VOL_MARKETS.filter(m => !q || m.name.toLowerCase().includes(q) || m.symbol.toLowerCase().includes(q)).map(
            m => {
                // The preview feed is always on (matches the reference, which streams while stopped).
                const digits = live.window[m.symbol] || [];
                const last = digits[digits.length - 1];
                const overMet = digits.length > 0 && last <= 1;
                const underMet = digits.length > 0 && last >= 8;
                const stats = parityStats(digits);
                const quote = live.quotes[m.symbol];
                return {
                    key: m.symbol,
                    name: m.name,
                    quote,
                    digits: digits.length ? digits.slice(-3).join(',') : '—',
                    stats,
                    overMet,
                    underMet,
                };
            }
        );
    }, [query, live]);

    return (
        <div className='combined-bots-shell'>
            <div className='combined-bots-shell__content'>
                <div className='christmas-gift-container'>
                    <div className='cg-hero'>
                        <div className='cg-hero__copy'>
                            <h1>Apex Bot</h1>
                            <p>
                                Extreme-digit recovery across {subscribed} volatility markets. Buys Under {UNDER_BARRIER}{' '}
                                after high-digit clusters and Over {OVER_BARRIER} after low-digit clusters, with
                                optional stake recovery.
                            </p>
                        </div>
                        <div className='cg-hero__action'>
                            <span className={`cg-status-pill${snap.running ? ' cg-status-pill--running' : ''}`}>
                                <i className='cg-status-pill__dot' />
                                {snap.running ? 'Running' : 'Stopped'}
                            </span>
                        </div>
                    </div>

                    <div className='cg-top-grid'>
                        <div className='christmas-stats'>
                            <div className='stat-card total'>
                                <h3>Total P/L</h3>
                                <p className={snap.profit > 0 ? 'positive' : snap.profit < 0 ? 'negative' : ''}>
                                    {fmtUsd(snap.profit)}
                                </p>
                            </div>
                            <div className='stat-card win'>
                                <h3>Won</h3>
                                <p>{snap.wins}</p>
                            </div>
                            <div className='stat-card loss'>
                                <h3>Lost</h3>
                                <p>{snap.losses}</p>
                            </div>
                            <div className='stat-card rate'>
                                <h3>Win Rate</h3>
                                <p>{winRate.toFixed(1)}%</p>
                            </div>
                        </div>
                        <div className='christmas-actions'>
                            <button
                                type='button'
                                className={`btn-start${snap.running ? ' running' : ''}`}
                                onClick={() => (snap.running ? session.stop() : session.start())}
                            >
                                {snap.running ? 'Stop Bot' : 'Start Bot'}
                            </button>
                        </div>
                    </div>

                    <div className='cg-dashboard-grid'>
                        <section className='cg-panel cg-panel--risk'>
                            <div className='cg-panel__header'>
                                <h2>Risk Controls</h2>
                                <span>USD</span>
                            </div>
                            <div className='christmas-controls'>
                                <div className='control-group'>
                                    <label>Stake</label>
                                    <input
                                        type='number'
                                        min='0.35'
                                        step='0.1'
                                        value={stake}
                                        onChange={e => sync({ stake: Number(e.target.value) })}
                                    />
                                </div>
                                <div className='control-group'>
                                    <label>Take Profit</label>
                                    <input
                                        type='number'
                                        min='0'
                                        value={takeProfit}
                                        onChange={e => sync({ takeProfit: Number(e.target.value) })}
                                    />
                                </div>
                                <div className='control-group'>
                                    <label>Stop Loss</label>
                                    <input
                                        type='number'
                                        min='0'
                                        value={stopLoss}
                                        onChange={e => sync({ stopLoss: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className='martingale-controls'>
                                <div className='martingale-toggle'>
                                    <label className='toggle-label'>
                                        <span className='toggle-text'>Martingale</span>
                                        <span className='toggle-switch-row'>
                                            <input
                                                type='checkbox'
                                                checked={martingaleOn}
                                                onChange={e => {
                                                    const on = e.target.checked;
                                                    setMartingaleOn(on);
                                                    session.updateOptions({ martingale: on ? martingale || 2 : 1 });
                                                }}
                                            />
                                            <span className='toggle-slider' />
                                        </span>
                                    </label>
                                </div>
                                    <div className='control-group'>
                                        <label>Multiplier</label>
                                        <input
                                            type='number'
                                            min='1.1'
                                            step='0.1'
                                            value={martingale}
                                            onChange={e => {
                                                const value = Number(e.target.value);
                                                setMartingale(value);
                                                if (martingaleOn) session.updateOptions({ martingale: value });
                                            }}
                                        />
                                    </div>
                            </div>
                        </section>
                    </div>

                    <div className='trade-history'>
                        <h3>Trade History</h3>
                        <div className='history-list'>
                            {snap.rows.length ? (
                                <>
                                    <div className='history-row history-row--head'>
                                        <span>Market</span>
                                        <span>Spots</span>
                                        <span>Type</span>
                                        <span>Stake</span>
                                        <span>P/L</span>
                                    </div>
                                    {snap.rows.map(r => (
                                        <div key={r.id} className={`history-row ${r.result || ''}`}>
                                            <span className='history-market'>
                                                <span className='history-symbol'>{r.name}</span>
                                                <span className='history-time'>{fmtTime(r.at)}</span>
                                            </span>
                                            <span className='history-spots' />
                                            <span className='history-type'>{r.contract}</span>
                                            <span className='history-stake'>{r.stake.toFixed(2)}</span>
                                            <span
                                                className={`history-profit${r.result === 'win' ? ' positive' : ' negative'}`}
                                            >
                                                {fmtUsd(r.profit)}
                                            </span>
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <div className='cg-empty-state'>
                                    Trades will appear here after the bot buys a contract.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className='christmas-markets'>
                        <h3>Active Markets ({rows.length}/{subscribed})</h3>
                        <div className='markets-toolbar'>
                            <div className='markets-toolbar__stats'>
                                <span className='markets-stat-chip'>Subscribed {subscribed}/{subscribed}</span>
                                <span className='markets-stat-chip markets-stat-chip--live'>Live {subscribed}</span>
                                <span className='markets-stat-chip'>
                                    {lastTickAt ? `Last tick ${fmtTime(lastTickAt)}` : 'Last tick —'}
                                </span>
                            </div>
                            <div className='markets-toolbar__search'>
                                <input
                                    type='search'
                                    placeholder='Filter by market or symbol'
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className='markets-list'>
                            <div className='market-row market-row--recovery market-row--head'>
                                <span className='market-header-cell'>Market</span>
                                <span className='market-header-cell'>Price</span>
                                <span className='market-header-cell'>Digits</span>
                                <span className='market-header-cell'>Pattern Stats</span>
                                <span className='market-header-cell'>Over Setup</span>
                                <span className='market-header-cell'>Under Setup</span>
                            </div>
                            {rows.map(r => (
                                <div key={r.key} className='market-row market-row--recovery'>
                                    <div className='market-name-wrap'>
                                        <span className='market-name'>{r.name}</span>
                                        <span className='market-meta'>
                                            <span className='market-status-dot market-status-dot--live' />
                                            Live | Subscribed
                                        </span>
                                    </div>
                                    <span className='market-price'>{fmtQuote(r.quote)}</span>
                                    <span className='market-digits'>{r.digits}</span>
                                    <span className={`market-parity${r.stats.match ? ' market-parity--match' : ''}`}>
                                        {r.stats.top} | {r.stats.parity}
                                    </span>
                                    <span className='market-condition'>
                                        Over {OVER_BARRIER}
                                        <span className={`indicator ${r.overMet ? 'met' : 'not-met'}`}>
                                            {r.overMet ? 'Yes' : 'No'}
                                        </span>
                                    </span>
                                    <span className='market-condition'>
                                        Under {UNDER_BARRIER}
                                        <span className={`indicator ${r.underMet ? 'met' : 'not-met'}`}>
                                            {r.underMet ? 'Yes' : 'No'}
                                        </span>
                                    </span>
                                </div>
                            ))}
                            {!rows.length ? <div className='markets-loading'>No markets match “{query}”.</div> : null}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default ApexBotPage;
