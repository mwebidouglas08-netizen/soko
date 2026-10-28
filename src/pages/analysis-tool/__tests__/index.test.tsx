import { render, screen, waitFor } from '@testing-library/react';
import AnalysisToolPage from '../index';
import { SCAN_WINDOW, MARKETS, computeWindow, directions } from '../analysis-core';

jest.mock('@/hooks/useStore', () => ({ useStore: () => null }));
<<<<<<< HEAD

// The page opens a live Deriv socket through the scanner hook; the unit test
// stubs it out and asserts the rendered shell + the pure analysis maths.
jest.mock('../use-market-scanner', () => ({
    useMarketScanner: () => ({ markets: {}, connected: false }),
}));

describe('AnalysisToolPage', () => {
    it('renders the category hub, tabs and the honesty note', () => {
        render(<AnalysisToolPage />);
        expect(screen.getByRole('heading', { name: 'Analysis Tool' })).toBeInTheDocument();
        expect(screen.getByText('Guest · analysis only')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Even / Odd' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Over / Under' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Match Now' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Rise / Fall' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Categories Hub' })).toBeInTheDocument();
        // Four signal-category cards, one per family.
        expect(screen.getAllByRole('button', { name: 'View Signals' })).toHaveLength(4);
        expect(screen.getByText(/do not predict the next tick/i)).toBeInTheDocument();
        expect(screen.getByText(new RegExp(`strict ${SCAN_WINDOW}-tick`, 'i'))).toBeInTheDocument();
    });
});

describe('analysis-core', () => {
    it('exposes the reference market set (12 one-second + 5 standard)', () => {
        expect(MARKETS).toHaveLength(17);
        expect(MARKETS.filter(m => m.group === '1s')).toHaveLength(12);
        expect(MARKETS.filter(m => m.group === 'standard')).toHaveLength(5);
    });

    it('partitions all ten digits across the over/under half-barrier', () => {
        // Barrier 4.5 -> OVER wins on 5-9, UNDER on 0-4; the two legs sum to 100%.
        const digits = Array.from({ length: SCAN_WINDOW }, (_, i) => i % 10);
        const s = computeWindow(digits, [], 4.5);
        expect(s.ready).toBe(true);
        expect(s.over + s.under).toBeCloseTo(1, 6);
        expect(s.even + s.odd).toBeCloseTo(1, 6);
    });

    it('reports the window as not ready until it is full', () => {
        const s = computeWindow([1, 2, 3], [], 4.5);
        expect(s.ready).toBe(false);
        expect(s.n).toBe(3);
    });

    it('derives tick directions from the quote series', () => {
        expect(directions([1, 2, 1, 3], 3)).toEqual(['up', 'down', 'up']);
=======
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
>>>>>>> c6950ae (feat: Patel Digit Tool port, free-bots visuals, bot loading fix)
    });
});
