import { render, screen, waitFor } from '@testing-library/react';
import AnalysisToolPage from '../index';
import { SCAN_WINDOW, MARKETS, computeWindow, directions } from '../analysis-core';

jest.mock('@/hooks/useStore', () => ({ useStore: () => null }));
jest.mock('@/bot/deriv/history', () => ({ fetchHistoricalTicks: jest.fn() }), { virtual: true });
jest.mock('@/bot/core/digit-stats', () => ({
    chiSquareUniformity: jest.fn(),
    computeDigitCounts: jest.fn(),
    computeRsi: jest.fn(),
    empiricalProbability: jest.fn(),
    theoreticalProbability: jest.fn(() => 0.1),
    wilsonInterval: jest.fn(() => [0, 1]),
}), { virtual: true });
jest.mock('@/bot/core/indicators', () => ({ bollinger: jest.fn(), latest: jest.fn(), macd: jest.fn() }), { virtual: true });
jest.mock('@/services/sound-service', () => ({ soundService: { play: jest.fn(() => true), isEnabled: jest.fn(() => false) } }));
jest.mock('@/services/voice-service', () => ({ voiceService: { announceScannerHit: jest.fn(() => true) } }));
jest.mock(
    '../feed',
    () => {
        const marketFeed = {
            subscribe: jest.fn(() => jest.fn()),
            subscribeStatus: jest.fn(() => jest.fn()),
            getMarketState: jest.fn(() => undefined),
            start: jest.fn(),
            stop: jest.fn(),
            status: 'CONNECTED',
        };
        return {
            marketFeed,
            useMarketFeed: jest.fn(() => undefined),
            useFeedStatus: jest.fn(() => 'CONNECTED'),
        };
    },
    { virtual: true },
);
jest.mock('../scanner-store', () => {
    const snap = {
        settings: {
            sampleSize: 15,
            scanWindowSeconds: 22,
            signalThreshold: 55,
            overUnderBarrier: 4.5,
            matchesDiffersTarget: 4,
            autoScan: true,
            notificationsEnabled: false,
            derivAppId: '1089',
        },
        history: [],
    };
    return {
        useScannerStore: jest.fn(() => snap),
        useUpdateSettings: jest.fn(),
        addHistoryRecord: jest.fn(),
        clearHistory: jest.fn(),
        resetSettings: jest.fn(),
    };
}, { virtual: true });
jest.mock('../stats-panel', () => ({ default: jest.fn(() => <div data-testid='stats-panel'>Deep Stats</div>) }), { virtual: true });

const tab = (label: string) => screen.getByText(label, { selector: 'button', exact: true });

describe('AnalysisToolPage (Patel Digit Tool scanner)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the scanner shell with the hub tabs', async () => {
        render(<AnalysisToolPage />);
        await waitFor(() => expect(screen.getByText(/Patel Digit Tool/i)).toBeInTheDocument());
        await waitFor(() => expect(tab('Even / Odd')).toBeInTheDocument());
        await waitFor(() => expect(tab('Over / Under')).toBeInTheDocument());
        await waitFor(() => expect(tab('Match Now')).toBeInTheDocument());
        await waitFor(() => expect(tab('Rise / Fall')).toBeInTheDocument());
        await waitFor(() => expect(tab('Deep Stats')).toBeInTheDocument());
        await waitFor(() => expect(tab('Categories Hub')).toBeInTheDocument());
    });

    it('shows the four category hub cards on the default hub view', async () => {
        render(<AnalysisToolPage />);
        await waitFor(() => expect(screen.getByText(/Explore Signal Categories/i)).toBeInTheDocument());
        await waitFor(() => expect(screen.getByText(/Even\/Odd Signals/i)).toBeInTheDocument());
        await waitFor(() => expect(screen.getByText(/Over\/Under Signals/i)).toBeInTheDocument());
        await waitFor(() => expect(screen.getByText(/Matches\/Differs Signals/i)).toBeInTheDocument());
        await waitFor(() => expect(screen.getByText(/Rise\/Fall Signals/i)).toBeInTheDocument());
    });

    it('navigates to the Even/Odd scanner view and renders market cards', async () => {
        render(<AnalysisToolPage />);
        await waitFor(() => expect(tab('Even / Odd')).toBeInTheDocument());
        tab('Even / Odd').click();
        await waitFor(() => expect(screen.getByText(/Even \/ Odd Signals/i)).toBeInTheDocument());
        await waitFor(() => expect(screen.getByText(/All Indexes \(/i)).toBeInTheDocument());
    });

    it('renders the Over/Under barrier controls', async () => {
        render(<AnalysisToolPage />);
        await waitFor(() => expect(tab('Over / Under')).toBeInTheDocument());
        tab('Over / Under').click();
        await waitFor(() => expect(screen.getByText(/BARRIER THRESHOLD/i)).toBeInTheDocument());
        await waitFor(() => expect(screen.getByRole('button', { name: 'Barrier 4.5' })).toBeInTheDocument());
    });

    it('renders the Match Now AI controls with digit buttons', async () => {
        render(<AnalysisToolPage />);
        await waitFor(() => expect(tab('Match Now')).toBeInTheDocument());
        tab('Match Now').click();
        await waitFor(() => expect(screen.getByText(/AI ENGINE/i)).toBeInTheDocument());
        await waitFor(() => expect(screen.getByRole('button', { name: 'Auto AI' })).toBeInTheDocument());
        await waitFor(() => expect(screen.getByText('9')).toBeInTheDocument());
    });

    it('renders the Rise/Fall scanner view', async () => {
        render(<AnalysisToolPage />);
        await waitFor(() => expect(tab('Rise / Fall')).toBeInTheDocument());
        tab('Rise / Fall').click();
        await waitFor(() => expect(screen.getByText(/Rise\/Fall Signals/i)).toBeInTheDocument());
    });

    it('opens the scanner settings panel', async () => {
        render(<AnalysisToolPage />);
        const gear = screen.getByRole('button', { name: /Scanner settings/i });
        gear.click();
        await waitFor(() => expect(screen.getByLabelText(/Sample size \(ticks\)/i)).toBeInTheDocument());
        await waitFor(() => expect(screen.getByRole('button', { name: 'Reset defaults' })).toBeInTheDocument());
    });

    it('renders the market detail modal when a market card is clicked', async () => {
        render(<AnalysisToolPage />);
        await waitFor(() => expect(tab('Even / Odd')).toBeInTheDocument());
        tab('Even / Odd').click();
        await waitFor(() => expect(screen.getByText('VOLATILITY 10 (1S)', { selector: 'h3' })).toBeInTheDocument());
        const heading = screen.getByText('VOLATILITY 10 (1S)', { selector: 'h3' });
        (heading.closest('[role="button"]') as HTMLElement)!.click();
        await waitFor(() => expect(screen.getByText(/Volatility 10 \(1s\) Index/i)).toBeInTheDocument());
        await waitFor(() => expect(screen.getByRole('button', { name: /Close market detail/i })).toBeInTheDocument());
    });
});
