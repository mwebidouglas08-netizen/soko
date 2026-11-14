import { TickSpotData } from '@deriv/api-types';

export const getLast = (arr: any[]): any => (Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : undefined);

export const historyToTicks = (history: any): TickSpotData[] => {
    const times = Array.isArray(history?.times) ? history.times : [];
    const prices = Array.isArray(history?.prices) ? history.prices : [];
    const len = Math.min(times.length, prices.length);
    const ticks: TickSpotData[] = [];
    for (let i = 0; i < len; i++) {
        const epoch = Number(times[i]);
        const quote = Number(prices[i]);
        if (Number.isFinite(epoch) && Number.isFinite(quote)) {
            ticks.push({ epoch, quote } as TickSpotData);
        }
    }
    return ticks;
};
