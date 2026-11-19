import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import Dialog from '@/components/shared_ui/dialog';
import { localize } from '@deriv-com/translations';
import './app-dialog.scss';

type DialogVariant = 'confirm' | 'alert' | 'prompt';

type DialogOptions = {
    title?: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: DialogVariant;
    danger?: boolean;
    defaultValue?: string;
    placeholder?: string;
    inputType?: 'text' | 'number';
};

type DialogState = DialogOptions & {
    isVisible: boolean;
    variant: DialogVariant;
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
    title: '',
    confirmText: '',
    cancelText: '',
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
            setState({
                ...defaultState,
                ...opts,
                variant,
                isVisible: true,
                title:
                    opts.title ??
                    (variant === 'alert'
                        ? localize('Notice')
                        : variant === 'prompt'
                          ? localize('Input required')
                          : localize('Please confirm')),
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

    return (
        <AppDialogContext.Provider value={{ confirm, alert: alertFn, prompt: promptFn }}>
            {children}
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
                className={`app-dialog${state.danger ? ' app-dialog--danger' : ''}`}
                portal_element_id='modal_root'
                login={() => {}}
            >
                <div className='app-dialog__body'>
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
            </Dialog>
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
