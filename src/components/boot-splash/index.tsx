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
            <div className='bt-cinema-bg' aria-hidden='true'>
                <div className='bt-cinema-aurora' />
                <div className='bt-cinema-vignette' />
                <div className='bt-cinema-grain' />
            </div>
            <div className='bt-stage'>
                <div className='bt-emblem'>
                    <div className='bt-emblem-ring' />
                    <div className='bt-emblem-ring bt-emblem-ring--inner' />
                    <img className='bt-emblem-logo' src='/loader.jpg' alt='' />
                </div>
                <div className='bt-kicker'>Precision Trading Workspace</div>
                <h1 className='bt-title' aria-label='TradingHubs'>
                    <span className='bt-title-main'>TRADING</span>
                    <span className='bt-title-accent'>HUBS</span>
                </h1>
                <p className='bt-tagline'>Build, automate, and run trading strategies with cinematic clarity.</p>
                <div className='bt-progress' aria-label={`Loading ${progress}%`}>
                    <div className='bt-progress-track'>
                        <div className='bt-progress-fill' style={{ width: `${progress}%` }} />
                    </div>
                    <div className='bt-progress-meta'>
                        <span>{STATUS_LINES[statusIdx]}</span>
                        <span>{progress}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BootSplash;