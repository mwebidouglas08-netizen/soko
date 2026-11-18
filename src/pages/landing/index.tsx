import { useCallback, useEffect, useRef, useState } from 'react';
import './landing.scss';

/* ============================================================================
 * TradingHubs.site — first-visit landing.
 *
 * Plain by design: one headline, what the workspace does, how it works, the
 * strategy list and straight answers. Nothing here claims something the product
 * does not do — no counters, no live prices, no testimonials.
 * ========================================================================== */

const LANDING_SEEN_KEY = 'mwx_landing_seen';

const FONT_HREF =
    'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap';

const markLandingSeen = () => {
    try {
        window.localStorage.setItem(LANDING_SEEN_KEY, '1');
    } catch {
        /* private mode — the landing simply shows again next time */
    }
};

const NAV = [
    { label: 'How it works', id: 'how' },
    { label: 'Strategies', id: 'strategies' },
    { label: 'FAQ', id: 'faq' },
];

const STEPS = [
    {
        title: 'Sign in with Deriv',
        body: 'One click through Deriv’s own sign-in page. Your password stays with Deriv — we never see it.',
    },
    {
        title: 'Choose a strategy',
        body: 'Open one of the ready-made bots, import an .xml bot you already have, or assemble one from blocks.',
    },
    {
        title: 'Set the limits, then run',
        body: 'Stake, stop-loss and take-profit are yours to set. Start the bot when you are ready.',
    },
];

const FAQ = [
    {
        q: 'Do I need to know how to code?',
        a: 'No. Strategies are assembled from instruction blocks. If you already have a Deriv bot as an .xml file, you can import it instead.',
    },
    {
        q: 'Can I test a bot before it trades?',
        a: 'Yes. Everything runs on a Deriv demo account until you choose otherwise. A strategy only starts when you start it.',
    },
    {
        q: 'What does TradingHubs see of my account?',
        a: 'Sign-in goes through Deriv, so we never receive your password. The workspace reads the account you authorise and places only the trades you start. We never hold your funds.',
    },
    {
        q: 'Which markets are supported?',
        a: 'Deriv synthetic indices, including Volatility 25/75/100, Boom, Crash, Step and Jump indices. They run 24 hours a day, seven days a week.',
    },
    {
        q: 'Is TradingHubs affiliated with Deriv?',
        a: 'No. It is an independent interface that connects to your own Deriv account. It is not a broker and does not give financial advice.',
    },
];

/* --------------------------------- icons --------------------------------- */

const IconArrow = () => (
    <svg className='lp__icon' viewBox='0 0 24 24' aria-hidden='true'>
        <path d='M4 12h15' />
        <path d='M13 6l6 6-6 6' />
    </svg>
);

const IconMenu = () => (
    <svg className='lp__icon' viewBox='0 0 24 24' aria-hidden='true'>
        <path d='M4 7h16M4 12h16M4 17h16' />
    </svg>
);

const IconClose = () => (
    <svg className='lp__icon' viewBox='0 0 24 24' aria-hidden='true'>
        <path d='M6 6l12 12M18 6L6 18' />
    </svg>
);

const IconLibrary = () => (
    <svg className='lp__icon' viewBox='0 0 24 24' aria-hidden='true'>
        <path d='M4 8h6v12H4zM14 4h6v16h-6z' />
        <path d='M4 12h6' />
    </svg>
);

const IconBlocks = () => (
    <svg className='lp__icon' viewBox='0 0 24 24' aria-hidden='true'>
        <rect x='4' y='4' width='7' height='7' rx='1' />
        <rect x='13' y='13' width='7' height='7' rx='1' />
        <path d='M11 7.5h4.5a2 2 0 0 1 2 2V13' />
    </svg>
);

const IconShield = () => (
    <svg className='lp__icon' viewBox='0 0 24 24' aria-hidden='true'>
        <path d='M12 3l7 3v6c0 4.2-2.9 7.7-7 9-4.1-1.3-7-4.8-7-9V6z' />
        <path d='M9 12l2 2 4-4' />
    </svg>
);

const FEATURES = [
    {
        icon: <IconLibrary />,
        title: 'Strategy library',
        body: 'Ready-made Deriv strategies — digit, rise/fall and recovery setups — each opening with its own stake, stop-loss and take-profit.',
    },
    {
        icon: <IconBlocks />,
        title: 'Visual builder',
        body: 'Assemble your own logic from instruction blocks, or import a bot you already built as an .xml file. No code either way.',
    },
    {
        icon: <IconShield />,
        title: 'Demo first',
        body: 'Everything runs on a Deriv demo account until you decide otherwise. Nothing trades until you start it.',
    },
];

const STRATEGIES = [
        'Digit Under',
        'Digit Over',
        'Even / Odd',
        'Boom Sniper',
        'Crash Fade',
        'Speed Scalper',
        'Recovery Ladder'
];

interface LandingProps {
    onEnter: () => void;
    isLoggedIn?: boolean;
}

/* ------------------------------- component ------------------------------- */

const Landing = ({ onEnter, isLoggedIn = false }: LandingProps) => {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [busy, setBusy] = useState<'login' | 'signup' | null>(null);
    const [notice, setNotice] = useState('');
    const [openFaq, setOpenFaq] = useState<number | null>(null);

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

    /* --- navigation ----------------------------------------------------- */
    const goTo = useCallback((id: string) => {
        const root = rootRef.current;
        if (!root) return;
        setMenuOpen(false);
        const node = root.querySelector<HTMLElement>('#' + id);
        if (!node) return;
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const offset = node.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 64;
        root.scrollTo({ top: Math.max(0, offset), behavior: smooth ? 'smooth' : 'auto' });
    }, []);

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
                setNotice('Secure sign-in is not configured on this deployment yet. You can still open the workspace.');
                if (mode === 'signup') enter();
            } catch {
                setNotice('We could not reach the sign-in service. Please try again in a moment.');
            } finally {
                setBusy(null);
            }
        },
        [busy, enter]
    );

    const primaryLabel = isLoggedIn ? 'Open the workspace' : 'Create free account';
    const onPrimary = isLoggedIn ? enter : () => beginAuth('signup');
    const onSecondaryAuth = isLoggedIn ? enter : () => beginAuth('login');

    return (
        <div className='lp' ref={rootRef}>
            <a
                className='lp__skip'
                href='#how'
                onClick={event => {
                    event.preventDefault();
                    goTo('how');
                }}
            >
                Skip to content
            </a>

            <div className='lp__backdrop' aria-hidden='true'>
                <picture>
                    <source media='(max-width: 899px)' srcSet='/static/media/landing-backdrop-mobile.2b7835e5.webp' type='image/webp' />
                    <source media='(min-width: 900px)' srcSet='/static/media/landing-backdrop.1ee716b0.webp' type='image/webp' />
                    <source media='(max-width: 899px)' srcSet='/static/media/landing-backdrop-mobile.2b7835e5.jpg' />
                    <img src='/static/media/landing-backdrop.1ee716b0.jpg' alt='' decoding='async' fetchPriority='high' />
                </picture>
                <span className='lp__veil' />
            </div>

            <header className='lp__topbar'>
                <a
                    className='lp__brand'
                    href='#top'
                    onClick={event => {
                        event.preventDefault();
                        goTo('top');
                    }}
                >
                    <span className='lp__brand-mark' aria-hidden='true' />
                    TradingHubs<span>.site</span>
                </a>

                <nav className='lp__nav' aria-label='Sections'>
                    {NAV.map(item => (
                        <a
                            key={item.id}
                            className='lp__nav-link'
                            href={'#' + item.id}
                            onClick={event => {
                                event.preventDefault();
                                goTo(item.id);
                            }}
                        >
                            {item.label}
                        </a>
                    ))}
                </nav>

                <div className='lp__actions'>
                    <button type='button' className='lp__btn lp__btn--ghost lp__btn--sm' onClick={onSecondaryAuth}>
                        {isLoggedIn ? 'Open workspace' : 'Sign in'}
                    </button>
                    <button
                        type='button'
                        className='lp__btn lp__btn--primary lp__btn--sm'
                        onClick={onPrimary}
                        disabled={busy !== null}
                    >
                        {busy === 'signup' ? 'Opening Deriv…' : primaryLabel}
                    </button>
                    <button
                        type='button'
                        className='lp__menu'
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
                    <nav aria-label='Sections'>
                        {NAV.map(item => (
                            <button key={item.id} type='button' onClick={() => goTo(item.id)}>
                                {item.label}
                            </button>
                        ))}
                    </nav>
                    <button type='button' className='lp__btn lp__btn--primary lp__btn--block' onClick={onPrimary}>
                        {primaryLabel}
                    </button>
                </div>
            )}

            <main>
                <section className='lp__hero' id='top'>
                    <p className='lp__eyebrow'>Automation for Deriv</p>
                    <h1 className='lp__h1'>
                        Run your Deriv strategies <em>without</em> watching the charts.
                    </h1>
                    <p className='lp__lead'>
                        Build a bot from blocks or import one you already have, test it on a demo account, then run it
                        with the stake, stop-loss and take-profit you choose.
                    </p>
                    <div className='lp__cta'>
                        <button
                            type='button'
                            className='lp__btn lp__btn--primary'
                            onClick={onPrimary}
                            disabled={busy !== null}
                        >
                            {busy === 'signup' ? 'Opening Deriv…' : primaryLabel}
                            {busy === null && <IconArrow />}
                        </button>
                        <button type='button' className='lp__btn lp__btn--ghost' onClick={() => goTo('how')}>
                            See how it works
                        </button>
                    </div>
                    {notice && (
                        <p className='lp__notice' role='status'>
                            {notice}
                        </p>
                    )}
                    <p className='lp__note'>Sign in with Deriv · Demo accounts · No card required</p>
                </section>

                <section className='lp__section' id='features'>
                    <h2 className='lp__h2'>What you get</h2>
                    <ul className='lp__features'>
                        {FEATURES.map(item => (
                            <li className='lp__feature' key={item.title}>
                                <span className='lp__feature-icon'>{item.icon}</span>
                                <h3>{item.title}</h3>
                                <p>{item.body}</p>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className='lp__section' id='how'>
                    <h2 className='lp__h2'>How it works</h2>
                    <ol className='lp__steps'>
                        {STEPS.map((step, index) => (
                            <li key={step.title}>
                                <span className='lp__step-n' aria-hidden='true'>
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                                <h3>{step.title}</h3>
                                <p>{step.body}</p>
                            </li>
                        ))}
                    </ol>
                </section>

                <section className='lp__section' id='strategies'>
                    <h2 className='lp__h2'>Strategy library</h2>
                    <p className='lp__section-lead'>
                        Every bot opens with its own numbers, so you can change the stake and limits before anything runs.
                    </p>
                    <ul className='lp__strategies'>
                        {STRATEGIES.map(name => (
                            <li key={name}>{name}</li>
                        ))}
                    </ul>
                </section>

                <section className='lp__section' id='faq'>
                    <h2 className='lp__h2'>Questions</h2>
                    <div className='lp__faq'>
                        {FAQ.map((item, index) => {
                            const open = openFaq === index;
                            return (
                                <div className={'lp__faq-item' + (open ? ' is-open' : '')} key={item.q}>
                                    <h3>
                                        <button
                                            type='button'
                                            aria-expanded={open}
                                            aria-controls={'lp-faq-' + index}
                                            onClick={() => setOpenFaq(open ? null : index)}
                                        >
                                            {item.q}
                                            <span className='lp__faq-icon' aria-hidden='true' />
                                        </button>
                                    </h3>
                                    <div className='lp__faq-a' id={'lp-faq-' + index} hidden={!open}>
                                        <p>{item.a}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className='lp__final'>
                    <h2 className='lp__h2'>Start on a demo account.</h2>
                    <p className='lp__lead'>
                        Nothing to install and nothing to pay. Sign in with Deriv, pick a strategy, and watch it run on
                        demo before it ever sees real money.
                    </p>
                    <button
                        type='button'
                        className='lp__btn lp__btn--primary lp__btn--lg'
                        onClick={onPrimary}
                        disabled={busy !== null}
                    >
                        {primaryLabel}
                        {busy === null && <IconArrow />}
                    </button>
                </section>
            </main>

            <footer className='lp__footer'>
                <div className='lp__footer-top'>
                    <span className='lp__brand'>
                        TradingHubs<span>.site</span>
                    </span>
                    <nav aria-label='Footer'>
                        <a href='https://deriv.com' target='_blank' rel='noreferrer noopener'>
                            Deriv.com
                        </a>
                        <a href='https://developers.deriv.com' target='_blank' rel='noreferrer noopener'>
                            API documentation
                        </a>
                        <button type='button' onClick={() => goTo('faq')}>
                            FAQ
                        </button>
                    </nav>
                </div>
                <p className='lp__risk'>
                    TradingHubs is an independent interface for Deriv accounts. It is not a broker and does not give
                    financial advice. Trading synthetic indices carries risk — never trade money you cannot afford to
                    lose.
                </p>
            </footer>
        </div>
    );
};

export default Landing;
