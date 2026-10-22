import { useEffect, useMemo, useRef, useState } from 'react';
import { HubContractType, HubSessionSnapshot, HubTradeIntent } from '@/bot/engine/hub-session';
import { useHubSession } from '@/bot/use-hub-session';
import { SymbolSeries, TickFeed } from '@/bot/deriv/ticks';
import { VOL_MARKETS } from '../hub/markets';
import './auto-trader.scss';

type ReAnalyze = 'every_trade' | 'after_every' | 'first_entry' | 'after_loss';
type Cmp = 'greater' | 'less';

interface AutoCard {
    id: string;
    title: string;
    market: string;
    n: number;
    pred: number;
    checkSide: string;
    cmp: Cmp;
    threshold: number;
    thenType: string;
    barrier: number;
    reAnalyze: ReAnalyze;
    afterN: number;
    ticks: number;
    stake: number;
    martingale: number;
    pinned: boolean;
}

const WINDOWS = 100;

const CARDS: AutoCard[] = [
    { id: 'eo-digits', title: 'Even/Odd (Digits)', market: 'R_100', n: 5, pred: 0, checkSide: 'even', cmp: 'greater', threshold: 60, thenType: 'DIGITEVEN', barrier: 0, reAnalyze: 'after_every', afterN: 3, ticks: 1, stake: 0.5, martingale: 1.2, pinned: false },
    { id: 'eo-pct', title: 'Even/Odd (Percentages)', market: 'R_100', n: WINDOWS, pred: 0, checkSide: 'even', cmp: 'greater', threshold: 60, thenType: 'DIGITEVEN', barrier: 0, reAnalyze: 'after_every', afterN: 3, ticks: 1, stake: 0.5, martingale: 1.2, pinned: false },
    { id: 'ou-digits', title: 'Over/Under (Digits)', market: 'R_100', n: 3, pred: 5, checkSide: 'greater than', cmp: 'greater', threshold: 60, thenType: 'DIGITOVER', barrier: 4, reAnalyze: 'after_every', afterN: 3, ticks: 1, stake: 0.5, martingale: 1.2, pinned: false },
    { id: 'ou-pct', title: 'Over/Under (Percentages)', market: 'R_100', n: WINDOWS, pred: 5, checkSide: 'over', cmp: 'greater', threshold: 60, thenType: 'DIGITOVER', barrier: 5, reAnalyze: 'after_every', afterN: 3, ticks: 1, stake: 0.5, martingale: 1.2, pinned: false },
    { id: 'rf', title: 'Rise/Fall', market: 'R_100', n: WINDOWS, pred: 0, checkSide: 'rise', cmp: 'greater', threshold: 60, thenType: 'CALL', barrier: 0, reAnalyze: 'after_every', afterN: 3, ticks: 1, stake: 0.5, martingale: 1.2, pinned: false },
    { id: 'md', title: 'Matches/Differs (5)', market: 'R_100', n: WINDOWS, pred: 5, checkSide: 'matches', cmp: 'greater', threshold: 60, thenType: 'DIGITMATCH', barrier: 5, reAnalyze: 'after_every', afterN: 3, ticks: 1, stake: 0.5, martingale: 1.2, pinned: false },
];

const evalCard = (card: AutoCard, series: SymbolSeries): HubTradeIntent | null => {
    const digits = series.digits;
    const quotes = series.quotes;
    const symbol = card.market;
    switch (card.id) {
        case 'eo-digits': {
            if (digits.length < card.n) return null;
            const tail = digits.slice(-card.n);
            const hit = card.checkSide === 'even' ? tail.every(d => d % 2 === 0) : tail.every(d => d % 2 === 1);
            if (!hit) return null;
            return { symbol, contractType: card.thenType as HubContractType };
        }
        case 'eo-pct': {
            if (digits.length < 10) return null;
            const window = digits.slice(-WINDOWS);
            const evenPct = (window.filter(d => d % 2 === 0).length * 100) / window.length;
            const oddPct = 100 - evenPct;
            const watched = card.checkSide === 'even' ? evenPct : oddPct;
            const hit = card.cmp === 'greater' ? watched >= card.threshold : watched <= card.threshold;
            if (!hit) return null;
            return { symbol, contractType: card.thenType as HubContractType };
        }
        case 'ou-digits': {
            if (!digits.length) return null;
            const last = digits[digits.length - 1];
            const hit =
                card.checkSide === 'greater than' ? last > card.pred : card.checkSide === 'less than' ? last < card.pred : last === card.pred;
            if (!hit) return null;
            return { symbol, contractType: card.thenType as HubContractType, barrier: card.barrier };
        }
        case 'ou-pct': {
            if (digits.length < 10) return null;
            const window = digits.slice(-WINDOWS);
            const overPct = (window.filter(d => d > card.pred).length * 100) / window.length;
            const underPct = (window.filter(d => d < card.pred).length * 100) / window.length;
            const watched = card.checkSide === 'over' ? overPct : underPct;
            const hit = card.cmp === 'greater' ? watched >= card.threshold : watched <= card.threshold;
            if (!hit) return null;
            return { symbol, contractType: card.thenType as HubContractType, barrier: card.pred };
        }
        case 'rf': {
            if (quotes.length < 10) return null;
            const window = quotes.slice(-WINDOWS);
            let up = 0;
            let down = 0;
            for (let i = 1; i < window.length; i += 1) {
                if (window[i] > window[i - 1]) up += 1;
                else if (window[i] < window[i - 1]) down += 1;
            }
            const total = Math.max(1, up + down);
            const risePct = (up * 100) / total;
            const fallPct = (down * 100) / total;
            const watched = card.checkSide === 'rise' ? risePct : fallPct;
            const hit = card.cmp === 'greater' ? watched >= card.threshold : watched <= card.threshold;
            if (!hit) return null;
            return { symbol, contractType: card.thenType as HubContractType };
        }
        case 'md': {
            if (digits.length < 10) return null;
            const window = digits.slice(-WINDOWS);
            const matchPct = (window.filter(d => d === card.pred).length * 100) / window.length;
            const differPct = 100 - matchPct;
            const watched = card.checkSide === 'matches' ? matchPct : differPct;
            const hit = card.cmp === 'greater' ? watched >= card.threshold : watched <= card.threshold;
            if (!hit) return null;
            return { symbol, contractType: card.thenType as HubContractType, barrier: card.pred };
        }
        default:
            return null;
    }
};

const evalGate = (card: AutoCard, state: HubSessionSnapshot): boolean => {
    const n = state.trades;
    const lastLoss = state.rows[0]?.result === 'loss';
    switch (card.reAnalyze) {
        case 'every_trade':
            return true;
        case 'first_entry':
            return n === 0;
        case 'after_loss':
            return lastLoss;
        default:
            return n > 0 && n % Math.max(1, card.afterN) === 0;
    }
};

const SquaresIcon = () => (
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 32 32' width='32' height='32' role='img' aria-hidden='true'>
        <path fill='#85ACB0' d='M13.334 18.667v8h-8v-8zM26.667 5.333v8h-8v-8z' />
        <path fill='#FF444F' d='M26.667 18.667v8h-8v-8zM13.334 5.333v8h-8v-8z' />
    </svg>
);

const TrianglesIcon = () => (
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 32 32' width='32' height='32' role='img' aria-hidden='true'>
        <path fill='#85ACB0' d='m10 17.167 4.667 7H5.334zm12 0 4.667 7h-9.333z' />
        <path fill='#FF444F' d='m11.334 14.833 4.666-7 4.667 7z' />
    </svg>
);

const TrendUpIcon = () => (
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 32 32' width='32' height='32' role='img' aria-hidden='true'>
        <path fill='#FF444F' d='m12.586 22.667-2.654 2.666H6.115l2.667-2.666zM24 6.667a2.667 2.667 0 0 1 2.667 2.666v8h-.013A2.653 2.653 0 0 1 24 14.68v-3.467l-8 8.027v-3.792l6.115-6.115h-3.461A2.653 2.653 0 0 1 16 6.68v-.013z' />
        <path fill='#85ACB0' d='M26.667 20H5.334v2.667h21.333z' />
    </svg>
);

const TrendDownIcon = () => (
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 32 32' width='32' height='32' role='img' aria-hidden='true'>
        <path fill='#FF444F' d='m16 12.76 8 8.027V17.32a2.653 2.653 0 0 1 2.654-2.653h.013v8A2.667 2.667 0 0 1 24 25.333h-8v-.013a2.653 2.653 0 0 1 2.654-2.653h3.46L16 16.552zM9.932 6.667l2.654 2.666H8.782L6.115 6.667z' />
        <path fill='#85ACB0' d='M26.667 9.333H5.334V12h21.333z' />
    </svg>
);

const RiseIcon = () => (
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 32 32' width='32' height='32' role='img' aria-hidden='true'>
        <path fill='#FF444F' d='M24 5.333h-6.666v.014A2.653 2.653 0 0 0 19.987 8h2.133L10.667 19.448v3.77L24 9.886v2.134a2.653 2.653 0 0 0 2.654 2.648h.013V8A2.667 2.667 0 0 0 24 5.333' />
        <path fill='#85ACB0' d='M7.219 26.667H5.333V24h4.553z' />
    </svg>
);

const FallIcon = () => (
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 32 32' width='32' height='32' role='img' aria-hidden='true'>
        <path fill='#FF444F' d='M26.654 17.333A2.653 2.653 0 0 0 24 19.987v2.133L10.667 8.787v3.765L22.115 24h-2.133a2.653 2.653 0 0 0-2.648 2.653v.014H24A2.667 2.667 0 0 0 26.667 24v-6.667z' />
        <path fill='#85ACB0' d='M5.334 8V5.333h1.885L9.886 8z' />
    </svg>
);

const BurstIcon = () => (
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 32 32' width='32' height='32' role='img' aria-hidden='true'>
        <path fill='#FF444F' d='m10.01 8.457 5.654 5.658a2.667 2.667 0 0 1 0 3.77l-5.656 5.658-.008-.01a2.65 2.65 0 0 1 0-3.752l2.445-2.448-7.111.016v-2.682h7.111L10 12.22a2.65 2.65 0 0 1 0-3.753zm11.98 0 .01.01a2.65 2.65 0 0 1 0 3.752l-2.445 2.448 7.112-.016v2.682h-7.112l2.447 2.447a2.65 2.65 0 0 1 0 3.753l-.01.01-4.658-4.659.997-.999a2.667 2.667 0 0 0 0-3.77l-.997-.999z' />
        <path fill='#85ACB0' d='M17.334 21.333v5.334h-2.667v-5.334zm0-16v5.334h-2.667V5.333z' />
    </svg>
);

const Burst2Icon = () => (
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 32 32' width='32' height='32' role='img' aria-hidden='true'>
        <path fill='#FF444F' d='M26 15.984v2.683h-7.112l2.445 2.446a2.65 2.65 0 0 1 0 3.754l-.008.009L16 19.551l2.997-2.998q.243-.249.414-.553zM10.675 5.791l5.656 5.657a2.667 2.667 0 0 1 0 3.77l-5.656 5.658-.008-.01a2.65 2.65 0 0 1 0-3.751l2.445-2.448L6 14.683V12h7.112l-2.445-2.447a2.65 2.65 0 0 1 0-3.753zm10.649 4a2.65 2.65 0 0 1 .168 3.593l-.159.172-1.6 1.6a2.67 2.67 0 0 0-.588-2.214l-.148-.16-.33-.333z' />
        <path fill='#85ACB0' d='M18 22.667v4h-2.667v-4zm0-17.334v4h-2.667v-4z' />
    </svg>
);

const PinIcon = () => (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
        <path d='M12 17v5' />
        <path d='M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z' />
    </svg>
);

const CARD_ICONS: Record<string, { a: React.ReactNode; b: React.ReactNode }> = {
    'eo-digits': { a: <SquaresIcon />, b: <TrianglesIcon /> },
    'eo-pct': { a: <SquaresIcon />, b: <TrianglesIcon /> },
    'ou-digits': { a: <TrendUpIcon />, b: <TrendDownIcon /> },
    'ou-pct': { a: <TrendUpIcon />, b: <TrendDownIcon /> },
    rf: { a: <RiseIcon />, b: <FallIcon /> },
    md: { a: <BurstIcon />, b: <Burst2Icon /> },
};

const fmtPct = (n: number): string => `${n.toFixed(2)}%`;

const AutomatedPage = () => {
    const [cards, setCards] = useState<AutoCard[]>(CARDS);
    const [runningId, setRunningId] = useState<string | null>(null);
    const [, setTickSeq] = useState(0);
    const feedRef = useRef<TickFeed | null>(null);
    const cardsRef = useRef(cards);
    cardsRef.current = cards;
    const runningIdRef = useRef<string | null>(null);
    runningIdRef.current = runningId;
    const lastSignalAtRef = useRef(0);

    const { session, snap } = useHubSession(() => ({
        symbols: ['1HZ100V'],
        stake: 0.5,
        martingale: 1.2,
        takeProfit: 0,
        stopLoss: 0,
        durationTicks: 1,
        nameOf: s => VOL_MARKETS.find(m => m.symbol === s)?.name || s,
        evaluate: (symbol: string, series: SymbolSeries, state: HubSessionSnapshot): HubTradeIntent | null => {
            const id = runningIdRef.current;
            if (!id) return null;
            const card = cardsRef.current.find(c => c.id === id);
            if (!card || card.market !== symbol) return null;
            if (!evalGate(card, state)) return null;
            const intent = evalCard(card, series);
            if (intent) lastSignalAtRef.current = Date.now();
            return intent;
        },
    }));

    useEffect(() => {
        const feed = new TickFeed({ onTick: () => setTickSeq(v => v + 1) });
        feedRef.current = feed;
        feed.setSymbols(Array.from(new Set(cardsRef.current.map(c => c.market))));
        feed.start();
        return () => {
            feed.stop();
            feedRef.current = null;
        };
    }, []);

    const marketsKey = useMemo(() => Array.from(new Set(cards.map(c => c.market))).join(','), [cards]);
    useEffect(() => {
        feedRef.current?.setSymbols(marketsKey.split(',').filter(Boolean));
    }, [marketsKey]);

    const updateCard = (id: string, patch: Partial<AutoCard>) => {
        setCards(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
    };

    const startCard = (card: AutoCard) => {
        if (snap.running) session.stop();
        lastSignalAtRef.current = 0;
        session.updateOptions({
            symbols: [card.market],
            stake: card.stake,
            durationTicks: card.ticks,
            martingale: card.martingale,
        });
        setRunningId(card.id);
        session.start();
    };

    const stopCard = () => {
        setRunningId(null);
        session.stop();
    };

    const series = (symbol: string): SymbolSeries | undefined => feedRef.current?.getSeries(symbol);

    const ordered = [...cards].sort((a, b) => Number(b.pinned) - Number(a.pinned));

    const renderSequence = (card: AutoCard, length: number, labelOf: (d: number) => string, clsOf: (d: number) => string) => {
        const s = series(card.market);
        const digits = s?.digits ?? [];
        const tail = digits.slice(-length);
        while (tail.length < length) tail.unshift(-1);
        return (
            <div className='auto-trader-sequence-container'>
                {tail.map((d, i) => (
                    <div key={`${card.id}-seq-${i}`} className={`auto-trader-digit-box ${d < 0 ? '' : clsOf(d)}`}>
                        {d < 0 ? '' : labelOf(d)}
                    </div>
                ))}
            </div>
        );
    };

    const renderPredictionButtons = (card: AutoCard) => (
        <div className='auto-trader-prediction-buttons'>
            {Array.from({ length: 10 }, (_, d) => (
                <button
                    key={`${card.id}-p-${d}`}
                    type='button'
                    className={`auto-trader-prediction-button ${card.pred === d ? 'auto-trader-active' : ''}`}
                    onClick={() => updateCard(card.id, { pred: d, barrier: d, thenType: card.thenType })}
                >
                    {d}
                </button>
            ))}
        </div>
    );

    const renderBars = (card: AutoCard, left: { label: string; pct: number; cls: string }, right: { label: string; pct: number; cls: string }) => (
        <div className='auto-trader-manual-bars'>
            <div className={`auto-trader-manual-bar ${left.cls}`} style={{ width: `${left.pct}%` }}>
                <span>{left.label}</span>
            </div>
            <div className={`auto-trader-manual-bar ${right.cls}`} style={{ width: `${right.pct}%` }}>
                <span>{right.label}</span>
            </div>
        </div>
    );

    const pctStats = (card: AutoCard): { evenPct: number; oddPct: number; overPct: number; underPct: number; matchPct: number; differPct: number; risePct: number; fallPct: number } => {
        const s = series(card.market);
        const digits = (s?.digits ?? []).slice(-WINDOWS);
        const quotes = (s?.quotes ?? []).slice(-WINDOWS);
        const base = Math.max(1, digits.length);
        const evenCount = digits.filter(d => d % 2 === 0).length;
        const evenPct = digits.length ? (evenCount * 100) / base : 50;
        const overCount = digits.filter(d => d > card.pred).length;
        const overPct = digits.length ? (overCount * 100) / base : 50;
        const matchCount = digits.filter(d => d === card.pred).length;
        const matchPct = digits.length ? (matchCount * 100) / base : 10;
        let up = 0;
        let down = 0;
        for (let i = 1; i < quotes.length; i += 1) {
            if (quotes[i] > quotes[i - 1]) up += 1;
            else if (quotes[i] < quotes[i - 1]) down += 1;
        }
        const moveTotal = Math.max(1, up + down);
        return {
            evenPct,
            oddPct: 100 - evenPct,
            overPct,
            underPct: (digits.filter(d => d < card.pred).length * 100) / base,
            matchPct,
            differPct: 100 - matchPct,
            risePct: (up * 100) / moveTotal,
            fallPct: (down * 100) / moveTotal,
        };
    };

    const marketOptions = (card: AutoCard) => (
        <select className='auto-trader-market-select' value={card.market} onChange={e => updateCard(card.id, { market: e.target.value })}>
            {VOL_MARKETS.map(m => (
                <option key={m.symbol} value={m.symbol}>
                    {m.name}
                </option>
            ))}
        </select>
    );

    const currentTick = (card: AutoCard) => {
        const s = series(card.market);
        const q = s?.quotes.length ? s.quotes[s.quotes.length - 1] : null;
        return <div className='auto-trader-current-tick'>{q === null ? '—' : q.toFixed(s?.pipSize ?? 2)}</div>;
    };

    const reAnalyzeRow = (card: AutoCard) => (
        <div className='auto-trader-signal-check'>
            <span>Re-Analyze</span>
            <select value={card.reAnalyze} onChange={e => updateCard(card.id, { reAnalyze: e.target.value as ReAnalyze })}>
                <option value='every_trade'>On Every Trade</option>
                <option value='after_every'>After Every</option>
                <option value='first_entry'>On First Entry Only</option>
                <option value='after_loss'>After Loss Only</option>
            </select>
            <input type='number' min='1' step='1' value={card.afterN} onChange={e => updateCard(card.id, { afterN: Math.max(1, Number(e.target.value)) })} />
            <span>trades</span>
        </div>
    );

    const widgetRow = (card: AutoCard) => (
        <div className='auto-trader-mobile-widget auto-trader-duration-amount-selector'>
            <div className='auto-trader-mobile-widget__duration auto-trader-mobile-widget__button'>
                <small>Ticks</small>
                <input className='auto-trader-custom-prediction' type='number' min='1' max='9' value={card.ticks} onChange={e => updateCard(card.id, { ticks: Math.min(9, Math.max(1, Number(e.target.value))) })} />
            </div>
            <div className='auto-trader-mobile-widget__amount auto-trader-mobile-widget__button'>
                <small>Stake</small>
                <input className='auto-trader-custom-prediction' type='number' min='0.35' step='0.1' value={card.stake} onChange={e => updateCard(card.id, { stake: Math.max(0.35, Number(e.target.value)) })} />
            </div>
            <div className='auto-trader-mobile-widget__type auto-trader-mobile-widget__button'>
                <small>Martingale</small>
                <input className='auto-trader-custom-prediction' type='number' min='1' step='0.1' value={card.martingale} onChange={e => updateCard(card.id, { martingale: Math.max(1, Number(e.target.value)) })} />
            </div>
        </div>
    );

    const startStop = (card: AutoCard, runningLabel: string, idleLabel: string) => {
        const running = runningId === card.id;
        return (
            <button
                type='button'
                className={`auto-trader-auto-trade-btn ${running ? 'auto-trader-stop' : 'auto-trader-start'}`}
                onClick={() => (running ? stopCard() : startCard(card))}
            >
                {running ? runningLabel : idleLabel}
            </button>
        );
    };

    const statusRow = (card: AutoCard) => {
        const running = runningId === card.id;
        const signalFresh = Date.now() - lastSignalAtRef.current < 4000;
        const live = running && signalFresh;
        return (
            <div className={`auto-trader-status-indicator ${live ? 'auto-trader-signal' : 'auto-trader-nosignal'}`}>
                {live ? '◌ Signal' : '◌ Waiting...'}
            </div>
        );
    };

    const cardHeader = (card: AutoCard) => (
        <div className='auto-trader-card-header'>
            {CARD_ICONS[card.id]?.a}
            {CARD_ICONS[card.id]?.b}
            <h3>{card.title}</h3>
            <button
                type='button'
                className={`auto-trader-pin-button ${card.pinned ? 'auto-trader-pinned' : ''}`}
                onClick={() => updateCard(card.id, { pinned: !card.pinned })}
                aria-label={card.pinned ? 'Unpin card' : 'Pin card'}
            >
                <PinIcon />
            </button>
        </div>
    );

    const renderCard = (card: AutoCard) => {
        const stats = pctStats(card);
        let body: React.ReactNode = null;
        switch (card.id) {
            case 'eo-digits':
                body = (
                    <>
                        {renderSequence(card, 7, d => (d % 2 === 0 ? 'E' : 'O'), d => (d % 2 === 0 ? 'auto-trader-even' : 'auto-trader-odd'))}
                        <div className='auto-trader-rule-item'>
                            <span>Check if the last</span>
                            <input type='number' min='1' max='10' value={card.n} onChange={e => updateCard(card.id, { n: Math.min(10, Math.max(1, Number(e.target.value))) })} />
                            <span>digits are</span>
                            <select value={card.checkSide} onChange={e => updateCard(card.id, { checkSide: e.target.value })}>
                                <option value='even'>Even</option>
                                <option value='odd'>Odd</option>
                            </select>
                        </div>
                        <div className='auto-trader-rule-item'>
                            <span>Then trade</span>
                            <select value={card.thenType} onChange={e => updateCard(card.id, { thenType: e.target.value })}>
                                <option value='DIGITEVEN'>Even</option>
                                <option value='DIGITODD'>Odd</option>
                            </select>
                        </div>
                        {reAnalyzeRow(card)}
                        {widgetRow(card)}
                        {startStop(card, 'Stop Auto Trading', 'Start Auto Trading')}
                    </>
                );
                break;
            case 'eo-pct':
                body = (
                    <>
                        {renderBars(
                            card,
                            { label: `Even: ${fmtPct(stats.evenPct)}`, pct: stats.evenPct, cls: 'auto-trader-even' },
                            { label: `Odd: ${fmtPct(stats.oddPct)}`, pct: stats.oddPct, cls: 'auto-trader-odd' }
                        )}
                        <div className='auto-trader-auto-trade-controls'>
                            <div className='auto-trader-rule-item'>
                                <span>If</span>
                                <select value={card.checkSide} onChange={e => updateCard(card.id, { checkSide: e.target.value })}>
                                    <option value='even'>Even%</option>
                                    <option value='odd'>Odd%</option>
                                </select>
                                <select value={card.cmp} onChange={e => updateCard(card.id, { cmp: e.target.value as Cmp })}>
                                    <option value='greater'>≥</option>
                                    <option value='less'>≤</option>
                                </select>
                                <input type='number' min='0' max='100' value={card.threshold} onChange={e => updateCard(card.id, { threshold: Math.min(100, Math.max(0, Number(e.target.value))) })} />
                                <span>%</span>
                            </div>
                            <div className='auto-trader-rule-item'>
                                <span>Then trade</span>
                                <select value={card.thenType} onChange={e => updateCard(card.id, { thenType: e.target.value })}>
                                    <option value='DIGITEVEN'>Even</option>
                                    <option value='DIGITODD'>Odd</option>
                                </select>
                            </div>
                            {reAnalyzeRow(card)}
                            {widgetRow(card)}
                            {startStop(card, 'Stop Auto Trade', 'Start Auto Trade')}
                            {statusRow(card)}
                        </div>
                    </>
                );
                break;
            case 'ou-digits':
                body = (
                    <>
                        {renderSequence(card, 8, d => (d > 4 ? 'O' : 'U'), d => (d > 4 ? 'auto-trader-over' : 'auto-trader-under'))}
                        {renderPredictionButtons(card)}
                        <div className='auto-trader-rule-item'>
                            <span>Check if the last</span>
                            <input type='number' min='1' max='10' value={card.n} onChange={e => updateCard(card.id, { n: Math.min(10, Math.max(1, Number(e.target.value))) })} />
                            <span>digits are</span>
                            <select value={card.checkSide} onChange={e => updateCard(card.id, { checkSide: e.target.value })}>
                                <option value='greater than'>Greater than</option>
                                <option value='less than'>Less than</option>
                                <option value='equal to'>Equal to</option>
                            </select>
                            <input type='number' min='0' max='9' value={card.pred} onChange={e => updateCard(card.id, { pred: Math.min(9, Math.max(0, Number(e.target.value))) })} />
                        </div>
                        <div className='auto-trader-rule-item'>
                            <span>Then trade</span>
                            <select
                                value={card.thenType}
                                onChange={e => {
                                    const t = e.target.value;
                                    updateCard(card.id, { thenType: t, barrier: card.barrier });
                                }}
                            >
                                <option value='DIGITOVER'>Over</option>
                                <option value='DIGITUNDER'>Under</option>
                            </select>
                            <span>prediction</span>
                            <input type='number' min='0' max='9' value={card.barrier} onChange={e => updateCard(card.id, { barrier: Math.min(9, Math.max(0, Number(e.target.value))) })} />
                        </div>
                        {reAnalyzeRow(card)}
                        {widgetRow(card)}
                        {startStop(card, 'Stop Auto Trading', 'Start Auto Trading')}
                    </>
                );
                break;
            case 'ou-pct':
                body = (
                    <>
                        {renderPredictionButtons(card)}
                        {renderBars(
                            card,
                            { label: `Over ${card.pred}: ${fmtPct(stats.overPct)}`, pct: stats.overPct, cls: 'auto-trader-over' },
                            { label: `Under ${card.pred}: ${fmtPct(stats.underPct)}`, pct: stats.underPct, cls: 'auto-trader-under' }
                        )}
                        <div className='auto-trader-auto-trade-controls'>
                            <div className='auto-trader-rule-item'>
                                <span>If Digit {card.pred}</span>
                                <select value={card.checkSide} onChange={e => updateCard(card.id, { checkSide: e.target.value })}>
                                    <option value='over'>Over %</option>
                                    <option value='under'>Under %</option>
                                </select>
                                <span>is</span>
                                <select value={card.cmp} onChange={e => updateCard(card.id, { cmp: e.target.value as Cmp })}>
                                    <option value='greater'>≥</option>
                                    <option value='less'>≤</option>
                                </select>
                                <span>than</span>
                                <input type='number' min='0' max='100' value={card.threshold} onChange={e => updateCard(card.id, { threshold: Math.min(100, Math.max(0, Number(e.target.value))) })} />
                                <span>%</span>
                            </div>
                            <div className='auto-trader-rule-item'>
                                <span>Then trade</span>
                                <select
                                    value={card.thenType}
                                    onChange={e => {
                                        const t = e.target.value;
                                        updateCard(card.id, { thenType: t, barrier: card.pred });
                                    }}
                                >
                                    <option value='DIGITOVER'>Over {card.pred}</option>
                                    <option value='DIGITUNDER'>Under {card.pred}</option>
                                </select>
                            </div>
                            {reAnalyzeRow(card)}
                            {widgetRow(card)}
                            {startStop(card, 'Stop Auto Trade', 'Start Auto Trade')}
                            {statusRow(card)}
                        </div>
                    </>
                );
                break;
            case 'rf':
                body = (
                    <>
                        {renderBars(
                            card,
                            { label: `Rise: ${fmtPct(stats.risePct)}`, pct: stats.risePct, cls: 'auto-trader-even' },
                            { label: `Fall: ${fmtPct(stats.fallPct)}`, pct: stats.fallPct, cls: 'auto-trader-odd' }
                        )}
                        <div className='auto-trader-auto-trade-controls'>
                            <div className='auto-trader-rule-item'>
                                <span>If</span>
                                <select value={card.checkSide} onChange={e => updateCard(card.id, { checkSide: e.target.value })}>
                                    <option value='rise'>Rise%</option>
                                    <option value='fall'>Fall%</option>
                                </select>
                                <select value={card.cmp} onChange={e => updateCard(card.id, { cmp: e.target.value as Cmp })}>
                                    <option value='greater'>≥</option>
                                    <option value='less'>≤</option>
                                </select>
                                <input type='number' min='0' max='100' value={card.threshold} onChange={e => updateCard(card.id, { threshold: Math.min(100, Math.max(0, Number(e.target.value))) })} />
                                <span>%</span>
                            </div>
                            <div className='auto-trader-rule-item'>
                                <span>Then trade</span>
                                <select value={card.thenType} onChange={e => updateCard(card.id, { thenType: e.target.value })}>
                                    <option value='CALL'>Rise</option>
                                    <option value='PUT'>Fall</option>
                                </select>
                            </div>
                            {reAnalyzeRow(card)}
                            {widgetRow(card)}
                            {startStop(card, 'Stop Auto Trade', 'Start Auto Trade')}
                            {statusRow(card)}
                        </div>
                    </>
                );
                break;
            case 'md':
                body = (
                    <>
                        {renderPredictionButtons(card)}
                        {renderBars(
                            card,
                            { label: `Matches: ${fmtPct(stats.matchPct)}`, pct: stats.matchPct, cls: 'auto-trader-even' },
                            { label: `Differs: ${fmtPct(stats.differPct)}`, pct: stats.differPct, cls: 'auto-trader-odd' }
                        )}
                        <div className='auto-trader-auto-trade-controls'>
                            <div className='auto-trader-rule-item'>
                                <span>If Digit {card.pred}</span>
                                <select value={card.checkSide} onChange={e => updateCard(card.id, { checkSide: e.target.value })}>
                                    <option value='matches'>Matches %</option>
                                    <option value='differs'>Differs %</option>
                                </select>
                                <span>is</span>
                                <select value={card.cmp} onChange={e => updateCard(card.id, { cmp: e.target.value as Cmp })}>
                                    <option value='greater'>≥</option>
                                    <option value='less'>≤</option>
                                </select>
                                <span>than</span>
                                <input type='number' min='0' max='100' value={card.threshold} onChange={e => updateCard(card.id, { threshold: Math.min(100, Math.max(0, Number(e.target.value))) })} />
                                <span>%</span>
                            </div>
                            <div className='auto-trader-rule-item'>
                                <span>Then trade</span>
                                <select
                                    value={card.thenType}
                                    onChange={e => {
                                        const t = e.target.value;
                                        updateCard(card.id, { thenType: t, barrier: card.pred });
                                    }}
                                >
                                    <option value='DIGITMATCH'>Matches {card.pred}</option>
                                    <option value='DIGITDIFF'>Differs {card.pred}</option>
                                </select>
                            </div>
                            {reAnalyzeRow(card)}
                            {widgetRow(card)}
                            {startStop(card, 'Stop Auto Trade', 'Start Auto Trade')}
                            {statusRow(card)}
                        </div>
                    </>
                );
                break;
            default:
                body = null;
        }
        return (
            <div key={card.id} className='auto-trader-card'>
                {cardHeader(card)}
                <div className='auto-trader-market-controls'>
                    {marketOptions(card)}
                    {currentTick(card)}
                </div>
                {body}
            </div>
        );
    };

    return (
        <div className='auto-trader-container'>
            <div className='auto-trader-interface'>
                <div className='auto-trader-cards-container'>{ordered.map(renderCard)}</div>
            </div>
        </div>
    );
};

export default AutomatedPage;
