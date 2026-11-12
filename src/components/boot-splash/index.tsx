import { useEffect, useRef, useState } from 'react';
import './boot-splash.scss';

interface BootSplashProps {
    onDone?: () => void;
    minDurationMs?: number;
}

const STATUS = [
    'Initializing core…',
    'Connecting to trading server…',
    'Streaming live market data…',
    'Warming up the bot engine…',
    'Preparing your dashboard…',
];

const BRAND_PRIMARY = 'BINARY';
const BRAND_SECONDARY = 'TOOL';
/** Typewriter cadence. */
const TYPE_MS = 70;

/**
 * BinaryTool-style cinematic boot loader. Cyan + amber brand mark, welcome
 * message, activity bars, gradient progress bar, live status row — matches
 * the reference app startup screen exactly.
 */
const BootSplash = ({ onDone, minDurationMs = 6000 }: BootSplashProps) => {
    const [typed, setTyped] = useState('');
    const [progress, setProgress] = useState(0);
    const [leaving, setLeaving] = useState(false);
    const doneRef = useRef(false);

    // Typewriter: types the brand letter by letter, then holds.
    useEffect(() => {
        let i = 0;
        const t = setInterval(() => {
            i += 1;
            setTyped(BRAND_PRIMARY.slice(0, i));
            if (i >= BRAND_PRIMARY.length) clearInterval(t);
        }, TYPE_MS);
        return () => clearInterval(t);
    }, []);

    // Progress + status: advance every 1/5th of the duration, then leave.
    useEffect(() => {
        const duration = Math.max(2200, minDurationMs);
        const tickMs = Math.max(40, Math.floor(duration / 100));
        const started = Date.now();
        const p = setInterval(() => {
            const pct = Math.min(100, Math.round(((Date.now() - started) / duration) * 100));
            setProgress(pct);
            if (pct >= 100) {
                clearInterval(p);
                if (!doneRef.current) {
                    doneRef.current = true;
                    setLeaving(true);
                    setTimeout(() => onDone?.(), 560);
                }
            }
        }, tickMs);
        return () => clearInterval(p);
    }, [minDurationMs, onDone]);

    const status = STATUS[Math.min(STATUS.length - 1, Math.floor((progress / 100) * (STATUS.length - 1)))];

    // Take over from the static splash in index.html.
    useEffect(() => {
        if (typeof window.__hideBootSplash === 'function') window.__hideBootSplash();
    }, []);

    return (
        <div className={`bt-splash ${leaving ? 'bt-splash--leave' : ''}`} role='status' aria-label='Loading BinaryTool'>
            <div className='bt-loader-content'>
                <div className='bt-status-row'><span>Initializing</span><strong>Core</strong></div>
                <div className='bt-logo-container'>
                    <span className='bt-binary-part'>{typed}</span>
                    <span className='bt-fx-part'>{BRAND_SECONDARY}</span>
                </div>
                <div className='bt-welcome'>
                    <div className='bt-welcome-subtext'>Your Deriv automation companion</div>
                    <div className='bt-welcome-tagline'>Build and run trading bots without coding.</div>
                </div>
                <div className='bt-activity'>
                    <span /><span /><span /><span />
                </div>
                <div className='bt-progress-bar'>
                    <div className='bt-progress-fill' style={{ width: `${progress}%` }} />
                </div>
                <div className='bt-status-row'><span>Status</span><strong>{status}</strong></div>
            </div>
        </div>
    );
};

export default BootSplash;
