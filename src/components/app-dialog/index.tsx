import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Dialog from '@/components/shared_ui/dialog';
import { localize } from '@deriv-com/translations';
import { rootStore } from '@/stores';
import { aiBot } from '@/bot/engine/ai-bot';
import { bulkTrader } from '@/bot/engine/bulk-trader';
import { ouBotEngine } from '@/bot/engine/engine';
import './app-dialog.scss';

type DialogVariant = 'confirm' | 'alert' | 'prompt';
type DialogTone = 'success' | 'warning' | 'danger' | 'info';

type DialogOptions = {
    title?: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: DialogVariant;
    danger?: boolean;
    tone?: DialogTone;
    defaultValue?: string;
    placeholder?: string;
    inputType?: 'text' | 'number';
};

type SessionSnapshot = {
    trades: number;
    wins: number;
    losses: number;
    netProfit: number;
    winRate: number;
    totalStake?: number;
    totalPayout?: number;
    source: string;
};

type DialogState = DialogOptions & {
    isVisible: boolean;
    variant: DialogVariant;
    tone: DialogTone;
    isSessionResult: boolean;
    isCelebration: boolean;
    snapshot: SessionSnapshot | null;
};

type AppDialogContextValue = {
    confirm: (options: DialogOptions | string) => Promise<boolean>;
    alert: (options: DialogOptions | string) => Promise<void>;
    prompt: (options: DialogOptions | string) => Promise<string | null>;
};

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

const defaultState: DialogState = {
    isVisible: false,
    message: '',
    variant: 'confirm',
    tone: 'info',
    isSessionResult: false,
    isCelebration: false,
    snapshot: null,
    title: '',
    confirmText: '',
    cancelText: '',
};

const icons: Record<DialogTone, React.ReactNode> = {
    success: (
        <svg viewBox='0 0 24 24' aria-hidden='true' focusable='false'>
            <circle cx='12' cy='12' r='9.5' fill='none' stroke='currentColor' strokeWidth='1.6' opacity='0.35' />
            <path d='M7.2 12.4l3.2 3.3 6.6-7.6' fill='none' stroke='currentColor' strokeWidth='2.6' strokeLinecap='round' strokeLinejoin='round' />
        </svg>
    ),
    warning: (
        <svg viewBox='0 0 24 24' aria-hidden='true' focusable='false'>
            <path d='M10.4 4.2L2.7 17.4A2 2 0 004.4 20.5h15.2a2 2 0 001.7-3.1L13.6 4.2a2 2 0 00-3.2 0z' fill='none' stroke='currentColor' strokeWidth='1.7' strokeLinejoin='round' />
            <path d='M12 9v4.9' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' />
            <circle cx='12' cy='16.9' r='1.25' fill='currentColor' />
        </svg>
    ),
    danger: (
        <svg viewBox='0 0 24 24' aria-hidden='true' focusable='false'>
            <circle cx='12' cy='12' r='9.5' fill='none' stroke='currentColor' strokeWidth='1.7' />
            <path d='M12 7.6v5.3' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' />
            <circle cx='12' cy='16.6' r='1.25' fill='currentColor' />
        </svg>
    ),
    info: (
        <svg viewBox='0 0 24 24' aria-hidden='true' focusable='false'>
            <circle cx='12' cy='12' r='9.5' fill='none' stroke='currentColor' strokeWidth='1.7' />
            <path d='M12 10.4v5.8' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' />
            <circle cx='12' cy='7.4' r='1.25' fill='currentColor' />
        </svg>
    ),
};

const toSearchText = (opts: DialogOptions) =>
    `${opts.title ?? ''} ${typeof opts.message === 'string' ? opts.message : ''}`.toLowerCase();

const isSessionResultText = (text: string) =>
    /take\s*-?\s*profit|target\s*profit|profit\s*(reached|achieved|hit|target)|takeprofit\s*achieved|stop\s*-?\s*loss|loss\s*(hit|reached|limit)|session\s*(completed|complete|ended|stopped|summary)|max\s*trades\s*reached|trades\s*reached|trade\s*limit|daily\s*(loss|profit)|congratulations|sorry!!!/i.test(
        text
    );

const isNegativeSessionText = (text: string) =>
    /stop\s*-?\s*loss|loss\s*(hit|reached|limit)|max\s*(loss|drawdown)|daily\s*loss|suspended|emergency|failed|error|invalid|cannot|rejected|timed out|unauthori[sz]ed|sorry!!!|blew|bust|no\s+profit/i.test(
        text
    );

const isCompletionEventText = (text: string) =>
    /take\s*-?\s*profit|target\s*profit|profit\s*(reached|achieved|hit|target)|takeprofit\s*achieved|session\s*(completed|complete|ended)|max\s*trades\s*reached|trades\s*reached|trade\s*limit\s*reached|completed successfully|congratulations/i.test(
        text
    );

const resolveTone = (opts: DialogOptions, variant: DialogVariant): DialogTone => {
    if (opts.tone) return opts.tone;
    if (opts.danger) return 'danger';
    const text = toSearchText(opts);
    if (isNegativeSessionText(text)) return 'warning';
    if (
        /take\s*-?\s*profit|target\s*profit|profit\s*(reached|achieved|hit|target)|takeprofit\s*achieved|session\s*(completed|complete)|congratulations|completed successfully|success|you'?ve won|\bwin\b/i.test(
            text
        )
    ) {
        return 'success';
    }
    if (variant === 'prompt') return 'info';
    return 'info';
};

const resolveTitle = (opts: DialogOptions, variant: DialogVariant, tone: DialogTone, isCelebration = false) => {
    if (opts.title) return opts.title;
    if (variant === 'prompt') return localize('Input required');
    const text = toSearchText(opts);
    if (isCelebration) return localize('Congratulations!');
    if (isSessionResultText(text)) {
        if (tone === 'success') return localize('Session Summary');
        if (tone === 'warning') return localize('Session Update');
        return localize('Session Summary');
    }
    if (tone === 'success') return localize('Success');
    if (tone === 'warning') return localize('Attention');
    if (variant === 'confirm') return localize('Please confirm');
    return localize('Notice');
};

const safeNum = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

const collectSessionSnapshot = (): SessionSnapshot | null => {
    const candidates: SessionSnapshot[] = [];
    try {
        const tx = rootStore?.transactions?.statistics as any;
        if (tx) {
            const trades = safeNum(tx.won_contracts) + safeNum(tx.lost_contracts);
            const wins = safeNum(tx.won_contracts);
            const losses = safeNum(tx.lost_contracts);
            const netProfit = safeNum(tx.total_profit);
            if (trades > 0 || netProfit !== 0 || safeNum(tx.number_of_runs) > 0) {
                candidates.push({
                    trades,
                    wins,
                    losses,
                    netProfit,
                    winRate: trades > 0 ? (wins / trades) * 100 : 0,
                    totalStake: safeNum(tx.total_stake),
                    totalPayout: safeNum(tx.total_payout),
                    source: 'transactions',
                });
            }
        }
    } catch {
        /* ignore */
    }

    try {
        const st = aiBot?.getState?.();
        if (st?.stats && (safeNum(st.stats.trades) > 0 || safeNum(st.stats.netPnl) !== 0)) {
            const trades = safeNum(st.stats.trades);
            const wins = safeNum(st.stats.wins);
            const losses = safeNum(st.stats.losses);
            candidates.push({
                trades,
                wins,
                losses,
                netProfit: safeNum(st.stats.netPnl),
                winRate: trades > 0 ? (wins / trades) * 100 : 0,
                source: 'ai',
            });
        }
    } catch {
        /* ignore */
    }

    try {
        const st = bulkTrader?.getState?.();
        const p = st?.progress;
        if (p && (safeNum(p.settled) > 0 || safeNum(p.bought) > 0 || safeNum(p.requested) > 0)) {
            const settled = safeNum(p.settled);
            const wins = safeNum(p.won);
            const losses = safeNum(p.lost);
            const trades = settled || safeNum(p.bought);
            const netProfit = (st?.trades || []).reduce((acc: number, t: any) => acc + safeNum(t?.profit), 0);
            candidates.push({
                trades,
                wins,
                losses,
                netProfit,
                winRate: settled > 0 ? (wins / settled) * 100 : 0,
                source: 'bulk',
            });
        }
    } catch {
        /* ignore */
    }

    try {
        const st = ouBotEngine?.getState?.();
        const tradesArr = st?.trades || [];
        const closed = tradesArr.filter((t: any) => t && (t.result === 'win' || t.result === 'loss'));
        if (closed.length > 0 || safeNum(st?.risk?.tradesThisSession) > 0) {
            const wins = closed.filter((t: any) => t.result === 'win').length;
            const losses = closed.filter((t: any) => t.result === 'loss').length;
            const trades = closed.length || safeNum(st?.risk?.tradesThisSession);
            const netProfit = closed.reduce((acc: number, t: any) => acc + safeNum(t?.profit), 0);
            candidates.push({
                trades,
                wins,
                losses,
                netProfit,
                winRate: trades > 0 ? (wins / trades) * 100 : 0,
                source: 'ou',
            });
        }
    } catch {
        /* ignore */
    }

    if (!candidates.length) return null;
    candidates.sort((a, b) => {
        const sa = a.trades + (Math.abs(a.netProfit) > 0 ? 0.5 : 0);
        const sb = b.trades + (Math.abs(b.netProfit) > 0 ? 0.5 : 0);
        return sb - sa;
    });
    return candidates[0];
};

const formatMoney = (v: number) => {
    const sign = v > 0 ? '+' : v < 0 ? '\u2212' : '';
    return `${sign}${Math.abs(v).toFixed(2)}`;
};

const formatPct = (v: number) => `${(Number.isFinite(v) ? v : 0).toFixed(1)}%`;

const getSessionPayoutDisplay = (snapshot: SessionSnapshot | null): number | null => {
    if (!snapshot) return null;
    if (typeof snapshot.totalPayout === 'number' && snapshot.totalPayout > 0) return snapshot.totalPayout;
    if (snapshot.netProfit > 0) {
        if (typeof snapshot.totalStake === 'number' && snapshot.totalStake > 0) {
            return snapshot.totalStake + snapshot.netProfit;
        }
        return snapshot.netProfit;
    }
    return null;
};

const AnimatedAmount: React.FC<{ value: number; prefix?: string; className?: string }> = ({ value, prefix = '', className }) => {
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        let raf = 0;
        const start = performance.now();
        const duration = 900;
        const from = 0;
        const to = value;
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplay(from + (to - from) * eased);
            if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [value]);

    const shown = Math.abs(display).toFixed(2);
    return <span className={className}>{`${prefix}${shown}`}</span>;
};

export const AppDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<DialogState>(defaultState);
    const [inputValue, setInputValue] = useState('');
    const resolverRef = useRef<((value: boolean | string | null | void) => void) | null>(null);

    const close = useCallback((result: boolean | string | null | void) => {
        setState(prev => ({ ...prev, isVisible: false }));
        const resolve = resolverRef.current;
        resolverRef.current = null;
        if (resolve) resolve(result);
    }, []);

    const open = useCallback((options: DialogOptions | string, variant: DialogVariant) => {
        const opts: DialogOptions = typeof options === 'string' ? { message: options } : options;
        return new Promise<boolean | string | null | void>(resolve => {
            resolverRef.current = resolve as (value: boolean | string | null | void) => void;
            setInputValue(opts.defaultValue ?? '');
            let tone = resolveTone(opts, variant);
            const text = toSearchText(opts);
            const sessionResult = isSessionResultText(text) && variant !== 'prompt';
            const snapshot = sessionResult ? collectSessionSnapshot() : null;
            const completionEvent = isCompletionEventText(text);
            const profitable = (snapshot?.netProfit ?? 0) > 0 || (snapshot?.totalPayout ?? 0) > 0;
            const explicitSuccess = /take\s*-?\s*profit|target\s*profit|profit\s*(reached|achieved|hit|target)|takeprofit\s*achieved|congratulations|completed successfully/i.test(text);
            const isCelebration = sessionResult && completionEvent && !isNegativeSessionText(text) && (profitable || explicitSuccess);
            if (isCelebration) tone = 'success';

            const payoutDisplay = isCelebration ? getSessionPayoutDisplay(snapshot) : null;
            let message: React.ReactNode = opts.message;
            if (isCelebration) {
                const payoutLine = payoutDisplay != null ? ` ${localize('Session payout')}: ${formatMoney(payoutDisplay)}.` : '';
                message = `${localize('Outstanding work! Your session completed successfully.')}${payoutLine} ${localize('Stay focused and keep the momentum going!')}`;
            }

            setState({
                ...defaultState,
                ...opts,
                message,
                variant,
                tone,
                isSessionResult: sessionResult,
                isCelebration,
                snapshot,
                isVisible: true,
                title: resolveTitle(opts, variant, tone, isCelebration),
                confirmText:
                    opts.confirmText ??
                    (variant === 'alert' ? localize(isCelebration ? 'Keep winning' : 'OK') : localize('Continue')),
                cancelText: opts.cancelText ?? localize('Cancel'),
            });
        });
    }, []);

    const confirm = useCallback((options: DialogOptions | string) => open(options, 'confirm') as Promise<boolean>, [open]);
    const alertFn = useCallback((options: DialogOptions | string) => open(options, 'alert') as Promise<void>, [open]);
    const promptFn = useCallback((options: DialogOptions | string) => open(options, 'prompt') as Promise<string | null>, [open]);

    const handleConfirm = () => {
        if (state.variant === 'prompt') {
            close(inputValue);
            return;
        }
        if (state.variant === 'alert') {
            close(undefined);
            return;
        }
        close(true);
    };

    const handleCancel = () => {
        if (state.variant === 'prompt') {
            close(null);
            return;
        }
        if (state.variant === 'alert') {
            close(undefined);
            return;
        }
        close(false);
    };

    const isDangerAction = state.danger || state.tone === 'danger';
    const showResults = state.isSessionResult && !!state.snapshot && state.snapshot.trades >= 0;
    const celebrationPayout = state.isCelebration ? getSessionPayoutDisplay(state.snapshot) : null;

    const statsView = useMemo(() => {
        if (!showResults || !state.snapshot) return null;
        const s = state.snapshot;
        const pnlTone = s.netProfit > 0 ? 'pos' : s.netProfit < 0 ? 'neg' : 'neu';
        const items = [
            {
                label: localize('Session payout'),
                value: celebrationPayout != null ? formatMoney(celebrationPayout) : typeof s.totalPayout === 'number' && s.totalPayout > 0 ? s.totalPayout.toFixed(2) : formatMoney(Math.max(0, s.netProfit)),
                tone: celebrationPayout != null || (s.totalPayout ?? 0) > 0 || s.netProfit > 0 ? ('pos' as const) : ('neu' as const),
                wide: true,
                hero: state.isCelebration,
            },
            { label: localize('Net P/L'), value: formatMoney(s.netProfit), tone: pnlTone },
            { label: localize('Total trades'), value: String(s.trades), tone: 'neu' as const },
            { label: localize('Wins'), value: String(s.wins), tone: 'pos' as const },
            { label: localize('Losses'), value: String(s.losses), tone: 'neg' as const },
            { label: localize('Win rate'), value: formatPct(s.winRate), tone: s.winRate >= 50 ? ('pos' as const) : ('neu' as const) },
        ];
        if (typeof s.totalStake === 'number' && s.totalStake > 0) {
            items.push({ label: localize('Total stake'), value: s.totalStake.toFixed(2), tone: 'neu' as const });
        }
        const seen = new Set<string>();
        const deduped = items.filter(it => {
            if (seen.has(it.label)) return false;
            seen.add(it.label);
            return true;
        });

        return (
            <div className='app-dialog__results' aria-label={localize('Session results')}>
                <div className='app-dialog__results-head'>
                    <span className='app-dialog__results-line' />
                    <span>{state.isCelebration ? localize('Your winning session') : localize('Session results')}</span>
                    <span className='app-dialog__results-line' />
                </div>
                <div className='app-dialog__stats'>
                    {deduped.map(it => (
                        <div
                            key={it.label}
                            className={`app-dialog__stat ${it.wide ? 'app-dialog__stat--wide' : ''} app-dialog__stat--${it.tone}${(it as any).hero ? ' app-dialog__stat--hero' : ''}`}
                        >
                            <span className='app-dialog__stat-label'>{it.label}</span>
                            <span className='app-dialog__stat-value'>{it.value}</span>
                        </div>
                    ))}
                </div>
                <div className='app-dialog__winbar' aria-hidden='true'>
                    <div className='app-dialog__winbar-track'>
                        <div className='app-dialog__winbar-fill' style={{ width: `${Math.max(0, Math.min(100, s.winRate))}%` }} />
                    </div>
                </div>
            </div>
        );
    }, [showResults, state.snapshot, state.isCelebration, celebrationPayout]);

    const confettiPieces = useMemo(
        () =>
            Array.from({ length: 22 }, (_, i) => ({
                id: i,
                left: `${(i * 37 + 7) % 100}%`,
                delay: `${(i % 7) * 0.12}s`,
                dur: `${2.6 + (i % 5) * 0.4}s`,
                hue: [46, 158, 199, 338, 142, 24, 268][i % 7],
                size: 6 + (i % 4) * 2,
                drift: ((i % 3) - 1) * 18,
            })),
        []
    );

    return (
        <AppDialogContext.Provider value={{ confirm, alert: alertFn, prompt: promptFn }}>
            {children}
            {typeof document !== 'undefined'
                ? createPortal(
                      <Dialog
                          is_visible={state.isVisible}
                          title={state.title}
                          confirm_button_text={state.confirmText}
                          cancel_button_text={state.variant === 'alert' ? undefined : state.cancelText}
                          onConfirm={handleConfirm}
                          onCancel={handleCancel}
                          onClose={handleCancel}
                          has_close_icon
                          is_mobile_full_width={false}
                          className={`app-dialog app-dialog--tone-${state.tone}${isDangerAction ? ' app-dialog--danger' : ''}${state.isSessionResult ? ' app-dialog--session' : ''}${state.isCelebration ? ' app-dialog--celebration' : ''}`}
                          login={() => {}}
                      >
                          <div className='app-dialog__cinema'>
                              <div className='app-dialog__hero'>
                                  <div className='app-dialog__hero-glow' aria-hidden='true' />
                                  <div className={`app-dialog__icon-wrap app-dialog__icon-wrap--${state.tone}`} aria-hidden='true'>
                                      <span className='app-dialog__icon-ring' />
                                      <span className='app-dialog__icon-ring app-dialog__icon-ring--outer' />
                                      <span className='app-dialog__icon'>{icons[state.tone]}</span>
                                  </div>
                                  {(state.tone === 'success' || state.isCelebration) && <div className='app-dialog__sparkles' aria-hidden='true' />}
                                  {state.isCelebration && (
                                      <div className='app-dialog__confetti' aria-hidden='true'>
                                          {confettiPieces.map(p => (
                                              <span
                                                  key={p.id}
                                                  className='app-dialog__confetti-piece'
                                                  style={{
                                                      left: p.left,
                                                      animationDelay: p.delay,
                                                      animationDuration: p.dur,
                                                      backgroundColor: `hsl(${p.hue} 92% 58%)`,
                                                      width: `${p.size}px`,
                                                      height: `${p.size * 1.6}px`,
                                                      ['--drift' as any]: `${p.drift}px`,
                                                  }}
                                              />
                                          ))}
                                      </div>
                                  )}
                              </div>
                              <div className='app-dialog__copy'>
                                  {state.isSessionResult && (
                                      <div className='app-dialog__eyebrow'>
                                          {state.isCelebration ? localize('Successful session complete') : localize('Live session update')}
                                      </div>
                                  )}
                                  <h3 className='app-dialog__title'>{state.isCelebration ? `${state.title} \u{1F389}` : state.title}</h3>
                                  {state.isCelebration && celebrationPayout != null && (
                                      <div className='app-dialog__payout-hero' aria-label={localize('Session payout')}>
                                          <span className='app-dialog__payout-label'>{localize('Session payout')}</span>
                                          <span className='app-dialog__payout-value'>
                                              <AnimatedAmount value={celebrationPayout} />
                                          </span>
                                      </div>
                                  )}
                                  {typeof state.message === 'string' ? (
                                      <p className='app-dialog__message'>{state.message}</p>
                                  ) : (
                                      <div className='app-dialog__message'>{state.message}</div>
                                  )}
                              </div>
                              {statsView}
                              {state.variant === 'prompt' && (
                                  <div className='app-dialog__prompt-wrap'>
                                      <input
                                          autoFocus
                                          className='app-dialog__input'
                                          type={state.inputType ?? 'text'}
                                          value={inputValue}
                                          placeholder={state.placeholder}
                                          onChange={e => setInputValue(e.target.value)}
                                          onKeyDown={e => {
                                              if (e.key === 'Enter') handleConfirm();
                                          }}
                                      />
                                  </div>
                              )}
                          </div>
                      </Dialog>,
                      document.body
                  )
                : null}
        </AppDialogContext.Provider>
    );
};

export const useAppDialog = (): AppDialogContextValue => {
    const ctx = useContext(AppDialogContext);
    if (!ctx) {
        throw new Error('useAppDialog must be used within AppDialogProvider');
    }
    return ctx;
};

export const getAppDialog = (): AppDialogContextValue | null => {
    return (window as any).__appDialog ?? null;
};

export const AppDialogBridge: React.FC = () => {
    const ctx = useContext(AppDialogContext);
    React.useEffect(() => {
        (window as any).__appDialog = ctx;
        return () => {
            if ((window as any).__appDialog === ctx) delete (window as any).__appDialog;
        };
    }, [ctx]);
    return null;
};
