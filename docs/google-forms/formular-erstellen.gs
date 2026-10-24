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
 * Aufbau und Texte entsprechen der Anmeldeseite der Web-App (Abschnitte mit Emojis, Kopfbild). Farben und Hintergrund kann ein Skript nicht
 * setzen: Im Formular oben auf die Farbpalette (Design anpassen) klicken, Themenfarbe Orange und Hintergrund Creme wählen.
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
  verantwortlicher: '',             // Name und Anschrift des Veranstalters für den Datenschutzhinweis im Formular
  datenschutzUrl: '',               // Adresse der Datenschutzerklärung (Pflicht vor dem Start), Entwurf: datenschutzerklaerung-google-forms.md
  // Termine: label erscheint im Formular, start ist Ortszeit, plaetze ist die Höchstzahl der Personen
  termine: [
    { label: 'Samstag, 14. November 2026, 10:00 Uhr', start: '2026-11-14T10:00', plaetze: 10 },
    { label: 'Samstag, 28. November 2026, 10:00 Uhr', start: '2026-11-28T10:00', plaetze: 10 },
  ],
};

// Fragetitel: Die Spalten der Tabelle heißen genauso.
const F = {
  name: '👤 Vor- und Nachname',
  email: '✉️ E-Mail',
  telefon: '📞 Telefonnummer',
  personen: '👥 Für wie viele Personen?',
  termin: '📅 Wann möchtest du mitkommen?',
  nachricht: '💬 Nachricht (optional)',
  datenschutz: '🔒 Datenschutz',
};
const EXTRA = ['Status', 'Code', 'Bezahlt', 'Erinnert'];   // zusätzliche Spalten, nur für den Veranstalter

// ---------- Einrichtung ----------

function formularErstellen() {
  if (!CONFIG.kontaktEmail) throw new Error('Bitte zuerst CONFIG.kontaktEmail ausfüllen.');
  if (!CONFIG.datenschutzUrl || !CONFIG.verantwortlicher) Logger.log('Achtung: datenschutzUrl und verantwortlicher fehlen. Ohne Datenschutzerklärung darf das Formular nicht veröffentlicht werden.');
  const form = FormApp.create(CONFIG.titel);
  form.setTitle('🍄 ' + CONFIG.titel);
  form.setDescription(
    'Gemeinsam durch die Harburger Berge: Pilze finden, sicher bestimmen und verstehen, was im Wald wächst.\n\n' +
    '📍 Harburger Berge   ·   🕒 3–4 Stunden   ·   💶 ' + CONFIG.preis + ' € pro Person'
  );
  form.setConfirmationMessage('🎉 Angemeldet! Danke, deine Anmeldung ist eingegangen. Die Bestätigung mit allen Details kommt per E-Mail (auch im Spam-Ordner nachsehen). Bis bald im Wald! 🌲🍄');
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setShowLinkToRespondAgain(false);

  // Kopfbild
  form.addImageItem()
    .setTitle('Pilze im Wald')
    .setImage(Utilities.newBlob(Utilities.base64Decode(PILZE_PNG_BASE64), 'image/png', 'pilze.png'))
    .setAlignment(FormApp.Alignment.CENTER);

  // Infoabschnitte wie auf der Anmeldeseite
  form.addSectionHeaderItem().setTitle('✨ Das erwartet dich').setHelpText(
    '🍄 Pilze kennenlernen: verschiedene Arten und ihre Bestimmungsmerkmale\n' +
    '🔍 Sicher bestimmen: Übungen, damit du im Zweifel richtig entscheidest\n' +
    '🌿 Heilpilze & Pilzzucht: was Pilze können und wie man sie selbst zieht\n' +
    '🌳 Pilze im Ökosystem: welche Rolle sie im Wald spielen');
  form.addSectionHeaderItem().setTitle('🎒 Gut zu wissen').setHelpText(
    '🧺 Korb oder Obstnetz und Messer sind Pflicht\n' +
    '👟 Festes Schuhwerk und warme Kleidung, bei Regen Regensachen\n' +
    '🥾 Etwa 5.000 bis 7.000 Schritte, das sind 3 bis 4 Stunden\n' +
    '📍 Treffpunkt: ' + CONFIG.treffpunkt + '. Parken ist möglich\n' +
    '🐕 Hunde und Kinder unter 6 Jahren sind kostenfrei\n' +
    '💶 ' + CONFIG.preis + ' € pro Person, bezahlt per PayPal "Freunde" (keine Barzahlung)');
  form.addSectionHeaderItem().setTitle('🧭 So läuft die Anmeldung').setHelpText(
    '1️⃣ Termin wählen und das Formular ausfüllen\n' +
    '2️⃣ Bestätigung per E-Mail mit allen Details\n' +
    '3️⃣ Per PayPal "Freunde" bezahlen, mit deinem Code als Nachricht\n' +
    '4️⃣ Ab in den Wald! 🌲 Kurz vorher gibt es eine Erinnerung');

  // Anmeldung
  form.addSectionHeaderItem().setTitle('📝 Jetzt anmelden');
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
    .setHelpText(
      'Verantwortlich: ' + (CONFIG.verantwortlicher || '(in CONFIG.verantwortlicher eintragen)') + '. ' +
      'Gespeichert werden deine Angaben in Google Formularen und Tabellen. ' +
      'Datenschutzerklärung: ' + (CONFIG.datenschutzUrl || '(Adresse in CONFIG.datenschutzUrl eintragen)'));

  const tabelle = SpreadsheetApp.create(CONFIG.titel + ' (Antworten)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, tabelle.getId());
  PropertiesService.getScriptProperties().setProperties({ FORM_ID: form.getId(), SHEET_ID: tabelle.getId() });

  ScriptApp.newTrigger('beiAnmeldung').forForm(form).onFormSubmit().create();
  ScriptApp.newTrigger('erinnerungenSenden').timeBased().everyDays(1).atHour(9).create();

  Logger.log('Formular (zum Teilen): ' + form.getPublishedUrl());
  Logger.log('Formular (bearbeiten): ' + form.getEditUrl());
  Logger.log('Antworten-Tabelle: ' + tabelle.getUrl());
}

// Löscht alle Trigger dieses Projekts. Vor einem neuen Durchlauf von formularErstellen ausführen,
// wenn ein altes Formular ersetzt wird, sonst laufen die Bestätigungsmails doppelt.
function aufraeumen() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log('Alle Trigger gelöscht. Altes Formular und alte Tabelle bei Bedarf in Google Drive löschen.');
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

// ---------- Kopfbild (PNG als Text, ab hier nichts ändern) ----------
const PILZE_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAA4QAAADXCAMAAAB1Ym/NAAABFFBMVEX////17uLc1cbPuJ/Kq4awtoquqXq2lWzLuZbazLPt5dT9/PqVc02MakOphVf48+m4imft6+Xk1rnj0a3izKfs4cvy6tn469Duy7bp3cTWvZTbw5vTt4zNs4jPpHnbyqjPmHLw1s/vs6nqlYvxhnjosJHmd2voVEPiWkzbYFDlfHLb07fiTT7sg3jaRTjPdzrMiU+7czjElG3ZcGm2dkjMmnHSPTHVllizbDTLRDnPOy+2g1qtZzHLNivbc2unYy775KmhXiv84Jr01I761nuZVyf1ynDqtmecXzPqqludYjX2w0r1vkHytzrmniLurzLrpinimh/Nzqq1wI2PpWvd4svhl26XqnS+x5bFyJu8yKXgj1+SOqt1AAA780lEQVR42u2djVvaSPf3G6WrSXY7GkgkgEZAUAywrXS9W7cvbunir09ttZau2/v+//+P55rXzCSTZIIoKvPtVQlJCEk4n5wzZ96ePNHS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tJaMhkrq6Wnv6ytPS2tm5a96LPR0loyWatrv/4m6FlpRYOopXU3AubTGIBUG6vWok9OS+vxyzY3fkvXr6XNRZ+gltYjF3j6W7Z+XVn0KWppPWqt/Ppbrp6CRZ+lltbjlaHA4G+/rS/6NLW0HqlsYCkx+Ntv60AnSrW05izbsJxyeU2Nwd9+rZQd19NRqZbWnGQbW061Wi6Xy4oM/vbbWrlcrVY1iFpac5Bt+AgoCGFNGcJnEFn4maqjOdTSuoFswy1zKilD+Cv/Mc2hltaMAgKBxT2hwKHO1GhpFZTtOeW4KkXKhHG52h1qaRVQwgliqWZHf6vLPq3doZaWqoBflkvVFa6lfL6sMdTSUpDhlFPVUKqt36ikH0F3PNTSypGXgSDMzShQuJZ5BF041NLKku2WK0go+BQcGlrdWHv2LAfDX7fZp8lrhR0B/3U0hVpaaQIUNkQO/UPhqVR2niFlYPjrWlCpCJ/hj0dXuTom1dKSyfYr2dp+RrSWguGzEt6xlnOgStlY9MVqad1DGeU8dNYohNuV0obECdbRXiW421op51i+doZaWjG5eQhWKpTBZzvI3W2X1tY2nj17trG29kupRsNQSupanjPUJUMtLV7AyWewsiFAKNcuIzWPwooeFEpLK5KVG4pWorzMs2fpZb7as0i5JUNHh6RaWkSeCoIRYRk+boeDcCf3gJpCLS0sheIgVgMzWE/fY42DMDce1QVDLS2k3JoJTvXSzk4ja4eCEGoKtbSePLFVUjLKKhaOQmkKtZZeqn4wUNqLT8w01D6iKdRacsUZJOW9el0VO7x3nZYT1wpFo5pCLS03oBTR1yAI6qW1tbVtuBDBxYMm7C9sC+p1VllfDwLZZ/FyndumKdRaZrl1wkedLMC/tQ1CERPdzt5WZOvJux3UimaH35ByHLpCU6i1vALI19WDOn7FL6xYF1FInCJ7S/cXPsde6vWGiFqQWIgd11n0jdDSWpDscl2iqFS3U78r6RZsWksqXwpElN7cuDMIAx2Qai2lPCkPDa6S4c4grJcXfTO0tBYguyLF4TYh3N7ZaaRs0gGp1hLKktNQu7VwlLQ8rUk3VhZ9O7S07lx2kMLKbSVmqIvdkFPoLvqGaGndtfw8WNJ81qxaS1Z9CNLdmrSWTHaGy9ooyiBqYZOzTy2vqOkv+pZoad2t3CxeSjs7O3lQccJdJ0rZOzVy8z3aFWotl3ADtTrv7Wopri9aL9+/RHtNZO6f9IRov1qd7eMt+p5oad2ljNr8RAt7O2q7PVtL2UHXFWotlZw5QriRAxdRlB1Nk242o7VEsusiH9uNTHyyNyt6whoewHsj/Vg6NaO1RAICY2jI7FQ2cjbXaqxMmOcyGztra1mk6nhUa4nk8rafE0xu5ASR1BXmOcJ81Rd9W7S07k58kXAnO5rcUQg2UT1hqv8r5bpIKl0o1Foe8UXCtey8yppa2iUVQfj5jW21nXXTNa2lkV2AshtCuKZYXkTSPey1lkag1iBUNBpcvNmo1SgseHsjEY42GE2NRoPbv9aoNYT15N2OgDDexo7e4M5CQ6i1XDIaFBUoUn3XSNEG3Uz3VxXcn/rRjdh64S19XzMXfWO0tO5KnkDBNsRsbTuNpe21zM3ZojOlrSntrdOjj0tGs9Vqt9t7e3vtdrvTajV15i2SG+eslMlYzuYs0TrEXaW9a4u+MVpzkt1stbv7SR3stVu6jTCSq4TEXLSWHeuK0p7wMSiFP57EjvaJT57YnlOwgDez4FjASsFo4Osf5uELtLIBZCC2m7rr2pMnwA/uiMN81RxP/yQPX3Z1T4lAxuGiT/g+yPac+qL50y7wsQi0DgogiNTVGCLZnrM4j1gzNYCPRKBdGEGEYUuHQFi24QcNkgHd3t7eZgs0K8ovN8T9ZPvjBeHjdCH6RN1xNYCPRUZ7FgKRehrDSMB1gkbEjYDPNs/V9jblbZst8gv8eoIcg5A5QF0GfEyqzuQFqQ6NRZ///ZLhl+uModtQLfA97QAflzy1hGiG2vqRHBfwfOQU5yro/lxD3+xHJzB7JBrpoLXoy7ifsg3XL8+BxUY9cLT3e7TKcIMH3a56mKqdYZagX3SCoFYQx1o9KDu+pX3fo5bdSgdwD0qdwp6urlCRDQzP9X3fKZtBUK/xydHtBpx313Qc33ctzwAavaWQIXeDPQwg1GGBmLSjraaojMDxPAMAw7NcPwgXfTpady+vJ2MpIrCYK9QhaXFpCJddTQ6wPtb+gYjg3h7egvag+8XZI1sgvzp1UExG4GsIl1ktESSoBIJ73f5+/6Bd3QJbVdikhhK5f1A1DFq7GEG439NVhoWkIVxudfpx7ScQ3Ovu9/dbwAZYLeow+wceXLd1ED/C/oFOzxSRhnCp1YLIZCJ42D3Y7/cPmrZNILTtKv1EK04l9ZD9A+0LCwgQCD0N4RKquR9zYgcxF9jDXm6/iRC0MYSgSvb2bITmVj+pni4XqksnZpZYCQZ7gg/ssc1tBJvN/u7lQtjv6RypsjYFCPVohcukOINCKNrlSnr7HvGBVAS7Fn7XkkHY72oKVQUIhJ6GcNlk99JD0a7A56EdgxB08Se2EJEHUgj77UVf4INRBKHn+oGe1myJNIh5LrkX5DwewhDwzg9XUfRTpJtzK0qEUHvC5VFn2O8Ph/1hgsFDSNVwOBwymqqkOAiYR8SpGbYPdxxu/b5OkaoJBEHo6nB0+dTEoAyR+sOIwS4jiUHVJAwCVk3R7MdARQcZCsfUyRlVgSA0A8fTEC6ZwAGhDyti8GCYVCsOIWhFGyl0MulioZJgOOqWA8fVEC6V2gJA3SghI0GJ1FAAXFOIltqxPVJA7OuWMyrCZULLCUxfJ2aWR02BlYhBOUs9UiIEODkDADgYqkkHpCqiiRk3DAJHQ7gksgWIejkMDodVGoaSioqWEoH3ICAFnl+F00zv7O7ulBq1SrV5H0eHAKyy3jUDDeGSSIgmD3IZHPaAzUMIesoQDhcWkNpubfd3mZ7vVO7ZbDZAaDGjIVwKGUK5jTKYRdYhBRD97+azx9RdxAXalgjgixf4Pw/iPOtPbDDLMBRs0JgUCPWAoo9ZgiPsKjCIKSQV9oUYXIArNCo7z2PO78WL318IEMJ1zxvOzUNT0Gx12uQOttutZhG0/cDHmEkhNMxAQ/jghcYSqjatxENacITd3FiUBK0tA7WVMVqqSZnFuEK78vyFRL/LVr44qt7su5qdqJnRYIBJbCmT7QcBnsElCaHtBUGgIXzQsq1yY4dXjZ8thHeEB4oMQo0G7UGB0uAiXKHRePmikJ5XZrZ0r7XHIzhgy6rzxfmBbwaB6YIYhLYXBkHgOBrChytQre3AbODOzs7uzu4uXtrZKVUsvF2oniCOcNAfDnszAKai3p1duVEqRiDSy9pMQanBOcGE1KaL8wPPgLUSQRCYvuWh7KjvoPeB7xn+MkFoG80q0mOY2sb2a7tJ7SAYd0tlkHSEA/gQP2g3YeJlq9O/AW2jQbsri1XvyBVaOzMgiDBsFP/hq4O9TKkEpRBCw/Bcwh1su4ZffcswjOWBEPgVIW5rVB72LG/N0m6mdsrA5jk7xGWZQZN2kvBmdodtnD1tJg9wJ3WFdqVgICoEpQWrBYw25/XardZgJmeIIYTyLN93nNBxHN+l65YEQlAt0WiNdxgN/6FePKjt5mqnw0eKA+QH97YA6SRhA6Ng3oWqRT4Pkhj37+B+Ws9T+Pr9OVQuhrtF0ppNBN1gbzCABLZaLcrkgKcxd7K4CEKplgHCDIvdKT/Iy3f++OMPLgLd6XQa6KnyB6fdXZ6RQ2w0TdwiFPcabMYZOj4+jpbTGOywLr8xCo/vJB6tyR3c8+f/wcqn8KV6u+nWgKjdaWEN2tVmE69uN6PNOVaUA+HjT8zYlWx/8QC9YeWPXQohBBCpEUGIX3d3OUAO8JO7DXgI7UNMHk9hLoQjUouIfGGiUdvhLV85OJJ6wP9w4ra8ir1SNRR/8tbgUECw095ro6s32oPBANi2KoXLDqGzI+YtdnapjWL98UfpnjVtypNd292lCDY6HR5CfEHk7wj7tuPj4TFNjbZo02yAMGrRPdA+7A2H5HH0Sra0orHYbBv02XrE7fHwdsvZzZevYnohAIgghGvh/xdkjxevEjpSCkmbAwxhmxAI33okiBgMBuRFhcLlhtCuMdx2iNPY2d3lYjlkz5VFn2ahS2rQC9jpcNoRIIRPmR4j7HhIetI3Addf0La9CMJjDkIGFbeWvTM4CAEYCBAeHx/frE48R86LXAT/85+XrxT0UuHB6xG+OrgsCBcP2zQUbw8GVRu0GYSDzBE+/MDJoNB63C1mvBL1eTu8tZKVfzAKZ8hcL0p24whq94hDsLGzs3u0uwtXw79o6egIeiYinJYZ9LZoaY50GeQYxO7wOPKGx1IN7ahtKbDtNvdRpNvMj5oxkiQEEk+oQGFu6RW0B4eHh5jBTvsQ+cTDFoWww+jDWwaDrAPafhC4KQh6ThA8sFiskAB1D1zY1tn5YzdyhDQwVS0lLFx26QhD2OABlOk5hw6xk2ETI5gGoYqAHEKG++1dei2GkRTB/zxXYvDVqxd56ZnWIdQAucFDqg7zhGQFhJAsZT7IQRiYvsQbwqpDa0G2dCdCDELHwJWcdqJiE1nCyw+FwkBksLFzlKZeREYfM9g9btmAh6gq8XR5EDYB4AYHHiW239qQT/XcQBTlRhUZfPXqlZv5dU1MVkdg8HBAclpgcJhQJ/v8gQ8HefLiBJqPuwcFIE6DuEHoMnZTTfaotujTVZJHGMxF8OjoNeeeMIQHx4dcZ0EAkn5s2G63czBs07EQ4TG814nttzX6oZ8TiT5//rIAgMiVZj0viKtriwwekngUtA8lyotwbQu2knFc17Us1/dD2qr7MasmMJhlr0gPYtSdUuQHG43sS0pA2D0+PvaiyV5sGwzjCCIP2c6EcOhFdRxgcEJXn9ClWyoUei+yGHyulI2J688MAppyBg8PYau/ppTBQ4VL9wLSYA23WnvUThDKx7ZI3OBuHoNHamnr+3NNeZd0zPHRRY7w5OR4BOwotzmIOzHckdduZVLYRUdADFZPkhCObuXCAU9ZLBRNhKBv3iSBg+sS649SIUCOsHvYabXag/bgUFH5TRVQLwroBl13GXrWg111e8UqLfqU88VfU87VvIRYnBAdH3R7fbTUjaraB2hLtNOIDvprj/jPxpePu6SuDLSGJ0n1b+fC3yBBkN68iCVi6Po3r8jrG/aafCduqad9X/PwsNvtwkr6JqoOTAevCgDb3Mm9jiUb3mIVg6Vir1T3/p74JL6GOtrY2Dg6OkJ/4PLGEVlzhFe8hMRIQOo1MYTNXhywFoOwJYInHuf4eNiBIWl1xK+PdBulnIAD52UCwdmVmpxpQwgPW5hB24ZMpjg/uNmjW3PDS3FCmHtvcDcUwPZahMH77wpxibDRaHQ6lDWeO7YMFxFjb2WU9Nqtart38vbtW7YZLVdZ4rQprJcs84rvcwvNRz0OtZdCIHojBOHR5I8MgBhsdzq0XrDdZRB2u3gZvnZJ5X2HbMptqrBcnjCAhrhLGEyx1cTyPR/AFqCzRY5wZyNPryMIVeA5iSAEdnUGCN/S5VtIj/4pZfDmCL5586Yh/cImLhFGEHZG3XfvIHX83263S6eMQ29G3dx4dLkg3IWGWEIMbhxxtpm5vL7os86Wj54ZjU6j0chlcOP124I6abNJYNpFP3vc67Hvyy8YFZX5noln8A1Z9+b9THrz/s2b9+/fSBurtN4dHnYHnU5nQD3hO6TuAC5ACN+968LXNnWU79C6Qd6lAGHO+kcOoYEcIfQZu/n2GpG46NPO1io8xx3Fi6JQ9FrV1kgJwqFBUzb9ggyiKuzOMX4z9zoK+6WMwZezocdB+AbRK/3NIWqjw06n/a6Ky4SYwXctWDx89270jmqEy4TsbV6GXfSEK4u2qNtViBxho9EoFWBwY+N+t+ErUQjzg9GNjRPKB2pdpsRSj9TCKzHLM4hr7lu3BGGDcfMqYvDVTRlkkrmjQ4zZ4N27Q5wdxYwhv9d6JwhlR9m7vAIND6H72CeEWYd2SJOI6rrf8cHaBn60KD1YKFc449lTo7AKbFBV25dzoQZpSNq7FQjtiLfniVB0DtpIfiXgKTtsH76LHCH1iqN3MeEVeQXipYKwRMLRIsHoxsbG6qLPO1PkJNeULoUU0GiVXkGwiqhHmoQTfzvvfr3B7TL4/n2ymgKGl4etdoK2EYiKh/xquE+72Xr3bpQPYWgtzZz12FCPivnB+56ZqQUFguuXqFDYJBA2bxFCNp0aJP21QrORYmKFvygYnSuDklJhczR6B/s8j+IaVJvtEaRuNBpRPNEyilRbIwUI64Hv0TLhI4dwtYi9UpVMc9HnnSlgGF6ofl0vX75+SzuhFs53FvGEtFfF6PVhlVVX21unp6dbwDAAQEuzXnSUGn0+j/LgX5J1ibpCoz2CN645UlcL7T/IewJtwpF+TddYCk8I7dUpxOG2bwDjfjeotQFAY3PV1AJSyOERGdG+cIVFEbVwQseILBAYpzF9+HA6290t/UXEHOHLv/56//4vQXnv4aq/JEJY/iV59NpNqSdMF4I2v/WxETgemiJ0GSCEs+fADluBkr2WTDgGK5hhup27vyyAR0TwV+mV/fln2kW5BjDIEKO3yeDb11vYF0IjOx2PP5ym68PH8Wmxdm2vKDBsOLW/5i15zZTdbA0KQNi0VawHJ2Y8MlNvuGhzun1hgwWev1pKRXGtZLoeeCAE8pcFT9nwfLO0tvEnL0jfKhxpHV0TZtButm+TwpMRcoXw1E7HHz5Qz/dhDPXx40f0+oFtGI9PC1xtM+4In7+/GXESvUnvTNFstQ9z8HtXZIYmg1TWwzEtnGWAEN5EYrGwJOyHZrC6vl4qlUrr66urQQgLyGSr0lPsHoleF3R1aJwSz/Msy/I8D60z6FVFlwVatwLi61GHmxPlw5hy9lGiMSV0/EH9ShtxR/hy7gz+9Vd2zRRoVlttmVOE3Q0LzZAWQYhn6l0OCJFsQH1HUg+PP+66EIoo9cFfEIjzF6nZGc2xcNgbtMTGDacfx6cfPkgB5EA8Pf34Ud0XHv1NvNV/nqMBfqkj/Pvvv//+6++II9n7v8l7tvpvvCWxn1JSHHjNVqRqc6YiriE0W1siCJFsj3McBvEeD5Y/JgMXZj1UReABAzpDK/PBDprtm5PYG7Qkk4KdQswmPHOTCX4/idaiJXUIX2Ka/n6BIHz+nL4vLgqmRGtq52K7Bm7hbnizzigUQegtI4SWx6zV87CxPoJRriwPQ4iswzIMF15XvoWAZqs96p3MEn4O2q20PLw9nkwmZ5OPkwmCboJ09pEt4veTjx/HytdnU04ohH+pMldELxVPZn4QeksJIbC8JpzNo9vdP+h2B3vtVtNyH7wntF30aIkgtNQgpDcFzgCt5BdPeiOF/MMWpkzQ2YR5RbZV3YItysl7HIy+uA0G/36vcq8MW4DQBrMMhxJBuIzhaLV9sB9TV22Cx/ssQCBEf5CHt+DPW7QdutFstdqj0ajX671+/Rr3EHz9+nWv14PV0K1qU5WaU4jZWQxC4R18WyA7akagIAhvhcG//1a4PtvyLN/zMIOWb3mehrCQ7FZ3X6ruA8cQQFtARYwIQsuy3FkOFTgkvYrMDIXrbmFD+ZCg8OwmDD5Z5f3Vqze3xODfKk8tD9gA3xULNv+0Z8ooLG1iBrQO9lPVrT7kmNSLQ+gtGEJSLEyFcDKZFKifePJk/bawEwWzTHaOgAfEt3kfEIVvz7JC2OzuZ2pwvzsRZsqSQAjhmeHBYgcOrWeE4S2DsGDvrgSF8eVx7rmRin+0XFoLahv/d5v8vT8KgpehCkbAsgAd99izjGIMEnkihCm48tw+sR9uJRoVGHC8HfR6Mgw7D/YqXS8OoQvhmWVcZxs2qLo5hAkKz2KxKAUsMrFs9wMVHN1SIPqyhC5a9HHpJ+NbFor3Xcsv6AeLQJilJ7Hl6EbeY1WjSPQAzdEnpfDBFg1TIJwlgT4vCOPZmU8Cg1tFrc4jckqz1xCm6M+GT4/OZufgXuOybZgGI7G669HZOLhXMkEA4JAWI1hgWwKE5mwkS9h8kni3aNOM1NrvQ8j6+/s9Mk1mb3+/e9iDq/r9fRaoHjxMCm1rDp6QJBhSIDQJhCDjkDb7i43AGHMUfuIYHKt5HF6Gx+Q3/pwbgP+3UbOiIwM1GRyEluJnOIhRLRIM+uUQAlD87hSH9e7V6vf7kLb+wR5Rdx/Nd1w96Pf7PcNuwo1QD5NC2yXU8BBaRSHEs5IQCL04hA5qbpScSzbzxz6NKPwUMXiqbCzRRKTosiI5pY33N45B1yIXiK5YFSP4hDMIhG5hCAGGMOA69ZqpsAoeWLgzRbnbOh1/HH843WI6/YBWMChvmc0WIWyfeMHuwX6/ja8L0texAej26T4PkcIIQlpZPwOENpyZxALpEMI5vQK/2E8PPlAKP1EGTwFvRbyx2SBPBg+NG+zOGpr+vz9L4RZ/LFUnGIPQcv3ZIHQD3wkC38iAMFM2mSE5gafUjQLjlDUYhP1YPkQteyeT8VbyI/M3UcrgASEQsUavpt3vt20Aev2HTCGD0LsBhE98B7hmEOLsaALCMAgcywiKJAPRj+uNMYUIwk9n40Lmnseh5/nB7q8FHWApcMVjqPvAeULoeaxTb3EIlbS1tWXbcDwDsTH9+IPYuh62pYcggq2t1F/3phZKQ80uDkPxmwF9BFf7/f12ddCP1Ht4U8XZpIaCNOCeEUIQQMtCE1Y6jgsPidoXu75TDqC5ANt2zXzq6CAXVKcoMXqGUDybzBi+ZXGI2l+a62vP/l8We79ulFZN3018NGMOeSPWKYXNLc9DyO0B8B+KdBbaCELD8OE0hbcC4dbHz1CT8YcPiQ4tiR5mGEv8gVOFQBcFr4UM9GA47Pf7Q8TgASWtTWb/spvDvqjhMHf45Psnd3YIueqo0MdzaHuW73DT54WO65FHpOkmuWPM2fJ84hYJSPHfrfnYWJJDIui1y44TBvX1Wj2oO44Ppx+z0nZPTBwfreI30mX86uLAwxMgLCaf69QbBsHcEZwgoAhifG8WpM/4JYkl+ti4WIkDV5dkG1l7iAQZ7A6Zurg0YtstxJ2o25pk9s4gBLTFTDqEsrtpBSzZjgYvNJCdMMJg7VaUhM/ALmYQxAmeoVfVyC/yLPitTN6C5OMaIQShk7lndJKG4Rn0DwehAUeaCQLR6xr85c7C4OnnzxOhK9nHCcJLpkl8z8+fP4KUsqWai0wC2YwY7PGgbZHIqTtMqv8ApglNQIgotBQgzIgmA5cBxk+Gzfyc48xgEcYZLxlsOaylwHdPILRmO4RQTxjEwEVXVvDyOGw/fP6sxB+PooDhBHDzOM+CIvlLLQ6TdyD6QUglHqe2NZTplqZ6vj3RtqOkcT/AvShos7WogUVOjYIfmC7v+bBTJDPywgLMTFmVCcfgJHq0E6ByYVO0RjeXBtdVOlC+SLs+HI7eDEJPgBA9ORWEd0775tOIKczf+fn5OV74TJa+fPlyzvSZrGUgfj7/mPgRWYF/BjAxZP0Eg8Nhrwlsrz2U66FlSA0MoUerCXEvCrdofQKAtRC+x0FIF4HlBOEsSRUDGDyE44gwOFk00WyGLBIWRCU/16UMI+5834KTUvtOMIfviUPozEa2z/esNwO3gLLARFf/+fz8MyGQA+3zOYbvC13xRSARr8Qcnp+ff5D+mKwQYhepqQQ9GoweDnujobLmPYT7bQugAInUUFADsVwrmzhp1RysDHQsj6fQgxnToFjbEG7EmzEPISknWb5vGayq0PL9m3opJ+Qg9Ema0nBgbbzjuAhCZPhzEOpEyDxh4RNHyDh8OCqB0C8EpQDm5PzL+ZfPkwjA8wg2Hjy6/OX8i8Ah/mReAk3gMVvNyBE2gQ0GGdwdtAyvxXI096jJXbZIwOmylmY4OYoh9OLMKcgLHFiPHIQOTCv6DsyTmo5vmgZXXokJl2HSgkoewlNqxoAV4/HpeTfE0HQiCC2HQuhD7HwKoekUP67EeXIQwsMWYI8S5rt5EN5AY0IVg4yJLNMteM053Ub3hJ/+8nmGhBDJlCfYHBBHONjz0LZuOoRb8BDNh5Qg5Yt4NDODMCKO0PIV2qBIIEQ2Bo3WQfJdVFlvKj7jhdAI6fTs09nZ2adP8K/LEGQXQXUjDK0AVkTQL44ghNi5JoEwVLiG5DUlVrmCJ/TzPm8lMIG3NgFhAd+XI+wDv3zlwfsSgffly8VlBCHbjpcuL/G6D17x3CzX9ElozD4cDo+Ph4O9QQsD2oTvj4+HQ/xKl2EuBn+qO8QrRosmLJu+hGhmhoSCGIgirTmimmgctCUacJupRiZJJwhG4XyKZEEbliEIZc0eLrqB70b0h/SSUA2CFWDD951ghiMnIfQZhLDYneJdJewJ90TMjqbvqMBmfJcxpurr1y8puvyWvuUSvU6EaylaURKLRhFkvcHeoEoS7n0GII/h8fFxC0dsHbrufsajdlp2E7jcvSKOUKmFPx83omosNwXCQDSxLOriOmMMTlzXt8gg52KMjKptvZkp9AM3gtAIqSfEEJo+hbCor0VXFnftqPrfRXcFHjSxfw4yPobQVYOwMIKu605yKEyFkDJ4nvJkKeoaUV69jYA6HOz1WphP7zhNbfyJQ/r+XuVH8wddACTDaETDcLt+ZoVCWrW3L4ewHEjz50p2MmYQjjkGpWc1K4UoL8MgdDxyhRaCMCQQKmdmLNcNw/AqvArhC3ldoYXO2EWr3gafw8UPRQgz/Z2fcgw/7TscEnV++1oMwgvC4JdxskwRg7EAiiPEU3ewNzzAXrJNEBs1QWt4fHxyckKh63s4kXNMVt2fqsJM9ljOxZD8dnHsEvCl+BQZhE6AU3CuwqPex0aPl3wuHj1DDwY7FUFIITPsQhCivEwahA6FUCUzg/kjIhBSFuEiqvUQsiyRhDcysQ+UCYQeLhMmD5F7KPF44srKl0wKUyBkDE6yakAKw3hwAjU8ODg5eQcTL+1jtOKkD423dXLy9i1+D6k7qAIKJlxzuPg+ySpVMOoSws6M+m8asyUg9PPY4wyCQxGqMsYqUz+YfuJG9Lmkw0k/ayEvk4DQIUfMy8xYbkjBYwgyICOF6UTge+DGrp8Di55JGoSJQ3Ivia3scSdsj4qFNLxUgpAh+zm6524ehhTGdBoNPLQ0xupkNMCj2568fTtASXG8he7x9u3rId4RD/BOzFyhdepCCFRsuKnk/GIQ0sBWEUKfBEFJCH3uPVkDUM/8rBO3IuNl0Zhg5SKdJCpGZyeBMBQgzM7MuKEEuCSBTqZfEvCLocihog5hAmfZ8WIO2fUnWRRKIbz4RtaeO/z9PR3DtqVRJ8TJ5OMHV06kHEU0N/TrfnIcaegJU6dvHw5G8GO8xd8bAEHG2Cf5HjBHFqlGVoMwRpn48OaMwuVNEc88Z0tPE5CIOWZSrnBwX2aMKOUiC0c9qxyDkIM36ch9JxvDMHTI93JPHOqq4hhwf91kjBmVCT0MYXQ8/lW2UnY8N3FPsiiUQXjx7dsFZrCMipVlx3UdriPieMwtfzg9dS3XSWktJMIIIexIp4h+B+xqyqjvrz3b7rx9exK3/zsaz0oh/FSAUPB9Rn7zSy7qCOUQ+oHD05euOKAstIR/DcPA0ydLxFqTJsM4eTCWhNBLQBj3hCpn7oRhGPI4hmGIW93w8R/nrpMBIx9F8h9j24TETBik8CYcL/pi8Xjx7WQNTZFKKJRByBh0XL8yQS1Jx+PUibXgJtztKaPJLv5VmydvX0PHIUMtdZI+FKrGPOFd+cTs4FMt/jQKhp/xdKdpWp4kMQMhTMOAt0CJT4jWwIPClq7ZSnxNwrQTHsAxXY7CCEIPQehHEDrcUV3xeNSsI3TE4NfnL1YItEVu3JiTjN8H9EeAUEjMxI4fPz/O50nPP9o+FunKhvArq5zwnUmsUwXfDUPshgg3OHkFRq818GzbKzbbF5rRtpmbE5kzfqkERn1miznAHAZTqxuCchqE/o2FIczrsGQVP3A5TIHQRBCGEggV5HTaewM4aVBnDtcuykx4wvlrLMaZPISxNRffaCW97ztcP6hJfs8nSmF2FhUY74rN+tVS7a1xBy4QgPhgEen8cRTiavfiACIInRQIwxtbBZxDcTPXERreDDbtcGVCIwGhOQOE1Q4/Ynt3zhyafJnwliD0KwJhFxcyCOFankF/QiBMAEg7RJFuUQTEyefPiX4dcqNTnSL69ajdLNJf6raj0EIQKqdfPBl7dwEhQSQ3Qp7BpmMQWuSWYAhdBqEZOrV6EDj5RHXio0P3OvPkwwysaH5CKYSw5Xy9frNvKZ9zFFIIL3gILy4uIgbH6CPnn4VOUKwPRvwVwjj5+Pnz+ThemZEenlZzJuDrjTpNatF2rGNxum+8VQTJN6dhh4HyEmFoTgHQs7Ig9FMhNJEV3yQqzaXvphB6MU9okDJhBGHZ2cZaX69nXEqVeMEDfgqh7hydYQQhCkdjRw7q6+v4NG/4Nc7kAnL29dvlxQWCEL5cQAghfPjtJWTwAqZFfeQ9aecm1tGJtfNm78kK0ltjwpLNKhx6XrPaaY+iyfdeo8n3Dtutamozy9zei7eJoJ1aEoSTD5Il1/LUGFRqdZYKoRlgw7hB6KQKYfFCYRqEuLKegzDELgZfS+ql4Om70HwJ+weIxy5cc1C5IRPcCWdBaMKHRE3JYeeqfH6BKPx6Eenym/AGEzomH0BZ1a/IVZ4L5UZJXQfa7Zw0cnKTHY4zf2UHjfaKC8W5gZ7CoDfzRhDk1Ah6Fh2zHu3tWaTNqARAOhRCngekST4H92SSQbi9vh7cKChVhVCtyZZgtqgGIa3FjCtASJVu4i00WPshGqS2A8BWr9+2O2hM2tbNqSAnTCA0pJ5wHvSxY40JanIIyYazMt0fhbAXyZSqBMKvaNVYaDoh6/ifCiG9AQ6poLoRi/NmEGRXCMLZg4TPAy/1oYNugVqra/ybpUN4Y3twyVMh/uPQZbp+Bpt2hHrCWC8KXwphqir7eJRaOEx0F97ear9tt/H40dU5oRFkQjhfOZMYhV+/xRg85138+IuUwiSEl2jNJGZFs0AYojHmFPtozNkVZpQD5YVBHIF6BuuTHhUQLbkflDGY5JCr20qFcD4pvLQRUqITm8kPBI7QuDQkbdW9BISmgs3CgWoP9w4PUDdT9Igb4hEX4MjQc8LlLiH0/fJZFHZeXFxEPH6Di1/G4t4TaTXG5aWUwfNka0bLzc3SQENwuPSw5zpWPoTMPc2TwqLB6PfpUzR6BUCzI8XkygqDVnIALzeTQdRbQgqhMxcIobVZljxqQSM/zWaOMQhpz3oPhcAFIWyjsRjIGAw9wEYLI52/54PF3ULo+5VzjkIG4TdYVJwkvvxMVqN/GeuRgbefO9ImxTJXyLNouZ4Ph2wggxM4rucrdFak4+HOEcL0bExK87Sr6XT6AzJoSxhEvjC9QJgTiUYQhukQzs1S8IGEH41bP5NN81UU0RgzFMKwQDjqQPSisfkGADT50aEP5nMXBAjneGvTNY4iUhyOXl5cfvt68Uny1bg/YozCGITEU1b8mSD0HGCja0cleQPYhqswnAbFIx3CwhxmQYiHBxdPYWU6nT5FoxrKGASycmEhCLGhmubtQ4hHr5mnhYkQujeBEA5LtHc4avcSoxDhNf/M54TvHEL/4uLykrjCS/Ln8uJiItvVQb5Q7I0oMokZhI29peGorLZCME84/hE3JhR2hPnhaATIvCDMKBTyHZU2Q1QUtKbT6bUHXOgIGZ7RiRsGkLRpl43/kgIitY7QlTfgnku7NVH0/GeoGIxJzI7SqZIMw3HFtqNm/jUcQEfYBnS0TH60aDQMWG8ul367EF7Jom7IIKSQoAj/XF5ejmWfd3C5EAarck9IGXSYYkdI9PtPIOnDcTVR0OfBwVuVhpXKrLKfNT2a6gr5djJPp9cWAMb1dDp10Ziiaa0vPXlAGi8RpjFIRoBwUiG8eZOZmJgPn/kIDjkns8xDSMYUMJIQ5lt76/h4eLjXtIHdgkMNvX5Nh16oomHAhsfHc6ksvE0InV+mU8kBzy9lGkccOWVOk3izU94T4g5SZxyDchR9Pxmt0nSACzsEOOifH0YGa0RhabLuPiMUnXsdBbCjMigA0AMC8O90Og0BnC3dsO2URpeuxBNa0gHR5J7QzYZQIalRTPTeWrPa4NX19CdaKJt8szXcag2ePGp4wLoyOQrWPjg+7u/1qoAMUNQeUAg7cChpuDCXeDSC0Js7hE+n0+lVfKXjfJJCWC+naPyFpXBwDcU33M70yxdSppw4jgKEqaVFl1bWwwFFaEFi09hkEyP8d/o0bZAkWXKm4GRtCuVCwPWd/y8sC8Jg9L8wB5rV+tJN2SRDT/yB2CCjTjqEZuAUVra13BTC8Ho6/QVfgSl2oqBlQtPjx5hRgXB0cnLcGw6rRuf1ycnJwLbfkYEZXreqbTQGw2geoMzDEzqxbo+44yNi8KnEvZ1JIaykQViufIoavAk1/Lhqsa7ye2dkbHwOwsAVglXsC+FlZAWo83OFGd6QFQrhXb1G7lCaAuUgZDOF5GEX4RdTOfAteWLGD4PyDRX/xbC/QiNazGSEv0ynxBPiLvOUQlpNiBvM4NHWyJiHudbee3vANfYfADASWhi3R2/nUigMTK7ZWtEeVmgAgJ8/f/789yevf5HgTbm+kvxWcgizfq/xOUfh5TeOwS9JN+jnxaLh9ytmlT9+/FiJ6gndMJ7Hgcb3byqF0tzMzbrc2xlCX7gJi4MoGEUTNWdA6OYEnSoQurcHYUxsfk03DOBzHNkRtCY2kgT00eQJS39l9sR1HPTIJ+t4CEkNBSANZrghD6G1s+PRJzf/3vFfvjJsnsKBwODIBq97nMU5Qhszdmb03LkNbHe8nkJIPSG60NhxuBDFp9/pEPw46kShJ/a/8D7GQZzIGDzP/okmsHrxkocQ1XNMZigN+tfTaUgAhArTIbRQYIqcz3dZLDrH8qCCNySlQhiLIkeIZmzgWyDwLWI8V9IeJY/COIhmOoROMGcKIwivZOZEzUj8pSN0YLXpNYUBD/SE7wzsPIwhxM1V2eC/tNWPwyHkO8L7K1gNlN7vbWSDdjm6cz7BNzoCw8zxeeOk506XnQSEfmx/+giKWIQAppDHiTAo3kKkugzCTzm/kTk+JxRiCCGDagjGQ1HoSUJKIITQl0NILHsTAAMVbmNlwXlmZPIwFMdSg/a2QioD5W2/6JAMP378sKzs1toJCJnBYAjdewIhMSPJt+JThb8qzRU5uKKQJkcphHgkIsukV40bzIhG4wjvoRH/2/mndyIh8KT3TydWluZ9qIi3HEK6fzwcDX05hA77acyrPPyQ4E35Lt5ByqEUwrPcX6lCqzTw36+ShEwugJZlobCFY1CE8IfYvm2TVDHBD3liHHqbDEq8IVdN8ZR6ws3NzU06sZ8IlcsT96OoP2T3MwizIBRVxnyYpmmyB2e0/P36Z3I9/ABaMIPgivWqyIBQMCNB36G5sXfovMmP6HgMQhwusGsOuKjQj8ydDxyvSWqx1dlFfd7gUJive73RbqcV797AmV9amc6J3WX2GvOEYbS/kFIxTXjpQZDrAIngTfkleQMDdP+lEJLfxSS/kWmyF3prMYGURLFSQ37VkmQMfLj94nLWaEEIPR5CjN8mXwr0+ID0tvmjGMrCUnIuyDFvUnEg+r6bMr5ArIIwFUNyQ1GuLXBSIfQDqcrwFy4HcQi/T6fXUjjLaPern//+VIUQcUjpZdTB51LA3GQQRBCaBoUwFCF0Aoc5F84vCe9h0DE1Wa4BTvpoCR6NxrC85xJs0vE5BxaPpNnDToTQFCvpyvRq4fUFigBSRygLJdD9v5DWUIgQliGBYtgR/1g9i8CUZGgIfy30A7FGXI4QjqJSYDILg1tqcrO33zKBKf4QChkGdoUAbFIWSYbfFXlLq54QfWLswYv4M0PTNGENRTEIGYxl3l/9xIxQQyKkkBccWRWAEPlCejR8FBgc/Iy+kYeQjs5ueJwnlAfUkiw7OnNmZx4gENLESBwqBrMQnPq+JOnllMsMtSDkIPTho4y7FP5e4Rt2peYKUczH8YdjeXpoWUVhhf/O+M3BtydeyV9WC0GFES/gw2FFNEwnGmTHdVLngEa1ArcfhSpwiLOj06j/MYKQnLi7uckubFNaTxiHkHeCIRWOQ4JsCK+urvJAJILny60uc/vAP9CouHDUzOAPWlLs0/AFhjfCd/tJCN0YhCF/NuWAvtDTw+8R3utohYMqfSzX9ZykhSZ9V0QRuRPRW3prohUxCBPXF795ZXzXsmG8plkZmJGJPo3+rAeSOooL+i2m5PqI4uwW8YBE0Iv85E3S8IyQh1A2iR8KAn9Au59rZcSMLMLkKHyWfBc7N7nCC8gbbDtyhOzOrazwABII6T0leVcWyqFRIa6uVleD4CrIZjEIrpGfErBkdhkEJv7dcY2klQrhTz4rw8wR/4WFnyvBXB1uBG5aRUGvnFyDmfbM4FApl+HJk0CXJgU8/hxipPG0JPchf5N3KAXCxBlG8EYnSmoppCXCf6/4RwA5TH19u1TalmRmksnRpP+OsXuR4/8kBSNovNeMPyJ4A2iZ0HdSK+O/T6dP78r7ZZH43+n0Gv6Z0rwpoY8MlRs79/TRZhKOkEDIELzKYyv4ebW6ukrbZ8h2MNGPD0O67wknSCIjtqvP3HMY1XvhpavoI2XREMm767gjDAJutDU2/5QIYczfRD4GH5muWidnXy6TSYsdEiCKgJVK2+t17njCmQZyUFMhrKdDSM+LvZZpvBrf+2lUTOYgrG2XSvBcgwAy9PUr/gtfv349y8QPK1a/+KkQf0jQEV7xABqkRSG5AfFBZni3Bz3Q5uL4YxzCS0An80PI1xAI5eG0FMWYK1xZWUHxaOQITYQWImyV189VCAbkjzAYSHwhOQT8Pa9RVsY0gwzVTTgPt4XKDmE9F//Yw4B6WhmEXgqEjurRiStEAamBIJSJGndd9bDwoqFqtfX1OITr6+s1uK3YbYiJPfo4rUfnaF58jaueil5U8Is50LO82DPZqOsaNn2hosGFEzWejSCUFP2up9P/LhZAKBgWgyfoZISz89EQv0ZqmVaGYlSniCg0w9BnORnG4WoMQU5Xq1eBxAuaFMGQZWV+Cpk+/rENzXB9fX2daw8eEhsMVI3wF4YJ/AgybVaaTYWQ7Jhv6T9ZqZBkR1OZIiCqnHadXjcSvGGsLBAgCLFuAOJ3vhzOvna9zgp8Z3EGLzPpI4pVbYzT+ZO14oKBJyzX4clGItO0BAgdQ14DgbOS14tG8MmT/06nT/ELOhl2hqQFWxaEIouEQ+IQEYQmMoWVFRiYmqboEgUF3CKiTtjbRFOmMMFYkdZ0xRIW2HSxvUWHpBZYUzRBSMlTZtrQuOvrgclBSBtwixDW19drtfo64TDjm1iwix50VqYLhSCmHKpzdgZnCv/nbKcBv3OdUyBmuX7y22b1iNf0pqBfyIzV6cDq+jiEn3Kr/KBi+VSlkQ35zj0wSjZitrjp+wxCOMCHFfOEkfnDhtw/Fs3gk6fT6RVziEwchGKlYjqKxDVs0plmLVwsRAwhDlfELI2SwtAJY49RVAQQc/OohMLCU+YQkB8pbYsGGOT7Q5jAxPjxdp3qCXEI7gS8lWc6RehT0CY3H8JUODufeJVKPGdwANcS0zZ/B+IUqgJpJuIPPo2L/15yAH6D0ahSlR9Oj37FDH71Mx2fgB/JXdDGZwQ/bH0rvhCOurjajXIYs/+Fx6M2eRLAV4tfjyvVLVdewZ/tFrmqCxcVDldIIZGJxEoMSrRMhWs24o9RWnENn3ymACG0JJhepRRerf5cl6iGDW4d22Ut1fzq0FPFfct6vp2uJ209SSIKMamndbPD0QyJCH7a+QWKe95gDNlw4Ikzo8dpbG83ZMdHoQUrhJdJ84iIO/r4E1JvZyKEl+gZGsMQdXgwYft5CuHZVwbv5dcLkT5L4vliXeRhYxk8rCjEjAD8IyTxEzm5FctiGMY4vA/xKPSA6Iyup9MVwh8CjTySfBDFz0owWp1//vf77//7p+OjGkYSnuKxziRN2gigqnJM6Ai/i+1xoNXg3zrk8jUoHluFdR78A900YdhIRoHfDoRAlnICv4ErYCW1LbykKU5hvUZ9My1zYgi5KgTFSLF+JjL4qQ5rCSCH60qnFB2p0Wg0stvsmjC0MFEh4GksJnGEwCYIAjEaPTNpwZT3hXjYrRC1pEOBZ0X4TDzh7snA47RJesKStl6IQKgVQbDdGm0ORjCkAHhiCLgQkSIhdcsILdxihgifOH16xHAkkXZ0Tyr/+53pH19Mn8bb1WDIZZGKLx1kC04Kb6KwKNZmslKpVIRmkU4YGQZlD6Z1WMsSVCsZ1GuRqXE7f8e5UZRmjMPHh3l8wLctAbIuGD2NjeGbdfwNZhzC2vb2dq2wG/z0CX8GgriefHbUarCoGoObNrat1Wo1ruOtU3b4ygQ4oD9KtjpOmCgEiASiWt6db1Rfv337xJXow3CFo9Al40/iAZstPoqtGpzbw05Q8px32bQuaHwyXOLb5Fwhz+EP0utgU/SFFAD7HhQKSZEQ0fgdYkWfKDSMZI48FkvL0k1NDkEorol69kwWtGuGdCRhwi1KtPo+rF6NNVGFhiP3m8qCxmcSFFluFHrSYDXLJaarhumLbH+br27A2X7TQmXCCMLGdkp0mM3gWZBdXSOwZ7KSHAoiavW0EQ3QB1avYMNTx/eFZ59D2yLylcAoBUYijO1Go3F1xUHIAh436o6CQLQsi4tiL1hVrEFtJgag08FRQAdXwNv/wlpuFpWx1s+bgvVsbm6mRaP3oVAIWFEwRFeDrwM9S+hzhFwEANIqTc4zgn9EBH/vZBcek+NJpfJJXKaL2wleJX0kN0ttbkSbqdA0xfowmrJd/bmqgF6tVs+wf+Zvf4H5UdMhEJrEMaHgsEHaJJhco2fyipdqCQaREwtD5tXhm8hJlVkIoCrUHwPVC4WMu6ekh3N0G8N4eygzqv9FN40huMIzaPGdVNGv53xDaZyv3759rdOkzOamJAq1vTF/3S6p57vi3UIcRo6+mAukuqKx4MJk0SIhLhyyYDTxHElhkJP3PMbg/0Bm4ZFPrCanAZbQiP7C8MOXOcoklkUnfuGzr1FrV0F8dcrq1SoteaY08Ik8AYv34GKIO0qVy7R7P0t+wOCwJi2ZOSwnUokz2ClGmECbuq6n05/JPjIkxZae2w7xoxwDaLkWF+yg7qko3Kqzx8mK/+OHy4zOECsWQFV89gBiv5txt5CiFLtlWZGFCVxP/yWLT6ffySXEnyQpjxBRzd/jMqS3AiiJzKOTpPIn107Q81LDV4XBwNMEAxyfFnsST3vBoQUBbamKmeOwi+V3Y0pWs+CgGOYls7mJM3hWyWRslkGQXcmQu6hG3I3uLZdjiyW9cW1UJLjLD5IAiP1q7g/uw2a4wsVelhg9Qm3FslFbT+aT24TBoLdQCJ/Y0fdHTxTFZwgvP47g/4wnqccrSCTP49Pp9N+cCYNn4JKn8+d0+m9KBEtrTyRynNApINgWupjLon/rncgYzzozjlLq+vLcV2pzFX86vRar76IbmkUzPQzsT7uJw0tUl+Cx/MlKLI/5I8pkCs/+ZuzpU0FruWh0Zj1NONOHqlYsJ9PJIvcGTD4lfa5koxNny8oUZ31XP/0kmnPWUzqQ22xyyuVquo/Le9ikt8tMb6ri/4zN/yjc8vSPY/RYoSxWZKPVekR8FiUWfVVjDFbx6us5ALR5Zd30EPdGzQ7j8HmngH+3C0Fpff9vrrcsCKdnZRFKbTXPicZXZO8fPv0eTyO56vj4XJF3dsbYrI05N8hLvbNRoR5l2TbJf+TrhN8m7ZfdlIntzxmJIcaiZ9S+rO83doSPTbbXrLZala2bHSRzmEbVAJaVLEEamYaXh2fCleb60yTCBfeXfT4fpiwXpiYjS4XueeqgZZKiTZEUCvArJBA/u6GBac0iO08FrYQBGllZwneq+NBcFxt7J0BMuRaRIdlDuu1mJ8AhlsdZYdI4Jwcyp3BQzCloPUDlgjkrnDJci8oTAE5n2fDUvTFx3uz46hL6+MwspRu+aKvQuh9SMpY5IirHFrMLAAPAiCaaE/HI9kk8QdRn39ZZ8zP6adi0bkfqfNqRQXJNY28R29sVuZ5i17/oX0traUXtr5jBxvnNXU+Btvn5WkF8R/E4RSmSgsUA05xpPTLdGI8ZmdK6D/r/yjhcjEAeR5cAAAAASUVORK5CYII=';
