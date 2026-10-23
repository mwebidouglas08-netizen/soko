import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { navigateToHubView } from '@/services/hub-navigation';
import { request } from '@/bot/deriv/api';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import templateXml from '@/xml/ai-signal-scanner.xml';
import {
    ANALYSIS_LOGS,
    MEDALS,
    PROFILES,
    STRATEGIES,
    TICK_OPTIONS,
    buildBotXml,
    decimalsOf,
    lastDigit,
    makeNoiseBlock,
    playScanChime,
    sanitizeParams,
    scoreOutcome,
    toPrice,
    type BotParams,
    type Candidate,
    type Market,
    type ScoreHistory,
    type StrategyId,
} from './engine';
import './ai-signal-scanner.scss';

const AISignalScannerPage = () => {
    const { run_panel } = useStore() ?? {};

    const [strategy, setStrategy] = useState<StrategyId>('over_under');
    const [markets, setMarkets] = useState<Market[]>([]);
    const [watch, setWatch] = useState('');
    const [ticks, setTicks] = useState(3000);
    const [confidence, setConfidence] = useState(60);
    const [analysing, setAnalysing] = useState(false);
    const [done, setDone] = useState(false);
    const [pass, setPass] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const [results, setResults] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(false);
    const [configOpen, setConfigOpen] = useState(false);
    const [tick, setTick] = useState<{ price: number | null; digit: number | null }>({ price: null, digit: null });
    const [params, setParams] = useState<BotParams>({
        stake: 0.5,
        martingale: 2,
        numberOfWins: 4,
        stopLoss: 50,
        useMartingale: true,
    });

    const logTimer = useRef<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const stopRef = useRef(false);
    const scoreHistory = useRef<ScoreHistory>(new Map());
    const [bg, setBg] = useState<string>(makeNoiseBlock);

    // Scrolling console-noise background, refreshed every 200ms like the reference.
    useEffect(() => {
        const timer = window.setInterval(() => setBg(`${makeNoiseBlock()}\n${makeNoiseBlock()}`), 200);
        return () => window.clearInterval(timer);
    }, []);

    // Discover every volatility index once the socket is ready.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data } = await request<any>({ active_symbols: 'brief' }, 20000);
            const list: Market[] = (data?.active_symbols ?? [])
                .filter((s: any) => s.submarket === 'random_index')
                .map((s: any) => ({
                    symbol: s.symbol ?? s.underlying_symbol,
                    displayName: s.display_name ?? s.underlying_symbol_name ?? s.symbol,
                }))
                .filter((m: Market) => !!m.symbol);
            if (!cancelled && list.length) setMarkets(list);
        })().catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, []);

    // Live "Latest Tick" readout for the chosen watch market.
    useEffect(() => {
        const api = api_base.api;
        if (!api || !watch) {
            setTick({ price: null, digit: null });
            return;
        }
        setTick({ price: null, digit: null });
        api.send({ forget_all: 'ticks' });
        api.send({ ticks: watch, subscribe: 1 });
        const subscription = api.onMessage().subscribe((message: any) => {
            const data = message?.data;
            if (data?.msg_type !== 'tick' || !data.tick || data.tick.symbol !== watch) return;
            const price = toPrice(data.tick.quote ?? data.tick.ask);
            if (price === null) return;
            setTick({ price, digit: lastDigit(price, decimalsOf(price)) });
        });
        return () => {
            subscription?.unsubscribe?.();
            api.send({ forget_all: 'ticks' });
        };
    }, [watch]);

    const pushLog = useCallback((line: string) => {
        setLogs(prev => [...prev.slice(-30), line]);
    }, []);

    const clearTimers = useCallback(() => {
        if (logTimer.current) {
            window.clearInterval(logTimer.current);
            logTimer.current = null;
        }
        const audio = audioRef.current;
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    }, []);

    useEffect(() => clearTimers, [clearTimers]);

    const scanPass = useCallback(
        async (passNumber: number): Promise<Candidate[]> => {
            const profiles = PROFILES[strategy];
            const found: Candidate[] = [];
            for (let i = 0; i < markets.length && !stopRef.current; i += 1) {
                const market = markets[i];
                pushLog(`[INFO] Pass ${passNumber} — scanning ${market.displayName} (${i + 1}/${markets.length})...`);
                try {
                    const { data } = await request<any>(
                        { ticks_history: market.symbol, count: ticks, end: 'latest', style: 'ticks' },
                        20000
                    );
                    const prices = ((data?.history?.prices ?? []) as unknown[])
                        .map(toPrice)
                        .filter(p => p !== null) as number[];
                    if (prices.length < 100) continue;
                    let sequence: unknown[];
                    if (strategy === 'rise_fall') {
                        sequence = [];
                        for (let t = 1; t < prices.length; t += 1) {
                            if (prices[t] > prices[t - 1]) sequence.push('up');
                            else if (prices[t] < prices[t - 1]) sequence.push('down');
                        }
                    } else {
                        const decimals = decimalsOf(prices[prices.length - 1]);
                        sequence = prices.map(p => lastDigit(p, decimals)).filter(d => d !== null);
                    }
                    let best: Candidate | null = null;
                    for (const profile of profiles) {
                        const key = `${strategy}:${market.symbol}:${profile.id}`;
                        const score = scoreOutcome(sequence, profile, key, scoreHistory.current);
                        if (score && (!best || score.finalScore > best.finalScore)) {
                            best = {
                                symbol: market.symbol,
                                marketName: market.displayName,
                                profile,
                                finalScore: score.finalScore,
                                reasons: score.reasons,
                            };
                        }
                    }
                    if (best && best.finalScore >= confidence) found.push(best);
                } catch {
                    /* market skipped on request failure */
                }
            }
            found.sort((a, b) => b.finalScore - a.finalScore);
            return found;
        },
        [strategy, markets, ticks, confidence, pushLog]
    );

    const stopScan = useCallback(() => {
        stopRef.current = true;
        pushLog('[WARNING] Stop requested — finishing current market...');
    }, [pushLog]);

    const analyse = useCallback(async () => {
        if (!api_base.api) {
            setLogs(['[ERROR] API is not ready. Connect an account first.']);
            return;
        }
        if (!markets.length) {
            setLogs(['[ERROR] No volatility markets discovered yet. Try again in a moment.']);
            return;
        }
        stopRef.current = false;
        setAnalysing(true);
        setDone(false);
        setResults([]);
        setPass(0);
        setLogs(['[INFO] Connecting to server...']);
        let logIndex = 0;
        logTimer.current = window.setInterval(() => {
            setLogs(prev => [...prev.slice(-30), ANALYSIS_LOGS[logIndex % ANALYSIS_LOGS.length]]);
            logIndex += 1;
        }, 260);
        const audio = audioRef.current;
        if (audio) {
            audio.currentTime = 0;
            audio.loop = true;
            audio.play().catch(() => undefined);
        }
        try {
            let found: Candidate[] = [];
            let currentPass = 0;
            for (
                ;
                !stopRef.current && currentPass < 40 &&
                ((currentPass += 1), setPass(currentPass), !((found = await scanPass(currentPass)).length > 0) && !stopRef.current);
                // eslint-disable-next-line no-empty
            ) {
                pushLog(
                    `[WARNING] No market cleared ${confidence}% on pass ${currentPass}. Re-scanning...`
                );
            }
            setResults(found.slice(0, 10));
            if (found.length > 0) playScanChime();
        } finally {
            clearTimers();
            setAnalysing(false);
            setDone(true);
        }
    }, [markets, confidence, scanPass, pushLog, clearTimers]);

    const best = results[0] ?? null;
    const openConfig = useCallback(() => {
        if (best) setConfigOpen(true);
    }, [best]);

    const launchBot = useCallback(async () => {
        if (!best) return;
        const blockly = (window as any).Blockly;
        if (!blockly?.derivWorkspace) return;
        setLoading(true);
        try {
            const safe = sanitizeParams(params);
            const xml = buildBotXml(best, safe, templateXml);
            const dom = blockly.utils.xml.textToDom(xml);
            blockly.Xml.clearWorkspaceAndLoadFromXml(dom, blockly.derivWorkspace);
            blockly.derivWorkspace.strategy_to_load = xml;
            setConfigOpen(false);
            navigateToHubView('bot-builder');
            if (!run_panel?.is_running) await run_panel?.onRunButtonClick?.();
            setResults([]);
            setDone(false);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [best, params, run_panel]);

    const popupVisible = analysing || done;

    return (
        <div className='signal-ai-page'>
            <div className='signal-ai__bg' aria-hidden='true'>
                <div className='signal-ai__bg-text'>{bg}</div>
            </div>
            <div className='signal-ai__container'>
                <h1>Signal AI</h1>
                <div className='signal-ai__row signal-ai__row--primary'>
                    <div>
                        <label className='signal-ai__label' htmlFor='signal-ai-strategy'>
                            Select Strategy
                        </label>
                        <select
                            id='signal-ai-strategy'
                            className='signal-ai__dropdown'
                            value={strategy}
                            onChange={e => {
                                setStrategy(e.target.value as StrategyId);
                                setResults([]);
                                setDone(false);
                            }}
                            disabled={analysing}
                        >
                            {Object.keys(STRATEGIES).map(key => (
                                <option key={key} value={key}>
                                    {STRATEGIES[key as StrategyId]}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className='signal-ai__label' htmlFor='signal-ai-watch'>
                            Watch Market
                        </label>
                        <select
                            id='signal-ai-watch'
                            className='signal-ai__dropdown'
                            value={watch}
                            onChange={e => setWatch(e.target.value)}
                        >
                            <option value=''>— Off —</option>
                            {markets.map(m => (
                                <option key={m.symbol} value={m.symbol}>
                                    {m.displayName}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className='signal-ai__row'>
                    <div>
                        <label className='signal-ai__label' htmlFor='signal-ai-ticks'>
                            Ticks
                        </label>
                        <select
                            id='signal-ai-ticks'
                            className='signal-ai__dropdown'
                            value={ticks}
                            onChange={e => setTicks(Number(e.target.value))}
                            disabled={analysing}
                        >
                            {TICK_OPTIONS.map(option => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className='signal-ai__label' htmlFor='signal-ai-confidence'>
                            Min Confidence %
                        </label>
                        <input
                            id='signal-ai-confidence'
                            type='number'
                            className='signal-ai__dropdown'
                            min={50}
                            max={95}
                            step={5}
                            value={confidence}
                            onChange={e => setConfidence(Number(e.target.value))}
                            disabled={analysing}
                        />
                    </div>
                </div>
                <div className='signal-ai__contain'>
                    <div className='signal-ai__latest-tick'>
                        Latest Tick:{' '}
                        {tick.price !== null ? (
                            <span className='signal-ai__market-price'>
                                {tick.price.toFixed(decimalsOf(tick.price)).slice(0, -1)}
                                <strong className='signal-ai__market-last-digit'>
                                    {tick.price.toFixed(decimalsOf(tick.price)).slice(-1)}
                                </strong>
                            </span>
                        ) : (
                            <span>--</span>
                        )}
                    </div>
                </div>
                <div className='signal-ai__buttons'>
                    <button type='button' className='signal-ai__analyse' onClick={analyse} disabled={analysing}>
                        {analysing ? 'Analysing...' : 'Analyse'}
                    </button>
                </div>
            </div>
            {popupVisible && (
                <div className='signal-ai__popup'>
                    <div className='signal-ai__popup-content'>
                        <button
                            type='button'
                            className='signal-ai__close-btn'
                            onClick={() => {
                                if (analysing) stopScan();
                                setDone(false);
                                setResults([]);
                            }}
                        >
                            X
                        </button>
                        <div className='signal-ai__terminal-header'>
                            <span className='signal-ai__dot signal-ai__dot--red' />
                            <span className='signal-ai__dot signal-ai__dot--yellow' />
                            <span className='signal-ai__dot signal-ai__dot--green' />
                        </div>
                        <div className='signal-ai__terminal-dashboard'>
                            {analysing
                                ? `Analysis Dashboard — ${STRATEGIES[strategy]} — Pass ${pass}`
                                : results.length
                                    ? 'Analysis Complete!'
                                    : 'No High-Quality Signal'}
                        </div>
                        {analysing && (
                            <>
                                <div className='signal-ai__terminal-scroll'>
                                    {logs.map((line, i) => (
                                        <p key={`${line}-${i}`} className='signal-ai__log-line'>
                                            {line}
                                        </p>
                                    ))}
                                </div>
                                <div className='signal-ai__buttons'>
                                    <button type='button' className='signal-ai__stop-btn' onClick={stopScan}>
                                        Stop Scanning
                                    </button>
                                </div>
                            </>
                        )}
                        {!analysing && done && results.length === 0 && (
                            <p className='signal-ai__log-line signal-ai__log-line--red'>
                                No market cleared the {confidence}% confidence threshold after {pass} pass
                                {pass === 1 ? '' : 'es'}. Try again shortly.
                            </p>
                        )}
                        {!analysing && results.length > 0 && best && (
                            <div className='signal-ai__results'>
                                <table className='signal-ai__leaderboard'>
                                    <thead>
                                        <tr>
                                            <th>Rank</th>
                                            <th>Market</th>
                                            <th>Signal</th>
                                            <th>Confidence</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.map((row, i) => (
                                            <tr key={`${row.symbol}-${row.profile.id}`} className={i === 0 ? 'is-best' : ''}>
                                                <td>{MEDALS[i] ?? i + 1}</td>
                                                <td>{row.marketName}</td>
                                                <td>{row.profile.label}</td>
                                                <td>{row.finalScore}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className='signal-ai__best-opportunity'>
                                    <p className='signal-ai__best-title'>Best Opportunity</p>
                                    <p>
                                        Market: <strong>{best.marketName}</strong>
                                    </p>
                                    <p>
                                        Trade: <strong>{best.profile.label}</strong>
                                    </p>
                                    <p>
                                        Confidence: <strong>{best.finalScore}%</strong>
                                    </p>
                                    <p>Reason:</p>
                                    <ul>
                                        {best.reasons.map(reason => (
                                            <li key={reason}>{reason}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className='signal-ai__buttons'>
                                    <button type='button' className='signal-ai__analyse' onClick={analyse} disabled={analysing}>
                                        Scan Again
                                    </button>
                                    <button
                                        type='button'
                                        className='signal-ai__analyse signal-ai__analyse--load'
                                        onClick={openConfig}
                                        disabled={loading}
                                    >
                                        {loading ? 'Loading...' : 'Load Signal Bot'}
                                    </button>
                                </div>
                            </div>
                        )}
                        {!analysing && done && results.length === 0 && (
                            <div className='signal-ai__buttons'>
                                <button type='button' className='signal-ai__analyse' onClick={analyse}>
                                    Scan Again
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {configOpen && best && (
                <div className='signal-ai__popup-overlay' onClick={() => !loading && setConfigOpen(false)}>
                    <div className='signal-ai__config-popup' onClick={e => e.stopPropagation()}>
                        <h3>Bot Parameters</h3>
                        <div className='signal-ai__config-body'>
                            <label>
                                <span>Stake</span>
                                <input
                                    type='number'
                                    min='0.35'
                                    step='0.01'
                                    value={params.stake}
                                    onChange={e => setParams(prev => ({ ...prev, stake: Number(e.target.value) }))}
                                    disabled={loading}
                                />
                            </label>
                            <label>
                                <span>Martingale</span>
                                <input
                                    type='number'
                                    min='1'
                                    step='0.1'
                                    value={params.martingale}
                                    onChange={e => setParams(prev => ({ ...prev, martingale: Number(e.target.value) }))}
                                    disabled={loading}
                                />
                            </label>
                            <label>
                                <span>Number of Wins (stop after)</span>
                                <input
                                    type='number'
                                    min='1'
                                    step='1'
                                    value={params.numberOfWins}
                                    onChange={e => setParams(prev => ({ ...prev, numberOfWins: Number(e.target.value) }))}
                                    disabled={loading}
                                />
                            </label>
                            <label>
                                <span>Stop Loss</span>
                                <input
                                    type='number'
                                    min='1'
                                    step='1'
                                    value={params.stopLoss}
                                    onChange={e => setParams(prev => ({ ...prev, stopLoss: Number(e.target.value) }))}
                                    disabled={loading}
                                />
                            </label>
                            <div className='signal-ai__config-toggle'>
                                <span>Use Martingale</span>
                                <button
                                    type='button'
                                    className={`signal-ai__toggle-switch ${params.useMartingale ? 'is-on' : 'is-off'}`}
                                    onClick={() => setParams(prev => ({ ...prev, useMartingale: !prev.useMartingale }))}
                                    disabled={loading}
                                >
                                    <span className='signal-ai__toggle-knob' />
                                    <span className='signal-ai__toggle-label'>{params.useMartingale ? 'ON' : 'OFF'}</span>
                                </button>
                            </div>
                        </div>
                        <div className='signal-ai__buttons'>
                            <button type='button' onClick={() => setConfigOpen(false)} disabled={loading}>
                                Cancel
                            </button>
                            <button type='button' className='signal-ai__analyse' onClick={launchBot} disabled={loading}>
                                {loading ? 'Loading...' : 'Launch Bot'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <audio ref={audioRef} preload='auto' src='https://www.fesliyanstudios.com/play-mp3/4386' />
        </div>
    );
};

export default AISignalScannerPage;
