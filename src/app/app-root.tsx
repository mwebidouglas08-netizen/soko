import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import AudioBoot from '@/components/audio/AudioBoot';
import AudioToggle from '@/components/audio/AudioToggle';
import ErrorBoundary from '@/components/error-component/error-boundary';
import ErrorComponent from '@/components/error-component/error-component';
import { useStore } from '@/hooks/useStore';
import AppContent from './app-content';
import './app-root.scss';

const ErrorComponentWrapper = observer(() => {
    const { common } = useStore();

    if (!common.error) return null;

    return (
        <ErrorComponent
            header={common.error?.header}
            message={common.error?.message}
            redirect_label={common.error?.redirect_label}
            redirectOnClick={common.error?.redirectOnClick}
            should_clear_error_on_click={common.error?.should_clear_error_on_click}
            setError={common.setError}
            redirect_to={common.error?.redirect_to}
            should_redirect={common.error?.should_redirect}
        />
    );
});

const AppRoot = () => {
    const store = useStore();
    const [booted, setBooted] = useState(false);

    // Mount the shell straight away: index.html's intro is painted over it, so
    // the app is already rendered behind the overlay and the dissolve reveals a
    // live screen instead of a blank one.
    useEffect(() => {
        const t = window.setTimeout(() => setBooted(true), 50);
        return () => window.clearTimeout(t);
    }, []);

    // "App is on screen" signal for the intro. index.html owns the timing — it
    // holds the splash for its minimum duration and then plays the dissolve — so
    // this call arriving early can never cut the intro short.
    useEffect(() => {
        if (booted && typeof window.__hideBootSplash === 'function') {
            window.__hideBootSplash();
        }
    }, [booted]);

    return (
        <>
            {booted && store && (
                <>
                    <AudioBoot />
                    <AudioToggle />
                    <ErrorBoundary root_store={store}>
                        <ErrorComponentWrapper />
                        <AppContent />
                    </ErrorBoundary>
                </>
            )}
        </>
    );
};

export default AppRoot;
