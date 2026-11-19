import { getAppDialog } from '@/components/app-dialog';

type NativeAlert = (message?: any) => void;
type NativeConfirm = (message?: string) => boolean;
type NativePrompt = (message?: string, _default?: string) => string | null;

let installed = false;
let nativeAlert: NativeAlert;
let nativeConfirm: NativeConfirm;
let nativePrompt: NativePrompt;

const fallbackModal = (message: string, mode: 'alert' | 'confirm' | 'prompt', defaultValue = ''): Promise<string | boolean | void> => {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'app-native-dialog-overlay';
        overlay.innerHTML = `
            <div class="app-native-dialog" role="dialog" aria-modal="true">
                <div class="app-native-dialog__body">
                    <p class="app-native-dialog__message"></p>
                    ${mode === 'prompt' ? '<input class="app-native-dialog__input" />' : ''}
                </div>
                <div class="app-native-dialog__actions">
                    ${mode !== 'alert' ? '<button type="button" class="app-native-dialog__btn app-native-dialog__btn--ghost" data-action="cancel">Cancel</button>' : ''}
                    <button type="button" class="app-native-dialog__btn app-native-dialog__btn--primary" data-action="ok">${mode === 'alert' ? 'OK' : 'Continue'}</button>
                </div>
            </div>
        `;
        const msgEl = overlay.querySelector('.app-native-dialog__message') as HTMLElement;
        msgEl.textContent = message || '';
        const input = overlay.querySelector('.app-native-dialog__input') as HTMLInputElement | null;
        if (input) {
            input.value = defaultValue;
            setTimeout(() => input.focus(), 0);
        }
        const cleanup = (result: string | boolean | void) => {
            overlay.remove();
            resolve(result);
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
