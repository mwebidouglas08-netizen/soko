import { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { isDemoAccount } from '@/utils/account-helpers';
import { HubNote, HubPage, HubPageHeader } from '@/components/hub-page';
import {
    BARRIERS,
    CATEGORY_META,
    FEED_LEN,
    MARKETS,
    SCAN_WINDOW,
    barrierLabel,
    computeWindow,
    directions,
    leadConfidence,
    type CategoryId,
    type MarketGroup,
    type WindowStats,
} from './analysis-core';
import { useMarketScanner, type MarketLive } from './use-market-scanner';
import './analysis-tool.scss';
import './sig-tool.scss';

/**
 * Signal-category explorer with feature parity to prodigittool.vercel.app.
 *
 * The reference runs a strict 15-tick window over 17 Deriv volatility indexes
 * (12 one-second + 5 standard) and, per contract family, shows the observed
 * split, the live digit feed, and an entry recommendation once the window is
 * full. Everything here is measured on REAL Deriv ticks — a single shared
 * WebSocket seeds history for every index and then streams continuously, so the
 * board keeps updating and recovers by itself if the feed drops.
 *
 * No number here predicts the next tick; each is the empirical frequency of the
 * last 15 ticks. The honesty note is deliberate.
 */

const GROUPS: { id: MarketGroup; label: string }[] = [
    { id: 'all', label: `All Indexes (${MARKETS.length})` },
    { id: '1s', label: `1s Markets (${MARKETS.filter(m => m.group === '1s').length})` },
    { id: 'standard', label: `Standard (${MARKETS.filter(m => m.group === 'standard').length})` },
];

const TABS: { id: CategoryId | 'hub'; label: string }[] = [
    { id: 'even_odd', label: 'Even / Odd' },
    { id: 'over_under', label: 'Over / Under' },
    { id: 'match_diff', label: 'Match Now' },
    { id: 'rise_fall', label: 'Rise / Fall' },
    { id: 'hub', label: 'Categories Hub' },
];

const pct = (n: number) => `${Math.round(n * 100)}%`;

interface SplitProps {
    left: number;
    right: number;
    leftLabel: string;
    rightLabel: string;
    accent: string;
}

const SplitBar = ({ left, right, leftLabel, rightLabel, accent }: SplitProps) => (
    <div className='sig-split'>
        <div className='sig-split__labels'>
            <span>
                {leftLabel} <strong>{pct(left)}</strong>
            </span>
            <span>
                <strong>{pct(right)}</strong> {rightLabel}
            </span>
        </div>
        <div className='sig-split__bar'>
            <span className='sig-split__left' style={{ width: `${left * 100}%`, background: accent }} />
            <span className='sig-split__right' style={{ width: `${right * 100}%` }} />
        </div>
    </div>
);

/** The reference's `LIVE DIGIT HISTORY · 14 Ticks Feed` strip. */
const DigitFeed = ({ live, mode }: { live: MarketLive; mode: 'digit' | 'arrow' }) => {
    const digits = live.digits.slice(-FEED_LEN);
    const arrows = useMemo(() => directions(live.quotes, FEED_LEN), [live.quotes]);
    return (
        <div className='sig-feed'>
            <span className='sig-feed__cap'>
                Live digit history
                <em>{FEED_LEN} ticks feed</em>
            </span>
            <div className='sig-feed__row'>
                {digits.length === 0 && <span className='sig-feed__empty'>waiting for ticks…</span>}
                {mode === 'arrow'
                    ? arrows.map((d, i) => (
                          <span key={`a-${i}-${d}`} className={`sig-feed__arrow ${d === 'up' ? 'is-up' : 'is-down'}`}>
                              {d === 'up' ? '▲' : '▼'}
                          </span>
                      ))
                    : digits.map((d, i) => (
                          <span key={`d-${i}-${d}`} className={`sig-feed__digit ${d % 2 === 0 ? 'is-even' : 'is-odd'}`}>
                              {d}
                          </span>
                      ))}
            </div>
        </div>
    );
};

/** Per-category body of a market card — the reference's SCANNING → ENTRY flip. */
const MarketBody = ({
    id,
    stats,
    accent,
    targetDigit,
    unavailable,
}: {
    id: CategoryId;
    stats: WindowStats;
    accent: string;
    targetDigit: number;
    unavailable?: boolean;
}) => {
    if (unavailable) {
        return <p className='sig-mkt__unavailable'>No live feed for this index on the public tick API.</p>;
    }
    if (!stats.ready) {
        return (
            <div className='sig-mkt__scanning'>
                <span className='sig-mkt__scan-secs'>{stats.n}</span>
                <span className='sig-mkt__scan-unit'>SEC</span>
                <span className='sig-mkt__scan-label'>Scanning</span>
                <span className='sig-mkt__scan-win'>
                    {stats.n} ticks · {SCAN_WINDOW}-tick window
                </span>
            </div>
        );
    }

    const entry = (pick: string, conf: number, extra: string) => (
        <>
            <div className='sig-mkt__entry'>
                <span className='sig-mkt__pick' style={{ color: accent }}>
                    {pick}
                </span>
                <span className='sig-mkt__entry-tag'>ENTRY</span>
                <span className='sig-mkt__conf'>{pct(conf)}</span>
            </div>
            <div className='sig-mkt__extra'>{extra}</div>
        </>
    );

    switch (id) {
        case 'even_odd':
            return entry(stats.evenOddPick, leadConfidence('even_odd', stats), `${pct(stats.even)} E · ${pct(stats.odd)} O`);
        case 'over_under':
            return entry(
                `${stats.overUnderPick} ${Math.floor(BARRIERS[2])}`,
                leadConfidence('over_under', stats),
                `${pct(stats.over)} >${Math.floor(BARRIERS[2])} · ${pct(stats.under)} ≤${Math.floor(BARRIERS[2])}`
            );
        case 'match_diff':
            return (
                <>
                    <div className='sig-mkt__entry'>
                        <span className='sig-mkt__pick' style={{ color: accent }}>
                            {targetDigit}
                        </span>
                        <span className='sig-mkt__entry-tag'>Match Now</span>
                        <span className='sig-mkt__conf'>{pct(leadConfidence('match_diff', stats))}</span>
                    </div>
                    <div className='sig-mkt__extra'>
                        {stats.topDigits.map(t => `${t.digit}:${pct(t.pct)}`).join(' · ')}
                    </div>
                    <div className='sig-mkt__entry-digit'>
                        MATCH NOW <span aria-hidden>➔</span> Entry digit <strong>{targetDigit}</strong>
                    </div>
                </>
            );
        case 'rise_fall':
            return entry(
                `${stats.riseFallPick} ${stats.riseFallPick === 'RISE' ? '▲' : '▼'}`,
                leadConfidence('rise_fall', stats),
                `${pct(stats.rise)} R · ${pct(stats.fall)} F`
            );
    }
};

const MarketCard = ({
    market,
    live,
    id,
    accent,
    targetDigit,
}: {
    market: (typeof MARKETS)[number];
    live: MarketLive;
    id: CategoryId;
    accent: string;
    targetDigit: number;
}) => {
    const stats = useMemo(
        () => computeWindow(live.digits, live.quotes, BARRIERS[2]),
        [live.digits, live.quotes]
    );
    const unavailable = live.unsupported;
    const stale = !unavailable && live.lastTickAt > 0 && Date.now() - live.lastTickAt > 12000;

    return (
        <article className={`sig-mkt ${stale ? 'sig-mkt--stale' : ''}`} style={{ ['--sig-accent' as never]: accent }}>
            <header className='sig-mkt__head'>
                <div className='sig-mkt__id'>
                    <h3 className='sig-mkt__name'>{market.name}</h3>
                    <span className='sig-mkt__code'>{market.code}</span>
                </div>
                <div className='sig-mkt__ai' aria-hidden='true'>
                    AI
                </div>
            </header>
            <div className='sig-mkt__status'>
                <i className={unavailable ? 'is-off' : stale ? 'is-stale' : 'is-live'} aria-hidden='true' />
                {unavailable ? 'NO FEED' : stale ? 'RECONNECTING' : 'LIVE DERIV'}
            </div>
            <div className='sig-mkt__body'>
                <MarketBody id={id} stats={stats} accent={accent} targetDigit={targetDigit} unavailable={unavailable} />
            </div>
            <DigitFeed live={live} mode={id === 'rise_fall' ? 'arrow' : 'digit'} />
        </article>
    );
};

const AnalysisToolPage = observer(() => {
    const { client } = useStore() ?? {};
    const isLoggedIn = Boolean(client?.is_logged_in);
    const activeLoginid = client?.loginid || '';
    const isDemo = isDemoAccount(activeLoginid);

    const [tab, setTab] = useState<CategoryId | 'hub'>('hub');
    const [group, setGroup] = useState<MarketGroup>('all');
    const [query, setQuery] = useState('');
    const [barrierIdx, setBarrierIdx] = useState(2);
    const [autoDigit, setAutoDigit] = useState(true);
    const [manualDigit, setManualDigit] = useState(5);

    // One shared socket for all 17 indexes: seeds history, then streams live.
    const symbols = useMemo(() => MARKETS.map(m => m.symbol), []);
    const { markets, connected } = useMarketScanner(symbols, 120);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return MARKETS.filter(m => (group === 'all' ? true : m.group === group)).filter(
            m => !q || m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q)
        );
    }, [group, query]);

    // Hub aggregates: mean of each family's leading confidence across markets.
    const hub = useMemo(() => {
        const list = MARKETS.map(m => markets[m.symbol]).filter(l => l && !l.unsupported);
        const ready = list.filter(l => l.digits.length >= SCAN_WINDOW);
        if (!ready.length) return null;
        const agg = ready.map(l => computeWindow(l.digits, l.quotes, BARRIERS[barrierIdx]));
        const mean = (fn: (s: WindowStats) => number) => agg.reduce((a, s) => a + fn(s), 0) / agg.length;
        const mode = (fn: (s: WindowStats) => string) => {
            const tally: Record<string, number> = {};
            agg.forEach(s => {
                const k = fn(s);
                tally[k] = (tally[k] || 0) + 1;
            });
            return Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
        };
        return {
            ready: ready.length,
            total: MARKETS.length,
            even: mean(s => s.even),
            odd: mean(s => s.odd),
            under: mean(s => s.under),
            over: mean(s => s.over),
            differ: mean(s => s.differ),
            match: mean(s => s.match),
            rise: mean(s => s.rise),
            fall: mean(s => s.fall),
            hotDigit: mode(s => String(s.hotDigit)),
            coldDigit: mode(s => String(s.coldDigit)),
            evenOddPick: mode(s => s.evenOddPick),
            overUnderPick: mode(s => s.overUnderPick),
            riseFallPick: mode(s => s.riseFallPick),
        };
    }, [markets, barrierIdx]);

    const active = tab === 'hub' ? null : CATEGORY_META.find(c => c.id === tab)!;
    const accent = active?.accent ?? '#22e7ff';
    const barrier = BARRIERS[barrierIdx];
    const firstMarket = markets[MARKETS[0].symbol];
    const targetDigit = autoDigit
        ? firstMarket && firstMarket.digits.length >= SCAN_WINDOW
            ? computeWindow(firstMarket.digits, firstMarket.quotes, barrier).entryDigit
            : manualDigit
        : manualDigit;

    // A 1s heartbeat keeps the staleness badges honest on quiet markets.
    const [, setBeat] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setBeat(v => v + 1), 1000);
        return () => clearInterval(t);
    }, []);

    // `live` maps to the shell's green `running` badge variant.
    const status = connected ? 'running' : Object.values(markets).some(m => m.digits.length) ? 'ready' : 'idle';
    const statusLabel = connected ? 'live' : status === 'ready' ? 'ready' : 'idle';

    const hubCards = [
        {
            id: 'even_odd' as CategoryId,
            left: hub?.even ?? 0.5,
            right: hub?.odd ?? 0.5,
            leftLabel: 'EVEN',
            rightLabel: 'ODD',
            foot: hub ? `${hub.evenOddPick} favoured · ${hub.ready}/${hub.total} indexes ready` : 'Scanning indexes…',
        },
        {
            id: 'over_under' as CategoryId,
            left: hub?.under ?? 0.5,
            right: hub?.over ?? 0.5,
            leftLabel: `UNDER (0-${Math.floor(barrier)})`,
            rightLabel: `OVER (${Math.ceil(barrier)}-9)`,
            foot: hub ? `${hub.overUnderPick} favoured · barrier ${barrier}` : 'Scanning indexes…',
        },
        {
            id: 'match_diff' as CategoryId,
            left: hub?.differ ?? 0.5,
            right: hub?.match ?? 0.5,
            leftLabel: 'DIFFERS',
            rightLabel: 'MATCHES',
            foot: hub ? `Hot digit #${hub.hotDigit} · Cold #${hub.coldDigit}` : 'Scanning indexes…',
        },
        {
            id: 'rise_fall' as CategoryId,
            left: hub?.rise ?? 0.5,
            right: hub?.fall ?? 0.5,
            leftLabel: 'RISE ▲',
            rightLabel: 'FALL ▼',
            foot: hub ? `${hub.riseFallPick} favoured · live velocity` : 'Scanning indexes…',
        },
    ];

    return (
        <HubPage className='analysis-tool sig-tool'>
            <HubPageHeader
                title={active ? active.title : 'Analysis Tool'}
                subtitle={
                    active
                        ? `${active.blurb} Strict ${SCAN_WINDOW}-tick window across ${MARKETS.length} Deriv volatility indexes.`
                        : `Real-time Deriv scanner across ${MARKETS.length} volatility indexes (12 one-second + 5 standard).`
                }
                badge={
                    <>
                        <span className={`hub-badge hub-badge--${status}`}>{statusLabel}</span>
                        <span
                            className={[
                                'hub-badge',
                                !isLoggedIn ? 'hub-badge--guest' : isDemo ? 'hub-badge--demo' : 'hub-badge--real',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                        >
                            {!isLoggedIn ? 'Guest · analysis only' : `${isDemo ? 'Demo' : 'Real'} · ${activeLoginid}`}
                        </span>
                    </>
                }
            />

            <nav className='sig-tabs' aria-label='Signal categories'>
                {TABS.map(t => (
                    <button
                        key={t.id}
                        type='button'
                        className={`sig-tabs__btn ${tab === t.id ? 'is-active' : ''}`}
                        onClick={() => setTab(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </nav>

            <HubNote tone='info'>
                <strong>Honest note:</strong> every figure is measured on PAST ticks over a strict {SCAN_WINDOW}-tick
                window. Digit frequencies and momentum describe history — they do not predict the next tick, and no
                panel is a trade signal.
            </HubNote>

            {tab !== 'hub' && (
                <section className='sig-controls'>
                    <div className='sig-chips' role='group' aria-label='Market groups'>
                        {GROUPS.map(g => (
                            <button
                                key={g.id}
                                type='button'
                                className={`sig-chip ${group === g.id ? 'is-active' : ''}`}
                                onClick={() => setGroup(g.id)}
                            >
                                {g.label}
                            </button>
                        ))}
                    </div>
                    <input
                        className='sig-search'
                        type='search'
                        value={query}
                        placeholder='Search index (e.g. 10, 25, 100)…'
                        onChange={e => setQuery(e.target.value)}
                        aria-label='Search index'
                    />

                    {tab === 'over_under' && (
                        <div className='sig-barriers' role='group' aria-label='Barrier threshold'>
                            <span className='sig-barriers__cap'>
                                Current barrier: <strong>{barrier}</strong> ({barrierLabel(barrier)})
                            </span>
                            {BARRIERS.map((b, i) => (
                                <button
                                    key={b}
                                    type='button'
                                    className={`sig-barrier ${barrierIdx === i ? 'is-active' : ''}`}
                                    onClick={() => setBarrierIdx(i)}
                                >
                                    Barrier {b}
                                </button>
                            ))}
                        </div>
                    )}

                    {tab === 'match_diff' && (
                        <div className='sig-matchctl'>
                            <span className='sig-matchctl__mode'>
                                Mode: Dynamic AI Frequency Optimization (Per Index)
                            </span>
                            <button
                                type='button'
                                className={`sig-auto ${autoDigit ? 'is-active' : ''}`}
                                onClick={() => setAutoDigit(v => !v)}
                                aria-pressed={autoDigit}
                            >
                                Auto AI
                            </button>
                            <div className='sig-digitrow' role='group' aria-label='Target digit'>
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                                    <button
                                        key={d}
                                        type='button'
                                        className={`sig-digitrow__d ${!autoDigit && manualDigit === d ? 'is-active' : ''}`}
                                        onClick={() => {
                                            setAutoDigit(false);
                                            setManualDigit(d);
                                        }}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            )}

            {tab === 'hub' ? (
                <div className='sig-grid'>
                    {hubCards.map(c => {
                        const meta = CATEGORY_META.find(m => m.id === c.id)!;
                        return (
                            <article key={c.id} className='sig-card' style={{ ['--sig-accent' as never]: meta.accent }}>
                                <div className='sig-card__top'>
                                    <span className='sig-card__tag'>{meta.tag}</span>
                                    <span className='sig-card__live'>
                                        <i /> LIVE DERIV
                                    </span>
                                </div>
                                <SplitBar
                                    left={c.left}
                                    right={c.right}
                                    leftLabel={c.leftLabel}
                                    rightLabel={c.rightLabel}
                                    accent={meta.accent}
                                />
                                <p className='sig-card__foot'>{c.foot}</p>
                                <h3 className='sig-card__title'>{meta.title}</h3>
                                <p className='sig-card__blurb'>{meta.blurb}</p>
                                <button type='button' className='sig-card__cta' onClick={() => setTab(c.id)}>
                                    View Signals
                                </button>
                            </article>
                        );
                    })}
                </div>
            ) : (
                <>
                    <div className='sig-board' style={{ ['--sig-accent' as never]: accent }}>
                        {visible.map(m => (
                            <MarketCard
                                key={m.symbol}
                                market={m}
                                live={markets[m.symbol]}
                                id={active!.id}
                                accent={accent}
                                targetDigit={targetDigit}
                            />
                        ))}
                        {visible.length === 0 && <p className='sig-board__empty'>No index matches “{query}”.</p>}
                    </div>
                    <footer className='sig-engine'>
                        <span>
                            {active!.engine} · Deriv Real-Time WebSocket Feeds · Strict {SCAN_WINDOW}-Tick Window
                        </span>
                        <span>
                            {connected ? 'Connected' : 'Reconnecting'} · {hub ? hub.ready : 0}/{MARKETS.length} indexes
                            warmed
                        </span>
                    </footer>
                </>
            )}
        </HubPage>
    );
});

export default AnalysisToolPage;
