import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    error: Error | null;
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
    state: State = { error: null };
    /** Guards the one-shot retry for extension noise, so it cannot loop. */
    private ignored_extension_error = false;

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info.componentStack);
    }

    render() {
        if (this.state.error) {
            // A wallet / extension failure is not an app failure. Report it as a
            // non-blocking notice and re-render the children instead of
            // replacing the whole page with an error screen.
            if (isExtensionError(this.state.error) && !this.ignored_extension_error) {
                this.ignored_extension_error = true;
                console.warn('[ignored extension error]', this.state.error);
                if (typeof window.__showNonFatalNotice === 'function') {
                    window.__showNonFatalNotice(this.state.error.message);
                }
                // Clearing state re-renders the subtree on the next pass.
                Promise.resolve().then(() => this.setState({ error: null }));
                return this.props.children;
            }
            return (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '100vh',
                        background: '#050a14',
                        color: '#fff',
                        fontFamily: 'IBM Plex Sans, sans-serif',
                        flexDirection: 'column',
                        gap: '16px',
                        padding: '24px',
                        textAlign: 'center',
                    }}
                >
                    <p style={{ fontSize: '18px', fontWeight: 600 }}>Something went wrong</p>
                    <p style={{ fontSize: '14px', color: '#aaa', maxWidth: '600px', wordBreak: 'break-word' }}>
                        {this.state.error.message}
                    </p>
                    <button
                        type='button'
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '8px 24px',
                            borderRadius: '4px',
                            border: 'none',
                            background: '#ff444f',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '14px',
                        }}
                    >
                        Refresh
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
