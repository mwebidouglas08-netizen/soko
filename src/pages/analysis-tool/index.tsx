import { useEffect, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { isDemoAccount } from '@/utils/account-helpers';
import { fetchHistoricalTicks, type HistoricalTicks } from '@/bot/deriv/history';
import { computeDigitCounts, empiricalProbability, theoreticalProbability } from '@/bot/core/digit-stats';
import { HubNote, HubPage, HubPageHeader } from '@/components/hub-page';
import './analysis-tool.scss';
import './sig-tool.scss';

/**
 * Signal-category explorer modelled on prodigittool.vercel.app: four contract
 * families (Even/Odd, Over/Under, Matches/Differs, Rise/Fall), each showing the
 * live observed split over the recent tick window, with a detail view per
 * category. Everything is measured on real Deriv tick history — no prediction.
 */

const SYMBOLS = [
    { symbol: 'R_10', name: 'Volatility 10' },
    { symbol: 'R_25', name: 'Volatility 25' },
    { symbol: 'R_50', name: 'Volatility 50' },
    { symbol: 'R_75', name: 'Volatility 75' },
    { symbol: 'R_100', name: 'Volatility 100' },
    { symbol: '1HZ10V', name: 'Volatility 10 (1s)' },
    { symbol: '1HZ25V', name: 'Volatility 25 (1s)' },
    { symbol: '1HZ50V', name: 'Volatility 50 (1s)' },
    { symbol: '1HZ75V', name: 'Volatility 75 (1s)' },
    { symbol: '1HZ100V', name: 'Volatility 100 (1s)' },
];

const RANGES = [100, 500, 1000];
const WINDOW = 30;

type CategoryId = 'even_odd' | 'over_under' | 'match_diff' | 'rise_fall';

interface Category {
    id: CategoryId;
    tag: string;
    title: string;
    blurb: string;
    accent: string;
}

const CATEGORIES: Category[] = [
    {
        id: 'even_odd',
        tag: 'EVEN / ODD',
        title: 'Even/Odd Signals',
        blurb: 'Analyze the latest market digits to identify even and odd patterns using real-time tick data.',
        accent: '#22e7ff',
    },
    {
        id: 'over_under',
        tag: 'OVER / UNDER',
        title: 'Over/Under Signals',
        blurb: 'Analyze last-digit thresholds and observed digit distributions for available Over and Under contracts.',
        accent: '#7effd8',
    },
    {
        id: 'match_diff',
        tag: 'DIGIT MATCH',
        title: 'Matches/Differs Signals',
        blurb: 'Explore target-digit analysis and compare matching versus non-matching digits from live market ticks.',
        accent: '#a78bfa',
    },
    {
        id: 'rise_fall',
        tag: 'RISE / FALL',
        title: 'Rise/Fall Signals',
        blurb: 'Trade consecutive tick momentum and tick velocity swings using real-time price action.',
        accent: '#fbbf24',
    },
];

const pct = (n: number) => `${Math.round(n * 100)}%`;

interface Analysis {
    digits: number[];
    quotes: number[];
    n: number;
    counts: number[];
    even: number;
    odd: number;
    over: number;
    under: number;
    match: number;
    differ: number;
    rise: number;
    fall: number;
    hotDigit: number;
    coldDigit: number;
    barrier: number;
}

const computeAnalysis = (ticks: HistoricalTicks, barrier: number): Analysis => {
    const digits = ticks.digits;
    const quotes = ticks.quotes;
    const n = digits.length;
    const counts = computeDigitCounts(digits);
    const recent = digits.slice(-WINDOW);
    const rn = recent.length || 1;

    const even = recent.filter(d => d % 2 === 0).length;
    const odd = recent.length - even;
    const over = recent.filter(d => d > barrier).length;
    const under = recent.filter(d => d < barrier).length;
    const match = recent.filter(d => d === barrier).length;
    const differ = recent.length - match;

    const recentQuotes = quotes.slice(-WINDOW);
    let rise = 0;
    let fall = 0;
    for (let i = 1; i < recentQuotes.length; i += 1) {
        if (recentQuotes[i] > recentQuotes[i - 1]) rise += 1;
        else if (recentQuotes[i] < recentQuotes[i - 1]) fall += 1;
    }

    let hotDigit = 0;
    let coldDigit = 0;
    counts.forEach((c, d) => {
        if (c > counts[hotDigit]) hotDigit = d;
        if (c < counts[coldDigit]) coldDigit = d;
    });

    return {
        digits,
        quotes,
        n,
        counts,
        even: even / rn,
        odd: odd / rn,
        over: over / rn,
        under: under / rn,
        match: match / rn,
        differ: differ / rn,
        rise: rise / rn,
        fall: fall / rn,
        hotDigit,
        coldDigit,
        barrier,
    };
};

const SplitBar = ({ left, right, leftLabel, rightLabel, accent }: { left: number; right: number; leftLabel: string; rightLabel: string; accent: string }) => (
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

const AnalysisToolPage = observer(() => {
    const { client } = useStore() ?? {};
    const isLoggedIn = Boolean(client?.is_logged_in);
    const activeLoginid = client?.loginid || '';
    const isDemo = isDemoAccount(activeLoginid);

    const [symbol, setSymbol] = useState('R_50');
    const [range, setRange] = useState(500);
    const [barrier, setBarrier] = useState(5);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ticks, setTicks] = useState<HistoricalTicks | null>(null);
    const [active, setActive] = useState<CategoryId | null>(null);
    const detailRef = useRef<HTMLDivElement | null>(null);

    const run = async () => {
        setLoading(true);
        setError(null);
        try {
            const history = await fetchHistoricalTicks(symbol, range);
            setTicks(history);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load ticks');
        } finally {
            setLoading(false);
        }
    };

    // Auto-load on first mount so the cards are never empty.
    useEffect(() => {
        void run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const analysis = useMemo<Analysis | null>(() => (ticks ? computeAnalysis(ticks, barrier) : null), [ticks, barrier]);

    const openCategory = (id: CategoryId) => {
        setActive(id);
        requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    };

    const cardStats = (id: CategoryId): { left: number; right: number; leftLabel: string; rightLabel: string; foot: string } => {
        if (!analysis) return { left: 0.5, right: 0.5, leftLabel: '\u2014', rightLabel: '\u2014', foot: 'Loading\u2026' };
        switch (id) {
            case 'even_odd':
                return {
                    left: analysis.even,
                    right: analysis.odd,
                    leftLabel: 'EVEN',
                    rightLabel: 'ODD',
                    foot: `Stream: ${analysis.n}`,
                };
            case 'over_under':
                return {
                    left: analysis.under,
                    right: analysis.over,
                    leftLabel: `UNDER (0-${barrier - 1})`,
                    rightLabel: `OVER (${barrier}-9)`,
                    foot: `Barrier pivot: ${barrier}`,
                };
            case 'match_diff':
                return {
                    left: analysis.differ,
                    right: analysis.match,
                    leftLabel: 'DIFFERS',
                    rightLabel: 'MATCHES',
                    foot: `Hot digit #${analysis.hotDigit} \u00b7 Cold #${analysis.coldDigit}`,
                };
            case 'rise_fall':
                return {
                    left: analysis.rise,
                    right: analysis.fall,
                    leftLabel: 'RISE \u25b2',
                    rightLabel: 'FALL \u25bc',
                    foot: 'Live directional velocity tracking',
                };
        }
    };

    const detail = active ? CATEGORIES.find(c => c.id === active)! : null;

    return (
        <HubPage className='analysis-tool sig-tool'>
            <HubPageHeader
                title='Analysis Tool'
                subtitle='Explore signal categories and read real-time market analysis over live Deriv tick data.'
                badge={
                    <>
                        <span className={`hub-badge ${loading ? 'hub-badge--running' : analysis ? 'hub-badge--ready' : 'hub-badge--idle'}`}>
                            {loading ? 'loading' : analysis ? 'ready' : 'idle'}
                        </span>
                        <span
                            className={[
                                'hub-badge',
                                !isLoggedIn ? 'hub-badge--guest' : isDemo ? 'hub-badge--demo' : 'hub-badge--real',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                        >
                            {!isLoggedIn ? 'Guest \u00b7 analysis only' : `${isDemo ? 'Demo' : 'Real'} \u00b7 ${activeLoginid}`}
                        </span>
                    </>
                }
            />

            <HubNote tone='info'>
                <strong>Honest note:</strong> every figure here is measured on PAST ticks. Digit frequencies and
                momentum describe history — they do not predict the next tick, and no panel is a trade signal.
            </HubNote>

            <section className='analysis-tool__controls'>
                <label className='hub-field'>
                    Symbol
                    <select value={symbol} onChange={e => setSymbol(e.target.value)}>
                        {SYMBOLS.map(s => (
                            <option key={s.symbol} value={s.symbol}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className='hub-field'>
                    Range
                    <select value={range} onChange={e => setRange(Number(e.target.value))}>
                        {RANGES.map(r => (
                            <option key={r} value={r}>
                                Last {r} ticks
                            </option>
                        ))}
                    </select>
                </label>
                <label className='hub-field'>
                    Barrier (0-9)
                    <input
                        type='number'
                        min={0}
                        max={9}
                        value={barrier}
                        onChange={e => setBarrier(Math.min(9, Math.max(0, Number(e.target.value))))}
                    />
                </label>
                <button className='hub-btn hub-btn--primary' onClick={run} disabled={loading}>
                    {loading ? 'Loading\u2026' : 'Refresh analysis'}
                </button>
            </section>

            {error && (
                <div className='analysis-tool__error' role='alert'>
                    {error}
                </div>
            )}

            <div className='sig-grid'>
                {CATEGORIES.map(cat => {
                    const s = cardStats(cat.id);
                    return (
                        <article
                            key={cat.id}
                            className={`sig-card ${active === cat.id ? 'sig-card--active' : ''}`}
                            style={{ ['--sig-accent' as any]: cat.accent }}
                        >
                            <div className='sig-card__top'>
                                <span className='sig-card__tag'>{cat.tag}</span>
                                <span className='sig-card__live'>
                                    <i /> LIVE DERIV
                                </span>
                            </div>
                            <SplitBar left={s.left} right={s.right} leftLabel={s.leftLabel} rightLabel={s.rightLabel} accent={cat.accent} />
                            <p className='sig-card__foot'>{s.foot}</p>
                            <h3 className='sig-card__title'>{cat.title}</h3>
                            <p className='sig-card__blurb'>{cat.blurb}</p>
                            <button type='button' className='sig-card__cta' onClick={() => openCategory(cat.id)}>
                                View Signals
                            </button>
                        </article>
                    );
                })}
            </div>

            {detail && analysis && (
                <section className='sig-detail' ref={detailRef} style={{ ['--sig-accent' as any]: detail.accent }}>
                    <header className='sig-detail__head'>
                        <div>
                            <span className='sig-card__tag'>{detail.tag}</span>
                            <h2>{detail.title}</h2>
                        </div>
                        <button type='button' className='sig-detail__close' onClick={() => setActive(null)}>
                            Close
                        </button>
                    </header>

                    {detail.id === 'even_odd' && (
                        <div className='sig-detail__body'>
                            <SplitBar left={analysis.even} right={analysis.odd} leftLabel='EVEN' rightLabel='ODD' accent={detail.accent} />
                            <p className='sig-detail__note'>
                                Over the last {WINDOW} ticks, {pct(analysis.even)} were even and {pct(analysis.odd)} were
                                odd. Fair value is 50% each.
                            </p>
                        </div>
                    )}

                    {detail.id === 'over_under' && (
                        <div className='sig-detail__body'>
                            <SplitBar
                                left={analysis.under}
                                right={analysis.over}
                                leftLabel={`UNDER (0-${barrier - 1})`}
                                rightLabel={`OVER (${barrier}-9)`}
                                accent={detail.accent}
                            />
                            <div className='hub-table-wrap'>
                                <table className='hub-table'>
                                    <thead>
                                        <tr>
                                            <th>Barrier</th>
                                            <th>Over empirical</th>
                                            <th>Over fair</th>
                                            <th>Under empirical</th>
                                            <th>Under fair</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(b => (
                                            <tr key={b}>
                                                <td>{b}</td>
                                                <td>{pct(empiricalProbability(analysis.digits, 'over', b))}</td>
                                                <td>{pct(theoreticalProbability('over', b))}</td>
                                                <td>{pct(empiricalProbability(analysis.digits, 'under', b))}</td>
                                                <td>{pct(theoreticalProbability('under', b))}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {detail.id === 'match_diff' && (
                        <div className='sig-detail__body'>
                            <SplitBar
                                left={analysis.differ}
                                right={analysis.match}
                                leftLabel='DIFFERS'
                                rightLabel='MATCHES'
                                accent={detail.accent}
                            />
                            <p className='sig-detail__note'>
                                Target digit <strong>#{barrier}</strong>. Hot digit #{analysis.hotDigit}, cold digit #
                                {analysis.coldDigit}. Matches {pct(analysis.match)} vs Differs {pct(analysis.differ)} over
                                the last {WINDOW} ticks.
                            </p>
                        </div>
                    )}

                    {detail.id === 'rise_fall' && (
                        <div className='sig-detail__body'>
                            <SplitBar
                                left={analysis.rise}
                                right={analysis.fall}
                                leftLabel='RISE \u25b2'
                                rightLabel='FALL \u25bc'
                                accent={detail.accent}
                            />
                            <p className='sig-detail__note'>
                                Of the last {WINDOW} tick-to-tick moves, {pct(analysis.rise)} were up and{' '}
                                {pct(analysis.fall)} were down.
                            </p>
                        </div>
                    )}
                </section>
            )}
        </HubPage>
    );
});

export default AnalysisToolPage;
