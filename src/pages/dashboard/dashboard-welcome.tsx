import React, { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { DBOT_TABS } from '@/constants/bot-contents';
import { useStore } from '@/hooks/useStore';
import './dashboard-welcome.scss';

/* ------------------------------- typewriter ------------------------------- */
const HEADINGS = [
    'Good morning, Trader 👋',
    'Welcome to Traderscheme',
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

const useRotator = (items: string[], holdMs: number) => {
    const [i, setI] = useState(0);
    const [leaving, setLeaving] = useState(false);
    useEffect(() => {
        const t = setInterval(() => {
            setLeaving(true);
            setTimeout(() => {
                setI(v => (v + 1) % items.length);
                setLeaving(false);
            }, 550);
        }, holdMs);
        return () => clearInterval(t);
    }, [items.length, holdMs]);
    return { text: items[i], leaving };
};

const Typewriter = ({ items, holdMs, className }: { items: string[]; holdMs: number; className?: string }) => {
    const { text, leaving } = useRotator(items, holdMs);
    return (
        <span className={`dashboard-typewriter ${className ?? ''}`}>
            <span className='dashboard-typewriter__measure' aria-hidden='true'>
                {items.map(m => (
                    <span key={m}>{m}</span>
                ))}
            </span>
            <span className={`dashboard-typewriter__text ${leaving ? 'dashboard-typewriter__text--leaving' : ''}`}>{text}</span>
        </span>
    );
};

/* --------------------------------- icons --------------------------------- */
const FileCode2 = () => (
    <svg viewBox='0 0 24 24' width='100%' height='100%' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' className='dnc__symbol'>
        <path d='M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4' />
        <path d='M14 2v4a2 2 0 0 0 2 2h4' />
        <path d='m5 12-3 3 3 3' />
        <path d='m9 18 3-3-3-3' />
    </svg>
);
const Crown = () => (
    <svg viewBox='0 0 24 24' width='100%' height='100%' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' className='dnc__symbol'>
        <path d='M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z' />
        <path d='M5 21h14' />
    </svg>
);
const Zap = () => (
    <svg viewBox='0 0 24 24' width='100%' height='100%' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' className='dnc__symbol'>
        <path d='M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z' />
    </svg>
);
const Sliders = () => (
    <svg viewBox='0 0 24 24' width='100%' height='100%' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' className='dnc__symbol'>
        <line x1='4' x2='4' y1='21' y2='14' />
        <line x1='4' x2='4' y1='10' y2='3' />
        <line x1='12' x2='12' y1='21' y2='12' />
        <line x1='12' x2='12' y1='8' y2='3' />
        <line x1='20' x2='20' y1='21' y2='16' />
        <line x1='20' x2='20' y1='12' y2='3' />
        <line x1='2' x2='6' y1='14' y2='14' />
        <line x1='10' x2='14' y1='8' y2='8' />
        <line x1='18' x2='22' y1='16' y2='16' />
    </svg>
);
const Arrow = () => (
    <svg viewBox='0 0 24 24' width='14' height='14' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <path d='M7 7h10v10' />
        <path d='M7 17 17 7' />
    </svg>
);

interface NavCardProps {
    index: string;
    title: string;
    sub: string;
    cta: string;
    color: string;
    icon: React.ReactNode;
    onClick: () => void;
}
const NavCard = ({ index, title, sub, cta, color, icon, onClick }: NavCardProps) => (
    <button type='button' className='dashboard-nav-card' style={{ ['--nav-color' as any]: color }} onClick={onClick}>
        <div className='dnc__top'>
            <span className='dnc__index'>{index}</span>
            <span className='dnc__icon-wrap'>{icon}</span>
        </div>
        <span className='dnc__title'>{title}</span>
        <span className='dnc__sub'>{sub}</span>
        <span className='dnc__open'>
            <span>{cta}</span>
            <span className='dnc__arrow'><Arrow /></span>
        </span>
    </button>
);

/* --------------------------- welcome + nav cards --------------------------- */
const DashboardWelcome = observer(({ handleTabChange }: { handleTabChange?: (n: number) => void }) => {
    const { load_modal, dashboard } = useStore();
    const { toggleLoadModal, setActiveTabIndex } = load_modal;
    const { setActiveTab } = dashboard;

    const openFileLoader = () => {
        toggleLoadModal();
        setActiveTabIndex(1);
        setActiveTab(DBOT_TABS.BOT_BUILDER);
    };

    const cards = useMemo(
        () => [
            {
                index: '01',
                title: 'Load Bot',
                sub: 'Open your trading strategy',
                cta: 'Choose a bot',
                color: '#60a5fa',
                icon: <FileCode2 />,
                onClick: openFileLoader,
            },
            {
                index: '02',
                title: 'Premium Bots',
                sub: 'Exclusive automated strategies',
                cta: 'Explore premium bots',
                color: '#FFD700',
                icon: <Crown />,
                onClick: () => handleTabChange?.(2),
            },
            {
                index: '03',
                title: 'Speed Bot',
                sub: 'One-click automated trading',
                cta: 'Launch Speed Bot',
                color: '#00e5ff',
                icon: <Zap />,
                onClick: () => handleTabChange?.(0),
            },
            {
                index: '04',
                title: 'Manual Trading',
                sub: 'Full control, trade your way',
                cta: 'Start manual trading',
                color: '#a78bfa',
                icon: <Sliders />,
                onClick: () => handleTabChange?.(3),
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    return (
        <div className='dashboard-welcome'>
            <div className='dashboard-welcome__eyebrow'>
                <span />
                TRADERSCHEME <b>/</b> YOUR TRADING WORKSPACE
            </div>
            <h1>
                <Typewriter items={HEADINGS} holdMs={2600} />
                <span className='dashboard-welcome__wave'>👋</span>
            </h1>
            <div className='dashboard-welcome__divider'>
                <span />
                <i />
                <span />
            </div>
            <p>
                <Typewriter items={QUOTES} holdMs={3800} className='dashboard-welcome__quote' />
            </p>

            <div className='dashboard-nav-cards'>
                {cards.map(c => (
                    <NavCard key={c.index} {...c} />
                ))}
            </div>
        </div>
    );
});

export default DashboardWelcome;
