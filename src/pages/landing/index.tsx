import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { HubViewId } from '@/components/hub-sidebar';
import { generateOAuthURL } from '@/components/shared';
import {
    BOT_FILTERS,
    BOT_LIBRARY,
    COURSE,
    FAQ,
    LANDING_MARKETS,
    NAV_LINKS,
    STATS,
    STEPS,
    TILES,
    type LandingBot,
    type TileIcon,
} from './data';
import { TAPE_MARKETS, formatPrice, quoteChange, useMarketTape, type TapeQuote } from './market-tape';
import './landing.scss';

/* -------------------------------------------------------------------------- */
/*  First-visit gate                                                          */
/* -------------------------------------------------------------------------- */

/** Bumped whenever the page is redesigned, so returning visitors see it once. */
const LANDING_SEEN_KEY = 'mwx_landing_seen_v2';

export const hasSeenLanding = (): boolean => {
    try {
        return localStorage.getItem(LANDING_SEEN_KEY) === '1';
    } catch {
        return false;
    }
};

export const markLandingSeen = (): void => {
    try {
        localStorage.setItem(LANDING_SEEN_KEY, '1');
    } catch {
        /* private mode — the page simply shows again next visit */
    }
};

/* -------------------------------------------------------------------------- */
/*  Small utilities                                                           */
/* -------------------------------------------------------------------------- */

const reducedMotion = (): boolean =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

const STATUS_COPY: Record<string, string> = {
    connecting: 'Connecting',
    live: 'Live feed',
    demo: 'Demo feed',
};

const FONT_HREF =
    'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap';

/** The app ships no display face, so the front page loads its own — once. */
const useLandingFonts = () => {
    useEffect(() => {
        const id = 'lp-fonts';
        if (document.getElementById(id)) return;
        const preconnect = document.createElement('link');
        preconnect.rel = 'preconnect';
        preconnect.href = 'https://fonts.gstatic.com';
        preconnect.crossOrigin = 'anonymous';
        const sheet = document.createElement('link');
        sheet.id = id;
        sheet.rel = 'stylesheet';
        sheet.href = FONT_HREF;
        document.head.appendChild(preconnect);
        document.head.appendChild(sheet);
    }, []);
};

/* -------------------------------------------------------------------------- */
/*  Icons — stroke SVGs, no emoji                                             */
/* -------------------------------------------------------------------------- */

type IconName = TileIcon | 'arrow' | 'check' | 'menu' | 'close' | 'up' | 'shield';

const Icon = ({ name, size = 22 }: { name: IconName; size?: number }) => {
    const paths: Record<IconName, ReactNode> = {
        builder: (
            <>
                <rect x='3' y='3' width='7' height='7' rx='1.5' />
                <rect x='14' y='14' width='7' height='7' rx='1.5' />
                <path d='M10 6.5h3.5A3.5 3.5 0 0 1 17 10v4' />
                <path d='M6.5 10v3.5A3.5 3.5 0 0 0 10 17h4' />
            </>
        ),
        radar: (
            <>
                <circle cx='12' cy='12' r='8.5' />
                <circle cx='12' cy='12' r='4' />
                <path d='M12 12 18 6' />
                <path d='M12 3.5V6' />
            </>
        ),
        analysis: (
            <>
                <path d='M3 20h18' />
                <path d='M6.5 20v-6' />
                <path d='M12 20V7' />
                <path d='M17.5 20v-9' />
                <path d='M4.5 9.5 10 4l3.8 2.6L20 3.5' />
            </>
        ),
        monitor: (
            <>
                <rect x='2.5' y='3.5' width='19' height='13' rx='2' />
                <path d='M8.5 20.5h7' />
                <path d='M12 16.5v4' />
                <path d='M6.5 12.5 9.5 9l2.5 2.4L15.5 7l2 2' />
            </>
        ),
        copy: (
            <>
                <rect x='8.5' y='8.5' width='12' height='12' rx='2' />
                <path d='M15.5 8.5V5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3' />
            </>
        ),
        speed: <path d='M13.5 2.5 4.5 13.5h5.5l-1 8 9.5-11h-5.5z' />,
        arrow: (
            <>
                <path d='M4 12h15' />
                <path d='M13 6l6 6-6 6' />
            </>
        ),
        check: <path d='M4.5 12.5 9.5 17.5 19.5 6.5' />,
        menu: (
            <>
                <path d='M3.5 7h17' />
                <path d='M3.5 12h17' />
                <path d='M3.5 17h11' />
            </>
        ),
        close: (
            <>
                <path d='M6 6l12 12' />
                <path d='M18 6 6 18' />
            </>
        ),
        up: (
            <>
                <path d='M12 19V5' />
                <path d='M6 11l6-6 6 6' />
            </>
        ),
        shield: (
            <>
                <path d='M12 2.8 20 6v6c0 4.4-3.2 7.7-8 9.2C7.2 19.7 4 16.4 4 12V6z' />
                <path d='M8.8 12.1 11.3 14.6 15.5 9.8' />
            </>
        ),
    };

    return (
        <svg
            width={size}
            height={size}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth={1.5}
            strokeLinecap='round'
            strokeLinejoin='round'
            aria-hidden='true'
            focusable='false'
        >
            {paths[name]}
        </svg>
    );
};

/* -------------------------------------------------------------------------- */
/*  Motion helpers                                                            */
/* -------------------------------------------------------------------------- */

/** Adds `.is-in` to every `[data-reveal]` in the landing once it scrolls in. */
const useReveal = (rootRef: { current: HTMLDivElement | null }, deps: unknown[] = []) => {
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
        if (reducedMotion() || typeof IntersectionObserver === 'undefined') {
            targets.forEach(node => node.classList.add('is-in'));
            return;
        }
        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('is-in');
                    observer.unobserve(entry.target);
                });
            },
            { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
        );
        targets.forEach(node => {
            if (!node.classList.contains('is-in')) observer.observe(node);
        });
        return () => observer.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
};

const CountUp = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
    const ref = useRef<HTMLSpanElement | null>(null);
    const [shown, setShown] = useState(() => (reducedMotion() ? value : 0));

    useEffect(() => {
        const node = ref.current;
        if (!node || reducedMotion() || typeof IntersectionObserver === 'undefined') {
            setShown(value);
            return;
        }
        let frame = 0;
        const observer = new IntersectionObserver(
            entries => {
                if (!entries.some(entry => entry.isIntersecting)) return;
                observer.disconnect();
                const started = performance.now();
                const run = (now: number) => {
                    const t = Math.min((now - started) / 1100, 1);
                    const eased = 1 - Math.pow(1 - t, 3);
                    setShown(Math.round(value * eased));
                    if (t < 1) frame = requestAnimationFrame(run);
                };
                frame = requestAnimationFrame(run);
            },
            { threshold: 0.4 }
        );
        observer.observe(node);
        return () => {
            observer.disconnect();
            cancelAnimationFrame(frame);
        };
    }, [value]);

    return (
        <span ref={ref} className='lp-proof__num'>
            {shown}
            {suffix}
        </span>
    );
};

/* -------------------------------------------------------------------------- */
/*  Live tick chart                                                           */
/* -------------------------------------------------------------------------- */

const Spark = ({ history, up }: { history: number[]; up: boolean }) => {
    const width = 560;
    const height = 190;
    const pad = 10;

    const { line, area, lastX, lastY, gridY } = useMemo(() => {
        const points = history.filter(price => Number.isFinite(price));
        if (points.length < 2) {
            return { line: '', area: '', lastX: width, lastY: height / 2, gridY: [0.25, 0.5, 0.75] };
        }
        const min = Math.min(...points);
        const max = Math.max(...points);
        const span = max - min || Math.max(max * 0.0004, 0.0001);
        const stepX = (width - pad * 2) / (points.length - 1);
        const coords = points.map((price, index) => {
            const x = pad + index * stepX;
            const y = pad + (height - pad * 2) * (1 - (price - min) / span);
            return [x, y] as const;
        });
        const path = coords.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
        const [lx, ly] = coords[coords.length - 1];
        return {
            line: path,
            area: `${path} L${lx.toFixed(2)} ${height} L${coords[0][0].toFixed(2)} ${height} Z`,
            lastX: lx,
            lastY: ly,
            gridY: [0.25, 0.5, 0.75],
        };
    }, [history]);

    const stroke = up ? 'var(--lp-jade)' : 'var(--lp-coral)';

    return (
        <svg
            className='lp-spark'
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio='none'
            role='img'
            aria-label='Live price chart'
        >
            <defs>
                <linearGradient id='lp-spark-fill' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor={stroke} stopOpacity='0.28' />
                    <stop offset='100%' stopColor={stroke} stopOpacity='0' />
                </linearGradient>
            </defs>
            {gridY.map(ratio => (
                <line key={ratio} x1='0' x2={width} y1={height * ratio} y2={height * ratio} className='lp-spark__grid' />
            ))}
            {area && <path d={area} fill='url(#lp-spark-fill)' />}
            {line && (
                <path d={line} fill='none' stroke={stroke} strokeWidth='2' strokeLinejoin='round' strokeLinecap='round' />
            )}
            {line && (
                <>
                    <circle cx={lastX} cy={lastY} r='9' fill={stroke} opacity='0.16' className='lp-spark__pulse' />
                    <circle cx={lastX} cy={lastY} r='3.4' fill={stroke} />
                </>
            )}
        </svg>
    );
};

/* -------------------------------------------------------------------------- */
/*  Horizontal scroller with drag + arrows                                    */
/* -------------------------------------------------------------------------- */

const useDragScroll = () => {
    const ref = useRef<HTMLDivElement | null>(null);
    const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });

    const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.pointerType === 'touch') return; // native touch scrolling is smoother
        const node = event.currentTarget;
        drag.current = { active: true, startX: event.clientX, startLeft: node.scrollLeft, moved: false };
        node.classList.add('is-dragging');
    };

    const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!drag.current.active) return;
        const dx = event.clientX - drag.current.startX;
        if (Math.abs(dx) > 4) drag.current.moved = true;
        event.currentTarget.scrollLeft = drag.current.startLeft - dx;
    };

    const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!drag.current.active) return;
        drag.current.active = false;
        event.currentTarget.classList.remove('is-dragging');
    };

    const nudge = (direction: 1 | -1) => {
        const node = ref.current;
        if (!node) return;
        node.scrollBy({
            left: direction * Math.max(260, Math.min(node.clientWidth * 0.8, 460)),
            behavior: reducedMotion() ? 'auto' : 'smooth',
        });
    };

    /** Suppress the click that follows a drag, so cards do not fire on swipe. */
    const shouldIgnoreClick = () => drag.current.moved;

    return {
        ref,
        onPointerDown,
        onPointerMove,
        onPointerUp: endDrag,
        onPointerLeave: endDrag,
        nudge,
        shouldIgnoreClick,
    };
};

/* -------------------------------------------------------------------------- */
/*  Landing                                                                   */
/* -------------------------------------------------------------------------- */

interface LandingProps {
    onEnter: (view?: HubViewId) => void;
}

const Landing = ({ onEnter }: LandingProps) => {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const { quotes, status } = useMarketTape();
    const [heroSymbol, setHeroSymbol] = useState<string>(TAPE_MARKETS[0].symbol);
    const [leaving, setLeaving] = useState(false);
    const [progress, setProgress] = useState(0);
    const [condensed, setCondensed] = useState(false);
    const [activeSection, setActiveSection] = useState<string>('');
    const [navOpen, setNavOpen] = useState(false);
    const [authBusy, setAuthBusy] = useState<'login' | 'signup' | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);
    const [botFilter, setBotFilter] = useState<(typeof BOT_FILTERS)[number]>('All');
    const [courseIndex, setCourseIndex] = useState(0);
    const [faqOpen, setFaqOpen] = useState<number | null>(0);

    const markets = useDragScroll();
    const bots = useDragScroll();

    useLandingFonts();
    useReveal(rootRef, [botFilter, courseIndex]);

    const heroQuote: TapeQuote | undefined = quotes[heroSymbol] ?? quotes[TAPE_MARKETS[0].symbol];
    const heroChange = heroQuote ? quoteChange(heroQuote) : 0;

    const tapeItems = useMemo(
        () => TAPE_MARKETS.map(market => quotes[market.symbol]).filter((quote): quote is TapeQuote => Boolean(quote)),
        [quotes]
    );

    const botCards = useMemo(
        () => (botFilter === 'All' ? BOT_LIBRARY : BOT_LIBRARY.filter(bot => bot.family === botFilter)),
        [botFilter]
    );

    /* ---------------------------- page chrome ---------------------------- */

    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.classList.add('lp-open');
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.classList.remove('lp-open');
            document.body.style.overflow = previous;
        };
    }, []);

    useEffect(() => {
        if (!navOpen) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setNavOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [navOpen]);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        let frame = 0;
        const onScroll = () => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                const max = root.scrollHeight - root.clientHeight;
                setProgress(max > 0 ? Math.min(root.scrollTop / max, 1) : 0);
                setCondensed(root.scrollTop > 24);
                let current = '';
                NAV_LINKS.forEach(link => {
                    const node = document.getElementById(link.id);
                    if (!node) return;
                    const top = node.getBoundingClientRect().top - root.getBoundingClientRect().top;
                    if (top <= 140) current = link.id;
                });
                setActiveSection(current);
            });
        };
        root.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => {
            root.removeEventListener('scroll', onScroll);
            if (frame) cancelAnimationFrame(frame);
        };
    }, []);

    const scrollTo = useCallback((id: string) => {
        const root = rootRef.current;
        const target = document.getElementById(id);
        if (!root || !target) return;
        setNavOpen(false);
        const offset = target.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 64;
        root.scrollTo({ top: offset, behavior: reducedMotion() ? 'auto' : 'smooth' });
    }, []);

    const enterWorkspace = useCallback(
        (view?: HubViewId) => {
            markLandingSeen();
            if (reducedMotion()) {
                onEnter(view);
                return;
            }
            setLeaving(true);
            window.setTimeout(() => onEnter(view), 300);
        },
        [onEnter]
    );

    const startAuth = useCallback(
        async (kind: 'login' | 'signup') => {
            if (authBusy) return;
            setAuthError(null);
            setAuthBusy(kind);
            try {
                const url = await generateOAuthURL(kind === 'signup' ? 'registration' : undefined);
                if (!url) {
                    setAuthError(
                        'Sign-in is not configured for this deployment yet — you can still explore the workspace.'
                    );
                    setAuthBusy(null);
                    return;
                }
                window.location.assign(url);
            } catch {
                setAuthError('We could not reach Deriv just now. Please try again in a moment.');
                setAuthBusy(null);
            }
        },
        [authBusy]
    );

    const openBot = (bot: LandingBot) => {
        if (bots.shouldIgnoreClick()) return;
        enterWorkspace('bots-catalog');
    };

    /* -------------------------------- render ------------------------------ */

    return (
        <div className={`lp ${leaving ? 'lp--leaving' : ''}`} ref={rootRef}>
            <div className='lp-progress' aria-hidden='true'>
                <span style={{ transform: `scaleX(${progress})` }} />
            </div>

            <header className={`lp-bar ${condensed ? 'is-condensed' : ''}`}>
                <button
                    type='button'
                    className='lp-brand'
                    onClick={() => scrollTo('lp-top')}
                    aria-label='TradingHubs — back to top'
                >
                    <span className='lp-brand__mark' aria-hidden='true'>
                        <svg viewBox='0 0 28 28' fill='none'>
                            <path d='M14 2.5 24 8v12L14 25.5 4 20V8z' stroke='currentColor' strokeWidth='1.4' />
                            <path
                                d='M9 18.5V13l3.5 2.6L17 10l2 4.6'
                                stroke='currentColor'
                                strokeWidth='1.6'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                            />
                        </svg>
                    </span>
                    <span className='lp-brand__word'>
                        TradingHubs<span>.site</span>
                    </span>
                </button>

                <nav className='lp-nav' aria-label='Sections'>
                    {NAV_LINKS.map(link => (
                        <button
                            key={link.id}
                            type='button'
                            className={`lp-nav__link ${activeSection === link.id ? 'is-active' : ''}`}
                            onClick={() => scrollTo(link.id)}
                        >
                            {link.label}
                        </button>
                    ))}
                </nav>

                <div className='lp-bar__actions'>
                    <span className={`lp-pill lp-pill--${status}`}>
                        <i aria-hidden='true' />
                        {STATUS_COPY[status] ?? 'Feed'}
                    </span>
                    <button
                        type='button'
                        className='lp-btn lp-btn--quiet'
                        onClick={() => startAuth('login')}
                        disabled={authBusy === 'login'}
                    >
                        {authBusy === 'login' ? 'Opening…' : 'Log in'}
                    </button>
                    <button
                        type='button'
                        className='lp-btn lp-btn--gold'
                        onClick={() => startAuth('signup')}
                        disabled={authBusy === 'signup'}
                    >
                        {authBusy === 'signup' ? 'Opening…' : 'Create account'}
                        <Icon name='arrow' size={16} />
                    </button>
                    <button
                        type='button'
                        className='lp-burger'
                        onClick={() => setNavOpen(open => !open)}
                        aria-expanded={navOpen}
                        aria-label={navOpen ? 'Close menu' : 'Open menu'}
                    >
                        <Icon name={navOpen ? 'close' : 'menu'} size={20} />
                    </button>
                </div>
            </header>

            {navOpen && (
                <div className='lp-drawer' role='dialog' aria-modal='true' aria-label='Menu'>
                    <div className='lp-drawer__inner'>
                        <p className='lp-drawer__eyebrow'>Navigate</p>
                        {NAV_LINKS.map(link => (
                            <button key={link.id} type='button' className='lp-drawer__link' onClick={() => scrollTo(link.id)}>
                                {link.label}
                                <Icon name='arrow' size={18} />
                            </button>
                        ))}
                        <div className='lp-drawer__actions'>
                            <button type='button' className='lp-btn lp-btn--outline' onClick={() => startAuth('login')}>
                                Log in
                            </button>
                            <button type='button' className='lp-btn lp-btn--gold' onClick={() => startAuth('signup')}>
                                Create free account
                            </button>
                        </div>
                        <button type='button' className='lp-btn lp-btn--ghost' onClick={() => enterWorkspace('dashboard')}>
                            Explore the workspace first
                        </button>
                    </div>
                </div>
            )}

            <main>
                {/* ------------------------------- Hero ------------------------------- */}
                <section className='lp-hero' id='lp-top'>
                    <div className='lp-hero__grid' aria-hidden='true' />
                    <div className='lp-hero__glow' aria-hidden='true' />

                    <div className='lp-hero__inner'>
                        <div className='lp-hero__copy'>
                            <p className='lp-kicker lp-in' style={{ animationDelay: '40ms' }}>
                                <i aria-hidden='true' />
                                Deriv synthetic indices · open 24/7
                            </p>

                            <h1 className='lp-hero__title'>
                                <span className='lp-hero__line lp-in' style={{ animationDelay: '120ms' }}>
                                    Build the bot.
                                </span>
                                <span className='lp-hero__line lp-hero__line--accent lp-in' style={{ animationDelay: '220ms' }}>
                                    Keep the edge.
                                </span>
                            </h1>

                            <p className='lp-hero__sub lp-in' style={{ animationDelay: '320ms' }}>
                                A visual bot builder, twenty-three ready-made strategies and a live digit scanner for
                                Deriv&rsquo;s synthetic indices. No code, no card &mdash; and everything runs on demo first.
                            </p>

                            <div className='lp-hero__cta lp-in' style={{ animationDelay: '400ms' }}>
                                <button type='button' className='lp-btn lp-btn--gold lp-btn--lg' onClick={() => startAuth('signup')}>
                                    Create free account
                                    <Icon name='arrow' size={18} />
                                </button>
                                <button
                                    type='button'
                                    className='lp-btn lp-btn--outline lp-btn--lg'
                                    onClick={() => enterWorkspace('dashboard')}
                                >
                                    Explore the workspace
                                </button>
                            </div>

                            <ul className='lp-hero__trust lp-in' style={{ animationDelay: '480ms' }}>
                                <li>
                                    <Icon name='shield' size={15} /> Deriv OAuth
                                </li>
                                <li>Demo first</li>
                                <li>No card needed</li>
                            </ul>
                        </div>

                        {heroQuote && (
                            <div className='lp-terminal lp-in' style={{ animationDelay: '300ms' }}>
                                <div className='lp-terminal__head'>
                                    <div>
                                        <p className='lp-terminal__name'>{heroQuote.label}</p>
                                        <p className='lp-terminal__meta'>Synthetic index · 24/7</p>
                                    </div>
                                    <span className={`lp-pill lp-pill--${status}`}>
                                        <i aria-hidden='true' />
                                        {STATUS_COPY[status] ?? 'Feed'}
                                    </span>
                                </div>

                                <div className='lp-terminal__price'>
                                    <strong>{formatPrice(heroQuote.price, heroQuote.pipSize)}</strong>
                                    <span className={heroChange >= 0 ? 'is-up' : 'is-down'}>
                                        <Icon name='up' size={13} />
                                        {heroChange >= 0 ? '+' : ''}
                                        {heroChange.toFixed(2)}%
                                    </span>
                                </div>

                                <div className='lp-terminal__chart'>
                                    <Spark history={heroQuote.history} up={heroChange >= 0} />
                                </div>

                                <div className='lp-terminal__chips' role='tablist' aria-label='Choose a market'>
                                    {TAPE_MARKETS.map(market => (
                                        <button
                                            key={market.symbol}
                                            type='button'
                                            role='tab'
                                            aria-selected={market.symbol === heroSymbol}
                                            className={`lp-chip ${market.symbol === heroSymbol ? 'is-active' : ''}`}
                                            onClick={() => setHeroSymbol(market.symbol)}
                                        >
                                            {market.short}
                                        </button>
                                    ))}
                                </div>

                                <div className='lp-terminal__foot'>
                                    <div className='lp-digits'>
                                        <span className='lp-digits__label'>Last 10 digits</span>
                                        <div className='lp-digits__row'>
                                            {heroQuote.digits.map((digit, index) => (
                                                <b
                                                    key={`${index}-${digit}`}
                                                    className={index === heroQuote.digits.length - 1 ? 'is-last' : ''}
                                                >
                                                    {digit}
                                                </b>
                                            ))}
                                        </div>
                                    </div>
                                    <p className='lp-terminal__note'>Public feed · no login required</p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* ------------------------------- Tape ------------------------------- */}
                <div className='lp-tape' aria-label='Live market tape'>
                    <div className='lp-tape__track'>
                        <div className='lp-tape__run'>
                            {[...tapeItems, ...tapeItems].map((quote, index) => {
                                const change = quoteChange(quote);
                                return (
                                    <button
                                        key={`${quote.symbol}-${index}`}
                                        type='button'
                                        className='lp-tape__item'
                                        onClick={() => {
                                            setHeroSymbol(quote.symbol);
                                            scrollTo('lp-top');
                                        }}
                                        tabIndex={index < tapeItems.length ? 0 : -1}
                                        aria-hidden={index >= tapeItems.length}
                                    >
                                        <span className='lp-tape__sym'>{quote.short}</span>
                                        <span className='lp-tape__price'>{formatPrice(quote.price, quote.pipSize)}</span>
                                        <span className={`lp-tape__chg ${change >= 0 ? 'is-up' : 'is-down'}`}>
                                            {change >= 0 ? '+' : ''}
                                            {change.toFixed(2)}%
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ------------------------------ Proof ------------------------------ */}
                <section className='lp-proof' data-reveal>
                    {STATS.map(stat => (
                        <div key={stat.label} className='lp-proof__cell'>
                            <CountUp value={stat.value} suffix={stat.suffix} />
                            <span className='lp-proof__label'>{stat.label}</span>
                        </div>
                    ))}
                </section>

                {/* ---------------------------- How it works ---------------------------- */}
                <section className='lp-section' id='lp-how'>
                    <div className='lp-section__inner lp-section__inner--split'>
                        <div className='lp-section__aside' data-reveal>
                            <p className='lp-eyebrow'>How it works</p>
                            <h2 className='lp-title'>
                                Three steps from
                                <br />
                                <em>sign-up to a running bot.</em>
                            </h2>
                            <p className='lp-lede'>
                                The workspace is already built. You bring a Deriv login and a plan; the page you are on stops
                                being the interesting part.
                            </p>
                            <button type='button' className='lp-link' onClick={() => startAuth('signup')}>
                                Start with a demo account <Icon name='arrow' size={16} />
                            </button>
                        </div>

                        <ol className='lp-steps'>
                            {STEPS.map((step, index) => (
                                <li key={step.n} className='lp-step' data-reveal style={{ transitionDelay: `${index * 90}ms` }}>
                                    <span className='lp-step__n'>{step.n}</span>
                                    <div className='lp-step__body'>
                                        <h3 className='lp-step__title'>{step.title}</h3>
                                        <p className='lp-step__text'>{step.body}</p>
                                        <p className='lp-step__detail'>{step.detail}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* ----------------------------- Bot library ----------------------------- */}
                <section className='lp-section lp-section--raised' id='lp-bots'>
                    <div className='lp-section__inner'>
                        <div className='lp-section__head' data-reveal>
                            <div>
                                <p className='lp-eyebrow'>Bot library</p>
                                <h2 className='lp-title'>
                                    Strategies you can run <em>tonight.</em>
                                </h2>
                            </div>
                            <div className='lp-filters' role='group' aria-label='Filter bots'>
                                {BOT_FILTERS.map(filter => (
                                    <button
                                        key={filter}
                                        type='button'
                                        className={`lp-filter ${botFilter === filter ? 'is-active' : ''}`}
                                        onClick={() => setBotFilter(filter)}
                                        aria-pressed={botFilter === filter}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div
                            className='lp-bots'
                            ref={bots.ref}
                            onPointerDown={bots.onPointerDown}
                            onPointerMove={bots.onPointerMove}
                            onPointerUp={bots.onPointerUp}
                            onPointerLeave={bots.onPointerLeave}
                        >
                            {botCards.map((bot, index) => (
                                <article
                                    key={bot.name}
                                    className='lp-bot'
                                    style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
                                    onClick={() => openBot(bot)}
                                    onKeyDown={event => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            openBot(bot);
                                        }
                                    }}
                                    role='button'
                                    tabIndex={0}
                                    aria-label={`Open ${bot.name} in the bot catalog`}
                                >
                                    <div className='lp-bot__top'>
                                        <span className={`lp-bot__tag ${bot.family === 'Premium' ? 'is-premium' : ''}`}>
                                            {bot.tag}
                                        </span>
                                        <span className='lp-bot__arrow'>
                                            <Icon name='arrow' size={16} />
                                        </span>
                                    </div>
                                    <h3 className='lp-bot__name'>{bot.name}</h3>
                                    <p className='lp-bot__desc'>{bot.desc}</p>
                                </article>
                            ))}
                        </div>

                        <div className='lp-strip__nav' data-reveal>
                            <span className='lp-strip__hint'>Drag or swipe to browse · {botCards.length} strategies</span>
                            <div className='lp-strip__arrows'>
                                <button type='button' onClick={() => bots.nudge(-1)} aria-label='Previous bots'>
                                    <Icon name='arrow' size={18} />
                                </button>
                                <button type='button' onClick={() => bots.nudge(1)} aria-label='Next bots'>
                                    <Icon name='arrow' size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ------------------------------ Platform ------------------------------ */}
                <section className='lp-section' id='lp-platform'>
                    <div className='lp-section__inner'>
                        <div className='lp-section__head' data-reveal>
                            <div>
                                <p className='lp-eyebrow'>The platform</p>
                                <h2 className='lp-title'>
                                    A full desk, <em>not a single button.</em>
                                </h2>
                            </div>
                            <p className='lp-lede lp-lede--right'>
                                Builder, scanner, chart, monitor and journal share one workspace, one login and one set of
                                limits.
                            </p>
                        </div>

                        <div className='lp-tiles'>
                            {TILES.map((tile, index) => (
                                <article
                                    key={tile.title}
                                    className={`lp-tile ${tile.span ? `lp-tile--${tile.span}` : ''}`}
                                    data-reveal
                                    style={{ transitionDelay: `${index * 70}ms` }}
                                >
                                    <span className='lp-tile__icon'>
                                        <Icon name={tile.icon} />
                                    </span>
                                    <h3 className='lp-tile__title'>{tile.title}</h3>
                                    <p className='lp-tile__body'>{tile.body}</p>
                                    <span className='lp-tile__meta'>{tile.meta}</span>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ------------------------------ Markets ------------------------------ */}
                <section className='lp-section lp-section--raised' id='lp-markets'>
                    <div className='lp-section__inner'>
                        <div className='lp-section__head' data-reveal>
                            <div>
                                <p className='lp-eyebrow'>The instruments</p>
                                <h2 className='lp-title'>
                                    Ten tapes, <em>one clock.</em>
                                </h2>
                            </div>
                            <p className='lp-lede lp-lede--right'>
                                Synthetic indices are generated continuously, so there is no open or close — and no gap risk
                                from a weekend headline.
                            </p>
                        </div>

                        <div
                            className='lp-markets'
                            ref={markets.ref}
                            onPointerDown={markets.onPointerDown}
                            onPointerMove={markets.onPointerMove}
                            onPointerUp={markets.onPointerUp}
                            onPointerLeave={markets.onPointerLeave}
                        >
                            {LANDING_MARKETS.map((market, index) => {
                                const quote = quotes[market.symbol];
                                const change = quote ? quoteChange(quote) : 0;
                                return (
                                    <article
                                        key={market.symbol}
                                        className='lp-market'
                                        style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                                    >
                                        <div className='lp-market__top'>
                                            <h3 className='lp-market__name'>{market.name}</h3>
                                            <span className='lp-market__kind'>{market.kind}</span>
                                        </div>
                                        <p className='lp-market__note'>{market.note}</p>
                                        <div className='lp-market__foot'>
                                            <span className='lp-market__sym'>{market.symbol}</span>
                                            {quote ? (
                                                <span className={`lp-market__chg ${change >= 0 ? 'is-up' : 'is-down'}`}>
                                                    {change >= 0 ? '+' : ''}
                                                    {change.toFixed(2)}%
                                                </span>
                                            ) : (
                                                <span className='lp-market__sym'>—</span>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>

                        <div className='lp-strip__nav' data-reveal>
                            <span className='lp-strip__hint'>Swipe for the rest of the universe</span>
                            <div className='lp-strip__arrows'>
                                <button type='button' onClick={() => markets.nudge(-1)} aria-label='Previous markets'>
                                    <Icon name='arrow' size={18} />
                                </button>
                                <button type='button' onClick={() => markets.nudge(1)} aria-label='Next markets'>
                                    <Icon name='arrow' size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ------------------------------- Learn ------------------------------- */}
                <section className='lp-section' id='lp-learn'>
                    <div className='lp-section__inner lp-section__inner--split'>
                        <div className='lp-section__aside' data-reveal>
                            <p className='lp-eyebrow'>The course</p>
                            <h2 className='lp-title'>
                                Learn the tape <em>before the stake.</em>
                            </h2>
                            <p className='lp-lede'>
                                Six short lessons, written for someone who has never opened a trading terminal. No upsell, no
                                &ldquo;secret indicator&rdquo;.
                            </p>
                            <ul className='lp-lessons'>
                                {COURSE.map((step, index) => (
                                    <li key={step.n}>
                                        <button
                                            type='button'
                                            className={`lp-lesson ${courseIndex === index ? 'is-active' : ''}`}
                                            onClick={() => setCourseIndex(index)}
                                            aria-current={courseIndex === index}
                                        >
                                            <span className='lp-lesson__n'>{step.n}</span>
                                            <span className='lp-lesson__t'>{step.title}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className='lp-lesson-panel' data-reveal>
                            <div key={courseIndex} className='lp-lesson-panel__body'>
                                <p className='lp-lesson-panel__n'>Lesson {COURSE[courseIndex].n}</p>
                                <h3 className='lp-lesson-panel__title'>{COURSE[courseIndex].title}</h3>
                                <p className='lp-lesson-panel__text'>{COURSE[courseIndex].body}</p>
                                <ul className='lp-lesson-panel__list'>
                                    {COURSE[courseIndex].bullets.map(bullet => (
                                        <li key={bullet}>
                                            <Icon name='check' size={15} />
                                            {bullet}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    type='button'
                                    className='lp-btn lp-btn--outline'
                                    onClick={() => enterWorkspace('dashboard')}
                                >
                                    Open the workspace
                                    <Icon name='arrow' size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* -------------------------------- FAQ -------------------------------- */}
                <section className='lp-section lp-section--raised' id='lp-faq'>
                    <div className='lp-section__inner lp-faq'>
                        <div className='lp-section__head' data-reveal>
                            <div>
                                <p className='lp-eyebrow'>Questions</p>
                                <h2 className='lp-title'>
                                    The honest <em>answers.</em>
                                </h2>
                            </div>
                        </div>

                        <div className='lp-accordion'>
                            {FAQ.map((entry, index) => {
                                const open = faqOpen === index;
                                return (
                                    <div key={entry.q} className={`lp-acc ${open ? 'is-open' : ''}`}>
                                        <button
                                            type='button'
                                            className='lp-acc__q'
                                            onClick={() => setFaqOpen(open ? null : index)}
                                            aria-expanded={open}
                                            aria-controls={`lp-acc-${index}`}
                                        >
                                            <span>{entry.q}</span>
                                            <span className='lp-acc__sign' aria-hidden='true'>
                                                <i />
                                                <i />
                                            </span>
                                        </button>
                                        <div className='lp-acc__a' id={`lp-acc-${index}`} role='region'>
                                            <p>{entry.a}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ------------------------------- Final -------------------------------- */}
                <section className='lp-final'>
                    <div className='lp-final__inner' data-reveal>
                        <p className='lp-eyebrow'>Ready when you are</p>
                        <h2 className='lp-final__title'>
                            Open the desk.
                            <br />
                            <em>Run it on demo.</em>
                        </h2>
                        <p className='lp-final__text'>
                            It takes one Deriv login to reach the workspace, and it costs nothing to watch a strategy behave
                            before you trust it with a real account.
                        </p>
                        <div className='lp-final__cta'>
                            <button type='button' className='lp-btn lp-btn--gold lp-btn--lg' onClick={() => startAuth('signup')}>
                                Create free account
                                <Icon name='arrow' size={18} />
                            </button>
                            <button
                                type='button'
                                className='lp-btn lp-btn--outline lp-btn--lg'
                                onClick={() => enterWorkspace('dashboard')}
                            >
                                Explore first
                            </button>
                        </div>
                        <p className='lp-final__note'>
                            <Icon name='shield' size={14} />
                            Trading involves risk of loss. Synthetic indices are high risk and not suitable for everyone.
                        </p>
                    </div>

                    <footer className='lp-footer'>
                        <div className='lp-footer__brand'>
                            <span className='lp-brand__mark' aria-hidden='true'>
                                <svg viewBox='0 0 28 28' fill='none'>
                                    <path d='M14 2.5 24 8v12L14 25.5 4 20V8z' stroke='currentColor' strokeWidth='1.4' />
                                    <path
                                        d='M9 18.5V13l3.5 2.6L17 10l2 4.6'
                                        stroke='currentColor'
                                        strokeWidth='1.6'
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                    />
                                </svg>
                            </span>
                            <div>
                                <p className='lp-footer__word'>TradingHubs.site</p>
                                <p className='lp-footer__tag'>A visual bot desk for Deriv synthetic indices.</p>
                            </div>
                        </div>

                        <div className='lp-footer__cols'>
                            <div>
                                <p className='lp-footer__head'>Workspace</p>
                                <button type='button' onClick={() => enterWorkspace('bot-builder')}>
                                    Bot builder
                                </button>
                                <button type='button' onClick={() => enterWorkspace('bots-catalog')}>
                                    Bot catalog
                                </button>
                                <button type='button' onClick={() => enterWorkspace('analysis-tools')}>
                                    Analysis tools
                                </button>
                                <button type='button' onClick={() => enterWorkspace('chart')}>
                                    Charts
                                </button>
                            </div>
                            <div>
                                <p className='lp-footer__head'>Learn</p>
                                <button type='button' onClick={() => scrollTo('lp-how')}>
                                    How it works
                                </button>
                                <button type='button' onClick={() => scrollTo('lp-learn')}>
                                    The course
                                </button>
                                <button type='button' onClick={() => scrollTo('lp-bots')}>
                                    Bot library
                                </button>
                                <button type='button' onClick={() => scrollTo('lp-faq')}>
                                    FAQ
                                </button>
                            </div>
                            <div>
                                <p className='lp-footer__head'>Deriv</p>
                                <a href='https://deriv.com' target='_blank' rel='noreferrer noopener'>
                                    Create an account
                                </a>
                                <a href='https://deriv.com/terms-and-conditions' target='_blank' rel='noreferrer noopener'>
                                    Terms
                                </a>
                                <a href='https://deriv.com/responsible-trading' target='_blank' rel='noreferrer noopener'>
                                    Responsible trading
                                </a>
                            </div>
                        </div>

                        <div className='lp-footer__base'>
                            <span>© {new Date().getFullYear()} TradingHubs.site</span>
                            <span>Built on the Deriv API · not trading advice</span>
                        </div>
                    </footer>
                </section>
            </main>

            {authError && (
                <div className='lp-toast' role='alert'>
                    <span>{authError}</span>
                    <button type='button' onClick={() => setAuthError(null)} aria-label='Dismiss'>
                        <Icon name='close' size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default Landing;
