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

const BRAND_PRIMARY = 'TRADING';
const BRAND_SECONDARY = 'HUBS';
const BRAND_TAGLINE = 'Build and run trading bots without code.';
const BRAND_SUBTEXT = 'Precision Trading Workspace';
/** Typewriter cadence. */
const TYPE_MS = 70;

/**
 * Dollarprinter-style cinematic boot loader. Indigo #6366f1 to cyan #22d3ee
 * brand mark, glassmorphic floating card, animated logo rings, live status row.
 * Classic, professional, human-designed startup screen.
 *
 * The splash does NOT self-dismiss on a timer. It stays visible until the
 * parent calls onDone() (triggered by app-root once API initialization is
 * complete), so the background image persists for the whole initialization
 * period.
 */
const BootSplash = ({ onDone, minDurationMs = 6000 }: BootSplashProps) => {
    const [typed, setTyped] = useState('');
    const [progress, setProgress] = useState(0);
    const [leaving, setLeaving] = useState(false);

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

    // Progress bar animates visually but does NOT auto-dismiss. The parent
    // controls when the splash hides via onDone().
    useEffect(() => {
        const duration = Math.max(2200, minDurationMs);
        const tickMs = Math.max(40, Math.floor(duration / 100));
        const started = Date.now();
        const p = setInterval(() => {
            const elapsed = Date.now() - started;
            const pct = Math.min(95, Math.round((elapsed / duration) * 100));
            setProgress(pct);
        }, tickMs);
        return () => clearInterval(p);
    }, [minDurationMs]);

    const status = STATUS[Math.min(STATUS.length - 1, Math.floor((progress / 100) * (STATUS.length - 1)))];

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
                <div className='bt-status-row bt-status-row--bottom'><span>Status</span><strong>{status}</strong></div>
            </div>
        </div>
    );
};

export default BootSplash;
