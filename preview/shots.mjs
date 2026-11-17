import { chromium } from 'playwright';
import fs from 'fs';

const out = 'shots';
fs.mkdirSync(out, { recursive: true });
const URL = 'http://127.0.0.1:4173/';

const metrics = async (page, label) => {
    const data = await page.evaluate(() => {
        const root = document.querySelector('.lp');
        const h1 = document.querySelector('.lp-hero__title');
        const cs = h1 ? getComputedStyle(h1) : null;
        const overflow = [...document.querySelectorAll('.lp *')]
            .filter(el => el.getBoundingClientRect().width > 0 && el.scrollWidth > el.clientWidth + 2)
            .slice(0, 8)
            .map(el => `${el.tagName}.${(el.className || '').toString().split(' ')[0]} ${el.clientWidth}->${el.scrollWidth}`);
        return {
            found: Boolean(root),
            rootClient: root ? [root.clientWidth, root.clientHeight] : null,
            rootScroll: root ? [root.scrollWidth, root.scrollHeight] : null,
            h1Font: cs ? cs.fontFamily : null,
            h1Size: cs ? cs.fontSize : null,
            instrumentSerif: document.fonts ? document.fonts.check('16px "Instrument Serif"') : null,
            plexMono: document.fonts ? document.fonts.check('16px "IBM Plex Mono"') : null,
            bodyBg: root ? getComputedStyle(root).backgroundColor : null,
            overflow,
        };
    });
    console.log('METRICS ' + label + ' ' + JSON.stringify(data));
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE_ERR ' + m.text().slice(0, 300)); });

await page.goto(URL, { waitUntil: 'domcontentloaded' });
try {
    await page.waitForSelector('.lp', { timeout: 120000 });
} catch (e) {
    await page.screenshot({ path: `${out}/00-no-landing.png` });
    console.log('NO_LANDING');
}
await page.waitForTimeout(3000);
await page.screenshot({ path: `${out}/01-hero.png` });
await metrics(page, 'hero');

const goto = async (id) => {
    await page.evaluate(target => {
        const root = document.querySelector('.lp');
        const el = document.getElementById(target);
        if (root && el) root.scrollTo({ top: el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 70, behavior: 'instant' });
    }, id);
    await page.waitForTimeout(1400);
};

const sections = ['lp-how', 'lp-bots', 'lp-platform', 'lp-markets', 'lp-learn', 'lp-faq'];
let i = 2;
for (const id of sections) {
    await goto(id);
    await page.screenshot({ path: `${out}/${String(i).padStart(2, '0')}-${id}.png` });
    i += 1;
}

// interactions
await goto('lp-how');
await page.click('.lp-filter:nth-child(3)');
await page.waitForTimeout(900);
await goto('lp-bots');
await page.screenshot({ path: `${out}/08-bots-filtered.png` });
console.log('BOT_CARDS ' + (await page.locator('.lp-bot').count()));

await goto('lp-faq');
await page.click('.lp-acc:nth-child(3) .lp-acc__q');
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/09-faq-open.png` });

await goto('lp-top');
await page.click('.lp-chip:nth-child(4)');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/10-chip-switched.png` });

await page.evaluate(() => document.querySelector('.lp').scrollTo({ top: 999999, behavior: 'instant' }));
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/11-footer.png` });

// mobile
const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const m = await mob.newPage();
await m.goto(URL, { waitUntil: 'domcontentloaded' });
await m.waitForSelector('.lp', { timeout: 120000 });
await m.waitForTimeout(3000);
await m.screenshot({ path: `${out}/20-mobile-hero.png` });
await metrics(m, 'mobile');
await m.click('.lp-burger');
await m.waitForTimeout(800);
await m.screenshot({ path: `${out}/21-mobile-drawer.png` });
await m.click('.lp-drawer__link');
await m.waitForTimeout(1500);
await m.screenshot({ path: `${out}/22-mobile-how.png` });
await m.evaluate(() => document.querySelector('.lp').scrollTo({ top: 1200, behavior: 'instant' }));
await m.waitForTimeout(1200);
await m.screenshot({ path: `${out}/23-mobile-bots.png` });

await browser.close();
console.log('SHOTS_DONE');
