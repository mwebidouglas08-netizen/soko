import { useCallback, useEffect, useState } from 'react';
import { useAIBot, useOUBotEngine } from '@/bot/use-engine';
import { aiBot } from '@/bot/engine/ai-bot';
import { ouBotEngine } from '@/bot/engine/engine';
import { soundService } from '@/services/sound-service';
import { voiceService } from '@/services/voice-service';
import './ai-scanner.scss';
import './ai-scanner-toast.scss';

type View = 'chooser' | 'entry' | 'pro';

/* ------------------------------- icons ------------------------------- */
const ScanSearchIcon = ({ size = 40, stroke = 1.5 }: { size?: number; stroke?: number }) => (
    <svg xmlns='http://www.w3.org/2000/svg' width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={stroke} strokeLinecap='round' strokeLinejoin='round'>
        <path d='M3 7V5a2 2 0 0 1 2-2h2' />
        <path d='M17 3h2a2 2 0 0 1 2 2v2' />
        <path d='M21 17v2a2 2 0 0 1-2 2h-2' />
        <path d='M7 21H5a2 2 0 0 1-2-2v-2' />
        <circle cx='12' cy='12' r='3' />
        <path d='m16 16-1.9-1.9' />
    </svg>
);
const BrainCircuitIcon = ({ size = 40 }: { size?: number }) => (
    <svg xmlns='http://www.w3.org/2000/svg' width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.5} strokeLinecap='round' strokeLinejoin='round'>
        <path d='M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z' />
        <path d='M9 13a4.5 4.5 0 0 0 3-4' />
        <path d='M6.003 5.125A3 3 0 0 0 6.401 6.5' />
        <path d='M3.477 10.896a4 4 0 0 1 .585-.396' />
        <path d='M6 18a4 4 0 0 1-1.967-.516' />
        <path d='M12 13h4' />
        <path d='M12 18h6a2 2 0 0 1 2 2v1' />
        <path d='M12 8h8' />
        <path d='M16 8V5a2 2 0 0 1 2-2' />
        <circle cx='16' cy='13' r='.5' />
        <circle cx='18' cy='3' r='.5' />
        <circle cx='20' cy='21' r='.5' />
        <circle cx='20' cy='8' r='.5' />
    </svg>
);
const BotIcon = ({ size = 17, stroke = 2 }: { size?: number; stroke?: number }) => (
    <svg xmlns='http://www.w3.org/2000/svg' width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={stroke} strokeLinecap='round' strokeLinejoin='round'>
        <path d='M12 8V4H8' />
        <rect width='16' height='12' x='4' y='8' rx='2' />
        <path d='M2 14h2' />
        <path d='M20 14h2' />
        <path d='M15 13v2' />
        <path d='M9 13v2' />
    </svg>
);
const SparklesIcon = ({ size = 14 }: { size?: number }) => (
    <svg xmlns='http://www.w3.org/2000/svg' width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} strokeLinecap='round' strokeLinejoin='round'>
        <path d='M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z' />
        <path d='M20 3v4' />
        <path d='M22 5h-4' />
        <path d='M4 17v2' />
        <path d='M5 18H3' />
    </svg>
);
const CloseIcon = () => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' width='20px' height='20px' fill='currentColor'>
        <path d='M3.854 3.146 8 7.293l4.146-4.147a.5.5 0 0 1 .708.708L8.707 8l4.147 4.146a.5.5 0 0 1-.708.708L8 8.707l-4.146 4.147a.5.5 0 0 1-.708-.708L7.293 8 3.146 3.854a.5.5 0 1 1 .708-.708' />
    </svg>
);

/* --------------------------- barrier presets --------------------------- */
const BARRIER_PRESETS = [
    { key: 'O1U8', label: 'Over1 / Under8', short: 'O1 / U8', over: [1], under: [8] },
    { key: 'O2U7', label: 'Over2 / Under7', short: 'O2 / U7', over: [2], under: [7] },
    { key: 'O3U6', label: 'Over3 / Under6', short: 'O3 / U6', over: [3], under: [6] },
] as const;
type PresetKey = (typeof BARRIER_PRESETS)[number]['key'];

const PARTS = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100', '1HZ100V', '1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', 'stpRNG', 'BOOM1000', 'BOOM500', 'CRASH1000', 'CRASH500'];
const NAME_OVERRIDES: Record<string, string> = {
    R_10: 'Volatility 10 Index',
    R_25: 'Volatility 25 Index',
    R_50: 'Volatility 50 Index',
    R_75: 'Volatility 75 Index',
    R_100: 'Volatility 100 Index',
    '1HZ100V': 'Volatility 100 (1s) Index',
    '1HZ10V': 'Volatility 10 (1s) Index',
    '1HZ25V': 'Volatility 25 (1s) Index',
    '1HZ50V': 'Volatility 50 (1s) Index',
    '1HZ75V': 'Volatility 75 (1s) Index',
    stpRNG: 'Step Index',
    BOOM1000: 'Boom 1000 Index',
    BOOM500: 'Boom 500 Index',
    CRASH1000: 'Crash 1000 Index',
    CRASH500: 'Crash 500 Index',
};

/* =================================================================== *
 * Entry Scanner panel
 * =================================================================== */
const EntryScanner = ({ onBack, onLoadBot }: { onBack: () => void; onLoadBot: (xml: string, name: string) => void }) => {
    const engine = useOUBotEngine();
    const [preset, setPreset] = useState<PresetKey>('O1U8');
    const [ticks, setTicks] = useState(3000);
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<{ symbol: string; name: string; tradeType: string; confidence: number } | null>(null);
    const [status, setStatus] = useState<{ tone: 'idle' | 'scanning' | 'ready' | 'warning'; text: string }>({
        tone: 'idle',
        text: 'Not scanned yet',
    });

    const active = BARRIER_PRESETS.find(p => p.key === preset)!;

    const scan = useCallback(async () => {
        setScanning(true);
        setStatus({ tone: 'scanning', text: 'Scanning volatility markets…' });
        setResult(null);
        try {
            // Kick the engine's scanner if idle so it collects ticks.
            if (!['starting', 'scanning', 'proposing', 'buying', 'monitoring'].includes(engine.status)) {
                await ouBotEngine.start({
                    barriersOver: active.over,
                    barriersUnder: active.under,
                    minTicksForAnalysis: Math.min(ticks, 300),
                } as any).catch(() => undefined);
            } else {
                ouBotEngine.configure({ barriersOver: [...active.over], barriersUnder: [...active.under] });
            }
            // Give it a moment to accumulate series, then evaluate.
            await new Promise(r => setTimeout(r, 4000));
            const rows = ouBotEngine.getMarketsAnalysis() as any[];
            let best: any = null;
            for (const r of rows) {
                if (r.stale) continue;
                const stats = r.stats ?? {};
                const over = Number(stats.over ?? 0);
                const under = Number(stats.under ?? 0);
                // Prefer the direction that best matches the preset.
                const score = active.over[0] <= 3 ? over : under;
                if (!best || score > best.score) best = { ...r, score };
            }
            if (!best) {
                setStatus({ tone: 'warning', text: 'Not enough tick data yet — try again in a few seconds.' });
            } else {
                const name = NAME_OVERRIDES[best.symbol?.symbol] ?? best.symbol?.symbol ?? 'Unknown';
                const tradeType = active.over[0] <= 3 ? `Over ${active.over[0]}` : `Under ${active.under[0]}`;
                const confidence = Math.round(best.score);
                setResult({ symbol: best.symbol?.symbol, name, tradeType, confidence });
                setStatus({ tone: 'ready', text: `Best market found: ${name}` });
                // Strong hit — ping + spoken announcement.
                if (confidence >= 60) {
                    soundService.play('signal');
                    voiceService.announceScannerHit({
                        bot: 'Entry Scanner',
                        market: name,
                        signal: tradeType,
                        confidence,
                    });
                }
            }
        } catch {
            setStatus({ tone: 'warning', text: 'Scan failed — check your connection.' });
        } finally {
            setScanning(false);
        }
    }, [engine.status, ticks, active]);

    const loadBot = () => {
        // Build a minimal OU strategy XML stub wired to the chosen market/preset.
        const xml = `<xml xmlns="https://developers.google.com/blockly/xml"><block type="trade" x="10" y="10"><field name="MARKET">synthetic_index</field><field name="SUBMARKET">random_index</field><field name="SYMBOL">${result?.symbol ?? 'R_75'}</field></block></xml>`;
        onLoadBot(xml, `Entry Scanner — ${result?.name ?? active.label}`);
    };

    return (
        <div className='entry-scanner'>
            <button type='button' className='scanner-back' onClick={onBack}>Back to scanner options</button>

            <section className='entry-scanner__hero-shell'>
                <div className='entry-scanner__orb entry-scanner__orb--one' />
                <div className='entry-scanner__orb entry-scanner__orb--two' />
                <div className='entry-scanner__hero-left'>
                    <div className='entry-scanner__eyebrow'>
                        <SparklesIcon />
                        <span>Recovery Engine</span>
                    </div>
                    <h2>{active.label} Scanner</h2>
                    <p>Scans Over {active.over[0]} and Under {active.under[0]} with recovery confirmation.</p>
                </div>
                <div className='entry-scanner__radar-card' aria-hidden='true'>
                    <div className='entry-scanner__radar'>
                        <span className='entry-scanner__radar-ring entry-scanner__radar-ring--one' />
                        <span className='entry-scanner__radar-ring entry-scanner__radar-ring--two' />
                        <span className='entry-scanner__radar-ring entry-scanner__radar-ring--three' />
                        <span className='entry-scanner__radar-sweep' />
                        <span className='entry-scanner__radar-dot entry-scanner__radar-dot--one' />
                        <span className='entry-scanner__radar-dot entry-scanner__radar-dot--two' />
                        <span className='entry-scanner__radar-dot entry-scanner__radar-dot--three' />
                        <ScanSearchIcon size={28} stroke={2.4} />
                    </div>
                </div>
            </section>

            <div className='entry-scanner__tabs'>
                {BARRIER_PRESETS.map(p => (
                    <button
                        key={p.key}
                        type='button'
                        className={`entry-scanner__tab ${preset === p.key ? 'is-active' : ''}`}
                        onClick={() => setPreset(p.key)}
                    >
                        <span className='entry-scanner__tab-label'>{p.label}</span>
                        <span className='entry-scanner__tab-short'>{p.short}</span>
                    </button>
                ))}
            </div>

            <section className='entry-scanner__panel entry-scanner__panel--hero'>
                <div className='entry-scanner__mini-stats'>
                    <div><span>Scan Depth</span><strong>{ticks}</strong></div>
                    <div><span>Mode</span><strong>{active.short}</strong></div>
                </div>
                <label className='entry-scanner__field entry-scanner__field--compact'>
                    <span>Ticks</span>
                    <input type='number' min={100} max={5000} step={100} value={ticks} onChange={e => setTicks(Number(e.target.value))} />
                </label>
            </section>

            <section className='entry-scanner__panel entry-scanner__panel--selection'>
                <div className='entry-scanner__selection-grid'>
                    <label className='entry-scanner__field'>
                        <span>Selected Market</span>
                        <input type='text' readOnly value={result ? result.name : 'Scan to find the best market'} />
                    </label>
                    <label className='entry-scanner__field'>
                        <span>Trade Type</span>
                        <input type='text' readOnly value={result ? result.tradeType : 'Waiting for scan'} />
                    </label>
                </div>
            </section>

            <div className={`entry-scanner__status entry-scanner__status--${status.tone}`}>
                <BotIcon size={18} stroke={2.4} />
                <span>{status.text}{result ? ` · confidence ${result.confidence}%` : ''}</span>
            </div>

            <div className='entry-scanner__actions'>
                <button type='button' className='entry-scanner__primary-btn' onClick={scan} disabled={scanning}>
                    <ScanSearchIcon size={17} stroke={2} />
                    <span>{scanning ? 'Scanning…' : 'Scan Markets'}</span>
                </button>
                <button
                    type='button'
                    className={`entry-scanner__secondary-btn ${result ? 'entry-scanner__secondary-btn--ready' : ''}`}
                    disabled={!result}
                    onClick={loadBot}
                >
                    <BotIcon />
                    <span>Load Scanner Bot</span>
                </button>
            </div>
        </div>
    );
};

/* =================================================================== *
 * Pro AI panel
 * =================================================================== */
const ProAIPanel = ({ onBack }: { onBack: () => void }) => {
    const ai = useAIBot();
    const [stake, setStake] = useState(1);
    const [martingale, setMartingale] = useState(2);
    const [takeProfit, setTakeProfit] = useState(10);
    const [stopLoss, setStopLoss] = useState(10);
    const running = ['starting', 'scanning', 'proposing', 'buying', 'monitoring'].includes(ai.status);

    const start = () => {
        aiBot.configure({
            stake,
            martingaleEnabled: martingale > 1,
            martingaleMultiplier: martingale,
            takeProfit,
            stopLoss,
            autoTrade: true,
            symbols: ['R_10', 'R_25', 'R_50', 'R_75', 'R_100', '1HZ100V'],
        } as any);
        aiBot.start({} as any);
    };

    return (
        <div className='pro-scanner'>
            <div className='pro-scanner__head'>
                <button type='button' className='pro-scanner__back' onClick={onBack}>BACK</button>
            </div>
            <div className='pro-scanner__hero'>
                <h2>Pro AI</h2>
                <p>Volatility &amp; Jump indices</p>
                <p>Over 2 / Under 8</p>
            </div>

            <div className='pro-scanner__settings'>
                <span className='pro-scanner__label'>Session Settings</span>
                <div className='pro-scanner__grid'>
                    <label className='pro-scanner__field'>
                        <span>STAKE (USD)</span>
                        <input type='number' min={0.35} step={0.35} value={stake} onChange={e => setStake(Number(e.target.value))} />
                    </label>
                    <label className='pro-scanner__field'>
                        <span>MARTINGALE</span>
                        <input type='number' min={1} step={0.5} value={martingale} onChange={e => setMartingale(Number(e.target.value))} />
                    </label>
                    <label className='pro-scanner__field'>
                        <span>TAKE PROFIT (USD)</span>
                        <input type='number' min={0} step={1} value={takeProfit} onChange={e => setTakeProfit(Number(e.target.value))} />
                    </label>
                    <label className='pro-scanner__field'>
                        <span>STOP LOSS (USD)</span>
                        <input type='number' min={0} step={1} value={stopLoss} onChange={e => setStopLoss(Number(e.target.value))} />
                    </label>
                </div>
            </div>

            <div className='pro-scanner__info'>
                <span>Status</span>
                <strong>{ai.status}</strong>
            </div>

            <div className='pro-scanner__actions'>
                {!running ? (
                    <button type='button' className='entry-scanner__primary-btn' onClick={start}>
                        <BotIcon size={17} />
                        <span>Scan &amp; start</span>
                    </button>
                ) : (
                    <button type='button' className='pro-scanner__stop' onClick={() => aiBot.stop()}>
                        ■ Stop
                    </button>
                )}
            </div>
        </div>
    );
};

/* =================================================================== *
 * Floating AI Scanner (button + modals)
 * =================================================================== */
const AIBotDock = () => {
    const ai = useAIBot();
    const [view, setView] = useState<View | null>(null);
    const [hovered, setHovered] = useState(false);
    const [selected, setSelected] = useState<'entry' | 'pro'>('entry');
    const [showStart, setShowStart] = useState(false);

    const running = ['starting', 'scanning', 'proposing', 'buying', 'monitoring'].includes(ai.status);

    // Reference behaviour: when a bot is loaded into the builder, the floating
    // AI bot pulses and announces it, so the user knows the strategy is ready
    // to run. We surface a transient "loaded" state on the dock.
    const [loadedName, setLoadedName] = useState<string | null>(null);
    useEffect(() => {
        const onLoaded = (e: Event) => {
            const name = (e as CustomEvent<{ name?: string }>).detail?.name;
            setLoadedName(name || 'Bot');
            window.setTimeout(() => setLoadedName(null), 6000);
        };
        window.addEventListener('mwx:bot-loaded', onLoaded as EventListener);
        return () => window.removeEventListener('mwx:bot-loaded', onLoaded as EventListener);
    }, []);

    // Reference behaviour: the floating button toggles the chooser on release.
    const toggle = () => setView(v => (v ? null : 'chooser'));

    // Close on Escape.
    useEffect(() => {
        if (view === null) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setView(null);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [view]);

    const loadBot = useCallback((xml: string, name: string) => {
        try {
            // Hand the strategy to the DBot builder if available.
            const w = window as any;
            if (w.Blockly && w.Blockly.utils?.xml?.textToDom) {
                const dom = w.Blockly.utils.xml.textToDom(xml);
                w.Blockly.Xml?.clearWorkspaceAndLoadFromXml?.(dom, w.__droidWorkspace);
            }
        } catch {
            /* noop */
        }
        setView(null);
        // Navigate to Bot Builder tab if a handler is exposed.
        (window as any).__loadScannerBot?.(xml, name);
    }, []);

    return (
        <>
            <div
                className={`ai-scanner-button ai-scanner-button--pulsing ${hovered ? 'ai-scanner-button--hovered' : ''}`}
                onClick={toggle}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle())}
                onPointerEnter={() => setHovered(true)}
                onPointerLeave={() => setHovered(false)}
                role='button'
                tabIndex={0}
                aria-label='Open AI Scanner'
            >
                <div className='ai-scanner-button__main'>
                    <div className='ai-scanner-button__radar'>
                        <div className='ai-scanner-button__radar-beam' />
                    </div>
                    <span className='ai-scanner-button__icon' aria-hidden='true'>
                        <svg viewBox='0 0 64 64' width='64' height='64'>
                            <text x='32' y='42' textAnchor='middle' fontSize='25' fontWeight='800' fill='currentColor' fontFamily='Arial, sans-serif'>
                                AI
                            </text>
                        </svg>
                    </span>
                    <span className='ai-scanner-button__scan-lines' aria-hidden='true'>
                        <svg viewBox='0 0 52 52' width='52' height='52' fill='none' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round'>
                            <path d='M12 19h16M24 33h16' />
                        </svg>
                    </span>
                    <span className='ai-scanner-button__status'>
                        <span className='ai-scanner-button__status-dot' />
                    </span>
                </div>
                <div className='ai-scanner-button__label'>
                    <span className='ai-scanner-button__label-text'>AI</span>
                    <span className='ai-scanner-button__label-subtext'>AI Scanner</span>
                </div>
            </div>

            {loadedName && (
                <div className='ai-scanner-toast' role='status'>
                    <BotIcon size={16} stroke={2.2} />
                    <span>
                        <strong>{loadedName}</strong> loaded {'\u2014'} press Run to start it.
                    </span>
                </div>
            )}

            {view && (
                <div className='ai-scan-modal-overlay' onClick={() => setView(null)}>
                    <div
                        className={`ai-scan-modal ${view === 'chooser' ? 'ai-scan-modal--chooser' : 'ai-scan-modal--entry'}`}
                        onClick={e => e.stopPropagation()}
                        role='dialog'
                        aria-label='AI Scanner'
                    >
                        <div className='ai-scan-modal__header'>
                            <h3 className='ai-scan-modal__title'>{view === 'chooser' ? 'AI Scanner' : view === 'entry' ? 'Entry Scanner' : 'Pro AI'}</h3>
                            <button type='button' className='ai-scan-modal__close' onClick={() => setView(null)} aria-label='Close'>
                                <CloseIcon />
                            </button>
                        </div>
                        <div className='ai-scan-modal__body'>
                            {view === 'chooser' && (
                                <div className='scanner-hub'>
                                    <button
                                        type='button'
                                        className={`scanner-path scanner-path--entry ${selected === 'entry' ? 'is-selected' : ''}`}
                                        onClick={() => setView('entry')}
                                        onMouseEnter={() => { setSelected('entry'); setShowStart(true); }}
                                        onFocus={() => { setSelected('entry'); setShowStart(true); }}
                                    >
                                        <span className='scanner-path__top'>
                                            <span className='scanner-path__icon' aria-hidden='true'>
                                                <ScanSearchIcon />
                                                <small>01</small>
                                            </span>
                                            <span className='scanner-path__help' title='Find a market and load its settings into your bot.'>?</span>
                                        </span>
                                        <span className='scanner-path__copy'>
                                            <strong>Entry Scanner</strong>
                                            <span>Find a market and load its settings into your bot.</span>
                                            <span className='scanner-path__tags'><b>MARKET SCAN</b><b>BOT SETUP</b></span>
                                        </span>
                                    </button>
                                    <button
                                        type='button'
                                        className={`scanner-path scanner-path--pro ${selected === 'pro' ? 'is-selected' : ''}`}
                                        onClick={() => setView('pro')}
                                        onMouseEnter={() => { setSelected('pro'); setShowStart(true); }}
                                        onFocus={() => { setSelected('pro'); setShowStart(true); }}
                                    >
                                        <span className='scanner-path__top'>
                                            <span className='scanner-path__icon' aria-hidden='true'>
                                                <BrainCircuitIcon />
                                                <small>02</small>
                                            </span>
                                            <span className='scanner-path__help' title='Scan eligible markets and execute trades with automatic recovery selection.'>?</span>
                                        </span>
                                        <span className='scanner-path__copy'>
                                            <strong>Pro AI</strong>
                                            <span>Scan eligible markets and execute trades with automatic recovery selection.</span>
                                            <span className='scanner-path__tags'><b>AUTO TRADE</b><b>SESSION LIMITS</b></span>
                                        </span>
                                    </button>
                                    {showStart && (
                                        <div className='scanner-hub__foot'>
                                            <button type='button' className='scanner-hub__start' onClick={() => setView(selected)}>
                                                <span>Start Scanner</span>
                                                <span aria-hidden='true'>→</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {view === 'entry' && <EntryScanner onBack={() => setView('chooser')} onLoadBot={loadBot} />}
                            {view === 'pro' && <ProAIPanel onBack={() => setView('chooser')} />}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AIBotDock;
