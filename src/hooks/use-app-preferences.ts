import { useCallback, useEffect, useState } from 'react';
import {
    DisplayCurrency,
    convertAmount,
    getConvertedBalance,
    getDisplayCurrency,
    getUsdToKesRate,
    setDisplayCurrency,
    setUsdToKesRate,
    subscribeCurrencyPreferences,
    toggleDisplayCurrency,
} from '@/utils/currency-conversion';

/**
 * Subscribes to the KSH/USD display-currency preference and returns a stable
 * API for rendering and toggling converted balances.
 */
export interface CurrencyConversionApi {
    displayCurrency: DisplayCurrency;
    rate: number;
    toggle: () => DisplayCurrency;
    set: (c: DisplayCurrency) => void;
    setRate: (r: number) => void;
    convert: (amount: number, accountCurrency: string) => ReturnType<typeof getConvertedBalance>;
    /** Convenience: formatted string for the given amount/account currency. */
    format: (amount: number, accountCurrency: string) => string;
}

export const useCurrencyConversion = (): CurrencyConversionApi => {
    const [displayCurrency, setDisplay] = useState<DisplayCurrency>(() => getDisplayCurrency());
    const [rate, setRateState] = useState<number>(() => getUsdToKesRate());

    useEffect(() => subscribeCurrencyPreferences(() => {
        setDisplay(getDisplayCurrency());
        setRateState(getUsdToKesRate());
    }), []);

    const toggle = useCallback(() => toggleDisplayCurrency(), []);
    const set = useCallback((c: DisplayCurrency) => setDisplayCurrency(c), []);
    const setRate = useCallback((r: number) => setUsdToKesRate(r), []);
    const convert = useCallback(
        (amount: number, accountCurrency: string) => getConvertedBalance(amount, accountCurrency, displayCurrency),
        [displayCurrency]
    );
    const format = useCallback(
        (amount: number, accountCurrency: string) =>
            getConvertedBalance(amount, accountCurrency, displayCurrency).formatted,
        [displayCurrency]
    );

    return { displayCurrency, rate, toggle, set, setRate, convert, format };
};

/** Non-hook helper for one-off conversions inside render. */
export const convertOnce = convertAmount;
