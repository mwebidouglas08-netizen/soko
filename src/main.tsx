import { createRoot } from 'react-dom/client';
import App from './app/App';
import { getUrlBase } from './components/shared/utils/url';
import { isPreviewMode, PREVIEW_BASE_PATH } from './utils/is-preview-mode';
// Global stylesheet: defines the .theme--light / .theme--dark CSS variables
// (--general-main-1, --text-prominent, --border-normal, …) plus the body font
// and background. Dropped somewhere after 4037a32, which left every
// var(--theme-token) in the app silently unresolved — light mode rendered as
// white text on a transparent background.
import './styles/index.scss';

// Runtime public path used to build asset URLs (audio, Blockly media, favicon).
// Restored from src/public-path.ts (deleted in 956dcae) — without it every asset
// URL renders as "undefinedassets/..." and 404s.
window.__webpack_public_path__ = isPreviewMode() ? `${PREVIEW_BASE_PATH}/` : getUrlBase('/');


// DOM-level error policy. The inline boot script in index.html owns the same
// policy (so it also covers crashes before this module is evaluated); these
// delegates simply route through it, keeping one source of truth.
type FatalPolicy = {
    __showFatalError?: (message: string) => void;
    __reportError?: (err: unknown, label: string) => void;
    __appMounted?: boolean;
};
const bootPolicy = window as unknown as FatalPolicy;

// Last-resort fallback, used only when index.html's script is unavailable.
let fatalErrorShown = false;
function showFatalError(message: string) {
    if (bootPolicy.__showFatalError) {
        bootPolicy.__showFatalError(message);
        return;
    }
    if (fatalErrorShown) return;
    fatalErrorShown = true;
    console.error('[FATAL]', message);
    const root = document.getElementById('root');
    if (!root) return;
    root.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#050a14;color:#fff;font-family:sans-serif;flex-direction:column;gap:16px;padding:24px;text-align:center">' +
        '<p style="font-size:18px;font-weight:600">Something went wrong</p>' +
        '<p style="font-size:14px;color:#aaa;max-width:600px;word-break:break-word">' +
        message.replace(/</g, '&lt;') +
        '</p>' +
        '<button onclick="location.reload()" style="padding:8px 24px;border-radius:4px;border:none;background:#ff444f;color:#fff;cursor:pointer;font-size:14px">Refresh</button>' +
        '</div>';
}

/**
 * A runtime error is only fatal while nothing has rendered yet. Once the app is
 * on screen it stays on screen: a rejected promise (from a wallet extension, a
 * background poll, an optional integration) is reported as a dismissible notice
 * and never replaces the UI with a full-page error.
 */
function reportError(err: unknown, label: string) {
    if (bootPolicy.__reportError) {
        bootPolicy.__reportError(err, label);
        return;
    }
    const message = err instanceof Error ? err.message : String(err ?? label);
    if (bootPolicy.__appMounted) {
        console.warn('[non-fatal]', label, err);
        return;
    }
    showFatalError(message);
}

// `true` captures resource errors too, which the bubble phase misses.
window.addEventListener(
    'error',
    event => {
        const target = event.target as unknown as HTMLElement | null;
        // A failed <img>/<audio>/<link> is not an app crash - ignore it here.
        if (target && target !== (window as unknown as EventTarget) && target.tagName) return;
        reportError(event.error || event.message, 'error');
    },
    true
);

window.addEventListener('unhandledrejection', event => {
    reportError(event.reason, 'unhandledrejection');
});

try {
    // Unregister any stale service workers left over from prior deployments.
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => registration.unregister());
        });
    }

    const rootElement = document.getElementById('root');
    if (rootElement) {
        const root = createRoot(rootElement);
        root.render(<App />);
        // React 18/19 commits synchronously enough that by the next frame the
        // app has painted. From this point runtime errors are non-fatal.
        const markMounted = () => {
            bootPolicy.__appMounted = true;
        };
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => requestAnimationFrame(markMounted));
        } else {
            setTimeout(markMounted, 0);
        }
        // The boot splash must never outlive a successful mount.
        window.setTimeout(() => {
            if (typeof window.__hideBootSplash === 'function') window.__hideBootSplash();
        }, 2500);
    }
} catch (err) {
    showFatalError(err instanceof Error ? err.message : String(err));
}
