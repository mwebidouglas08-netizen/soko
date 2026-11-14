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

    useEffect(() => {
        const ready = () => {
            if (typeof window.__hideBootSplash === 'function') {
                window.__hideBootSplash();
            }
            setBooted(true);
        };
        if (document.readyState === 'complete') {
            const t = window.setTimeout(ready, 1200);
            return () => window.clearTimeout(t);
        }
        const onLoad = () => window.setTimeout(ready, 1200);
        window.addEventListener('load', onLoad);
        return () => window.removeEventListener('load', onLoad);
    }, []);

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
