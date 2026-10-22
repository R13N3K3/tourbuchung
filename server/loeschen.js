// Automatische Löschung nach Ablauf der Aufbewahrungsfrist (Datensparsamkeit).
//  - Anmeldungen: Name, E-Mail, Telefon und Nachricht werden LOESCHFRIST_MONATE (Standard 12) nach der Tour entfernt.
//  - Stornierte Anmeldungen: schon nach STORNO_TAGE Tagen.
//  - Postausgang (enthält Namen und Adressen in den Mailtexten): nach LOESCHFRIST_MONATE.
// Code, Personenzahl, Termin und Zahlungsvermerk bleiben ohne Personenbezug für die Buchhaltung stehen.
const db = require('./db');
const { anonymisieren } = require('./buchung');

const STORNO_TAGE = 30;
const monate = () => Math.max(1, Number(process.env.LOESCHFRIST_MONATE) || 12);

function run(now = new Date()) {
  const frist = new Date(now);
  frist.setMonth(frist.getMonth() - monate());
  const stornoFrist = new Date(now.getTime() - STORNO_TAGE * 864e5);

  const faellig = db.prepare(`
    SELECT b.id FROM buchungen b JOIN termine t ON t.id = b.termin_id
    WHERE b.geloescht = 0
      AND (t.start < ? OR (b.status = 'storniert' AND COALESCE(b.storniert_am, b.erstellt) < ?))
  `).all(frist.toISOString(), stornoFrist.toISOString());
  for (const b of faellig) anonymisieren(b.id);

  const mails = db.prepare('DELETE FROM postausgang WHERE zeit < ?').run(frist.toISOString()).changes;
  return { anmeldungen: faellig.length, mails: Number(mails) };
}

function start() {
  const tick = () => {
    try {
      const r = run();
      if (r.anmeldungen || r.mails) console.log(`Löschung: ${r.anmeldungen} Anmeldungen anonymisiert, ${r.mails} Mails gelöscht`);
    } catch (err) { console.error('Löschung fehlgeschlagen:', err); }
  };
  tick();
  return setInterval(tick, 24 * 3600e3);
}

module.exports = { run, start };
