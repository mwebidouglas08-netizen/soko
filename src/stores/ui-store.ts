import { action, makeObservable, observable } from 'mobx';
import { isTouchDevice } from '@/components/shared/utils/screen/responsive';

/**
 * The initial dark-mode state. An explicit stored `theme` (set once the user
 * toggles) always wins; with no stored choice the app defaults to the light
 * theme — matching the reference app's `theme--light` body state — rather than
 * chasing the OS preference.
 */
function getInitialDarkMode(): boolean {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
    return false;
}

/** Footer Execution FAST switch — persisted; fast is the reference default. */
function getInitialExecutionFast(): boolean {
    return localStorage.getItem('execution_fast') !== 'normal';
}

/**
 * Reference "Arrange navigation tabs" prefs: drag-reorder, rename and hide
 * entries for the hub tab strip. Persisted so the arrangement survives reloads.
 */
export type HubTabPrefs = {
    order?: string[];
    hidden?: string[];
    labels?: Record<string, string>;
};
function getInitialTabPrefs(): HubTabPrefs {
    try {
        return JSON.parse(localStorage.getItem('hub_tab_prefs') || '{}') as HubTabPrefs;
    } catch {
        return {};
    }
}

export default class UiStore {
    is_mobile = true;
    is_desktop = true;
    is_tablet = false;
    is_chart_layout_default = true;
    is_dark_mode_on = getInitialDarkMode();
    /**
     * Which top-level view the shell is showing. The AI Hub and the dashboard
     * stay mounted at the same time (the hub hides the dashboard so the bot
     * engine keeps running), so dashboard-only chrome — the onboarding tour in
     * particular — needs this to know when to stay out of the way.
     */
    active_hub_view: 'ai-hub' | 'dashboard' = 'ai-hub';
    /** Which hub view the shell is showing (bot-builder, volt-ai, ...). */
    active_view = 'dashboard';
    execution_fast = getInitialExecutionFast();
    hub_tab_prefs: HubTabPrefs = getInitialTabPrefs();
    is_tab_organizer_open = false;
    account_switcher_disabled_message = '';
    current_focus = null;
    show_prompt = false;
    is_trading_assessment_for_new_user_enabled = false;
    is_accounts_switcher_on = false;

    // TODO: fix - need to implement this feature
    is_onscreen_keyboard_active = false;

    constructor() {
        makeObservable(this, {
            account_switcher_disabled_message: observable,
            active_hub_view: observable,
            active_view: observable,
            current_focus: observable,
            execution_fast: observable,
            hub_tab_prefs: observable,
            is_tab_organizer_open: observable,
            setHubTabPrefs: action.bound,
            setTabOrganizerOpen: action.bound,
            is_accounts_switcher_on: observable,
            is_dark_mode_on: observable,
            is_desktop: observable,
            is_mobile: observable,
            is_tablet: observable,
            is_trading_assessment_for_new_user_enabled: observable,
            show_prompt: observable,
            setAccountSwitcherDisabledMessage: action.bound,
            setActiveHubView: action.bound,
            setActiveView: action.bound,
            setExecutionFast: action.bound,
            setCurrentFocus: action.bound,
            setDarkMode: action.bound,
            setDevice: action.bound,
            setPromptHandler: action.bound,
            setIsTradingAssessmentForNewUserEnabled: action.bound,
            toggleAccountsDialog: action.bound,
            toggleOnScreenKeyboard: action.bound,
        });
    }

    setPromptHandler = (should_show: boolean) => {
        this.show_prompt = should_show;
    };

    setAccountSwitcherDisabledMessage = (message: string) => {
        if (message) {
            this.account_switcher_disabled_message = message;
        } else {
            this.account_switcher_disabled_message = '';
        }
    };
    setIsTradingAssessmentForNewUserEnabled(value: boolean) {
        this.is_trading_assessment_for_new_user_enabled = value;
    }

    setDarkMode = (value: boolean) => {
        this.is_dark_mode_on = value;
    };

    setActiveHubView = (view: 'ai-hub' | 'dashboard') => {
        this.active_hub_view = view;
    };

    setActiveView = (view: string) => {
        this.active_view = view;
    };

    setExecutionFast = (value: boolean) => {
        this.execution_fast = value;
        localStorage.setItem('execution_fast', value ? 'fast' : 'normal');
    };

    setHubTabPrefs = (prefs: HubTabPrefs) => {
        this.hub_tab_prefs = prefs;
        try {
            localStorage.setItem('hub_tab_prefs', JSON.stringify(prefs));
        } catch {
            /* ignore quota/blocked storage */
        }
    };

    setTabOrganizerOpen = (open: boolean) => {
        this.is_tab_organizer_open = open;
    };

    setDevice = (value: 'mobile' | 'desktop' | 'tablet') => {
        this.is_mobile = value === 'mobile';
        this.is_desktop = value === 'desktop';
        this.is_tablet = value === 'tablet';
    };

    toggleAccountsDialog(status = !this.is_accounts_switcher_on) {
        this.is_accounts_switcher_on = status;
    }

    toggleOnScreenKeyboard() {
        this.is_onscreen_keyboard_active = this.current_focus !== null && this.is_mobile && isTouchDevice();
    }

    setCurrentFocus(value) {
        this.current_focus = value;
        this.toggleOnScreenKeyboard();
    }
}
