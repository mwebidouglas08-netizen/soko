import { useEffect } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { setExecutionFast } from '@/bot/deriv/execution';
import { useStore } from '@/hooks/useStore';
import './execution-fast-toggle.scss';

/**
 * Footer "Execution / FAST" switch — mirrors the reference app-footer control
 * and drives the engine's proposal pacing (see setExecutionFast in execution.ts).
 */
const ExecutionFastToggle = observer(() => {
    const { ui } = useStore();
    const fast = ui.execution_fast;

    useEffect(() => {
        setExecutionFast(fast);
    }, [fast]);

    return (
        <button
            type='button'
            className={classNames('execution-mode-toggle animation__execution-mode', {
                'execution-mode-toggle--fast': fast,
                'execution-mode-toggle--slow': !fast,
            })}
            onClick={() => ui.setExecutionFast(!fast)}
            title={fast ? 'Fast execution enabled' : 'Fast execution disabled'}
        >
            <span className='execution-mode-toggle__text'>
                <span className='execution-mode-toggle__label'>Execution</span>
                <span className='execution-mode-toggle__status'>{fast ? 'Fast' : 'Normal'}</span>
            </span>
            <span className='execution-mode-toggle__track' aria-hidden='true'>
                <span className='execution-mode-toggle__thumb' />
            </span>
        </button>
    );
});

export default ExecutionFastToggle;
