// Läuft jede Minute: Zahlungserinnerung, Erinnerung vor der Tour und Nachbereitung danach. Ein Flag in der Buchung verhindert Doppelversand,
// es wird erst gesetzt, wenn die Mail wirklich raus ist (bei SMTP-Fehlern gibt es beim nächsten Lauf einen neuen Versuch).
const db = require('./db');
const mails = require('./mails');
const { send } = require('./mail');

const HOUR = 3600e3;
const REMIND_BEFORE = 48 * HOUR;
const PAY_REMIND_AFTER = 48 * HOUR;   // so lange nach der Anmeldung, dann kommt die Zahlungserinnerung
const FOLLOWUP_AFTER = 18 * HOUR;     // am Tag nach der Tour
const FOLLOWUP_UNTIL = 5 * 24 * HOUR;

async function run(now = new Date()) {
  const n = now.getTime();
  const rows = db.prepare(`SELECT b.*, t.start, t.ort, t.preis FROM buchungen b JOIN termine t ON t.id = b.termin_id
    WHERE b.status = 'bestaetigt' AND b.geloescht = 0 AND t.abgesagt = 0`).all();
  let sent = 0;
  for (const r of rows) {
    const start = new Date(r.start).getTime();
    const t = { start: r.start, ort: r.ort, preis: r.preis };
    let m = null, flag = null;
    if (!r.erinnert && start > n && start - n <= REMIND_BEFORE) { m = mails.erinnerung(r, t); flag = 'erinnert'; }
    else if (!r.zahlungserinnert && !r.bezahlt && start - n > REMIND_BEFORE && n - new Date(r.erstellt).getTime() >= PAY_REMIND_AFTER) { m = mails.zahlungserinnerung(r, t); flag = 'zahlungserinnert'; }
    else if (!r.nachgefasst && n - start >= FOLLOWUP_AFTER && n - start <= FOLLOWUP_UNTIL) { m = mails.nachbereitung(r, t); flag = 'nachgefasst'; }
    if (!m) continue;
    if (await send(r.email, m.subject, m.text)) {
      db.prepare(`UPDATE buchungen SET ${flag} = 1 WHERE id = ?`).run(r.id);
      sent++;
    }
  }
  return sent;
}

function start() {
  const tick = () => run().catch(err => console.error('Job-Fehler:', err));
  tick();
  return setInterval(tick, 60_000);
}

module.exports = { run, start };
