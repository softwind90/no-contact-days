const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));

const legacyRedirects = [
  ['/no-contact-rule', '/no-contact-rule-after-breakup/'],
  ['/no-contact-after-breakup', '/no-contact-rule-after-breakup/'],
  ['/i-want-to-text-my-ex', '/want-to-text-your-ex/'],
  ['/why-do-want-to-text-your-ex', '/why-do-i-want-to-text-my-ex/'],
  ['/texts-to-send-your-ex', '/what-to-text-an-ex/'],
  ['/how-long-should-no-contact-last', '/how-long-should-i-do-no-contact/'],
];

function redirectsFor(source) {
  return config.redirects.filter((rule) => rule.source === source);
}

test('legacy slugs permanently redirect with and without a trailing slash', () => {
  for (const [slug, destination] of legacyRedirects) {
    for (const source of [`${slug}/:path*`, `${slug}/:path*/`]) {
      const matches = redirectsFor(source);
      assert.equal(matches.length, 1, `missing redirect ${source}`);
      assert.equal(matches[0].destination, destination);
      assert.equal(matches[0].permanent, true);
    }
    assert.equal(fs.existsSync(path.join(root, slug.slice(1))), false, `${slug} still has a static directory`);
  }
});

test('deployment host redirects cover the homepage and trailing-slash paths', () => {
  const host = 'no-contact-days.vercel.app';
  for (const source of ['/', '/:path*', '/:rest(.*)/']) {
    const matches = redirectsFor(source).filter((rule) =>
      rule.has?.some((check) => check.type === 'host' && check.value === host)
    );
    assert.equal(matches.length, 1, `missing host redirect ${source}`);
    assert.equal(matches[0].permanent, true);
    assert.match(matches[0].destination, /^https:\/\/www\.thenocontacttracker\.com\//);
  }
});

test('homepage hash targets stay on the page but navigation uses clean paths', () => {
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(home, /id="tracker"/);
  assert.match(home, /id="sos"/);
  assert.match(home, /href="\.\/no-contact-tracker\/">My counter/);
  assert.match(home, /href="\.\/want-to-text-your-ex\/">Need a pause\?/);
  assert.doesNotMatch(home, /href="#tracker"/);
  assert.doesNotMatch(home, /href="#sos"/);
  assert.match(home, /"url": "https:\/\/www\.thenocontacttracker\.com\/"/);
});

test('what-to-text snippet states the example count and the send-or-wait filter', () => {
  const page = fs.readFileSync(path.join(root, 'what-to-text-an-ex/index.html'), 'utf8');
  const title = page.match(/<title>([^<]*)<\/title>/)[1];
  const description = page.match(/<meta name="description" content="([^"]*)"/)[1];
  assert.equal(title, 'What Should I Text My Ex? 14 Calm Examples, or Wait');
  assert.ok(title.length <= 60, `title is ${title.length} characters`);
  assert.match(description, /14/);
  assert.match(description, /wait/i);
  assert.ok(description.length <= 160, `description is ${description.length} characters`);
  assert.doesNotMatch(`${title} ${description}`, /reunion|get (them|your ex) back|miss you/i);
  assert.match(page, /<h1>What to text your ex: 14 calm examples, and when to wait\.<\/h1>/);
  assert.match(page, /"name": "What should I text my ex\?"/);
});
