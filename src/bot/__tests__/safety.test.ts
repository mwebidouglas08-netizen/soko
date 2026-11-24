import { DEFAULT_RISK_LIMITS, evaluateOpportunity, initialRiskState } from '../core/risk';
import { signalQuality, theoreticalProbability } from '../core/algo-pro-ai';
import { simulateOverUnder } from '../core/backtest';
import { sanitizeUrl } from '@/utils/xss-protection';
import type { ContractOpportunity } from '../core/types';

describe('trading safety regressions', () => {
    const opportunity = { stake: 1, confidence: 1, sampleSize: 1000, expectedValuePct: 0.1, payoutRatio: 2 } as ContractOpportunity;
    it('does not increase stake above a small equity cap or with zero balance', () => {
        for (const equity of [0, 1, 10]) {
            const result = evaluateOpportunity(opportunity, initialRiskState(equity), DEFAULT_RISK_LIMITS, equity);
            expect(result.allowed).toBe(false);
        }
        expect(evaluateOpportunity(opportunity, initialRiskState(100), DEFAULT_RISK_LIMITS, 100).stake).toBe(1);
    });
    it('respects the expected value gate', () => {
        const bad = { ...opportunity, expectedValuePct: -0.1 };
        expect(evaluateOpportunity(bad, initialRiskState(100), DEFAULT_RISK_LIMITS, 100).gate).toBe('low_ev');
    });
    it('uses the correct digit-over baseline and falling move rate', () => {
        expect(theoreticalProbability('DIGITOVER', 2)).toBe(0.7);
        const q = signalQuality({ contractType: 'PUT' }, [], [5, 4, 3, 2, 1]);
        expect(q.fullRate).toBe(1);
        expect(q.blended).toBeCloseTo(1);
    });
    it('returns a zero take rate when history is shorter than the lookback', () => {
        const result = simulateOverUnder([1, 2], { direction: 'under', barrier: 4, payoutRatio: 2, stake: 1, lookback: 100, minSample: 20, minEvPct: 0 });
        expect(result.takeRate).toBe(0);
    });
    it('rejects malformed URI escapes instead of throwing', () => {
        expect(sanitizeUrl('%zz')).toBe('');
        expect(sanitizeUrl('javascript%3Aalert(1)')).toBe('');
    });
});
