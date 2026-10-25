import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { TickFeed } from '@/bot/deriv/ticks';
import './landing.scss';

/**
 * Dollarvault landing (lp__ structure): sticky topbar with a scroll-progress
 * bar, live market ticker, hero with a REAL live Digit scanner preview, animated
 * stat counters, interactive feature selector, review carousel, course timeline,
 * FAQ accordion and footer — dismissing into the trading hub via onEnter.
 */

const NAV = [
    { label: 'How it works', href: '#lp-how' },
    { label: 'Features', href: '#lp-features' },
    { label: 'Reviews', href: '#lp-reviews' },
    { label: 'Course', href: '#lp-course' },
    { label: 'FAQ', href: '#lp-faq' },
];

const TICKER = [
    { name: 'Volatility 75', chg: '+2.34%', up: true },
    { name: 'Boom 1000 Index', chg: '+1.82%', up: true },
    { name: 'Crash 500 Index', chg: '-0.94%', up: false },
    { name: 'Step Index', chg: '+0.41%', up: true },
    { name: 'Range Break 100', chg: '+1.17%', up: true },
    { name: 'Jump 100 Index', chg: '-0.63%', up: false },
    { name: 'Volatility 25', chg: '+0.88%', up: true },
    { name: 'Bear Market Index', chg: '+2.09%', up: true },
    { name: 'Bull Market Index', chg: '-0.31%', up: false },
    { name: 'Volatility 100', chg: '+3.14%', up: true },
];

const STEPS = [
    {
        n: '01',
        title: 'Create your free account',
        body: 'Sign in with your Deriv account in seconds. No card required, no commitment.',
    },
    {
        n: '02',
        title: 'Pick a bot or build your own',
        body: 'Load a proven strategy from the free bot library, or use the visual bot builder — no coding needed.',
    },
    {
        n: '03',
        title: 'Trade with structure',
        body: 'Run it manually, automate it, or copy a top strategy. Track everything from one workspace.',
    },
];

const STATS = [
    { label: 'Free bot templates', value: 13, suffix: '+' },
    { label: 'Volatility indexes', value: 17, suffix: '' },
    { label: 'Signal families', value: 4, suffix: '' },
    { label: 'Market hours', value: 24, suffix: '/7' },
];

const FEATURES = [
    {
        key: 'bots',
        icon: '📚',
        title: 'Free Bot Library',
        blurb: 'Dozens of proven strategies, ready to load in one click. No coding required.',
        detail:
            'Every template lands in the visual builder with its blocks wired and the Run button armed. Load one, inspect the logic, then tune it.',
        points: ['One-click load into the builder', 'Run button armed on load', 'Inspect and edit every block'],
    },
    {
        key: 'analysis',
        icon: '📊',
        title: 'Live Market Analysis',
        blurb: 'A real-time Deriv scanner across 17 volatility indexes.',
        detail:
            'Even/Odd, Over/Under, Matches/Differs and Rise/Fall — each measured over a strict 15-tick window on live tick data, streaming continuously.',
        points: ['17 indexes, one live feed', 'Strict 15-tick window', 'Auto-reconnect if the feed drops'],
    },
    {
        key: 'manual',
        icon: '🎯',
        title: 'Manual Trader',
        blurb: 'Full control with a live Deriv D-bot digit panel.',
        detail:
            'Watch the digit circles fill in real time, set your barrier, and place the contract yourself — with the same live feed that powers the analysis tool.',
        points: ['Live digit circles', 'Barrier + stake control', 'Demo and real accounts'],
    },
    {
        key: 'copy',
        icon: '🔁',
        title: 'Copy & Bulk Trader',
        blurb: 'Mirror a strategy, or run many stakes at once.',
        detail:
            'Copy a master strategy onto your own account, or fire a batch of contracts and watch every result settle in a single table.',
        points: ['Master → copier mirroring', 'Batch execution with live results', 'Per-run win/loss ledger'],
    },
    {
        key: 'recovery',
        icon: '🧠',
        title: 'Smart AI Recovery',
        blurb: 'AI-driven recovery that respects your session limits.',
        detail:
            'Adapts to losing streaks and selects a recovery path that never breaches your session stop-loss or take-profit.',
        points: ['Adaptive recovery steps', 'Session stop-loss respected', 'Fully configurable'],
    },
    {
        key: 'builder',
        icon: '🛠️',
        title: 'Bot Builder',
        blurb: 'A visual Blockly builder with custom blocks.',
        detail:
            'Drag blocks, add tick-analysis logic, and save your own strategies. Every bot in the library is built with exactly these blocks.',
        points: ['Drag-and-drop Blockly', 'Tick-analysis block family', 'Save and reload your own'],
    },
];

const REVIEWS = [
    { name: 'James Ochieng', quote: 'This platform completely changed how I trade. The free bot library alone is worth it.' },
    { name: 'Amina Hassan', quote: 'The Smart AI recovery bot is absolutely insane. It pulled me out of a bad streak twice.' },
    { name: 'David Mwangi', quote: 'Copy Trader is a game changer. I copy the top performers and learn while I earn.' },
    { name: 'Fatima Al-Rashid', quote: 'The analysis tools here are on another level. The digit circles alone changed my entries.' },
    { name: 'Peter Kamau', quote: 'Speedbot is incredible. It catches signals faster than I can even spot them.' },
    { name: 'Grace Njeri', quote: 'I was a complete beginner. The free course plus the bot builder tutorials got me trading.' },
    { name: 'Emmanuel Owusu', quote: 'The Apex Bot is seriously on another level. It adapts to the market in real time.' },
    { name: 'Mercy Wanjiku', quote: 'The live charts with full technical indicators make me feel like a professional.' },
    { name: 'Ibrahim Diallo', quote: 'Bot Builder is so intuitive. I built a custom Martingale strategy in minutes.' },
    { name: 'Stella Achieng', quote: 'What I love most is everything is in one place. No switching between apps.' },
    { name: 'Kofi Asante', quote: 'The community channel on Telegram led me here and I have never looked back.' },
    { name: 'Priya Sharma', quote: 'Customer support guided me through everything. Within a week I was confident.' },
];

const COURSE = [
    { n: '01', t: 'Introduction to Deriv' },
    { n: '02', t: 'Understanding synthetic indices' },
    { n: '03', t: 'Setting up your workspace' },
    { n: '04', t: 'Reading digit distributions' },
    { n: '05', t: 'Your first bot strategy' },
    { n: '06', t: 'Risk management basics' },
];

const FAQ = [
    {
        q: 'Is Dollarvault free to use?',
        a: 'Yes. The bot library, course and core trading tools are free. You only need a Deriv account to trade.',
    },
    {
        q: 'Do I need to know how to code?',
        a: 'No. Every free bot loads in one click, and the visual Bot Builder lets you build strategies without writing code.',
    },
    {
        q: 'Can I trade on a demo account first?',
        a: 'Absolutely. Start on a Deriv demo account, paper-trade the signals, and go live only when the edge is proven.',
    },
    {
        q: 'What markets can I trade?',
        a: 'Volatility, Boom/Crash, Step, Range Break and Jump indices — synthetic markets that trade 24/7.',
    },
    {
        q: 'How does the Smart AI recovery work?',
        a: 'It analyzes recent outcomes and automatically selects a recovery path that respects your session stop-loss and take-profit.',
    },
    {
        q: 'Is my Deriv account secure?',
        a: 'Yes. We use Deriv OAuth — you log in on Deriv and never share your password with us.',
    },
];

const FEED_LEN = 14;

/** Live Digit scanner preview: a real Deriv tick feed on one index. */
const useLiveDigits = (symbol: string) => {
    const [digits, setDigits] = useState<number[]>([]);
    const [connected, setConnected] = useState(false);
    useEffect(() => {
        const feed = new TickFeed({
            onTick: (_s, _p, series) => setDigits([...series.digits].slice(-FEED_LEN)),
            onStatus: ok => setConnected(ok),
        });
        feed.setSeedCount(90);
        feed.setSymbols([symbol]);
        feed.start();
        return () => feed.stop();
    }, [symbol]);
    return { digits, connected };
};

const useReveal = () => {
    const ref = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const targets = el.querySelectorAll('[data-reveal]');
        const io = new IntersectionObserver(
            entries => {
                entries.forEach(e => {
                    if (e.isIntersecting) {
                        e.target.classList.add('in');
                        io.unobserve(e.target);
                    }
                });
            },
            { threshold: 0.12 }
        );
        targets.forEach(t => io.observe(t));
        return () => io.disconnect();
    }, []);
    return ref;
};

/** Animated 0 → value counter, triggered when scrolled into view. */
const useCountUp = (target: number, duration = 1200) => {
    const ref = useRef<HTMLElement | null>(null);
    const [value, setValue] = useState(0);
    const [go, setGo] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(
            entries => {
                if (entries.some(e => e.isIntersecting)) {
                    setGo(true);
                    io.disconnect();
                }
            },
            { threshold: 0.4 }
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);
    useEffect(() => {
        if (!go) return;
        let raf = 0;
        const start = performance.now();
        const step = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
            if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [go, target, duration]);
    return { ref, value };
};

const Stat = ({ label, value, suffix }: { label: string; value: number; suffix: string }) => {
    const { ref, value: shown } = useCountUp(value);
    return (
        <div className='lp__stat' data-reveal>
            <strong ref={ref as RefObject<HTMLElement>}>
                {shown}
                {suffix}
            </strong>
            <span>{label}</span>
        </div>
    );
};

interface LandingProps {
    onEnter: () => void;
}

const Landing = ({ onEnter }: LandingProps) => {
    const rootRef = useReveal();
    const ticker = useMemo(() => [...TICKER, ...TICKER], []);
    const { digits, connected } = useLiveDigits('R_50');
    const [feature, setFeature] = useState(FEATURES[0].key);
    const [reviewPage, setReviewPage] = useState(0);
    const [perView, setPerView] = useState(3);
    const [progress, setProgress] = useState(0);
    const scrollRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.body.classList.add('landing-open');
        return () => {
            document.body.style.overflow = prev;
            document.body.classList.remove('landing-open');
        };
    }, []);

    // Scroll progress bar (the landing owns its own scroll container).
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const onScroll = () => {
            const max = el.scrollHeight - el.clientHeight;
            setProgress(max > 0 ? Math.min(1, el.scrollTop / max) : 0);
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => el.removeEventListener('scroll', onScroll);
    }, []);

    // Reviews carousel: 3 cards on desktop, 2 on tablet, 1 on phone.
    useEffect(() => {
        const fit = () => {
            const w = window.innerWidth;
            setPerView(w <= 560 ? 1 : w <= 900 ? 2 : 3);
        };
        fit();
        window.addEventListener('resize', fit);
        return () => window.removeEventListener('resize', fit);
    }, []);

    const pages = Math.max(1, Math.ceil(REVIEWS.length / perView));
    const page = Math.min(reviewPage, pages - 1);

    const even = digits.filter(d => d % 2 === 0).length;
    const evenPct = digits.length ? Math.round((even / digits.length) * 100) : 50;
    const activeFeature = FEATURES.find(f => f.key === feature)!;

    return (
        <div className='lp' ref={el => {
            rootRef.current = el;
            scrollRef.current = el;
        }}>
            <div className='lp__progress' aria-hidden='true'>
                <span style={{ transform: `scaleX(${progress})` }} />
            </div>

            {/* Topbar */}
            <header className='lp__topbar'>
                <div className='lp__brand'>
                    <span className='lp__brand-mark' aria-hidden>DV</span>
                    <span className='lp__brand-word'>Dollarvault</span>
                </div>
                <nav className='lp__nav'>
                    {NAV.map(n => (
                        <a key={n.href} href={n.href} className='lp__nav-link'>{n.label}</a>
                    ))}
                </nav>
                <div className='lp__topbar-actions'>
                    <span className='lp__topbar-status'>
                        <i className='lp__topbar-pulse' aria-hidden='true' />
                        Live markets
                    </span>
                    <button type='button' className='lp__topbar-btn lp__topbar-btn--ghost' onClick={onEnter}>Log In</button>
                    <button type='button' className='lp__topbar-btn lp__topbar-btn--primary' onClick={onEnter}>Get Started</button>
                </div>
            </header>

            {/* Market ticker */}
            <div className='lp__ticker' aria-hidden='true'>
                <div className='lp__ticker-track'>
                    {ticker.map((m, i) => (
                        <span key={`${m.name}-${i}`} className='lp__ticker-item'>
                            <span className='lp__ticker-name'>{m.name}</span>
                            <span className={`lp__ticker-chg ${m.up ? 'up' : 'down'}`}>{m.chg}</span>
                            <span className='lp__ticker-sep'>·</span>
                        </span>
                    ))}
                </div>
            </div>

            {/* Hero */}
            <section className='lp__hero' id='lp-top'>
                <div className='lp__hero-bg' aria-hidden='true'>
                    <span className='lp__hero-orb lp__hero-orb--1' />
                    <span className='lp__hero-orb lp__hero-orb--2' />
                    <span className='lp__hero-orb lp__hero-orb--3' />
                </div>
                <div className='lp__hero-inner'>
                    <div className='lp__hero-copy'>
                        <span className='lp__hero-eyebrow' data-reveal>
                            <i aria-hidden='true' /> FREE STRATEGIES. REAL MARKET TOOLS.
                        </span>
                        <h1 className='lp__hero-h1' data-reveal>
                            Trade with <span className='lp__grad'>structure</span>, not guesswork
                        </h1>
                        <p className='lp__hero-sub' data-reveal>
                            Load a proven bot in one click, watch the live Deriv scanner read 17 volatility indexes,
                            and keep every tool in one workspace.
                        </p>
                        <div className='lp__hero-cta' data-reveal>
                            <button type='button' className='lp__hero-btn lp__hero-btn--primary' onClick={onEnter}>
                                Open the workspace
                            </button>
                            <a href='#lp-features' className='lp__hero-btn lp__hero-btn--outline'>See the tools</a>
                        </div>
                        <div className='lp__hero-trust' data-reveal>
                            <span>✓ Deriv OAuth</span>
                            <span>✓ Demo first</span>
                            <span>✓ No card required</span>
                        </div>
                    </div>

                    {/* Real live scanner preview */}
                    <aside className='lp__preview' data-reveal aria-label='Live digit scanner preview'>
                        <div className='lp__preview-top'>
                            <span className='lp__preview-title'>Digit Scanner</span>
                            <span className={`lp__preview-live ${connected ? 'is-on' : ''}`}>
                                <i aria-hidden='true' /> {connected ? 'LIVE' : 'CONNECTING'}
                            </span>
                        </div>
                        <div className='lp__preview-market'>
                            <strong>Volatility 50</strong>
                            <span>R_50 · Even/Odd</span>
                        </div>
                        <div className='lp__preview-split'>
                            <div className='lp__preview-labels'>
                                <span>EVEN <strong>{evenPct}%</strong></span>
                                <span><strong>{100 - evenPct}%</strong> ODD</span>
                            </div>
                            <div className='lp__preview-bar'>
                                <span style={{ width: `${evenPct}%` }} />
                            </div>
                        </div>
                        <div className='lp__preview-digits'>
                            {digits.length === 0 && <span className='lp__preview-empty'>waiting for ticks…</span>}
                            {digits.map((d, i) => (
                                <span key={`${i}-${d}`} className={`lp__preview-digit ${d % 2 === 0 ? 'is-even' : 'is-odd'}`}>
                                    {d}
                                </span>
                            ))}
                        </div>
                        <p className='lp__preview-note'>
                            Measured on the last {digits.length || FEED_LEN} ticks of the live public Deriv feed.
                        </p>
                    </aside>
                </div>
            </section>

            {/* Stats */}
            <section className='lp__stats'>
                {STATS.map(s => (
                    <Stat key={s.label} label={s.label} value={s.value} suffix={s.suffix} />
                ))}
            </section>

            {/* Get started */}
            <section className='lp__section' id='lp-how'>
                <div className='lp__section-head' data-reveal>
                    <span className='lp__eyebrow'>GET STARTED</span>
                    <h2 className='lp__section-title'>From sign-up to your first trade</h2>
                    <p className='lp__section-sub'>Three steps, no experience required.</p>
                </div>
                <div className='lp__steps'>
                    {STEPS.map((s, i) => (
                        <div key={s.n} className='lp__step' data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
                            <span className='lp__step-n'>{s.n}</span>
                            <h3 className='lp__step-title'>{s.title}</h3>
                            <p className='lp__step-body'>{s.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features — interactive selector */}
            <section className='lp__section lp__section--alt' id='lp-features'>
                <div className='lp__section-head' data-reveal>
                    <span className='lp__eyebrow'>FREE WORKSPACE</span>
                    <h2 className='lp__section-title'>Everything in one place</h2>
                    <p className='lp__section-sub'>Pick a tool to see what it does.</p>
                </div>
                <div className='lp__showcase' data-reveal>
                    <div className='lp__showcase-list' role='tablist' aria-label='Workspace tools'>
                        {FEATURES.map(f => (
                            <button
                                key={f.key}
                                type='button'
                                role='tab'
                                aria-selected={feature === f.key}
                                className={`lp__showcase-item ${feature === f.key ? 'is-active' : ''}`}
                                onClick={() => setFeature(f.key)}
                                onMouseEnter={() => setFeature(f.key)}
                            >
                                <span className='lp__showcase-icon' aria-hidden>{f.icon}</span>
                                <span className='lp__showcase-itemtext'>
                                    <strong>{f.title}</strong>
                                    <small>{f.blurb}</small>
                                </span>
                            </button>
                        ))}
                    </div>
                    <div className='lp__showcase-panel' role='tabpanel'>
                        <span className='lp__showcase-badge'>{activeFeature.icon} {activeFeature.title}</span>
                        <p className='lp__showcase-detail'>{activeFeature.detail}</p>
                        <ul className='lp__showcase-points'>
                            {activeFeature.points.map(p => (
                                <li key={p}>{p}</li>
                            ))}
                        </ul>
                        <button type='button' className='lp__hero-btn lp__hero-btn--primary lp__showcase-cta' onClick={onEnter}>
                            Try it in the workspace
                        </button>
                    </div>
                </div>
            </section>

            {/* Reviews — carousel */}
            <section className='lp__section' id='lp-reviews'>
                <div className='lp__section-head lp__section-head--row' data-reveal>
                    <div>
                        <span className='lp__eyebrow'>VERIFIED TRADERS</span>
                        <h2 className='lp__section-title'>Loved by traders worldwide</h2>
                    </div>
                    <div className='lp__carousel-nav'>
                        <button
                            type='button'
                            aria-label='Previous reviews'
                            onClick={() => setReviewPage(p => (p - 1 + pages) % pages)}
                        >
                            ‹
                        </button>
                        <span>{page + 1} / {pages}</span>
                        <button
                            type='button'
                            aria-label='Next reviews'
                            onClick={() => setReviewPage(p => (p + 1) % pages)}
                        >
                            ›
                        </button>
                    </div>
                </div>
                <div className='lp__carousel' data-reveal>
                    <div
                        className='lp__carousel-track'
                        style={{ transform: `translateX(-${page * 100}%)` }}
                    >
                        {Array.from({ length: pages }).map((_, pg) => (
                            <div className='lp__carousel-page' key={pg}>
                                {REVIEWS.slice(pg * perView, pg * perView + perView).map(r => (
                                    <article key={r.name} className='lp__review-card'>
                                        <div className='lp__review-top'>
                                            <span className='lp__review-avatar'>{r.name.charAt(0)}</span>
                                            <div className='lp__review-meta'>
                                                <strong>{r.name}</strong>
                                                <span>Verified Trader ✓</span>
                                            </div>
                                        </div>
                                        <div className='lp__review-stars' aria-label='5 stars'>★★★★★</div>
                                        <p className='lp__review-quote'>“{r.quote}”</p>
                                    </article>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
                <div className='lp__carousel-dots'>
                    {Array.from({ length: pages }).map((_, i) => (
                        <button
                            key={i}
                            type='button'
                            aria-label={`Go to review page ${i + 1}`}
                            className={i === page ? 'is-active' : ''}
                            onClick={() => setReviewPage(i)}
                        />
                    ))}
                </div>
            </section>

            {/* Course */}
            <section className='lp__section lp__section--alt' id='lp-course'>
                <div className='lp__section-head' data-reveal>
                    <span className='lp__eyebrow'>FREE COURSE</span>
                    <h2 className='lp__section-title'>Learn to trade, step by step</h2>
                    <p className='lp__section-sub'>A structured path from complete beginner to confident bot trader.</p>
                </div>
                <div className='lp__course'>
                    {COURSE.map((c, i) => (
                        <div key={c.n} className='lp__course-item' data-reveal style={{ transitionDelay: `${i * 50}ms` }}>
                            <span className='lp__course-n'>{c.n}</span>
                            <span className='lp__course-t'>{c.t}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* FAQ */}
            <section className='lp__section' id='lp-faq'>
                <div className='lp__section-head' data-reveal>
                    <span className='lp__eyebrow'>FAQ</span>
                    <h2 className='lp__section-title'>Questions, answered</h2>
                </div>
                <div className='lp__faq'>
                    {FAQ.map(f => (
                        <details key={f.q} className='lp__faq-item' data-reveal>
                            <summary className='lp__faq-q'>{f.q}</summary>
                            <p className='lp__faq-a'>{f.a}</p>
                        </details>
                    ))}
                </div>
            </section>

            {/* Final CTA + footer */}
            <section className='lp__final'>
                <div className='lp__final-inner' data-reveal>
                    <h2 className='lp__section-title'>Ready to transform your trading?</h2>
                    <p className='lp__final-text'>Open the workspace, load a free bot, and trade with structure today.</p>
                    <button type='button' className='lp__hero-btn lp__hero-btn--primary' onClick={onEnter}>
                        Get Started Free
                    </button>
                </div>
                <footer className='lp__footer'>
                    <span>© 2026 Dollarvault · Powered by Deriv</span>
                    <span>Trading involves risk of loss</span>
                </footer>
            </section>
        </div>
    );
};

export default Landing;
