import { render, screen } from '@testing-library/react';
import AnalysisToolPage from '../index';
import { SCAN_WINDOW, MARKETS, computeWindow, directions } from '../analysis-core';

jest.mock('@/hooks/useStore', () => ({ useStore: () => null }));

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
    });
});
