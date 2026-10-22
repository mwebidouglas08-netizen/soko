import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { HubSessionSnapshot, HubTradeIntent } from '@/bot/engine/hub-session';
import { useHubSession } from '@/bot/use-hub-session';
import { SymbolSeries, TickFeed } from '@/bot/deriv/ticks';
import { VOL_MARKETS } from '../hub/markets';
import './premium-ai.scss';

type Family = 'even-odd' | 'over-under' | 'rise-fall';

interface StrategyMeta {
    id: string;
    index: string;
    tone: 'cyan' | 'gold' | 'violet';
    label: string;
    title: string;
    desc: string;
    family: Family;
    unit: 'digits' | 'ticks';
    selectAria: string;
    condA: string;
    ta: string;
    condB: string;
    tb: string;
}

const STRATEGIES: StrategyMeta[] = [
    {
        id: 'parity',
        index: '01',
        tone: 'cyan',
        label: 'Parity reversal',
        title: 'Even–Odd AI',
        desc: 'All Even digits trigger Odd. All Odd digits trigger Even.',
        family: 'even-odd',
        unit: 'digits',
        selectAria: 'Number of digits to confirm',
        condA: 'all Even',
        ta: 'Odd',
        condB: 'all Odd',
        tb: 'Even',
    },
    {
        id: 'range',
        index: '02',
        tone: 'gold',
        label: 'Digit range reversal',
        title: 'Over 4–Under 5 AI',
        desc: 'Digits below 4 trigger Over 4. Digits above 5 trigger Under 5.',
        family: 'over-under',
        unit: 'digits',
        selectAria: 'Number of digits to confirm',
        condA: 'all less than 4',
        ta: 'Over 4',
        condB: 'all greater than 5',
        tb: 'Under 5',
    },
    {
        id: 'direction',
        index: '03',
        tone: 'violet',
        label: 'Direction reversal',
        title: 'Rise–Fall AI',
        desc: 'A rising run triggers Fall. A falling run triggers Rise.',
        family: 'rise-fall',
        unit: 'ticks',
        selectAria: 'Number of ticks to confirm',
        condA: 'continuously rising',
        ta: 'Fall',
        condB: 'continuously falling',
        tb: 'Rise',
    },
];

const contractLabel = (c: string): string =>
    c === 'DIGITODD'
        ? 'Odd'
        : c === 'DIGITEVEN'
          ? 'Even'
          : c === 'DIGITOVER'
            ? 'Over 4'
            : c === 'DIGITUNDER'
              ? 'Under 5'
              : c === 'CALL'
                ? 'Rise'
                : 'Fall';

const tailText = (c: string): string =>
    c === 'DIGITODD'
        ? 'Even'
        : c === 'DIGITEVEN'
          ? 'Odd'
          : c === 'DIGITOVER'
            ? 'less than 4'
            : c === 'DIGITUNDER'
              ? 'greater than 5'
              : c === 'PUT'
                ? 'continuously rising'
                : 'continuously falling';

const resolve = (family: Family, n: number, digits: number[], quotes: number[], symbol: string): HubTradeIntent | null => {
    if (digits.length < n) return null;
    const tail = digits.slice(-n);
    if (family === 'even-odd') {
        const evens = tail.filter(d => d % 2 === 0).length;
        if (evens === n) return { symbol, contractType: 'DIGITODD' };
        if (evens === 0) return { symbol, contractType: 'DIGITEVEN' };
        return null;
    }
    if (family === 'over-under') {
        const highs = tail.filter(d => d > 4).length;
        const lows = tail.filter(d => d < 5).length;
        if (highs === n) return { symbol, contractType: 'DIGITUNDER', barrier: 5 };
        if (lows === n) return { symbol, contractType: 'DIGITOVER', barrier: 4 };
        return null;
    }
    if (quotes.length < n + 1) return null;
    const window = quotes.slice(-(n + 1));
    let rising = true;
    let falling = true;
    for (let k = 1; k < window.length; k += 1) {
        if (window[k] <= window[k - 1]) rising = false;
        if (window[k] >= window[k - 1]) falling = false;
    }
    if (rising) return { symbol, contractType: 'PUT' };
    if (falling) return { symbol, contractType: 'CALL' };
    return null;
};

const BotIcon = ({ size }: { size: number }) => (
    <svg
        xmlns='http://www.w3.org/2000/svg'
        width={size}
        height={size}
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        className='lucide lucide-bot'
    >
        <path d='M12 8V4H8' />
        <rect width='16' height='12' x='4' y='8' rx='2' />
        <path d='M2 14h2' />
        <path d='M20 14h2' />
        <path d='M15 13v2' />
        <path d='M9 13v2' />
    </svg>
);

const ArrowLeftIcon = () => (
    <svg
        xmlns='http://www.w3.org/2000/svg'
        width='17'
        height='17'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        className='lucide lucide-arrow-left'
    >
        <path d='m12 19-7-7 7-7' />
        <path d='M19 12H5' />
    </svg>
);

const RadarIcon = () => (
    <svg
        xmlns='http://www.w3.org/2000/svg'
        width='19'
        height='19'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        className='lucide lucide-radar'
    >
        <path d='M19.07 4.93A10 10 0 0 0 6.99 3.34' />
        <path d='M4 6h.01' />
        <path d='M2.29 9.62A10 10 0 1 0 21.31 8.35' />
        <path d='M16.24 7.76A6 6 0 1 0 8.23 16.67' />
        <path d='M12 18h.01' />
        <path d='M17.99 11.66A6 6 0 0 1 15.77 16.67' />
        <circle cx='12' cy='12' r='2' />
        <path d='m13.41 10.59 5.66-5.66' />
    </svg>
);

const ActivityIcon = () => (
    <svg
        xmlns='http://www.w3.org/2000/svg'
        width='19'
        height='19'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        className='lucide lucide-activity'
    >
        <path d='M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2' />
    </svg>
);

const PremiumAIPage = observer(() => {
    const [openId, setOpenId] = useState<string | null>(null);
    const strategy = STRATEGIES.find(s => s.id === openId) || null;

    const [n, setN] = useState(5);
    const [scanAll, setScanAll] = useState(true);
    const [stake, setStake] = useState(0.5);
    const [ticks, setTicks] = useState(1);
    const [takeProfit, setTakeProfit] = useState(5);
    const [stopLoss, setStopLoss] = useState(30);
    const [martingale, setMartingale] = useState(2);
    const [signal, setSignal] = useState<string | null>(null);
    const [wasStopped, setWasStopped] = useState(false);

    const cfgRef = useRef<{ family: Family; n: number; meta: StrategyMeta }>({
        family: strategy?.family || 'even-odd',
        n: 5,
        meta: strategy || STRATEGIES[0],
    });
    cfgRef.current = { family: (strategy?.family || 'even-odd') as Family, n, meta: strategy || STRATEGIES[0] };
    const signalRef = useRef<string | null>(null);

    const { session, snap } = useHubSession(() => ({
        symbols: VOL_MARKETS.map(m => m.symbol),
        stake: 0.5,
        martingale: 2,
        takeProfit: 5,
        stopLoss: 30,
        durationTicks: 1,
        nameOf: s => VOL_MARKETS.find(m => m.symbol === s)?.name || s,
        evaluate: (symbol: string, series: SymbolSeries, _state: HubSessionSnapshot): HubTradeIntent | null => {
            const intent = resolve(cfgRef.current.family, cfgRef.current.n, series.digits, series.quotes, symbol);
            if (intent) {
                const meta = cfgRef.current.meta;
                const msg = `Last ${cfgRef.current.n} ${meta.unit} are ${tailText(intent.contractType)}. Sending Trade ${contractLabel(intent.contractType)} on ${symbol}...`;
                if (signalRef.current !== msg) {
                    signalRef.current = msg;
                    setSignal(msg);
                }
            }
            return intent;
        },
    }));

    const prevRunning = useRef(snap.running);
    useEffect(() => {
        if (prevRunning.current && !snap.running) setWasStopped(true);
        prevRunning.current = snap.running;
    }, [snap.running]);

    const feedRef = useRef<TickFeed | null>(null);
    const dirtyRef = useRef(false);
    const [tickVer, setTickVer] = useState(0);
    useEffect(() => {
        const feed = new TickFeed({
            onTick: () => {
                dirtyRef.current = true;
            },
        });
        feed.setSymbols(VOL_MARKETS.map(m => m.symbol));
        feed.start();
        feedRef.current = feed;
        const timer = window.setInterval(() => {
            if (dirtyRef.current) {
                dirtyRef.current = false;
                setTickVer(v => v + 1);
            }
        }, 300);
        return () => {
            window.clearInterval(timer);
            feed.stop();
            feedRef.current = null;
        };
    }, []);

    const sync = (patch: { stake?: number; ticks?: number; takeProfit?: number; stopLoss?: number; martingale?: number }) => {
        if (patch.stake !== undefined) setStake(patch.stake);
        if (patch.ticks !== undefined) setTicks(patch.ticks);
        if (patch.takeProfit !== undefined) setTakeProfit(patch.takeProfit);
        if (patch.stopLoss !== undefined) setStopLoss(patch.stopLoss);
        if (patch.martingale !== undefined) setMartingale(patch.martingale);
        session.updateOptions({
            stake: patch.stake ?? stake,
            durationTicks: patch.ticks ?? ticks,
            takeProfit: patch.takeProfit ?? takeProfit,
            stopLoss: patch.stopLoss ?? stopLoss,
            martingale: patch.martingale ?? martingale,
        });
    };

    const resetSignals = () => {
        setSignal(null);
        signalRef.current = null;
        setWasStopped(false);
    };

    const openStrategy = (id: string) => {
        resetSignals();
        setOpenId(id);
    };

    const backToList = () => {
        resetSignals();
        setOpenId(null);
    };

    const startScanner = () => {
        resetSignals();
        session.start();
    };

    const stopScanner = () => {
        session.stop();
        setWasStopped(true);
    };

    const running = snap.running;
    void tickVer;

    if (!strategy) {
        return (
            <main className='ai-bots ai-bots--light'>
                <header className='ai-bots__hero'>
                    <div className='ai-bots__hero-icon'>
                        <BotIcon size={26} />
                    </div>
                    <div>
                        <span>Premium Scanner</span>
                        <h1>Premium AI Bots</h1>
                        <p>Elite signal detection across even-odd, over-under, and rise-fall strategies.</p>
                    </div>
                </header>
                <section className='ai-bots__strategy-grid'>
                    {STRATEGIES.map(s => (
                        <button
                            key={s.id}
                            type='button'
                            className={`ai-bots__strategy ai-bots__strategy--${s.tone}`}
                            onClick={() => openStrategy(s.id)}
                        >
                            <span>{s.index}</span>
                            <BotIcon size={23} />
                            <small>{s.label}</small>
                            <strong>{s.title}</strong>
                            <p>{s.desc}</p>
                            <em>Open trading workspace →</em>
                        </button>
                    ))}
                </section>
            </main>
        );
    }

    const feed = feedRef.current;
    const defaultStatus = `${strategy.title} selected. Configure and start scanning.`;
    const statusText = running ? (signal ?? defaultStatus) : wasStopped ? 'AI market scanner stopped.' : defaultStatus;

    let readyCount = 0;
    const rows = VOL_MARKETS.map(m => {
        const series = feed?.getSeries(m.symbol);
        const digits = series ? series.digits : [];
        const quotes = series ? series.quotes : [];
        const pip = series ? series.pipSize : 2;
        const intent = resolve(strategy.family, n, digits.slice(-Math.max(n, 1)), quotes, m.symbol);
        if (intent) readyCount += 1;
        const last = quotes.length ? quotes[quotes.length - 1] : null;
        const shown = digits.slice(-5);
        return { m, digits: shown, digitCount: digits.length, pip, intent, price: last };
    });

    return (
        <main className='ai-bots ai-bots--light'>
            <header className='ai-bots__workspace-bar'>
                <div>
                    <strong>{strategy.title}</strong>
                    <span>{strategy.desc}</span>
                </div>
                <div className='ai-bots__hero-actions'>
                    <button type='button' className='ai-bots__back' onClick={backToList}>
                        <ArrowLeftIcon /> Strategies
                    </button>
                    <div className={`ai-bots__live${running ? ' is-running' : ''}`}>
                        <i />
                        {running ? 'Live scanning' : 'Scanner idle'}
                    </div>
                </div>
            </header>
            <section className='ai-bots__command'>
                <div className='ai-bots__setup'>
                    <div className='ai-bots__section-title'>
                        <RadarIcon />
                        <div>
                            <strong>Scanner setup</strong>
                            <span>Configure entry confirmation</span>
                        </div>
                    </div>
                    <button type='button' className={`ai-bots__start${running ? ' is-stop' : ''}`} onClick={running ? stopScanner : startScanner}>
                        {running ? (
                            <svg
                                xmlns='http://www.w3.org/2000/svg'
                                width='18'
                                height='18'
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                className='lucide lucide-square'
                            >
                                <rect width='14' height='14' x='5' y='5' rx='1' />
                            </svg>
                        ) : (
                            <svg
                                xmlns='http://www.w3.org/2000/svg'
                                width='18'
                                height='18'
                                viewBox='0 0 24 24'
                                fill='currentColor'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                className='lucide lucide-play'
                            >
                                <polygon points='6 3 20 12 6 21 6 3' />
                            </svg>
                        )}
                        {running ? 'Stop scanner' : 'Start AI scanner'}
                    </button>
                    <div className='ai-bots__rule-builder'>
                        <span>Trading rule</span>
                        <p>
                            If the last
                            <select aria-label={strategy.selectAria} value={n} onChange={e => setN(Number(e.target.value))}>
                                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
                                    <option key={v} value={v}>
                                        {v}
                                    </option>
                                ))}
                            </select>
                            {strategy.unit} are <b>{strategy.condA}</b>, then trade <strong>{strategy.ta}</strong>.
                        </p>
                        <p>
                            Else, if they are <b>{strategy.condB}</b>, then trade <strong>{strategy.tb}</strong>.
                        </p>
                        <small>Otherwise, continue scanning until either condition is confirmed.</small>
                    </div>
                    <label className='ai-bots__toggle'>
                        <div>
                            <span>Scan all markets</span>
                            <small>Monitor every synthetic index simultaneously</small>
                        </div>
                        <input type='checkbox' checked={scanAll} onChange={e => setScanAll(e.target.checked)} />
                        <i />
                    </label>
                    <div className='ai-bots__risk-grid'>
                        <label>
                            <span>Stake</span>
                            <input
                                type='number'
                                min='0.35'
                                step='0.01'
                                value={stake}
                                onChange={e => sync({ stake: Number(e.target.value) })}
                            />
                        </label>
                        <label>
                            <span>Ticks</span>
                            <input type='number' min='1' value={ticks} onChange={e => sync({ ticks: Number(e.target.value) })} />
                        </label>
                        <label>
                            <span>Take profit</span>
                            <input
                                type='number'
                                min='0'
                                step='0.01'
                                value={takeProfit}
                                onChange={e => sync({ takeProfit: Number(e.target.value) })}
                            />
                        </label>
                        <label>
                            <span>Stop loss</span>
                            <input
                                type='number'
                                min='0'
                                step='0.01'
                                value={stopLoss}
                                onChange={e => sync({ stopLoss: Number(e.target.value) })}
                            />
                        </label>
                        <label>
                            <span>Martingale</span>
                            <input
                                type='number'
                                min='1'
                                step='0.1'
                                value={martingale}
                                onChange={e => sync({ martingale: Number(e.target.value) })}
                            />
                        </label>
                    </div>
                </div>
                <div className='ai-bots__markets'>
                    <div className='ai-bots__markets-head'>
                        <div>
                            <ActivityIcon />
                            <span>Live market scan</span>
                        </div>
                        <strong>
                            {readyCount} signal{readyCount === 1 ? '' : 's'} ready
                        </strong>
                    </div>
                    <div className='ai-bots__market-list'>
                        {rows.map(({ m, digits, digitCount, pip, intent, price }) => (
                            <article key={m.symbol} className={intent ? `is-ready${running ? ' is-trading' : ''}` : ''}>
                                <div className='ai-bots__market-name'>
                                    <i />
                                    <div>
                                        <strong>{m.name}</strong>
                                        <span>{price === null ? '' : price.toFixed(pip)}</span>
                                    </div>
                                </div>
                                <div className='ai-bots__digits'>
                                    {digits.map((d, k) => (
                                        <b key={`${m.symbol}-${k}`}>{d}</b>
                                    ))}
                                </div>
                                <div className='ai-bots__market-state'>
                                    {intent ? (
                                        <>
                                            <strong>Trade {contractLabel(intent.contractType)}</strong>
                                            <span>
                                                Last {n} {strategy.unit} are {tailText(intent.contractType)}.
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <strong>Scanning</strong>
                                            <span>{Math.min(digitCount, 5)}/5 checked</span>
                                        </>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>
            <footer className='ai-bots__status'>
                <span>{statusText}</span>
                <strong>Total P/L {snap.profit.toFixed(2)}</strong>
            </footer>
        </main>
    );
});

export default PremiumAIPage;
export type { Family as PremiumAIFamily };
