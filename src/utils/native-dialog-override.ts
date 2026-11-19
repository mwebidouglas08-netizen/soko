import { getAppDialog } from '@/components/app-dialog';

type NativeAlert = (message?: any) => void;
type NativeConfirm = (message?: string) => boolean;
type NativePrompt = (message?: string, _default?: string) => string | null;

let installed = false;
let nativeAlert: NativeAlert;
let nativeConfirm: NativeConfirm;
let nativePrompt: NativePrompt;

type FallbackTone = 'success' | 'warning' | 'info';

const resolveFallbackTone = (message: string): FallbackTone => {
    const text = String(message || '').toLowerCase();
    if (/take\s*-?\s*profit|target\s*profit|profit\s*(reached|achieved|hit|target)|session\s*completed|congratulations|takeprofit\s*achieved|completed successfully|success|win\b/.test(text)) {
        return 'success';
    }
    if (/stop\s*-?\s*loss|loss\s*(hit|reached|limit)|max\s*(loss|drawdown|trades reached)|suspended|emergency|failed|error|invalid|cannot|rejected/.test(text)) {
        return 'warning';
    }
    return 'info';
};

const fallbackModal = (message: string, mode: 'alert' | 'confirm' | 'prompt', defaultValue = ''): Promise<string | boolean | void> => {
    return new Promise(resolve => {
        const tone = resolveFallbackTone(message);
        const title = mode === 'prompt' ? 'Input required' : tone === 'success' ? 'Success' : tone === 'warning' ? 'Attention' : mode === 'confirm' ? 'Please confirm' : 'Notice';
        const overlay = document.createElement('div');
        overlay.className = 'app-native-dialog-overlay';
        overlay.innerHTML = `
            <div class="app-native-dialog app-native-dialog--${tone}" role="dialog" aria-modal="true" aria-label="${title}">
                <div class="app-native-dialog__accent"></div>
                <button type="button" class="app-native-dialog__close" data-action="close" aria-label="Close">×</button>
                <div class="app-native-dialog__icon app-native-dialog__icon--${tone}" aria-hidden="true">
                    ${tone === 'success' ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.35"/><path d="M7.5 12.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' : tone === 'warning' ? '<svg viewBox="0 0 24 24"><path d="M10.4 4.4L2.8 17.5A2 2 0 004.5 20.5h15a2 2 0 001.7-3L13.6 4.4a2 2 0 00-3.2 0z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 9v4.8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="16.8" r="1.2" fill="currentColor"/></svg>' : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 10.5v5.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="7.6" r="1.2" fill="currentColor"/></svg>'}
                </div>
                <div class="app-native-dialog__body">
                    <h3 class="app-native-dialog__title"></h3>
                    <p class="app-native-dialog__message"></p>
                    ${mode === 'prompt' ? '<input class="app-native-dialog__input" />' : ''}
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
