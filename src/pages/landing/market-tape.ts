/**
 * Market tape for the front page.
 *
 * One shared Deriv public WebSocket streams live ticks for the synthetic
 * indices shown on the landing page. Public market data needs no login, so the
 * tape breathes before anyone signs in — which is the whole point of the page.
 *
 * The endpoint (`/trading/v1/options/ws/public`) is the same one the vendored
 * deriv-core client resolves for public traffic; the legacy
 * `ws.derivws.com/websockets/v3` host is kept as a fallback because older
 * deployments still accept it.
 *
 * If neither socket can be reached the tape falls back to a local random walk so
 * the page still moves — and reports `status: 'demo'` so the UI never claims a
 * simulated number is live.
 */
import { useEffect, useRef, useState } from 'react';

export type TapeStatus = 'connecting' | 'live' | 'demo';

export interface TapeMarket {
    symbol: string;
    /** Alternate symbol used by deployments that name the boom/crash indices with an N suffix. */
    alt?: string;
    label: string;
    short: string;
    /** Seed price for the offline walk only — never shown as a live price. */
    base: number;
}

export const TAPE_MARKETS: TapeMarket[] = [
    { symbol: 'R_75', label: 'Volatility 75 Index', short: 'V75', base: 39300 },
    { symbol: 'R_100', label: 'Volatility 100 Index', short: 'V100', base: 618 },
    { symbol: 'R_25', label: 'Volatility 25 Index', short: 'V25', base: 2867 },
    { symbol: 'R_10', label: 'Volatility 10 Index', short: 'V10', base: 6420 },
    { symbol: 'R_50', label: 'Volatility 50 Index', short: 'V50', base: 246 },
    { symbol: 'BOOM1000', alt: 'BOOM1000N', label: 'Boom 1000 Index', short: 'Boom 1000', base: 15030 },
    { symbol: 'CRASH500', alt: 'CRASH500N', label: 'Crash 500 Index', short: 'Crash 500', base: 8100 },
    { symbol: 'stpRNG', label: 'Step Index', short: 'Step', base: 7294 },
    { symbol: 'JD100', label: 'Jump 100 Index', short: 'Jump 100', base: 45.33 },
    { symbol: 'RB100', label: 'Range Break 100', short: 'Range 100', base: 52613 },
];

export interface TapeQuote {
    symbol: string;
    label: string;
    short: string;
    price: number;
    pipSize: number;
    /** Rolling window of the last N prices, oldest first. */
    history: number[];
    /** Last digits of the rolling window, kept for the digit strip. */
    digits: number[];
    direction: 1 | -1 | 0;
    /** First price in the window — the change is measured against this. */
    open: number;
    epoch: number;
}

export type TapeQuotes = Record<string, TapeQuote>;

const HISTORY_SIZE = 48;
const DIGIT_SIZE = 10;
const PAINT_INTERVAL = 350;
const APP_IDS = ['1089', '68407', '31998'];

const ENDPOINTS = [
    (appId: string) => `wss://api.derivws.com/trading/v1/options/ws/public?app_id=${appId}`,
    (appId: string) => `wss://ws.derivws.com/websockets/v3?app_id=${appId}`,
];

/** Decimals implied by a tick's pip size (0.0001 → 4, 0.01 → 2). */
const decimalsFor = (pipSize: number): number => {
    if (!pipSize || pipSize <= 0) return 2;
    const text = pipSize.toFixed(8).replace(/0+$/, '');
    const decimals = text.split('.')[1]?.length ?? 0;
    return Math.min(Math.max(decimals, 0), 8);
};

const seedQuote = (market: TapeMarket, pipSize = 2): TapeQuote => {
    const history: number[] = [];
    let price = market.base;
    for (let i = 0; i < HISTORY_SIZE; i += 1) {
        price = Math.max(price * (1 + (Math.random() - 0.5) * 0.0012), market.base * 0.9);
        history.push(price);
    }
    return {
        symbol: market.symbol,
        label: market.label,
        short: market.short,
        price,
        pipSize,
        history,
        digits: history.slice(-DIGIT_SIZE).map(p => Number(p.toFixed(decimalsFor(pipSize)).slice(-1))),
        direction: 0,
        open: history[0],
        epoch: 0,
    };
};

const seedQuotes = (): TapeQuotes => {
    const seeded: TapeQuotes = {};
    for (const market of TAPE_MARKETS) seeded[market.symbol] = seedQuote(market);
    return seeded;
};

/** Push a price into a quote without mutating the caller's object. */
const withPrice = (quote: TapeQuote, price: number, epoch: number, pipSize?: number): TapeQuote => {
    const nextPip = pipSize && pipSize > 0 ? pipSize : quote.pipSize;
    const history = [...quote.history, price].slice(-HISTORY_SIZE);
    const decimals = decimalsFor(nextPip);
    return {
        ...quote,
        pipSize: nextPip,
        price,
        history,
        digits: history.slice(-DIGIT_SIZE).map(p => Number(p.toFixed(decimals).slice(-1))),
        direction: price > quote.price ? 1 : price < quote.price ? -1 : 0,
        open: quote.open || price,
        epoch: epoch || quote.epoch,
    };
};

/**
 * Subscribes to the public tick feed for {@link TAPE_MARKETS}.
 *
 * Returns the latest snapshot plus a status the UI can show honestly:
 * `live` once real ticks are arriving, `demo` while the offline walk is driving
 * the numbers, `connecting` before the first attempt settles.
 */
export const useMarketTape = (enabled = true) => {
    const [quotes, setQuotes] = useState<TapeQuotes>(seedQuotes);
    const [status, setStatus] = useState<TapeStatus>('connecting');

    const quotesRef = useRef<TapeQuotes>(quotes);
    // Canonical market symbol → the symbol actually subscribed (may be the alt).
    const wireSymbols = useRef<Record<string, string>>({});
    const socketRef = useRef<WebSocket | null>(null);
    const dirtyRef = useRef(false);
    const paintTimer = useRef<number | null>(null);
    const simTimer = useRef<number | null>(null);
    const reconnectTimer = useRef<number | null>(null);
    const attempts = useRef(0);
    const mounted = useRef(true);
    const live = useRef(false);

    useEffect(() => {
        if (!enabled || typeof window === 'undefined' || typeof WebSocket === 'undefined') {
            setStatus('demo');
            return;
        }
        mounted.current = true;

        const publish = () => {
            if (!mounted.current) return;
            dirtyRef.current = false;
            setQuotes({ ...quotesRef.current });
        };

        const markDirty = () => {
            dirtyRef.current = true;
        };

        const apply = (symbol: string, price: number, epoch: number, pipSize?: number) => {
            const canonical = wireSymbols.current[symbol] ?? symbol;
            const current = quotesRef.current[canonical];
            if (!current || !Number.isFinite(price)) return;
            quotesRef.current[canonical] = withPrice(current, price, epoch, pipSize);
            markDirty();
        };

        const request = (socket: WebSocket, market: TapeMarket, symbol: string) => {
            wireSymbols.current[symbol] = market.symbol;
            try {
                socket.send(
                    JSON.stringify({
                        ticks_history: symbol,
                        adjust_start_time: 1,
                        count: HISTORY_SIZE,
                        end: 'latest',
                        start: 1,
                        style: 'ticks',
                    })
                );
                socket.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
            } catch {
                /* the socket closed between checks */
            }
        };

        const sendHistory = (socket: WebSocket) => {
            for (const market of TAPE_MARKETS) request(socket, market, market.symbol);
        };

        const handleMessage = (event: MessageEvent) => {
            let message: any;
            try {
                message = JSON.parse(event.data as string);
            } catch {
                return;
            }

            if (message.error) {
                const requested = message.echo_req?.ticks_history ?? message.echo_req?.ticks;
                const market = TAPE_MARKETS.find(m => m.symbol === requested);
                // Boom/Crash are named with an N suffix on some deployments — retry once.
                if (market?.alt && socketRef.current?.readyState === WebSocket.OPEN) {
                    request(socketRef.current, market, market.alt);
                }
                return;
            }

            if (message.msg_type === 'history' && message.history?.prices) {
                const symbol = message.echo_req?.ticks_history as string;
                const canonical = wireSymbols.current[symbol] ?? symbol;
                const current = quotesRef.current[canonical];
                if (!current) return;
                const prices: number[] = message.history.prices.filter((p: number) => Number.isFinite(p));
                const times: number[] = message.history.times ?? [];
                const last = prices[prices.length - 1];
                const pipSize = Number(message.pip_size) || current.pipSize;
                const decimals = decimalsFor(pipSize);
                quotesRef.current[canonical] = {
                    ...current,
                    pipSize,
                    price: last,
                    history: prices.slice(-HISTORY_SIZE),
                    digits: prices.slice(-DIGIT_SIZE).map(p => Number(p.toFixed(decimals).slice(-1))),
                    open: prices[0],
                    epoch: times[times.length - 1] ?? 0,
                };
                markDirty();
                return;
            }

            if (message.msg_type === 'tick' && message.tick?.quote !== undefined) {
                live.current = true;
                setStatus('live');
                apply(
                    message.tick.symbol,
                    Number(message.tick.quote),
                    Number(message.tick.epoch),
                    Number(message.tick.pip_size)
                );
            }
        };

        const startSimulation = () => {
            if (simTimer.current != null) return;
            simTimer.current = window.setInterval(() => {
                const now = Math.floor(Date.now() / 1000);
                for (const market of TAPE_MARKETS) {
                    const quote = quotesRef.current[market.symbol];
                    if (!quote) continue;
                    // A driftless walk scaled to the instrument's own price level.
                    const drift = (Math.random() - 0.5) * quote.price * 0.0009;
                    const pip = Math.pow(10, -decimalsFor(quote.pipSize));
                    const next = Math.max(Math.round((quote.price + drift) / pip) * pip, pip);
                    quotesRef.current[market.symbol] = withPrice(quote, next, now);
                }
                markDirty();
            }, 1100);
        };

        const stopSimulation = () => {
            if (simTimer.current == null) return;
            window.clearInterval(simTimer.current);
            simTimer.current = null;
        };

        const scheduleReconnect = (endpointIndex: number, appIndex: number) => {
            if (reconnectTimer.current != null || !mounted.current) return;
            attempts.current += 1;
            if (attempts.current > 6) return; // leave the walk running rather than hammering
            const nextEndpoint = attempts.current % 2 === 0 ? (endpointIndex + 1) % ENDPOINTS.length : endpointIndex;
            reconnectTimer.current = window.setTimeout(() => {
                reconnectTimer.current = null;
                if (!mounted.current) return;
                stopSimulation();
                connect(nextEndpoint, appIndex + 1);
            }, Math.min(3000 * attempts.current, 12000));
        };

        const connect = (endpointIndex = 0, appIndex = 0) => {
            if (!mounted.current) return;
            const endpoint = ENDPOINTS[endpointIndex];
            const appId = APP_IDS[appIndex % APP_IDS.length] ?? '1089';
            let socket: WebSocket;
            try {
                socket = new WebSocket(endpoint(appId));
            } catch {
                setStatus('demo');
                startSimulation();
                return;
            }
            socketRef.current = socket;

            socket.onopen = () => {
                attempts.current = 0;
                wireSymbols.current = {};
                sendHistory(socket);
            };
            socket.onmessage = handleMessage;
            socket.onerror = () => {
                /* onclose owns the recovery path */
            };
            socket.onclose = () => {
                if (socketRef.current === socket) socketRef.current = null;
                wireSymbols.current = {};
                if (!mounted.current) return;
                if (!live.current) {
                    setStatus('demo');
                    startSimulation();
                }
                scheduleReconnect(endpointIndex, appIndex);
            };
        };

        paintTimer.current = window.setInterval(() => {
            if (dirtyRef.current) publish();
        }, PAINT_INTERVAL);

        connect();

        return () => {
            mounted.current = false;
            if (paintTimer.current != null) window.clearInterval(paintTimer.current);
            if (reconnectTimer.current != null) window.clearTimeout(reconnectTimer.current);
            stopSimulation();
            paintTimer.current = null;
            reconnectTimer.current = null;
            const socket = socketRef.current;
            socketRef.current = null;
            if (socket) {
                socket.onopen = null;
                socket.onmessage = null;
                socket.onerror = null;
                socket.onclose = null;
                try {
                    socket.close();
                } catch {
                    /* already closing */
                }
            }
        };
    }, [enabled]);

    return { quotes, status };
};

/** Percentage move across the window, rounded for display. */
export const quoteChange = (quote: TapeQuote): number => {
    if (!quote.open) return 0;
    return ((quote.price - quote.open) / quote.open) * 100;
};

/** Price rendered at the instrument's own precision, with thousands separators. */
export const formatPrice = (price: number, pipSize: number): string => {
    const decimals = decimalsFor(pipSize);
    return price.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
};
