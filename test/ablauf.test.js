// Ende-zu-Ende-Test gegen eine Wegwerf-Datenbank, ohne Netzwerk-Mails.
process.env.DB_FILE = ':memory:';
process.env.ADMIN_PASSWORD = 'geheim';
process.env.BASE_URL = 'https://pilz.example';
process.env.KONTAKT_EMAIL = 'veranstalter@example.org';
process.env.PAYPAL_ME = 'beispiel';
process.env.PORT = '0';

const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server/index.js');
const db = require('../server/db');
const jobs = require('../server/jobs');

let base, server;
test.before(async () => { server = app.listen(0); await new Promise(r => server.once('listening', r)); base = `http://127.0.0.1:${server.address().port}`; });
test.after(() => server.close());

const auth = { Authorization: 'Basic ' + Buffer.from('x:geheim').toString('base64'), 'Content-Type': 'application/json' };
const post = (url, body, headers = { 'Content-Type': 'application/json' }) => fetch(base + url, { method: 'POST', headers, body: JSON.stringify(body) });
const mails = () => db.prepare('SELECT * FROM postausgang ORDER BY id').all();
const gast = (terminId, extra = {}) => ({ terminId, name: 'Max Muster', email: 'max@example.org', telefon: '0176 1234567', personen: 2, datenschutz: true, ...extra });
const inTagen = d => { const t = new Date(Date.now() + d * 864e5); t.setMinutes(0, 0, 0); return t; };
const lokal = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);

let terminId;

test('Verwaltung braucht Passwort', async () => {
  assert.equal((await fetch(base + '/api/admin/termine')).status, 401);
  assert.equal((await fetch(base + '/api/admin/termine', { headers: { Authorization: 'Basic ' + Buffer.from('x:falsch').toString('base64') } })).status, 401);
  assert.equal((await fetch(base + '/api/admin/termine', { headers: auth })).status, 200);
});

test('Termin anlegen und öffentlich sehen', async () => {
  const r = await post('/api/admin/termine', { start: lokal(inTagen(10)), ort: 'Treffpunkt', kapazitaet: 3, preis: 40 }, auth);
  assert.equal(r.status, 200);
  terminId = (await r.json()).id;
  const list = await (await fetch(base + '/api/termine')).json();
  assert.equal(list.termine[0].frei, 3);
});

test('Anmeldung bestätigt, Mail mit Code und PayPal-Link', async () => {
  const r = await post('/api/buchung', gast(terminId));
  const d = await r.json();
  assert.equal(r.status, 200);
  assert.equal(d.status, 'bestaetigt');
  assert.match(d.code, /^PT-[A-Z2-9]{5}$/);
  const m = mails().filter(x => x.an === 'max@example.org')[0];
  assert.match(m.text, new RegExp(d.code));
  assert.match(m.text, /paypal\.me\/beispiel\/80EUR/);
  assert.ok(mails().some(x => x.an === 'veranstalter@example.org'));
});

test('Eingaben werden geprüft', async () => {
  assert.equal((await post('/api/buchung', gast(terminId, { email: 'kaputt' }))).status, 400);
  assert.equal((await post('/api/buchung', gast(terminId, { personen: 11 }))).status, 400);
  assert.equal((await post('/api/buchung', gast(terminId, { datenschutz: false }))).status, 400);
  assert.equal((await post('/api/buchung', gast(9999))).status, 409);
});

test('Überbuchung geht auf die Warteliste, Storno lässt nachrücken', async () => {
  const w = await (await post('/api/buchung', gast(terminId, { name: 'Wartende', email: 'warte@example.org', personen: 2 }))).json();
  assert.equal(w.status, 'warteliste');
  const token = db.prepare("SELECT token FROM buchungen WHERE name = 'Max Muster'").get().token;
  assert.equal((await post('/api/storno/' + token, {})).status, 200);
  const status = db.prepare("SELECT status FROM buchungen WHERE name = 'Wartende'").get().status;
  assert.equal(status, 'bestaetigt');
  assert.ok(mails().some(x => x.an === 'warte@example.org' && /Platz ist frei/.test(x.betreff)));
  assert.equal((await post('/api/storno/' + token, {})).status, 200);   // zweites Stornieren ist harmlos
  assert.equal((await fetch(base + '/api/storno/xyz')).status, 404);
});

test('Erinnerung und Nachbereitung werden genau einmal verschickt', async () => {
  const vorher = mails().length;
  assert.equal(await jobs.run(new Date(Date.now() + 9 * 864e5)), 1);   // ca. 1 Tag vor der Tour
  assert.equal(await jobs.run(new Date(Date.now() + 9 * 864e5)), 0);
  assert.equal(await jobs.run(new Date(Date.now() + 11 * 864e5)), 1);  // Tag danach
  assert.equal(await jobs.run(new Date(Date.now() + 11 * 864e5)), 0);
  assert.equal(mails().length, vorher + 2);
});

test('Bezahlt markieren und Termin absagen benachrichtigt alle', async () => {
  const id = db.prepare("SELECT id FROM buchungen WHERE name = 'Wartende'").get().id;
  await post(`/api/admin/buchungen/${id}/bezahlt`, { bezahlt: true }, auth);
  assert.equal(db.prepare('SELECT bezahlt FROM buchungen WHERE id = ?').get(id).bezahlt, 1);
  const r = await (await post(`/api/admin/termine/${terminId}/absage`, { grund: 'Sturmwarnung' }, auth)).json();
  assert.equal(r.benachrichtigt, 1);
  assert.ok(mails().some(x => /Absage/.test(x.betreff) && /Sturmwarnung/.test(x.text)));
  assert.equal((await post('/api/buchung', gast(terminId))).status, 409);
});
