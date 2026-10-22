import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { addComma, getCurrencyDisplayCode, getDecimalPlaces } from '@/components/shared';
import Text from '@/components/shared_ui/text';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import { useApiBase } from '@/hooks/useApiBase';
import { useCurrencyConversion } from '@/hooks/use-app-preferences';
import { DisplayCurrency, getConvertedBalance } from '@/utils/currency-conversion';
import { useLogout } from '@/hooks/useLogout';
import { useStore } from '@/hooks/useStore';
import { isDemoAccount } from '@/utils/account-helpers';
import { Localize } from '@deriv-com/translations';
import { TAccountSwitcher } from './common/types';
import AccountInfoWrapper from './account-info-wrapper';
import './account-switcher.scss';

/* Reference header flag (circular US flag, viewBox 0 0 32 32). */
const FlagUSD = () => (
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 32 32' width='24' height='24' role='img' aria-hidden='true'>
        <path fill='#fff' d='M.03 15a16.3 16.3 0 0 0 .094 3h31.752a16 16 0 0 0 .093-3zM16 9v3h15.496a16 16 0 0 0-1.104-3zM16 6h12.49a16 16 0 0 0-3.16-3H16zM.797 21a16 16 0 0 0 1.343 3h27.72c.545-.943.997-1.948 1.343-3zM4.381 27a16 16 0 0 0 3.867 3h15.504a16 16 0 0 0 3.867-3z' />
        <path fill='#F44336' d='M16 0v3h9.33A15.93 15.93 0 0 0 16 0M16 15h15.97a16 16 0 0 0-.474-3H16zM16 9h14.392a16 16 0 0 0-1.901-3H16zM31.876 18a16 16 0 0 1-.673 3H.797a16 16 0 0 1-.673-3zM2.14 24a16 16 0 0 0 2.241 3h23.238a16 16 0 0 0 2.24-3zM16 32c2.813 0 5.455-.726 7.752-2H8.248c2.297 1.274 4.94 2 7.752 2' />
        <path fill='#283991' fillRule='evenodd' clipRule='evenodd' d='M16 15H.03a16 16 0 0 1 .176-1.575l-.01.069a.078.078 0 0 0 .057-.102l-.027-.085q.06-.355.136-.705l-.004.016.194-.143a.08.08 0 0 0-.048-.142H.422a16 16 0 0 1 1.232-3.425l.264-.19.48.344a.08.08 0 0 0 .121-.03.08.08 0 0 0 .002-.056l-.18-.563.48-.354a.08.08 0 0 0-.048-.142h-.584A16.1 16.1 0 0 1 6.655 3.01l.28.202a.08.08 0 0 0 .085.009l.006-.003.004-.003a.08.08 0 0 0 .03-.09L6.953 2.8A15.93 15.93 0 0 1 16 0z' />
        <path fill='#fff' d='m13.133.256.24-.041.142.422h.59a.08.08 0 0 1 .049.142l-.48.354.18.563a.079.079 0 0 1-.123.086l-.48-.344-.48.344a.08.08 0 0 1-.123-.086l.197-.56-.48-.354a.08.08 0 0 1 .048-.142h.59zM6.53 4.422l.19.564h.59a.08.08 0 0 1 .048.142l-.48.354.181.563a.078.078 0 0 1-.123.086l-.48-.344-.48.344a.08.08 0 0 1-.123-.086l.18-.563-.48-.354a.08.08 0 0 1 .049-.142h.59l.19-.564c.02-.065.125-.065.148 0m4.716.564-.19-.564c-.013-.065-.118-.065-.147 0l-.19.564h-.591a.08.08 0 0 0-.048.142l.48.354.181.563a.078.078 0 0 0 .124-.086l-.181-.563.48-.354a.08.08 0 0 0-.048-.142zM8.787 2.992l.19.563h.591a.1.1 0 0 1 .04.012.08.08 0 0 1 .008.13l-.48.354.18.563a.078.078 0 0 1-.123.087l-.48-.344-.48.344a.08.08 0 0 1-.124-.078l.001-.009.181-.563-.48-.353a.08.08 0 0 1 .048-.143h.59l.19-.563c.03-.066.135-.066.148 0m4.728.563-.19-.563c-.013-.066-.119-.066-.147 0l-.19.563h-.591a.08.08 0 0 0-.048.143l.48.353.181.563-.003.026.004.02a.1.1 0 0 0 .03.04.08.08 0 0 0 .092 0l.48-.343.48.344a.078.078 0 0 0 .123-.087l-.18-.563-.48-.353a.08.08 0 0 0-.048-.143z' />
        <path fill='#283991' d='m4.783 4.59-.078.078-.035.035a.078.078 0 0 0 .12-.089zM1.654 8.908q.25-.506.535-.991h.584a.08.08 0 0 1 .048.142l-.48.354.18.563a.078.078 0 0 1-.123.086l-.48-.344zM.195 13.494a.078.078 0 0 0 .057-.102l-.026-.085z' />
        <path fill='#fff' d='m13.133.256.24-.041.142.422h.59a.08.08 0 0 1 .049.142l-.48.354.18.563a.079.079 0 0 1-.123.086l-.48-.344-.48.344a.08.08 0 0 1-.123-.086l.197-.56-.48-.354a.08.08 0 0 1 .048-.142h.59z' />
    </svg>
);

/* Circular Kenya flag for the KSH display currency (approximation of the
   reference's KSH-state flag — only the USD state was captured). */
const FlagKSH = () => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='24' height='24' role='img' aria-hidden='true'>
        <clipPath id='ke-flag-clip'>
            <circle cx='16' cy='16' r='16' />
        </clipPath>
        <g clipPath='url(#ke-flag-clip)'>
            <rect width='32' height='10.67' fill='#000000' />
            <rect y='10.67' width='32' height='1.2' fill='#ffffff' />
            <rect y='11.87' width='32' height='8.26' fill='#BB0000' />
            <rect y='20.13' width='32' height='1.2' fill='#ffffff' />
            <rect y='21.33' width='32' height='10.67' fill='#006600' />
            <ellipse cx='16' cy='16' rx='2.6' ry='6.4' fill='#ffffff' stroke='#BB0000' strokeWidth='1' />
            <ellipse cx='16' cy='16' rx='1.1' ry='4.6' fill='#BB0000' />
        </g>
    </svg>
);

/** Split "1,295.00 KSH" into number + code spans (reference balance markup). */
const splitAmount = (formatted: string): [string, string] => {
    const idx = formatted.lastIndexOf(' ');
    return idx === -1 ? [formatted, ''] : [formatted.slice(0, idx), formatted.slice(idx + 1)];
};

const AccountSwitcher = observer(({ activeAccount }: TAccountSwitcher) => {
    const [isOpen, setIsOpen] = useState(false);
    const [tab, setTab] = useState<'real' | 'demo'>(() => (activeAccount && isDemoAccount(activeAccount.loginid) ? 'demo' : 'real'));
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { accountList, activeLoginid } = useApiBase();
    const { client, run_panel } = useStore() ?? {};
    const { displayCurrency, set: setDisplayCurrencyPref } = useCurrencyConversion();
    const onLogout = useLogout();

    const is_bot_running = run_panel?.is_running || api_base.is_running;

    // The dropdown also carries the Trader's Hub link and Logout, so it stays
    // reachable with a single account too — it only closes while the bot runs.
    const showChevron = !is_bot_running;

    useEffect(() => {
        if (activeAccount) setTab(isDemoAccount(activeAccount.loginid) ? 'demo' : 'real');
    }, [activeAccount, activeAccount?.loginid]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const toggleDropdown = useCallback(() => {
        if (is_bot_running) return;
        setIsOpen(prev => !prev);
    }, [is_bot_running]);

    const handleAccountSelect = useCallback(
        (loginid: string) => {
            localStorage.setItem('active_loginid', loginid);
            client?.checkAndRegenerateWebSocket();
            setIsOpen(false);
        },
        [client]
    );

    const formattedAccounts = useMemo(() => {
        if (!accountList) return [];
        return accountList
            .map(account => ({
                loginid: account.loginid,
                currency: account.currency,
                balance: addComma(Number(account.balance ?? 0).toFixed(getDecimalPlaces(account.currency))),
                isVirtual: isDemoAccount(account.loginid),
                isActive: account.loginid === activeLoginid,
            }))
            .sort((a, b) => (a.isActive ? -1 : b.isActive ? 1 : 0));
    }, [accountList, activeLoginid]);

    const visibleAccounts = formattedAccounts.filter(a => (tab === 'demo' ? a.isVirtual : !a.isVirtual));

    if (!activeAccount) return null;

    const { currency, balance } = activeAccount;
    const converted = currency ? getConvertedBalance(Number(balance ?? 0), currency, displayCurrency) : null;
    const [amountPart, codePart] = converted ? splitAmount(converted.formatted) : ['', ''];

    return (
        <div className='acc-info__wrapper' ref={wrapperRef}>
            <label className='currency-switch-select-wrapper'>
                <select
                    className='currency-switch-select'
                    data-testid='dt_currency_select'
                    aria-label='Display currency'
                    value={displayCurrency}
                    onClick={e => e.stopPropagation()}
                    onChange={e => setDisplayCurrencyPref(e.target.value as DisplayCurrency)}
                >
                    <option value='USD'>USD</option>
                    <option value='KSH'>KSH</option>
                </select>
            </label>
            <AccountInfoWrapper>
                <div
                    data-testid='dt_acc_info'
                    id='dt_core_account-info_acc-info'
                    role={showChevron ? 'button' : undefined}
                    tabIndex={showChevron ? 0 : -1}
                    aria-expanded={showChevron ? isOpen : undefined}
                    aria-haspopup={showChevron ? 'listbox' : undefined}
                    className={classNames('acc-info', {
                        'acc-info--interactive': showChevron,
                    })}
                    onClick={toggleDropdown}
                    onKeyDown={e => {
                        if (showChevron && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            toggleDropdown();
                        }
                    }}
                >
                    <span className='acc-info__currency-icon' aria-hidden='true'>
                        {displayCurrency === 'KSH' ? <FlagKSH /> : <FlagUSD />}
                    </span>
                    <div className='acc-info__content'>
                        {(typeof balance !== 'undefined' || !currency) && (
                            <div className='acc-info__balance-section'>
                                <p data-testid='dt_balance' className={classNames('acc-info__balance', { 'acc-info__balance--no-currency': !currency && !activeAccount.isVirtual })}>
                                    {!currency || !converted ? (
                                        <Localize i18n_default_text='No currency assigned' />
                                    ) : (
                                        <>
                                            <span className='acc-info__balance-amount'>{amountPart}</span>{' '}
                                            <span className='acc-info__balance-code'>{codePart}</span>
                                        </>
                                    )}
                                </p>
                            </div>
                        )}
                    </div>
                    {showChevron && (
                        <span className={classNames('acc-info__select-arrow', { 'acc-info__select-arrow--invert': isOpen })}>
                            <svg width='12' height='12' viewBox='0 0 12 12' fill='none'>
                                <path d='M2 4L6 8L10 4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
                            </svg>
                        </span>
                    )}
                </div>
            </AccountInfoWrapper>
            {isOpen && (
                <div className='acc-dropdown' role='listbox' aria-label='Accounts'>
                    <div className='acc-dropdown__tabs' role='presentation'>
                        <button
                            type='button'
                            role='tab'
                            aria-selected={tab === 'real'}
                            className={classNames('acc-dropdown__tab', { 'acc-dropdown__tab--active': tab === 'real' })}
                            onClick={() => setTab('real')}
                        >
                            <Localize i18n_default_text='Real' />
                        </button>
                        <button
                            type='button'
                            role='tab'
                            aria-selected={tab === 'demo'}
                            className={classNames('acc-dropdown__tab', { 'acc-dropdown__tab--active': tab === 'demo' })}
                            onClick={() => setTab('demo')}
                        >
                            <Localize i18n_default_text='Demo' />
                        </button>
                    </div>
                    <p className='acc-dropdown__heading'>
                        {tab === 'real' ? (
                            <Localize i18n_default_text='Deriv accounts' />
                        ) : (
                            <Localize i18n_default_text='Deriv account' />
                        )}
                    </p>
                    {visibleAccounts.map(account => (
                        <div
                            key={account.loginid}
                            role='option'
                            aria-selected={account.isActive}
                            tabIndex={0}
                            className={classNames('acc-dropdown__account', {
                                'acc-dropdown__account--selected': account.isActive,
                                'acc-dropdown__account--virtual': account.isVirtual,
                            })}
                            onClick={() => !account.isActive && handleAccountSelect(account.loginid)}
                            onKeyDown={e => {
                                if (!account.isActive && (e.key === 'Enter' || e.key === ' ')) {
                                    e.preventDefault();
                                    handleAccountSelect(account.loginid);
                                }
                            }}
                        >
                            <span className='acc-dropdown__account-code'>
                                {account.isVirtual ? (
                                    <Localize i18n_default_text='Demo' />
                                ) : (
                                    account.currency || ''
                                )}
                            </span>
                            <span className='acc-dropdown__account-id'>{account.loginid}</span>
                            <Text size='xs' weight='bold' className='acc-dropdown__balance'>
                                {account.currency ? (
                                    `${account.balance} ${getCurrencyDisplayCode(account.currency)}`
                                ) : (
                                    <Localize i18n_default_text='No currency assigned' />
                                )}
                            </Text>
                        </div>
                    ))}
                    <a
                        className='acc-dropdown__hub-link'
                        href='https://app.deriv.com/'
                        target='_blank'
                        rel='noreferrer'
                        onClick={() => setIsOpen(false)}
                    >
                        <Localize i18n_default_text="Looking for CFD accounts? Go to Trader's Hub" />
                    </a>
                    <button
                        type='button'
                        className='acc-dropdown__logout'
                        onClick={() => {
                            setIsOpen(false);
                            onLogout();
                        }}
                    >
                        <Localize i18n_default_text='Logout' />
                    </button>
                </div>
            )}
        </div>
    );
});

export default AccountSwitcher;
