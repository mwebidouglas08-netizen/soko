import { HubSession } from '../engine/hub-session';
import { currentLoginId, currentSocket, isAuthorized } from '../deriv/api';
import { executeBuy, releaseQuote, requestSimpleQuote } from '../deriv/execution';

jest.mock('../deriv/api', () => ({ currentLoginId: jest.fn(), currentSocket: jest.fn(), isAuthorized: jest.fn() }));
jest.mock('../deriv/execution', () => ({
    requestSimpleQuote: jest.fn(), executeBuy: jest.fn(), releaseQuote: jest.fn(),
    monitorUntilSettled: jest.fn(), settlementTimeoutMs: jest.fn(() => 1000),
}));
jest.mock('../deriv/ticks', () => ({ TickFeed: jest.fn() }));
jest.mock('@/services/sound-service', () => ({ soundService: { play: jest.fn() } }));
jest.mock('@/services/voice-service', () => ({ voiceService: { announceSettlement: jest.fn() } }));

const options = { symbols: ['R_100'], stake: 1, martingale: 1, takeProfit: 0, stopLoss: 0, evaluate: () => null };
const intent = { symbol: 'R_100', contractType: 'DIGITEVEN' as const };

describe('HubSession order safety', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (isAuthorized as jest.Mock).mockReturnValue(true);
        (currentLoginId as jest.Mock).mockReturnValue('VRTC123');
        (currentSocket as jest.Mock).mockReturnValue('socket');
    });
    it('rejects real and unauthorized accounts before requesting a proposal', async () => {
        (currentLoginId as jest.Mock).mockReturnValue('CR123');
        const session = new HubSession(options);
        await session.buyOnce(intent);
        (isAuthorized as jest.Mock).mockReturnValue(false);
        await session.buyOnce(intent);
        expect(requestSimpleQuote).not.toHaveBeenCalled();
    });
    it('releases and does not buy a quote that resolves after stop', async () => {
        let respond: (value: any) => void = () => {};
        (requestSimpleQuote as jest.Mock).mockReturnValue(new Promise(resolve => { respond = resolve; }));
        const session = new HubSession(options);
        const pending = session.buyOnce(intent);
        session.stop();
        const quote = { id: 'q' };
        respond({ quote });
        await pending;
        expect(releaseQuote).toHaveBeenCalledWith(quote);
        expect(executeBuy).not.toHaveBeenCalled();
    });
    it('does not buy if the account changes while quoting', async () => {
        let respond: (value: any) => void = () => {};
        (requestSimpleQuote as jest.Mock).mockReturnValue(new Promise(resolve => { respond = resolve; }));
        const session = new HubSession(options);
        const pending = session.buyOnce(intent);
        (currentLoginId as jest.Mock).mockReturnValue('CR123');
        respond({ quote: { id: 'q' } });
        await pending;
        expect(executeBuy).not.toHaveBeenCalled();
    });
});
