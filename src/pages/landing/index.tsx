import { useEffect, useMemo, useRef } from 'react';
import './landing.scss';

const NAV = [
    { label: 'How it works', href: '#lp-how' },
    { label: 'Bots', href: '#lp-features' },
    { label: 'Reviews', href: '#lp-reviews' },
    { label: 'Course', href: '#lp-course-hero' },
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

const FEATURES = [
    {
        icon: '📚',
        title: 'Free Bot Library',
        body: 'Dozens of proven strategies, ready to load in one click. No coding required.',
    },
    {
        icon: '🧠',
        title: 'Smart AI Recovery',
        body: 'AI-driven recovery selection that adapts to losing streaks and protects your session limits.',
    },
    {
        icon: '📊',
        title: 'Market Analysis',
        body: 'Live digit distributions, momentum and confidence scores for every synthetic market.',
    },
    {
        icon: '⚡',
        title: 'Speedbot',
        body: 'One-click automated trading that catches signals faster than you can click.',
    },
    {
        icon: '📈',
        title: 'Pro Charts',
        body: 'Full technical indicators on live charts — read the market your way.',
    },
    {
        icon: '🛠️',
        title: 'Bot Builder',
        body: 'A visual Blockly builder with quick strategies and custom blocks. No code, all control.',
    },
];

const STATS = [
    { label: 'Free Bots', value: '13+' },
    { label: 'Markets', value: '17+' },
    { label: 'Win Strategies', value: '94%' },
    { label: 'Active Traders', value: '10K+' },
];

const REVIEWS = [
    { name: 'James Ochieng', quote: 'This platform completely changed how I trade. The free bot library alone is worth it.' },
    { name: 'Amina Hassan', quote: 'The Smart AI recovery bot is absolutely insane. It pulled me out of a bad streak twice.' },
    { name: 'David Mwangi', quote: 'Copy Trader is a game changer. I copy the top performers and learn while I earn.' },
    { name: 'Fatima Al-Rashid', quote: 'The analysis tools here are on another level. Dcircles alone changed my entries.' },
    { name: 'Peter Kamau', quote: 'Speedbot is incredible. It catches signals faster than I can even spot them.' },
    { name: 'Grace Njeri', quote: 'I was a complete beginner. The free course plus the bot builder tutorials got me trading.' },
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
        q: 'Is TradingHub.site free to use?',
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

interface LandingProps {
    onEnter: () => void;
}

const Landing = ({ onEnter }: LandingProps) => {
    const rootRef = useReveal();
    const ticker = useMemo(() => [...TICKER, ...TICKER], []);

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.body.classList.add('landing-open');
        return () => {
            document.body.style.overflow = prev;
            document.body.classList.remove('landing-open');
        };
    }, []);

    return (
        <div className='lp' ref={rootRef}>
            {/* Scroll Progress */}
            <div className='lp__progress'><span /></div>

            {/* Topbar */}
            <header className='lp__topbar'>
                <div className='lp__brand'>
                    <span className='lp__brand-mark' aria-hidden>DV</span>
                    <span className='lp__brand-word'>TradingHub.site</span>
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

            {/* Market Ticker */}
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
                <div className='lp__hero-content'>
                    <div className='lp__hero-text'>
                        <span className='lp__hero-eyebrow' data-reveal>
                            <i /> FREE STRATEGIES. REAL MARKET TOOLS.
                        </span>
                        <h1 className='lp__hero-h1' data-reveal>
                            <span className='lp__word reveal-1'>Free</span>
                            <span className='lp__word reveal-2'>bots</span>
                            <span className='lp__word reveal-3'>ready</span>
                            <span className='lp__word reveal-4'>to load</span>
                        </h1>
                        <p className='lp__hero-sub' data-reveal>
                            Search proven templates, open tutorial guides, and move directly into the bot builder when you are ready to test.
                        </p>
                        <div className='lp__hero-cta' data-reveal>
                            <button type='button' className='lp__hero-btn lp__hero-btn--primary' onClick={onEnter}>
                                Log In and Trade
                            </button>
                            <button type='button' className='lp__hero-btn lp__hero-btn--outline' onClick={onEnter}>
                                Create Free Account
                            </button>
                        </div>
                        <div className='lp__hero-trust' data-reveal>
                            <span>🔒 Deriv OAuth Secure</span>
                            <span>📊 Demo Accounts Supported</span>
                            <span>📱 Mobile Responsive</span>
                        </div>
                        <a href='#lp-course-hero' className='lp__hero-link' data-reveal>
                            Explore the course ↓
                        </a>
                    </div>
                    <div className='lp__hero-visual' data-reveal style={{ transitionDelay: '120ms' }}>
                        <div className='lp__hero-image-wrap'>
                            <img
                                className='lp__hero-image'
                                src='/ref-assets/dashboard-blue-background.png'
                                alt='TradingHub.site trading dashboard with live charts, bot runner, and trade panel'
                                loading='eager'
                                decoding='async'
                            />
                        </div>
                        <div className='lp__hero-badges'>
                            <div className='lp__badge'>
                                <strong>13+</strong>
                                <span>FREE BOT TEMPLATES</span>
                            </div>
                            <div className='lp__badge'>
                                <strong>24/7</strong>
                                <span>SYNTHETIC MARKETS</span>
                            </div>
                            <div className='lp__badge'>
                                <strong>17+</strong>
                                <span>MARKETS AVAILABLE</span>
                            </div>
                            <div className='lp__badge'>
                                <strong>🔒</strong>
                                <span>DERIV OAUTH SECURE</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Animated Stats */}
            <section className='lp__stats' data-reveal>
                {STATS.map((s, i) => (
                    <div key={s.label} className='lp__stat'>
                        <strong className='lp__stat-value'>0</strong>
                        <span className='lp__stat-label'>{s.label}</span>
                    </div>
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

            {/* Features */}
            <section className='lp__section lp__section--alt' id='lp-features'>
                <div className='lp__section-head' data-reveal>
                    <span className='lp__eyebrow'>FREE WORKSPACE</span>
                    <h2 className='lp__section-title'>Everything in one place</h2>
                    <p className='lp__section-sub'>No juggling apps — bots, charts, and analysis live together.</p>
                </div>
                <div className='lp__features'>
                    {FEATURES.map((f, i) => (
                        <div key={f.title} className='lp__feature' data-reveal style={{ transitionDelay: `${i * 70}ms` }}>
                            <span className='lp__feature-icon' aria-hidden>{f.icon}</span>
                            <h3 className='lp__feature-title'>{f.title}</h3>
                            <p className='lp__feature-body'>{f.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Reviews */}
            <section className='lp__section' id='lp-reviews'>
                <div className='lp__section-head--row' data-reveal>
                    <div>
                        <span className='lp__eyebrow'>VERIFIED TRADERS</span>
                        <h2 className='lp__section-title'>Loved by traders worldwide</h2>
                    </div>
                    <div className='lp__carousel-nav'>
                        <button aria-label='Previous review'>‹</button>
                        <span>1 / {Math.ceil(REVIEWS.length / 3)}</span>
                        <button aria-label='Next review'>›</button>
                    </div>
                </div>
                <div className='lp__carousel'>
                    <div className='lp__carousel-track'>
                        <div className='lp__carousel-page'>
                            {REVIEWS.slice(0, 3).map((r, i) => (
                                <article key={r.name} className={`lp__review-card ${i === 0 ? 'lp__review-card--active' : ''}`} data-reveal style={{ transitionDelay: `${(i % 6) * 60}ms` }}>
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
                        {REVIEWS.slice(3).length > 0 && (
                            <div className='lp__carousel-page'>
                                {REVIEWS.slice(3).map((r, i) => (
                                    <article key={r.name} className={`lp__review-card ${i === 0 ? 'lp__review-card--active' : ''}`} data-reveal style={{ transitionDelay: `${(i % 6) * 60}ms` }}>
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
                        )}
                    </div>
                </div>
                <div className='lp__carousel-dots' data-reveal>
                    {[0, Math.ceil(REVIEWS.length / 3) - 1].filter((v, i, a) => a.indexOf(v) === i).map((_, i) => (
                        <button key={i} className='lp__carousel-dot' />
                    ))}
                </div>
            </section>

            {/* Course */}
            <section className='lp__section lp__section--alt' id='lp-course-hero'>
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
                    <span>© 2026 TradingHub.site · Powered by Deriv</span>
                    <span>Trading involves risk of loss</span>
                </footer>
            </section>
        </div>
    );
};

export default Landing;
