// SQLite (in Node eingebaut). Alle Zugriffe sind synchron, deshalb ist jede Funktion ohne await dazwischen atomar.
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(process.env.DB_FILE || path.join(dir, 'pilztour.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS termine (
    id INTEGER PRIMARY KEY,
    start TEXT NOT NULL,
    ort TEXT NOT NULL,
    kapazitaet INTEGER NOT NULL,
    preis INTEGER NOT NULL,
    abgesagt INTEGER NOT NULL DEFAULT 0,
    absage_grund TEXT,
    erstellt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS buchungen (
    id INTEGER PRIMARY KEY,
    termin_id INTEGER NOT NULL REFERENCES termine(id),
    code TEXT NOT NULL UNIQUE,
    token TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    telefon TEXT NOT NULL,
    personen INTEGER NOT NULL,
    nachricht TEXT,
    status TEXT NOT NULL,                 -- bestaetigt | warteliste | storniert
    bezahlt INTEGER NOT NULL DEFAULT 0,
    bezahlt_am TEXT,
    erinnert INTEGER NOT NULL DEFAULT 0,
    nachgefasst INTEGER NOT NULL DEFAULT 0,
    erstellt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS postausgang (
    id INTEGER PRIMARY KEY,
    zeit TEXT NOT NULL,
    an TEXT NOT NULL,
    betreff TEXT NOT NULL,
    text TEXT NOT NULL,
    status TEXT NOT NULL,                 -- gesendet | nur_protokoll | fehler
    fehler TEXT
  );
`);

// nachträglich hinzugefügte Spalten (bestehende Datenbanken)
for (const col of [
  'zahlungserinnert INTEGER NOT NULL DEFAULT 0',
  'geloescht INTEGER NOT NULL DEFAULT 0',   // personenbezogene Daten sind entfernt
  'storniert_am TEXT',
]) {
  try { db.exec(`ALTER TABLE buchungen ADD COLUMN ${col}`); } catch { /* gibt es schon */ }
}

module.exports = db;
