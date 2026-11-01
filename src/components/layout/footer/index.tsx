// @ts-nocheck — vendored bot code with known upstream type gaps; see AGENTS.md
// Updated to use brand configuration for footer elements visibility
// Controls language settings and theme toggle via brand.config.json
import brandConfig from '@/brand.config.json';
import useModalManager from '@/hooks/useModalManager';
import { useStore } from '@/hooks/useStore';
import { getActiveTabUrl } from '@/utils/getActiveTabUrl';
// [AI]
import { OFFERED_LANGUAGES } from '@/utils/offered-languages';
// [/AI]
import { useTranslations } from '@deriv-com/translations';
import { DesktopLanguagesModal } from '@deriv-com/ui';
import { observer } from 'mobx-react-lite';
import TradeAnimation from '@/components/trade-animation';
import ChangeTheme from './ChangeTheme';
import FullScreen from './FullScreen';
import LanguageSettings from './LanguageSettings';
import NetworkStatus from './NetworkStatus';
import ServerTime from './ServerTime';
import './footer.scss';

type FooterCenter = 'run-fast' | 'run' | 'status' | 'none';

/**
 * Reference app-footer center per view: DBot-managed views show the Run
 * widget with the Execution FAST toggle, Quick Bot shows Run + stage text,
 * custom-bot views show the status container only, and the manual/bulk
 * terminals drop the footer entirely.
 */
const FOOTER_CENTER: Record<string, FooterCenter> = {
    'manual-trader': 'none',
    'bulk-trader': 'none',
    'volt-ai': 'status',
    'premium-ai': 'status',
    'hedging-tool': 'status',
    'auto-ai': 'status',
    'apex-bot': 'status',
    speedbot: 'status',
    automated: 'status',
    'quick-bot': 'run',
};

const centerFor = (view?: string): FooterCenter => FOOTER_CENTER[view ?? ''] ?? 'run-fast';

const Footer = observer(() => {
    const { currentLang = 'EN', localize, switchLanguage } = useTranslations();
    const { hideModal, isModalOpenFor, showModal } = useModalManager();
    const store = useStore();

    // Get footer configuration from brand.config.json
    const enableLanguageSettings = brandConfig.platform.footer?.enable_language_settings ?? true;
    const enableThemeToggle = brandConfig.platform.footer?.enable_theme_toggle ?? true;

    const center = centerFor(store?.ui?.active_view);

    const openLanguageSettingModal = () => showModal('DesktopLanguagesModal');

    if (center === 'none') return null;

    return (
        <footer className='app-footer'>
            {store && (
                <div className='app-footer__center'>
                    <div className='toolbar__section' data-testid='dt_run_strategy'>
                        <TradeAnimation
                            className='toolbar__animation'
                            disable_tooltip
                            hide_run_control={center === 'status'}
                            show_execution_toggle={center === 'run-fast'}
                        />
                    </div>
                </div>
            )}
            <FullScreen />
            {/* [AI] Conditionally render language settings based on brand config */}
            {enableLanguageSettings && (
                <>
                    <LanguageSettings openLanguageSettingModal={openLanguageSettingModal} />
                    <div className='app-footer__vertical-line' />
                </>
            )}
            {/* [/AI] */}
            {/* [AI] Conditionally render theme toggle based on brand config */}
            {enableThemeToggle && (
                <>
                    <ChangeTheme />
                    <div className='app-footer__vertical-line' />
                </>
            )}
            {/* [/AI] */}
            <ServerTime />
            <div className='app-footer__vertical-line' />
            <NetworkStatus />
            <div className='app-footer__copyright' data-testid='dt_copyright'>
                <span className='deriv-text'>
                    {/* [AI] Reference footer copyright */}
                    {`(c) ${new Date().getFullYear()} ${brandConfig.platform.name ?? 'TradingHubs.site'}`}
                </span>
            </div>

            {/* [AI] Only show language modal if language settings are enabled */}
            {enableLanguageSettings && isModalOpenFor('DesktopLanguagesModal') && (
                <DesktopLanguagesModal
                    headerTitle={localize('Select Language')}
                    isModalOpen
                    /* [AI] */
                    languages={OFFERED_LANGUAGES}
                    /* [/AI] */
                    onClose={hideModal}
                    onLanguageSwitch={code => {
                        try {
                            switchLanguage(code);
                            hideModal();
                            // Page reload is necessary because Blockly is outside React lifecycle
                            // and won't re-render with new language without full page refresh
                            // Use replace() to navigate to the active tab URL which will reload the page
                            window.location.replace(getActiveTabUrl());
                        } catch (error) {
                            console.error('Failed to switch language:', error);
                            hideModal();
                        }
                    }}
                    selectedLanguage={currentLang}
                />
            )}
            {/* [/AI] */}
        </footer>
    );
});

export default Footer;
