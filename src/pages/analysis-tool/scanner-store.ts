/**
 * Scanner settings + signal history persisted in localStorage — same shape
 * and defaults as the reference (`pro_digit_ai_settings_v2` /
 * `pro_digit_ai_history_v2`), namespaced for this app.
 */
import { useCallback, useSyncExternalStore } from 'react';

export interface ScannerSettings {
    sampleSize: number;
    scanWindowSeconds: number;
    signalThreshold: number;
    overUnderBarrier: number;
    matchesDiffersTarget: number;
    autoScan: boolean;
    notificationsEnabled: boolean;
    derivAppId: string;
}

export const DEFAULT_SETTINGS: ScannerSettings = {
    sampleSize: 15,
    scanWindowSeconds: 22,
    signalThreshold: 55,
    overUnderBarrier: 4.5,
    matchesDiffersTarget: 4,
    autoScan: true,
    notificationsEnabled: false,
    derivAppId: '1089',
};

const SETTINGS_KEY = 'pdt_scanner_settings_v1';
const HISTORY_KEY = 'pdt_scanner_history_v1';

export interface HistoryRecord {
    id: string;
    timestamp: number;
    marketSymbol: string;
    marketName: string;
    contractCategory: string;
    candidate: string;
    confidence: number;
    sampleSize: number;
    stats: string;
    status: 'READY' | 'ACTIVE' | 'EXPIRED';
}

const listeners = new Set<() => void>();
let settings: ScannerSettings = load();
let history: HistoryRecord[] = loadHistory();

function load(): ScannerSettings {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

function loadHistory(): HistoryRecord[] {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        return raw ? (JSON.parse(raw) as HistoryRecord[]) : [];
    } catch {
        return [];
    }
}

const emit = () => listeners.forEach(fn => fn());

export const getSettings = (): ScannerSettings => ({ ...settings });

export const updateSettings = (patch: Partial<ScannerSettings>): ScannerSettings => {
    settings = { ...settings, ...patch };
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
        /* quota / private mode — keep in-memory */
    }
    emit();
    return { ...settings };
};

export const resetSettings = (): ScannerSettings => {
    settings = { ...DEFAULT_SETTINGS };
    try {
        localStorage.removeItem(SETTINGS_KEY);
    } catch {
        /* noop */
    }
    emit();
    return { ...settings };
};

export const getHistory = (): HistoryRecord[] => [...history];

export const addHistoryRecord = (record: Omit<HistoryRecord, 'id' | 'timestamp'>): void => {
    const entry: HistoryRecord = {
        ...record,
        id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
    };
    const duplicate = history.some(
        h => h.marketSymbol === entry.marketSymbol && h.candidate === entry.candidate && Math.abs(h.timestamp - entry.timestamp) < 15000
    );
    if (duplicate) return;
    history = [entry, ...history].slice(0, 100);
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
        /* noop */
    }
    emit();
};

export const clearHistory = (): void => {
    history = [];
    try {
        localStorage.removeItem(HISTORY_KEY);
    } catch {
        /* noop */
    }
    emit();
};

const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

// Cached snapshot to keep useSyncExternalStore stable between renders.
let cachedSnapshot: { settings: ScannerSettings; history: HistoryRecord[] } | null = null;
let cachedSettingsRef: ScannerSettings | null = null;
let cachedHistoryRef: HistoryRecord[] | null = null;

const getSnapshot = (): { settings: ScannerSettings; history: HistoryRecord[] } => {
    if (cachedSnapshot && cachedSettingsRef === settings && cachedHistoryRef === history) {
        return cachedSnapshot;
    }
    cachedSettingsRef = settings;
    cachedHistoryRef = history;
    cachedSnapshot = { settings: { ...settings }, history: [...history] };
    return cachedSnapshot;
};

/** Live view over settings + history (React 18 external store). */
export const useScannerStore = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

/** Convenience setter hook. */
export const useUpdateSettings = () => useCallback((patch: Partial<ScannerSettings>) => updateSettings(patch), []);
