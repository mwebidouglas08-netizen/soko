/**
 * Live tick feed for the Patel Digit Tool scanner — a single shared Deriv
 * WebSocket (public app id, no login needed) that streams 1s + standard
 * volatility ticks into per-symbol digit buffers, with a local random-walk
 * fallback so the UI keeps breathing if the socket drops.
 */
import {
    PDT_MARKETS,
    calculateAnalysis,
    type MarketAnalysis,
    type PdtMarket,
} from './engine';

export interface MarketFeedState {
    symbol: string;
    price: number;
    pipSize: number;
    digits: number[];
    lastDigit: number;
    lastUpdatedEpoch: number;
    analysis: MarketAnalysis;
    source: 'DERIV_REALTIME' | 'SIMULATED';
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
        this.initDefaultStates();
        this.connect();
        this.startSimulation();
    }

    stop() {
        this.started = false;
        this.subscribed.clear();
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

    private initDefaultStates() {
        for (const market of PDT_MARKETS) {
            if (this.states.has(market.symbol)) continue;
            const seed = seedDigits(market.symbol);
            const price = 1000 + market.volatilityRate * 15.5;
            this.states.set(market.symbol, {
                symbol: market.symbol,
                price,
                pipSize: 2,
                digits: seed,
                lastDigit: seed[seed.length - 1],
                lastUpdatedEpoch: Date.now(),
                analysis: calculateAnalysis(market.symbol, seed, price),
                source: 'SIMULATED',
            });
        }
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
        this.send({ forget: symbol });
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
            const quote = Number(msg.tick.quote);
            if (!Number.isFinite(quote)) return;
            const pipSize = inferPipSize(symbol, quote);
            this.pushTick(symbol, quote, pipSize);
            return;
        }
        if (msg.msg_type === 'history' && msg.history?.prices && msg.echo_req?.ticks_history) {
            const symbol = msg.echo_req.ticks_history as string;
            const prices: number[] = msg.history.prices || [];
            const pipSize = inferPipSize(symbol, prices[prices.length - 1] ?? 1000);
            const digits = prices.map(p => lastDigitOf(p, pipSize));
            const state = this.states.get(symbol);
            if (state && digits.length) {
                this.applyState({
                    ...state,
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
        if (!state) return;
        const digit = lastDigitOf(quote, pipSize);
        const digits = [...state.digits, digit].slice(-MAX_DIGITS);
        this.applyState({
            ...state,
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

    /** Random-walk fallback — mirrors the reference's simulated 1s heartbeat. */
    private startSimulation() {
        this.simTimer = window.setInterval(() => {
            const now = Date.now();
            for (const market of PDT_MARKETS) {
                const state = this.states.get(market.symbol);
                if (!state) continue;
                const staleness = market.category === '1s' ? 1600 : 2600;
                if (now - state.lastUpdatedEpoch < staleness) continue;
                const drift = (Math.random() - 0.495) * (market.volatilityRate * 0.12);
                const price = Math.max(10, state.price + drift);
                const digit = lastDigitOf(price, state.pipSize);
                const digits = [...state.digits, digit].slice(-MAX_DIGITS);
                this.applyState({
                    ...state,
                    price,
                    digits,
                    lastDigit: digit,
                    lastUpdatedEpoch: now,
                    source: 'SIMULATED',
                });
            }
        }, 1000);
    }
}

export type FeedStatus = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';

const lastDigitOf = (price: number, pipSize: number): number => {
    const s = price.toFixed(pipSize);
    return parseInt(s.slice(-1), 10) || 0;
};

const inferPipSize = (symbol: string, quote: number): number => {
    // Deriv quotes for these indexes carry 2 (standard) or 3 (some 1s) decimals;
    // infer from the decimal representation of the quote string.
    const market = PDT_MARKETS.find((m: PdtMarket) => m.symbol === symbol);
    if (!market) return 2;
    return market.category === '1s' && quote < 100 ? 3 : 2;
};

const SEED_DIGITS: Record<string, number[]> = {
    '1HZ10V': [9, 0, 8, 0, 6, 8, 4, 2, 1, 2, 0, 2, 9, 6, 0],
    '1HZ15V': [0, 5, 6, 1, 0, 3, 2, 7, 1, 7, 7, 8, 6, 4, 2],
    '1HZ25V': [5, 0, 7, 4, 2, 9, 5, 9, 5, 9, 8, 1, 1, 0, 7],
    '1HZ30V': [2, 4, 6, 8, 0, 1, 3, 5, 7, 9, 2, 4, 6, 8, 0],
    '1HZ50V': [6, 5, 1, 0, 4, 9, 0, 4, 4, 9, 5, 1, 7, 0, 8],
    '1HZ75V': [7, 9, 3, 8, 7, 2, 2, 8, 5, 8, 8, 7, 4, 1, 6],
    '1HZ90V': [8, 4, 2, 1, 6, 8, 3, 2, 0, 4, 9, 6, 2, 8, 4],
    '1HZ100V': [6, 1, 4, 5, 1, 7, 8, 5, 2, 1, 8, 3, 4, 8, 5],
    '1HZ150V': [3, 8, 1, 6, 2, 0, 7, 4, 9, 3, 5, 2, 6, 1, 8],
    '1HZ200V': [4, 2, 9, 5, 1, 7, 0, 8, 3, 6, 2, 9, 4, 1, 7],
    '1HZ250V': [7, 1, 3, 9, 0, 5, 8, 2, 6, 4, 1, 9, 3, 7, 0],
    '1HZ300V': [5, 9, 2, 6, 8, 3, 1, 7, 4, 0, 5, 2, 9, 6, 3],
    R_10: [4, 8, 2, 6, 0, 5, 3, 7, 9, 1, 2, 4, 8, 6, 0],
    R_25: [1, 3, 5, 7, 9, 0, 2, 4, 6, 8, 1, 3, 5, 7, 9],
    R_50: [6, 2, 8, 4, 0, 1, 9, 3, 7, 5, 2, 4, 6, 8, 0],
    R_75: [7, 3, 9, 1, 5, 0, 4, 8, 2, 6, 7, 3, 9, 1, 5],
    R_100: [0, 2, 4, 6, 8, 1, 3, 5, 7, 9, 0, 2, 4, 6, 8],
};

const seedDigits = (symbol: string): number[] =>
    SEED_DIGITS[symbol] ?? [0, 5, 6, 1, 0, 3, 2, 7, 1, 7, 7, 8, 6, 4, 2];

export const marketFeed = new MarketFeedService();
