/**
 * Screenshots the audit report in each of its states.
 *
 * The report only exists after a visitor submits a URL, so it can't be
 * reviewed by loading a page. This drives a real browser and stubs
 * /api/audit/scan with fixtures, which also means the states that are awkward
 * to reproduce on demand — an all-passing site, PageSpeed unavailable — can
 * be looked at deliberately rather than waited for.
 *
 * Usage: build, serve on :3100, then `npm run shots`.
 * Needs puppeteer-core (optionalDependency) and Chrome installed.
 */

import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/` : './';

const check = (id, label, status, detail, weight = 2) => ({
  id, label, status, detail, weight,
  why: 'This costs you qualified traffic every month.',
  fix: 'Do the specific thing that resolves it.',
});

function cat(id, label, blurb, score, weight, checks, state = 'ready', note) {
  return { id, label, blurb, score, weight, state, note, checks };
}

// Three fixtures covering the states a visitor actually lands on.
const FIXTURES = {
  rough: {
    overall: 47, overallState: 'final',
    categories: [
      cat('technical', 'Can Google find you', 'Whether Google can reach your site and list it at all.', 97, 25,
        [check('https','Secure padlock on your site','pass','Served over HTTPS.'),
         check('www','One web address, not two','warn','Both hostnames serve without a redirect.'),
         check('sitemap','Google has a list of your pages','pass','Sitemap found listing 10 URLs.')]),
      cat('content', 'What your pages say', 'Whether your pages tell Google what you do and who you do it for.', 31, 30,
        [check('title','The headline Google shows','warn','Title is 69 characters (recommended 30-60).',4),
         check('h1','A clear main heading','fail','No H1 heading on the page.',3),
         check('depth','Enough written on the page','fail','Roughly 0 words of text on the homepage.',3),
         check('links','Links to your other pages','fail','0 internal links on the homepage.',2)]),
      cat('performance', 'How fast your site loads', 'How long a customer waits before your page shows up.', 62, 25,
        [check('perf','How Google rates your speed','warn','Google scores this site 62/100 on mobile.',4),
         check('lcp','Time until your page shows up','fail','LCP is 4.6s (real Chrome user data).',3)]),
      cat('geo', 'Showing up in AI answers', "Whether ChatGPT and Google's AI answers can recommend you.", 64, 20,
        [check('ssr','AI assistants can read your site','fail','Only ~0 words in the raw HTML.',4),
         check('schema','Your details in a format Google reads','pass','Found: ProfessionalService, Service.',3)]),
    ],
    cwv: { source: 'field', lcpMs: 4600, cls: 0.02, inpMs: 180, ttfbMs: 900 },
  },
  pending: {
    overall: 64, overallState: 'preliminary',
    categories: [
      cat('technical','Can Google find you','Whether Google can reach your site and list it at all.',100,25,[check('https','Secure padlock on your site','pass','Served over HTTPS.')]),
      cat('content','What your pages say','Whether your pages tell Google what you do and who you do it for.',48,30,[check('h1','A clear main heading','fail','No H1 heading on the page.',3)]),
      cat('performance','How fast your site loads','How long a customer waits before your page shows up.',null,25,[],'pending','Measuring with Google PageSpeed...'),
      cat('geo','Showing up in AI answers',"Whether ChatGPT and Google's AI answers can recommend you.",72,20,[check('schema','Your details in a format Google reads','pass','Found: Organization.',3)]),
    ],
    cwv: null,
  },
  strong: {
    overall: 94, overallState: 'final',
    categories: [
      cat('technical','Can Google find you','Whether Google can reach your site and list it at all.',100,25,[check('https','Secure padlock on your site','pass','Served over HTTPS.')]),
      cat('content','What your pages say','Whether your pages tell Google what you do and who you do it for.',92,30,[check('title','The headline Google shows','pass','Title is 52 characters.',4)]),
      cat('performance','How fast your site loads','How long a customer waits before your page shows up.',88,25,[check('perf','How Google rates your speed','pass','Google scores this site 93/100 on mobile.',4)]),
      cat('geo','Showing up in AI answers',"Whether ChatGPT and Google's AI answers can recommend you.",96,20,[check('schema','Your details in a format Google reads','pass','Found: Organization, FAQPage.',3)]),
    ],
    cwv: { source: 'field', lcpMs: 1800, cls: 0.01, inpMs: 120, ttfbMs: 300 },
  },
};

function payload(name) {
  const f = FIXTURES[name];
  return {
    auditId: 'fixture', url: 'https://acmedental.com/', finalUrl: 'https://acmedental.com/',
    domain: 'acmedental.com',
    overall: f.overall, overallState: f.overallState,
    categories: f.categories, cwv: f.cwv, lighthouse: null,
    meta: { fetchedAt: new Date().toISOString(), statusCode: 200, durationMs: 2100,
            redirects: 0, cached: false, psiPending: f.overallState === 'preliminary' },
  };
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=2'],
});

for (const [name, viewport] of [['rough', { width: 1280, height: 900 }], ['pending', { width: 1280, height: 900 }], ['strong', { width: 1280, height: 900 }], ['rough', { width: 390, height: 844 }]]) {
  const page = await browser.newPage();
  await page.setViewport({ ...viewport, deviceScaleFactor: 2 });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.url().includes('/api/audit/scan')) {
      req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(payload(name)) });
    } else if (req.url().includes('/api/audit/psi') || req.url().includes('/api/track')) {
      req.abort();
    } else req.continue();
  });

  await page.goto('http://localhost:3100/', { waitUntil: 'networkidle2' });
  await page.type('#hero-audit-input', 'acmedental.com');
  await page.click('#hero-audit-submit');
  await page.waitForSelector('#audit-scan-again', { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 1800));

  const tag = `${name}-${viewport.width}`;
  await page.screenshot({ path: `${OUT}shot-${tag}-top.png` });
  console.log('  wrote shot-' + tag + '-top.png');
  await page.close();
}

await browser.close();
console.log('done');
