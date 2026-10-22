// Texte aller automatischen Mails. Gibt jeweils { subject, text } zurück.
const baseUrl = () => (process.env.BASE_URL || '').replace(/\/$/, '');
const veranstalter = () => process.env.VERANSTALTER || 'Eduard';

const datum = iso => new Date(iso).toLocaleString('de-DE', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) + ' Uhr';
const euro = n => `${n} €`;
const stornoLink = b => `${baseUrl()}/storno/${b.token}`;

const paypalLink = (b, t) => process.env.PAYPAL_ME ? `https://paypal.me/${process.env.PAYPAL_ME}/${b.personen * t.preis}EUR` : null;

function zahlung(b, t) {
  const betrag = b.personen * t.preis;
  const link = paypalLink(b, t);
  return [
    `Preis: ${euro(t.preis)} pro Person, bei ${b.personen} ${b.personen === 1 ? 'Person' : 'Personen'} also ${euro(betrag)}. Hunde und Kinder unter 6 Jahren sind kostenfrei.`,
    'Bezahlt wird per PayPal „Freunde“, Barzahlung vor Ort ist nicht möglich. Bitte zahle bis spätestens zum Tourbeginn.',
    link ? `PayPal (Freunde): ${link}` : 'Die PayPal-Daten bekommst du vom Veranstalter.',
    `Bitte gib als Nachricht deinen Code an: ${b.code}`,
  ].join('\n');
}

const treffpunkt = t => `Treffpunkt: ${t.ort}`;
const ausruestung = 'Bitte mitbringen: Korb oder Obstnetz und ein Messer (Pflicht), festes Schuhwerk, warme Kleidung und je nach Wetter Regensachen.';
const gruss = b => `Hallo ${b.name},\n`;
const fuss = () => `\nBis bald im Wald!\n${veranstalter()}${process.env.KONTAKT_EMAIL ? `\nFragen? Antworte einfach auf diese Mail oder schreibe an ${process.env.KONTAKT_EMAIL}.` : ''}`;

module.exports = {
  datum,

  bestaetigung(b, t) {
    return {
      subject: `Anmeldung bestätigt: Pilztour am ${datum(t.start)}`,
      text: [
        gruss(b),
        `deine Anmeldung zur Pilztour ist bestätigt. ${b.personen} ${b.personen === 1 ? 'Platz ist' : 'Plätze sind'} für dich reserviert.`,
        '',
        `Termin: ${datum(t.start)}`,
        treffpunkt(t),
        `Dauer: etwa 3 bis 4 Stunden (ca. 5.000 bis 7.000 Schritte)`,
        '',
        ausruestung,
        '',
        zahlung(b, t),
        '',
        `Dein Code: ${b.code}`,
        `Du kannst nicht kommen? Dann sage hier bitte ab, damit andere nachrücken können:\n${stornoLink(b)}`,
        fuss(),
      ].join('\n'),
    };
  },

  warteliste(b, t) {
    return {
      subject: `Warteliste: Pilztour am ${datum(t.start)}`,
      text: [
        gruss(b),
        `für den Termin ${datum(t.start)} sind gerade nicht genug Plätze frei. Du stehst auf der Warteliste (${b.personen} ${b.personen === 1 ? 'Person' : 'Personen'}).`,
        'Sobald Plätze frei werden, rücken wir der Reihe nach nach und du bekommst sofort eine Mail. Bezahlen musst du nichts, bevor du bestätigt bist.',
        '',
        `Doch nicht mehr nötig? Hier kannst du dich austragen:\n${stornoLink(b)}`,
        fuss(),
      ].join('\n'),
    };
  },

  nachgerueckt(b, t) {
    return {
      subject: `Ein Platz ist frei: Pilztour am ${datum(t.start)}`,
      text: [
        gruss(b),
        `gute Nachricht: Für dich sind jetzt ${b.personen} ${b.personen === 1 ? 'Platz' : 'Plätze'} frei geworden. Deine Anmeldung ist bestätigt.`,
        '',
        `Termin: ${datum(t.start)}`,
        treffpunkt(t),
        '',
        ausruestung,
        '',
        zahlung(b, t),
        '',
        `Dein Code: ${b.code}`,
        `Passt es doch nicht? Dann sage hier bitte ab:\n${stornoLink(b)}`,
        fuss(),
      ].join('\n'),
    };
  },

  storniert(b, t) {
    return {
      subject: `Abmeldung bestätigt: Pilztour am ${datum(t.start)}`,
      text: [gruss(b), `wir haben deine Anmeldung für ${datum(t.start)} storniert. Schade, vielleicht klappt es ein anderes Mal.`, fuss()].join('\n'),
    };
  },

  erinnerung(b, t) {
    const offen = !b.bezahlt;
    return {
      subject: `Erinnerung: Pilztour am ${datum(t.start)}`,
      text: [
        gruss(b),
        `bald ist es soweit. Wir sehen uns ${datum(t.start)}.`,
        treffpunkt(t),
        '',
        ausruestung,
        offen ? `\nNoch offen: ${euro(b.personen * t.preis)} per PayPal „Freunde“, bitte vor der Tour. Code ${b.code}${paypalLink(b, t) ? `\n${paypalLink(b, t)}` : ''}` : '',
        `\nKannst du doch nicht kommen? Bitte sage hier ab:\n${stornoLink(b)}`,
        fuss(),
      ].join('\n'),
    };
  },

  zahlungserinnerung(b, t) {
    return {
      subject: `Zahlung offen: Pilztour am ${datum(t.start)}`,
      text: [
        gruss(b),
        `dein Platz für die Pilztour am ${datum(t.start)} ist reserviert. Wir haben noch keine Zahlung gefunden.`,
        '',
        zahlung(b, t),
        '',
        'Hast du schon bezahlt? Dann danke, die Zuordnung kann einen Moment dauern, und du kannst diese Mail ignorieren.',
        fuss(),
      ].join('\n'),
    };
  },

  nachbereitung(b, t) {
    return {
      subject: 'Danke für die gemeinsame Pilztour',
      text: [
        gruss(b),
        'danke, dass du dabei warst. Ich hoffe, du hast etwas mitgenommen und der Korb war gut gefüllt.',
        !b.bezahlt ? `Falls du noch nicht bezahlt hast: ${euro(b.personen * t.preis)} per PayPal „Freunde“${paypalLink(b, t) ? ` (${paypalLink(b, t)})` : ''}, Code ${b.code}.` : '',
        process.env.FEEDBACK_URL ? `\nWenn du magst, freue ich mich über eine kurze Rückmeldung oder Bewertung:\n${process.env.FEEDBACK_URL}` : '',
        fuss(),
      ].filter(x => x !== '').join('\n'),
    };
  },

  absage(b, t, grund) {
    return {
      subject: `Absage: Pilztour am ${datum(t.start)}`,
      text: [
        gruss(b),
        `leider muss die Pilztour am ${datum(t.start)} ausfallen.${grund ? `\nGrund: ${grund}` : ''}`,
        'Falls du schon per PayPal bezahlt hast, bekommst du den Betrag selbstverständlich zurück. Melde dich dazu bitte kurz bei mir.',
        `Einen neuen Termin findest du hier:\n${baseUrl()}/`,
        fuss(),
      ].join('\n'),
    };
  },

  // an den Veranstalter
  neueBuchung(b, t) {
    return {
      subject: `Neue Anmeldung: ${b.name}, ${b.personen} P., ${b.status === 'warteliste' ? 'WARTELISTE' : 'bestätigt'}`,
      text: [
        `${b.name} (${b.personen} ${b.personen === 1 ? 'Person' : 'Personen'}) hat sich für ${datum(t.start)} angemeldet.`,
        `Status: ${b.status === 'warteliste' ? 'Warteliste' : 'bestätigt'}`,
        `Code: ${b.code}`,
        `Telefon: ${b.telefon}`,
        `E-Mail: ${b.email}`,
        b.nachricht ? `Nachricht: ${b.nachricht}` : '',
        `\nVerwaltung: ${baseUrl()}/admin/`,
      ].filter(Boolean).join('\n'),
    };
  },

  stornoVeranstalter(b, t) {
    return {
      subject: `Abmeldung: ${b.name}, ${b.personen} P.`,
      text: `${b.name} hat die Anmeldung für ${datum(t.start)} storniert (Code ${b.code}).\n\nVerwaltung: ${baseUrl()}/admin/`,
    };
  },
};
