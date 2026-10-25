declare global {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let google: any;
    interface Window {
        sendRequestsStatistic: (is_running: boolean) => void;
        __webpack_public_path__?: string;
        /** Set by index.html's boot script; hides the splash overlay. */
        __hideBootSplash?: () => void;
        // ---- Runtime error policy (see index.html + main.tsx) ----
        /** True once React has painted: from then on runtime errors are non-fatal. */
        __appMounted?: boolean;
        /** Full-page failure screen. Only used before the app has mounted. */
        __showFatalError?: (message: string) => void;
        /** True after the fatal screen has been rendered. */
        __fatalErrorShown?: boolean;
        /** Dismissible corner toast for recoverable runtime problems. */
        __showNonFatalNotice?: (message: string) => void;
        /** Central policy: fatal only pre-mount, otherwise non-fatal notice. */
        __reportError?: (err: unknown, label: string) => void;
        /** Recognises errors thrown by browser wallet/extension code. */
        __isExtensionError?: (err: unknown) => boolean;
    }
}

export {};
