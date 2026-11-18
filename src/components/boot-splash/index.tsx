import { useEffect, useRef, useState } from 'react';
import './boot-splash.scss';

const STATUS_LINES = [
    'Initializing core systems…',
    'Loading trading engines…',
    'Syncing market intelligence…',
    'Preparing your workspace…',
    'Almost ready…',
];

const BootSplash = ({ onDone }: { onDone?: () => void }) => {
    const [progress, setProgress] = useState(0);
    const [statusIdx, setStatusIdx] = useState(0);
    const [leaving, setLeaving] = useState(false);
    const doneRef = useRef(false);

    useEffect(() => {
        if (typeof window.__hideBootSplash === 'function') window.__hideBootSplash();
    }, []);

    useEffect(() => {
        const duration = 5200;
        const tickMs = 40;
        const started = Date.now();
        const timer = setInterval(() => {
            const elapsed = Date.now() - started;
            const pct = Math.min(100, Math.round((elapsed / duration) * 100));
            setProgress(pct);
            setStatusIdx(Math.min(STATUS_LINES.length - 1, Math.floor((pct / 100) * STATUS_LINES.length)));
            if (pct >= 100) {
                clearInterval(timer);
                if (!doneRef.current) {
                    doneRef.current = true;
                    setLeaving(true);
                    setTimeout(() => onDone?.(), 700);
                }
            }
        }, tickMs);
        return () => clearInterval(timer);
    }, [onDone]);

    return (
        <div className={`bt-splash ${leaving ? 'bt-splash--leave' : ''}`} role='status' aria-label='Loading TradingHubs'>
            <div className='boot-sky' aria-hidden='true'>
                <span className='boot-glow--teal' />
                <span className='boot-glow--gold' />
                <span className='boot-aura' />
                <span className='boot-grid' />
                <span className='boot-grain' />
                <span className='boot-vignette' />
            </div>
            <div className='boot-shell'>
                <div className='boot-mark' role='button' tabIndex={0} aria-label='TradingHubs mark'>
                    <span className='boot-mark-halo' />
                    <span className='boot-mark-ring' />
                    <span className='boot-mark-ring boot-mark-ring--inner' />
                    <div className='boot-mark-img'><img src='/assets/tradinghubs-mark.svg' alt='' aria-hidden='true' /></div>
                    <span className='boot-mark-core' />
                </div>
                <div className='boot-kicker'>Precision Trading Workspace</div>
                <div className='boot-brand' role='button' tabIndex={0} aria-label='TradingHubs'>
                    <span className='boot-brand-main'>TRADING</span>
                    <span className='boot-brand-accent'>HUBS</span>
                </div>
                <div className='boot-rule' aria-hidden='true'><i /></div>
                <p className='boot-tagline'>Build, automate, and run trading strategies with cinematic clarity.</p>
                <div className='boot-progress' aria-label={`Loading ${progress}%`}>
                    <span className='boot-progress-track' aria-hidden='true'>
                        <span className='boot-progress-fill' style={{ width: `${progress}%` }} />
                    </span>
                    <div className='boot-progress-meta'>
                        <span className='boot-status'>Initializing <strong>{STATUS_LINES[statusIdx]}</strong><span className='boot-cursor' aria-hidden='true' /></span>
                        <span className='boot-pct'>{progress}%</span>
                    </div>
                </div>
            </div>
            <div className='boot-foot' aria-hidden='true'>tradinghubs.site</div>
        </div>
    );
};

export default BootSplash;