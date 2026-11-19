import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Dialog from '@/components/shared_ui/dialog';
import { localize } from '@deriv-com/translations';
import './app-dialog.scss';

type DialogVariant = 'confirm' | 'alert' | 'prompt';
type DialogTone = 'success' | 'warning' | 'danger' | 'info';

type DialogOptions = {
    title?: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: DialogVariant;
    danger?: boolean;
    tone?: DialogTone;
    defaultValue?: string;
    placeholder?: string;
    inputType?: 'text' | 'number';
};

type DialogState = DialogOptions & {
    isVisible: boolean;
    variant: DialogVariant;
    tone: DialogTone;
};

type AppDialogContextValue = {
    confirm: (options: DialogOptions | string) => Promise<boolean>;
    alert: (options: DialogOptions | string) => Promise<void>;
    prompt: (options: DialogOptions | string) => Promise<string | null>;
};

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

const defaultState: DialogState = {
    isVisible: false,
    message: '',
    variant: 'confirm',
    tone: 'info',
    title: '',
    confirmText: '',
    cancelText: '',
};

const icons: Record<DialogTone, React.ReactNode> = {
    success: (
        <svg viewBox='0 0 24 24' aria-hidden='true' focusable='false'>
            <circle cx='12' cy='12' r='9' fill='none' stroke='currentColor' strokeWidth='1.8' opacity='0.35' />
            <path d='M7.5 12.5l3 3 6-7' fill='none' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round' />
        </svg>
    ),
    warning: (
        <svg viewBox='0 0 24 24' aria-hidden='true' focusable='false'>
            <path d='M10.4 4.4L2.8 17.5A2 2 0 004.5 20.5h15a2 2 0 001.7-3L13.6 4.4a2 2 0 00-3.2 0z' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinejoin='round' />
            <path d='M12 9v4.8' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' />
            <circle cx='12' cy='16.8' r='1.2' fill='currentColor' />
        </svg>
    ),
    danger: (
        <svg viewBox='0 0 24 24' aria-hidden='true' focusable='false'>
            <circle cx='12' cy='12' r='9' fill='none' stroke='currentColor' strokeWidth='1.8' />
            <path d='M12 7.8v5' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' />
            <circle cx='12' cy='16.4' r='1.2' fill='currentColor' />
        </svg>
    ),
    info: (
        <svg viewBox='0 0 24 24' aria-hidden='true' focusable='false'>
            <circle cx='12' cy='12' r='9' fill='none' stroke='currentColor' strokeWidth='1.8' />
            <path d='M12 10.5v5.5' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' />
            <circle cx='12' cy='7.6' r='1.2' fill='currentColor' />
        </svg>
    ),
};

const toSearchText = (opts: DialogOptions) =>
    `${opts.title ?? ''} ${typeof opts.message === 'string' ? opts.message : ''}`.toLowerCase();

const resolveTone = (opts: DialogOptions, variant: DialogVariant): DialogTone => {
    if (opts.tone) return opts.tone;
    if (opts.danger) return 'danger';
    const text = toSearchText(opts);
    if (
        /take\s*-?\s*profit|target\s*profit|profit\s*(reached|achieved|hit|target)|session\s*completed|congratulations|takeprofit\s*achieved|completed successfully|success|you'?ve won|win\b/.test(
            text
        )
    ) {
        return 'success';
    }
    if (
        /stop\s*-?\s*loss|loss\s*(hit|reached|limit)|max\s*(loss|drawdown|trades reached)|suspended|emergency|failed|error|invalid|cannot|rejected|timed out|unauthori[sz]ed/.test(
            text
        )
    ) {
        return 'warning';
    }
    if (variant === 'prompt') return 'info';
    return 'info';
};

const resolveTitle = (opts: DialogOptions, variant: DialogVariant, tone: DialogTone) => {
    if (opts.title) return opts.title;
    if (variant === 'prompt') return localize('Input required');
    if (tone === 'success') return localize('Success');
    if (tone === 'warning') return localize('Attention');
    if (variant === 'confirm') return localize('Please confirm');
    return localize('Notice');
};

export const AppDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<DialogState>(defaultState);
    const [inputValue, setInputValue] = useState('');
    const resolverRef = useRef<((value: boolean | string | null | void) => void) | null>(null);

    const close = useCallback((result: boolean | string | null | void) => {
        setState(prev => ({ ...prev, isVisible: false }));
        const resolve = resolverRef.current;
        resolverRef.current = null;
        if (resolve) resolve(result);
    }, []);

    const open = useCallback((options: DialogOptions | string, variant: DialogVariant) => {
        const opts: DialogOptions = typeof options === 'string' ? { message: options } : options;
        return new Promise<boolean | string | null | void>(resolve => {
            resolverRef.current = resolve as (value: boolean | string | null | void) => void;
            setInputValue(opts.defaultValue ?? '');
            const tone = resolveTone(opts, variant);
            setState({
                ...defaultState,
                ...opts,
                variant,
                tone,
                isVisible: true,
                title: resolveTitle(opts, variant, tone),
                confirmText: opts.confirmText ?? (variant === 'alert' ? localize('OK') : localize('Continue')),
                cancelText: opts.cancelText ?? localize('Cancel'),
            });
        });
    }, []);

    const confirm = useCallback(
        (options: DialogOptions | string) => open(options, 'confirm') as Promise<boolean>,
        [open]
    );
    const alertFn = useCallback(
        (options: DialogOptions | string) => open(options, 'alert') as Promise<void>,
        [open]
    );
    const promptFn = useCallback(
        (options: DialogOptions | string) => open(options, 'prompt') as Promise<string | null>,
        [open]
    );

    const handleConfirm = () => {
        if (state.variant === 'prompt') {
            close(inputValue);
            return;
        }
        if (state.variant === 'alert') {
            close(undefined);
            return;
        }
        close(true);
    };

    const handleCancel = () => {
        if (state.variant === 'prompt') {
            close(null);
            return;
        }
        if (state.variant === 'alert') {
            close(undefined);
            return;
        }
        close(false);
    };

    const isDangerAction = state.danger || state.tone === 'danger';

    return (
        <AppDialogContext.Provider value={{ confirm, alert: alertFn, prompt: promptFn }}>
            {children}
            {typeof document !== 'undefined'
                ? createPortal(
                      <Dialog
                          is_visible={state.isVisible}
                          title={state.title}
                          confirm_button_text={state.confirmText}
                          cancel_button_text={state.variant === 'alert' ? undefined : state.cancelText}
                          onConfirm={handleConfirm}
                          onCancel={handleCancel}
                          onClose={handleCancel}
                          has_close_icon
                          is_mobile_full_width={false}
                          className={`app-dialog app-dialog--tone-${state.tone}${isDangerAction ? ' app-dialog--danger' : ''}`}
                          login={() => {}}
                      >
                          <div className='app-dialog__layout'>
                              <div className={`app-dialog__icon-wrap app-dialog__icon-wrap--${state.tone}`} aria-hidden='true'>
                                  <span className='app-dialog__icon-ring' />
                                  <span className='app-dialog__icon'>{icons[state.tone]}</span>
                              </div>
                              <div className='app-dialog__copy'>
                                  <h3 className='app-dialog__title'>{state.title}</h3>
                                  {typeof state.message === 'string' ? (
                                      <p className='app-dialog__message'>{state.message}</p>
                                  ) : (
                                      <div className='app-dialog__message'>{state.message}</div>
                                  )}
                                  {state.variant === 'prompt' && (
                                      <input
                                          autoFocus
                                          className='app-dialog__input'
                                          type={state.inputType ?? 'text'}
                                          value={inputValue}
                                          placeholder={state.placeholder}
                                          onChange={e => setInputValue(e.target.value)}
                                          onKeyDown={e => {
                                              if (e.key === 'Enter') handleConfirm();
                                          }}
                                      />
                                  )}
                              </div>
                          </div>
                      </Dialog>,
                      document.body
                  )
                : null}
        </AppDialogContext.Provider>
    );
};

export const useAppDialog = (): AppDialogContextValue => {
    const ctx = useContext(AppDialogContext);
    if (!ctx) {
        throw new Error('useAppDialog must be used within AppDialogProvider');
    }
    return ctx;
};

export const getAppDialog = (): AppDialogContextValue | null => {
    return (window as any).__appDialog ?? null;
};

export const AppDialogBridge: React.FC = () => {
    const ctx = useContext(AppDialogContext);
    React.useEffect(() => {
        (window as any).__appDialog = ctx;
        return () => {
            if ((window as any).__appDialog === ctx) delete (window as any).__appDialog;
        };
    }, [ctx]);
    return null;
};
