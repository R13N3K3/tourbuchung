/**
 * Tourbuchung als Google-Formular (Variante ohne eigenen Server).
 *
 * Einmal in script.google.com einfügen, oben unter CONFIG die Angaben ausfüllen und die Funktion
 * "formularErstellen" ausführen (Berechtigungen bestätigen). Das Skript legt an:
 *   - das Formular (Felder wie auf der Anmeldeseite),
 *   - eine Tabelle für die Antworten mit den Spalten Status, Code, Bezahlt und Erinnert,
 *   - zwei Trigger: Bestätigungsmail bei jeder Anmeldung und täglich um 9 Uhr die Erinnerung.
 * Die Links zum Formular und zur Tabelle stehen danach im Ausführungsprotokoll.
 *
 * Nicht enthalten (gibt es nur in der Web-App): Stornolink, automatisches Nachrücken von der Warteliste,
 * Verwaltungsseite, automatische Zahlungserkennung, automatische Löschung der Daten.
 *
 * Wichtig: Keine echten Mailadressen in ein öffentliches Repository schreiben. Dieses Skript im Repository bleibt leer
 * ausgefüllt, die eigenen Angaben trägt man nur in der eigenen Kopie bei Google ein.
 */
const CONFIG = {
  titel: 'Anmeldung: Pilztour',
  veranstalter: '',                 // Name in den Mails, z. B. "Max Mustermann"
  kontaktEmail: '',                 // Adresse des Veranstalters: Antworten der Gäste und Meldungen über neue Anmeldungen
  treffpunkt: 'Talweg, direkt an der S-Bahn-Station Neuwiedenthal',
  preis: 40,                        // Euro pro Person
  maxPersonen: 10,
  paypalMe: '',                     // Name bei paypal.me/<NAME>. Leer = nur Hinweis ohne Link
  datenschutzUrl: '',               // Adresse der Datenschutzerklärung (Pflicht vor dem Start)
  // Termine: label erscheint im Formular, start ist Ortszeit, plaetze ist die Höchstzahl der Personen
  termine: [
    { label: 'Samstag, 14. November 2026, 10:00 Uhr', start: '2026-11-14T10:00', plaetze: 10 },
    { label: 'Samstag, 28. November 2026, 10:00 Uhr', start: '2026-11-28T10:00', plaetze: 10 },
  ],
};

// Fragetitel: Die Spalten der Tabelle heißen genauso.
const F = {
  name: 'Vor- und Nachname',
  email: 'E-Mail',
  telefon: 'Telefonnummer',
  personen: 'Für wie viele Personen möchtest du reservieren?',
  termin: 'Wann möchtest du mitkommen?',
  nachricht: 'Nachricht (optional)',
  datenschutz: 'Datenschutz',
};
const EXTRA = ['Status', 'Code', 'Bezahlt', 'Erinnert'];   // zusätzliche Spalten, nur für den Veranstalter

// ---------- Einrichtung ----------

function formularErstellen() {
  if (!CONFIG.kontaktEmail) throw new Error('Bitte zuerst CONFIG.kontaktEmail ausfüllen.');
  const form = FormApp.create(CONFIG.titel);
  form.setDescription(
    'Geführte Pilzexkursion in den Harburger Bergen. Dauer etwa 3 bis 4 Stunden (ca. 5.000 bis 7.000 Schritte).\n\n' +
    'Treffpunkt: ' + CONFIG.treffpunkt + '.\n' +
    'Mitbringen: Korb oder Obstnetz und Messer (Pflicht), festes Schuhwerk, warme Kleidung, bei Regen Regensachen.\n\n' +
    'Preis: ' + CONFIG.preis + ' € pro Person, bezahlt per PayPal "Freunde" (keine Barzahlung). Hunde und Kinder unter 6 Jahren sind kostenfrei.'
  );
  form.setConfirmationMessage('Danke! Deine Anmeldung ist eingegangen. Die Bestätigung kommt per E-Mail (auch im Spam-Ordner nachsehen).');
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setShowLinkToRespondAgain(false);

  form.addTextItem().setTitle(F.name).setRequired(true);
  form.addTextItem().setTitle(F.email).setRequired(true)
    .setValidation(FormApp.createTextValidation().requireTextIsEmail().setHelpText('Bitte eine gültige E-Mail-Adresse angeben.').build());
  form.addTextItem().setTitle(F.telefon).setRequired(true);
  const zahlen = [];
  for (let i = 1; i <= CONFIG.maxPersonen; i++) zahlen.push(String(i));
  form.addListItem().setTitle(F.personen).setChoiceValues(zahlen).setRequired(true);
  form.addMultipleChoiceItem().setTitle(F.termin).setChoiceValues(CONFIG.termine.map(t => t.label)).setRequired(true)
    .setHelpText('Kein passender Termin dabei? Schreib uns deinen Wunschtermin in die Nachricht.');
  form.addParagraphTextItem().setTitle(F.nachricht);
  form.addCheckboxItem().setTitle(F.datenschutz).setRequired(true)
    .setChoiceValues(['Ich habe die Datenschutzerklärung gelesen. Meine Angaben werden zur Organisation der Tour gespeichert und per E-Mail verwendet.'])
    .setHelpText(CONFIG.datenschutzUrl ? 'Datenschutzerklärung: ' + CONFIG.datenschutzUrl : 'Datenschutzerklärung: Adresse in CONFIG.datenschutzUrl eintragen.');

  const tabelle = SpreadsheetApp.create(CONFIG.titel + ' (Antworten)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, tabelle.getId());
  PropertiesService.getScriptProperties().setProperties({ FORM_ID: form.getId(), SHEET_ID: tabelle.getId() });

  ScriptApp.newTrigger('beiAnmeldung').forForm(form).onFormSubmit().create();
  ScriptApp.newTrigger('erinnerungenSenden').timeBased().everyDays(1).atHour(9).create();

  Logger.log('Formular (zum Teilen): ' + form.getPublishedUrl());
  Logger.log('Formular (bearbeiten): ' + form.getEditUrl());
  Logger.log('Antworten-Tabelle: ' + tabelle.getUrl());
}

// ---------- Anmeldung ----------

function beiAnmeldung(e) {
  const v = e.namedValues;
  const wert = name => ((v[name] || [''])[0] || '').trim();
  const a = {
    name: wert(F.name), email: wert(F.email), telefon: wert(F.telefon),
    personen: Number(wert(F.personen)) || 1, terminLabel: wert(F.termin), nachricht: wert(F.nachricht),
  };
  const termin = CONFIG.termine.find(t => t.label === a.terminLabel);
  if (!termin) return;

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);   // zwei gleichzeitige Anmeldungen dürfen sich nicht überschneiden
  let status, code;
  try {
    const blatt = e.range.getSheet();
    const spalten = zusatzspalten(blatt);
    const zeile = e.range.getRow();
    const belegt = belegtePlaetze(blatt, spalten, a.terminLabel, zeile);
    status = belegt + a.personen <= termin.plaetze ? 'bestätigt' : 'Warteliste';
    code = neuerCode();
    blatt.getRange(zeile, spalten.Status).setValue(status);
    blatt.getRange(zeile, spalten.Code).setValue(code);
    if (status === 'bestätigt' && belegt + a.personen >= termin.plaetze) terminSchliessen(termin.label);
  } finally {
    lock.releaseLock();
  }

  const mail = status === 'bestätigt' ? bestaetigung(a, termin, code) : warteliste(a, termin, code);
  senden(a.email, mail.betreff, mail.text);
  senden(CONFIG.kontaktEmail, 'Neue Anmeldung: ' + a.name + ', ' + a.personen + ' P., ' + status,
    a.name + ' (' + a.personen + ' Personen) hat sich für ' + termin.label + ' angemeldet.\nStatus: ' + status + '\nCode: ' + code +
    '\nTelefon: ' + a.telefon + '\nE-Mail: ' + a.email + (a.nachricht ? '\nNachricht: ' + a.nachricht : ''));
}

// Zeigt die Spalten Status, Code, Bezahlt, Erinnert, legt sie an, falls sie noch fehlen
function zusatzspalten(blatt) {
  const kopf = blatt.getRange(1, 1, 1, blatt.getLastColumn()).getValues()[0];
  const ergebnis = {};
  EXTRA.forEach(name => {
    let i = kopf.indexOf(name);
    if (i < 0) { i = kopf.length; kopf.push(name); blatt.getRange(1, i + 1).setValue(name); }
    ergebnis[name] = i + 1;
  });
  kopf.forEach((name, i) => { ergebnis[name] = i + 1; });
  return ergebnis;
}

function belegtePlaetze(blatt, spalten, terminLabel, ohneZeile) {
  const daten = blatt.getDataRange().getValues();
  let summe = 0;
  for (let r = 1; r < daten.length; r++) {
    if (r + 1 === ohneZeile) continue;
    if (daten[r][spalten[F.termin] - 1] !== terminLabel) continue;
    if (daten[r][spalten.Status - 1] !== 'bestätigt') continue;
    summe += Number(daten[r][spalten[F.personen] - 1]) || 0;
  }
  return summe;
}

// Volle Termine verschwinden aus dem Formular. Bereits abgegebene Antworten bleiben gültig.
function terminSchliessen(label) {
  const form = FormApp.openById(PropertiesService.getScriptProperties().getProperty('FORM_ID'));
  form.getItems(FormApp.ItemType.MULTIPLE_CHOICE).forEach(item => {
    if (item.getTitle() !== F.termin) return;
    const frage = item.asMultipleChoiceItem();
    const rest = frage.getChoices().map(c => c.getValue()).filter(w => w !== label);
    if (rest.length) frage.setChoiceValues(rest);
    else form.setAcceptingResponses(false);   // nichts mehr frei
  });
}

// ---------- Erinnerung (täglich um 9 Uhr) ----------

function erinnerungenSenden() {
  const blatt = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID')).getSheets()[0];
  const spalten = zusatzspalten(blatt);
  const daten = blatt.getDataRange().getValues();
  const jetzt = new Date();
  for (let r = 1; r < daten.length; r++) {
    const z = daten[r];
    if (z[spalten.Status - 1] !== 'bestätigt' || z[spalten.Erinnert - 1]) continue;
    const termin = CONFIG.termine.find(t => t.label === z[spalten[F.termin] - 1]);
    if (!termin) continue;
    const start = Utilities.parseDate(termin.start, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm");
    const bis = start.getTime() - jetzt.getTime();
    if (bis <= 0 || bis > 48 * 3600e3) continue;
    const a = { name: z[spalten[F.name] - 1], email: z[spalten[F.email] - 1], personen: Number(z[spalten[F.personen] - 1]) || 1 };
    const code = z[spalten.Code - 1];
    const bezahlt = String(z[spalten.Bezahlt - 1]).toLowerCase() === 'ja';
    senden(a.email, 'Erinnerung: Pilztour am ' + termin.label,
      'Hallo ' + a.name + ',\n\nbald ist es soweit. Wir sehen uns ' + termin.label + '.\nTreffpunkt: ' + CONFIG.treffpunkt + '\n\n' + ausruestung() +
      (bezahlt ? '' : '\n\nNoch offen: ' + a.personen * CONFIG.preis + ' € per PayPal "Freunde", bitte vor der Tour. Code ' + code + paypalLink(a.personen)) +
      fuss());
    blatt.getRange(r + 1, spalten.Erinnert).setValue('ja');
  }
}

// ---------- Texte ----------

const ausruestung = () => 'Bitte mitbringen: Korb oder Obstnetz und ein Messer (Pflicht), festes Schuhwerk, warme Kleidung und je nach Wetter Regensachen.';
const fuss = () => '\n\nBis bald im Wald!\n' + (CONFIG.veranstalter || '') + '\nFragen? Antworte einfach auf diese Mail.';
const paypalLink = personen => CONFIG.paypalMe ? '\nhttps://paypal.me/' + CONFIG.paypalMe + '/' + personen * CONFIG.preis + 'EUR' : '';

function zahlungstext(a, code) {
  return 'Preis: ' + CONFIG.preis + ' € pro Person, bei ' + a.personen + ' ' + (a.personen === 1 ? 'Person' : 'Personen') + ' also ' + a.personen * CONFIG.preis + ' €. ' +
    'Hunde und Kinder unter 6 Jahren sind kostenfrei.\nBezahlt wird per PayPal "Freunde", Barzahlung vor Ort ist nicht möglich. Bitte zahle bis spätestens zum Tourbeginn.' +
    (CONFIG.paypalMe ? '\nPayPal (Freunde): https://paypal.me/' + CONFIG.paypalMe + '/' + a.personen * CONFIG.preis + 'EUR' : '\nDie PayPal-Daten bekommst du vom Veranstalter.') +
    '\nBitte gib als Nachricht deinen Code an: ' + code;
}

function bestaetigung(a, termin, code) {
  return {
    betreff: 'Anmeldung bestätigt: Pilztour am ' + termin.label,
    text: 'Hallo ' + a.name + ',\n\ndeine Anmeldung zur Pilztour ist bestätigt. ' + a.personen + ' ' + (a.personen === 1 ? 'Platz ist' : 'Plätze sind') + ' für dich reserviert.\n\n' +
      'Termin: ' + termin.label + '\nTreffpunkt: ' + CONFIG.treffpunkt + '\nDauer: etwa 3 bis 4 Stunden (ca. 5.000 bis 7.000 Schritte)\n\n' +
      ausruestung() + '\n\n' + zahlungstext(a, code) + '\n\nDein Code: ' + code +
      '\nKannst du nicht kommen? Antworte bitte kurz auf diese Mail, damit andere nachrücken können.' + fuss(),
  };
}

function warteliste(a, termin, code) {
  return {
    betreff: 'Warteliste: Pilztour am ' + termin.label,
    text: 'Hallo ' + a.name + ',\n\nfür den Termin ' + termin.label + ' sind gerade nicht genug Plätze frei. Du stehst auf der Warteliste (' + a.personen + ' ' + (a.personen === 1 ? 'Person' : 'Personen') + ').\n' +
      'Wird ein Platz frei, melden wir uns per Mail. Bezahlen musst du bis dahin nichts.\n\nDein Code: ' + code + fuss(),
  };
}

function neuerCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = 'PT-';
  for (let i = 0; i < 5; i++) c += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  return c;
}

function senden(an, betreff, text) {
  MailApp.sendEmail({ to: an, subject: betreff, body: text, name: CONFIG.veranstalter || undefined, replyTo: CONFIG.kontaktEmail });
}
