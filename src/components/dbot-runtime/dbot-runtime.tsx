import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { generateOAuthURL } from '@/components/shared';
import DesktopWrapper from '@/components/shared_ui/desktop-wrapper';
import Dialog from '@/components/shared_ui/dialog';
import MobileWrapper from '@/components/shared_ui/mobile-wrapper';
import RunPanel from '@/components/run-panel';
import TradingViewModal from '@/components/trading-view-chart/trading-view-modal';
import { DBOT_TABS } from '@/constants/bot-contents';
import { api_base, updateWorkspaceName } from '@/external/bot-skeleton';
import { CONNECTION_STATUS } from '@/external/bot-skeleton/services/api/observables/connection-status-stream';
import { isDbotRTL } from '@/external/bot-skeleton/utils/workspace';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import ChartModal from '@/pages/chart/chart-modal';
import { localize } from '@deriv-com/translations';

/**
 * Global DBot machinery the shell must keep mounted for every view: the run
 * drawer (Summary/Transactions/Journal), the stop/login dialog, the chart
 * modals opened from the builder toolbar, the connection-loss stop, trashcan
 * placement and the workspace document title. Extracted from the old
 * AppWrapper once the shell stopped rendering DBot's inner tabs.
 */
const DbotRuntime = observer(() => {
    const { connectionStatus } = useApiBase();
    const { dashboard, run_panel, quick_strategy, summary_card, blockly_store, load_modal } = useStore();
    const { is_loading } = blockly_store;
    const { active_tab, setWebSocketState } = dashboard;
    const {
        is_dialog_open,
        is_drawer_open,
        dialog_options,
        onCancelButtonClick,
        onCloseDialog,
        onOkButtonClick,
        stopBot,
    } = run_panel;
    const { is_open } = quick_strategy;
    const { dashboard_strategies } = load_modal;
    const { clear } = summary_card;
    const { cancel_button_text, ok_button_text, title, message, dismissable, is_closed_on_cancel } =
        dialog_options as {
            cancel_button_text?: string;
            ok_button_text?: string;
            title?: string;
            message?: string;
            dismissable?: boolean;
            is_closed_on_cancel?: boolean;
        };

    // Stop the bot when the WebSocket drops (parity with the reference shell).
    useEffect(() => {
        if (connectionStatus !== CONNECTION_STATUS.OPENED) {
            const is_bot_running = document.getElementById('db-animation__stop-button') !== null;
            if (is_bot_running) {
                clear();
                stopBot();
                api_base.setIsRunning(false);
                setWebSocketState(false);
            }
        }
    }, [clear, connectionStatus, setWebSocketState, stopBot]);

    // Keep the Blockly trashcan clear of the open drawer.
    useEffect(() => {
        const trashcan_init_id = setTimeout(() => {
            const blocklyWindow = window as unknown as {
                Blockly?: {
                    derivWorkspace?: { trashcan?: { setTrashcanPosition: (x: number, y: number) => void } };
                };
            };
            const workspace = blocklyWindow.Blockly?.derivWorkspace;
            if (active_tab === DBOT_TABS.BOT_BUILDER && workspace?.trashcan) {
                const trashcanY = window.innerHeight - 250;
                const trashcanX = is_drawer_open
                    ? isDbotRTL()
                        ? 380
                        : window.innerWidth - 460
                    : isDbotRTL()
                      ? 20
                      : window.innerWidth - 100;
                workspace.trashcan.setTrashcanPosition(trashcanX, trashcanY);
            }
        }, 100);

        return () => clearTimeout(trashcan_init_id);
    }, [active_tab, is_drawer_open]);

    // Reflect the loaded strategy name in the document title.
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        if (dashboard_strategies.length > 0) {
            timer = setTimeout(() => updateWorkspaceName());
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [dashboard_strategies, active_tab]);

    const handleLoginGeneration = async () => {
        const oauthUrl = await generateOAuthURL();
        if (oauthUrl) window.location.replace(oauthUrl);
    };

    return (
        <>
            <DesktopWrapper>
                <RunPanel />
                <ChartModal />
                <TradingViewModal />
            </DesktopWrapper>
            <MobileWrapper>{!is_open && <RunPanel />}</MobileWrapper>
            <Dialog
                cancel_button_text={cancel_button_text || localize('Cancel')}
                className='dc-dialog__wrapper--fixed'
                confirm_button_text={ok_button_text || localize('Ok')}
                has_close_icon
                is_mobile_full_width={false}
                is_visible={is_dialog_open}
                onCancel={onCancelButtonClick}
                onClose={onCloseDialog}
                onConfirm={onOkButtonClick || onCloseDialog}
                portal_element_id='modal_root'
                title={title}
                login={handleLoginGeneration}
                dismissable={dismissable}
                is_closed_on_cancel={is_closed_on_cancel}
            >
                {message}
            </Dialog>
        </>
    );
});

export default DbotRuntime;
