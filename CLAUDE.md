# Tourbuchung – Hinweise für Claude

Web-App (Node/Express, SQLite) für die Anmeldung zu geführten Pilztouren: Gäste melden sich an, der Server bestätigt, erinnert, führt Warteliste und löscht alte Daten. Der Veranstalter pflegt Termine und Zahlungen unter `/admin/`. Oberfläche und Texte sind auf **Deutsch**. Aufbau, Ablauf und Betrieb stehen in der `README.md`. Unabhängig vom Projekt TourPost.

## Befehle

- Starten: `npm start` (Port 3200, `PORT` änderbar), Tests: `npm test` (Wegwerf-Datenbank, keine echten Mails).
- Nach Änderungen an `server/` den Server **neu starten**. Statische Dateien in `public/` und `admin/` nicht.
- Alten Server über die PID auf dem Port beenden (`ss -ltnp`), **nicht** mit `pkill`.
- Ohne `SMTP_HOST` landen Mails nur im Postausgang der Verwaltung. Zum Ausprobieren eine Wegwerf-Datenbank nehmen (`DB_FILE=…`), nie mit echten Daten testen.

## Todo

- **Zahlung automatisch erkennen (PayPal Checkout).** Kosten: PayPal-Geschäftskonto (soweit bekannt ohne Grundgebühr) und pro Zahlung etwa 3 % plus Festbetrag, die der Veranstalter trägt (bei 40 € grob 1,50 €; Zahlen **nicht geprüft**, vor der Umsetzung bei PayPal nachsehen). Vorteil: Der Gast zahlt direkt auf der Seite, PayPal meldet die Zahlung per Webhook (Orders API, `PAYMENT.CAPTURE.COMPLETED`, Zuordnung über den Anmeldecode als `custom_id`), die Anmeldung wird automatisch als bezahlt markiert. Der Handabgleich entfällt, die Zahlungserinnerungen enden von selbst, der Gast bekommt eine Bestätigung, rechtlich sauber mit Käufer- und Verkäuferschutz. Dafür nötig: Client-ID und Secret in der `.env` (nie in den Chat), öffentliche HTTPS-Adresse für den Webhook, Test in der Sandbox. Heute zahlen die Gäste per „PayPal Freunde" und der Veranstalter hakt von Hand ab (verstößt für bezahlte Leistungen gegen die PayPal-Regeln, kein Käuferschutz).
- **Impressum und Datenschutzerklärung** (`public/impressum.html`, `public/datenschutz.html`) sind Entwürfe mit gelben Platzhaltern und roten ENTWURF-Hinweisen. Erst entfernen, wenn der Veranstalter alles ausgefüllt und rechtlich prüfen lassen hat.
- Optional: unbezahlte Plätze nach einer Frist automatisch freigeben (noch nicht entschieden).

## Regeln

- **Keine Zugangsdaten** (`.env`, SMTP-Passwort, PayPal-Secret, Admin-Passwort) committen oder im Chat ausgeben.
- **Keine echten Gästedaten** im Repo oder in Tests. `data/` und `.env` sind per `.gitignore` ausgeschlossen. Mailadressen von Personen gehören nicht ins Repo.
- Die Löschfrist (`LOESCHFRIST_MONATE`, Storno 30 Tage) und der Text in der Datenschutzerklärung müssen übereinstimmen. Ändert sich eins, das andere anpassen.
- Rechtstexte (Impressum, Datenschutz) sind keine Rechtsberatung. Nicht als fertig darstellen.
- Die Seite ist immer hell (kein Dunkelmodus). Pilz-Illustration in `public/pilze.svg`.
- Commit-Nachrichten auf Deutsch, am Ende die Co-Authored-By-Zeile der aktuellen Sitzung. **Nicht pushen**, bevor der Nutzer es verlangt.
