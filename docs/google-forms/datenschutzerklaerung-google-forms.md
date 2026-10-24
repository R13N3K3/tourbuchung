# Datenschutzerklärung (Entwurf für die Google-Forms-Variante)

> **ENTWURF.** Alles in `[[doppelten eckigen Klammern]]` muss der Veranstalter ausfüllen oder prüfen. Vor dem Start rechtlich prüfen lassen und diesen Kasten entfernen. Der Text ist keine Rechtsberatung. Er gilt nur für die Variante mit Google Formularen. Für die Web-App gibt es eine eigene Erklärung (`public/datenschutz.html`), weil dort andere Dinge passieren (eigener Server, automatische Löschung).

## 1. Verantwortlicher

[[Vor- und Nachname]]
[[Straße und Hausnummer, PLZ und Ort]]
E-Mail: [[E-Mail-Adresse]]

## 2. Welche Daten wir verarbeiten und wozu

**Anmeldung zur Pilztour.** Wenn du dich über das Formular anmeldest, speichern wir:

- Vor- und Nachname, E-Mail-Adresse und Telefonnummer,
- die Zahl der angemeldeten Personen und den gewählten Termin,
- deine Nachricht an uns (freiwillig),
- den Zeitpunkt der Anmeldung, einen Anmeldecode, den Status (bestätigt oder Warteliste), einen Vermerk, ob bezahlt wurde, und einen Vermerk, ob die Erinnerung verschickt wurde.

Wir brauchen die Daten, um deine Anmeldung zu bestätigen und die Tour zu organisieren. Dazu gehören die Bestätigungsmail, die Warteliste, eine Erinnerung vor der Tour, Mitteilungen bei Absage oder Änderung und der Abgleich der Zahlung. Wir erreichen dich per E-Mail und, falls nötig, telefonisch (zum Beispiel bei kurzfristigen Änderungen am Tourtag).

**Rechtsgrundlage** ist die Durchführung des Vertrags und vorvertraglicher Maßnahmen auf deine Anfrage (Art. 6 Abs. 1 lit. b DSGVO). Für Zahlungsbelege gilt außerdem die gesetzliche Aufbewahrungspflicht (Art. 6 Abs. 1 lit. c DSGVO).

## 3. Google Formulare, Tabellen und E-Mail

Das Anmeldeformular läuft über **Google Formulare**. Die Antworten werden in einer **Google Tabelle** gespeichert, und die automatischen Mails (Bestätigung, Erinnerung) werden über das Google-Konto des Veranstalters verschickt. Anbieter ist [[Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland (bei Google Workspace und privaten Konten im EWR) – Angabe prüfen]]. Deine Daten werden dort in unserem Auftrag gespeichert und verarbeitet.

Google kann Daten auch in Länder außerhalb der EU übermitteln, zum Beispiel in die USA. [[Prüfen, auf welcher Grundlage (z. B. EU-US Data Privacy Framework oder Standardvertragsklauseln) und hier nennen.]]

Beim Aufruf des Formulars verarbeitet Google außerdem technische Daten wie deine IP-Adresse und setzt gegebenenfalls Cookies, in eigener Verantwortung. Siehe die Datenschutzerklärung von Google: https://policies.google.com/privacy

[[Hinweis für den Veranstalter: Für die Verarbeitung im Auftrag braucht es einen Auftragsverarbeitungsvertrag mit Google. Bei **Google Workspace** lässt er sich in der Admin-Konsole bestätigen. Bei einem rein privaten Google-Konto steht das nach meinem Kenntnisstand nicht zur Verfügung, das ist rechtlich heikel. Das klären lassen. Diesen Hinweis danach löschen.]]

## 4. Bezahlung

Bezahlt wird per PayPal. Dabei verarbeitet PayPal deine Daten in eigener Verantwortung, siehe die Datenschutzhinweise von PayPal. Wir sehen in unserem PayPal-Konto Name, Betrag und deine Nachricht (den Anmeldecode) und gleichen damit die Zahlung ab.

## 5. Empfänger der Daten

Wir geben deine Daten nicht zu Werbezwecken weiter. Beteiligt sind Google (siehe oben), PayPal und [[gegebenenfalls Steuerberater oder Buchhaltung]].

## 6. Wie lange wir Daten speichern

Wir löschen deinen Namen, deine E-Mail-Adresse, Telefonnummer und Nachricht [[12 Monate]] nach der Tour. Übrig bleibt ein Eintrag ohne Namen mit Code, Personenzahl, Termin und dem Vermerk, ob bezahlt wurde, für die Buchhaltung. Belege zu Zahlungen müssen wir nach den steuerrechtlichen Vorgaben länger aufbewahren ([[Dauer mit dem Steuerberater klären]]), auch bei PayPal. Auf Wunsch löschen wir deine Daten früher, soweit keine gesetzliche Pflicht dagegen spricht.

[[Hinweis für den Veranstalter: In der Google-Variante gibt es **keine automatische Löschung**. Die Zeilen in der Antworten-Tabelle müssen nach der Frist von Hand gelöscht oder anonymisiert werden (Name, E-Mail, Telefon, Nachricht leeren). Am besten einen Kalendertermin dafür eintragen, sonst stimmt dieser Text nicht. Auch die Mails im Gesendet-Ordner des Google-Kontos enthalten Namen. Diesen Hinweis danach löschen.]]

## 7. Deine Rechte

Du hast jederzeit das Recht auf Auskunft über deine gespeicherten Daten (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Übertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21). Schreib dazu einfach an die E-Mail-Adresse oben.

Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel bei [[der für den Wohnort des Veranstalters zuständigen Behörde mit Anschrift eintragen]].

## 8. Pflicht zur Angabe der Daten

Name, E-Mail-Adresse, Telefonnummer, Personenzahl und Termin brauchen wir, um die Anmeldung durchzuführen. Ohne sie ist keine Anmeldung möglich. Die Nachricht ist freiwillig.

Stand: [[Datum]]

---

## Wo wird die Erklärung veröffentlicht? (Hinweis für den Veranstalter, nicht Teil des Textes)

Das Formular braucht eine **öffentliche Adresse** der Erklärung (`CONFIG.datenschutzUrl` im Skript). Ohne eigene Webseite geht das so:

1. Den Text in ein **Google Dokument** kopieren, die Platzhalter ausfüllen und die Hinweise entfernen.
2. Im Dokument **Datei → Teilen → Im Web veröffentlichen** wählen und den Link kopieren.
3. Diesen Link in `CONFIG.datenschutzUrl` eintragen und das Formular neu erzeugen.

Außerdem braucht die Seite, von der aus das Formular verlinkt wird, ein **Impressum**.
