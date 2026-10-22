# Tourbuchung – Hinweise für Claude

Web-App (Node/Express, SQLite) für die Anmeldung zu geführten Pilztouren: Gäste melden sich an, der Server bestätigt, erinnert, führt Warteliste und löscht alte Daten. Der Veranstalter pflegt Termine und Zahlungen unter `/admin/`. Oberfläche und Texte sind auf **Deutsch**. Aufbau, Ablauf und Betrieb stehen in der `README.md`. Unabhängig vom Projekt TourPost.

## Gehört zu TourPost

Dieses Projekt (**Tourbuchung**, `~/Schreibtisch/tourbuchung`) und **TourPost** (`~/Schreibtisch/tourpost`, eigenes Repository `R13N3K3/tourpost`, eigene `CLAUDE.md`) gehören inhaltlich zusammen: Beide dienen demselben Veranstalter für seine Pilztouren. TourPost macht die Werbung (Videos als Instagram Reel, YouTube Short und auf TikTok), Tourbuchung nimmt die Anmeldungen und Zahlungen entgegen. Technisch sind sie **getrennt**: eigener Code, eigene Datenbank, eigene `.env`, eigener Port (Tourbuchung 3200, TourPost 3000), keine gemeinsamen Zugangsdaten.

- TourPost soll später auf die Anmeldeseite hier verweisen (dort gibt es die Seite „Touren" als Platzhalter). Eine feste öffentliche Adresse dafür ist nötig, siehe die Betriebsabschnitte der `README.md`.
- **Sicherheit bleibt getrennt:** Diese App ist bewusst öffentlich erreichbar (Passwort für `/admin/`, HTTPS Pflicht). TourPost hat keinen Zugangsschutz und darf **nie** über denselben Tunnel, dieselbe Domain oder denselben Proxy erreichbar sein. Beim Heimserver darf der Tunnel nur auf Port 3200 zeigen.
- Änderungen, die beide betreffen (gemeinsamer Name des Veranstalters, Texte, Links), in beiden Projekten nachziehen und in der jeweils anderen `CLAUDE.md` vermerken.

## Befehle

- Starten: `npm start` (Port 3200, `PORT` änderbar), Tests: `npm test` (Wegwerf-Datenbank, keine echten Mails).
- Nach Änderungen an `server/` den Server **neu starten**. Statische Dateien in `public/` und `admin/` nicht.
- Alten Server über die PID auf dem Port beenden (`ss -ltnp`), **nicht** mit `pkill`.
- Ohne `SMTP_HOST` landen Mails nur im Postausgang der Verwaltung. Zum Ausprobieren eine Wegwerf-Datenbank nehmen (`DB_FILE=…`), nie mit echten Daten testen.

## Bei Änderungen an der Oberfläche

Ändert sich etwas, das man sieht (HTML, CSS, Texte, `public/`, `admin/`): die Screenshots in `docs/screenshots/` neu aufnehmen (`anmeldung-oben`, `anmeldung-formular`, `bestaetigung`, `verwaltung`, `storno`), die `README.md` (Abschnitt „Vorschau") prüfen und alles zusammen committen.

- Mit **Firefox headless**, Handy-Breite 390 px: `firefox --headless --no-remote --profile <leeres-Profil> --window-size=390,<Höhe> --screenshot <absoluter-Pfad>.png <URL>`.
- **Nie mit echten Daten.** Eine Kopie von `server/`, `public/`, `admin/`, `package.json` und `node_modules` in ein Wegwerf-Verzeichnis legen, mit `DB_FILE=…` und anderem Port starten und Beispieldaten über die API anlegen (erfundene Namen, `example.org`). `VERANSTALTER` auf einen erfundenen Namen setzen.
- Nur in der Wegwerf-Kopie: `adminAuth` überspringen und `fetch` durch **synchrones** `XMLHttpRequest` ersetzen (Firefox macht das Bild, bevor `fetch` fertig ist). Das nie ins echte Projekt übernehmen.
- Die Bestätigungsseite erst nach dem Absenden sichtbar: in der Kopie `zeigeErgebnis(...)` direkt aufrufen. Das Bild ansehen und prüfen, bevor es committet wird.

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
