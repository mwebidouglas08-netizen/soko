import { rootStore } from '@/stores';
import { aiBot } from '@/bot/engine/ai-bot';
import { bulkTrader } from '@/bot/engine/bulk-trader';
import { ouBotEngine } from '@/bot/engine/engine';

type FallbackTone = 'success' | 'warning' | 'info';

const resolveFallbackTone = (message: string): FallbackTone => {
    const text = String(message || '').toLowerCase();
    if (/take\s*-?\s*profit|target\s*profit|profit\s*(reached|achieved|hit|target)|session\s*completed|congratulations|takeprofit\s*achieved|completed successfully|success|win\b/.test(text)) {
        return 'success';
    }
    if (/stop\s*-?\s*loss|loss\s*(hit|reached|limit)|max\s*(loss|drawdown|trades reached)|suspended|emergency|failed|error|invalid|cannot|rejected|session\s*(ended|stopped)/.test(text)) {
        return 'warning';
    }
    return 'info';
};

const isSessionResultText = (text: string) =>
    /take\s*-?\s*profit|target\s*profit|profit\s*(reached|achieved|hit|target)|takeprofit\s*achieved|stop\s*-?\s*loss|loss\s*(hit|reached|limit)|session\s*(completed|complete|ended|stopped|summary)|max\s*trades\s*reached|trades\s*reached|congratulations|sorry!!!/i.test(
        text
    );

const safeNum = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

const collectSnapshot = () => {
    try {
        const tx = (rootStore as any)?.transactions?.statistics;
        if (tx) {
            const trades = safeNum(tx.won_contracts) + safeNum(tx.lost_contracts);
            if (trades > 0 || safeNum(tx.total_profit) !== 0) {
                return { trades, wins: safeNum(tx.won_contracts), losses: safeNum(tx.lost_contracts), net: safeNum(tx.total_profit), wr: trades ? (safeNum(tx.won_contracts) / trades) * 100 : 0 };
            }
        }
    } catch {}
    try {
        const st = aiBot?.getState?.();
        if (st?.stats && (safeNum(st.stats.trades) > 0 || safeNum(st.stats.netPnl) !== 0)) {
            const trades = safeNum(st.stats.trades);
            return { trades, wins: safeNum(st.stats.wins), losses: safeNum(st.stats.losses), net: safeNum(st.stats.netPnl), wr: trades ? (safeNum(st.stats.wins) / trades) * 100 : 0 };
        }
    } catch {}
    try {
        const st = bulkTrader?.getState?.();
        const p = st?.progress;
        if (p && safeNum(p.settled) > 0) {
            const trades = safeNum(p.settled);
            const net = (st?.trades || []).reduce((a: number, t: any) => a + safeNum(t?.profit), 0);
            return { trades, wins: safeNum(p.won), losses: safeNum(p.lost), net, wr: trades ? (safeNum(p.won) / trades) * 100 : 0 };
        }
    } catch {}
    try {
        const st = ouBotEngine?.getState?.();
        const closed = (st?.trades || []).filter((t: any) => t?.result === 'win' || t?.result === 'loss');
        if (closed.length > 0) {
            const wins = closed.filter((t: any) => t.result === 'win').length;
            const losses = closed.filter((t: any) => t.result === 'loss').length;
            const net = closed.reduce((a: number, t: any) => a + safeNum(t?.profit), 0);
            return { trades: closed.length, wins, losses, net, wr: (wins / closed.length) * 100 };
        }
    } catch {}
    return null;
};

const fmtMoney = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}`;

const fallbackModal = (message: string, mode: 'alert' | 'confirm' | 'prompt', defaultValue = ''): Promise<string | boolean | void> => {
    return new Promise(resolve => {
        const tone = resolveFallbackTone(message);
        const session = isSessionResultText(message) && mode !== 'prompt';
        const snap = session ? collectSnapshot() : null;
        const title = mode === 'prompt' ? 'Input required' : session ? 'Session Summary' : tone === 'success' ? 'Success' : tone === 'warning' ? 'Attention' : mode === 'confirm' ? 'Please confirm' : 'Notice';
        const overlay = document.createElement('div');
        overlay.className = 'app-native-dialog-overlay';
        const statsHtml = snap
            ? `<div class="app-native-dialog__results">
                <div class="app-native-dialog__results-head"><span></span><em>Session results</em><span></span></div>
                <div class="app-native-dialog__stats">
                    <div class="app-native-dialog__stat"><span>Trades</span><strong>${snap.trades}</strong></div>
                    <div class="app-native-dialog__stat app-native-dialog__stat--pos"><span>Wins</span><strong>${snap.wins}</strong></div>
                    <div class="app-native-dialog__stat app-native-dialog__stat--neg"><span>Losses</span><strong>${snap.losses}</strong></div>
                    <div class="app-native-dialog__stat"><span>Win rate</span><strong>${snap.wr.toFixed(1)}%</strong></div>
                    <div class="app-native-dialog__stat app-native-dialog__stat--wide ${snap.net > 0 ? 'app-native-dialog__stat--pos' : snap.net < 0 ? 'app-native-dialog__stat--neg' : ''}"><span>Net P/L</span><strong>${fmtMoney(snap.net)}</strong></div>
                </div>
                <div class="app-native-dialog__winbar"><div class="app-native-dialog__winbar-fill" style="width:${Math.max(0, Math.min(100, snap.wr))}%"></div></div>
               </div>`
            : '';
        overlay.innerHTML = `
            <div class="app-native-dialog app-native-dialog--${tone}${session ? ' app-native-dialog--session' : ''}" role="dialog" aria-modal="true" aria-label="${title}">
                <div class="app-native-dialog__accent"></div>
                <button type="button" class="app-native-dialog__close" data-action="close" aria-label="Close">×</button>
                <div class="app-native-dialog__hero">
                    <div class="app-native-dialog__hero-glow"></div>
                    <div class="app-native-dialog__icon app-native-dialog__icon--${tone}" aria-hidden="true">
                        ${tone === 'success' ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.7" opacity="0.35"/><path d="M7.2 12.4l3.2 3.3 6.6-7.6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' : tone === 'warning' ? '<svg viewBox="0 0 24 24"><path d="M10.4 4.2L2.7 17.4A2 2 0 004.4 20.5h15.2a2 2 0 001.7-3.1L13.6 4.2a2 2 0 00-3.2 0z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 9v4.9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="12" cy="16.9" r="1.25" fill="currentColor"/></svg>' : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 10.4v5.8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="12" cy="7.4" r="1.25" fill="currentColor"/></svg>'}
                    </div>
                </div>
                <div class="app-native-dialog__body">
                    ${session ? '<div class="app-native-dialog__eyebrow">Live session update</div>' : ''}
                    <h3 class="app-native-dialog__title"></h3>
                    <p class="app-native-dialog__message"></p>
                    ${mode === 'prompt' ? '<input class="app-native-dialog__input" />' : ''}
                    ${statsHtml}
                </div>
                <div class="app-native-dialog__actions">
                    ${mode !== 'alert' ? '<button type="button" class="app-native-dialog__btn app-native-dialog__btn--ghost" data-action="cancel">Cancel</button>' : ''}
                    <button type="button" class="app-native-dialog__btn app-native-dialog__btn--primary" data-action="ok">${mode === 'alert' ? 'OK' : 'Continue'}</button>
                </div>
            </div>
        `;
        const titleEl = overlay.querySelector('.app-native-dialog__title') as HTMLElement;
        const msgEl = overlay.querySelector('.app-native-dialog__message') as HTMLElement;
        titleEl.textContent = title;
        msgEl.textContent = message || '';
        const input = overlay.querySelector('.app-native-dialog__input') as HTMLInputElement | null;
        if (input) {
            input.value = defaultValue;
            setTimeout(() => input.focus(), 0);
        }
        const cleanup = (result: string | boolean | void) => {
            overlay.classList.add('app-native-dialog-overlay--closing');
            setTimeout(() => {
                overlay.remove();
                resolve(result);
            }, 140);
        };
        overlay.addEventListener('click', e => {
            if (e.target === overlay) cleanup(mode === 'prompt' ? null : mode === 'confirm' ? false : undefined);
        });
        overlay.querySelector('[data-action="ok"]')?.addEventListener('click', () => {
            if (mode === 'prompt') cleanup(input?.value ?? '');
            else if (mode === 'confirm') cleanup(true);
            else cleanup(undefined);
        });
        overlay.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
            cleanup(mode === 'prompt' ? null : mode === 'confirm' ? false : undefined);
        });
        overlay.querySelector('[data-action="close"]')?.addEventListener('click', () => {
            cleanup(mode === 'prompt' ? null : mode === 'confirm' ? false : undefined);
        });
        overlay.addEventListener('keydown', e => {
            if (e.key === 'Escape') cleanup(mode === 'prompt' ? null : mode === 'confirm' ? false : undefined);
            if (e.key === 'Enter' && mode !== 'prompt') cleanup(mode === 'confirm' ? true : undefined);
            if (e.key === 'Enter' && mode === 'prompt') cleanup(input?.value ?? '');
        });
        document.body.appendChild(overlay);
        if (!input) (overlay.querySelector('[data-action="ok"]') as HTMLButtonElement | null)?.focus();
    });
};

export const installNativeDialogOverrides = () => {
    if (installed || typeof window === 'undefined') return;
    installed = true;
    nativeAlert = window.alert.bind(window);
    nativeConfirm = window.confirm.bind(window);
    nativePrompt = window.prompt.bind(window);

    // alert: keep sync signature for callers but render async UI and resolve immediately
    window.alert = (message?: any) => {
        const text = message == null ? '' : String(message);
        const app = getAppDialog();
        if (app) {
            void app.alert({ title: 'Notice', message: text, confirmText: 'OK' });
            return;
        }
        void fallbackModal(text, 'alert');
    };

    // confirm/prompt are sync in JS spec; we cannot truly block without native dialogs.
    // We fall back to native for sync correctness when called from non-async contexts
    // that require immediate boolean/string return in bot execution, but try to use
    // a synchronous in-page modal via a blocking technique is not possible.
    // Instead, we provide a custom sync-like modal using window.showModalDialog fallback
    // is unavailable; keep native behavior as last resort but with improved messaging
    // is not possible. So: for interactive UI-triggered confirms we already replaced
    // with async app dialogs. For Blockly bot runtime (generated code expects sync),
    // keep native calls but they will still show browser chrome — however in modern
    // browsers the title is "says" text from page; we minimize by overriding with
    // a custom synchronous modal using a busy-wait-free approach is impossible.
    // Pragmatic approach: use native for sync-required paths (blockly runtime) and
    // expose async alternatives globally.
    (window as any).__nativeAlert = nativeAlert;
    (window as any).__nativeConfirm = nativeConfirm;
    (window as any).__nativePrompt = nativePrompt;

    (window as any).__appAlert = (message?: any) => {
        const text = message == null ? '' : String(message);
        const app = getAppDialog();
        if (app) return app.alert({ message: text });
        return fallbackModal(text, 'alert');
    };
    (window as any).__appConfirm = (message?: any, opts: any = {}) => {
        const text = message == null ? '' : String(message);
        const app = getAppDialog();
        if (app) return app.confirm({ message: text, ...opts });
        return fallbackModal(text, 'confirm');
    };
    (window as any).__appPrompt = (message?: any, defaultValue = '', opts: any = {}) => {
        const text = message == null ? '' : String(message);
        const app = getAppDialog();
        if (app) return app.prompt({ message: text, defaultValue, ...opts });
        return fallbackModal(text, 'prompt', String(defaultValue ?? ''));
    };
};
