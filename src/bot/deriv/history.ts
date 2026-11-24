import { WS_SERVERS, isProduction } from '@/components/shared/utils/config/config';

const historyURL = (): string => {
    const base = isProduction() ? WS_SERVERS.PRODUCTION : WS_SERVERS.STAGING;
    const appId = process.env.NEXT_PUBLIC_DERIV_APP_ID || '1089';
    return `${base.replace(/^http/, 'ws')}?app_id=${appId}&l=EN&brand=deriv`;
};

const lastDigitOf = (quote: number, pipSize: number): number => {
    const fixed = quote.toFixed(pipSize);
    return Number(fixed[fixed.length - 1]);
};

export interface HistoricalTicks {
    digits: number[];
    quotes: number[];
    pipSize: number;
}

/**
 * Fetch real historical ticks for a symbol from the public Deriv WS
 * (`ticks_history`). Resolves with the last-digit sequence so the backtester
 * replays genuine market data rather than synthetic series.
 */
export const fetchHistoricalTicks = (
    symbol: string,
    count: number,
    timeoutMs = 15000
): Promise<HistoricalTicks> =>
    new Promise((resolve, reject) => {
        let ws: WebSocket;
        try {
            ws = new WebSocket(historyURL());
        } catch (e) {
            reject(e);
            return;
        }
        const digits: number[] = [];
        const quotes: number[] = [];
        let pipSize: number | undefined;
        let finished = false;
        const timer = setTimeout(() => {
            try { ws.close(); } catch { /* already closed */ }
            reject(new Error(`Timed out fetching ${count} ticks for ${symbol}`));
        }, timeoutMs);

        const finish = (err?: string) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            try { ws.close(); } catch { /* already closed */ }
            if (err) reject(new Error(err));
            else if (digits.length === 0) reject(new Error(`No ticks returned for ${symbol}`));
            else resolve({ digits, quotes, pipSize: pipSize! });
        };

        ws.onopen = () => {
            ws.send(JSON.stringify({ active_symbols: 'brief' }));
        };
        ws.onmessage = event => {
            try {
                const msg = JSON.parse(event.data as string);
                if (msg.error) {
                    finish(msg.error.message || 'ticks_history error');
                    return;
                }
                if (Array.isArray(msg.active_symbols)) {
                    const meta = msg.active_symbols.find((item: any) => (item.symbol || item.underlying_symbol) === symbol);
                    const pip = Number(meta?.pip);
                    if (Number.isFinite(pip) && pip > 0) pipSize = Math.max(0, -Math.floor(Math.log10(pip)));
                    ws.send(JSON.stringify({ ticks_history: symbol, count, end: 'latest', style: 'ticks' }));
                    return;
                }
                if (msg.msg_type === 'history' && Array.isArray(msg.history?.prices)) {
                    if (typeof msg.history.pip_size === 'number') pipSize = msg.history.pip_size;
                    if (!Number.isInteger(pipSize) || pipSize! < 0 || pipSize! > 10) { finish(`Precision unavailable for ${symbol}`); return; }
                    for (const price of msg.history.prices) {
                        const q = Number(price);
                        if (!Number.isFinite(q)) continue;
                        quotes.push(q);
                        digits.push(lastDigitOf(q, pipSize));
                    }
                    finish();
                    return;
                }
                if (msg.msg_type === 'tick' && typeof msg.tick?.quote === 'number') {
                    const q = msg.tick.quote;
                    if (typeof msg.tick.pip_size === 'number') pipSize = msg.tick.pip_size;
                    quotes.push(q);
                    digits.push(lastDigitOf(q, pipSize));
                    if (digits.length >= count) finish();
                }
            } catch {
                // ignore malformed frames
            }
        };
        ws.onerror = () => finish('WebSocket error while fetching history');
        ws.onclose = () => {
            // If the socket closes after delivering data, resolve what we have.
            if (!finished) finish(digits.length ? undefined : 'WebSocket closed before history arrived');
        };
    });
