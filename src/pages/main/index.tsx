import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import AISignalScannerPage from '@/pages/ai-signal-scanner';
import BulkTraderPage from '@/pages/bulk-trader';
import CopyTradingPage from '@/pages/copy-trading';
import AnalysisToolPage from '@/pages/analysis-tool';
import VoltAIPage from '@/pages/volt-ai';
import PremiumAIPage from '@/pages/premium-ai';
import QuickBotPage from '@/pages/quick-bot';
import AutoAIPage from '@/pages/auto-ai';
import ApexBotPage from '@/pages/apex-bot';
import SpeedbotPage from '@/pages/speedbot';
import AutomatedPage from '@/pages/automated';
import HedgingToolPage from '@/pages/hedging-tool';
import ManualTraderPage from '@/pages/manual-trader';
import VersionBanner from '@/components/version-banner';
import { type HubViewId } from '@/components/hub-sidebar';
import HubTabNav from '@/components/hub-tab-nav';
import DbotRuntime from '@/components/dbot-runtime';
import AiScanner from '@/components/ai-scanner';
import RiskPill from '@/components/risk-pill';
import { subscribeHubNavigation } from '@/services/hub-navigation';
import DashboardLaunchpad from '@/components/dashboard-launchpad';
import BotsCatalog from '@/pages/bots-catalog';
import BotMonitor from '@/pages/bot-monitor';
import Landing, { hasSeenLanding, markLandingSeen } from '@/pages/landing';
import { DBOT_TABS } from '@/constants/bot-contents';
import './main.scss';

const ChartPage = lazy(() => import('@/pages/chart/chart-wrapper'));
const TradingBotsPage = lazy(() => import('@/pages/trading-bots'));

/**
 * Legacy view ids (kept alive for voice phrases / deep links) resolve to the
 * nearest reference tab so nothing lands on an unmounted screen.
 */
const LEGACY_VIEW_REDIRECT: Partial<Record<HubViewId, HubViewId>> = {
    'ai-hub': 'dashboard',
    'ou-bot': 'automated',
    'ai-scanner': 'signal-ai',
    'pro-ai': 'premium-ai',
    'dual-edge': 'auto-ai',
    'algo-pro-ai': 'volt-ai',
    backtest: 'analysis-tools',
    tradingview: 'chart',
    'trading-bots': 'free-bots',
    'analysis-tool': 'analysis-tools',
    'copy-trading': 'copy-trader',
};

const resolveView = (view: HubViewId): HubViewId => LEGACY_VIEW_REDIRECT[view] ?? view;

/**
 * The front page is an overlay over the hub, so it can be reopened deliberately
 * with `?landing=1` or `#landing` — the only way back to a page that otherwise
 * shows once per device.
 */
const wantsLanding = (): boolean => {
    try {
        if (window.location.hash.replace('#', '').toLowerCase() === 'landing') return true;
        return new URLSearchParams(window.location.search).get('landing') === '1';
    } catch {
        return false;
    }
};

const Main = observer(() => {
    const { ui, dashboard } = useStore() ?? {};
    const [requestedView, setRequestedView] = useState<HubViewId>('dashboard');
    const activeView = resolveView(requestedView);
    // Coming back from Deriv's OAuth screen means the visitor already chose to
    // enter, so the callback is never covered by the front page again.
    const isOauthReturn = (): boolean => {
        try {
            const params = new URLSearchParams(window.location.search);
            return params.has('code') && params.has('state');
        } catch {
            return false;
        }
    };

    const [showLanding, setShowLanding] = useState(
        () => !isOauthReturn() && (wantsLanding() || !hasSeenLanding())
    );

    useEffect(() => {
        ui?.setActiveHubView?.(activeView === 'dashboard' ? 'dashboard' : 'ai-hub');
        // The fixed-height shell (`.layout` 100vh, `.bot-dashboard` height:100%,
        // `.main-content` scroll container) must apply on every hub view —
        // without it the dashboard's `.main-dashboard` collapses to content
        // height and leaves the page background showing below the hero.
        document.body.classList.add('hub-view');
        return () => document.body.classList.remove('hub-view');
    }, [activeView, ui]);

    // Keep DBot's internal tab in sync with the hub view: Bot Builder activates
    // the workspace (the layout-mounted instance, z-index gated), Chart shows the
    // chart tab, and every other view falls back to the dashboard tab so the
    // workspace stays behind the hub page. The run drawer follows the view in
    // RunPanel (dashboard/signal-ai hide it, matching the reference), and the
    // builder tour only considers the Bot Builder view (its start dialog arms
    // on a 100ms timer, so the guard re-runs whenever the visibility flips).
    useEffect(() => {
        if (!dashboard) return;
        ui?.setActiveView?.(activeView);
        const tab =
            activeView === 'bot-builder'
                ? DBOT_TABS.BOT_BUILDER
                : activeView === 'chart'
                  ? DBOT_TABS.CHART
                  : DBOT_TABS.DASHBOARD;
        if (dashboard.active_tab !== tab) dashboard.setActiveTab(tab);
        if (activeView !== 'bot-builder' && dashboard.is_tour_dialog_visible) {
            dashboard.setTourDialogVisibility(false);
        }
    }, [activeView, dashboard, dashboard?.is_tour_dialog_visible, ui]);

    useEffect(() => subscribeHubNavigation(setRequestedView), []);

    // When a bot is loaded from Bots Catalog (or anywhere that dispatches
    // mwx:go-bot-builder), switch to the Bot Builder view so the Run button
    // becomes visible and the loaded strategy can be executed.
    useEffect(() => {
        const onGoBotBuilder = () => setRequestedView('bot-builder');
        const onGoBotMonitor = () => setRequestedView('bot-monitor');
        document.addEventListener('mwx:go-bot-builder', onGoBotBuilder);
        document.addEventListener('mwx:go-bot-monitor', onGoBotMonitor);
        return () => {
            document.removeEventListener('mwx:go-bot-builder', onGoBotBuilder);
            document.removeEventListener('mwx:go-bot-monitor', onGoBotMonitor);
        };
    }, []);

    const enterAnim = (view: HubViewId): { animation?: string } =>
        activeView === view
            ? { animation: 'hubEnter 0.45s cubic-bezier(0.22, 1, 0.36, 1) both' }
            : {};

    const mount = (view: HubViewId, node: ReactNode, id?: string) => (
        <div
            key={id || view}
            className='main-hub'
            style={{ display: activeView === view ? 'block' : 'none', ...enterAnim(view) }}
            aria-hidden={activeView !== view}
        >
            {node}
        </div>
    );

    // First-visit landing overlay. Dismisses into the hub, remembers the choice
    // on this device, and honours a requested view (catalog, builder, chart…)
    // so the front page can hand off to the screen its button promised.
    const handleEnter = (view?: HubViewId) => {
        markLandingSeen();
        if (view) setRequestedView(view);
        setShowLanding(false);
    };

    return (
        <>
            {showLanding && <Landing onEnter={handleEnter} />}
            {!showLanding && (
                <div className='main-dashboard'>
                    <VersionBanner />
                    <div className='main-shell'>
                        <HubTabNav activeView={activeView} onSelect={setRequestedView} />
                        <main className='main-content'>
                            <div
                                className='main-hub main-hub--dashboard'
                                style={{ display: activeView === 'dashboard' ? 'block' : 'none' }}
                                aria-hidden={activeView !== 'dashboard'}
                            >
                                <DashboardLaunchpad />
                            </div>
                            {mount('volt-ai', <VoltAIPage />)}
                            {mount(
                                'free-bots',
                                <Suspense fallback={<div className='main-hub__fallback'>Loading bots…</div>}>
                                    <TradingBotsPage />
                                </Suspense>
                            )}
                            {mount('premium-ai', <PremiumAIPage />)}
                            {mount('quick-bot', <QuickBotPage />)}
                            {mount('analysis-tools', <AnalysisToolPage />)}
                            {mount('hedging-tool', <HedgingToolPage />)}
                            {mount('auto-ai', <AutoAIPage />)}
                            {mount('signal-ai', <AISignalScannerPage />)}
                            {mount('manual-trader', <ManualTraderPage />)}
                            {mount('bulk-trader', <BulkTraderPage />)}
                            {mount('apex-bot', <ApexBotPage />)}
                            {mount('copy-trader', <CopyTradingPage />)}
                            {mount('speedbot', <SpeedbotPage />)}
                            {mount('automated', <AutomatedPage />)}
                            {mount('bots-catalog', <BotsCatalog />)}
                            {mount('bot-monitor', <BotMonitor />)}
                            {mount(
                                'chart',
                                <Suspense fallback={<div className='main-hub__fallback'>Loading chart…</div>}>
                                    <ChartPage show_digits_stats={false} />
                                </Suspense>
                            )}
                        </main>
                    </div>
                    <AiScanner />
                    <RiskPill />
                    <DbotRuntime />
                </div>
            )}
        </>
    );
});

export default Main;
