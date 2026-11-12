import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import classNames from 'classnames';
import { useStore } from '@/hooks/useStore';
import { Localize, localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import Text from '@/components/shared_ui/text';
import Button from '@/components/shared_ui/button';
import './bot-monitor.scss';

type TContractStage = typeof contract_stages;

const formatCurrency = (amount: number, currency: string): string => {
    const sign = amount >= 0 ? '+' : '';
    return `${sign}${amount.toFixed(2)} ${currency}`;
};

const BotMonitor = observer(() => {
    const store = useStore();
    const { run_panel, dashboard, transactions, summary_card, client, journal } = store;
    const { isDesktop } = useDevice();
    const { currency } = client;
    const {
        is_running,
        has_open_contract,
        contract_stage,
        run_id,
        toggleDrawer,
        stopMyBot,
        setActiveTabIndex,
        active_index,
    } = run_panel;
    const { total_profit, total_stake, total_payout, won_contracts, lost_contracts, number_of_runs } =
        transactions.statistics;
    const { contract_info, is_contract_loading, is_bot_running } = summary_card;
    const { unfiltered_messages } = journal;
    const { transactions: txns } = transactions;

    const [tab, setTab] = useState(0);
    const tabs = [
        { id: 'overview', label: localize('Overview') },
        { id: 'trades', label: localize('Trades') },
        { id: 'journal', label: localize('Journal') },
    ];

    const stageLabels: Record<number, string> = {
        0: localize('Stopped'),
        1: localize('Starting'),
        2: localize('Buying Contract'),
        3: localize('Contract Active'),
        4: localize('Contract Closed'),
        5: localize('Stopping'),
    };

    const isBotActive = is_running || has_open_contract;

    const handleRunStop = () => {
        if (isBotActive) {
            stopMyBot();
        }
    };

    useEffect(() => {
        document.title = `${localize('Bot Monitor')} - Dollarprinter`;
        return () => {
            document.title = 'TradingHubs';
        };
    }, []);

    return (
        <div className='bot-monitor'>
            <div className='bot-monitor__header'>
                <div className='bot-monitor__brand'>
                    <div className='bot-monitor__logo'></div>
                    <div className='bot-monitor__title'>
                        <strong className='bot-monitor__app-name'>Dollarprinter</strong>
                        <span className='bot-monitor__subtitle'>Precision Trading Workspace</span>
                    </div>
                </div>
                <div className='bot-monitor__actions'>
                    <Button
                        id='db-bot-monitor-back'
                        text={localize('Back to Builder')}
                        secondary
                        onClick={() => {
                            dashboard.setActiveTab(dashboard.BOT_BUILDER);
                        }}
                    />
                    <Button
                        id='db-bot-monitor-run-stop'
                        className={classNames('bot-monitor__btn--run-stop', {
                            'bot-monitor__btn--stop': isBotActive,
                        })}
                        text={isBotActive ? localize('Stop Bot') : localize('Run Bot')}
                        onClick={handleRunStop}
                        has_effect={!isBotActive}
                    />
                </div>
            </div>

            <div className='bot-monitor__body'>
                <div className='bot-monitor__status-bar'>
                    <div className='bot-monitor__status-indicator'>
                        <span
                            className={classNames('bot-monitor__status-dot', {
                                'bot-monitor__status-dot--active': isBotActive,
                            })}
                        ></span>
                        <Text weight='bold' size='s' color='prominent'>
                            {isBotActive ? (stageLabels[contract_stage as number] || localize('Running')) : localize('Stopped')}
                        </Text>
                    </div>
                    <div className='bot-monitor__run-id'>
                        <Text size='xs' color='muted'>
                            {run_id ? `Run: ${run_id}` : localize('No active run')}
                        </Text>
                    </div>
                </div>

                <div className='bot-monitor__tabs'>
                    {tabs.map((t, i) => (
                        <button
                            key={t.id}
                            className={classNames('bot-monitor__tab', { 'bot-monitor__tab--active': tab === i })}
                            onClick={() => setTab(i)}
                        >
                            <Localize i18n_default_text={t.label} />
                        </button>
                    ))}
                    <div className='bot-monitor__tab-underline' style={{ left: `${(tab / tabs.length) * 100}%` }} />
                </div>

                {tab === 0 && (
                    <div className='bot-monitor__panel bot-monitor__panel--overview'>
                        <div className='bot-monitor__stats-grid'>
                            <div className='bot-monitor__stat-card'>
                                <div className='bot-monitor__stat-label'>{localize('Total Stake')}</div>
                                <div className='bot-monitor__stat-value'>{formatCurrency(total_stake, currency)}</div>
                            </div>
                            <div className='bot-monitor__stat-card'>
                                <div className='bot-monitor__stat-label'>{localize('Total Payout')}</div>
                                <div className='bot-monitor__stat-value'>{formatCurrency(total_payout, currency)}</div>
                            </div>
                            <div className='bot-monitor__stat-card'>
                                <div className='bot-monitor__stat-label'>{localize('Total Runs')}</div>
                                <div className='bot-monitor__stat-value'>{number_of_runs}</div>
                            </div>
                            <div className='bot-monitor__stat-card bot-monitor__stat-card--profit'>
                                <div className='bot-monitor__stat-label'>{localize('Profit / Loss')}</div>
                                <div
                                    className={classNames('bot-monitor__stat-value', {
                                        'bot-monitor__stat-value--positive': total_profit > 0,
                                        'bot-monitor__stat-value--negative': total_profit < 0,
                                    })}
                                >
                                    {formatCurrency(total_profit, currency)}
                                </div>
                            </div>
                            <div className='bot-monitor__stat-card'>
                                <div className='bot-monitor__stat-label'>{localize('Contracts Won')}</div>
                                <div className='bot-monitor__stat-value'>{won_contracts}</div>
                            </div>
                            <div className='bot-monitor__stat-card'>
                                <div className='bot-monitor__stat-label'>{localize('Contracts Lost')}</div>
                                <div className='bot-monitor__stat-value'>{lost_contracts}</div>
                            </div>
                        </div>

                        {contract_info && (
                            <div className='bot-monitor__current-contract'>
                                <div className='bot-monitor__panel-header'>{localize('Current Contract')}</div>
                                <div className='bot-monitor__contract-detail'>
                                    <span className='bot-monitor__contract-label'>{localize('Contract ID')}</span>
                                    <span className='bot-monitor__contract-value'>{contract_info.contract_id}</span>
                                </div>
                                <div className='bot-monitor__contract-detail'>
                                    <span className='bot-monitor__contract-label'>{localize('Type')}</span>
                                    <span className='bot-monitor__contract-value'>{contract_info.contract_type}</span>
                                </div>
                                <div className='bot-monitor__contract-detail'>
                                    <span className='bot-monitor__contract-label'>{localize('Status')}</span>
                                    <span className='bot-monitor__contract-value'>{contract_info.status}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {tab === 1 && (
                    <div className='bot-monitor__panel bot-monitor__panel--trades'>
                        <div className='bot-monitor__panel-header'>{localize('Trade History')}</div>
                        <div className='bot-monitor__trades-list'>
                            {txns?.length > 0 ? (
                                txns.map((tx: any) => (
                                    <div key={tx.id || tx.transaction_id} className='bot-monitor__trade-row'>
                                        <div className='bot-monitor__trade-info'>
                                            <div className='bot-monitor__trade-symbol'>{tx.symbol || localize('N/A')}</div>
                                            <div className='bot-monitor__trade-type'>{tx.contract_type || localize('N/A')}</div>
                                        </div>
                                        <div className='bot-monitor__trade-amount'>
                                            {formatCurrency(tx.profit || 0, currency)}
                                        </div>
                                        <div
                                            className={classNames('bot-monitor__trade-status', {
                                                'bot-monitor__trade-status--win': tx.profit > 0,
                                                'bot-monitor__trade-status--loss': tx.profit < 0,
                                            })}
                                        >
                                            {tx.profit > 0 ? localize('Won') : tx.profit < 0 ? localize('Lost') : localize('Open')}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className='bot-monitor__empty'>
                                    <Text size='s' color='muted'>{localize('No trades yet')}</Text>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {tab === 2 && (
                    <div className='bot-monitor__panel bot-monitor__panel--journal'>
                        <div className='bot-monitor__panel-header'>{localize('Activity Journal')}</div>
                        <div className='bot-monitor__journal-list'>
                            {unfiltered_messages?.length > 0 ? (
                                unfiltered_messages.slice().reverse().map((msg: any, i: number) => (
                                    <div key={i} className='bot-monitor__journal-entry'>
                                        <div className='bot-monitor__journal-time'>{new Date().toLocaleTimeString()}</div>
                                        <div className='bot-monitor__journal-message'>{msg.message || msg}</div>
                                    </div>
                                ))
                            ) : (
                                <div className='bot-monitor__empty'>
                                    <Text size='s' color='muted'>{localize('No activity yet')}</Text>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

export default BotMonitor;
