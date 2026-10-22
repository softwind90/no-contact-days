const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../analytics.js'), 'utf8');

function setup({ choice = null, hostname = 'www.thenocontacttracker.com', blocked = false } = {}) {
  const elements = [];
  const scripts = [];
  const listeners = {};
  const cookies = [];
  let reloads = 0;
  const element = (tag) => {
    const item = { tag, listeners: {}, setAttribute() {}, focus() {},
      addEventListener(name, fn) { this.listeners[name] = fn; },
      querySelector() { return { focus() {} }; }, appendChild() {} };
    elements.push(item);
    return item;
  };
  const document = {
    referrer: 'https://example.com/private?note=secret#private',
    createElement: element, querySelector() { return null; },
    body: { appendChild() {} }, head: { appendChild(s) { scripts.push(s); } },
    get cookie() { return '_ga=test; _ga_6865L9VTW2=test; tracker=keep'; },
    set cookie(value) { cookies.push(value); }
  };
  const window = { addEventListener(name, fn) { listeners[name] = fn; } };
  vm.runInNewContext(source, {
    window, document, URL, Set, Date,
    location: { hostname, origin: `https://${hostname}`, pathname: '/', search: '?lastContactDate=private', reload() { reloads++; } },
    localStorage: {
      getItem() { if (blocked) throw Error('blocked'); return choice; },
      setItem(key, value) { if (blocked) throw Error('blocked'); choice = value; }
    }
  });
  const panel = elements.find(e => e.tag === 'section');
  function choose(value) {
    panel.listeners.click({ target: { closest() { return { dataset: { choice: value }, hasAttribute() { return false; } }; } } });
  }
  return { window, scripts, cookies, choose, listeners, panel, reloads: () => reloads, commands: () => window.dataLayer.map(x => Array.from(x)) };
}

test('no Google script or queued events before opt-in or after decline', () => {
  for (const choice of [null, 'denied']) {
    const s = setup({ choice });
    s.window.trackEvent('tracker_created');
    assert.equal(s.scripts.length, 0);
    assert.equal(s.commands().length, 0);
    s.choose('denied');
    assert.equal(s.scripts.length, 0);
  }
});
test('opt-in initializes once, strips URLs, denies advertising and ignores private properties', () => {
  const s = setup();
  s.choose('granted');
  s.choose('granted');
  assert.equal(s.scripts.length, 1);
  const config = s.commands().find(c => c[0] === 'config')[2];
  assert.equal(config.page_location, 'https://www.thenocontacttracker.com/');
  assert.equal(config.page_referrer, 'https://example.com/');
  assert.equal(config.allow_google_signals, false);
  assert.equal(s.commands()[0][2].ad_storage, 'denied');
  s.window.trackEvent('daily_checkin_saved', { urge: 10, note: 'secret' });
  s.window.trackEvent('unsent_letter_saved', { text: 'private' });
  const events = s.commands().filter(c => c[0] === 'event');
  assert.equal(events.length, 1);
  assert.equal(JSON.stringify(events), '[["event","daily_checkin_saved"]]');
});
test('withdrawal disables tracking and clears only GA cookies without losing unsaved inputs', () => {
  const s = setup({ choice: 'granted' });
  s.choose('denied');
  s.window.trackEvent('tracker_created');
  assert.equal(s.window['ga-disable-G-6865L9VTW2'], true);
  assert.equal(s.commands().filter(c => c[0] === 'event').length, 0);
  assert.equal(s.reloads(), 0);
  assert.ok(s.cookies.length > 0);
  assert.ok(s.cookies.every(c => c.startsWith('_ga')));
});
test('blocked storage remains usable; previews never load GA', () => {
  const s = setup({ blocked: true });
  s.choose('granted');
  assert.equal(s.scripts.length, 1);
  s.choose('denied');
  for (const hostname of ['localhost', 'preview.vercel.app']) {
    assert.equal(setup({ choice: 'granted', hostname }).scripts.length, 0);
  }
});
test('withdrawal or storage clear in another tab disables this tab', () => {
  for (const key of ['no-contact-days-analytics-consent-v1', null]) {
    const s = setup({ choice: 'granted' });
    s.listeners.storage({ key, newValue: null });
    assert.equal(s.window['ga-disable-G-6865L9VTW2'], true);
    assert.equal(s.reloads(), 0);
  }
});
