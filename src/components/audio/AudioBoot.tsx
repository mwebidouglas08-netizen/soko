import { useEffect } from 'react';
import { soundService } from '@/services/sound-service';
import { voiceService } from '@/services/voice-service';

const SESSION_KEY = 'dv_welcome_done';
/** Gap between the app settling and the welcome fanfare/voice. */
const WELCOME_DELAY_MS = 1100;
/** Minimum ms between two critical-click ticks. */
const CLICK_THROTTLE_MS = 45;

const isInteractive = (target: EventTarget | null): boolean => {
    if (!(target instanceof Element)) return false;
    const el = target.closest('button, [role="button"], a[href], .hub-tabnav__item');
    if (!el) return false;
    if (el instanceof HTMLButtonElement && (el.disabled || el.getAttribute('aria-disabled') === 'true')) return false;
    return true;
};

/**
 * App-wide audio boot: fires the cinematic welcome (fanfare + voice, once per
 * browser session) and hooks quiet ticks on critical clicks for the whole app.
 * Renders nothing.
 */
const AudioBoot = () => {
    useEffect(() => {
        let lastClickAt = 0;
        const onClick = (e: MouseEvent) => {
            if (!isInteractive(e.target)) return;
            const now = performance.now();
            if (now - lastClickAt < CLICK_THROTTLE_MS) return;
            lastClickAt = now;
            soundService.resume();
            soundService.play('click');
        };
        document.addEventListener('click', onClick, true);

        let welcomed = false;
        try {
            welcomed = sessionStorage.getItem(SESSION_KEY) === '1';
        } catch {
            // private mode — treat as fresh session
        }

        if (!welcomed) {
            try {
                sessionStorage.setItem(SESSION_KEY, '1');
            } catch {
                // ignore
            }
            const timer = window.setTimeout(() => {
                soundService.play('welcome');
                voiceService.announceWelcome();
            }, WELCOME_DELAY_MS);
            return () => {
                clearTimeout(timer);
                document.removeEventListener('click', onClick, true);
            };
        }

        return () => document.removeEventListener('click', onClick, true);
    }, []);

    return null;
};

export default AudioBoot;
