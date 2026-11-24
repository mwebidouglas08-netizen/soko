import { CopyTradingEngine } from '../engine/copy-trading';

jest.mock('@/components/shared/utils/config/config', () => ({ WS_SERVERS: {}, isProduction: () => true }));
jest.mock('@/services/sound-service', () => ({ soundService: { play: jest.fn() } }));
jest.mock('@/services/voice-service', () => ({ voiceService: { announceSignal: jest.fn(), announceSettlement: jest.fn() } }));

class FakeSocket {
    static instances: FakeSocket[] = [];
    url: string;
    sent: any[] = [];
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    onclose: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(url: string) { this.url = url; FakeSocket.instances.push(this); }
    send(data: string) { this.sent.push(JSON.parse(data)); }
    close() { this.onclose?.(); }
    message(data: unknown) { this.onmessage?.({ data: JSON.stringify(data) }); }
}

describe('copy-trading safety', () => {
    beforeEach(() => { localStorage.clear(); FakeSocket.instances = []; (global as any).WebSocket = FakeSocket; });
    it('authorizes through the websocket frame and skips existing positions', async () => {
        const engine = new CopyTradingEngine();
        await engine.start('master-secret');
        const master = FakeSocket.instances[0];
        expect(master.url).not.toContain('master-secret');
        master.onopen?.();
        expect(master.sent[0]).toEqual({ authorize: 'master-secret' });
        master.message({ authorize: { loginid: 'VRTC1', is_virtual: 1 } });
        master.message({ portfolio: { portfolio_open: [{ contract_id: 42 }] } });
        master.message({ proposal_open_contract: { contract_id: 42, contract_type: 'DIGITEVEN', symbol: 'R_100', duration: 1, duration_unit: 't', buy_price: 1 } });
        expect(engine.getState().stats.copied).toBe(0);
        expect(FakeSocket.instances).toHaveLength(1);
        engine.stop();
    });
    it('does not persist copier tokens', () => {
        const engine = new CopyTradingEngine();
        engine.addCopier('copier-secret');
        expect(localStorage.getItem('mwx_copy_trading_v1')).not.toContain('copier-secret');
        expect(FakeSocket.instances[0].url).not.toContain('copier-secret');
        FakeSocket.instances[0].onopen?.();
        expect(FakeSocket.instances[0].sent[0]).toEqual({ authorize: 'copier-secret' });
        FakeSocket.instances[0].close();
    });
});
