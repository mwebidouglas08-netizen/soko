/**
 * Live tick feed for the Patel Digit Tool scanner — a single shared Deriv
 * WebSocket (public app id, no login needed) that streams 1s + standard
 * volatility ticks into per-symbol digit buffers. No prices are invented when
 * the socket drops or quote precision is unavailable.
 */
import {
    PDT_MARKETS,
    calculateAnalysis,
    type MarketAnalysis,
} from './engine';

export interface MarketFeedState {
    symbol: string;
    price: number;
    pipSize: number;
    digits: number[];
    lastDigit: number;
    lastUpdatedEpoch: number;
    analysis: MarketAnalysis;
    source: 'DERIV_REALTIME';
}

type Listener = (state: MarketFeedState) => void;

const APP_IDS = ['1089', '68407', '31998'];
const MAX_DIGITS = 30;

/** Public Deriv tick feed shared by every scanner view. */
class MarketFeedService {
    private ws: WebSocket | null = null;
    private states = new Map<string, MarketFeedState>();
    private listeners = new Map<string, Set<Listener>>();
    private statusListeners = new Set<(status: FeedStatus) => void>();
    private appIndex = 0;
    private simTimer: number | null = null;
    private reconnectTimer: number | null = null;
    private forgetTimer: number | null = null;
    private subscribed = new Set<string>();
    private subscriptionIds = new Map<string, string>();
    private started = false;
    status: FeedStatus = 'IDLE';

    private setStatus(s: FeedStatus) {
        if (this.status === s) return;
        this.status = s;
        this.statusListeners.forEach(fn => fn(s));
    }

    subscribeStatus(listener: (status: FeedStatus) => void): () => void {
        this.statusListeners.add(listener);
        listener(this.status);
        return () => this.statusListeners.delete(listener);
    }

    getMarketState(symbol: string): MarketFeedState | undefined {
        return this.states.get(symbol);
    }

    getAllMarketStates(): MarketFeedState[] {
        return PDT_MARKETS.map(m => this.states.get(m.symbol)).filter((s): s is MarketFeedState => Boolean(s));
    }

    subscribe(symbol: string, listener: Listener): () => void {
        if (!this.listeners.has(symbol)) this.listeners.set(symbol, new Set());
        this.listeners.get(symbol)!.add(listener);
        const existing = this.states.get(symbol);
        if (existing) listener(existing);
        this.start();
        if (this.ws && this.ws.readyState === WebSocket.OPEN) this.requestSubscription(symbol);
        return () => {
            const set = this.listeners.get(symbol);
            if (set) {
                set.delete(listener);
                if (set.size === 0) {
                    this.listeners.delete(symbol);
                    this.forget(symbol);
                }
            }
        };
    }

    start() {
        if (this.started) return;
        this.started = true;
        this.connect();
    }

    stop() {
        this.started = false;
        this.subscribed.clear();
        this.subscriptionIds.clear();
        if (this.simTimer != null) {
            window.clearInterval(this.simTimer);
            this.simTimer = null;
        }
        if (this.reconnectTimer != null) {
            window.clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.forgetTimer != null) {
            window.clearInterval(this.forgetTimer);
            this.forgetTimer = null;
        }
        if (this.ws) {
            try {
                this.ws.close();
            } catch {
                /* noop */
            }
            this.ws = null;
        }
        this.setStatus('IDLE');
    }

    private connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
        if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
            this.setStatus('DISCONNECTED');
            return;
        }
        this.setStatus('CONNECTING');
        const appId = APP_IDS[this.appIndex % APP_IDS.length];
        let ws: WebSocket;
        try {
            ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}`);
        } catch {
            this.setStatus('DISCONNECTED');
            this.scheduleReconnect();
            return;
        }
        this.ws = ws;

        ws.onopen = () => {
            this.setStatus('CONNECTED');
            // Re-arm every visible symbol after (re)connect.
            this.subscribed.clear();
            this.subscriptionIds.clear();
            for (const symbol of this.listeners.keys()) this.requestSubscription(symbol);
        };
        ws.onmessage = ev => this.handleMessage(ev);
        ws.onerror = () => {
            /* handled by onclose */
        };
        ws.onclose = () => {
            if (this.ws === ws) this.ws = null;
            this.subscribed.clear();
            if (this.started) {
                this.setStatus('DISCONNECTED');
                this.scheduleReconnect();
            }
        };
    }

    private scheduleReconnect() {
        if (this.reconnectTimer != null) return;
        this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null;
            this.appIndex += 1;
            this.connect();
        }, 4000);
    }

    private requestSubscription(symbol: string) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.subscribed.has(symbol)) return;
        this.subscribed.add(symbol);
        this.send({
            ticks_history: symbol,
            adjust_start_time: 1,
            count: MAX_DIGITS,
            end: 'latest',
            start: 1,
            style: 'ticks',
        });
        this.send({ ticks: symbol, subscribe: 1 });
    }

    private forget(symbol: string) {
        if (!this.subscribed.has(symbol)) return;
        this.subscribed.delete(symbol);
        const id = this.subscriptionIds.get(symbol);
        if (id) this.send({ forget: id });
        this.subscriptionIds.delete(symbol);
    }

    private send(payload: Record<string, unknown>) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        try {
            this.ws.send(JSON.stringify(payload));
        } catch {
            /* noop */
        }
    }

    private handleMessage(ev: MessageEvent) {
        let msg: any;
        try {
            msg = JSON.parse(ev.data as string);
        } catch {
            return;
        }
        if (msg.msg_type === 'tick' && msg.tick?.symbol) {
            const symbol = msg.tick.symbol as string;
            if (msg.subscription?.id) {
                if (!this.listeners.has(symbol)) { this.send({ forget: msg.subscription.id }); return; }
                this.subscriptionIds.set(symbol, msg.subscription.id);
            }
            const quote = Number(msg.tick.quote);
            if (!Number.isFinite(quote)) return;
            const pipSize = msg.tick.pip_size;
            if (!Number.isInteger(pipSize) || pipSize < 0 || pipSize > 10) return;
            this.pushTick(symbol, quote, pipSize);
            return;
        }
        if (msg.msg_type === 'history' && msg.history?.prices && msg.echo_req?.ticks_history) {
            const symbol = msg.echo_req.ticks_history as string;
            const prices: number[] = msg.history.prices || [];
            const pipSize = msg.history.pip_size;
            if (!Number.isInteger(pipSize) || pipSize < 0 || pipSize > 10) return;
            const digits = prices.map(p => lastDigitOf(p, pipSize));
            const state = this.states.get(symbol);
            if (digits.length) {
                this.applyState({
                    ...(state || { symbol, analysis: calculateAnalysis(symbol, [], 0) }),
                    price: prices[prices.length - 1],
                    pipSize,
                    digits: digits.slice(-MAX_DIGITS),
                    lastDigit: digits[digits.length - 1],
                    lastUpdatedEpoch: Date.now(),
                    source: 'DERIV_REALTIME',
                });
            }
        }
    }

    private pushTick(symbol: string, quote: number, pipSize: number) {
        const state = this.states.get(symbol);
        const digit = lastDigitOf(quote, pipSize);
        const digits = [...(state?.digits || []), digit].slice(-MAX_DIGITS);
        this.applyState({
            ...(state || { symbol, analysis: calculateAnalysis(symbol, [], 0) }),
            price: quote,
            pipSize,
            digits,
            lastDigit: digit,
            lastUpdatedEpoch: Date.now(),
            source: 'DERIV_REALTIME',
        });
    }

    private applyState(state: MarketFeedState) {
        state.analysis = calculateAnalysis(state.symbol, state.digits, state.price);
        this.states.set(state.symbol, state);
        const set = this.listeners.get(state.symbol);
        if (set) set.forEach(fn => fn(state));
    }


}

export type FeedStatus = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';

const lastDigitOf = (price: number, pipSize: number): number => {
    const s = price.toFixed(pipSize);
    return parseInt(s.slice(-1), 10) || 0;
};

export const marketFeed = new MarketFeedService();
