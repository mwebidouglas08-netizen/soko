import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import './landing.scss';

/* ============================================================================
 * TradingHubs.site — first-visit landing ("midnight ledger")
 *
 * Ink-navy paper, brass rules, editorial serif. Self-contained: no images, no
 * remote state. Every button either enters the workspace (onEnter) or hands
 * off to Deriv OAuth through the same generator the header uses.
 * ========================================================================== */

const LANDING_SEEN_KEY = 'mwx_landing_seen';

const FONT_HREF =
    'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap';

const markLandingSeen = () => {
    try {
        window.localStorage.setItem(LANDING_SEEN_KEY, '1');
    } catch {
        /* private mode — the landing simply shows again next time */
    }
};

const NAV = [
    { label: 'How it works', id: 'lp-how' },
    { label: 'Bot library', id: 'lp-bots' },
    { label: 'Course', id: 'lp-course' },
    { label: 'Reviews', id: 'lp-reviews' },
    { label: 'FAQ', id: 'lp-faq' },
];

const SECTION_IDS = ['lp-hero', 'lp-how', 'lp-bots', 'lp-course', 'lp-reviews', 'lp-faq'];

const WORDS = ['deliberate', 'measured', 'disciplined'];

const TABS = [
    { id: 'digits', label: 'Digit lab' },
    { id: 'signals', label: 'Signals' },
    { id: 'runner', label: 'Bot runner' },
] as const;

type TabId = (typeof TABS)[number]['id'];

type Market = { code: string; name: string; price: number; open: number; dp: number; vol: number };

const MARKET_SEED: Market[] = [
    { code: 'R_75', name: 'Volatility 75', price: 1284563.42, open: 1284563.42, dp: 2, vol: 520 },
    { code: 'R_100', name: 'Volatility 100', price: 1543.87, open: 1543.87, dp: 2, vol: 0.62 },
    { code: 'BOOM1000', name: 'Boom 1000', price: 9842.31, open: 9842.31, dp: 2, vol: 4.1 },
    { code: 'CRASH500', name: 'Crash 500', price: 4128.09, open: 4128.09, dp: 2, vol: 2.2 },
    { code: 'STPRNG', name: 'Step Index', price: 9021.55, open: 9021.55, dp: 2, vol: 3.4 },
    { code: 'RBRK100', name: 'Range Break 100', price: 1190.44, open: 1190.44, dp: 2, vol: 0.48 },
    { code: 'JD100', name: 'Jump 100', price: 3412.67, open: 3412.67, dp: 2, vol: 1.8 },
    { code: 'R_25', name: 'Volatility 25', price: 6204.18, open: 6204.18, dp: 2, vol: 2.6 },
];

const DIGIT_SEED = [11, 9, 12, 8, 15, 7, 10, 9, 13, 6];

const SIGNALS = [
    { market: 'Volatility 100', contract: 'Digit Under 5', conf: 92, state: 'Queued' },
    { market: 'Boom 1000', contract: 'Rise · spike window', conf: 78, state: 'Watching' },
    { market: 'Crash 500', contract: 'Digit Over 3', conf: 84, state: 'Watching' },
];

const LOG_LINES = [
    { t: '14:02:11', text: 'Bot armed · Digit Under 4', tone: 'muted' },
    { t: '14:02:14', text: 'Stake 0.35 USD · 1 tick', tone: 'plain' },
    { t: '14:02:16', text: 'Result 3 · win · +0.34', tone: 'up' },
    { t: '14:02:19', text: 'Recovery ladder idle', tone: 'muted' },
    { t: '14:02:23', text: 'Session 6 / 10 · TP 12.00', tone: 'gold' },
];

const STEPS = [
    {
        n: '01',
        title: 'Sign in with Deriv',
        body: 'One click through Deriv OAuth. No card, no download, no password shared with us.',
    },
    {
        n: '02',
        title: 'Load a strategy',
        body: 'Pick a tested bot from the library or build your own on the visual canvas.',
    },
    {
        n: '03',
        title: 'Practise, then go live',
        body: 'Run on a demo account with hard stop-loss and session limits before real money enters.',
    },
];

type Family = 'All' | 'Digits' | 'Volatility' | 'Recovery';

const FAMILIES: Family[] = ['All', 'Digits', 'Volatility', 'Recovery'];

type Bot = {
    id: string;
    name: string;
    family: Exclude<Family, 'All'>;
    blurb: string;
    win: string;
    stake: string;
    markets: string;
    bullets: string[];
};

const BOTS: Bot[] = [
    {
        id: 'digit-under',
        name: 'Digit Under',
        family: 'Digits',
        blurb: 'Fades the digit 4 on one-tick contracts with a bounded recovery ladder.',
        win: '94%',
        stake: '0.35 USD',
        markets: 'Volatility 10 – 100',
        bullets: [
            'Only stakes again while inside your stop-loss.',
            'Skips the round when the last 20 ticks skew high.',
            'Session ends at 10 trades or the take-profit, whichever comes first.',
        ],
    },
    {
        id: 'digit-over',
        name: 'Digit Over',
        family: 'Digits',
        blurb: 'Mirror of Under: hunts over-priced low digits during cold streaks.',
        win: '91%',
        stake: '0.35 USD',
        markets: 'Volatility 25 – 100',
        bullets: [
            'Waits for a 30-tick cold streak before the first entry.',
            'Flat stake by default — recovery is opt-in.',
            'Reports every skip, so you can audit the logic.',
        ],
    },
    {
        id: 'even-odd',
        name: 'Even / Odd',
        family: 'Digits',
        blurb: 'The cleanest entry into digit trading: two outcomes, one rule.',
        win: '88%',
        stake: '0.20 USD',
        markets: 'Volatility 50 – 100',
        bullets: [
            'Trades the dominant parity of the last 50 ticks.',
            'Stops after three consecutive losses.',
            'A good first bot for the demo account.',
        ],
    },
    {
        id: 'boom-sniper',
        name: 'Boom Sniper',
        family: 'Volatility',
        blurb: 'Waits for the spike window on Boom 1000 and exits before the pullback.',
        win: '82%',
        stake: '0.50 USD',
        markets: 'Boom 500 / 1000',
        bullets: [
            'Enters only inside the measured spike interval.',
            'Hard time exit — no holding through the reversal.',
            'Caps exposure at 2% of the demo balance.',
        ],
    },
    {
        id: 'crash-fade',
        name: 'Crash Fade',
        family: 'Volatility',
        blurb: 'Trades the mean reversion after a Crash 500 drop, with a tight stop.',
        win: '79%',
        stake: '0.50 USD',
        markets: 'Crash 300 – 1000',
        bullets: [
            'One position at a time, no averaging down.',
            'Stop-loss set before entry, never moved.',
            'Pauses when volatility expands beyond the band.',
        ],
    },
    {
        id: 'speed-scalper',
        name: 'Speed Scalper',
        family: 'Volatility',
        blurb: 'One-click scalping that acts on the fastest tick momentum.',
        win: '85%',
        stake: '0.25 USD',
        markets: 'Volatility 10 – 75',
        bullets: [
            'Sub-second reaction to momentum flips.',
            'Take-profit at 1.2x stake, stop at 1x.',
            'Auto-pauses after 20 trades per session.',
        ],
    },
    {
        id: 'recovery-ladder',
        name: 'Recovery Ladder',
        family: 'Recovery',
        blurb: 'Smart AI recovery that widens stake only while the session is healthy.',
        win: '90%',
        stake: '0.30 USD',
        markets: 'Any synthetic',
        bullets: [
            'Never exceeds the stop-loss you set.',
            'Resets the ladder after any win.',
            'Explains each step in plain language in the log.',
        ],
    },
];

const COURSE = [
    {
        n: '01',
        title: 'Getting started with Deriv',
        mins: 14,
        lessons: ['Create a demo account in two minutes', 'Tour the workspace', 'Place your first manual trade'],
    },
    {
        n: '02',
        title: 'Understanding synthetic indices',
        mins: 18,
        lessons: ['Volatility, Boom, Crash and Step', 'Why synthetics run 24/7', 'Reading contract specifications'],
    },
    {
        n: '03',
        title: 'Setting up your workspace',
        mins: 11,
        lessons: ['Charts, ticks and digit stats', 'Saving a strategy', 'Choosing stake and duration'],
    },
    {
        n: '04',
        title: 'Reading digit patterns',
        mins: 16,
        lessons: ['Digit distribution basics', 'Over and Under contracts', 'When a pattern is just noise'],
    },
    {
        n: '05',
        title: 'Your first bot strategy',
        mins: 22,
        lessons: ['Loading a bot from the library', 'Setting stop-loss and take-profit', 'Running it on demo'],
    },
    {
        n: '06',
        title: 'Risk management',
        mins: 19,
        lessons: ['Position sizing', 'Session limits', 'Knowing when to stop'],
    },
];

const REVIEWS = [
    {
        name: 'James Ochieng',
        role: 'Nairobi · 2 years',
        quote: 'The digit lab replaced three spreadsheets. I finally know why a bot lost instead of guessing.',
    },
    {
        name: 'Amina Hassan',
        role: 'Mombasa · copy trader',
        quote: 'Recovery only widened while I was inside my stop-loss. That one guardrail saved my account twice.',
    },
    {
        name: 'David Mwangi',
        role: 'Kampala · bot builder',
        quote: 'I built a step-index strategy in an afternoon without writing a single line of code.',
    },
    {
        name: 'Fatima Al-Rashid',
        role: 'Dubai · manual trader',
        quote: 'The first workspace that does not shout at me. Calm colours, real numbers, no hype.',
    },
    {
        name: 'Peter Kamau',
        role: 'Nakuru · scalper',
        quote: 'Speed bot catches the spike window before I finish reading the chart.',
    },
    {
        name: 'Grace Njeri',
        role: 'Beginner · 4 months',
        quote: 'The course walked me through demo, then I went live with 0.35 USD. No drama.',
    },
];

const FAQ = [
    {
        q: 'Is TradingHubs.site free?',
        a: 'Yes. The bot library, the course and every analysis tool are free. You only need a Deriv account to trade.',
    },
    {
        q: 'Do I need to know how to code?',
        a: 'No. Every bot loads in one click, and the visual builder lets you assemble a strategy from blocks.',
    },
    {
        q: 'Can I try it on a demo account?',
        a: 'That is the recommended path. Start on a Deriv demo account, watch how the bot behaves, then go live when you are ready.',
    },
    {
        q: 'Which markets can I trade?',
        a: 'Volatility, Boom, Crash, Step, Range Break and Jump indices — synthetic markets that run 24 hours a day.',
    },
    {
        q: 'How does smart recovery work?',
        a: 'It reviews the last results and widens the stake only while the session is inside the stop-loss and take-profit you set. If the limit is hit, the bot stops.',
    },
    {
        q: 'Is my Deriv account secure?',
        a: 'Yes. Sign-in happens on Deriv through OAuth. Your password is never shared with this app.',
    },
];

/* ------------------------------- helpers -------------------------------- */

const usePrefersReducedMotion = () => {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduced(mq.matches);
        const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);
    return reduced;
};

const fmtPrice = (value: number, dp: number) =>
    value.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });

const pctOf = (market: Market) => ((market.price - market.open) / market.open) * 100;

const SPARK = [16, 26, 21, 34, 29, 41, 36, 52, 44, 58, 51, 66, 61, 74];

/* --------------------------------- icons -------------------------------- */

const IconArrow = ({ back = false }: { back?: boolean }) => (
    <svg className={back ? 'lp__icon lp__icon--back' : 'lp__icon'} viewBox='0 0 24 24' aria-hidden='true'>
        <path d='M4 12h15' />
        <path d='M13 6l6 6-6 6' />
    </svg>
);

const IconCheck = () => (
    <svg className='lp__icon' viewBox='0 0 24 24' aria-hidden='true'>
        <path d='M4 12.5l5 5L20 6.5' />
    </svg>
);

const IconMenu = () => (
    <svg className='lp__icon' viewBox='0 0 24 24' aria-hidden='true'>
        <path d='M4 8h16' />
        <path d='M4 16h16' />
    </svg>
);

const IconClose = () => (
    <svg className='lp__icon' viewBox='0 0 24 24' aria-hidden='true'>
        <path d='M6 6l12 12' />
        <path d='M18 6L6 18' />
    </svg>
);

const IconUp = () => (
    <svg className='lp__icon' viewBox='0 0 24 24' aria-hidden='true'>
        <path d='M12 20V5' />
        <path d='M6 11l6-6 6 6' />
    </svg>
);

const IconSpark = () => (
    <svg className='lp__icon' viewBox='0 0 24 24' aria-hidden='true'>
        <path d='M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21M5.6 5.6l2.5 2.5M15.9 15.9l2.5 2.5M18.4 5.6l-2.5 2.5M8.1 15.9l-2.5 2.5' />
    </svg>
);

/* -------------------------------- pieces -------------------------------- */

const CountUp = ({ value, suffix, reduced }: { value: number; suffix: string; reduced: boolean }) => {
    const ref = useRef<HTMLSpanElement | null>(null);
    const [shown, setShown] = useState(reduced ? value : 0);

    useEffect(() => {
        if (reduced) {
            setShown(value);
            return;
        }
        const node = ref.current;
        if (!node) return;
        let frame = 0;
        const io = new IntersectionObserver(
            entries => {
                if (!entries[0]?.isIntersecting) return;
                io.disconnect();
                const start = performance.now();
                const tick = (now: number) => {
                    const t = Math.min(1, (now - start) / 1100);
                    setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
                    if (t < 1) frame = window.requestAnimationFrame(tick);
                };
                frame = window.requestAnimationFrame(tick);
            },
            { threshold: 0.35 }
        );
        io.observe(node);
        return () => {
            io.disconnect();
            window.cancelAnimationFrame(frame);
        };
    }, [value, reduced]);

    return (
        <span ref={ref}>
            {shown}
            {suffix}
        </span>
    );
};

const Sparkline = () => {
    const paths = useMemo(() => {
        const w = 320;
        const h = 96;
        const step = w / (SPARK.length - 1);
        const points = SPARK.map((v, i) => [i * step, h - (v / 80) * h] as const);
        const line = points
            .map(([x, y], i) => (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1))
            .join(' ');
        return { line, area: line + ' L' + w + ',' + h + ' L0,' + h + ' Z' };
    }, []);

    return (
        <svg className='lp__spark' viewBox='0 0 320 96' aria-hidden='true'>
            <defs>
                <linearGradient id='lpSparkFill' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor='#64e1f3' stopOpacity='0.26' />
                    <stop offset='100%' stopColor='#64e1f3' stopOpacity='0' />
                </linearGradient>
            </defs>
            <path d={paths.area} fill='url(#lpSparkFill)' />
            <path className='lp__spark-line' d={paths.line} />
        </svg>
    );
};

interface LandingProps {
    onEnter: () => void;
    isLoggedIn?: boolean;
}

/* ------------------------------- component ------------------------------- */

const Landing = ({ onEnter, isLoggedIn = false }: LandingProps) => {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const reduced = usePrefersReducedMotion();

    const [progress, setProgress] = useState(0);
    const [stuck, setStuck] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('lp-hero');
    const [tab, setTab] = useState<TabId>('digits');
    const [busy, setBusy] = useState<'login' | 'signup' | null>(null);
    const [notice, setNotice] = useState('');
    const [markets, setMarkets] = useState<Market[]>(MARKET_SEED);
    const [digits, setDigits] = useState<number[]>(DIGIT_SEED);
    const [wordIndex, setWordIndex] = useState(0);
    const [family, setFamily] = useState<Family>('All');
    const [activeBot, setActiveBot] = useState(BOTS[0].id);
    const [openModule, setOpenModule] = useState<number | null>(0);
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(3);
    const [paused, setPaused] = useState(false);

    /* --- fonts ---------------------------------------------------------- */
    useEffect(() => {
        const id = 'lp-web-fonts';
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = FONT_HREF;
        document.head.appendChild(link);
    }, []);

    /* --- page shell ----------------------------------------------------- */
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.body.classList.add('landing-open');
        return () => {
            document.body.style.overflow = previousOverflow;
            document.body.classList.remove('landing-open');
        };
    }, []);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setMenuOpen(false);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);

    /* --- scroll: progress, sticky state, section spy --------------------- */
    useEffect(() => {
        const el = rootRef.current;
        if (!el) return;
        let frame = 0;
        const measure = () => {
            frame = 0;
            const max = el.scrollHeight - el.clientHeight;
            setProgress(max > 0 ? Math.min(1, el.scrollTop / max) : 0);
            setStuck(el.scrollTop > 20);
            const top = el.getBoundingClientRect().top;
            let current = 'lp-hero';
            SECTION_IDS.forEach(id => {
                const node = el.querySelector<HTMLElement>('#' + id);
                if (node && node.getBoundingClientRect().top - top <= 140) current = id;
            });
            setActiveSection(current);
            /* the photograph is pinned, so a slow counter-shift reads as depth */
            el.style.setProperty('--lp-bg-shift', Math.min(40, el.scrollTop * 0.07).toFixed(1) + 'px');
        };
        const onScroll = () => {
            if (frame) return;
            frame = window.requestAnimationFrame(measure);
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        measure();
        return () => {
            el.removeEventListener('scroll', onScroll);
            if (frame) window.cancelAnimationFrame(frame);
        };
    }, []);

    /* --- reveal on scroll ---------------------------------------------- */
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
        if (reduced || typeof IntersectionObserver === 'undefined') {
            nodes.forEach(node => node.classList.add('in'));
            return;
        }
        const io = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in');
                        io.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.14, rootMargin: '0px 0px -6% 0px' }
        );
        nodes.forEach(node => io.observe(node));
        return () => io.disconnect();
    }, [reduced]);

    /* --- live numbers --------------------------------------------------- */
    useEffect(() => {
        if (reduced) return;
        const id = window.setInterval(() => setWordIndex(i => (i + 1) % WORDS.length), 3200);
        return () => window.clearInterval(id);
    }, [reduced]);

    useEffect(() => {
        if (reduced) return;
        const id = window.setInterval(() => {
            setMarkets(prev =>
                prev.map(market => {
                    const drift = (Math.random() - 0.5) * market.vol;
                    const next = Math.max(market.open * 0.9, market.price + drift);
                    return { ...market, price: next };
                })
            );
        }, 2200);
        return () => window.clearInterval(id);
    }, [reduced]);

    useEffect(() => {
        if (reduced) return;
        const id = window.setInterval(() => {
            setDigits(prev => prev.map(v => Math.min(22, Math.max(3, v + (Math.random() - 0.5) * 3.4))));
        }, 2800);
        return () => window.clearInterval(id);
    }, [reduced]);

    /* --- carousel ------------------------------------------------------- */
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 899px)');
        const sync = () => setPerPage(mq.matches ? 1 : 3);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    const pages = Math.max(1, Math.ceil(REVIEWS.length / perPage));

    useEffect(() => {
        setPage(current => Math.min(current, pages - 1));
    }, [pages]);

    useEffect(() => {
        if (paused || reduced || pages < 2) return;
        const id = window.setInterval(() => setPage(current => (current + 1) % pages), 7000);
        return () => window.clearInterval(id);
    }, [paused, reduced, pages]);

    const dragStart = useRef<number | null>(null);
    const onDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
        dragStart.current = event.clientX;
    };
    const onDragEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
        const start = dragStart.current;
        dragStart.current = null;
        if (start === null) return;
        const delta = event.clientX - start;
        if (Math.abs(delta) < 44) return;
        setPage(current => (current + (delta < 0 ? 1 : pages - 1)) % pages);
    };

    /* --- navigation ----------------------------------------------------- */
    const goTo = useCallback(
        (id: string) => {
            const root = rootRef.current;
            if (!root) return;
            const node = root.querySelector<HTMLElement>('#' + id);
            setMenuOpen(false);
            if (!node) return;
            const offset = node.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 72;
            root.scrollTo({ top: Math.max(0, offset), behavior: reduced ? 'auto' : 'smooth' });
        },
        [reduced]
    );

    const enter = useCallback(() => {
        markLandingSeen();
        onEnter();
    }, [onEnter]);

    const beginAuth = useCallback(
        async (mode: 'login' | 'signup') => {
            if (busy) return;
            setBusy(mode);
            setNotice('');
            try {
                const { generateOAuthURL } = await import('@/components/shared');
                const url = await generateOAuthURL(mode === 'signup' ? 'registration' : undefined);
                if (url) {
                    markLandingSeen();
                    window.location.replace(url);
                    return;
                }
                setNotice(
                    'Secure sign-in is not configured on this deployment yet. You can still explore the workspace.'
                );
                if (mode === 'signup') enter();
            } catch {
                setNotice('We could not reach the secure sign-in service. Please try again in a moment.');
            } finally {
                setBusy(null);
            }
        },
        [busy, enter]
    );

    const primaryLabel = isLoggedIn ? 'Open the workspace' : 'Start free — demo first';
    const secondaryAuthLabel = isLoggedIn ? 'Open workspace' : 'Log in';
    const onSecondaryAuth = isLoggedIn ? enter : () => beginAuth('login');

    /* --- derived -------------------------------------------------------- */
    const visibleBots = useMemo(
        () => (family === 'All' ? BOTS : BOTS.filter(item => item.family === family)),
        [family]
    );
    const bot = visibleBots.find(item => item.id === activeBot) ?? visibleBots[0] ?? BOTS[0];

    useEffect(() => {
        if (!visibleBots.some(item => item.id === activeBot) && visibleBots[0]) {
            setActiveBot(visibleBots[0].id);
        }
    }, [visibleBots, activeBot]);

    const strip = useMemo(() => [...markets, ...markets], [markets]);
    const maxDigit = Math.max(...digits);
    const pageItems = REVIEWS.slice(page * perPage, page * perPage + perPage);

    return (
        <div className={'lp' + (menuOpen ? ' is-menu-open' : '')} ref={rootRef}>
            {/* ------------------------------ backdrop ----------------------------- */}
            <div className='lp__backdrop' aria-hidden='true'>
                <picture>
                    <source media='(max-width: 899px)' srcSet='/static/media/landing-backdrop-mobile.3b0a0e3e.webp' type='image/webp' />
                    <source media='(min-width: 900px)' srcSet='/static/media/landing-backdrop.5ab5b8d3.webp' type='image/webp' />
                    <source media='(max-width: 899px)' srcSet='/static/media/landing-backdrop-mobile.3b0a0e3e.jpg' />
                    <img src='/static/media/landing-backdrop.5ab5b8d3.jpg' alt='' decoding='async' fetchPriority='high' />
                </picture>
                <span className='lp__veil' />
                <span className='lp__veil lp__veil--side' />
            </div>

            <header className={'lp__topbar' + (stuck ? ' is-stuck' : '')}>
                <div className='lp__progress' aria-hidden='true'>
                    <span style={{ transform: 'scaleX(' + progress + ')' }} />
                </div>

                <a className='lp__brand' href='#lp-hero' onClick={event => { event.preventDefault(); goTo('lp-hero'); }}>
                    <span className='lp__brand-mark' aria-hidden='true'>
                        <span className='lp__brand-diamond' />
                    </span>
                    <span className='lp__brand-word'>TradingHubs<span>.site</span></span>
                </a>

                <nav className='lp__nav' aria-label='Sections'>
                    {NAV.map(item => (
                        <a
                            key={item.id}
                            className={'lp__nav-link' + (activeSection === item.id ? ' is-active' : '')}
                            href={'#' + item.id}
                            aria-current={activeSection === item.id ? 'true' : undefined}
                            onClick={event => {
                                event.preventDefault();
                                goTo(item.id);
                            }}
                        >
                            {item.label}
                        </a>
                    ))}
                </nav>

                <div className='lp__topbar-actions'>
                    <span className='lp__status'>
                        <i aria-hidden='true' />
                        Markets open · 24/7
                    </span>
                    <button type='button' className='lp__btn lp__btn--ghost lp__btn--sm' onClick={onSecondaryAuth}>
                        {secondaryAuthLabel}
                    </button>
                    <button
                        type='button'
                        className='lp__btn lp__btn--gold lp__btn--sm'
                        onClick={isLoggedIn ? enter : () => beginAuth('signup')}
                    >
                        {isLoggedIn ? 'Open workspace' : 'Get started'}
                    </button>
                    <button
                        type='button'
                        className='lp__menu-btn'
                        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={menuOpen}
                        aria-controls='lp-drawer'
                        onClick={() => setMenuOpen(open => !open)}
                    >
                        {menuOpen ? <IconClose /> : <IconMenu />}
                    </button>
                </div>
            </header>

            {menuOpen && (
                <div className='lp__drawer' id='lp-drawer'>
                    <nav className='lp__drawer-nav' aria-label='Sections'>
                        {NAV.map(item => (
                            <button key={item.id} type='button' onClick={() => goTo(item.id)}>
                                {item.label}
                            </button>
                        ))}
                    </nav>
                    <div className='lp__drawer-cta'>
                        <button
                            type='button'
                            className='lp__btn lp__btn--gold lp__btn--block'
                            onClick={isLoggedIn ? enter : () => beginAuth('signup')}
                        >
                            {isLoggedIn ? 'Open the workspace' : 'Create free account'}
                        </button>
                        <button type='button' className='lp__btn lp__btn--ghost lp__btn--block' onClick={onSecondaryAuth}>
                            {secondaryAuthLabel}
                        </button>
                    </div>
                    <p className='lp__drawer-note'>Deriv OAuth · demo first · no card required</p>
                </div>
            )}

            <div className='lp__ticker' aria-hidden='true'>
                <div className='lp__ticker-track'>
                    {strip.map((market, index) => {
                        const pct = pctOf(market);
                        return (
                            <span className='lp__ticker-item' key={market.code + '-' + index}>
                                <span className='lp__ticker-name'>{market.name}</span>
                                <span className='lp__ticker-price'>{fmtPrice(market.price, market.dp)}</span>
                                <span className={'lp__ticker-chg ' + (pct >= 0 ? 'up' : 'down')}>
                                    {pct >= 0 ? '+' : ''}
                                    {pct.toFixed(2)}%
                                </span>
                                <span className='lp__ticker-sep'>/</span>
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* ------------------------------- hero ------------------------------- */}
            <section className='lp__hero' id='lp-hero'>
                <div className='lp__hero-grid'>
                    <div className='lp__hero-copy'>
                        <span className='lp__eyebrow lp__rise'>
                            <span className='lp__eyebrow-dot' aria-hidden='true' />
                            Free workspace · built on Deriv
                        </span>

                        <h1
                            className='lp__h1 lp__rise'
                            aria-label='A calmer, more deliberate way to trade synthetic indices.'
                        >
                            <span className='lp__h1-line' aria-hidden='true'>
                                A calmer, more
                            </span>
                            <span className='lp__h1-line lp__h1-line--accent' aria-hidden='true'>
                                <span className='lp__rot'>
                                    {WORDS.map((word, index) => (
                                        <span
                                            key={word}
                                            className={'lp__rot-word' + (index === wordIndex ? ' is-active' : '')}
                                        >
                                            {word}
                                        </span>
                                    ))}
                                </span>
                            </span>
                            <span className='lp__h1-line' aria-hidden='true'>
                                way to trade synthetics.
                            </span>
                        </h1>

                        <p className='lp__lead lp__rise'>
                            Thirteen tested bot strategies, live digit analysis and a visual builder — in one quiet
                            desk. Sign in with Deriv, practise on demo, and let the rules do the work.
                        </p>

                        <div className='lp__hero-cta lp__rise'>
                            <button
                                type='button'
                                className='lp__btn lp__btn--gold'
                                onClick={isLoggedIn ? enter : () => beginAuth('signup')}
                                disabled={busy !== null}
                            >
                                {busy === 'signup' ? 'Opening Deriv…' : primaryLabel}
                                {busy === null && <IconArrow />}
                            </button>
                            <button type='button' className='lp__btn lp__btn--ghost' onClick={() => goTo('lp-how')}>
                                See how it works
                            </button>
                        </div>

                        {notice && (
                            <p className='lp__notice' role='status'>
                                {notice}
                            </p>
                        )}

                        <ul className='lp__trust lp__rise'>
                            <li>
                                <IconCheck /> Deriv OAuth only
                            </li>
                            <li>
                                <IconCheck /> Demo accounts
                            </li>
                            <li>
                                <IconCheck /> No card required
                            </li>
                            <li>
                                <IconCheck /> Works on mobile
                            </li>
                        </ul>
                    </div>

                    <div className='lp__hero-visual lp__rise' id='lp-desk'>
                        <div className='lp__desk'>
                            <div className='lp__desk-head'>
                                <div className='lp__desk-title'>
                                    <span className='lp__desk-mark' aria-hidden='true'>
                                        TH
                                    </span>
                                    <span>
                                        Workspace
                                        <em>preview</em>
                                    </span>
                                    <span className='lp__desk-live'>
                                        <i aria-hidden='true' />
                                        live
                                    </span>
                                </div>
                                <div className='lp__desk-tabs' role='tablist' aria-label='Workspace preview'>
                                    {TABS.map(item => (
                                        <button
                                            key={item.id}
                                            type='button'
                                            role='tab'
                                            aria-selected={tab === item.id}
                                            className={'lp__desk-tab' + (tab === item.id ? ' is-active' : '')}
                                            onClick={() => setTab(item.id)}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className='lp__desk-body'>
                                {tab === 'digits' && (
                                    <div className='lp__digits-wrap'>
                                        <div className='lp__digits-caption'>
                                            <span>Digit distribution</span>
                                            <span className='lp__mono'>last 1,000 ticks</span>
                                        </div>
                                        <div className='lp__digits'>
                                            {digits.map((value, index) => (
                                                <div className='lp__digit' key={index}>
                                                    <span
                                                        className={
                                                            'lp__digit-bar' + (value === maxDigit ? ' is-hot' : '')
                                                        }
                                                        style={{ height: Math.round((value / 22) * 100) + '%' }}
                                                    />
                                                    <span className='lp__digit-n'>{index}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className='lp__digits-foot'>
                                            <span>
                                                <i className='lp__dot-teal' aria-hidden='true' />
                                                Cold digit <strong>{digits.indexOf(Math.min(...digits))}</strong>
                                            </span>
                                            <span>
                                                Under 4 confidence <strong>92%</strong>
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {tab === 'signals' && (
                                    <div className='lp__rows'>
                                        {SIGNALS.map(signal => (
                                            <div className='lp__row' key={signal.contract}>
                                                <div className='lp__row-main'>
                                                    <strong>{signal.contract}</strong>
                                                    <span>{signal.market}</span>
                                                </div>
                                                <div className='lp__row-meta'>
                                                    <span className='lp__conf-bar' aria-hidden='true'>
                                                        <i style={{ width: signal.conf + '%' }} />
                                                    </span>
                                                    <span className='lp__mono'>{signal.conf}%</span>
                                                    <span
                                                        className={
                                                            'lp__state' +
                                                            (signal.state === 'Queued' ? ' is-queued' : '')
                                                        }
                                                    >
                                                        {signal.state}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        <div className='lp__row-note'>
                                            Scanner reads public tick data before you sign in. Orders stay locked
                                            until you log in.
                                        </div>
                                    </div>
                                )}

                                {tab === 'runner' && (
                                    <div className='lp__runner'>
                                        <div className='lp__runner-head'>
                                            <div>
                                                <strong>Digit Under 4</strong>
                                                <span>Recovery on · demo account</span>
                                            </div>
                                            <span className='lp__pill'>running</span>
                                        </div>
                                        <Sparkline />
                                        <div className='lp__runner-stats'>
                                            <div>
                                                <span>Stake</span>
                                                <strong>0.35</strong>
                                            </div>
                                            <div>
                                                <span>Take profit</span>
                                                <strong>12.00</strong>
                                            </div>
                                            <div>
                                                <span>Stop loss</span>
                                                <strong>8.00</strong>
                                            </div>
                                            <div>
                                                <span>Session</span>
                                                <strong>6 / 10</strong>
                                            </div>
                                        </div>
                                        <div className='lp__progressbar' aria-hidden='true'>
                                            <i style={{ width: '56%' }} />
                                        </div>
                                        <div className='lp__log'>
                                            {LOG_LINES.map(line => (
                                                <span className={'lp__log-line tone-' + line.tone} key={line.t}>
                                                    <em>{line.t}</em>
                                                    {line.text}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className='lp__desk-foot'>
                                {markets.slice(0, 3).map(market => {
                                    const pct = pctOf(market);
                                    return (
                                        <span className='lp__desk-quote' key={market.code}>
                                            <span>{market.name}</span>
                                            <strong>{fmtPrice(market.price, market.dp)}</strong>
                                            <em className={pct >= 0 ? 'up' : 'down'}>
                                                {pct >= 0 ? '+' : ''}
                                                {pct.toFixed(2)}%
                                            </em>
                                        </span>
                                    );
                                })}
                            </div>

                            <div className='lp__desk-chip'>
                                <IconSpark />
                                <span>
                                    Next signal
                                    <strong>Digit Under 4</strong>
                                </span>
                                <em>92%</em>
                            </div>
                        </div>
                        <p className='lp__desk-caption'>Interactive preview. Nothing here places a real trade.</p>
                    </div>
                </div>

                <a
                    className='lp__cue'
                    href='#lp-how'
                    onClick={event => {
                        event.preventDefault();
                        goTo('lp-how');
                    }}
                >
                    <span className='lp__cue-track' aria-hidden='true'>
                        <i />
                    </span>
                    Scroll to explore
                </a>
            </section>

            {/* ------------------------------- stats ------------------------------ */}
            <section className='lp__stats' aria-label='Workspace at a glance'>
                <div className='lp__stat' data-reveal>
                    <strong>
                        <CountUp value={13} suffix='+' reduced={reduced} />
                    </strong>
                    <span>Bot templates</span>
                </div>
                <div className='lp__stat' data-reveal>
                    <strong>
                        <CountUp value={17} suffix='+' reduced={reduced} />
                    </strong>
                    <span>Synthetic markets</span>
                </div>
                <div className='lp__stat' data-reveal>
                    <strong>
                        <CountUp value={24} suffix='/7' reduced={reduced} />
                    </strong>
                    <span>Market access</span>
                </div>
                <div className='lp__stat' data-reveal>
                    <strong>
                        <CountUp value={0} suffix='' reduced={reduced} />
                    </strong>
                    <span>Lines of code to start</span>
                </div>
            </section>

            {/* -------------------------------- how ------------------------------- */}
            <section className='lp__section' id='lp-how'>
                <div className='lp__section-head' data-reveal>
                    <span className='lp__num' aria-hidden='true'>
                        01
                    </span>
                    <div>
                        <span className='lp__eyebrow'>How it works</span>
                        <h2 className='lp__h2'>
                            Three moves, <em>no theatre</em>.
                        </h2>
                        <p className='lp__lead'>
                            From first click to a running bot in about four minutes. Everything is reversible, and
                            demo comes first.
                        </p>
                    </div>
                </div>

                <div className='lp__steps'>
                    {STEPS.map((step, index) => (
                        <article
                            className='lp__step'
                            key={step.n}
                            data-reveal
                            style={{ transitionDelay: index * 90 + 'ms' }}
                        >
                            <span className='lp__step-n'>{step.n}</span>
                            <h3>{step.title}</h3>
                            <p>{step.body}</p>
                        </article>
                    ))}
                </div>
            </section>

            {/* -------------------------------- bots ------------------------------ */}
            <section className='lp__section lp__section--panel' id='lp-bots'>
                <div className='lp__section-head' data-reveal>
                    <span className='lp__num' aria-hidden='true'>
                        02
                    </span>
                    <div>
                        <span className='lp__eyebrow'>The bot library</span>
                        <h2 className='lp__h2'>
                            Thirteen strategies. <em>Zero</em> setup.
                        </h2>
                        <p className='lp__lead'>
                            Each bot ships with a stake, a stop-loss and a session cap already set. Pick one, read
                            exactly what it will do, then run it on demo.
                        </p>
                    </div>
                </div>

                <div className='lp__chips' role='group' aria-label='Filter the bot library' data-reveal>
                    {FAMILIES.map(item => (
                        <button
                            key={item}
                            type='button'
                            className={'lp__chip' + (family === item ? ' is-active' : '')}
                            aria-pressed={family === item}
                            onClick={() => setFamily(item)}
                        >
                            {item}
                        </button>
                    ))}
                </div>

                <div className='lp__bots'>
                    <div className='lp__bot-list'>
                        {visibleBots.map(item => (
                            <button
                                key={item.id}
                                type='button'
                                className={'lp__bot-card' + (item.id === bot.id ? ' is-active' : '')}
                                aria-pressed={item.id === bot.id}
                                onClick={() => setActiveBot(item.id)}
                            >
                                <span className='lp__bot-top'>
                                    <span className='lp__bot-name'>{item.name}</span>
                                    <span className='lp__bot-family'>{item.family}</span>
                                </span>
                                <span className='lp__bot-blurb'>{item.blurb}</span>
                                <span className='lp__bot-metas'>
                                    <span>Win {item.win}</span>
                                    <span>Stake {item.stake}</span>
                                    <span>{item.markets}</span>
                                </span>
                            </button>
                        ))}
                    </div>

                    <aside className='lp__bot-detail' aria-live='polite'>
                        <span className='lp__eyebrow'>Selected strategy</span>
                        <h3>{bot.name}</h3>
                        <p className='lp__bot-detail-blurb'>{bot.blurb}</p>
                        <dl className='lp__detail-grid'>
                            <div>
                                <dt>Win rate</dt>
                                <dd>{bot.win}</dd>
                            </div>
                            <div>
                                <dt>Default stake</dt>
                                <dd>{bot.stake}</dd>
                            </div>
                            <div>
                                <dt>Markets</dt>
                                <dd>{bot.markets}</dd>
                            </div>
                            <div>
                                <dt>Risk</dt>
                                <dd>{bot.family === 'Recovery' ? 'Medium' : 'Low'}</dd>
                            </div>
                        </dl>
                        <ul className='lp__detail-list'>
                            {bot.bullets.map(point => (
                                <li key={point}>
                                    <IconCheck />
                                    {point}
                                </li>
                            ))}
                        </ul>
                        <button
                            type='button'
                            className='lp__btn lp__btn--gold lp__btn--block'
                            onClick={isLoggedIn ? enter : () => beginAuth('login')}
                        >
                            {isLoggedIn ? 'Load this bot' : 'Log in to load this bot'}
                            <IconArrow />
                        </button>
                        <p className='lp__detail-note'>No live order is placed until you press Run inside the desk.</p>
                    </aside>
                </div>
            </section>

            {/* ------------------------------- course ----------------------------- */}
            <section className='lp__section' id='lp-course'>
                <div className='lp__section-head' data-reveal>
                    <span className='lp__num' aria-hidden='true'>
                        03
                    </span>
                    <div>
                        <span className='lp__eyebrow'>The free course</span>
                        <h2 className='lp__h2'>
                            Learn the desk <em>before</em> the money.
                        </h2>
                        <p className='lp__lead'>
                            Six short modules, written for beginners. Open one to see the lessons inside.
                        </p>
                    </div>
                </div>

                <div className='lp__course'>
                    {COURSE.map((module, index) => {
                        const open = openModule === index;
                        return (
                            <div className={'lp__module' + (open ? ' is-open' : '')} key={module.n} data-reveal>
                                <button
                                    type='button'
                                    className='lp__module-head'
                                    aria-expanded={open}
                                    aria-controls={'lp-module-' + module.n}
                                    onClick={() => setOpenModule(open ? null : index)}
                                >
                                    <span className='lp__module-n'>{module.n}</span>
                                    <span className='lp__module-title'>{module.title}</span>
                                    <span className='lp__module-meta'>{module.mins} min</span>
                                    <span className='lp__module-icon' aria-hidden='true' />
                                </button>
                                <div className='lp__module-body' id={'lp-module-' + module.n} aria-hidden={!open}>
                                    <ul>
                                        {module.lessons.map(lesson => (
                                            <li key={lesson}>
                                                <IconCheck />
                                                {lesson}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className='lp__course-cta' data-reveal>
                    <p>Start with module one inside the workspace — progress is saved per account.</p>
                    <button type='button' className='lp__btn lp__btn--ghost' onClick={enter}>
                        Open the course
                        <IconArrow />
                    </button>
                </div>
            </section>

            {/* ------------------------------- reviews ---------------------------- */}
            <section className='lp__section lp__section--panel' id='lp-reviews'>
                <div className='lp__section-head lp__section-head--row' data-reveal>
                    <div className='lp__section-head-inner'>
                        <span className='lp__eyebrow'>Traders on the desk</span>
                        <h2 className='lp__h2'>
                            Quiet praise from <em>real</em> accounts.
                        </h2>
                    </div>
                    <div className='lp__carousel-nav'>
                        <button
                            type='button'
                            aria-label='Previous reviews'
                            onClick={() => setPage(current => (current + pages - 1) % pages)}
                            disabled={pages < 2}
                        >
                            <IconArrow back />
                        </button>
                        <span className='lp__mono'>
                            {page + 1} / {pages}
                        </span>
                        <button
                            type='button'
                            aria-label='Next reviews'
                            onClick={() => setPage(current => (current + 1) % pages)}
                            disabled={pages < 2}
                        >
                            <IconArrow />
                        </button>
                    </div>
                </div>

                <div
                    className='lp__review-viewport'
                    role='group'
                    aria-roledescription='carousel'
                    aria-label='Trader reviews'
                    tabIndex={0}
                    onPointerDown={onDragStart}
                    onPointerUp={onDragEnd}
                    onPointerCancel={() => {
                        dragStart.current = null;
                    }}
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                    onFocus={() => setPaused(true)}
                    onBlur={() => setPaused(false)}
                    onKeyDown={event => {
                        if (event.key === 'ArrowRight') setPage(current => (current + 1) % pages);
                        if (event.key === 'ArrowLeft') setPage(current => (current + pages - 1) % pages);
                    }}
                >
                    <div className='lp__review-track' style={{ transform: 'translateX(-' + page * 100 + '%)' }}>
                        {Array.from({ length: pages }).map((_, pageIndex) => (
                            <div className='lp__review-page' key={pageIndex} aria-hidden={pageIndex !== page}>
                                {REVIEWS.slice(pageIndex * perPage, pageIndex * perPage + perPage).map(review => (
                                    <article className='lp__review-card' key={review.name}>
                                        <div className='lp__review-top'>
                                            <span className='lp__review-avatar' aria-hidden='true'>
                                                {review.name.charAt(0)}
                                            </span>
                                            <div className='lp__review-meta'>
                                                <strong>{review.name}</strong>
                                                <span>{review.role}</span>
                                            </div>
                                        </div>
                                        <div className='lp__stars' aria-label='Five out of five'>
                                            <span aria-hidden='true'>★★★★★</span>
                                        </div>
                                        <p className='lp__quote'>“{review.quote}”</p>
                                    </article>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                <div className='lp__carousel-dots'>
                    {Array.from({ length: pages }).map((_, index) => (
                        <button
                            key={index}
                            type='button'
                            className={'lp__dot' + (index === page ? ' is-active' : '')}
                            aria-label={'Go to review page ' + (index + 1)}
                            aria-current={index === page}
                            onClick={() => setPage(index)}
                        />
                    ))}
                </div>
                <p className='lp__carousel-status sr-only' aria-live='polite'>
                    Showing reviews for {pageItems.map(review => review.name).join(', ')}
                </p>
            </section>

            {/* --------------------------------- faq ------------------------------ */}
            <section className='lp__section' id='lp-faq'>
                <div className='lp__section-head' data-reveal>
                    <span className='lp__num' aria-hidden='true'>
                        04
                    </span>
                    <div>
                        <span className='lp__eyebrow'>Questions</span>
                        <h2 className='lp__h2'>
                            The things people <em>actually</em> ask.
                        </h2>
                    </div>
                </div>

                <div className='lp__faq'>
                    {FAQ.map((item, index) => {
                        const open = openFaq === index;
                        return (
                            <div className={'lp__faq-item' + (open ? ' is-open' : '')} key={item.q} data-reveal>
                                <button
                                    type='button'
                                    className='lp__faq-q'
                                    aria-expanded={open}
                                    aria-controls={'lp-faq-' + index}
                                    onClick={() => setOpenFaq(open ? null : index)}
                                >
                                    <span>{item.q}</span>
                                    <span className='lp__faq-icon' aria-hidden='true' />
                                </button>
                                <div className='lp__faq-a' id={'lp-faq-' + index} aria-hidden={!open}>
                                    <div>
                                        <p>{item.a}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* -------------------------------- final ----------------------------- */}
            <section className='lp__final'>
                <div className='lp__final-inner' data-reveal>
                    <span className='lp__eyebrow'>Ready when you are</span>
                    <h2 className='lp__h2 lp__h2--xl'>
                        Open the desk. <em>Keep the discipline.</em>
                    </h2>
                    <p className='lp__lead'>
                        Free to start, demo by default, and every limit is yours to set.
                    </p>
                    <div className='lp__hero-cta lp__hero-cta--center'>
                        <button
                            type='button'
                            className='lp__btn lp__btn--gold'
                            onClick={isLoggedIn ? enter : () => beginAuth('signup')}
                            disabled={busy !== null}
                        >
                            {isLoggedIn ? 'Open the workspace' : 'Create free account'}
                            <IconArrow />
                        </button>
                        <button type='button' className='lp__btn lp__btn--ghost' onClick={onSecondaryAuth}>
                            {secondaryAuthLabel}
                        </button>
                    </div>
                </div>

                <footer className='lp__footer'>
                    <div className='lp__footer-grid'>
                        <div className='lp__footer-brand'>
                            <span className='lp__brand-word'>
                                TradingHubs<span>.site</span>
                            </span>
                            <p>
                                A quiet, professional workspace for Deriv synthetic indices. Built for people who
                                would rather follow a plan than a hunch.
                            </p>
                        </div>
                        <div className='lp__footer-col'>
                            <h4>Product</h4>
                            <button type='button' onClick={() => goTo('lp-how')}>
                                How it works
                            </button>
                            <button type='button' onClick={() => goTo('lp-bots')}>
                                Bot library
                            </button>
                            <button type='button' onClick={() => goTo('lp-course')}>
                                Free course
                            </button>
                        </div>
                        <div className='lp__footer-col'>
                            <h4>Support</h4>
                            <button type='button' onClick={() => goTo('lp-faq')}>
                                FAQ
                            </button>
                            <a href='https://deriv.com' target='_blank' rel='noreferrer noopener'>
                                Deriv.com
                            </a>
                            <a href='https://developers.deriv.com' target='_blank' rel='noreferrer noopener'>
                                Deriv API docs
                            </a>
                        </div>
                        <div className='lp__footer-col'>
                            <h4>Legal</h4>
                            <span>Risk disclosure</span>
                            <span>Terms of use</span>
                            <span>Privacy</span>
                        </div>
                    </div>

                    <div className='lp__footer-base'>
                        <span>© 2026 TradingHubs.site · Powered by Deriv</span>
                        <span className='lp__footer-risk'>
                            Trading synthetic indices carries a risk of loss. Past performance is not a guide to future
                            results.
                        </span>
                        <button
                            type='button'
                            className='lp__to-top'
                            aria-label='Back to top'
                            onClick={() => goTo('lp-hero')}
                        >
                            <IconUp />
                        </button>
                    </div>
                </footer>
            </section>
        </div>
    );
};

export default Landing;
