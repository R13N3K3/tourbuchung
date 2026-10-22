require('./env');
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const db = require('./db');
const buchung = require('./buchung');
const jobs = require('./jobs');

const PORT = Number(process.env.PORT) || 3200;
const MAX_PERSONEN = 10;
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 'loopback');   // hinter Caddy/nginx auf demselben Rechner
app.use(express.json({ limit: '20kb' }));

const clean = (v, max) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
const sichtbar = t => ({ id: t.id, start: t.start, ort: t.ort, preis: t.preis, frei: buchung.freiePlaetze(t.id), kapazitaet: t.kapazitaet });

// ---------- einfache Begrenzung gegen Missbrauch (im Speicher) ----------
function limiter(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const list = (hits.get(req.ip) || []).filter(t => now - t < windowMs);
    if (list.length >= max) return res.status(429).json({ error: 'Zu viele Anfragen. Bitte später erneut versuchen.' });
    list.push(now);
    hits.set(req.ip, list);
    next();
  };
}

// ---------- öffentlich ----------
app.get('/api/termine', (req, res) => {
  const rows = db.prepare('SELECT * FROM termine WHERE abgesagt = 0 AND start > ? ORDER BY start').all(new Date().toISOString());
  res.json({
    termine: rows.map(sichtbar),
    maxPersonen: MAX_PERSONEN,
    veranstalter: process.env.VERANSTALTER || 'Eduard',
    paypal: !!process.env.PAYPAL_ME,
  });
});

app.post('/api/buchung', limiter(8, 3600e3), async (req, res) => {
  const b = req.body || {};
  if (b.website) return res.json({ ok: true });   // Honigtopf-Feld: Bots füllen es aus
  const d = {
    terminId: Number(b.terminId),
    name: clean(b.name, 100),
    email: clean(b.email, 150),
    telefon: clean(b.telefon, 40),
    personen: Number(b.personen),
    nachricht: clean(b.nachricht, 1000),
  };
  if (d.name.length < 2) return res.status(400).json({ error: 'Bitte Vor- und Nachnamen angeben.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) return res.status(400).json({ error: 'Bitte eine gültige E-Mail-Adresse angeben.' });
  if (!/^[0-9+()\-\/ ]{6,}$/.test(d.telefon)) return res.status(400).json({ error: 'Bitte eine gültige Telefonnummer angeben.' });
  if (!Number.isInteger(d.personen) || d.personen < 1 || d.personen > MAX_PERSONEN) return res.status(400).json({ error: `Bitte 1 bis ${MAX_PERSONEN} Personen wählen.` });
  if (!Number.isInteger(d.terminId)) return res.status(400).json({ error: 'Bitte einen Termin wählen.' });
  if (b.datenschutz !== true) return res.status(400).json({ error: 'Bitte bestätige, dass du die Datenschutzerklärung gelesen hast.' });
  try {
    const r = await buchung.anmelden(d);
    res.json({ ok: true, code: r.code, status: r.status, betrag: r.betrag, termin: sichtbar(r.termin), paypal: process.env.PAYPAL_ME || null });
  } catch (err) {
    if (err instanceof buchung.Fehler) return res.status(409).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Das hat leider nicht geklappt. Bitte später noch einmal versuchen.' });
  }
});

// Stornolink aus der Mail: Der Token ist das Geheimnis, deshalb nur minimale Angaben zurückgeben
const byToken = token => /^[0-9a-f]{24}$/.test(token)
  ? db.prepare('SELECT b.*, t.start, t.ort FROM buchungen b JOIN termine t ON t.id = b.termin_id WHERE b.token = ?').get(token)
  : null;

app.get('/api/storno/:token', limiter(30, 3600e3), (req, res) => {
  const b = byToken(req.params.token);
  if (!b) return res.status(404).json({ error: 'Link ungültig.' });
  res.json({ name: b.name, personen: b.personen, status: b.status, start: b.start, ort: b.ort, code: b.code, abgesagt: !!db.prepare('SELECT abgesagt FROM termine WHERE id = ?').get(b.termin_id).abgesagt });
});

app.post('/api/storno/:token', limiter(30, 3600e3), async (req, res) => {
  const b = byToken(req.params.token);
  if (!b) return res.status(404).json({ error: 'Link ungültig.' });
  await buchung.stornieren(b.id, { vonKunde: true });
  res.json({ ok: true });
});

app.get('/storno/:token', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'storno.html')));
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------- Verwaltung (HTTP-Basic, nur über HTTPS betreiben) ----------
const fehlversuche = new Map();
const digest = s => crypto.createHash('sha256').update(s).digest();

function adminAuth(req, res, next) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return res.status(503).send('ADMIN_PASSWORD fehlt in der .env');
  const f = fehlversuche.get(req.ip);
  if (f && f.count >= 10 && Date.now() < f.until) return res.status(429).send('Zu viele Fehlversuche, bitte später erneut versuchen.');
  const [scheme, b64] = (req.headers.authorization || '').split(' ');
  if (scheme === 'Basic' && b64) {
    const given = Buffer.from(b64, 'base64').toString().split(':').slice(1).join(':');
    if (crypto.timingSafeEqual(digest(given), digest(pw))) { fehlversuche.delete(req.ip); return next(); }
    fehlversuche.set(req.ip, { count: (f?.count || 0) + 1, until: Date.now() + 15 * 60e3 });
  }
  res.set('WWW-Authenticate', 'Basic realm="Pilztour Verwaltung"').status(401).send('Anmeldung nötig');
}

app.use('/admin', adminAuth, express.static(path.join(__dirname, '..', 'admin')));
const admin = express.Router();
app.use('/api/admin', adminAuth, admin);

admin.get('/termine', (req, res) => {
  // kommende Termine zuerst (nächster oben), danach die vergangenen (neuester oben)
  const jetzt = new Date().toISOString();
  const alle = db.prepare('SELECT * FROM termine ORDER BY start').all();
  const termine = [...alle.filter(t => t.start >= jetzt), ...alle.filter(t => t.start < jetzt).reverse()];
  const buchungen = db.prepare("SELECT id, termin_id, code, name, email, telefon, personen, nachricht, status, bezahlt, erstellt FROM buchungen WHERE status != 'storniert' ORDER BY id").all();
  res.json({
    standard: { ort: process.env.ORT_STANDARD || '', preis: Number(process.env.PREIS_STANDARD) || 40 },
    termine: termine.map(t => ({ ...t, frei: buchung.freiePlaetze(t.id), buchungen: buchungen.filter(b => b.termin_id === t.id) })),
  });
});

admin.post('/termine', (req, res) => {
  const b = req.body || {};
  const start = new Date(b.start);   // "2026-11-09T10:00" wird als Ortszeit gelesen (TZ=Europe/Berlin)
  const kapazitaet = Number(b.kapazitaet), preis = Number(b.preis), ort = clean(b.ort, 200);
  if (isNaN(start) || !ort || !(kapazitaet >= 1 && kapazitaet <= 200) || !(preis >= 0 && preis <= 1000)) {
    return res.status(400).json({ error: 'Bitte Datum, Ort, Plätze und Preis prüfen.' });
  }
  const r = db.prepare('INSERT INTO termine (start, ort, kapazitaet, preis, erstellt) VALUES (?, ?, ?, ?, ?)')
    .run(start.toISOString(), ort, Math.round(kapazitaet), Math.round(preis), new Date().toISOString());
  res.json({ ok: true, id: Number(r.lastInsertRowid) });
});

admin.post('/termine/:id/absage', async (req, res) => {
  const n = await buchung.terminAbsagen(Number(req.params.id), clean(req.body?.grund, 300));
  res.json({ ok: true, benachrichtigt: n });
});

admin.post('/buchungen/:id/bezahlt', (req, res) => {
  const bezahlt = req.body?.bezahlt ? 1 : 0;
  db.prepare('UPDATE buchungen SET bezahlt = ?, bezahlt_am = ? WHERE id = ?').run(bezahlt, bezahlt ? new Date().toISOString() : null, Number(req.params.id));
  res.json({ ok: true });
});

admin.post('/buchungen/:id/storno', async (req, res) => {
  await buchung.stornieren(Number(req.params.id), { vonKunde: false });
  res.json({ ok: true });
});

admin.get('/postausgang', (req, res) => {
  res.json(db.prepare('SELECT id, zeit, an, betreff, text, status, fehler FROM postausgang ORDER BY id DESC LIMIT 50').all());
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: 'Fehler.' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Pilztour läuft auf http://localhost:${PORT} (Mails: ${process.env.SMTP_HOST ? 'SMTP' : 'nur Postausgang, kein SMTP eingerichtet'})`);
    if (!process.env.PAYPAL_ME) console.warn('Hinweis: PAYPAL_ME fehlt in der .env, die Mails enthalten dann keinen Zahlungslink.');
    jobs.start();
  });
}

module.exports = app;
