# Pilztour – Anmeldung und Verwaltung

Kleine Web-App für geführte Pilztouren. Gäste melden sich selbst an, der Server bestätigt, erinnert und kümmert sich um Warteliste und Absagen. Der Veranstalter muss nur noch Termine anlegen und Zahlungen abhaken. Entstanden nach dem Vorbild des bisherigen Google-Formulars (dieselben Felder und Texte, aber ohne Barzahlung), unabhängig von TourPost.

## Was automatisch passiert

| Wann | Was |
|---|---|
| Anmeldung | Bestätigungsmail mit Treffpunkt, Ausrüstung, Preis, **Code** (`PT-XXXXX`) und Stornolink. Der Veranstalter bekommt eine Meldung. |
| Tour ausgebucht | Neue Anmeldungen kommen auf die **Warteliste**. Wird abgesagt, rückt der Nächste nach und bekommt sofort eine Mail. |
| 48 Stunden nach der Anmeldung | Zahlungserinnerung, falls noch nicht bezahlt. |
| 48 Stunden vorher | Erinnerung mit Checkliste, bei offener Zahlung mit Zahlungshinweis. |
| Tag nach der Tour | Dankesmail (mit Link zur Rückmeldung, falls gesetzt). Wer noch nicht bezahlt hat, wird freundlich erinnert. |
| 12 Monate nach der Tour (einstellbar, `LOESCHFRIST_MONATE`) | **Automatische Löschung**: Name, E-Mail, Telefon und Nachricht werden entfernt, ebenso die gespeicherten Mails. Stornierte Anmeldungen schon nach 30 Tagen. Code, Personenzahl, Termin und Zahlungsvermerk bleiben ohne Namen für die Buchhaltung. |
| Termin abgesagt | Mail an alle Angemeldeten mit dem Grund. |
| Gast storniert (Link in der Mail) | Bestätigung, Meldung an den Veranstalter, Warteliste rückt nach. |

## Bezahlung

**Nur per PayPal, keine Barzahlung.** Jede Anmeldung hat einen Code (`PT-XXXXX`), der Gast gibt ihn bei PayPal als Nachricht an. Der Link in den Mails enthält den Betrag. Der Veranstalter sieht die Zahlung in PayPal und tippt in der Verwaltung auf „bezahlt?". Offene Zahlungen werden automatisch nachgehalten: 48 Stunden nach der Anmeldung kommt eine Zahlungserinnerung, 48 Stunden vor der Tour die Erinnerung mit Zahlungshinweis, am Tag danach noch einmal ein Hinweis.

Wichtig zu wissen:
- PayPal erlaubt **„Freunde und Familie" nicht für bezahlte Leistungen**. Es gibt dabei keinen Käuferschutz, und PayPal kann das Konto einschränken. Ob bezahlt wurde, lässt sich für „Freunde" nicht automatisch erkennen (keine Schnittstelle), deshalb der Handabgleich.
- Da jetzt jeder online zahlen muss, ist **PayPal Checkout** (Geschäftskonto, ca. 2,99 % + 0,35 € pro Zahlung) die saubere Lösung. Die Anmeldung würde dann bei Zahlung automatisch als bezahlt markiert, und der Handabgleich entfällt. Das ist noch nicht gebaut.
- Offen: Ob unbezahlte Plätze nach einer Frist automatisch wieder freigegeben werden sollen, ist noch nicht entschieden und nicht gebaut.

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
- **Löschwunsch** eines Gastes: In der Verwaltung bei vergangenen Touren auf „Daten löschen" tippen (bei künftigen Touren erst stornieren).
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
