# Pilztour – Anmeldung und Verwaltung

Kleine Web-App für geführte Pilztouren. Gäste melden sich selbst an, der Server bestätigt, erinnert und kümmert sich um Warteliste und Absagen. Der Veranstalter muss nur noch Termine anlegen und Zahlungen abhaken. Entstanden nach dem Vorbild des bisherigen Google-Formulars (dieselben Felder und Texte), unabhängig von TourPost.

## Was automatisch passiert

| Wann | Was |
|---|---|
| Anmeldung | Bestätigungsmail mit Treffpunkt, Ausrüstung, Preis, **Code** (`PT-XXXXX`) und Stornolink. Der Veranstalter bekommt eine Meldung. |
| Tour ausgebucht | Neue Anmeldungen kommen auf die **Warteliste**. Wird abgesagt, rückt der Nächste nach und bekommt sofort eine Mail. |
| 48 Stunden vorher | Erinnerung mit Checkliste, bei offener Zahlung mit Zahlungshinweis. |
| Tag nach der Tour | Dankesmail (mit Link zur Rückmeldung, falls gesetzt). Wer noch nicht bezahlt hat, wird freundlich erinnert. |
| Termin abgesagt | Mail an alle Angemeldeten mit dem Grund. |
| Gast storniert (Link in der Mail) | Bestätigung, Meldung an den Veranstalter, Warteliste rückt nach. |

## Bezahlung

Wie im Formular: **bar vor Ort oder PayPal, keine Vorkasse.** Jede Anmeldung hat einen Code, der Gast gibt ihn bei PayPal als Nachricht an. Der Veranstalter sieht die Zahlung in PayPal und tippt in der Verwaltung auf „bezahlt?".

Wichtig zu wissen:
- PayPal erlaubt **„Freunde und Familie" nicht für bezahlte Leistungen**. Es gibt dabei keinen Käuferschutz, und PayPal kann das Konto einschränken. Zu erkennen, ob bezahlt wurde, geht für „Freunde" nicht automatisch (keine Schnittstelle), deshalb der Handabgleich.
- Wer das automatisieren will, nutzt **PayPal Checkout** mit Geschäftskonto (ca. 2,99 % + 0,35 € pro Zahlung). Die Anmeldung könnte dann bei Zahlung automatisch als bezahlt markiert werden. Das ist noch nicht gebaut.

## Starten

```bash
npm install
cp .env.example .env      # ADMIN_PASSWORD, KONTAKT_EMAIL, BASE_URL, PAYPAL_ME, SMTP_* ausfüllen
npm start                 # http://localhost:3200
npm test                  # Ablauf-Tests gegen eine Wegwerf-Datenbank
```

- **Gäste:** `/` (Anmeldung), `/storno/<Token>` (aus der Mail).
- **Verwaltung:** `/admin/`, Benutzername beliebig, Passwort aus `ADMIN_PASSWORD`. Dort: Termine anlegen und absagen, Anmeldungen sehen, Zahlungen abhaken, Gäste stornieren, Postausgang ansehen.
- **Mails:** Ohne `SMTP_HOST` werden Mails nur im Postausgang der Verwaltung gespeichert (Testmodus). Für den echten Betrieb SMTP eintragen (z. B. ein Mail-Konto des Veranstalters mit App-Passwort oder ein Dienst wie Brevo/Mailjet).
- Daten liegen in `data/pilztour.db` (SQLite, nicht im Repo, regelmäßig sichern).
- Termine sind Ortszeit (`TZ=Europe/Berlin`).

## Betrieb im Internet

Läuft auf einem kleinen Server (z. B. 3 bis 5 € im Monat) hinter einem Reverse-Proxy mit **HTTPS**, zum Beispiel Caddy:

```
pilz.deinedomain.de {
    reverse_proxy 127.0.0.1:3200
}
```

Als systemd-Dienst starten (`ExecStart=/usr/bin/node server/index.js`, `WorkingDirectory` auf den Projektordner, `Restart=on-failure`). Ohne HTTPS darf die Verwaltung nicht benutzt werden, das Passwort wird sonst im Klartext übertragen. `BASE_URL` muss die öffentliche Adresse sein, sonst stimmen die Links in den Mails nicht.

## Vor dem Start erledigen

- **Impressum und Datenschutzerklärung** (`public/impressum.html`, `public/datenschutz.html`) sind nur Platzhalter. Sie müssen vom Veranstalter ausgefüllt und geprüft werden, die Seite speichert Namen, E-Mail und Telefonnummern.
- Steuerliche Behandlung der Einnahmen klären (gewerblich oder nicht).
- Mail-Zugang einrichten und eine Testanmeldung machen.

## Noch nicht gebaut

- PayPal Checkout mit automatischer Zahlungserkennung
- WhatsApp-Bestätigung (geht nur über die WhatsApp-Business-API von Meta, kostet pro Nachricht)
- Wetter-Absage-Vorschlag, Gutscheine, mehrere Touren-Arten
- Rückerstattungen werden von Hand abgewickelt

## Aufbau

```
server/   index.js (Routen), buchung.js (Anmeldung, Warteliste, Storno), jobs.js (Erinnerungen), mails.js (Texte), mail.js (Versand), db.js
public/   Anmeldeseite, Stornoseite, Impressum, Datenschutz
admin/    Verwaltung
test/     Ablauftests
```
