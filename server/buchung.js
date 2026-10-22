// Anmeldung, Warteliste, Stornierung und Absage. Die Datenbankzugriffe sind synchron und damit atomar,
// Mails werden erst danach verschickt.
const crypto = require('crypto');
const db = require('./db');
const mails = require('./mails');
const { send } = require('./mail');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // ohne verwechselbare Zeichen (0/O, 1/I)
const newCode = () => 'PT-' + Array.from(crypto.randomBytes(5), b => ALPHABET[b % ALPHABET.length]).join('');

class Fehler extends Error {}

const termin = id => db.prepare('SELECT * FROM termine WHERE id = ?').get(id);

function freiePlaetze(terminId) {
  const t = termin(terminId);
  if (!t) return 0;
  const { n } = db.prepare("SELECT COALESCE(SUM(personen), 0) AS n FROM buchungen WHERE termin_id = ? AND status = 'bestaetigt'").get(terminId);
  return Math.max(0, t.kapazitaet - n);
}

const veranstalterMail = () => process.env.KONTAKT_EMAIL;
const informiere = (m) => veranstalterMail() ? send(veranstalterMail(), m.subject, m.text) : null;

async function anmelden({ terminId, name, email, telefon, personen, nachricht }) {
  const t = termin(terminId);
  if (!t || t.abgesagt || new Date(t.start) <= new Date()) throw new Fehler('Dieser Termin ist nicht mehr buchbar.');

  // Wer schon wartet, geht vor: neue Anmeldungen landen dann ebenfalls auf der Warteliste.
  const wartet = db.prepare("SELECT 1 FROM buchungen WHERE termin_id = ? AND status = 'warteliste' LIMIT 1").get(t.id);
  const status = !wartet && personen <= freiePlaetze(t.id) ? 'bestaetigt' : 'warteliste';

  let b;
  for (let versuch = 0; ; versuch++) {
    try {
      const row = {
        termin_id: t.id, code: newCode(), token: crypto.randomBytes(12).toString('hex'),
        name, email, telefon, personen, nachricht: nachricht || null, status, erstellt: new Date().toISOString(),
        erinnert: new Date(t.start) - Date.now() <= 48 * 3600e3 ? 1 : 0,   // kurzfristig gebucht: die Bestätigung reicht
      };
      const r = db.prepare(`INSERT INTO buchungen (termin_id, code, token, name, email, telefon, personen, nachricht, status, erstellt, erinnert)
        VALUES (:termin_id, :code, :token, :name, :email, :telefon, :personen, :nachricht, :status, :erstellt, :erinnert)`).run(row);
      b = { id: Number(r.lastInsertRowid), bezahlt: 0, ...row };
      break;
    } catch (err) {
      if (versuch >= 5 || !/UNIQUE/.test(err.message)) throw err;   // selten: Code schon vergeben
    }
  }

  const m = status === 'bestaetigt' ? mails.bestaetigung(b, t) : mails.warteliste(b, t);
  await send(b.email, m.subject, m.text);
  await informiere(mails.neueBuchung(b, t));
  return { code: b.code, status, token: b.token, termin: t, betrag: b.personen * t.preis };
}

// Plätze verteilen, wenn welche frei wurden. Reihenfolge der Anmeldung, wer nicht mehr passt, wird übersprungen.
async function nachruecken(terminId) {
  const t = termin(terminId);
  if (!t || t.abgesagt) return [];
  let frei = freiePlaetze(terminId);
  const geholt = [];
  for (const w of db.prepare("SELECT * FROM buchungen WHERE termin_id = ? AND status = 'warteliste' ORDER BY id").all(terminId)) {
    if (w.personen > frei) continue;
    db.prepare("UPDATE buchungen SET status = 'bestaetigt' WHERE id = ?").run(w.id);
    frei -= w.personen;
    geholt.push({ ...w, status: 'bestaetigt' });
  }
  for (const b of geholt) {
    const m = mails.nachgerueckt(b, t);
    await send(b.email, m.subject, m.text);
  }
  return geholt;
}

async function stornieren(buchungId, { vonKunde }) {
  const b = db.prepare('SELECT * FROM buchungen WHERE id = ?').get(buchungId);
  if (!b || b.status === 'storniert') return false;
  const t = termin(b.termin_id);
  db.prepare("UPDATE buchungen SET status = 'storniert' WHERE id = ?").run(b.id);
  const m = mails.storniert(b, t);
  await send(b.email, m.subject, m.text);
  if (vonKunde) await informiere(mails.stornoVeranstalter(b, t));
  await nachruecken(b.termin_id);
  return true;
}

async function terminAbsagen(terminId, grund) {
  const t = termin(terminId);
  if (!t || t.abgesagt) return 0;
  db.prepare('UPDATE termine SET abgesagt = 1, absage_grund = ? WHERE id = ?').run(grund || null, terminId);
  const betroffene = db.prepare("SELECT * FROM buchungen WHERE termin_id = ? AND status != 'storniert'").all(terminId);
  for (const b of betroffene) {
    const m = mails.absage(b, t, grund);
    await send(b.email, m.subject, m.text);
  }
  return betroffene.length;
}

module.exports = { Fehler, termin, freiePlaetze, anmelden, nachruecken, stornieren, terminAbsagen };
