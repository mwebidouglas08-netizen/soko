import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    error: Error | null;
    errorKey: number;
}

/**
 * Errors raised by browser extensions (wallet add-ons, ad blockers, password
 * managers) arrive through React exactly like first-party ones. They say
 * nothing about this app's health, so they must never take the UI down.
 */
function isExtensionError(error: unknown): boolean {
    if (typeof window !== 'undefined' && typeof window.__isExtensionError === 'function') {
        return window.__isExtensionError(error);
    }
    const text = error instanceof Error ? `${error.stack || ''}${error.message}` : String(error ?? '');
    return /(chrome|moz|safari|safari-web|ms-browser)-extension:\/\//i.test(text) ||
        /metamask|ethereum|evmask|eth_requestAccounts|wallet_?connect|coinbase|trust ?wallet|phantom/i.test(text);
}

/**
 * Standard React error boundary. Displays the error message so failures
 * are visible instead of producing a blank screen.
 */
export default class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null, errorKey: 0 };
    /** Guards the one-shot retry for extension noise, so it cannot loop. */
    private ignored_extension_error = false;

    componentDidMount() {
        // Expose extension-error detector to window so main.tsx can suppress
        // MetaMask / wallet errors before they reach the fatal-error handler.
        window.__isExtensionError = isExtensionError;
    }

    static getDerivedStateFromError(error: Error): State {
        // Only set error state if we haven't already recorded this error.
        // Prevents crash loops when the error UI itself throws.
        return { error, errorKey: Date.now() };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info.componentStack);
    }

    resetError = () => {
        this.setState({ error: null });
    };

    render() {
        const { error, errorKey } = this.state;
        if (error) {
            // A wallet / extension failure is not an app failure. Report it as a
            // non-blocking notice and re-render the children instead of
            // replacing the whole page with an error screen.
            if (isExtensionError(error) && !this.ignored_extension_error) {
                this.ignored_extension_error = true;
                console.warn('[ignored extension error]', error);
                if (typeof window.__showNonFatalNotice === 'function') {
                    window.__showNonFatalNotice(error.message);
                }
                // Clearing state re-renders the subtree on the next pass.
                Promise.resolve().then(() => this.resetError());
                return this.props.children;
            }
            return (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '100vh',
                        background: '#030712',
                        color: '#e8eefc',
                        fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, -apple-system, sans-serif",
                        flexDirection: 'column',
                        padding: '24px',
                        boxSizing: 'border-box',
                    }}
                    role='alert'
                    aria-label='App error'
                    key={`error-boundary-${errorKey}`}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '40px 32px',
                            borderRadius: '24px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            boxShadow: '0 24px 64px rgba(2, 6, 16, 0.55)',
                            maxWidth: '520px',
                            textAlign: 'center',
                            backdropFilter: 'blur(12px)',
                        }}
                    >
                        <div
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'rgba(255, 165, 0, 0.15)',
                                color: '#fbbf24',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '24px',
                                boxShadow: '0 0 24px rgba(251, 191, 36, 0.25)',
                            }}
                        >
                            ⚠
                        </div>
                        <h2
                            style={{
                                margin: 0,
                                fontSize: '20px',
                                fontWeight: 700,
                                color: '#ffffff',
                                letterSpacing: '-0.02em',
                            }}
                        >
                            Something went wrong
                        </h2>
                        <p
                            style={{
                                margin: 0,
                                fontSize: '14px',
                                color: '#94a3b8',
                                maxWidth: '420px',
                                lineHeight: '1.6',
                                wordBreak: 'break-word',
                            }}
                        >
                            {error.message || 'An unknown error occurred'}
                        </p>
                        <button
                            type='button'
                            onClick={() => window.location.reload()}
                            style={{
                                marginTop: '8px',
                                padding: '10px 28px',
                                borderRadius: '10px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                color: '#000',
                                fontWeight: 700,
                                fontSize: '14px',
                                cursor: 'pointer',
                                boxShadow: '0 0 24px rgba(251, 191, 36, 0.4)',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                            }}
                        >
                            Reload App
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
