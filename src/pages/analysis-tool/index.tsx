import { useEffect, useMemo, useRef, useState } from 'react';
import { HubNote, HubPage } from '@/components/hub-page';
import { soundService } from '@/services/sound-service';
import { voiceService } from '@/services/voice-service';
import {
    PDT_MARKETS,
    barrierSplit,
    calculateAnalysis,
    generateEvenOddSignal,
    generateMatchesDiffersSignal,
    generateOverUnderSignal,
    generateRiseFallSignal,
    validateSignalAgainstContract,
    type ContractCategory,
    type MarketAnalysis,
    type PdtMarket,
    type PdtSignal,
} from './engine';
import { useFeedStatus, useMarketFeed } from './use-feed';
import {
    addHistoryRecord,
    clearHistory,
    resetSettings,
    useScannerStore,
    useUpdateSettings,
    type ScannerSettings,
} from './scanner-store';
import StatsPanel from './stats-panel';
import './analysis-tool.scss';

type View = 'hub' | 'evenodd' | 'overunder' | 'matchnow' | 'risefall' | 'stats';
type CategoryFilter = 'all' | '1s' | 'plain';

const VIEW_TABS: Array<{ id: View; label: string }> = [
    { id: 'evenodd', label: 'Even / Odd' },
    { id: 'overunder', label: 'Over / Under' },
    { id: 'matchnow', label: 'Match Now' },
    { id: 'risefall', label: 'Rise / Fall' },
    { id: 'stats', label: 'Deep Stats' },
    { id: 'hub', label: 'Categories Hub' },
];

const BARRIER_STEPS = [2.5, 3.5, 4.5, 5.5, 6.5, 7.5];

const CATEGORY_TITLE: Record<Exclude<View, 'hub' | 'stats'>, string> = {
    evenodd: 'Even / Odd Signals',
    overunder: 'Over / Under Signals',
    matchnow: 'Match Now ┬╖ Digit Scanner',
    risefall: 'Rise / Fall Signals',
};

const CATEGORY_FOOTER: Record<Exclude<View, 'hub' | 'stats'>, string> = {
    evenodd: 'Even/Odd Parity Engine ┬╖ Deriv Real-Time WebSocket Feeds ┬╖ Strict 15 Ticks Window',
    overunder: 'Over/Under Barrier Engine ┬╖ Deriv Real-Time WebSocket Feeds ┬╖ Strict 15 Ticks Window',
    matchnow: 'MATCH NOW Entry Digit Intelligence ┬╖ Real-Time Deriv WebSocket Feed ┬╖ 14 Ticks Analysis',
    risefall: 'Rise/Fall Momentum Engine ┬╖ Deriv Real-Time WebSocket Feeds ┬╖ Strict 15 Ticks Window',
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

const PulseDot = ({ on }: { on: boolean }) => (
    <span className={`pdt-dot ${on ? 'pdt-dot--on' : ''}`} aria-hidden='true' />
);

const DigitStream = ({ digits, arrows }: { digits: number[]; arrows?: boolean }) => (
    <span className='pdt-stream'>
        {digits.map((d, i) => (
            <span key={`${i}-${d}`} className={`pdt-chip ${i === digits.length - 1 ? 'pdt-chip--last' : ''}`}>
                {arrows ? (d >= 0 ? 'Γû▓' : 'Γû╝') : d}
            </span>
        ))}
    </span>
);

/* ------------------------------------------------------------------ */
/* Market card                                                         */
/* ------------------------------------------------------------------ */

interface CardProps {
    market: PdtMarket;
    view: Exclude<View, 'hub' | 'stats'>;
    settings: ScannerSettings;
    index: number;
    onOpen: (market: PdtMarket) => void;
    selectedDigit?: number;
    onLockDigit?: (digit: number) => void;
    onSignal?: (signal: PdtSignal, analysis: MarketAnalysis) => void;
}

const MarketCard = ({ market, view, settings, index, onOpen, selectedDigit, onLockDigit, onSignal }: CardProps) => {
    const state = useMarketFeed(market.symbol);
    const [mountedAt] = useState(() => Date.now());
    const [now, setNow] = useState(() => Date.now());
    const lastAnnounced = useRef<number>(0);

    // 1s heartbeat for the staggered scan countdown.
    useEffect(() => {
        const t = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(t);
    }, []);

    const analysis = state?.analysis ?? null;
    const digits = state?.digits ?? [];

    // Reference behaviour: each card warms up on its own stagger, then shows a
    // signal for the scan window before re-scanning.
    const staggerMs = (4 + (index % 8) * 2) * 1000;
    const cycleMs = (settings.scanWindowSeconds + 8) * 1000;
    const inCycle = (now - mountedAt) % cycleMs;
    const warming = now - mountedAt < staggerMs;
    const countdown = Math.max(1, Math.ceil((staggerMs - (now - mountedAt)) / 1000));
    const scanning = warming || inCycle > cycleMs - 5000;
    const scanCountdown = warming ? countdown : Math.max(1, Math.ceil((cycleMs - inCycle) / 1000));

    // Announce strong signals once per cycle (audio system integration).
    useEffect(() => {
        if (!analysis || scanning) return;
        const conf =
            view === 'evenodd'
                ? analysis.evenOddConfidence
                : view === 'overunder'
                  ? analysis.overUnderConfidence
                  : view === 'matchnow'
                    ? analysis.digitMatchConfidence
                    : analysis.riseFallConfidence;
        if (conf < Math.max(60, settings.signalThreshold) || analysis.timestamp - lastAnnounced.current < 20000) return;
        lastAnnounced.current = analysis.timestamp;
        soundService.play('signal');
        voiceService.announceScannerHit({
            market: market.shortName,
            signal:
                view === 'evenodd'
                    ? analysis.evenOddPrediction
                    : view === 'overunder'
                      ? analysis.overUnderPrediction
                      : view === 'matchnow'
                        ? `digit ${analysis.digitMatchPrediction}`
                        : analysis.riseFallPrediction,
            confidence: conf,
        });
    }, [analysis, scanning, settings.signalThreshold, view, market.shortName]);

    const barrierStats = useMemo(
        () => (view === 'overunder' && digits.length ? barrierSplit(digits, settings.overUnderBarrier) : null),
        [view, digits, settings.overUnderBarrier]
    );

    const onMatchNow = () => {
        if (!analysis) return;
        const signal = generateMatchesDiffersSignal(
            market.symbol,
            market.displayName,
            digits,
            analysis,
            'matches',
            selectedDigit ?? analysis.digitMatchPrediction
        );
        const verdict = validateSignalAgainstContract('MATCHES_DIFFERS', signal);
        if (!verdict.valid) return;
        soundService.play('click');
        onSignal?.(signal, analysis);
    };

    const signalRow = () => {
        if (!analysis) return null;
        switch (view) {
            case 'evenodd':
                return (
                    <div className='pdt-card__signal'>
                        <span
                            className={`pdt-pill pdt-pill--${analysis.evenOddPrediction === 'EVEN' ? 'even' : 'odd'}`}
                        >
                            {analysis.evenOddPrediction}
                        </span>
                        <span className='pdt-card__entry'>ENTRY</span>
                        <span className='pdt-ring' aria-hidden='true' />
                        <strong className='pdt-card__conf'>{analysis.evenOddConfidence}%</strong>
                        <span className='pdt-card__split'>
                            <b>{analysis.evenPercentage}% E</b>
                            <b>{analysis.oddPercentage}% O</b>
                        </span>
                    </div>
                );
            case 'overunder': {
                const over = (barrierStats?.overPercentage ?? 50) >= (barrierStats?.underPercentage ?? 50);
                const threshold = barrierStats?.threshold ?? 4;
                return (
                    <div className='pdt-card__signal'>
                        <span className={`pdt-pill pdt-pill--${over ? 'over' : 'under'}`}>
                            {over ? `OVER ${threshold}` : `UNDER ${threshold}`}
                        </span>
                        <span className='pdt-card__entry'>ENTRY</span>
                        <span className='pdt-ring' aria-hidden='true' />
                        <strong className='pdt-card__conf'>{analysis.overUnderConfidence}%</strong>
                        <span className='pdt-card__split'>
                            <b>
                                {barrierStats?.overPercentage ?? 0}% &gt;{threshold}
                            </b>
                            <b>
                                {barrierStats?.underPercentage ?? 0}% Γëñ{threshold}
                            </b>
                        </span>
                    </div>
                );
            }
            case 'risefall':
                return (
                    <div className='pdt-card__signal'>
                        <span className={`pdt-pill pdt-pill--${analysis.riseFallPrediction === 'RISE' ? 'rise' : 'fall'}`}>
                            {analysis.riseFallPrediction === 'RISE' ? 'RISE Γû▓' : 'FALL Γû╝'}
                        </span>
                        <span className='pdt-card__entry'>ENTRY</span>
                        <span className='pdt-ring' aria-hidden='true' />
                        <strong className='pdt-card__conf'>{analysis.riseFallConfidence}%</strong>
                        <span className='pdt-card__split'>
                            <b>{analysis.risePercentage}% R</b>
                            <b>{analysis.fallPercentage}% F</b>
                        </span>
                    </div>
                );
            case 'matchnow': {
                const digit = selectedDigit ?? analysis.digitMatchPrediction;
                const top3 = Object.entries(analysis.digitDistribution)
                    .map(([d, s]) => ({ d: Number(d), pct: s.percentage }))
                    .sort((a, b) => b.pct - a.pct)
                    .slice(0, 3);
                return (
                    <div className='pdt-card__signal pdt-card__signal--match'>
                        <span className='pdt-big-digit'>{digit}</span>
                        <span className='pdt-card__entry'>MATCH NOW</span>
                        <strong className='pdt-card__conf'>{analysis.digitMatchConfidence}%</strong>
                        <span className='pdt-card__top3'>
                            {top3.map(t => (
                                <b key={t.d}>
                                    {t.d}:{t.pct}%
                                </b>
                            ))}
                        </span>
                        <button type='button' className='pdt-match-btn' onClick={onMatchNow} disabled={!analysis}>
                            MATCH NOW <span aria-hidden='true'>Γ₧ö</span>
                        </button>
                        <span className='pdt-card__entrydigit'>
                            Entry digit <b>{digit}</b>
                        </span>
                    </div>
                );
            }
            default:
                return null;
        }
    };

    return (
        <article
            className={`pdt-card ${scanning ? 'pdt-card--scanning' : ''}`}
            onClick={() => onOpen(market)}
            role='button'
            tabIndex={0}
            onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpen(market);
                }
            }}
            aria-label={`${market.displayName} ΓÇö open market detail`}
        >
            <header className='pdt-card__head'>
                <div className='pdt-card__id'>
                    <h3>{market.shortName}</h3>
                    <span>{market.code}</span>
                </div>
                <span className='pdt-ai-badge' aria-hidden='true'>
                    AI
                </span>
            </header>

            {scanning || !analysis ? (
                <div className='pdt-card__scanning'>
                    <strong>{scanCountdown}</strong>
                    <span>SEC</span>
                    <em>SCANNING</em>
                    <p>
                        {settings.sampleSize} ticks ┬╖ {settings.scanWindowSeconds}s window
                    </p>
                </div>
            ) : (
                signalRow()
            )}

            <div className='pdt-card__history'>
                <span className='pdt-card__history-label'>
                    <PulseDot on={!scanning} /> LIVE DIGIT HISTORY
                </span>
                <span className='pdt-card__history-feed'>{digits.length || 0} Ticks Feed</span>
            </div>
            <DigitStream digits={digits.slice(-14)} arrows={view === 'risefall'} />
        </article>
    );
};

/* ------------------------------------------------------------------ */
/* Category hub cards                                                  */
/* ------------------------------------------------------------------ */

const HubCard = ({
    kind,
    state,
    onOpen,
}: {
    kind: ContractCategory;
    state: ReturnType<typeof useMarketFeed>;
    onOpen: () => void;
}) => {
    const analysis = state?.analysis;
    const digits = state?.digits ?? [];
    const titles: Record<ContractCategory, { label: string; title: string; body: string }> = {
        EVEN_ODD: {
            label: 'EVEN / ODD',
            title: 'Even/Odd Signals',
            body: 'Analyze the latest market digits to identify even and odd patterns using real-time tick data.',
        },
        OVER_UNDER: {
            label: 'OVER / UNDER',
            title: 'Over/Under Signals',
            body: 'Analyze last-digit thresholds and observed digit distributions for available Over and Under contracts.',
        },
        MATCHES_DIFFERS: {
            label: 'DIGIT MATCH',
            title: 'Matches/Differs Signals',
            body: 'Explore target-digit analysis and compare matching versus non-matching digits from live market ticks.',
        },
        RISE_FALL: {
            label: 'RISE / FALL',
            title: 'Rise/Fall Signals',
            body: 'Trade consecutive tick momentum and tick velocity swings using real-time price action.',
        },
    };
    const meta = titles[kind];

    const stats = () => {
        if (!analysis) return null;
        switch (kind) {
            case 'EVEN_ODD':
                return (
                    <div className='pdt-hubcard__stats'>
                        <div className='pdt-hubcard__stat'>
                            <b className='pdt-hubcard__stat-tag pdt-hubcard__stat-tag--even'>EVEN</b>
                            <span>{analysis.evenCount}t</span>
                            <strong>{analysis.evenPercentage}%</strong>
                        </div>
                        <div className='pdt-hubcard__stat'>
                            <b className='pdt-hubcard__stat-tag pdt-hubcard__stat-tag--odd'>ODD</b>
                            <span>{analysis.oddCount}t</span>
                            <strong>{analysis.oddPercentage}%</strong>
                        </div>
                    </div>
                );
            case 'OVER_UNDER':
                return (
                    <div className='pdt-hubcard__stats'>
                        <div className='pdt-hubcard__stat'>
                            <b className='pdt-hubcard__stat-tag pdt-hubcard__stat-tag--under'>UNDER (0-4)</b>
                            <span>{analysis.underCount}t</span>
                            <strong>{analysis.underPercentage}%</strong>
                        </div>
                        <div className='pdt-hubcard__stat'>
                            <b className='pdt-hubcard__stat-tag pdt-hubcard__stat-tag--over'>OVER (5-9)</b>
                            <span>{analysis.overCount}t</span>
                            <strong>{analysis.overPercentage}%</strong>
                        </div>
                    </div>
                );
            case 'MATCHES_DIFFERS': {
                const hot = analysis.mostProbableDigit;
                const cold = analysis.leastProbableDigit;
                const matchPct = analysis.digitDistribution[hot]?.percentage ?? 10;
                return (
                    <div className='pdt-hubcard__stats'>
                        <div className='pdt-hubcard__stat pdt-hubcard__stat--wide'>
                            <b className='pdt-hubcard__stat-tag pdt-hubcard__stat-tag--hot'>{hot}</b>
                            <span>HOT DIGIT #{hot}</span>
                            <em>Cold: #{cold}</em>
                        </div>
                        <div className='pdt-hubcard__stat pdt-hubcard__stat--wide'>
                            <span>Differs:</span> <strong>{100 - matchPct}% (1.09x)</strong>
                            <span>Matches:</span> <strong>{matchPct}% (9.5x)</strong>
                        </div>
                    </div>
                );
            }
            case 'RISE_FALL':
                return (
                    <div className='pdt-hubcard__stats'>
                        <div className='pdt-hubcard__stat'>
                            <b className='pdt-hubcard__stat-tag pdt-hubcard__stat-tag--rise'>RISE Γû▓</b>
                            <span>BULL</span>
                            <strong>{analysis.risePercentage}%</strong>
                        </div>
                        <div className='pdt-hubcard__stat'>
                            <b className='pdt-hubcard__stat-tag pdt-hubcard__stat-tag--fall'>FALL Γû╝</b>
                            <span>BEAR</span>
                            <strong>{analysis.fallPercentage}%</strong>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <button type='button' className='pdt-hubcard' onClick={onOpen}>
            <div className='pdt-hubcard__top'>
                <span className='pdt-live-pill'>
                    <PulseDot on /> LIVE DERIV
                </span>
                <span className='pdt-hubcard__label'>{meta.label}</span>
            </div>
            {stats()}
            <div className='pdt-hubcard__stream'>
                <span>STREAM:</span>
                <DigitStream digits={digits.slice(-6)} />
            </div>
            <h3>{meta.title}</h3>
            <p>{meta.body}</p>
            <span className='pdt-hubcard__cta'>View Signals</span>
        </button>
    );
};

/* ------------------------------------------------------------------ */
/* Market detail modal                                                 */
/* ------------------------------------------------------------------ */

const MarketModal = ({ market, onClose }: { market: PdtMarket | null; onClose: () => void }) => {
    const state = useMarketFeed(market?.symbol ?? '');
    const status = useFeedStatus();
    useEffect(() => {
        if (!market) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [market, onClose]);

    if (!market) return null;
    return (
        <div
            className='pdt-modal'
            role='dialog'
            aria-modal='true'
            aria-label={`${market.displayName} detail`}
            onClick={onClose}
        >
            <div className='pdt-modal__panel' onClick={e => e.stopPropagation()}>
                <header className='pdt-modal__head'>
                    <span className='pdt-modal__icon' aria-hidden='true'>
                        <svg viewBox='0 0 24 24' width='22' height='22' fill='none' stroke='currentColor' strokeWidth='2'>
                            <path d='M3 12h4l2-6 4 12 2-6h6' />
                        </svg>
                    </span>
                    <div>
                        <h3>{market.displayName}</h3>
                        <p>
                            {market.code} ┬╖ Category: {market.category.toUpperCase()}
                        </p>
                    </div>
                    <button type='button' className='pdt-modal__close' onClick={onClose} aria-label='Close'>
                        Γ£ò
                    </button>
                </header>
                <div className='pdt-modal__body'>
                    <strong>Live Streaming Status:</strong>
                    <p>Deriv WebSocket feed active with automatic 1-second ticks.</p>
                    <span className={`pdt-modal__conn ${status === 'CONNECTED' ? 'is-live' : ''}`}>
                        <PulseDot on={status === 'CONNECTED'} />
                        {status === 'CONNECTED'
                            ? 'Connected to Deriv Synthetic Index Engine'
                            : status === 'CONNECTING'
                              ? 'Connecting to Deriv Synthetic Index EngineΓÇª'
                              : 'Live feed reconnecting ΓÇö simulated ticks in the meantime'}
                    </span>
                    {state && (
                        <div className='pdt-modal__numbers'>
                            <div>
                                <span>Price</span>
                                <b>{state.price.toFixed(state.pipSize)}</b>
                            </div>
                            <div>
                                <span>Last digit</span>
                                <b>{state.lastDigit}</b>
                            </div>
                            <div>
                                <span>Source</span>
                                <b>{state.source === 'DERIV_REALTIME' ? 'LIVE' : 'SIM'}</b>
                            </div>
                        </div>
                    )}
                </div>
                <button type='button' className='pdt-modal__cta' onClick={onClose}>
                    CLOSE MARKET DETAIL
                </button>
            </div>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/* Scanner page                                                        */
/* ------------------------------------------------------------------ */

const ScannerView = ({
    view,
    settings,
    onUpdateSettings,
    onOpenMarket,
}: {
    view: Exclude<View, 'hub' | 'stats'>;
    settings: ScannerSettings;
    onUpdateSettings: (patch: Partial<ScannerSettings>) => void;
    onOpenMarket: (m: PdtMarket) => void;
}) => {
    const [category, setCategory] = useState<CategoryFilter>('all');
    const [query, setQuery] = useState('');
    const [autoAi, setAutoAi] = useState(true);
    const [lastSignal, setLastSignal] = useState<PdtSignal | null>(null);

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return PDT_MARKETS.filter(m => {
            const catOk = category === 'all' || m.category === category;
            const qOk =
                !needle ||
                m.displayName.toLowerCase().includes(needle) ||
                m.code.toLowerCase().includes(needle) ||
                m.symbol.toLowerCase().includes(needle);
            return catOk && qOk;
        });
    }, [category, query]);

    const onSignal = (signal: PdtSignal, analysis: MarketAnalysis) => {
        setLastSignal(signal);
        addHistoryRecord({
            marketSymbol: signal.market,
            marketName: signal.marketName,
            contractCategory: signal.contractCategory,
            candidate: signal.prediction,
            confidence: signal.confidence,
            sampleSize: settings.sampleSize,
            stats: `${analysis.evenPercentage}% EVEN ┬╖ ${analysis.oddPercentage}% ODD`,
            status: 'ACTIVE',
        });
    };

    return (
        <div className='pdt-scanner'>
            <div className='pdt-scanner__head'>
                <div className='pdt-scanner__title'>
                    <h3>{CATEGORY_TITLE[view]}</h3>
                    {view === 'matchnow' ? (
                        <div className='pdt-scanner__mode'>
                            <span className='pdt-engine-pill'>AI ENGINE</span>
                            <span>
                                {autoAi
                                    ? 'Mode: Dynamic AI Frequency Optimization (Per Index)'
                                    : `Target Locked: Digit ${settings.matchesDiffersTarget}`}
                            </span>
                        </div>
                    ) : (
                        <span className='pdt-scanner__mode-text'>
                            Live Deriv feeds ┬╖ {settings.sampleSize} ticks ┬╖ {settings.scanWindowSeconds}s scan window
                        </span>
                    )}
                </div>
                {view === 'matchnow' && (
                    <div className='pdt-scanner__matchctl'>
                        <button
                            type='button'
                            className={`pdt-autoai ${autoAi ? 'is-on' : ''}`}
                            onClick={() => setAutoAi(v => !v)}
                        >
                            Auto AI
                        </button>
                        <div className='pdt-digitbtns'>
                            {Array.from({ length: 10 }, (_, d) => d).map(d => (
                                <button
                                    key={d}
                                    type='button'
                                    className={!autoAi && d === settings.matchesDiffersTarget ? 'is-on' : ''}
                                    onClick={() => {
                                        setAutoAi(false);
                                        onUpdateSettings({ matchesDiffersTarget: d });
                                    }}
                                    aria-label={`Lock digit ${d}`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {view === 'overunder' && (
                <div className='pdt-barrier'>
                    <span className='pdt-barrier__label'>
                        OVER / UNDER BARRIER THRESHOLD ΓÇö Current Barrier: {settings.overUnderBarrier} (Over{' '}
                        {Math.floor(settings.overUnderBarrier)} / Under {Math.floor(settings.overUnderBarrier) + 1})
                    </span>
                    <div className='pdt-barrier__steps'>
                        {BARRIER_STEPS.map(b => (
                            <button
                                key={b}
                                type='button'
                                className={b === settings.overUnderBarrier ? 'is-on' : ''}
                                onClick={() => onUpdateSettings({ overUnderBarrier: b })}
                            >
                                Barrier {b}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className='pdt-filterbar'>
                <div className='pdt-filterbar__cats'>
                    {(
                        [
                            ['all', `All Indexes (${PDT_MARKETS.length})`],
                            ['1s', '1s Markets (12)'],
                            ['plain', 'Standard (5)'],
                        ] as Array<[CategoryFilter, string]>
                    ).map(([id, label]) => (
                        <button
                            key={id}
                            type='button'
                            className={category === id ? 'is-on' : ''}
                            onClick={() => setCategory(id)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <input
                    type='search'
                    className='pdt-search'
                    placeholder='Search index (e.g. 10, 25, 100)ΓÇª'
                    aria-label='Search index'
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
            </div>

            {lastSignal && (
                <div className='pdt-signalbar' role='status'>
                    <b>{lastSignal.prediction}</b>
                    <span>{lastSignal.marketName}</span>
                    <span>confidence {lastSignal.confidence}%</span>
                    <span>payout {lastSignal.payoutMultiplier}</span>
                    <button type='button' onClick={() => setLastSignal(null)} aria-label='Dismiss signal'>
                        Γ£ò
                    </button>
                </div>
            )}

            <div className='pdt-grid'>
                {visible.map((market, i) => (
                    <MarketCard
                        key={market.symbol}
                        market={market}
                        view={view}
                        settings={settings}
                        index={i}
                        onOpen={onOpenMarket}
                        selectedDigit={autoAi ? undefined : settings.matchesDiffersTarget}
                        onSignal={onSignal}
                    />
                ))}
            </div>

            <p className='pdt-scanner__footer'>{CATEGORY_FOOTER[view]}</p>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const AnalysisToolPage = () => {
    const [view, setView] = useState<View>('hub');
    const [modalMarket, setModalMarket] = useState<PdtMarket | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const { settings, history } = useScannerStore();
    const onUpdateSettings = useUpdateSettings();
    const status = useFeedStatus();

    // Live data for the hub cards (first 1s market as the reference does).
    const hubState = useMarketFeed('1HZ10V');

    useEffect(() => {
        const onOpen = (e: Event) => {
            const detail = (e as CustomEvent<{ symbol?: string }>).detail;
            const symbol = detail?.symbol;
            const market = PDT_MARKETS.find(m => m.symbol === symbol) ?? null;
            if (market) {
                setView('matchnow');
                setModalMarket(market);
            }
        };
        window.addEventListener('pdt:open-market', onOpen as EventListener);
        return () => window.removeEventListener('pdt:open-market', onOpen as EventListener);
    }, []);

    const go = (v: View) => {
        soundService.play('click');
        setView(v);
    };

    return (
        <HubPage className='pdt'>
            <header className='pdt-topbar'>
                <div className='pdt-topbar__brand'>
                    <span className='pdt-topbar__logo' aria-hidden='true'>
                        <svg viewBox='0 0 24 24' width='20' height='20' fill='none' stroke='currentColor' strokeWidth='2'>
                            <path d='M12 2 3 7v10l9 5 9-5V7l-9-5z' />
                            <circle cx='12' cy='12' r='3' />
                        </svg>
                    </span>
                    <div>
                        <strong>Patel Digit Tool</strong>
                        <span>Choose signal or launch apps</span>
                    </div>
                </div>
                <div className='pdt-topbar__status'>
                    <span className={`pdt-conn pdt-conn--${status.toLowerCase()}`}>
                        <PulseDot on={status === 'CONNECTED'} />
                        {status === 'CONNECTED' ? 'LIVE DERIV' : status === 'CONNECTING' ? 'CONNECTINGΓÇª' : 'SIMULATED'}
                    </span>
                    <button
                        type='button'
                        className='pdt-topbar__gear'
                        onClick={() => setShowSettings(v => !v)}
                        aria-expanded={showSettings}
                        aria-label='Scanner settings'
                    >
                        ΓÜÖ
                    </button>
                </div>
            </header>

            <nav className='pdt-tabs' aria-label='Scanner views'>
                {VIEW_TABS.map(tab => (
                    <button
                        key={tab.id}
                        type='button'
                        className={view === tab.id ? 'is-on' : ''}
                        onClick={() => go(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>

            {showSettings && (
                <section className='pdt-settings' aria-label='Scanner settings'>
                    <label className='hub-field'>
                        Sample size (ticks)
                        <input
                            type='number'
                            min={10}
                            max={200}
                            value={settings.sampleSize}
                            onChange={e => onUpdateSettings({ sampleSize: clamp(Number(e.target.value) || 15, 10, 200) })}
                        />
                    </label>
                    <label className='hub-field'>
                        Scan window (seconds)
                        <input
                            type='number'
                            min={10}
                            max={120}
                            value={settings.scanWindowSeconds}
                            onChange={e => onUpdateSettings({ scanWindowSeconds: clamp(Number(e.target.value) || 22, 10, 120) })}
                        />
                    </label>
                    <label className='hub-field'>
                        Signal threshold (%)
                        <input
                            type='number'
                            min={50}
                            max={95}
                            value={settings.signalThreshold}
                            onChange={e => onUpdateSettings({ signalThreshold: clamp(Number(e.target.value) || 55, 50, 95) })}
                        />
                    </label>
                    <div className='pdt-settings__actions'>
                        <button type='button' className='hub-btn hub-btn--ghost' onClick={() => resetSettings()}>
                            Reset defaults
                        </button>
                        <button type='button' className='hub-btn hub-btn--ghost' onClick={() => clearHistory()}>
                            Clear history ({history.length})
                        </button>
                    </div>
                </section>
            )}

            <HubNote tone='info'>
                The scanner reads real Deriv tick streams and reports digit statistics with a confidence score. These
                are historical frequencies, not predictions ΓÇö no signal guarantees a win. Nothing here places trades
                on your behalf.
            </HubNote>

            {view === 'hub' ? (
                <div className='pdt-hub'>
                    <div className='pdt-hub__intro'>
                        <h2>Explore Signal Categories</h2>
                        <p>Choose your preferred contract and access real-time market analysis.</p>
                    </div>
                    <div className='pdt-hub__grid'>
                        {(['EVEN_ODD', 'OVER_UNDER', 'MATCHES_DIFFERS', 'RISE_FALL'] as ContractCategory[]).map(kind => (
                            <HubCard
                                key={kind}
                                kind={kind}
                                state={hubState}
                                onOpen={() =>
                                    go(
                                        kind === 'EVEN_ODD'
                                            ? 'evenodd'
                                            : kind === 'OVER_UNDER'
                                              ? 'overunder'
                                              : kind === 'MATCHES_DIFFERS'
                                                ? 'matchnow'
                                                : 'risefall'
                                    )
                                }
                            />
                        ))}
                    </div>
                    <p className='pdt-scanner__footer'>
                        Deriv Signals, Scanning &amp; Analysis System ┬╖ {settings.sampleSize} Ticks ┬╖{' '}
                        {settings.scanWindowSeconds}s Scanner ┬╖ {PDT_MARKETS.length} Volatility Indexes
                    </p>
                </div>
            ) : view === 'stats' ? (
                <StatsPanel />
            ) : (
                <ScannerView
                    view={view}
                    settings={settings}
                    onUpdateSettings={onUpdateSettings}
                    onOpenMarket={setModalMarket}
                />
            )}

            <MarketModal market={modalMarket} onClose={() => setModalMarket(null)} />
        </HubPage>
    );
};

export { calculateAnalysis };
export default AnalysisToolPage;
