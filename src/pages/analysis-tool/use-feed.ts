import { useEffect, useState } from 'react';
import { marketFeed, type FeedStatus, type MarketFeedState } from './feed';

/** Subscribe one symbol to the shared live feed. */
export const useMarketFeed = (symbol: string): MarketFeedState | undefined => {
    const [state, setState] = useState<MarketFeedState | undefined>(() => marketFeed.getMarketState(symbol));

    useEffect(() => marketFeed.subscribe(symbol, setState), [symbol]);

    return state;
};

/** Feed socket status for the connection pill. */
export const useFeedStatus = (): FeedStatus => {
    const [status, setStatus] = useState<FeedStatus>(() => marketFeed.status);
    useEffect(() => marketFeed.subscribeStatus(setStatus), []);
    return status;
};
