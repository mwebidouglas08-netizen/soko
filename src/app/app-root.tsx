import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import AudioBoot from '@/components/audio/AudioBoot';
import AudioToggle from '@/components/audio/AudioToggle';
import ErrorBoundary from '@/components/error-component/error-boundary';
import ErrorComponent from '@/components/error-component/error-component';
import BootSplash from '@/components/boot-splash';
import { api_base } from '@/external/bot-skeleton';
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
    const api_base_initialized = useRef(false);
    const [is_api_initialized, setIsApiInitialized] = useState(false);
    const [booted, setBooted] = useState(false);

    // Initialize API
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (!is_api_initialized) {
                setIsApiInitialized(true);
            }
        }, 5000);

        const initializeApi = async () => {
            if (!api_base_initialized.current) {
                try {
                    await api_base.init();
                    api_base_initialized.current = true;
                } catch (error) {
                    console.error('API initialization failed:', error);
                    api_base_initialized.current = false;
                } finally {
                    setIsApiInitialized(true);
                    clearTimeout(timeoutId);
                }
            }
        };

        initializeApi();
        return () => clearTimeout(timeoutId);
    }, []);

    // When API initialization completes and the store is available, hide the
    // boot splash so the app becomes visible. The static splash in index.html
    // persists until this point, so the background image stays on screen for
    // the whole initialization period.
    useEffect(() => {
        if (is_api_initialized && store) {
            setBooted(true);
            if (typeof window.__hideBootSplash === 'function') window.__hideBootSplash();
        }
    }, [is_api_initialized, store]);

    return (
        <>
            {!booted && <BootSplash />}
            {booted && (
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
