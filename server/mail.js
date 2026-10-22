// Versand per SMTP. Jede Mail landet im Postausgang (Tabelle), auch ohne SMTP-Zugang (Testmodus).
const nodemailer = require('nodemailer');
const db = require('./db');

let transport = null;
function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  transport ||= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transport;
}

// Liefert true, wenn die Mail verschickt (oder im Testmodus protokolliert) wurde.
async function send(to, subject, text, { replyTo } = {}) {
  const row = { zeit: new Date().toISOString(), an: to, betreff: subject, text, status: 'nur_protokoll', fehler: null };
  const t = getTransport();
  let ok = true;
  if (t) {
    try {
      await t.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        replyTo: replyTo || process.env.KONTAKT_EMAIL || undefined,
        to, subject, text,
      });
      row.status = 'gesendet';
    } catch (err) {
      row.status = 'fehler';
      row.fehler = err.message;
      ok = false;
      console.error('Mail an', to, 'fehlgeschlagen:', err.message);
    }
  }
  db.prepare('INSERT INTO postausgang (zeit, an, betreff, text, status, fehler) VALUES (?, ?, ?, ?, ?, ?)')
    .run(row.zeit, row.an, row.betreff, row.text, row.status, row.fehler);
  return ok;
}

module.exports = { send };
