import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { navigateToHubView } from '@/services/hub-navigation';
import type { HubViewId } from '@/components/hub-sidebar';
import './dashboard-launchpad.scss';

/** Reference dashboard rotation: 10 greeting strings (first carries the
 *  account loginid) and 6 rotating quotes, typed out character by character. */
const FIXED_HEADINGS = [
    'Welcome to TradingHub.site',
    'Your ultimate trading tool',
    'Center for automations',
    'Your strategies. Your control.',
    'Build. Automate. Explore.',
    'One workspace. More possibilities.',
    'Turn your ideas into strategies',
    'Find your trading rhythm',
    'Tools for your next move',
];

const QUOTES = [
    'Plan your trade, then trade your plan.',
    'The market rewards patience and punishes impatience.',
    'Consistency starts with discipline, not prediction.',
    'A missed opportunity is still a lesson learned.',
    'Risk well. Recover smart. Repeat.',
    'Protection of capital comes before profit.',
];

const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
};

interface LaunchCard {
    number: string;
    title: string;
    subtitle: string;
    cta: string;
    view: HubViewId;
    tone: 'teal' | 'gold' | 'cyan' | 'violet';
    icon: React.ReactNode;
}

const ICONS: Record<LaunchCard['tone'], React.ReactNode> = {
    teal: (
        <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
            <path d='M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z' />
            <path d='M14 3v5h5M10 13l2 2 4-4' />
        </svg>
    ),
    gold: (
        <svg width='20' height='20' viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
            <path d='M6 3h12l4 6-10 12L2 9l4-6zm0 0l2.5 6L12 21 15.5 9 18 3M2 9h20' />
        </svg>
    ),
    cyan: (
        <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
            <path d='M12 21a9 9 0 100-18 9 9 0 000 18z' />
            <path d='M12 12l4-4' />
        </svg>
    ),
    violet: (
        <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' aria-hidden='true'>
            <path d='M4 8h10M18 8h2M4 16h4M12 16h8' />
            <circle cx='16' cy='8' r='2' />
            <circle cx='10' cy='16' r='2' />
        </svg>
    ),
};

const CARDS: LaunchCard[] = [
    {
        number: '01',
        title: 'Load Bot',
        subtitle: 'Open your trading strategy',
        cta: 'Choose a bot',
        view: 'free-bots',
        tone: 'teal',
        icon: ICONS.teal,
    },
    {
        number: '02',
        title: 'Premium Bots',
        subtitle: 'Exclusive automated strategies',
        cta: 'Explore premium bots',
        view: 'premium-ai',
        tone: 'gold',
        icon: ICONS.gold,
    },
    {
        number: '03',
        title: 'Speed Bot',
        subtitle: 'One-click automated trading',
        cta: 'Launch Speed Bot',
        view: 'speedbot',
        tone: 'cyan',
        icon: ICONS.cyan,
    },
    {
        number: '04',
        title: 'Manual Trading',
        subtitle: 'Full control, trade your way',
        cta: 'Start manual trading',
        view: 'manual-trader',
        tone: 'violet',
        icon: ICONS.violet,
    },
];

/** Reference workspace dashboard hero: kicker, typewriter greeting with the
 *  account loginid, a typewriter quote, and the four numbered launcher cards. */
const DashboardLaunchpad = observer(() => {
    const { client } = useStore() ?? {};
    const loginid = client?.loginid || 'TRADER';

    const [hi, setHi] = useState(0);
    const [qi, setQi] = useState(0);
    const [typed, setTyped] = useState(0);
    const [quoteTyped, setQuoteTyped] = useState(0);

    const headlines = [`${greeting()}, ${loginid} \u{1F44B}`, ...FIXED_HEADINGS];
    const headline = headlines[hi % headlines.length];
    const quote = QUOTES[qi % QUOTES.length];

    useEffect(() => {
        const t = setInterval(() => setHi(v => v + 1), 2600);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        const t = setInterval(() => setQi(v => v + 1), 3800);
        return () => clearInterval(t);
    }, []);

    useEffect(() => setTyped(0), [headline]);
    useEffect(() => setQuoteTyped(0), [quote]);

    useEffect(() => {
        if (typed >= headline.length) return;
        const t = setTimeout(() => setTyped(n => n + 1), 42);
        return () => clearTimeout(t);
    }, [typed, headline.length]);

    useEffect(() => {
        if (quoteTyped >= quote.length) return;
        const t = setTimeout(() => setQuoteTyped(n => n + 1), 26);
        return () => clearTimeout(t);
    }, [quoteTyped, quote.length]);

    return (
        <section className='launchpad' aria-label='Dashboard shortcuts'>
            <div className='launchpad__hero'>
                <div className='launchpad__sweep' aria-hidden='true' />
                <p className='launchpad__kicker'>
                    <span className='launchpad__kicker-dot' aria-hidden='true' />
                    TradingHub.site <span aria-hidden='true'>/</span> Your trading workspace
                </p>
                <h1 className='launchpad__greeting' aria-live='polite'>
                    {headline.slice(0, typed)}
                    <span className='launchpad__caret' aria-hidden='true' />
                </h1>
                <div className='launchpad__divider' aria-hidden='true'>
                    <span />
                </div>
                <p className='launchpad__quote' aria-live='polite'>
                    &quot;{quote.slice(0, quoteTyped)}
                    <span className='launchpad__caret launchpad__caret--quote' aria-hidden='true' />
                </p>

                <div className='launchpad__cards'>
                    {CARDS.map(card => (
                        <button
                            key={card.number}
                            type='button'
                            className={`launchpad__card launchpad__card--${card.tone}`}
                            onClick={() => navigateToHubView(card.view)}
                        >
                            <span className='launchpad__card-top'>
                                <span className='launchpad__card-num'>{card.number}</span>
                                <span className='launchpad__card-icon' aria-hidden='true'>
                                    {card.icon}
                                </span>
                            </span>
                            <strong className='launchpad__card-title'>{card.title}</strong>
                            <small className='launchpad__card-subtitle'>{card.subtitle}</small>
                            <span className='launchpad__card-foot'>
                                <span className='launchpad__card-cta'>{card.cta}</span>
                                <span className='launchpad__card-arrow' aria-hidden='true'>
                                    <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
                                        <path d='M7 17L17 7M9 7h8v8' />
                                    </svg>
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
});

export default DashboardLaunchpad;
