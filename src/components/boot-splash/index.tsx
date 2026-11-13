import { useEffect, useRef, useState } from 'react';
import './boot-splash.scss';

const STATUS_LINES = [
    'Initializing core…',
    'Loading trading engines…',
    'Connecting to markets…',
    'Preparing your workspace…',
    'Almost ready…',
];

const BRAND_PRIMARY = 'TRADING';
const BRAND_SECONDARY = 'HUBS';
const BRAND_TAGLINE = 'Build and run trading bots without code.';
const BRAND_SUBTEXT = 'Precision Trading Workspace';
const TYPE_MS = 55;

/**
 * Cinematic initialization splash. Indigo #6366f1 → cyan #22d3ee theme.
 * Beautiful classic animations: rotating logo rings, pulsing glow, sheen
 * light sweep, typewriter brand mark, smooth progress bar, cycling status.
 * Self-dismisses after the animation completes — the app then opens.
 */
const BootSplash = ({ onDone }: { onDone?: () => void }) => {
    const [typed, setTyped] = useState('');
    const [progress, setProgress] = useState(0);
    const [statusIdx, setStatusIdx] = useState(0);
    const [leaving, setLeaving] = useState(false);
    const doneRef = useRef(false);

    // Typewriter: types TRADING letter by letter.
    useEffect(() => {
        let i = 0;
        const t = setInterval(() => {
            i += 1;
            setTyped(BRAND_PRIMARY.slice(0, i));
            if (i >= BRAND_PRIMARY.length) clearInterval(t);
        }, TYPE_MS);
        return () => clearInterval(t);
    }, []);

    // Hand off from the static splash in index.html.
    useEffect(() => {
        if (typeof window.__hideBootSplash === 'function') window.__hideBootSplash();
    }, []);

    // Progress + status: smooth advance, cycle status lines, then leave.
    useEffect(() => {
        const duration = 7000;
        const tickMs = 40;
        const started = Date.now();
        const p = setInterval(() => {
            const elapsed = Date.now() - started;
            const pct = Math.min(100, Math.round((elapsed / duration) * 100));
            setProgress(pct);
            setStatusIdx(Math.min(STATUS_LINES.length - 1, Math.floor((pct / 100) * (STATUS_LINES.length - 1))));
            if (pct >= 100) {
                clearInterval(p);
                if (!doneRef.current) {
                    doneRef.current = true;
                    setLeaving(true);
                    setTimeout(() => onDone?.(), 600);
                }
            }
        }, tickMs);
        return () => clearInterval(p);
    }, []);

    return (
        <div className={`bt-splash ${leaving ? 'bt-splash--leave' : ''}`} role='status' aria-label='Loading TradingHubs'>
            <div className='bt-loader-content'>
                <div className='bt-status-row'><span>Initializing</span><strong>Core</strong></div>
                <div className='bt-logo-container'>
                    <div className='bt-logo-mark'>
                        <div className='bt-logo-ring'></div>
                        <div className='bt-logo-ring-inner'></div>
                        <img className='bt-logo-image' src='/loader.jpg' alt='' />
                    </div>
                    <span className='bt-binary-part'>{typed}</span>
                    <span className='bt-fx-part'>{BRAND_SECONDARY}</span>
                </div>
                <div className='bt-welcome'>
                    <div className='bt-welcome-subtext'>{BRAND_SUBTEXT}</div>
                    <div className='bt-welcome-tagline'>{BRAND_TAGLINE}</div>
                </div>
                <div className='bt-progress-bar'>
                    <div className='bt-progress-fill' style={{ width: `${progress}%` }} />
                </div>
                <div className='bt-progress-meta'>
                    <span>Boot sequence</span>
                    <span>{progress}%</span>
                </div>
                <div className='bt-status-row bt-status-row--bottom'><span>Status</span><strong>{STATUS_LINES[statusIdx]}</strong></div>
            </div>
        </div>
    );
};

export default BootSplash;
