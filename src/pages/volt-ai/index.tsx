import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { observer } from 'mobx-react-lite';
import { HubSessionSnapshot, HubTradeIntent } from '@/bot/engine/hub-session';
import { useHubSession } from '@/bot/use-hub-session';
import { useStore } from '@/hooks/useStore';
import { SymbolSeries } from '@/bot/deriv/ticks';
import { VOL_MARKETS } from '../hub/markets';
import './volt-ai.scss';

type VoltPair = 'over-under' | 'even-odd';

const Icon = ({ size = 18, children }: { size?: number; children: ReactNode }) => (
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
        aria-hidden='true'
    >
        {children}
    </svg>
);

const IcTrending = () => (
    <Icon size={22}>
        <polyline points='22 7 13.5 15.5 8.5 10.5 2 17' />
        <polyline points='16 7 22 7 22 13' />
    </Icon>
);
const IcDatabase = () => (
    <Icon>
        <ellipse cx='12' cy='5' rx='9' ry='3' />
        <path d='M3 5V19A9 3 0 0 0 21 19V5' />
        <path d='M3 12A9 3 0 0 0 21 12' />
    </Icon>
);
const IcFork = () => (
    <Icon>
        <circle cx='12' cy='18' r='3' />
        <circle cx='6' cy='6' r='3' />
        <circle cx='18' cy='6' r='3' />
        <path d='M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9' />
        <path d='M12 12v3' />
    </Icon>
);
const IcTarget = () => (
    <Icon>
        <circle cx='12' cy='12' r='10' />
        <circle cx='12' cy='12' r='6' />
        <circle cx='12' cy='12' r='2' />
    </Icon>
);
const IcShield = () => (
    <Icon>
        <path d='M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z' />
        <path d='m9 12 2 2 4-4' />
    </Icon>
);
const IcPlay = () => (
    <Icon size={19}>
        <polygon points='6 3 20 12 6 21 6 3' fill='currentColor' stroke='none' />
    </Icon>
);
const IcStop = () => (
    <Icon size={19}>
        <rect x='6' y='6' width='12' height='12' rx='2.5' fill='currentColor' stroke='none' />
    </Icon>
);
const IcArrowUp = () => (
    <Icon size={15}>
        <path d='m5 12 7-7 7 7' />
        <path d='M12 19V5' />
    </Icon>
);
const IcArrowDown = () => (
    <Icon size={15}>
        <path d='M12 5v14' />
        <path d='m19 12-7 7-7-7' />
    </Icon>
);
const IcCheck = () => (
    <Icon size={15}>
        <circle cx='12' cy='12' r='10' />
        <path d='m9 12 2 2 4-4' />
    </Icon>
);
const IcHouse = () => (
    <Icon size={17}>
        <path d='M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8' />
        <path d='M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' />
    </Icon>
);

const RECOVERY_WAIT = 6;

/** Waveform bar heights for the AI SCANNING panel (deterministic pulse). */
const WAVE_BARS = Array.from({ length: 54 }, (_, i) => {
    const v = Math.abs(Math.sin(i * 0.9) * 0.62 + Math.sin(i * 0.37 + 1.3) * 0.38);
    return Math.max(14, Math.round(v * 100));
});

/**
 * Reference entry rules: three consecutive digits at most 2 (or two at most 1)
 * opens Over 2; three at least 7 (or two at least 8) opens Under 7. After a
 * loss the recovery waits for six matching digits on the chosen recovery type.
 */
const voltEvaluate =
    (pairRef: { current: VoltPair }) =>
    (symbol: string, series: SymbolSeries, state: HubSessionSnapshot): HubTradeIntent | null => {
        const digits = series.digits;
        if (digits.length < 2) return null;
        const last = state.rows[0];
        const recovering = !!last && last.result === 'loss';
        if (recovering) {
            const tail = digits.slice(-RECOVERY_WAIT);
            if (tail.length < RECOVERY_WAIT) return null;
            if (pairRef.current === 'even-odd') {
                if (tail.every(d => d % 2 === 0)) return { symbol, contractType: 'DIGITODD' };
                if (tail.every(d => d % 2 === 1)) return { symbol, contractType: 'DIGITEVEN' };
                return null;
            }
            if (tail.every(d => d <= 4)) return { symbol, contractType: 'DIGITOVER', barrier: 4 };
            if (tail.every(d => d >= 5)) return { symbol, contractType: 'DIGITUNDER', barrier: 5 };
            return null;
        }
        const two = digits.slice(-2);
        const three = digits.slice(-3);
        if (three.length === 3 && three.every(d => d <= 2)) return { symbol, contractType: 'DIGITOVER', barrier: 2 };
        if (two.every(d => d <= 1)) return { symbol, contractType: 'DIGITOVER', barrier: 2 };
        if (three.length === 3 && three.every(d => d >= 7)) return { symbol, contractType: 'DIGITUNDER', barrier: 7 };
        if (two.every(d => d >= 8)) return { symbol, contractType: 'DIGITUNDER', barrier: 7 };
        return null;
    };

const numberUpdater =
    (apply: (n: number) => void) =>
    (e: ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        if (raw === '') return;
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) apply(n);
    };

const VoltAIPage = observer(() => {
    const { ui } = useStore() ?? {};
    const pairRef = useRef<VoltPair>('over-under');
    const [pair, setPair] = useState<VoltPair>('over-under');
    const [stake, setStake] = useState(1);
    const [takeProfit, setTakeProfit] = useState(10);
    const [stopLoss, setStopLoss] = useState(50);
    const [multiplier, setMultiplier] = useState(2);
    const [martingaleOn, setMartingaleOn] = useState(true);

    const { session, snap } = useHubSession(() => ({
        symbols: VOL_MARKETS.map(m => m.symbol),
        stake: 1,
        martingale: 2,
        takeProfit: 10,
        stopLoss: 50,
        durationTicks: 1,
        nameOf: s => VOL_MARKETS.find(m => m.symbol === s)?.name || s,
        evaluate: voltEvaluate(pairRef),
    }));

    useEffect(() => {
        session.updateOptions({
            stake,
            takeProfit,
            stopLoss,
            martingale: martingaleOn ? multiplier : 1,
        });
    }, [session, stake, takeProfit, stopLoss, multiplier, martingaleOn]);

    // Reference rules: leaving this tab stops scanning.
    useEffect(() => {
        if (snap.running && ui && ui.active_view !== 'volt-ai') session.stop();
    }, [snap.running, ui, ui?.active_view, session]);

    const selectPair = (p: VoltPair) => {
        pairRef.current = p;
        setPair(p);
    };

    const running = snap.running;
    const winRate = snap.trades ? Math.round((snap.wins * 100) / snap.trades) : 0;

    return (
        <section className='volt-ai'>
            <dialog
                className='volt-ai__limit-modal is-loss'
                aria-labelledby='volt-limit-title'
                aria-describedby='volt-limit-description'
            />
            <div className='volt-ai__content'>
                <header className='volt-ai__hero'>
                    <div className='volt-ai__brand'>
                        <h1>
                            Volt <span>AI</span>
                        </h1>
                        <p>TRADE SMARTER. LIVE FREER.</p>
                    </div>
                    <div className='volt-ai__hero-copy'>
                        <strong>
                            AI
                            <br />
                            TRADES
                            <br />
                            <em>
                                A BRIGHTER
                                <br />
                                TOMORROW
                            </em>
                        </strong>
                        <small>
                            STRATEGY
                            <br />
                            EXECUTION
                            <br />
                            RESULTS
                        </small>
                        <span />
                    </div>
                    <div className='volt-ai__hero-note'>
                        <span>
                            LESS EMOTION.
                            <br />
                            MORE OPPORTUNITY.
                        </span>
                        <i />
                        <IcTrending />
                        <small>
                            MARKETS
                            <br />
                            NEVER SLEEP.
                            <br />
                            NEITHER DO WE.
                        </small>
                    </div>
                </header>

                <div className='volt-ai__panel'>
                    <div className='volt-ai__status'>
                        <span className={running ? 'is-live' : ''} />
                        {running ? 'Scanning live' : 'Standby'}
                        <small>USD - 1 tick</small>
                    </div>

                    {running ? (
                        <>
                            <div className='volt-ai__chips'>
                                <div>
                                    <span>Stake</span>
                                    <strong>{stake.toFixed(2)}</strong>
                                </div>
                                <div>
                                    <span>Take Profit</span>
                                    <strong>{takeProfit.toFixed(2)}</strong>
                                </div>
                                <div>
                                    <span>Stop Loss</span>
                                    <strong>{stopLoss.toFixed(2)}</strong>
                                </div>
                                <div>
                                    <span>Martingale</span>
                                    <strong>{martingaleOn ? `${multiplier}x` : 'Off'}</strong>
                                </div>
                            </div>

                            <div className='volt-ai__scanner'>
                                <div className='volt-ai__scanner-head'>
                                    <div>
                                        <strong>AI SCANNING</strong>
                                        <small>MARKET INTELLIGENCE</small>
                                    </div>
                                    <span className='volt-ai__live'>
                                        <strong>LIVE</strong>
                                        <i />
                                    </span>
                                </div>
                                <div className='volt-ai__scanner-body'>
                                    <div className='volt-ai__radar'>
                                        <i className='blip-a' />
                                        <i className='blip-b' />
                                    </div>
                                    <div className='volt-ai__waveform'>
                                        {WAVE_BARS.map((h, i) => (
                                            <i
                                                key={`${i}-${h}`}
                                                style={{ height: `${h}%`, animationDelay: `${(i % 9) * 0.11}s` }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className='volt-ai__scanner-foot'>
                                    <span>{VOL_MARKETS.length} MARKETS</span>
                                    <span>{snap.tickCount} TICKS</span>
                                    <span>ANALYZE · DETECT · EXECUTE</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <fieldset>
                            <div className='volt-ai__grid'>
                                <label className='volt-ai__field'>
                                    <span className='volt-ai__field-heading'>
                                        <span className='volt-ai__field-icon'>
                                            <IcDatabase />
                                        </span>
                                        <span>
                                            Stake
                                            <small>Amount per trade</small>
                                        </span>
                                    </span>
                                    <span className='volt-ai__input-wrap'>
                                        <input
                                            type='number'
                                            min='0.01'
                                            step='0.01'
                                            value={stake}
                                            onChange={numberUpdater(setStake)}
                                        />
                                        <span>USD</span>
                                    </span>
                                </label>

                                <div className='volt-ai__field'>
                                    <span className='volt-ai__field-heading'>
                                        <span className='volt-ai__field-icon'>
                                            <IcFork />
                                        </span>
                                        <span>
                                            Martingale
                                            <small>Increase after loss</small>
                                        </span>
                                    </span>
                                    <button
                                        type='button'
                                        role='switch'
                                        aria-checked={martingaleOn}
                                        aria-label='Martingale'
                                        className={`volt-ai__toggle${martingaleOn ? ' selected' : ''}`}
                                        onClick={() => setMartingaleOn(v => !v)}
                                    >
                                        <span>{martingaleOn ? 'On' : 'Off'}</span>
                                        <i />
                                    </button>
                                </div>

                                <label className='volt-ai__field'>
                                    <span className='volt-ai__field-heading'>
                                        <span className='volt-ai__field-icon'>
                                            <IcTarget />
                                        </span>
                                        <span>
                                            Take Profit
                                            <small>Total profit target</small>
                                        </span>
                                    </span>
                                    <span className='volt-ai__input-wrap'>
                                        <input
                                            type='number'
                                            min='0.01'
                                            step='0.01'
                                            value={takeProfit}
                                            onChange={numberUpdater(setTakeProfit)}
                                        />
                                        <span>USD</span>
                                    </span>
                                </label>

                                <label className='volt-ai__field'>
                                    <span className='volt-ai__field-heading'>
                                        <span className='volt-ai__field-icon'>
                                            <IcShield />
                                        </span>
                                        <span>
                                            Stop Loss
                                            <small>Max allowed loss</small>
                                        </span>
                                    </span>
                                    <span className='volt-ai__input-wrap'>
                                        <input
                                            type='number'
                                            min='0.01'
                                            step='0.01'
                                            value={stopLoss}
                                            onChange={numberUpdater(setStopLoss)}
                                        />
                                        <span>USD</span>
                                    </span>
                                </label>
                            </div>

                            <div className='volt-ai__recovery'>
                                <label className='volt-ai__field'>
                                    <span className='volt-ai__field-heading'>
                                        <span className='volt-ai__field-icon'>
                                            <IcFork />
                                        </span>
                                        <span>
                                            Multiplier
                                            <small>Increase after loss</small>
                                        </span>
                                    </span>
                                    <span className='volt-ai__input-wrap'>
                                        <input
                                            type='number'
                                            min='1.01'
                                            step='0.01'
                                            value={multiplier}
                                            onChange={numberUpdater(setMultiplier)}
                                        />
                                        <span>x</span>
                                    </span>
                                </label>

                                <span className='volt-ai__recovery-label'>Recovery type</span>
                                <div className='volt-ai__choices'>
                                    <button
                                        type='button'
                                        aria-pressed={pair === 'over-under'}
                                        className={pair === 'over-under' ? 'selected' : ''}
                                        onClick={() => selectPair('over-under')}
                                    >
                                        Over 4 / Under 5
                                    </button>
                                    <button
                                        type='button'
                                        aria-pressed={pair === 'even-odd'}
                                        className={pair === 'even-odd' ? 'selected' : ''}
                                        onClick={() => selectPair('even-odd')}
                                    >
                                        Even / Odd
                                    </button>
                                </div>
                                <p className='volt-ai__recovery-note'>
                                    After a loss, multiply the stake and wait for six matching digits. A win resets
                                    the initial stake and entry rules.
                                </p>
                            </div>
                        </fieldset>
                    )}

                    <button
                        type='button'
                        className={`volt-ai__start${running ? ' volt-ai__start--stop' : ''}`}
                        onClick={() => (running ? session.stop() : session.start())}
                    >
                        {running ? <IcStop /> : <IcPlay />}
                        {running ? 'Stop AI' : 'Start AI'}
                    </button>

                    <p className='volt-ai__message' role='status'>
                        <i />
                        {running ? 'Scanning for an entry pattern...' : 'Ready to scan volatility markets'}
                    </p>

                    <div
                        className='volt-ai__scoreboard'
                        aria-label='Statistics for the latest 50 trades'
                        title='Statistics for the latest 50 trades'
                    >
                        <div>
                            <span>
                                <IcArrowUp />
                                Trades
                            </span>
                            <strong>{snap.trades}</strong>
                        </div>
                        <div>
                            <span>
                                <IcCheck />
                                Wins
                            </span>
                            <strong>{snap.wins}</strong>
                        </div>
                        <div>
                            <span>
                                <IcArrowDown />
                                Losses
                            </span>
                            <strong>{snap.losses}</strong>
                        </div>
                        <div>
                            <span>
                                <IcTarget />
                                Win Rate
                            </span>
                            <strong>{winRate}%</strong>
                        </div>
                    </div>

                    <div className='volt-ai__stats'>
                        <div>
                            <span>Session P/L</span>
                            <strong>
                                {snap.profit.toFixed(2)} <small>USD</small>
                            </strong>
                        </div>
                        <div>
                            <span>Next stake</span>
                            <strong>{snap.nextStake.toFixed(2)}</strong>
                        </div>
                        <div>
                            <span>Markets / ticks</span>
                            <strong>
                                {VOL_MARKETS.length} <small>/ {snap.tickCount}</small>
                            </strong>
                        </div>
                    </div>
                </div>

                <div className='volt-ai__footer'>
                    <IcHouse />
                    <span>VOLT AI</span>
                    <small>VOLATILITY MARKET SCANNER</small>
                </div>

                <details className='volt-ai__rules'>
                    <summary>Trading rules</summary>
                    <p>
                        Initial entries: three consecutive digits at most 2 or two at most 1: Over 2. Three
                        consecutive digits at least 7 or two at least 8: Under 7.
                    </p>
                    <p>
                        Recovery: six digits at most 4: Over 4; six at least 5: Under 5. Even / Odd: six even: Odd;
                        six odd: Even.
                    </p>
                    <p>
                        One open trade at a time. Stop prevents new purchases; an existing trade settles normally.
                        Leaving this tab stops scanning. Trades stop at the profit target or before the next stake
                        could exceed the remaining loss limit.
                    </p>
                </details>
            </div>
        </section>
    );
});

export default VoltAIPage;
export { VoltAIPage };
