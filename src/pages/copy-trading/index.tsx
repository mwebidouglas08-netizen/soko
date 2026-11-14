import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { isDemoAccount } from '@/utils/account-helpers';
import { useCopyTrading } from '@/bot/use-engine';
import { copyTrading } from '@/bot/engine/copy-trading';
import { HubNote, HubPage, HubPageHeader } from '@/components/hub-page';
import './copy-trading.scss';

const timeAt = (ms: number) =>
    new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const EVENT_TONE: Record<string, string> = {
    info: 'info',
    success: 'success',
    warn: 'warn',
    error: 'error',
    quote: 'info',
    purchase: 'success',
    settlement: 'info',
    risk: 'warn',
};

const EVENT_LABEL: Record<string, string> = {
    info: 'Info',
    success: 'Done',
    warn: 'Warn',
    error: 'Error',
    quote: 'Quote',
    purchase: 'Bought',
    settlement: 'Settled',
    risk: 'Risk',
};

const STATUS_TONE: Record<string, string> = {
    idle: 'hub-badge--idle',
    connecting: 'hub-badge--running',
    running: 'hub-badge--running',
    stopping: 'hub-badge--idle',
    error: 'hub-badge--error',
};

const CopyTradingPage = observer(() => {
    const state = useCopyTrading();
    const { client, run_panel } = useStore() ?? {};

    const [masterToken, setMasterToken] = useState('');
    const [copierToken, setCopierToken] = useState('');
    const [copierLabel, setCopierLabel] = useState('');
    const [multiplierDraft, setMultiplierDraft] = useState(() => String(state.settings.stakeMultiplier));
    const [capDraft, setCapDraft] = useState(() =>
        state.settings.stakeCap === null ? '' : String(state.settings.stakeCap)
    );
    const feedRef = useRef<HTMLDivElement | null>(null);

    const isLoggedIn = Boolean(client?.is_logged_in);
    const activeLoginid = client?.loginid || '';
    const localIsDemo = isDemoAccount(activeLoginid);
    const isRunning = state.status === 'connecting' || state.status === 'running' || state.status === 'stopping';

    useEffect(() => {
        setMultiplierDraft(String(state.settings.stakeMultiplier));
    }, [state.settings.stakeMultiplier]);

    useEffect(() => {
        setCapDraft(state.settings.stakeCap === null ? '' : String(state.settings.stakeCap));
    }, [state.settings.stakeCap]);

    useEffect(() => {
        const el = feedRef.current;
        if (el) el.scrollTop = 0;
    }, [state.events[0]?.id]);

    const connect = () => {
        const token = masterToken.trim();
        if (!isLoggedIn) {
            run_panel?.showLoginDialog?.();
            return;
        }
        if (!token) return;
        copyTrading.start(token);
        setMasterToken('');
    };

    const stop = () => copyTrading.stop();

    const addCopier = () => {
        const token = copierToken.trim();
        if (!token) return;
        copyTrading.addCopier(token, copierLabel.trim() || `Copier ${state.copiers.length + 1}`);
        setCopierToken('');
        setCopierLabel('');
    };

    const removeCopier = (id: string, label: string) => {
        const ok = window.confirm(`Remove copier "${label}"? Its copied trades stop here immediately.`);
        if (!ok) return;
        copyTrading.removeCopier(id);
    };

    const commitMultiplier = () => {
        const value = Number(multiplierDraft);
        if (!Number.isFinite(value)) {
            setMultiplierDraft(String(state.settings.stakeMultiplier));
            return;
        }
        const clamped = Math.min(10, Math.max(0.1, value));
        setMultiplierDraft(String(clamped));
        if (clamped !== state.settings.stakeMultiplier) copyTrading.setSettings({ stakeMultiplier: clamped });
    };

    const commitCap = () => {
        const raw = capDraft.trim();
        if (raw === '') {
            if (state.settings.stakeCap !== null) copyTrading.setSettings({ stakeCap: null });
            return;
        }
        const value = Number(raw);
        if (!Number.isFinite(value) || value <= 0) {
            setCapDraft(state.settings.stakeCap === null ? '' : String(state.settings.stakeCap));
            return;
        }
        if (value !== state.settings.stakeCap) copyTrading.setSettings({ stakeCap: value });
    };

    const money = (n: number) => n.toFixed(2);

    return (
        <HubPage className='copy-page'>
            <HubPageHeader
                title='Copy Trader'
                subtitle='Mirror a master account’s trades to copier accounts with a multiplier and cap.'
                badge={
                    <>
                        <span className={`hub-badge ${STATUS_TONE[state.status] ?? 'hub-badge--idle'}`}>
                            {state.status}
                        </span>
                        <span
                            className={[
                                'hub-badge',
                                !isLoggedIn ? 'hub-badge--guest' : localIsDemo ? 'hub-badge--demo' : 'hub-badge--real',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                        >
                            {!isLoggedIn ? 'Guest · login required' : `${localIsDemo ? 'Demo' : 'Real'} · ${activeLoginid}`}
                        </span>
                    </>
                }
            />

            <HubNote tone='risk'>
                Demo copiers only by default. Enable <strong>Allow real copiers</strong> only if you accept real-money risk.
                The stake multiplier scales both wins and losses.
            </HubNote>

            {!isLoggedIn && (
                <HubNote tone='info'>
                    Connect your Deriv account to start copy trading.{' '}
                    <button type='button' className='hub-btn hub-btn--primary hub-btn--sm' onClick={() => run_panel?.showLoginDialog?.()}>
                        Log in to connect
                    </button>
                </HubNote>
            )}

            <section className='hub-section' aria-label='Master account'>
                <h3>Master account</h3>
                <div className='copy-master'>
                    <label className='hub-field'>
                        Master API token
                        <input
                            type='password'
                            autoComplete='off'
                            placeholder='Paste the master token'
                            value={masterToken}
                            onChange={e => setMasterToken(e.target.value)}
                        />
                    </label>
                    <button
                        type='button'
                        className='hub-btn hub-btn--primary'
                        disabled={state.status === 'connecting' || state.status === 'stopping' || (isLoggedIn && !masterToken.trim())}
                        onClick={connect}
                    >
                        {state.status === 'connecting' ? 'Connecting…' : state.master.connected ? 'Reconnect' : 'Connect & start'}
                    </button>
                    <button
                        type='button'
                        className='hub-btn hub-btn--danger'
                        disabled={!isRunning}
                        onClick={stop}
                    >
                        Stop
                    </button>
                </div>

                <div className='copy-master-state'>
                    <span className={`copy-dot ${state.master.connected ? 'copy-dot--on' : ''}`} aria-hidden />
                    {state.master.connected ? (
                        <>
                            <strong>{state.master.loginid || 'connected'}</strong>
                            <span className={`hub-badge hub-badge--sm ${state.master.isVirtual ? 'hub-badge--demo' : 'hub-badge--real'}`}>
                                {state.master.isVirtual ? 'Demo' : 'Real'}
                            </span>
                            <span className='copy-balance'>
                                {state.master.balance !== null ? `${money(state.master.balance)} balance` : 'balance —'}
                            </span>
                        </>
                    ) : (
                        <span className='copy-balance'>Not connected</span>
                    )}
                </div>
            </section>

            <section className='hub-section' aria-label='Copiers'>
                <h3>Copiers ({state.copiers.length})</h3>
                <div className='copy-add'>
                    <label className='hub-field'>
                        Copier token
                        <input
                            type='password'
                            autoComplete='off'
                            placeholder='Account API token (demo recommended)'
                            value={copierToken}
                            onChange={e => setCopierToken(e.target.value)}
                        />
                    </label>
                    <label className='hub-field'>
                        Label
                        <input
                            type='text'
                            placeholder='e.g. Demo A'
                            value={copierLabel}
                            onChange={e => setCopierLabel(e.target.value)}
                        />
                    </label>
                    <button
                        type='button'
                        className='hub-btn hub-btn--primary'
                        disabled={!copierToken.trim()}
                        onClick={addCopier}
                    >
                        Add copier
                    </button>
                </div>

                {state.copiers.length === 0 ? (
                    <p className='hub-empty'>No copiers yet — add a copier account token to start mirroring.</p>
                ) : (
                    <div className='copy-copiers'>
                        {state.copiers.map(copier => (
                            <article key={copier.id} className={`hub-panel hub-lift copy-card ${copier.enabled ? '' : 'copy-card--off'}`}>
                                <div className='copy-card__top'>
                                    <h3>{copier.label}</h3>
                                    <span
                                        className={`copy-dot ${copier.authorized ? 'copy-dot--on' : ''}`}
                                        title={copier.authorized ? 'Authorized' : 'Not authorized'}
                                        aria-hidden
                                    />
                                    <label className='copy-switch'>
                                        <input
                                            type='checkbox'
                                            checked={copier.enabled}
                                            onChange={e => copyTrading.toggleCopier(copier.id, e.target.checked)}
                                        />
                                        <span>{copier.enabled ? 'On' : 'Off'}</span>
                                    </label>
                                    <button
                                        type='button'
                                        className='hub-btn hub-btn--danger hub-btn--sm'
                                        onClick={() => removeCopier(copier.id, copier.label)}
                                    >
                                        Remove
                                    </button>
                                </div>
                                <div className='copy-card__stats'>
                                    <span><strong>{copier.copied}</strong> copied</span>
                                    <span><strong>{copier.failed}</strong> failed</span>
                                    <span><strong>{copier.skipped}</strong> skipped</span>
                                </div>
                                {copier.lastError && <p className='copy-card__error'>Last error: {copier.lastError}</p>}
                                <p className='copy-card__seen'>
                                    {copier.lastSeen ? `Last seen ${timeAt(copier.lastSeen)}` : 'No activity yet'}
                                </p>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section className='hub-section' aria-label='Replication settings'>
                <h3>Replication settings</h3>
                <div className='copy-settings'>
                    <label className='copy-toggle'>
                        <input
                            type='checkbox'
                            checked={state.settings.replicationEnabled}
                            onChange={e => copyTrading.setSettings({ replicationEnabled: e.target.checked })}
                        />
                        <span>Replication enabled</span>
                    </label>
                    <label className='copy-toggle'>
                        <input
                            type='checkbox'
                            checked={state.settings.allowRealCopiers}
                            onChange={e => {
                                if (e.target.checked) {
                                    const ok = window.confirm(
                                        'Allow REAL-money copier accounts? Replicated orders will spend real funds. Continue?'
                                    );
                                    if (!ok) return;
                                }
                                copyTrading.setSettings({ allowRealCopiers: e.target.checked });
                            }}
                        />
                        <span>Allow real copiers (real funds)</span>
                    </label>
                    <label className='hub-field'>
                        Stake multiplier (0.1 – 10)
                        <input
                            type='number'
                            step={0.1}
                            min={0.1}
                            max={10}
                            value={multiplierDraft}
                            onChange={e => setMultiplierDraft(e.target.value)}
                            onBlur={commitMultiplier}
                        />
                    </label>
                    <label className='hub-field'>
                        Stake cap (empty = no cap)
                        <input
                            type='number'
                            step={0.1}
                            min={0}
                            placeholder='No cap'
                            value={capDraft}
                            onChange={e => setCapDraft(e.target.value)}
                            onBlur={commitCap}
                        />
                    </label>
                </div>
            </section>

            <p className='copy-msg' aria-live='polite'>
                {state.message}
            </p>

            <div className='hub-stats'>
                <div className='hub-stat'>
                    <span>Observed</span>
                    <strong>{state.stats.observed}</strong>
                </div>
                <div className='hub-stat'>
                    <span>Copied</span>
                    <strong>{state.stats.copied}</strong>
                </div>
                <div className='hub-stat'>
                    <span>Settled</span>
                    <strong>{state.stats.settled}</strong>
                </div>
                <div className='hub-stat'>
                    <span>Won / Lost</span>
                    <strong>{state.stats.won} / {state.stats.lost}</strong>
                </div>
                <div className='hub-stat'>
                    <span>Profit</span>
                    <strong className={state.stats.profit < 0 ? 'hub-neg' : ''}>{money(state.stats.profit)}</strong>
                </div>
                <div className='hub-stat'>
                    <span>Failed</span>
                    <strong className='hub-neg'>{state.stats.failed}</strong>
                </div>
                <div className='hub-stat'>
                    <span>Skipped</span>
                    <strong>{state.stats.skipped}</strong>
                </div>
            </div>

            <section className='hub-section' aria-live='polite' aria-label='Events'>
                <h3>Events ({state.events.length})</h3>
                {state.events.length === 0 ? (
                    <p className='hub-empty'>
                        No events yet — connect a master account to start observing trades.
                    </p>
                ) : (
                    <div className='hub-log' ref={feedRef}>
                        {state.events.map(event => (
                            <div
                                key={event.id}
                                className='hub-log__row'
                                data-tone={EVENT_TONE[event.type] ?? 'info'}
                            >
                                <span className='hub-log__time'>{timeAt(event.at)}</span>
                                <span className='hub-log__type'>{EVENT_LABEL[event.type] ?? event.type}</span>
                                <span className='hub-log__msg'>{event.message}</span>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <HubNote tone='risk'>
                Copy trading replicates the master’s decisions, not guaranteed results. Start with a multiplier
                of 1, a tight stake cap, and demo accounts.
            </HubNote>
        </HubPage>
    );
});

export default CopyTradingPage;
