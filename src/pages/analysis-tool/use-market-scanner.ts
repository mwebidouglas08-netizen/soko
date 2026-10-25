import { useEffect, useMemo, useRef, useState } from 'react';
import { TickFeed } from '@/bot/deriv/ticks';

/** Live per-market series the scanner renders. */
export interface MarketLive {
    symbol: string;
    digits: number[];
    quotes: number[];
    pipSize: number;
    lastTickAt: number;
    /** True when Deriv rejected this symbol (no history, no stream). */
    unsupported: boolean;
}

const KEEP = 240;
const FLUSH_MS = 350;

/**
 * One shared Deriv tick feed for every market the scanner watches.
 *
 * A single socket seeds history for all symbols and then streams; the feed
 * reconnects on its own, so the scanner keeps updating after a drop without a
 * page reload. Re-renders are throttled to ~3/s so a 17-market board stays
 * smooth.
 */
export const useMarketScanner = (symbols: string[], seedCount = 120) => {
    const key = symbols.join(',');
    const feedRef = useRef<TickFeed | null>(null);
    const pendingRef = useRef(false);
    const [version, setVersion] = useState(0);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const list = key ? key.split(',') : [];
        if (!list.length) return undefined;

        let cancelled = false;
        const schedule = () => {
            if (pendingRef.current || cancelled) return;
            pendingRef.current = true;
            setTimeout(() => {
                pendingRef.current = false;
                if (!cancelled) setVersion(v => v + 1);
            }, FLUSH_MS);
        };

        const feed = new TickFeed({
            onTick: () => schedule(),
            onStatus: ok => {
                if (!cancelled) setConnected(ok);
            },
            onUnavailable: () => schedule(),
        });
        feedRef.current = feed;
        feed.setSeedCount(seedCount);
        feed.setSymbols(list);
        feed.start();

        return () => {
            cancelled = true;
            feed.stop();
            feedRef.current = null;
        };
    }, [key, seedCount]);

    const markets = useMemo<Record<string, MarketLive>>(() => {
        const out: Record<string, MarketLive> = {};
        const feed = feedRef.current;
        const list = key ? key.split(',') : [];
        for (const s of list) {
            const series = feed?.getSeries(s);
            out[s] = series
                ? {
                      symbol: s,
                      digits: series.digits.slice(-KEEP),
                      quotes: series.quotes.slice(-KEEP),
                      pipSize: series.pipSize,
                      lastTickAt: series.lastTickAt,
                      unsupported: Boolean(series.unsupported),
                  }
                : { symbol: s, digits: [], quotes: [], pipSize: 2, lastTickAt: 0, unsupported: false };
        }
        return out;
        // `version` (bumped by the feed) is the invalidation signal for the
        // mutable series held inside the feed instance.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, connected, version]);

    return { markets, connected };
};
