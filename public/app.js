const $ = id => document.getElementById(id);
const fmt = iso => new Date(iso).toLocaleString('de-DE', {
  weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
}) + ' Uhr';
const esc = s => { const d = document.createElement('div'); d.textContent = s ?? ''; return d.innerHTML; };

let termine = [];

async function laden() {
  const res = await fetch('/api/termine');
  const data = await res.json();
  termine = data.termine;
  $('veranstalter').textContent = data.veranstalter;
  $('personen').innerHTML = Array.from({ length: data.maxPersonen }, (_, i) => `<option>${i + 1}</option>`).join('');
  zeichneTermine();
}

function zeichneTermine() {
  const box = $('termine');
  if (!termine.length) {
    box.innerHTML = '<p class="dim">Zurzeit ist kein Termin geplant. Schreib uns gern über die Nachricht, wir melden uns.</p>';
    return;
  }
  const n = Number($('personen').value) || 1;
  const gewaehlt = document.querySelector('input[name=termin]:checked')?.value;
  box.innerHTML = termine.map(t => {
    const passt = t.frei >= n;
    const info = t.frei === 0 ? '<span class="badge warn">ausgebucht, Warteliste</span>'
      : passt ? `<span class="badge">${t.frei} ${t.frei === 1 ? 'Platz' : 'Plätze'} frei</span>`
      : `<span class="badge warn">nur noch ${t.frei} frei, sonst Warteliste</span>`;
    return `<label class="termin ${passt ? '' : 'voll'}">
      <input type="radio" name="termin" value="${t.id}" ${String(t.id) === gewaehlt ? 'checked' : ''}>
      <span><strong>${esc(fmt(t.start))}</strong><span class="dim small">${esc(t.ort)}</span><br>${info}</span></label>`;
  }).join('');
}
$('personen').addEventListener('change', zeichneTermine);

function fehler(text) {
  $('fehler').textContent = text || '';
  $('fehler').hidden = !text;
  if (text) $('fehler').scrollIntoView({ block: 'center', behavior: 'smooth' });
}

$('form').addEventListener('submit', async e => {
  e.preventDefault();
  fehler('');
  const termin = document.querySelector('input[name=termin]:checked');
  if (!termin) return fehler('Bitte einen Termin wählen.');
  $('senden').disabled = true;
  try {
    const res = await fetch('/api/buchung', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        terminId: Number(termin.value), name: $('name').value, email: $('email').value, telefon: $('telefon').value,
        personen: Number($('personen').value), nachricht: $('nachricht').value,
        website: $('website').value, datenschutz: $('datenschutz').checked,
      }),
    });
    const data = await res.json();
    if (!res.ok) { fehler(data.error || 'Das hat nicht geklappt.'); await laden(); return; }
    zeigeErgebnis(data);
  } catch {
    fehler('Keine Verbindung. Bitte noch einmal versuchen.');
  } finally {
    $('senden').disabled = false;
  }
});

function zeigeErgebnis(d) {
  const warteliste = d.status === 'warteliste';
  const pay = d.paypal ? `<p>PayPal (Freunde): <a href="https://paypal.me/${encodeURIComponent(d.paypal)}/${d.betrag}EUR">paypal.me/${esc(d.paypal)}/${d.betrag}EUR</a><br>Bitte gib deinen Code <strong>${esc(d.code)}</strong> als Nachricht an.</p>` : '';
  $('ergebnis').innerHTML = warteliste
    ? `<h2>Du stehst auf der Warteliste</h2>
       <p>Für ${esc(fmt(d.termin.start))} sind gerade nicht genug Plätze frei. Sobald welche frei werden, rückst du nach und bekommst sofort eine Mail. Bezahlen musst du bis dahin nichts.</p>
       <p class="dim">Dein Code: <strong>${esc(d.code)}</strong></p>`
    : `<h2>Angemeldet ✓</h2>
       <p>Dein Platz für <strong>${esc(fmt(d.termin.start))}</strong> ist reserviert. Die Bestätigung mit allen Details kommt per E-Mail (schau auch im Spam-Ordner nach).</p>
       <p>Bitte zahle <strong>${d.betrag} €</strong> per PayPal, Barzahlung vor Ort ist nicht möglich.</p>${pay}
       <p class="dim">Dein Code: <strong>${esc(d.code)}</strong></p>`;
  $('form').hidden = true;
  $('ergebnis').hidden = false;
  $('ergebnis').scrollIntoView({ behavior: 'smooth' });
}

laden().catch(() => fehler('Die Termine konnten nicht geladen werden. Bitte Seite neu laden.'));
