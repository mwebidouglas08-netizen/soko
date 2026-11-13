import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import AudioBoot from '@/components/audio/AudioBoot';
import AudioToggle from '@/components/audio/AudioToggle';
import ErrorBoundary from '@/components/error-component/error-boundary';
import ErrorComponent from '@/components/error-component/error-component';
import BootSplash from '@/components/boot-splash';
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

    return (
        <>
            {!booted && <BootSplash onDone={() => setBooted(true)} />}
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
